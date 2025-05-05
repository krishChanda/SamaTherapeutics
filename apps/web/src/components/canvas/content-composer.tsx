"use client";

import { useToast } from "@/hooks/use-toast";
import {
 convertLangchainMessages,
 convertToOpenAIFormat,
} from "@/lib/convert_messages";
import {
 ProgrammingLanguageOptions,
 ContextDocument,
} from "@opencanvas/shared/types";
import {
 AppendMessage,
 AssistantRuntimeProvider,
 useExternalMessageConverter,
 useExternalStoreRuntime,
} from "@assistant-ui/react";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { Thread as ThreadType } from "@langchain/langgraph-sdk";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Toaster } from "../ui/toaster";
import { Thread } from "@/components/chat-interface";
import { useGraphContext } from "@/contexts/GraphContext";
import {
 CompositeAttachmentAdapter,
 SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";
import { AudioAttachmentAdapter } from "../ui/assistant-ui/attachment-adapters/audio";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { arrayToFileList, convertDocuments } from "@/lib/attachments";
import { VideoAttachmentAdapter } from "../ui/assistant-ui/attachment-adapters/video";
import { useUserContext } from "@/contexts/UserContext";
import { useThreadContext } from "@/contexts/ThreadProvider";
import { PDFAttachmentAdapter } from "../ui/assistant-ui/attachment-adapters/pdf";
import { usePresentation } from '@/contexts/PresentationContext';
import { SLIDES_CONTENT, SLIDE_CONTEXT } from '@sama/shared';

export interface ContentComposerChatInterfaceProps {
 switchSelectedThreadCallback: (thread: ThreadType) => void;
 setChatStarted: React.Dispatch<React.SetStateAction<boolean>>;
 hasChatStarted: boolean;
 handleQuickStart: (
   type: "text" | "code",
   language?: ProgrammingLanguageOptions
 ) => void;
 chatCollapsed: boolean;
 setChatCollapsed: (c: boolean) => void;
 onMessageProcessed?: (message: any) => void;
}

export function ContentComposerChatInterfaceComponent(
 props: ContentComposerChatInterfaceProps
): React.ReactElement {
 const { toast } = useToast();
 const userData = useUserContext();
 const { graphData } = useGraphContext();
 const {
   messages,
   setMessages,
   streamMessage,
   setIsStreaming,
   searchEnabled,
 } = graphData;
 const { getUserThreads } = useThreadContext();
 const [isRunning, setIsRunning] = useState(false);
 const messageRef = useRef<HTMLDivElement>(null);
 const ffmpegRef = useRef(new FFmpeg());
 const { isPresentationMode, currentSlide, getSlideContent, startPresentation } = usePresentation();

 // Listen for presentation mode requests from welcome page
 useEffect(() => {
   const handlePresentationModeChange = (event: CustomEvent) => {
     if (event.detail?.isActive === true && !isPresentationMode) {
       console.log("🔍 Received presentation mode change event");
       startPresentation();
     }
   };
   
   window.addEventListener('presentationModeChange', handlePresentationModeChange as EventListener);
   
   return () => {
     window.removeEventListener('presentationModeChange', handlePresentationModeChange as EventListener);
   };
 }, [isPresentationMode, startPresentation]);

 // Check if message is a presentation start command
 const isPresentationStartCommand = (content: string): boolean => {
   const normalizedContent = content.toLowerCase().trim();
   return normalizedContent.includes('start presentation') || 
          normalizedContent.includes('start carvedilol');
 };

 // Enhanced function to determine if the message is likely a question about slide content
 const isSlideContentQuestion = (content: string): boolean => {
  const normalizedContent = content.toLowerCase().trim();
  
  // For presentation mode, almost all user inputs that aren't navigation commands
  // should be treated as content questions to improve context-awareness
  if (isPresentationMode) {
    // First: explicitly reject start commands from being treated as content questions
    if (normalizedContent.includes('start carvedilol') || 
        normalizedContent.includes('start presentation')) {
      return false;
    }
    
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
      normalizedContent.includes('start carvedilol') ||
      normalizedContent.match(/^slide \d+$/i) !== null ||
      // Standard yes/no responses to "Would you like to test your knowledge?"
      ((normalizedContent === 'yes' ||
        normalizedContent === 'no' ||
        normalizedContent === 'sure' ||
        normalizedContent === 'ok') &&
       normalizedContent.length < 5);
   
    // If it's not a navigation command and has a reasonable length, treat as content question
    return !isNavigationCommand && normalizedContent.length > 5;
  }
 
  // If not in presentation mode, return false
  return false;
};

 // Enhanced message processor for presentation mode - fixed with void return type
 const enhancedMessageProcessor = useCallback((message: any): void => {
   // Skip if no message
   if (!message) return;
  
   console.log("🔍 Message processor called with:", message?.id);
  
   // Apply original processor if available
   if (props.onMessageProcessed) {
     props.onMessageProcessed(message);
   }
  
   // Special handling for presentation mode messages
   if (isPresentationMode && message instanceof AIMessage) {
     console.log("🔍 Processing presentation mode message:", message.id);
    
     // Check if already processed by this component
     if (message.additional_kwargs?._composerProcessed) {
       return;
     }
    
     // Mark as processed
     if (!message.additional_kwargs) {
       message.additional_kwargs = {};
     }
     message.additional_kwargs._composerProcessed = true;
    
     // Update slide content info if missing
     if (!message.additional_kwargs.currentSlideContent && currentSlide) {
       message.additional_kwargs.currentSlideContent = getSlideContent(currentSlide);
       message.additional_kwargs.currentSlide = currentSlide;
       message.additional_kwargs.presentationMode = true;
     }
    
     // Check for HTML comments and replace with metadata flag
     if (typeof message.content === 'string' && message.content.includes("<!-- SHOW_QUESTION -->")) {
       // Update the message to remove HTML comment and set flag in metadata
       const cleanedContent = message.content.replace("<!-- SHOW_QUESTION -->", "");
       message.additional_kwargs.showQuestion = true;
      
       // Update the message content to remove the comment
       setTimeout(() => {
         setMessages(prevMessages => {
           return prevMessages.map(m => {
             if (m.id === message.id) {
               return new AIMessage({
                 ...message,
                 content: cleanedContent,
                 additional_kwargs: {
                   ...message.additional_kwargs,
                   _refreshed: true,
                   _refreshTimestamp: Date.now()
                 }
               });
             }
             return m;
           });
         });
        
         console.log("🔍 Cleaned up HTML comment in message");
       }, 50);
     }
    
     // Force a UI update by refreshing the message
     setTimeout(() => {
       setMessages(prevMessages => {
         return prevMessages.map(m => {
           if (m.id === message.id) {
             // Create a new message object to force React to detect the change
             return new AIMessage({
               ...message,
               additional_kwargs: {
                 ...message.additional_kwargs,
                 _refreshed: true,
                 _refreshTimestamp: Date.now()
               }
             });
           }
           return m;
         });
       });
      
       console.log("🔍 Content composer forced message refresh");
     }, 50);
   }
 }, [isPresentationMode, currentSlide, getSlideContent, setMessages, props.onMessageProcessed]);

 async function onNew(message: AppendMessage): Promise<void> {
   // Explicitly check for false and not ! since this does not provide a default value
   // so we should assume undefined is true.
   if (message.startRun === false) return;
   if (!userData.user) {
     toast({
       title: "User not found",
       variant: "destructive",
       duration: 5000,
     });
     return;
   }

   if (message.content?.[0]?.type !== "text") {
     toast({
       title: "Only text messages are supported",
       variant: "destructive",
       duration: 5000,
     });
     return;
   }
   props.setChatStarted(true);
   setIsRunning(true);
   setIsStreaming(true);

   const contentDocuments: ContextDocument[] = [];
   if (message.attachments) {
     const files = message.attachments
       .map((a) => a.file)
       .filter((f): f is File => f != null);
     const fileList = arrayToFileList(files);
     if (fileList) {
       const documentsResult = await convertDocuments({
         ffmpeg: ffmpegRef.current,
         messageRef,
         documents: fileList,
         userId: userData.user.id,
         toast,
       });
       contentDocuments.push(...documentsResult);
     }
   }
   try {
     const messageContent = message.content[0].text;
     const additionalKwargs: Record<string, any> = {
       documents: contentDocuments,
     };
    
     // Check if this is a presentation start command
     const isPresentationStart = isPresentationStartCommand(messageContent);
     
     if (isPresentationStart) {
       console.log("🔍 Detected presentation start command:", messageContent);
       
       // Set presentation mode directly
       startPresentation();
       
       // Add presentation mode flags
       additionalKwargs.presentationMode = true;
       additionalKwargs.presentationSlide = 1;
       additionalKwargs.currentSlideContent = SLIDES_CONTENT[1];
       additionalKwargs.slideContext = SLIDE_CONTEXT[1]?.details || "";
       
       // Generate a unique ID for tracking
       const messageId = uuidv4();
       
       // Create properly formatted human message
       const humanMessage = new HumanMessage({
         content: messageContent,
         id: messageId,
         additional_kwargs: additionalKwargs,
       });
       
       setMessages((prevMessages) => [...prevMessages, humanMessage]);
       
       // Create a proper GraphInput object with presentation mode enabled
       await streamMessage({
         messages: [convertToOpenAIFormat(humanMessage)],
         presentationMode: true,
         presentationSlide: 1,
         slideContent: SLIDES_CONTENT[1],
         slideContext: SLIDE_CONTEXT[1]?.details || ""
       } as any);
       
       // Notify other components about presentation mode
       window.dispatchEvent(new CustomEvent('presentationModeChange', { 
         detail: { isActive: true } 
       }));
       
       setIsRunning(false);
       return;
     }
    
     // Add slide content information if in presentation mode
     if (isPresentationMode) {
       // Create a comprehensive presentation context object with all slides
       const allPresentationContent = SLIDES_CONTENT;
      
       // Add main slide content
       additionalKwargs.presentationContent = allPresentationContent;
       additionalKwargs.currentSlideContent = getSlideContent(currentSlide);
       additionalKwargs.currentSlide = currentSlide;
       additionalKwargs.presentationMode = true;
      
       // Add additional slide context
       additionalKwargs.slideContext = SLIDE_CONTEXT[currentSlide]?.details || "";
       additionalKwargs.slideTitle = SLIDE_CONTEXT[currentSlide]?.title || "";
      
       // Add all slide context
       additionalKwargs.allSlideContext = SLIDE_CONTEXT;
      
       // Check if it appears to be a question about the slide content
       const isContentQ = isSlideContentQuestion(messageContent);
       if (isContentQ) {
         console.log("🔍 Detected content question:", messageContent);
         additionalKwargs.isContentQuestion = true;
       }
     }
    
     // Generate a unique ID for tracking
     const messageId = uuidv4();
     
     // Log the message creation
     console.log(`🔍 Creating human message with ID: ${messageId}`);
    
     const humanMessage = new HumanMessage({
       content: messageContent,
       id: messageId,
       additional_kwargs: additionalKwargs,
     });
     
     setMessages((prevMessages) => [...prevMessages, humanMessage]);
     
     // Create a proper GraphInput object
     const graphInput = {
       messages: [convertToOpenAIFormat(humanMessage)]
     };
    
     // Cast to any to bypass TypeScript checking for presentation properties
     const typedGraphInput = graphInput as any;
    
     // Add slide content information if in presentation mode
     if (isPresentationMode) {
       // Create a comprehensive presentation context object with all slides
       const allPresentationContent = SLIDES_CONTENT;
      
       // Add main slide content
       typedGraphInput.presentationContent = allPresentationContent;
       typedGraphInput.currentSlideContent = getSlideContent(currentSlide);
       typedGraphInput.presentationSlide = currentSlide;
       typedGraphInput.presentationMode = true;
      
       // Add additional slide context
       typedGraphInput.slideContent = getSlideContent(currentSlide);
       typedGraphInput.slideContext = SLIDE_CONTEXT[currentSlide]?.details || "";
       typedGraphInput.slideTitle = SLIDE_CONTEXT[currentSlide]?.title || "";
      
       // Add all slide context
       typedGraphInput.allSlideContext = SLIDE_CONTEXT;
      
       // Check if it appears to be a question about the slide content
       const isContentQ = isSlideContentQuestion(messageContent);
       if (isContentQ) {
         console.log("🔍 Detected content question:", messageContent);
         typedGraphInput.isContentQuestion = true;
       }
       
       // Add message ID for tracking
       typedGraphInput.messageId = messageId;
       
       // Log before streaming message
       console.log("🔍 Streaming message with presentation data", {
         slide: currentSlide,
         isContentQuestion: isContentQ
       });
     }
     
     await streamMessage(typedGraphInput);
   } finally {
     setIsRunning(false);
     // Re-fetch threads so that the current thread's title is updated.
     await getUserThreads();
   }
 }

 const threadMessages = useExternalMessageConverter<BaseMessage>({
   callback: convertLangchainMessages,
   messages,
   isRunning,
   joinStrategy: "none",
 });

 const runtime = useExternalStoreRuntime({
   messages: threadMessages,
   isRunning,
   onNew,
   adapters: {
     attachments: new CompositeAttachmentAdapter([
       new SimpleTextAttachmentAdapter(),
       new AudioAttachmentAdapter(),
       new VideoAttachmentAdapter(),
       new PDFAttachmentAdapter(),
     ]),
   },
 });

 return (
   <div className="h-full w-full">
     <AssistantRuntimeProvider runtime={runtime}>
       <Thread
         userId={userData?.user?.id}
         setChatStarted={props.setChatStarted}
         handleQuickStart={props.handleQuickStart}
         hasChatStarted={props.hasChatStarted}
         switchSelectedThreadCallback={props.switchSelectedThreadCallback}
         searchEnabled={searchEnabled}
         setChatCollapsed={props.setChatCollapsed}
         onMessageProcessed={enhancedMessageProcessor}
       />
     </AssistantRuntimeProvider>
     <Toaster />
   </div>
 );
}

export const ContentComposerChatInterface = React.memo(
 ContentComposerChatInterfaceComponent
);