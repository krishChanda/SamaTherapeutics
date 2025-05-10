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
  
  // pull all context values
  const { 
    isPresentationMode, 
    exitPresentation,
    currentSlide,
    getSlideContent,
  } = usePresentation();
  
  const { isMultipleChoiceMode, disableMultipleChoiceMode } = useMultipleChoice();
  
  const [showQuestion, setShowQuestion] = useState<boolean>(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const chatCollapsedSearchParam = searchParams.get(CHAT_COLLAPSED_QUERY_PARAM);
  
  useEffect(() => {
    // reloads presentation mode
    if (isPresentationMode) {
      // opens chat alongside presentation mode
      if (!chatStarted) {
        setChatStarted(true);
      }
    }
  }, [isPresentationMode, currentSlide, chatStarted, setChatStarted]);
  
  // event listener for presentation mode changes
  useEffect(() => {
    const handlePresentationModeChange = (event: CustomEvent) => {
      if (event.detail?.isActive === true) {
        // 
        setChatStarted(true);
      }
    };
    
    window.addEventListener('presentationModeChange', handlePresentationModeChange as EventListener);
    
    return () => {
      window.removeEventListener('presentationModeChange', handlePresentationModeChange as EventListener);
    };
  }, [setChatStarted]);
  
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

  // checking to make sure the last agent message is processed on frontend
  useEffect(() => {
    if (isPresentationMode && graphData.messages.length > 0) {
      // pull the last message from graphData
      const lastMessage = graphData.messages[graphData.messages.length - 1];
      
      // check if the last message is from agent and has not been processed on frontend
      if (lastMessage instanceof AIMessage && 
          !lastMessage.additional_kwargs?._canvasProcessed) {
        
        // mark message as processed
        if (!lastMessage.additional_kwargs) {
          lastMessage.additional_kwargs = {};
        }
        lastMessage.additional_kwargs._canvasProcessed = true;
        
        // UI update
        setTimeout(() => {
          graphData.setMessages([...graphData.messages]);
        }, 10);
      }
    }
  }, [isPresentationMode, graphData.messages, graphData.setMessages]);

  // 
  useEffect(() => {
    if (isPresentationMode && graphData.messages.length > 0) {
      // pull the last message from graphData
      const recentMessages = [...graphData.messages];
      const lastMessage = recentMessages[recentMessages.length - 1];
      
      // access content of the last message and checks if it's a string
      const messageContent = typeof lastMessage?.content === 'string' 
        ? lastMessage.content 
        : '';
      
      // get additional keywords
      const additionalKwargs = lastMessage && 'additional_kwargs' in lastMessage 
        ? lastMessage.additional_kwargs || {}
        : {};
      
      // check if user wants to see a question
      if (lastMessage instanceof HumanMessage && (
          messageContent.toLowerCase().includes('yes') ||
          messageContent.toLowerCase().includes('sure') ||
          messageContent.toLowerCase().includes('question') ||
          messageContent.toLowerCase().includes('test') ||
          messageContent.toLowerCase().includes('quiz')
        )) {
        setShowQuestion(true);
      }
      
      // check if user wants to skip the question
      else if (lastMessage instanceof HumanMessage && (
          messageContent.toLowerCase().includes('no') ||
          messageContent.toLowerCase().includes('skip') ||
          messageContent.toLowerCase().includes('next slide') ||
          messageContent.toLowerCase().includes('continue') ||
          messageContent.toLowerCase().includes('move on')
        )) {
        setShowQuestion(false);
      }
      
      // check if question is supposed to be shown
      else if (lastMessage instanceof AIMessage && 
               additionalKwargs.showQuestion === true) {
        setShowQuestion(true);
      }
      
      // hide question if user is navigating slides
      else if (lastMessage instanceof HumanMessage && (
          messageContent.toLowerCase().includes('go to slide') ||
          messageContent.toLowerCase().includes('slide') ||
          messageContent.toLowerCase().includes('next') ||
          messageContent.toLowerCase().includes('previous')
        )) {
        setShowQuestion(false);
      }
    }
  }, [graphData.messages, isPresentationMode, graphData.setMessages]);

  // start function
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

  // rendering for main content
  const renderMainContent = () => {
    
    if (isPresentationMode) {
      return (
        <div className="h-full w-full flex flex-col bg-white presentation-panel relative">
          {/* Header with title and exit button */}
          <div className="flex justify-center p-2 border-b bg-white">
            <h1 className="flex justify-center text-xl font-semibold">Presentation on Carvedilol</h1>
            <button
              className="bg-[#1152e2] absolute right-4 flex justify-between bg-[#2463EB] hover:bg-[#1a4fd1] text-white py-1 px-3 rounded-md shadow-md"
              onClick={exitPresentation}
            >
              Exit Presentation
            </button>
          </div>
          
          {/* presentation content */}
          <div className="flex-1 overflow-hidden">
            <SlideDeck showQuestion={showQuestion} />
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
              // chat should only be "started" if there are messages present
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
                // chat should only be "started" if there are messages present
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
                // if in presentation mode, pass the current slide content
                if (isPresentationMode && message && typeof message.content === 'string') {
                  // add slide content to AI context if needed
                  if (message.additional_kwargs === undefined) {
                    message.additional_kwargs = {};
                  }
                  
                  // add presentation mode flag
                  message.additional_kwargs.presentationMode = true;
                  
                  // add current slide information
                  if (!message.additional_kwargs.currentSlideContent) {
                    message.additional_kwargs.currentSlideContent = getSlideContent(currentSlide);
                    message.additional_kwargs.currentSlide = currentSlide;
                  }
                  
                  // remove any artifact references if in presentation mode
                  if (message instanceof AIMessage && 
                      message.content.includes("viewing the") && 
                      message.content.includes("artifact")) {
                    const cleanedContent = message.content.replace(/It seems you are currently viewing the .* artifact[\.\s\S]*?(?=\n\n|$)/, "");
                    
                    if (cleanedContent !== message.content) {
                      
                      // update the message with cleaned content
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

                  // force a UI update
                  if (message instanceof AIMessage && !message.additional_kwargs._processed) {
                    message.additional_kwargs._processed = true;
                    
                    // create new message artifact with timestammp
                    setTimeout(() => {
                      const refreshedMessage = new AIMessage({
                        ...message,
                        content: message.content,
                        additional_kwargs: {
                          ...message.additional_kwargs,
                          _refreshTimestamp: Date.now()
                        }
                      });
                      
                      graphData.setMessages(prevMessages => 
                        prevMessages.map(msg => msg.id === message.id ? refreshedMessage : msg)
                      );
                    }, 10);
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