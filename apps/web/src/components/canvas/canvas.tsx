"use client";

import { ArtifactRenderer } from "@/components/artifacts/ArtifactRenderer";
import { WebSearchResults } from "@/components/web-search-results";
import {
  ALL_MODEL_NAMES,
  DEFAULT_MODEL_CONFIG,
  DEFAULT_MODEL_NAME,
} from "@opencanvas/shared/models";
import { useGraphContext } from "@/contexts/GraphContext";
import { useToast } from "@/hooks/use-toast";
import { getLanguageTemplate } from "@/lib/get_language_template";
import {
  ArtifactCodeV3,
  ArtifactMarkdownV3,
  ArtifactV3,
  CustomModelConfig,
  ProgrammingLanguageOptions,
} from "@opencanvas/shared/types";
import React, { useEffect, useState } from "react";
import { ContentComposerChatInterface } from "./content-composer";
import NoSSRWrapper from "../NoSSRWrapper";
import { useThreadContext } from "@/contexts/ThreadProvider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CHAT_COLLAPSED_QUERY_PARAM } from "@/constants";
import { useRouter, useSearchParams } from "next/navigation";
import SlideDeck from "../ui/slidedeck";
import { useMultipleChoice } from "@/contexts/MultipleChoiceContext";
import { usePresentation } from '@/contexts/PresentationContext';

