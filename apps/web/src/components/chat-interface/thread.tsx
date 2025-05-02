// components/chat-interface/Thread.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
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
import { SLIDES_CONTENT, SLIDE_CONTEXT } from '@sama/shared';


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
   nextSlide: nextSlideContext,
   previousSlide: previousSlideContext,
   goToSlide: goToSlideContext,
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

 // New effect to handle presentation mode message rendering
 useEffect(() => {
   if (isPresentationMode && messages.length > 0) {
     // Get the most recent message
     const lastMessage = messages[messages.length - 1];
     
     // Check if it's an AI message that hasn't been processed for UI rendering
     if (lastMessage instanceof AIMessage && 
         !lastMessage.additional_kwargs?._uiProcessed) {
       
       console.log("🔍 Processing AI message in presentation mode:", 
         lastMessage.id, typeof lastMessage.content);
       
       // Mark the message as processed to prevent infinite loops
       if (!lastMessage.additional_kwargs) {
         lastMessage.additional_kwargs = {};
       }
       lastMessage.additional_kwargs._uiProcessed = true;
       
       // Force update to ensure message renders by creating a new message object
       // This is key for getting messages to appear without refresh
       setTimeout(() => {
         const refreshedMessage = new AIMessage({
           content: lastMessage.content,
           id: lastMessage.id,
           additional_kwargs: {
             ...lastMessage.additional_kwargs,
             presentationMode: true,
             currentSlide: currentSlide,
             _refreshTimestamp: Date.now() // Add timestamp to trigger state update
           }
         });
         
         // Update the message in the messages array - this forces a re-render
         setMessages(prevMessages => prevMessages.map(msg => 
           msg.id === lastMessage.id ? refreshedMessage : msg
         ));
         
         console.log("🔍 AI message processed and refreshed");
       }, 10); // Small timeout to ensure UI update
     }
     
     // Process any message with props.onMessageProcessed
     if (props.onMessageProcessed) {
       props.onMessageProcessed(lastMessage);
     }
   }
 }, [messages, isPresentationMode, currentSlide, props.onMessageProcessed, setMessages]);

 useEffect(() => {
  // Create a refresher for presentation mode messages
  if (isPresentationMode) {
    console.log("🔍 Setting up presentation mode message refresher");
    
    const refreshInterval = setInterval(() => {
      const aiMessages = messages.filter(
        m => m instanceof AIMessage && 
        m.additional_kwargs?.presentationMode &&
        !m.additional_kwargs?._refreshed
      );
      
      if (aiMessages.length > 0) {
        console.log("🔍 Found unrefreshed presentation messages, forcing UI update");
        
        // Force refresh by creating a new messages array with updated flags
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg instanceof AIMessage && 
                msg.additional_kwargs?.presentationMode &&
                !msg.additional_kwargs?._refreshed) {
              // Return a new message object with the refresh flag
              return new AIMessage({
                ...msg,
                additional_kwargs: {
                  ...msg.additional_kwargs,
                  _refreshed: true,
                  _refreshTimestamp: Date.now()
                }
              });
            }
            return msg;
          })
        );
      }
    }, 500); // Check every 500ms
    
    return () => {
      clearInterval(refreshInterval);
    };
  }
}, [isPresentationMode, messages, setMessages]);

 // Add this useEffect to better handle slide changes and ensure AI response is shown
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
    /*
     // Create a HumanMessage for UI purposes
     const humanMessageForUI = new HumanMessage({
       content: `go to slide ${currentSlide}`,
       id: messageId,
     });
    
     // Update messages state with the user message
     setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
    */
     console.log("🔍 Stream message called with slide:", currentSlide);
    
     // Get slide content and context
     const slideContent = SLIDES_CONTENT[currentSlide];
     const slideContextData = SLIDE_CONTEXT[currentSlide];
    
    
     // Create a base message object with just the messages property
     const messageData = {
       messages: [slideChangeMessage]
     };
    
     // Cast the streamMessage function and extended input to any type to bypass type checking
     (streamMessage as any)({
       ...messageData,
       presentationMode: true,
       presentationSlide: currentSlide,
       slideContent,
       slideContext: slideContextData?.details || "",
       allSlideContent: SLIDES_CONTENT,
       allSlideContext: SLIDE_CONTEXT
     }).finally(() => {
       // Update the last processed slide and reset the processing flag
       setLastProcessedSlide(currentSlide);
       isProcessingSlide.current = false;
     });
   }
 }, [currentSlide, isPresentationMode, lastProcessedSlide, setMessages, streamMessage, getQuestionsForSlide]);

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
      
       // Also remove "I've outlined" responses for direct answers
       if (lastMessage instanceof AIMessage &&
           (content.includes("I've outlined") ||
            content.includes("I outlined"))) {
        
         // Create cleaned content without the "I've outlined" phrase
         const cleanedContent = content
           .replace(/I've outlined the significant burdens of heart failure for you\.\s+/i, "")
           .replace(/I outlined the significant burdens of heart failure for you\.\s+/i, "");
        
         if (cleanedContent !== content) {
           console.log("🔍 Cleaning up 'I've outlined' phrasing");
          
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
       nextSlideContext();
       return true;
     }
    
     // Previous slide
     if (normalizedContent.includes('previous slide') ||
         normalizedContent.includes('go back') ||
         normalizedContent === 'back' ||
         normalizedContent === 'previous') {
       console.log("🔍 Going to previous slide");
       previousSlideContext();
       return true;
     }
    
     // Go to specific slide
     const slideMatch = normalizedContent.match(/go to slide (\d+)/i);
     if (slideMatch && slideMatch[1]) {
       const slideNum = parseInt(slideMatch[1], 10);
       if (slideNum >= 1 && slideNum <= 7) {
         console.log(`🔍 Going to slide ${slideNum}`);
         goToSlideContext(slideNum);
         return true;
       }
     }
    
     // Just the slide number
     const slideNumberMatch = normalizedContent.match(/^slide (\d+)$/i);
     if (slideNumberMatch && slideNumberMatch[1]) {
       const slideNum = parseInt(slideNumberMatch[1], 10);
       if (slideNum >= 1 && slideNum <= 7) {
         console.log(`🔍 Going to slide ${slideNum}`);
         goToSlideContext(slideNum);
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
    
    // Always create the user message regardless of whether it's a command
    const humanMessageForUI = new HumanMessage({
      content: content,
      id: generatedMessageId,
    });
    
    // Add the message to the chat
    setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
    
    // Check if this is a presentation command AFTER adding to chat
    if (handlePresentationCommands(content)) {
      // Handled by command processor
      isProcessingMessage.current = false;
      return true;
    }
    
    // For presentation mode, check if this is a content question
    if (isPresentationMode) {
      const isCommand = isPresentationCommand(content);
      // Create a message object in expected format
      const messageObject = {
        role: "human",
        content: content,
        id: generatedMessageId
      };
      
      // Get slide content and context
      const slideContent = SLIDES_CONTENT[currentSlide];
      const slideContextData = SLIDE_CONTEXT[currentSlide];
      
      // Cast to any to bypass type checking
      await (streamMessage as any)({
        messages: [messageObject],
        presentationMode: true,
        presentationSlide: currentSlide,
        slideContent: slideContent,
        slideContext: slideContextData?.details || "",
        slideTitle: slideContextData?.title || "",
        allSlideContent: SLIDES_CONTENT,
        allSlideContext: SLIDE_CONTEXT,
        isContentQuestion: !isCommand  // Flag as content question if not a command
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
 
 // Enhanced goToSlide function with improved error handling
 const goToSlideWithErrorHandling = (slideNumber: number) => {
   console.log("🔍 Going to slide:", slideNumber);
   if (slideNumber >= 1 && slideNumber <= 7) {
     try {
       // Update state first
       goToSlideContext(slideNumber);
       
       // Create a message ID we can track
       const messageId = uuidv4();
       
       // Log for debugging
       console.log(`🔍 Navigation message created with ID: ${messageId}`);
       
       // Create a message object in the expected format
       const navigationMessage = {
         role: "human",
         content: `go to slide ${slideNumber}`,
         id: messageId
       };
       
       // Create a HumanMessage for UI purposes
       const humanMessageForUI = new HumanMessage({
         content: `go to slide ${slideNumber}`,
         id: messageId,
       });
       
       // Update messages state
       setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
       
       // Get slide content and context for better messaging
       const slideContent = getSlideContent(slideNumber);
       const slideContextData = SLIDE_CONTEXT[slideNumber];
       
       // Stream message with enhanced context
       streamMessage({
         messages: [navigationMessage],
         presentationMode: true,
         presentationSlide: slideNumber,
         slideContent: slideContent,
         slideContext: slideContextData?.details || "",
         slideTitle: slideContextData?.title || ""
       } as any).catch(error => {
         console.error("Error sending navigation message:", error);
         
         // Fallback: Add an AI message directly to keep the UI responsive
        //  const fallbackMessage = new AIMessage({
        //    content: `【Slide ${slideNumber}】\n\n${slideContent}\n\nWould you like to test your knowledge with a question about this topic, or shall we continue to the presentation?`,
        //    id: uuidv4(),
        //    additional_kwargs: {
        //      presentationMode: true,
        //      currentSlide: slideNumber,
        //      fallback: true
        //    }
        //  });
         
        //  setMessages(prevMessages => [...prevMessages, fallbackMessage]);
       });
     } catch (error) {
       console.error("Error navigating to slide:", error);
     }
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
             <TighterText className="text-xl">Sama Therapeutics</TighterText>
             
           </div>
           {hasChatStarted ? (
             <div className="flex flex-row flex-1 gap-2 items-center justify-end">
               {/* Multiple Choice Mode Button */}
               {/* <TooltipIconButton
                 tooltip={isMultipleChoiceMode ? "Exit Quiz Mode" : "Quiz Mode"}
                 variant="ghost"
                 className="w-8 h-8"
                 delayDuration={400}
                 onClick={handleMultipleChoiceToggle}
               >
                 <CheckSquare className={`${isMultipleChoiceMode ? 'text-blue-600' : 'text-gray-600'}`} />
               </TooltipIconButton> */}
              
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
              
               {/* <TooltipIconButton
                 tooltip="Collapse Chat"
                 variant="ghost"
                 className="w-8 h-8"
                 delayDuration={400}
                 onClick={() => props.setChatCollapsed(true)}
               >
                 <PanelRightOpen className="text-gray-600" />
               </TooltipIconButton> */}
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