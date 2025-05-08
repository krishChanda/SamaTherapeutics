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

//Array of prompts for search mode (these are the ones that will be shown when search is enabled)
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

//these are the entry points for different presentations
const QUICK_START_PROMPTS = [
  "Start carvedilol presentation",//Primary presentation that is currently being used
  "Start hypertension presentation",
  "Start diabetes presentation",
  "Start EKG basics presentation",
  "Start lifestyle changes presentation",
  "Start AFib presentation",
];

// This function takes an array of prompts and a count, shuffles the array, and returns a random selection of prompts
function getRandomPrompts(prompts: string[], count: number = 4): string[] {
  return [...prompts].sort(() => Math.random() - 0.5).slice(0, count);
}

//Interface for the props of the QuickStartButtons component
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

// This component renders the quick start prompts
const QuickStartPrompts = ({ searchEnabled, setChatStarted }: QuickStartPromptsProps) => {
  // Get the thread runtime for sending messages
  const threadRuntime = useThreadRuntime();
  //Access the presentation context for control over the presentation
  const { startPresentation } = usePresentation();
  //access the graph context for streaming messages
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages } = graphData;

  //Important to note: this function is used to handle the click event for the quick start prompts
  // this is where the logic for starting a presentation is handled and the AI is instructed to begin the presentation using the predefined script  
  const handleClick = (text: string) => {
    // Determine if the clicked prompt is a presentation start command
    // This checks if the text includes 'start presentation' or 'start carvedilol'
    // This is case insensitive
    const isPresentationStart = text.toLowerCase().includes('start presentation') || 
                               text.toLowerCase().includes('start carvedilol');
    
    if (isPresentationStart) {
      console.log("🔍 Starting presentation from welcome page");
      // activate the presentation mode
      // This changes the global state to show the presentation UI      
      startPresentation();
      
      // Generate a unique ID for the message
      // This is important for tracking the message in the UI
      const messageId = uuidv4();
      
      // Create a new HumanMessage instance for the UI
      // Important to note the additional_kwargs are used to set the presentation mode and slide number
       const humanMessageForUI = new HumanMessage({
        content: text,
        id: messageId,
        additional_kwargs: {
          presentationMode: true, //flag is important for activating the presentation mode
          presentationSlide: 1 //start with the first slide
        }
      });
      
      // Add the message to the UI message history
      setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
      
      // Stream the message to the AI system with special metadata
      // This is where we inform the backend that we want to use the predefined script for the presentation
      streamMessage({
        messages: [{
          role: "human",
          content: text,
          id: messageId
        }],
        presentationMode: true, //flag is important for activating the presentation mode
        presentationSlide: 1 //start with the first slide
      } as any);
      
      // Update the UI state to show we have started the chat
      if (setChatStarted) {
        setChatStarted(true);
      }
      
      // Event to notify the system that we are in presentation mode
      // This allows components such a Canvas and MultipleChoice to react to the change
      window.dispatchEvent(new CustomEvent('presentationModeChange', { 
        detail: { isActive: true } 
      }));
      
      // Return early to prevent regular message handling
      return;
    }
    
    // For non presentation messages, we need to send the message to the AI system
    // This code path is regular chat and not presentations
    if (setChatStarted) {
      setChatStarted(true);
    }
    
    threadRuntime.append({
      role: "user",
      content: [{ type: "text", text }],
    });
  };

  // get random subset of prompts to show on the welcome page
  const selectedPrompts = useMemo(
    () =>
      getRandomPrompts(
        searchEnabled ? QUICK_START_PROMPTS_SEARCH : QUICK_START_PROMPTS
      ),
    [searchEnabled]
  );

  // Render the quick start prompts as buttons
  return (
    <div className="flex flex-col w-full gap-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {selectedPrompts.map((prompt, index) => (
          <Button
            key={`quick-start-prompt-${index}`}
            onClick={() => handleClick(prompt)} //connect to handleClick function
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

//component that wraps QuickStartPrompts with additional functionality
const QuickStartButtons = (props: QuickStartButtonsProps) => {
  //Handler for language selection in programming mode (not used for presentations)
  const handleLanguageSubmit = (language: ProgrammingLanguageOptions) => {
    props.handleQuickStart("code", language);
  };

  //Render the UI with the composer (text input) and promt buttons
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

//Interface for the ThreadWelcome component
interface ThreadWelcomeProps {
  handleQuickStart: (
    type: "text" | "code",
    language?: ProgrammingLanguageOptions
  ) => void;
  composer: React.ReactNode;
  searchEnabled: boolean;
  setChatStarted: React.Dispatch<React.SetStateAction<boolean>>;
}

//Main welcome component that gets exported and used in the application
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
              composer={props.composer} //text input component
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