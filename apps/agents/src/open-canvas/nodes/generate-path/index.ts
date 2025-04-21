import { extractUrls } from "@opencanvas/shared/utils/urls";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import {
  OpenCanvasGraphAnnotation,
  OpenCanvasGraphReturnType,
} from "../../state.js";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { dynamicDeterminePath } from "./dynamic-determine-path.js";
import {
  convertContextDocumentToHumanMessage,
  fixMisFormattedContextDocMessage,
} from "./documents.js";
import { getStringFromContent } from ".././../../utils.js";
import { includeURLContents } from "./include-url-contents.js";

function extractURLsFromLastMessage(messages: BaseMessage[]): string[] {
  if (!messages.length) return [];
  const recentMessage = messages[messages.length - 1];
  const recentMessageContent = getStringFromContent(recentMessage.content);
  const messageUrls = extractUrls(recentMessageContent);
  return messageUrls;
}

function getMessageContent(message: BaseMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  
  if (Array.isArray(message.content)) {
    return message.content.map(part => {
      if (typeof part === 'string') {
        return part;
      }
      if (part && typeof part === 'object' && 'type' in part && part.type === 'text' && 'text' in part) {
        return part.text as string;
      }
      return '';
    }).join(' ');
  }
  
  return '';
}

// Function to parse navigation commands in the user's message
function parseNavigationCommand(message: string, currentSlide: number, totalSlides: number = 7): number | null {
  // Normalize the message
  const normalizedMsg = message.toLowerCase().trim();
  console.log("🔍 Parsing navigation command from:", normalizedMsg);
  
  // Check for "next slide" or similar
  if (normalizedMsg.includes("next slide") || 
      normalizedMsg.includes("go to next") || 
      normalizedMsg === "next" ||
      normalizedMsg === "go to next slide") {
    console.log("🔍 Next slide command detected");
    return Math.min(currentSlide + 1, totalSlides);
  }
  
  // Check for "previous slide" or similar
  if (normalizedMsg.includes("previous slide") || 
      normalizedMsg.includes("go back") || 
      normalizedMsg.includes("prior slide") || 
      normalizedMsg === "previous" || 
      normalizedMsg === "back") {
    console.log("🔍 Previous slide command detected");
    return Math.max(currentSlide - 1, 1);
  }
  
  // Check for "go to slide X" pattern
  const goToMatch = normalizedMsg.match(/go to slide (\d+)/i);
  if (goToMatch && goToMatch[1]) {
    const slideNum = parseInt(goToMatch[1], 10);
    console.log(`🔍 Go to slide ${slideNum} command detected`);
    if (slideNum >= 1 && slideNum <= totalSlides) {
      return slideNum;
    }
  }
  
  // Check for just the slide number
  const slideNumberMatch = normalizedMsg.match(/^slide (\d+)$/i);
  if (slideNumberMatch && slideNumberMatch[1]) {
    const slideNum = parseInt(slideNumberMatch[1], 10);
    console.log(`🔍 Slide ${slideNum} command detected`);
    if (slideNum >= 1 && slideNum <= totalSlides) {
      return slideNum;
    }
  }
  
  // If no valid navigation command was found
  console.log("🔍 No navigation command detected");
  return null;
}

/**
 * Routes to the proper node in the graph based on the user's query.
 */
