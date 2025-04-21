// components/chat-interface/Thread.tsx
import { useEffect, useState, useRef } from 'react';
import { useGraphContext } from "@/contexts/GraphContext";
import { useToast } from "@/hooks/use-toast";
import { ProgrammingLanguageOptions } from "@opencanvas/shared/types";
import { ThreadPrimitive } from "@assistant-ui/react";
import { Thread as ThreadType } from "@langchain/langgraph-sdk";
import { ArrowDownIcon, PanelRightOpen, SquarePen, Presentation, CheckSquare } from "lucide-react";
import { Dispatch, FC, SetStateAction } from "react";
import { ReflectionsDialog } from "../reflections-dialog/ReflectionsDialog";
import { useLangSmithLinkToolUI } from "../tool-hooks/LangSmithLinkToolUI";
import { TooltipIconButton } from "../ui/assistant-ui/tooltip-icon-button";
import { TighterText } from "../ui/header";
import { Composer } from "./composer";
import { AssistantMessage, UserMessage } from "./messages";
import ModelSelector from "./model-selector";
import { ThreadHistory } from "./thread-history";
import { ThreadWelcome } from "./welcome";
import { useUserContext } from "@/contexts/UserContext";
import { useThreadContext } from "@/contexts/ThreadProvider";
import { useAssistantContext } from "@/contexts/AssistantContext";
import { usePresentation } from '@/contexts/PresentationContext';
import { useMultipleChoice } from '@/contexts/MultipleChoiceContext';
import SlideDeck from "../ui/slidedeck";
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from "uuid";
import { GraphInput } from "@opencanvas/shared/types";

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

export interface ThreadProps {
  userId: string | undefined;
  hasChatStarted: boolean;
  handleQuickStart: (
    type: "text" | "code",
    language?: ProgrammingLanguageOptions
  ) => void;
  setChatStarted: Dispatch<SetStateAction<boolean>>;
  switchSelectedThreadCallback: (thread: ThreadType) => void;
  searchEnabled: boolean;
  setChatCollapsed: (c: boolean) => void;
}

