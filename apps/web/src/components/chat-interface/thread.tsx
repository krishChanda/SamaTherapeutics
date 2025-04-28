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
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from "uuid";

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
  onMessageProcessed?: (message: any) => void;
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
  const [showQuestion, setShowQuestion] = useState<boolean>(false);
  const [isAnsweringQuestion, setIsAnsweringQuestion] = useState<boolean>(false);
  const isProcessingSlide = useRef<boolean>(false);
  const isProcessingMessage = useRef<boolean>(false);
  
  // Get presentation and multiple choice contexts
  const { 
    isPresentationMode, 
    startPresentation, 
    exitPresentation, 
    nextSlide, 
    previousSlide, 
    goToSlide,
    currentSlide,
    getQuestionsForSlide,
    getSlideContent
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
      
      // Hide question panel when changing slides
      setShowQuestion(false);
      setIsAnsweringQuestion(false);
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
      
      // Check if we have questions for this slide
      const hasQuestions = getQuestionsForSlide(currentSlide).length > 0;
      
      // Create an AI message with prompt for questions if available
      const questionPrompt = hasQuestions ? 
        "\n\nWould you like to test your knowledge with a question about this topic?" : 
        "\n\nLet me know if you'd like to go to another slide or if you have any questions about this content.";
      
      const aiMessage = new AIMessage({
        content: `【Slide ${currentSlide}】\n${slideContent}${questionPrompt}`,
        id: aiMessageId,
        additional_kwargs: {
          currentSlideContent: slideContent,
          currentSlide: currentSlide,
          presentationMode: true
        }
      });
      
      // Immediately add the AI message to the UI
      setTimeout(() => {
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      }, 100); // Small timeout to ensure human message appears first
      
      // Create a base message object with just the messages property
      const messageData = {
        messages: [slideChangeMessage]
      };
      
      // Cast the streamMessage function and extended input to any type to bypass type checking
      (streamMessage as any)({
        ...messageData,
        presentationMode: true,
        presentationSlide: currentSlide,
        slideContent
      }).finally(() => {
        // Update the last processed slide and reset the processing flag
        setLastProcessedSlide(currentSlide);
        isProcessingSlide.current = false;
      });
    }
  }, [currentSlide, isPresentationMode, lastProcessedSlide, setMessages, streamMessage, getQuestionsForSlide, getSlideContent]);
  
  // Watch for messages that might indicate question requests or contain "artifact" references
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Process the message
      if (props.onMessageProcessed) {
        props.onMessageProcessed(lastMessage);
      }
      
      // If in presentation mode, check for and clean up unwanted artifact references
      if (isPresentationMode && lastMessage && typeof lastMessage.content === 'string') {
        const content = lastMessage.content;
        
        // Remove any artifact references in presentation mode
        if (content.includes("viewing the") && 
            content.includes("artifact") && 
            lastMessage instanceof AIMessage) {
            
          // Create cleaned content without the artifact reference
          const cleanedContent = content.replace(/It seems you are currently viewing the .* artifact[\.\s\S]*?(?=\n\n|$)/, "");
          
          if (cleanedContent !== content) {
            console.log("🔍 Cleaning up artifact reference in message");
            
            // Update the message with cleaned content
            setMessages(prevMessages => prevMessages.map(msg => 
              msg.id === lastMessage.id 
                ? new AIMessage({
                    ...lastMessage,
                    content: cleanedContent
                  }) 
                : msg
            ));
          }
        }
        
        // Check for question indicators
        if (content.includes("<!-- SHOW_QUESTION -->") || 
            content.includes("Let's test your knowledge")) {
          console.log("🔍 Question marker found in AI message");
          setShowQuestion(true);
        }
      }
    }
  }, [messages, props.onMessageProcessed, isPresentationMode, setMessages]);

  // Enhanced function to determine if the message is likely a question about slide content
  const isSlideContentQuestion = (content: string) => {
    const normalizedContent = content.toLowerCase().trim();
    
    // For presentation mode, almost all user inputs that aren't navigation commands
    // should be treated as content questions to improve context-awareness
    if (isPresentationMode) {
      // Check if it's a navigation command or standard presentation command
      const isNavigationCommand = 
        normalizedContent.includes('go to slide') ||
        normalizedContent.includes('next slide') ||
        normalizedContent === 'next' ||
        normalizedContent.includes('previous slide') ||
        normalizedContent === 'previous' ||
        normalizedContent === 'back' ||
        normalizedContent.includes('exit presentation') ||
        normalizedContent === 'exit' ||
        normalizedContent.includes('start presentation') ||
        // Standard yes/no responses to "Would you like to test your knowledge?"
        ((normalizedContent === 'yes' || 
          normalizedContent === 'no' ||
          normalizedContent === 'sure' ||
          normalizedContent === 'ok') && 
         normalizedContent.length < 5);
      
      // If it's not a navigation command, treat it as a content question
      return !isNavigationCommand;
    }
    
    // If not in presentation mode, return false
    return false;
  };

  // Function to check if a message is a presentation command vs. a content question
  const isPresentationCommand = (content: string): boolean => {
    // Normalize the message
    const normalizedContent = content.toLowerCase().trim();
    
    // Navigation commands
    if (normalizedContent.includes("go to slide") || 
        normalizedContent.includes("next slide") || 
        normalizedContent === "next" ||
        normalizedContent.includes("previous slide") || 
        normalizedContent === "previous" || 
        normalizedContent === "back" ||
        normalizedContent.includes("exit presentation") || 
        normalizedContent === "exit" ||
        normalizedContent.includes("start presentation") ||
        normalizedContent.match(/^slide \d+$/i) !== null) {
      return true;
    }
    
    // Quiz-related commands
    if ((normalizedContent.includes("test my knowledge") || 
         normalizedContent.includes("quiz") ||
         normalizedContent.includes("ask me a question") ||
         normalizedContent.includes("would like a question")) &&
        normalizedContent.length < 50) {
      return true;
    }
    
    // Simple responses to quiz prompts (only if they're short)
    if ((normalizedContent.includes("yes") || 
         normalizedContent.includes("no") ||
         normalizedContent.includes("skip") ||
         normalizedContent.includes("continue")) && 
        normalizedContent.length < 15) {
      return true;
    }
    
    // If none of the above conditions are met, it's likely a content question
    return false;
  };

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
    // Prevent processing multiple messages at once
    if (isProcessingMessage.current) {
      console.log("Already processing a message, skipping");
      return true;
    }
    
    isProcessingMessage.current = true;
    
    try {
      // Create a message ID
      const generatedMessageId = uuidv4();
      
      // Create a HumanMessage for UI purposes
      const humanMessageForUI = new HumanMessage({
        content: content,
        id: generatedMessageId,
      });
      
      // Add the message to the chat
      setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
      
      // Check if this is a presentation command
      if (handlePresentationCommands(content)) {
        // Handled by command processor
        return true;
      }
      
      // For presentation mode, check if this is a presentation command
      if (isPresentationMode && isPresentationCommand(content)) {
        // Handle presentation control message with presentation mode enabled
        const messageObject = {
          role: "human",
          content: content,
          id: generatedMessageId
        };
        
        // Create a base message object
        const messageData = {
          messages: [messageObject]
        };
        
        // Cast to any to bypass type checking
        await (streamMessage as any)({
          ...messageData,
          presentationMode: true,
          presentationSlide: currentSlide,
          slideContent: getSlideContent(currentSlide)
        });
      } else if (isPresentationMode) {
        // This is a content question in presentation mode
        console.log("🔍 Processing as content question while in presentation mode");
        
        const messageObject = {
          role: "human",
          content: content,
          id: generatedMessageId
        };
        
        // Get all presentation content for context
        const allPresentationContent = {
          1: "Introduction: Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?",
          2: "Heart Failure Burden: Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
          3: "Mechanism & Indication of Carvedilol: Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
          4: "COPERNICUS Trial Results: Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
          5: "Subgroup Effects: The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
          6: "Safety Profile: Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
          7: "Dosing Guidelines: The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
        };
        
        // For content questions about the slide, include the slide content as context
        await (streamMessage as any)({
          messages: [messageObject],
          presentationMode: true,
          presentationSlide: currentSlide,
          slideContent: getSlideContent(currentSlide),
          presentationContent: allPresentationContent,
          isContentQuestion: true  // Flag to indicate this is a content question
        });
      } else {
        // Regular message processing (not in presentation mode)
        const messageObject = {
          role: "human",
          content: content,
          id: generatedMessageId
        };
        
        await streamMessage({
          messages: [messageObject]
        });
      }
      
      return true;
    } finally {
      isProcessingMessage.current = false;
    }
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
    setShowQuestion(false);
    setIsAnsweringQuestion(false);
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
      setShowQuestion(false);
      setIsAnsweringQuestion(false);
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
      // Enable quiz mode and show questions
      toggleMultipleChoiceMode();
      setShowQuestion(true);
    } else {
      // Just disable quiz mode, keep presentation if it's active
      disableMultipleChoiceMode();
      setShowQuestion(false);
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