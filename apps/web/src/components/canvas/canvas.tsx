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
import { HumanMessage, AIMessage } from "@langchain/core/messages";

export function CanvasComponent() {
  const { graphData } = useGraphContext();
  const { setModelName, setModelConfig } = useThreadContext();
  const { setArtifact, chatStarted, setChatStarted } = graphData;
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [webSearchResultsOpen, setWebSearchResultsOpen] = useState<boolean>(false);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(false);
  
  // Get presentation and multiple choice contexts
  const { 
    isPresentationMode, 
    exitPresentation,
    currentSlide,
    getSlideContent
  } = usePresentation();
  
  const { isMultipleChoiceMode, disableMultipleChoiceMode } = useMultipleChoice();
  
  // State to track whether to show a question in presentation mode
  const [showQuestion, setShowQuestion] = useState<boolean>(false);

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

  // Watch for messages that might indicate question requests
  useEffect(() => {
    if (isPresentationMode && graphData.messages.length > 0) {
      // Check the most recent message
      const recentMessages = [...graphData.messages];
      const lastMessage = recentMessages[recentMessages.length - 1];
      
      // Try to access content safely
      const messageContent = typeof lastMessage?.content === 'string' 
        ? lastMessage.content 
        : '';
      
      // Check for user responses indicating they want a question
      if (lastMessage instanceof HumanMessage && (
          messageContent.toLowerCase().includes('yes') ||
          messageContent.toLowerCase().includes('sure') ||
          messageContent.toLowerCase().includes('question') ||
          messageContent.toLowerCase().includes('test') ||
          messageContent.toLowerCase().includes('quiz')
        )) {
        console.log("User has requested a question");
        setShowQuestion(true);
      }
      
      // Check for user responses indicating they want to skip the question
      else if (lastMessage instanceof HumanMessage && (
          messageContent.toLowerCase().includes('no') ||
          messageContent.toLowerCase().includes('skip') ||
          messageContent.toLowerCase().includes('next slide') ||
          messageContent.toLowerCase().includes('continue') ||
          messageContent.toLowerCase().includes('move on')
        )) {
        console.log("User has declined the question");
        setShowQuestion(false);
      }
      
      // If the message contains the hidden marker, always show question
      else if (messageContent.includes("<!-- SHOW_QUESTION -->") || 
          messageContent.includes("Let's test your knowledge")) {
        console.log("Question marker found, showing question");
        setShowQuestion(true);
        
        // Clean up the message content to remove the marker if possible
        if (typeof lastMessage.content === 'string' && lastMessage instanceof AIMessage) {
          // Create a new AIMessage with the marker removed
          const cleanedContent = lastMessage.content.replace("<!-- SHOW_QUESTION -->", "");
          
          if (cleanedContent !== lastMessage.content) {
            // Update the message with cleaned content
            graphData.setMessages(prevMessages => prevMessages.map(msg => 
              msg.id === lastMessage.id 
                ? new AIMessage({
                    ...lastMessage,
                    content: cleanedContent
                  }) 
                : msg
            ));
          }
        }
      }
      
      // If we're changing slides, hide the question panel initially
      else if (lastMessage instanceof HumanMessage && (
          messageContent.toLowerCase().includes('go to slide') ||
          messageContent.toLowerCase().includes('slide') ||
          messageContent.toLowerCase().includes('next') ||
          messageContent.toLowerCase().includes('previous')
        )) {
        console.log("Slide change requested, hiding question panel");
        setShowQuestion(false);
      }
    }
  }, [graphData.messages, isPresentationMode, graphData.setMessages]);

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
            <SlideDeck showQuestion={showQuestion} />
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
            <SlideDeck showQuestion={true} />
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
              onMessageProcessed={(message) => {
                // If in presentation mode, pass the current slide content
                if (isPresentationMode && message && typeof message.content === 'string') {
                  // Add slide content to AI context if needed
                  if (message.additional_kwargs === undefined) {
                    message.additional_kwargs = {};
                  }
                  
                  // Add presentation mode flag
                  message.additional_kwargs.presentationMode = true;
                  
                  // Add current slide information
                  if (!message.additional_kwargs.currentSlideContent) {
                    message.additional_kwargs.currentSlideContent = getSlideContent(currentSlide);
                    message.additional_kwargs.currentSlide = currentSlide;
                  }
                  
                  // Check for question prompts
                  if (message.content.includes("SHOW_QUESTION") ||
                      message.content.includes("Would you like to test your knowledge")) {
                    console.log("Message contains question prompt");
                  }
                  
                  // Remove any artifact references if in presentation mode
                  if (message instanceof AIMessage && 
                      message.content.includes("viewing the") && 
                      message.content.includes("artifact")) {
                    const cleanedContent = message.content.replace(/It seems you are currently viewing the .* artifact[\.\s\S]*?(?=\n\n|$)/, "");
                    
                    if (cleanedContent !== message.content) {
                      console.log("🔍 Cleaning up artifact reference in message");
                      
                      // Update the message with cleaned content
                      graphData.setMessages(prevMessages => prevMessages.map(msg => 
                        msg.id === message.id 
                          ? new AIMessage({
                              ...message,
                              content: cleanedContent
                            }) 
                          : msg
                      ));
                    }
                  }
                }
              }}
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