export function CanvasComponent() {
  const { graphData } = useGraphContext();
  const { setModelName, setModelConfig } = useThreadContext();
  const { setArtifact, chatStarted, setChatStarted } = graphData;
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [webSearchResultsOpen, setWebSearchResultsOpen] = useState<boolean>(false);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(false);
  
  // Get presentation and multiple choice contexts
  const { isPresentationMode, exitPresentation } = usePresentation();
  const { isMultipleChoiceMode, disableMultipleChoiceMode } = useMultipleChoice();

  const searchParams = useSearchParams();
  const router = useRouter();
  const chatCollapsedSearchParam = searchParams.get(CHAT_COLLAPSED_QUERY_PARAM);
  
  // Update chat collapse state from URL
  useEffect(() => {
    try {
      if (chatCollapsedSearchParam) {
        setChatCollapsed(JSON.parse(chatCollapsedSearchParam));
      }
    } catch (e) {
      setChatCollapsed(false);
      const queryParams = new URLSearchParams(searchParams.toString());
      queryParams.delete(CHAT_COLLAPSED_QUERY_PARAM);
      router.replace(`?${queryParams.toString()}`, { scroll: false });
    }
  }, [chatCollapsedSearchParam, router, searchParams]);

  // Quick start function for new artifacts
  const handleQuickStart = (
    type: "text" | "code",
    language?: ProgrammingLanguageOptions
  ) => {
    if (type === "code" && !language) {
      toast({
        title: "Language not selected",
        description: "Please select a language to continue",
        duration: 5000,
      });
      return;
    }
    setChatStarted(true);

    let artifactContent: ArtifactCodeV3 | ArtifactMarkdownV3;
    if (type === "code" && language) {
      artifactContent = {
        index: 1,
        type: "code",
        title: `Quick start ${type}`,
        code: getLanguageTemplate(language),
        language,
      };
    } else {
      artifactContent = {
        index: 1,
        type: "text",
        title: `Quick start ${type}`,
        fullMarkdown: "",
      };
    }

    const newArtifact: ArtifactV3 = {
      currentIndex: 1,
      contents: [artifactContent],
    };
    setArtifact(newArtifact);
    setIsEditing(true);
  };

  // Render function for the main content area
  const renderMainContent = () => {
    if (isPresentationMode) {
      return (
        <div className="h-full w-full flex flex-col bg-white presentation-panel relative">
          {/* Header with title and exit button */}
          <div className="flex justify-between items-center p-2 border-b bg-white">
            <h1 className="text-xl font-semibold">Presentation on Carvedilol</h1>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md shadow-md"
              onClick={exitPresentation}
            >
              Exit Presentation
            </button>
          </div>
          
          {/* Presentation content */}
          <div className="flex-1 overflow-hidden">
            <SlideDeck />
          </div>
        </div>
      );
    } else if (isMultipleChoiceMode) {
      // We're handling quiz within the presentation now, so this should 
      // never be reached, but we'll keep it for backward compatibility
      return (
        <div className="h-full w-full flex flex-col bg-white presentation-panel relative">
          <div className="flex justify-between items-center p-2 border-b bg-white">
            <h1 className="text-xl font-semibold">Quiz Mode</h1>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md shadow-md"
              onClick={() => {
                disableMultipleChoiceMode();
                if (isPresentationMode) exitPresentation();
              }}
            >
              Exit Quiz
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <SlideDeck />
          </div>
        </div>
      );
    } else {
      return (
        <ArtifactRenderer
          chatCollapsed={chatCollapsed}
          setChatCollapsed={(c) => {
            setChatCollapsed(c);
            const queryParams = new URLSearchParams(
              searchParams.toString()
            );
            queryParams.set(
              CHAT_COLLAPSED_QUERY_PARAM,
              JSON.stringify(c)
            );
            router.replace(`?${queryParams.toString()}`, {
              scroll: false,
            });
          }}
          setIsEditing={setIsEditing}
          isEditing={isEditing}
        />
      );
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      {!chatStarted && (
        <NoSSRWrapper>
          <ContentComposerChatInterface
            chatCollapsed={chatCollapsed}
            setChatCollapsed={(c) => {
              setChatCollapsed(c);
              const queryParams = new URLSearchParams(searchParams.toString());
              queryParams.set(CHAT_COLLAPSED_QUERY_PARAM, JSON.stringify(c));
              router.replace(`?${queryParams.toString()}`, { scroll: false });
            }}
            switchSelectedThreadCallback={(thread) => {
              // Chat should only be "started" if there are messages present
              if ((thread.values as Record<string, any>)?.messages?.length) {
                setChatStarted(true);
                if (thread?.metadata?.customModelName) {
                  setModelName(
                    thread.metadata.customModelName as ALL_MODEL_NAMES
                  );
                } else {
                  setModelName(DEFAULT_MODEL_NAME);
                }

                if (thread?.metadata?.modelConfig) {
                  setModelConfig(
                    (thread?.metadata?.customModelName ??
                      DEFAULT_MODEL_NAME) as ALL_MODEL_NAMES,
                    (thread.metadata?.modelConfig ??
                      DEFAULT_MODEL_CONFIG) as CustomModelConfig
                  );
                } else {
                  setModelConfig(DEFAULT_MODEL_NAME, DEFAULT_MODEL_CONFIG);
                }
              } else {
                setChatStarted(false);
              }
            }}
            setChatStarted={setChatStarted}
            hasChatStarted={chatStarted}
            handleQuickStart={handleQuickStart}
          />
        </NoSSRWrapper>
      )}
      {!chatCollapsed && chatStarted && (
        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={50}
          className="transition-all duration-700 h-screen mr-auto bg-gray-50/70 shadow-inner-right"
          id="chat-panel-main"
          order={1}
        >
          <NoSSRWrapper>
            <ContentComposerChatInterface
              chatCollapsed={chatCollapsed}
              setChatCollapsed={(c) => {
                setChatCollapsed(c);
                const queryParams = new URLSearchParams(
                  searchParams.toString()
                );
                queryParams.set(CHAT_COLLAPSED_QUERY_PARAM, JSON.stringify(c));
                router.replace(`?${queryParams.toString()}`, { scroll: false });
              }}
              switchSelectedThreadCallback={(thread) => {
                // Chat should only be "started" if there are messages present
                if ((thread.values as Record<string, any>)?.messages?.length) {
                  setChatStarted(true);
                  if (thread?.metadata?.customModelName) {
                    setModelName(
                      thread.metadata.customModelName as ALL_MODEL_NAMES
                    );
                  } else {
                    setModelName(DEFAULT_MODEL_NAME);
                  }

                  if (thread?.metadata?.modelConfig) {
                    setModelConfig(
                      (thread?.metadata?.customModelName ??
                        DEFAULT_MODEL_NAME) as ALL_MODEL_NAMES,
                      (thread.metadata?.modelConfig ??
                        DEFAULT_MODEL_CONFIG) as CustomModelConfig
                    );
                  } else {
                    setModelConfig(DEFAULT_MODEL_NAME, DEFAULT_MODEL_CONFIG);
                  }
                } else {
                  setChatStarted(false);
                }
              }}
              setChatStarted={setChatStarted}
              hasChatStarted={chatStarted}
              handleQuickStart={handleQuickStart}
            />
          </NoSSRWrapper>
        </ResizablePanel>
      )}

      {chatStarted && (
        <>
          <ResizableHandle />
          <ResizablePanel
            defaultSize={chatCollapsed ? 100 : 75}
            maxSize={85}
            minSize={50}
            id="canvas-panel"
            order={2}
            className="flex flex-row w-full"
          >
            {/* Main content area */}
            <div className="w-full ml-auto">
              {renderMainContent()}
            </div>
            <WebSearchResults
              open={webSearchResultsOpen}
              setOpen={setWebSearchResultsOpen}
            />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

export const Canvas = React.memo(CanvasComponent);