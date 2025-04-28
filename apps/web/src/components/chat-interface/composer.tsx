"use client";


import { ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { type FC, useState, useEffect, useRef } from "react";


import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { SendHorizontalIcon } from "lucide-react";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import { ComposerAttachments } from "../assistant-ui/attachment";
import { ComposerActionsPopOut } from "./composer-actions-popout";
import { usePresentation } from '@/contexts/PresentationContext';
import { SLIDES_CONTENT } from '@sama/shared';


const GENERIC_PLACEHOLDERS = [
 "Share your big idea and let's write something amazing",
 "Type your vision for the next great piece of content",
 "Your masterpiece begins with this prompt",
 "What would you like us to write about today?",
 "Drop your content idea here and let's create",
 "Your next great piece starts with this prompt",
 "Share your story idea and watch it unfold",
 "Let's write something incredible - start here",
 "Your writing journey begins with this prompt",
 "Turn your idea into content magic - start here",
];


const PRESENTATION_PLACEHOLDERS = [
 "Ask a question about heart failure or carvedilol",
 "Want to know more about specific slide content?",
 "Type 'next' to go to the next slide",
 "Questions about the presentation? Ask here",
 "Need more details on any slide? Just ask",
 "Type 'go to slide 4' to jump to a specific slide",
 "Curious about heart failure risks or treatments?",
 "Type 'question' to test your knowledge",
 "Ask for clarification about any slide content",
 "Type 'exit presentation' when you're finished",
];


const SEARCH_PLACEHOLDERS = [
 "Share your topic - I'll add live data",
 "Write about anything - I'll find sources",
 "Your idea + fresh research = great content",
 "Start here with real-time facts",
 "Topic here for data-rich content",
 "Create with current insights",
 "Write now with live sources",
 "Your story + fresh data",
 "Ideas welcome - research ready",
 "Start fresh with live facts",
];


const getRandomPlaceholder = (searchEnabled: boolean, isPresentationMode: boolean) => {
 if (isPresentationMode) {
   return PRESENTATION_PLACEHOLDERS[
     Math.floor(Math.random() * PRESENTATION_PLACEHOLDERS.length)
   ];
 }
  return searchEnabled
   ? SEARCH_PLACEHOLDERS[
       Math.floor(Math.random() * SEARCH_PLACEHOLDERS.length)
     ]
   : GENERIC_PLACEHOLDERS[
       Math.floor(Math.random() * GENERIC_PLACEHOLDERS.length)
     ];
};


const CircleStopIcon = () => {
 return (
   <svg
     xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 16 16"
     fill="currentColor"
     width="16"
     height="16"
   >
     <rect width="10" height="10" x="3" y="3" rx="2" />
   </svg>
 );
};


interface ComposerProps {
 chatStarted: boolean;
 userId: string | undefined;
 searchEnabled: boolean;
 processMessage?: (content: string) => Promise<boolean>;
}


export const Composer: FC<ComposerProps> = (props: ComposerProps) => {
 const [placeholder, setPlaceholder] = useState("");
 const [inputValue, setInputValue] = useState("");
 const [isProcessing, setIsProcessing] = useState(false);
 const { isPresentationMode, currentSlide } = usePresentation();
 const inputRef = useRef<HTMLTextAreaElement>(null);


 useEffect(() => {
   setPlaceholder(getRandomPlaceholder(props.searchEnabled, isPresentationMode));
 }, [props.searchEnabled, isPresentationMode]);
  // Update placeholder when slides change
 useEffect(() => {
   if (isPresentationMode) {
     // Create contextual placeholder based on current slide
     const slideContent = SLIDES_CONTENT[currentSlide];
     const slideHint = slideContent.length > 50
       ? slideContent.substring(0, 50) + "..."
       : slideContent;
    
     // Set a special placeholder for current slide
     if (currentSlide === 2) {
       setPlaceholder("Ask about heart failure statistics or why the risk is increasing");
     } else if (currentSlide === 3) {
       setPlaceholder("Ask about carvedilol's mechanism or indication");
     } else if (currentSlide === 4) {
       setPlaceholder("Questions about the COPERNICUS trial or results?");
     } else if (currentSlide === 5) {
       setPlaceholder("Ask about effects in specific patient subgroups");
     } else if (currentSlide === 6) {
       setPlaceholder("Questions about carvedilol's safety profile?");
     } else if (currentSlide === 7) {
       setPlaceholder("Ask about dosing or administration recommendations");
     } else {
       // Use random presentation placeholder
       setPlaceholder(getRandomPlaceholder(props.searchEnabled, isPresentationMode));
     }
   }
 }, [currentSlide, isPresentationMode, props.searchEnabled]);


 // Custom send handler to intercept commands for presentation mode
 const handleSend = async () => {
   if (!inputValue.trim() || isProcessing) return;
  
   setIsProcessing(true);
  
   try {
     // If processMessage is provided, use it first
     if (props.processMessage) {
       const wasHandled = await props.processMessage(inputValue);
      
       // If the message was handled by processMessage, reset input and return
       if (wasHandled) {
         setInputValue("");
         if (inputRef.current) {
           inputRef.current.value = "";
         }
         return;
       }
     }
    
     // Reset input after sending
     setInputValue("");
     if (inputRef.current) {
       inputRef.current.value = "";
     }
   } catch (err) {
     console.error("Error sending message:", err);
   } finally {
     setIsProcessing(false);
   }
 };


 // Handle input change
 const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
   setInputValue(e.target.value);
 };


 // Handle key press (Enter to send)
 const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
   if (e.key === 'Enter' && !e.shiftKey) {
     e.preventDefault();
     handleSend();
   }
 };


 return (
   <DragAndDropWrapper>
     <ComposerPrimitive.Root className="focus-within:border-aui-ring/20 flex flex-col w-full min-h-[64px] flex-wrap items-center justify-center border px-2.5 shadow-sm transition-colors ease-in bg-white rounded-2xl">
       <div className="flex flex-wrap gap-2 items-start mr-auto">
         <ComposerAttachments />
       </div>


       <div className="flex flex-row w-full items-center justify-start my-auto">
         <ComposerActionsPopOut
           userId={props.userId}
           chatStarted={props.chatStarted}
         />
         <textarea
           ref={inputRef}
           value={inputValue}
           onChange={handleInputChange}
           onKeyDown={handleKeyDown}
           placeholder={placeholder}
           rows={1}
           className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
           disabled={isProcessing}
         />
         <ThreadPrimitive.If running={false}>
           <button
             onClick={handleSend}
             disabled={!inputValue.trim() || isProcessing}
             className="tooltip-target my-2.5 size-8 p-2 transition-opacity ease-in bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <SendHorizontalIcon />
           </button>
         </ThreadPrimitive.If>
         <ThreadPrimitive.If running>
           <ComposerPrimitive.Cancel asChild>
             <TooltipIconButton
               tooltip="Cancel"
               variant="default"
               className="my-2.5 size-8 p-2 transition-opacity ease-in"
             >
               <CircleStopIcon />
             </TooltipIconButton>
           </ComposerPrimitive.Cancel>
         </ThreadPrimitive.If>
       </div>
     </ComposerPrimitive.Root>
   </DragAndDropWrapper>
 );
};