export async function generatePath(
  state: typeof OpenCanvasGraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<OpenCanvasGraphReturnType> {
  console.log("🔍 Generate Path called");
  console.log("🔍 Presentation mode:", state.presentationMode);
  console.log("🔍 Presentation slide:", state.presentationSlide);
  
  // Check if we have explicit presentation mode flags in the incoming request
  const incomingData = config.configurable?.data as any;
  
  // If presentationMode is passed directly in the streamMessage call, use it
  const explicitPresentationMode = incomingData?.presentationMode;
  const explicitPresentationSlide = incomingData?.presentationSlide;
  
  console.log("🔍 Explicit presentation mode:", explicitPresentationMode);
  console.log("🔍 Explicit presentation slide:", explicitPresentationSlide);
  
  // If explicit presentation mode flags are provided, use them
  if (explicitPresentationMode !== undefined) {
    console.log("🔍 Using explicit presentation mode");
    
    return {
      next: "presentationModeHandler",
      presentationMode: true,
      presentationSlide: explicitPresentationSlide || state.presentationSlide || 1
    };
  }
  
  // Check if we're already in presentation mode
  if (state.presentationMode) {
    console.log("🔍 Already in presentation mode");
    
    // Check for navigation commands in the latest message
    if (state._messages.length > 0) {
      const latestMessage = state._messages[state._messages.length - 1];
      const messageContent = typeof latestMessage.content === 'string' 
        ? latestMessage.content 
        : Array.isArray(latestMessage.content) 
          ? latestMessage.content.map(c => typeof c === 'string' ? c : (c.type === 'text' ? c.text : '')).join(' ')
          : '';
      
      console.log("🔍 Latest message in generatePath:", messageContent);
      
      // Parse for navigation commands
      const currentSlide = state.presentationSlide || 1;
      const parsedSlideNumber = parseNavigationCommand(messageContent, currentSlide);
      
      // If a navigation command was detected, update the presentation slide
      if (parsedSlideNumber !== null) {
        console.log("🔍 Navigation command detected in generatePath! Going to slide:", parsedSlideNumber);
        return {
          next: "presentationModeHandler",
          presentationMode: true,
          presentationSlide: parsedSlideNumber
        };
      }
    }
    
    // If no navigation command was detected, just route to the presentation handler
    return {
      next: "presentationModeHandler",
      presentationMode: true,
      // Keep the current slide if it exists, otherwise default to 1
      presentationSlide: state.presentationSlide || 1
    };
  }

  const { _messages } = state;
  const newMessages: BaseMessage[] = [];
  const docMessage = await convertContextDocumentToHumanMessage(
    _messages,
    config
  );
  const existingDocMessage = newMessages.find(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some(
        (c) => c.type === "document" || c.type === "application/pdf"
      )
  );

  if (docMessage) {
    newMessages.push(docMessage);
  } else if (existingDocMessage) {
    const fixedMessages = await fixMisFormattedContextDocMessage(
      existingDocMessage,
      config
    );
    if (fixedMessages) {
      newMessages.push(...fixedMessages);
    }
  }

  if (state.highlightedCode) {
    return {
      next: "updateArtifact",
      ...(newMessages.length
        ? { messages: newMessages, _messages: newMessages }
        : {}),
    };
  }
  if (state.highlightedText) {
    return {
      next: "updateHighlightedText",
      ...(newMessages.length
        ? { messages: newMessages, _messages: newMessages }
        : {}),
    };
  }

  if (
    state.language ||
    state.artifactLength ||
    state.regenerateWithEmojis ||
    state.readingLevel
  ) {
    return {
      next: "rewriteArtifactTheme",
      ...(newMessages.length
        ? { messages: newMessages, _messages: newMessages }
        : {}),
    };
  }

  if (
    state.addComments ||
    state.addLogs ||
    state.portLanguage ||
    state.fixBugs
  ) {
    return {
      next: "rewriteCodeArtifactTheme",
      ...(newMessages.length
        ? { messages: newMessages, _messages: newMessages }
        : {}),
    };
  }

  if (state.customQuickActionId) {
    return {
      next: "customAction",
      ...(newMessages.length
        ? { messages: newMessages, _messages: newMessages }
        : {}),
    };
  }

  if (state.webSearchEnabled) {
    return {
      next: "webSearch",
      ...(newMessages.length
        ? { messages: newMessages, _messages: newMessages }
        : {}),
    };
  }

  // Check if any URLs are in the latest message. If true, determine if the contents should be included
  // inline in the prompt, and if so, scrape the contents and update the prompt.
  const messageUrls = extractURLsFromLastMessage(state._messages);
  let updatedMessageWithContents: HumanMessage | undefined = undefined;
  if (messageUrls.length) {
    updatedMessageWithContents = await includeURLContents(
      state._messages[state._messages.length - 1],
      messageUrls
    );
  }

  // Update the internal message list with the new message, if one was generated
  const newInternalMessageList = updatedMessageWithContents
    ? state._messages.map((m) => {
        if (m.id === updatedMessageWithContents.id) {
          return updatedMessageWithContents;
        } else {
          return m;
        }
      })
    : state._messages;

  // Check for messages like "start presentation" or "presentation mode"
  if (state._messages.length > 0) {
    const latestMessage = state._messages[state._messages.length - 1];
    const messageContent = getMessageContent(latestMessage);
    console.log("🔍 Latest message content in generatePath:", messageContent);

    if (messageContent.includes('start presentation') || 
        messageContent.includes('presentation mode') || 
        messageContent.includes('start carvedilol') ||
        messageContent.includes('carvedilol presentation')) {
      console.log("🔍 Presentation start command detected in generatePath!");
      return {
        next: "presentationModeHandler",
        presentationMode: true,
        presentationSlide: 1
      };
    }
  }

  const routingResult = await dynamicDeterminePath({
    state: {
      ...state,
      _messages: newInternalMessageList,
    },
    newMessages,
    config,
  });
  const route = routingResult?.route;
  if (!route) {
    throw new Error("Route not found");
  }

  // Create the messages object including the new messages if any
  const messages = newMessages.length
    ? {
        messages: newMessages,
        _messages: [...newInternalMessageList, ...newMessages],
      }
    : {
        _messages: newInternalMessageList,
      };

  return {
    next: route,
    ...messages,
  };
}