export const Thread: FC<ThreadProps> = (props: ThreadProps) => {
  const {
    setChatStarted,
    hasChatStarted,
    handleQuickStart,
    switchSelectedThreadCallback,
  } = props;
  const { toast } = useToast();
  const {
    graphData: { clearState, runId, feedbackSubmitted, setFeedbackSubmitted, streamMessage, setMessages, messages },
  } = useGraphContext();
  const { selectedAssistant } = useAssistantContext();
  const {
    modelName,
    setModelName,
    modelConfig,
    setModelConfig,
    modelConfigs,
    setThreadId,
  } = useThreadContext();
  const { user } = useUserContext();
  
  // State for presentation mode
  const [showPresentation, setShowPresentation] = useState<boolean>(false);
  const [lastProcessedSlide, setLastProcessedSlide] = useState<number>(0);
  const isProcessingSlide = useRef<boolean>(false);
  
  // Get presentation and multiple choice contexts
  const { 
    isPresentationMode, 
    startPresentation, 
    exitPresentation, 
    nextSlide, 
    previousSlide, 
    goToSlide,
    currentSlide 
  } = usePresentation();
  
  const { isMultipleChoiceMode, toggleMultipleChoiceMode, disableMultipleChoiceMode } = useMultipleChoice();

  // Tell parent components about presentation and multiple choice mode state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('presentationModeChange', { 
        detail: { isActive: showPresentation } 
      }));
      
      window.dispatchEvent(new CustomEvent('multipleChoiceModeChange', {
        detail: { isActive: isMultipleChoiceMode }
      }));
    }
  }, [showPresentation, isMultipleChoiceMode]);
  
  // Listen for exit presentation event from Canvas component
  useEffect(() => {
    const handleExitPresentation = () => {
      setShowPresentation(false);
    };
    
    window.addEventListener('exitPresentation', handleExitPresentation as EventListener);
    
    return () => {
      window.removeEventListener('exitPresentation', handleExitPresentation as EventListener);
    };
  }, []);
  
  // Sync state with context
  useEffect(() => {
    setShowPresentation(isPresentationMode);
  }, [isPresentationMode]);

  // Add this new effect to handle slide changes and ensure AI response is shown
  useEffect(() => {
    // Only proceed if we're in presentation mode and the slide has changed
    if (isPresentationMode && currentSlide > 0 && currentSlide !== lastProcessedSlide) {
      console.log("🔍 Slide changed to:", currentSlide, "Last processed:", lastProcessedSlide);
      
      // Prevent duplicate processing
      if (isProcessingSlide.current) {
        console.log("🔍 Already processing a message, skipping");
        return;
      }
      
      isProcessingSlide.current = true;
      
      // Create a message ID
      const messageId = uuidv4();
      
      // Create a message to request the new slide
      const slideChangeMessage = {
        role: "human",
        content: `go to slide ${currentSlide}`,
        id: messageId
      };
      
      // Create a HumanMessage for UI purposes
      const humanMessageForUI = new HumanMessage({
        content: `go to slide ${currentSlide}`,
        id: messageId,
      });
      
      // Update messages state with the user message
      setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
      
      console.log("🔍 Stream message called with slide:", currentSlide);
      
      // Directly create an AI response with the slide content for immediate display
      const slideContent = getSlideContent(currentSlide);
      const aiMessageId = uuidv4();
      
      // Create an AI message
      const aiMessage = new AIMessage({
        content: `【Slide${currentSlide}】\n${slideContent}`,
        id: aiMessageId,
      });
      
      // Immediately add the AI message to the UI
      setTimeout(() => {
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      }, 100); // Small timeout to ensure human message appears first
      
      // Still make the official request to maintain state
      streamMessage({
        messages: [slideChangeMessage],
        presentationMode: true,
        presentationSlide: currentSlide
      } as GraphInput).finally(() => {
        // Update the last processed slide and reset the processing flag
        setLastProcessedSlide(currentSlide);
        isProcessingSlide.current = false;
      });
    }
  }, [currentSlide, isPresentationMode, lastProcessedSlide, setMessages, streamMessage]);

  // Helper function to get slide content directly
  const getSlideContent = (slideNumber: number): string => {
    const SLIDES_CONTENT: { [key: number]: string } = {
      1: "Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?",
      2: "Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
      3: "Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
      4: "Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
      5: "The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
      6: "Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
      7: "The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
    };
    
    return SLIDES_CONTENT[slideNumber] || "Slide content not available.";
  };

  // Render the LangSmith trace link
  useLangSmithLinkToolUI();

  // Function to handle presentation commands from text input
  const handlePresentationCommands = (content: string) => {
    const normalizedContent = content.toLowerCase().trim();
    console.log("🔍 Checking for presentation commands in:", normalizedContent);
    
    // Start presentation
    if (normalizedContent.includes('start presentation') || 
        normalizedContent.includes('start carvedilol presentation')) {
      console.log("🔍 Starting presentation");
      startPresentation();
      setShowPresentation(true);
      return true;
    }
    
    // Exit presentation
    if (normalizedContent.includes('exit presentation') || 
        normalizedContent === 'exit') {
      console.log("🔍 Exiting presentation");
      exitPresentation();
      setShowPresentation(false);
      return true;
    }
    
    // Navigation commands - only process these if we're already in presentation mode
    if (isPresentationMode) {
      // Next slide
      if (normalizedContent.includes('next slide') || 
          normalizedContent === 'next' ||
          normalizedContent === 'go to next slide') {
        console.log("🔍 Going to next slide");
        nextSlide();
        return true;
      }
      
      // Previous slide
      if (normalizedContent.includes('previous slide') || 
          normalizedContent.includes('go back') || 
          normalizedContent === 'back' ||
          normalizedContent === 'previous') {
        console.log("🔍 Going to previous slide");
        previousSlide();
        return true;
      }
      
      // Go to specific slide
      const slideMatch = normalizedContent.match(/go to slide (\d+)/i);
      if (slideMatch && slideMatch[1]) {
        const slideNum = parseInt(slideMatch[1], 10);
        if (slideNum >= 1 && slideNum <= 7) {
          console.log(`🔍 Going to slide ${slideNum}`);
          goToSlide(slideNum);
          return true;
        }
      }
      
      // Just the slide number
      const slideNumberMatch = normalizedContent.match(/^slide (\d+)$/i);
      if (slideNumberMatch && slideNumberMatch[1]) {
        const slideNum = parseInt(slideNumberMatch[1], 10);
        if (slideNum >= 1 && slideNum <= 7) {
          console.log(`🔍 Going to slide ${slideNum}`);
          goToSlide(slideNum);
          return true;
        }
      }
    }
    
    return false;
  };

  // Function to process a message before sending it to the AI
  const processMessage = async (content: string) => {
    // Check if this is a presentation command
    if (handlePresentationCommands(content)) {
      // Handled by command processor
      return true;
    }
    
    // Create a message ID
    const messageId = uuidv4();
    
    // Create a HumanMessage for UI purposes
    const humanMessageForUI = new HumanMessage({
      content: content,
      id: messageId,
    });
    
    // Add the message to the chat
    setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
    
    // Format for the backend
    const messageObject = {
      role: "human",
      content: content,
      id: messageId
    };
    
    // Stream message to get response
    await streamMessage({
      messages: [messageObject]
    } as GraphInput);
    
    return true;
  };

  const handleNewSession = async () => {
    if (!user) {
      toast({
        title: "User not found",
        description: "Failed to create thread without user",
        duration: 5000,
        variant: "destructive",
      });
      return;
    }

    // Remove the threadId param from the URL
    setThreadId(null);

    setModelName(modelName);
    setModelConfig(modelName, modelConfig);
    clearState();
    setChatStarted(false);
    
    // Exit presentation mode if active
    if (showPresentation) {
      setShowPresentation(false);
      exitPresentation();
    }
    
    // Exit multiple choice mode if active
    if (isMultipleChoiceMode) {
      disableMultipleChoiceMode();
    }
    
    // Reset slide tracking
    setLastProcessedSlide(0);
  };

  // Enhanced toggle presentation function
  const togglePresentation = () => {
    if (showPresentation) {
      // When turning off presentation, also exit quiz mode
      if (isMultipleChoiceMode) {
        disableMultipleChoiceMode();
      }
      exitPresentation();
      setShowPresentation(false);
      // Reset slide tracking
      setLastProcessedSlide(0);
    } else {
      startPresentation();
      setShowPresentation(true);
    }
  };
  
  // Enhanced multiple choice toggle
  const handleMultipleChoiceToggle = () => {
    if (!isMultipleChoiceMode) {
      // If turning on quiz mode and presentation is not showing, start presentation
      if (!showPresentation) {
        startPresentation();
        setShowPresentation(true);
      }
      // Enable quiz mode
      toggleMultipleChoiceMode();
    } else {
      // Just disable quiz mode, keep presentation if it's active
      disableMultipleChoiceMode();
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* Chat interface - always visible */}
      <div className="h-full w-full">
        <ThreadPrimitive.Root className="flex flex-col h-full w-full">
          <div className="pr-3 pl-6 pt-3 pb-2 flex flex-row gap-4 items-center justify-between">
            <div className="flex items-center justify-start gap-2 text-gray-600">
              <ThreadHistory
                switchSelectedThreadCallback={switchSelectedThreadCallback}
              />
              <TighterText className="text-xl">Open Canvas</TighterText>
              {!hasChatStarted && (
                <ModelSelector
                  modelName={modelName}
                  setModelName={setModelName}
                  modelConfig={modelConfig}
                  setModelConfig={setModelConfig}
                  modelConfigs={modelConfigs}
                />
              )}
            </div>
            {hasChatStarted ? (
              <div className="flex flex-row flex-1 gap-2 items-center justify-end">
                {/* Multiple Choice Mode Button */}
                <TooltipIconButton
                  tooltip={isMultipleChoiceMode ? "Exit Quiz Mode" : "Quiz Mode"}
                  variant="ghost"
                  className="w-8 h-8"
                  delayDuration={400}
                  onClick={handleMultipleChoiceToggle}
                >
                  <CheckSquare className={`${isMultipleChoiceMode ? 'text-blue-600' : 'text-gray-600'}`} />
                </TooltipIconButton>
                
                {/* Presentation Mode Button */}
                <TooltipIconButton
                  tooltip={showPresentation ? "Hide Presentation" : "Show Presentation"}
                  variant="ghost"
                  className="w-8 h-8"
                  delayDuration={400}
                  onClick={togglePresentation}
                >
                  <Presentation className={`${showPresentation ? 'text-blue-600' : 'text-gray-600'}`} />
                </TooltipIconButton>
                
                <TooltipIconButton
                  tooltip="Collapse Chat"
                  variant="ghost"
                  className="w-8 h-8"
                  delayDuration={400}
                  onClick={() => props.setChatCollapsed(true)}
                >
                  <PanelRightOpen className="text-gray-600" />
                </TooltipIconButton>
                <TooltipIconButton
                  tooltip="New chat"
                  variant="ghost"
                  className="w-8 h-8"
                  delayDuration={400}
                  onClick={handleNewSession}
                >
                  <SquarePen className="text-gray-600" />
                </TooltipIconButton>
              </div>
            ) : (
              <div className="flex flex-row gap-2 items-center">
                <ReflectionsDialog selectedAssistant={selectedAssistant} />
              </div>
            )}
          </div>
          <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto scroll-smooth bg-inherit px-4 pt-8">
            {!hasChatStarted && (
              <ThreadWelcome
                handleQuickStart={handleQuickStart}
                composer={
                  <Composer
                    chatStarted={false}
                    userId={props.userId}
                    searchEnabled={props.searchEnabled}
                    processMessage={processMessage}
                  />
                }
                searchEnabled={props.searchEnabled}
              />
            )}
            <ThreadPrimitive.Messages
              components={{
                UserMessage: UserMessage,
                AssistantMessage: (prop) => (
                  <AssistantMessage
                    {...prop}
                    feedbackSubmitted={feedbackSubmitted}
                    setFeedbackSubmitted={setFeedbackSubmitted}
                    runId={runId}
                  />
                ),
              }}
            />
          </ThreadPrimitive.Viewport>
          <div className="mt-4 flex w-full flex-col items-center justify-end rounded-t-lg bg-inherit pb-4 px-4">
            <ThreadScrollToBottom />
            <div className="w-full max-w-2xl">
              {hasChatStarted && (
                <div className="flex flex-col space-y-2">
                  <ModelSelector
                    modelName={modelName}
                    setModelName={setModelName}
                    modelConfig={modelConfig}
                    setModelConfig={setModelConfig}
                    modelConfigs={modelConfigs}
                  />
                  <Composer
                    chatStarted={true}
                    userId={props.userId}
                    searchEnabled={props.searchEnabled}
                    processMessage={processMessage}
                  />
                </div>
              )}
            </div>
          </div>
        </ThreadPrimitive.Root>
      </div>
    </div>
  );
};