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
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Thread as ThreadType } from "@langchain/langgraph-sdk";
import React, { useRef, useState } from "react";
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
  const { isPresentationMode, currentSlide, getSlideContent } = usePresentation();

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
      
      // Add slide content information if in presentation mode
      if (isPresentationMode) {
        // Get all presentation slide content to provide full context
        const allPresentationContent = {
          1: "Introduction: Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?",
          2: "Heart Failure Burden: Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
          3: "Mechanism & Indication of Carvedilol: Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
          4: "COPERNICUS Trial Results: Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
          5: "Subgroup Effects: The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
          6: "Safety Profile: Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
          7: "Dosing Guidelines: The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
        };
        
        // Add all slide content as context
        additionalKwargs.presentationContent = allPresentationContent;
        additionalKwargs.currentSlideContent = getSlideContent(currentSlide);
        additionalKwargs.currentSlide = currentSlide;
        additionalKwargs.presentationMode = true;
        
        // Check if it appears to be a question about the slide content
        const isContentQ = isSlideContentQuestion(messageContent);
        if (isContentQ) {
          console.log("🔍 Detected content question:", messageContent);
          additionalKwargs.isContentQuestion = true;
        }
      }
      
      const humanMessage = new HumanMessage({
        content: messageContent,
        id: uuidv4(),
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
        // Get all presentation slide content to provide full context
        const allPresentationContent = {
          1: "Introduction: Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?",
          2: "Heart Failure Burden: Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
          3: "Mechanism & Indication of Carvedilol: Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
          4: "COPERNICUS Trial Results: Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
          5: "Subgroup Effects: The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
          6: "Safety Profile: Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
          7: "Dosing Guidelines: The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
        };
        
        // Add all slide content as context
        additionalKwargs.presentationContent = allPresentationContent;
        additionalKwargs.currentSlideContent = getSlideContent(currentSlide);
        additionalKwargs.currentSlide = currentSlide;
        additionalKwargs.presentationMode = true;
        
        // Check if it appears to be a question about the slide content
        const isContentQ = isSlideContentQuestion(messageContent);
        if (isContentQ) {
          console.log("🔍 Detected content question:", messageContent);
          additionalKwargs.isContentQuestion = true;
        }
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
          onMessageProcessed={props.onMessageProcessed}
        />
      </AssistantRuntimeProvider>
      <Toaster />
    </div>
  );
}

export const ContentComposerChatInterface = React.memo(
  ContentComposerChatInterfaceComponent
);