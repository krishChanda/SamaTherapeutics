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
import IntegratedMultipleChoiceView from "../ui/IntegratedMultipleChoiceView";
import { useMultipleChoice } from "@/contexts/MultipleChoiceContext";
import { usePresentation } from "@/contexts/PresentationContext";

// Define custom event interfaces
interface PresentationModeChangeEvent extends CustomEvent {
  detail: {
    isActive: boolean;
  };
}

interface MultipleChoiceModeChangeEvent extends CustomEvent {
  detail: {
    isActive: boolean;
  };
}

export function CanvasComponent() {
  const { graphData } = useGraphContext();
  const { setModelName, setModelConfig } = useThreadContext();
  const { setArtifact, chatStarted, setChatStarted } = graphData;
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [webSearchResultsOpen, setWebSearchResultsOpen] = useState<boolean>(false);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(false);
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [multipleChoiceMode, setMultipleChoiceMode] = useState<boolean>(false);
  
  // Get contexts
  const { 
    isMultipleChoiceMode, 
    currentQuestion, 
    nextQuestion, 
    previousQuestion, 
    currentQuestionIndex, 
    totalQuestions, 
    handleAnswerSelected,
    disableMultipleChoiceMode 
  } = useMultipleChoice();
  
  const { 
    isPresentationMode, 
    currentSlide, 
    totalSlides, 
    nextSlide, 
    previousSlide, 
    exitPresentation 
  } = usePresentation();

  const searchParams = useSearchParams();
  const router = useRouter();
  const chatCollapsedSearchParam = searchParams.get(CHAT_COLLAPSED_QUERY_PARAM);
  
  // Listen for mode changes from Thread component
  useEffect(() => {
    const handlePresentationModeChange = (event: PresentationModeChangeEvent) => {
      console.log("🔍 Presentation mode changed to:", event.detail.isActive);
      setPresentationMode(event.detail.isActive);
    };
    
    const handleMultipleChoiceModeChange = (event: MultipleChoiceModeChangeEvent) => {
      console.log("🔍 Multiple choice mode changed to:", event.detail.isActive);
      setMultipleChoiceMode(event.detail.isActive);
    };
    
    const handleExitMultipleChoice = () => {
      disableMultipleChoiceMode();
    };
    
    window.addEventListener(
      'presentationModeChange', 
      handlePresentationModeChange as EventListener
    );
    
    window.addEventListener(
      'multipleChoiceModeChange',
      handleMultipleChoiceModeChange as EventListener
    );
    
    window.addEventListener(
      'exitMultipleChoice',
      handleExitMultipleChoice as EventListener
    );
    
    return () => {
      window.removeEventListener(
        'presentationModeChange', 
        handlePresentationModeChange as EventListener
      );
      
      window.removeEventListener(
        'multipleChoiceModeChange',
        handleMultipleChoiceModeChange as EventListener
      );
      
      window.removeEventListener(
        'exitMultipleChoice',
        handleExitMultipleChoice as EventListener
      );
    };
  }, [disableMultipleChoiceMode]);
  
  // Update from context state to local state for synchronization
  useEffect(() => {
    setPresentationMode(isPresentationMode);
  }, [isPresentationMode]);
  
  useEffect(() => {
    setMultipleChoiceMode(isMultipleChoiceMode);
  }, [isMultipleChoiceMode]);
  
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
    if (multipleChoiceMode) {
      return <IntegratedMultipleChoiceView />;
    } else if (presentationMode) {
      return (
        <div className="h-full w-full flex flex-col bg-white presentation-panel relative">
          {/* Exit presentation button */}
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
          <div className="flex-1 overflow-hidden border-r border-gray-200">
            <SlideDeck />
          </div>
          
          {/* Navigation controls */}
          <div className="flex justify-between p-2 bg-gray-100">
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
              onClick={previousSlide}
              disabled={currentSlide <= 1}
            >
              Previous
            </button>
            <span className="self-center">Page {currentSlide} of {totalSlides}</span>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
              onClick={nextSlide}
              disabled={currentSlide >= totalSlides}
            >
              Next
            </button>
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