"use client";

// Import UI components needed for message rendering
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ActionBarPrimitive,
  getExternalStoreMessage,
  MessagePrimitive,
  MessageState,
  useMessage,
} from "@assistant-ui/react";
import React, { Dispatch, SetStateAction, type FC } from "react";

import { MarkdownText } from "@/components/ui/assistant-ui/markdown-text";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FeedbackButton } from "./feedback";
import { TighterText } from "../ui/header";
import { useFeedback } from "@/hooks/useFeedback";
import { ContextDocumentsUI } from "../tool-hooks/AttachmentsToolUI";
import { HumanMessage } from "@langchain/core/messages";
import { OC_HIDE_FROM_UI_KEY } from "@opencanvas/shared/constants";
import { Button } from "../ui/button";
import { WEB_SEARCH_RESULTS_QUERY_PARAM } from "@/constants";
import { Globe } from "lucide-react";
import { useQueryState } from "nuqs";

// Props for the assistant message component
interface AssistantMessageProps {
  runId: string | undefined;
  feedbackSubmitted: boolean;
  setFeedbackSubmitted: Dispatch<SetStateAction<boolean>>;
}

// Component to display the assistant's thinking process in an accordion
const ThinkingAssistantMessageComponent = ({
  message,
}: {
  message: MessageState;
}): React.ReactElement => {
  const { id, content } = message;
  let contentText = "";
  // Extract text content from different possible formats
  if (typeof content === "string") {
    contentText = content;
  } else {
    const firstItem = content?.[0];
    if (firstItem?.type === "text") {
      contentText = firstItem.text;
    }
  }

  // Don't render anything if there's no content
  if (contentText === "") {
    return <></>;
  }

  // Render the thinking process in a collapsible accordion
  return (
    <Accordion
      defaultValue={`accordion-${id}`}
      type="single"
      collapsible
      className="w-full"
    >
      <AccordionItem value={`accordion-${id}`}>
        <AccordionTrigger>Thoughts</AccordionTrigger>
        <AccordionContent>{contentText}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

// Memoize the component to prevent unnecessary re-renders
const ThinkingAssistantMessage = React.memo(ThinkingAssistantMessageComponent);

// Component to display a button for viewing web search results
const WebSearchMessageComponent = ({ message }: { message: MessageState }) => {
  const [_, setShowWebResultsId] = useQueryState(
    WEB_SEARCH_RESULTS_QUERY_PARAM
  );

  // Function to show web search results when button is clicked
  const handleShowWebSearchResults = () => {
    if (!message.id) {
      return;
    }

    setShowWebResultsId(message.id);
  };

  // Render a button that shows web search results when clicked
  return (
    <div className="flex mx-8">
      <Button
        onClick={handleShowWebSearchResults}
        variant="secondary"
        className="bg-blue-50 hover:bg-blue-100 transition-all ease-in-out duration-200 w-full"
      >
        <Globe className="size-4 mr-2" />
        Web Search Results
      </Button>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
const WebSearchMessage = React.memo(WebSearchMessageComponent);

// Main component for rendering assistant messages
export const AssistantMessage: FC<AssistantMessageProps> = ({
  runId,
  feedbackSubmitted,
  setFeedbackSubmitted,
}) => {
  const message = useMessage();
  const { isLast } = message;
  // Check message type based on ID prefix
  const isThinkingMessage = message.id.startsWith("thinking-");
  const isWebSearchMessage = message.id.startsWith("web-search-results-");

  // Render thinking message if it has the thinking prefix
  if (isThinkingMessage) {
    return <ThinkingAssistantMessage message={message} />;
  }

  // Render web search message if it has the web search prefix
  if (isWebSearchMessage) {
    return <WebSearchMessage message={message} />;
  }

  // Render standard assistant message with avatar and content
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-2xl grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      {/* Avatar with Sama Therapeutics logo */}
      <Avatar className="col-start-1 row-span-full row-start-1 mr-4">
        <AvatarFallback>
          <img src="/samalogo.avif" alt="Sama Therapeutics" className="h-3/4 w-3/4 object-contain" />
        </AvatarFallback>
      </Avatar>

      {/* Message content and feedback buttons */}
      <div className="text-foreground col-span-2 col-start-2 row-start-1 my-1.5 max-w-xl break-words leading-7">
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
        {/* Show feedback buttons for the last message if it has a runId */}
        {isLast && runId && (
          <MessagePrimitive.If lastOrHover assistant>
            <AssistantMessageBar
              feedbackSubmitted={feedbackSubmitted}
              setFeedbackSubmitted={setFeedbackSubmitted}
              runId={runId}
            />
          </MessagePrimitive.If>
        )}
      </div>
    </MessagePrimitive.Root>
  );
};

// Component for rendering user messages
export const UserMessage: FC = () => {
  const msg = useMessage(getExternalStoreMessage<HumanMessage>);
  const humanMessage = Array.isArray(msg) ? msg[0] : msg;

  // Skip rendering if the message is marked to be hidden from UI
  if (humanMessage?.additional_kwargs?.[OC_HIDE_FROM_UI_KEY]) return null;

  // Render the user message in a blue bubble
  return (
    <MessagePrimitive.Root className="grid w-full max-w-2xl auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4">
      {/* Show any attached context documents */}
      <ContextDocumentsUI
        message={humanMessage}
        className="col-start-2 row-start-1"
      />
      {/* Blue message bubble with the user's text */}
      <div className="bg-[#1152e2] text-white col-start-2 row-start-2 max-w-xl break-words rounded-3xl px-5 py-2.5">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};

// Props for the feedback buttons bar
interface AssistantMessageBarProps {
  runId: string;
  feedbackSubmitted: boolean;
  setFeedbackSubmitted: Dispatch<SetStateAction<boolean>>;
}

// Component that shows thumbs up/down feedback buttons for assistant messages
const AssistantMessageBarComponent = ({
  runId,
  feedbackSubmitted,
  setFeedbackSubmitted,
}: AssistantMessageBarProps) => {
  const { isLoading, sendFeedback } = useFeedback();
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex items-center mt-2"
    >
      {/* Show thank you message if feedback was already submitted */}
      {feedbackSubmitted ? (
        <TighterText className="text-gray-500 text-sm">
          Feedback received! Thank you!
        </TighterText>
      ) : (
        <>
          {/* Thumbs up button */}
          <ActionBarPrimitive.FeedbackPositive asChild>
            <FeedbackButton
              isLoading={isLoading}
              sendFeedback={sendFeedback}
              setFeedbackSubmitted={setFeedbackSubmitted}
              runId={runId}
              feedbackValue={1.0}
              icon="thumbs-up"
            />
          </ActionBarPrimitive.FeedbackPositive>
          {/* Thumbs down button */}
          <ActionBarPrimitive.FeedbackNegative asChild>
            <FeedbackButton
              isLoading={isLoading}
              sendFeedback={sendFeedback}
              setFeedbackSubmitted={setFeedbackSubmitted}
              runId={runId}
              feedbackValue={0.0}
              icon="thumbs-down"
            />
          </ActionBarPrimitive.FeedbackNegative>
        </>
      )}
    </ActionBarPrimitive.Root>
  );
};

// Memoize the component to prevent unnecessary re-renders
const AssistantMessageBar = React.memo(AssistantMessageBarComponent);