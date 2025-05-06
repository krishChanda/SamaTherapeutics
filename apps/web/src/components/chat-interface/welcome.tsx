"use client";

import { ProgrammingLanguageOptions } from "@opencanvas/shared/types";
import { ThreadPrimitive, useThreadRuntime } from "@assistant-ui/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FC, useMemo } from "react";
import { TighterText } from "../ui/header";
import { NotebookPen } from "lucide-react";
import { ProgrammingLanguagesDropdown } from "../ui/programming-lang-dropdown";
import { Button } from "../ui/button";
import { usePresentation } from '@/contexts/PresentationContext';
import { v4 as uuidv4 } from "uuid";
import { HumanMessage } from "@langchain/core/messages";
import { useGraphContext } from "@/contexts/GraphContext";

const QUICK_START_PROMPTS_SEARCH = [
  "Write a market analysis of AI chip manufacturers in 2025",
  "Create a blog post about the latest climate change policies and their impact",
  "Draft an investor update on renewable energy trends this quarter",
  "Write a report on current cybersecurity threats in cloud computing",
  "Analyze the latest developments in quantum computing for a tech newsletter",
  "Create a summary of emerging medical breakthroughs in cancer treatment",
  "Write about the impact of current interest rates on the housing market",
  "Draft an article about breakthroughs in battery technology this year",
  "Analyze current supply chain disruptions in semiconductor manufacturing",
  "Write about how recent AI regulations affect business innovation",
];

const QUICK_START_PROMPTS = [
  "Start carvedilol presentation",
  "Start hypertension presentation",
  "Start diabetes presentation",
  "Start EKG basics presentation",
  "Start lifestyle changes presentation",
  "Start AFib presentation",
];

function getRandomPrompts(prompts: string[], count: number = 4): string[] {
  return [...prompts].sort(() => Math.random() - 0.5).slice(0, count);
}

interface QuickStartButtonsProps {
  handleQuickStart: (
    type: "text" | "code",
    language?: ProgrammingLanguageOptions
  ) => void;
  composer: React.ReactNode;
  searchEnabled: boolean;
  setChatStarted?: React.Dispatch<React.SetStateAction<boolean>>;
}

interface QuickStartPromptsProps {
  searchEnabled: boolean;
  setChatStarted?: React.Dispatch<React.SetStateAction<boolean>>;
}

const QuickStartPrompts = ({ searchEnabled, setChatStarted }: QuickStartPromptsProps) => {
  const threadRuntime = useThreadRuntime();
  const { startPresentation } = usePresentation();
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages } = graphData;

  const handleClick = (text: string) => {
    // Check if this is a presentation start command
    const isPresentationStart = text.toLowerCase().includes('start presentation') || 
                               text.toLowerCase().includes('start carvedilol');
    
    if (isPresentationStart) {
      console.log("🔍 Starting presentation from welcome page");
      
      // Start presentation mode directly
      startPresentation();
      
      // Create a message ID
      const messageId = uuidv4();
      
      // Create a HumanMessage for UI purposes
      const humanMessageForUI = new HumanMessage({
        content: text,
        id: messageId,
        additional_kwargs: {
          presentationMode: true,
          presentationSlide: 1
        }
      });
      
      // Add the message to the UI
      setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
      
      // Stream the message with presentation mode enabled
      streamMessage({
        messages: [{
          role: "human",
          content: text,
          id: messageId
        }],
        presentationMode: true,
        presentationSlide: 1
      } as any);
      
      // Set chat started to ensure UI updates properly
      if (setChatStarted) {
        setChatStarted(true);
      }
      
      // Dispatch event to notify other components of presentation mode
      window.dispatchEvent(new CustomEvent('presentationModeChange', { 
        detail: { isActive: true } 
      }));
      
      // Return early to prevent regular message handling
      return;
    }
    
    // Regular message handling - only for non-presentation messages
    if (setChatStarted) {
      setChatStarted(true);
    }
    
    threadRuntime.append({
      role: "user",
      content: [{ type: "text", text }],
    });
  };

  const selectedPrompts = useMemo(
    () =>
      getRandomPrompts(
        searchEnabled ? QUICK_START_PROMPTS_SEARCH : QUICK_START_PROMPTS
      ),
    [searchEnabled]
  );

  return (
    <div className="flex flex-col w-full gap-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {selectedPrompts.map((prompt, index) => (
          <Button
            key={`quick-start-prompt-${index}`}
            onClick={() => handleClick(prompt)}
            variant="outline"
            className="min-h-[60px] w-full flex items-center justify-center p-6 whitespace-normal text-gray-500 hover:text-gray-700 transition-colors ease-in rounded-2xl"
          >
            <p className="text-center break-words text-sm font-normal">
              {prompt}
            </p>
          </Button>
        ))}
      </div>
    </div>
  );
};

const QuickStartButtons = (props: QuickStartButtonsProps) => {
  const handleLanguageSubmit = (language: ProgrammingLanguageOptions) => {
    props.handleQuickStart("code", language);
  };

  return (
    <div className="flex flex-col gap-8 items-center justify-center w-full">
      <div className="flex flex-col gap-6 mt-2 w-full">
        {props.composer}
        <QuickStartPrompts 
          searchEnabled={props.searchEnabled} 
          setChatStarted={props.setChatStarted} 
        />
      </div>
    </div>
  );
};

interface ThreadWelcomeProps {
  handleQuickStart: (
    type: "text" | "code",
    language?: ProgrammingLanguageOptions
  ) => void;
  composer: React.ReactNode;
  searchEnabled: boolean;
  setChatStarted: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ThreadWelcome: FC<ThreadWelcomeProps> = (
  props: ThreadWelcomeProps
) => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex items-center justify-center mt-16 w-full">
        <div className="text-center max-w-3xl w-full">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden bg-white flex items-center justify-center">
            <img 
              src="/sama_therapeutics_logo.jpeg" 
              alt="Sama Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <TighterText className="mt-6 text-2xl font-medium">
            How can I help you?
          </TighterText>
          <div className="mt-8 w-full">
            <QuickStartButtons
              composer={props.composer}
              handleQuickStart={props.handleQuickStart}
              searchEnabled={props.searchEnabled}
              setChatStarted={props.setChatStarted}
            />
          </div>
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};