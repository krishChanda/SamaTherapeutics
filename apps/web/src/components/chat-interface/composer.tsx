"use client";

import { ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { type FC, useState, useEffect, useRef } from "react";

import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { SendHorizontalIcon } from "lucide-react";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import { ComposerAttachments } from "../assistant-ui/attachment";
import { ComposerActionsPopOut } from "./composer-actions-popout";

const GENERIC_PLACEHOLDERS = [
  "Type your text here",
  "Enter your message here",
  "What would you like to write?",
  "Type your message here",
  "Start typing here",
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

const getRandomPlaceholder = (searchEnabled: boolean) => {
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
  // Removed runtime as it is not exported from "@assistant-ui/react"
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Set a fixed placeholder instead of using the random function
    setPlaceholder("Type your text here");
  }, [props.searchEnabled]);

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
      
      // If the message wasn't handled by processMessage, or processMessage wasn't provided,
      // let the runtime handle it normally
      // Removed runtime handling as it is not available
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
              className="tooltip-target my-2.5 size-8 p-1 transition-opacity ease-in bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <SendHorizontalIcon size={20} className="m-auto" />
            </button>
          </ThreadPrimitive.If>
          <ThreadPrimitive.If running>
            <ComposerPrimitive.Cancel asChild>
              <TooltipIconButton
                tooltip="Cancel"
                variant="default"
                className="my-2.5 size-2 p-2 transition-opacity ease-in"
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