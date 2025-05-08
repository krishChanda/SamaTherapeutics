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
import { includeURLContents } from "./include-url-contents.js";
import { SLIDES_CONTENT, SLIDE_CONTEXT } from "@sama/shared";

// Create a helper object for pattern matching
const COMMAND_PATTERNS = {
  startPresentation: [
    "start carvedilol presentation",
    "start carvedilol",
    "start presentation",
    "presentation mode",
    "carvedilol presentation",
    "begin presentation",
    "show presentation",
    "start slides"
  ],
  navigation: {
    next: ["next slide", "go to next", "next", "go to next slide"],
    previous: ["previous slide", "go back", "prior slide", "previous", "back"],
    goToPattern: /go to slide (\d+)/i,
    slideNumberPattern: /^slide (\d+)$/i
  },
  questionRequest: [
    "test my knowledge",
    "quiz",
    "ask me a question",
    "would like a question",
    "question"
  ],
  simpleResponse: ["yes", "no", "skip", "continue"]
};

// Unified message normalization
function normalizeMessage(message: string): string {
  return message.toLowerCase().trim();
}

// Unified pattern matching
function matchesAnyPattern(normalizedMsg: string, patterns: string[]): boolean {
  return patterns.some(pattern => normalizedMsg.includes(pattern));
}

// Helper function to create presentation route objects
function createPresentationRoute(
  slideNumber: number, 
  options: {
    isContentQuestion?: boolean;
    showPresentationQuestion?: boolean;
  } = {}
): OpenCanvasGraphReturnType {
  return {
    next: "presentationModeHandler",
    presentationMode: true,
    presentationSlide: slideNumber,
    isContentQuestion: options.isContentQuestion || false,
    showPresentationQuestion: options.showPresentationQuestion || false,
    slideContent: SLIDES_CONTENT[slideNumber],
    slideContext: SLIDE_CONTEXT[slideNumber]?.details || ""
  };
}

// Helper function for creating route objects with consistent message handling
function createRoute(
  routeName: string,
  newMessages: BaseMessage[] = []
): OpenCanvasGraphReturnType {
  return {
    next: routeName,
    ...(newMessages.length
      ? { messages: newMessages, _messages: newMessages }
      : {}),
  };
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

function extractURLsFromLastMessage(messages: BaseMessage[]): string[] {
  if (!messages.length) return [];
  const recentMessage = messages[messages.length - 1];
  const recentMessageContent = getMessageContent(recentMessage);
  const messageUrls = extractUrls(recentMessageContent);
  return messageUrls;
}

// Function to check if a message is a presentation command vs. a content question
function isPresentationCommand(message: string): boolean {
  const normalizedMsg = normalizeMessage(message);
  
  // Start presentation check
  if (matchesAnyPattern(normalizedMsg, COMMAND_PATTERNS.startPresentation)) {
    return true;
  }

  // Navigation commands
  if (matchesAnyPattern(normalizedMsg, COMMAND_PATTERNS.navigation.next) ||
      matchesAnyPattern(normalizedMsg, COMMAND_PATTERNS.navigation.previous) ||
      COMMAND_PATTERNS.navigation.goToPattern.test(normalizedMsg) ||
      COMMAND_PATTERNS.navigation.slideNumberPattern.test(normalizedMsg)) {
    return true;
  }
  
  // Quiz-related commands (with length check)
  if (matchesAnyPattern(normalizedMsg, COMMAND_PATTERNS.questionRequest) && 
      normalizedMsg.length < 50) {
    return true;
  }
  
  // Simple responses (with length check)
  if (matchesAnyPattern(normalizedMsg, COMMAND_PATTERNS.simpleResponse) && 
      normalizedMsg.length < 15) {
    return true;
  }
  
  // If none of the above conditions are met, it's likely a content question
  return false;
}

// Function to parse navigation commands in the user's message
function parseNavigationCommand(message: string, currentSlide: number, totalSlides: number = 7): number | null {
  const normalizedMsg = normalizeMessage(message);
  
  // Next slide
  if (matchesAnyPattern(normalizedMsg, COMMAND_PATTERNS.navigation.next)) {
    return Math.min(currentSlide + 1, totalSlides);
  }
  
  // Previous slide
  if (matchesAnyPattern(normalizedMsg, COMMAND_PATTERNS.navigation.previous)) {
    return Math.max(currentSlide - 1, 1);
  }
  
  // Go to specific slide
  const goToMatch = normalizedMsg.match(COMMAND_PATTERNS.navigation.goToPattern);
  if (goToMatch && goToMatch[1]) {
    const slideNum = parseInt(goToMatch[1], 10);
    if (slideNum >= 1 && slideNum <= totalSlides) {
      return slideNum;
    }
  }
  
  // Just the slide number
  const slideNumberMatch = normalizedMsg.match(COMMAND_PATTERNS.navigation.slideNumberPattern);
  if (slideNumberMatch && slideNumberMatch[1]) {
    const slideNum = parseInt(slideNumberMatch[1], 10);
    if (slideNum >= 1 && slideNum <= totalSlides) {
      return slideNum;
    }
  }
  
  // No valid navigation command found
  return null;
}

/**
* Routes to the proper node in the graph based on the user's query.
*/
export async function generatePath(
  state: typeof OpenCanvasGraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<OpenCanvasGraphReturnType> {
  // Check if we have explicit presentation mode flags in the incoming request
  const incomingData = config.configurable?.data as any;
  
  // If presentationMode is passed directly in the streamMessage call, use it
  const explicitPresentationMode = incomingData?.presentationMode;
  const explicitPresentationSlide = incomingData?.presentationSlide;
  const showPresentationQuestion = incomingData?.showPresentationQuestion;
  const isContentQuestion = incomingData?.isContentQuestion || false;
  
  // Add all slide content and context to the config for better context preservation
  if (config.configurable && explicitPresentationMode) {
    if (!config.configurable.metadata) {
      config.configurable.metadata = {};
    }
    
    // Add all slide content and context for reference
    config.configurable.metadata.allSlideContent = SLIDES_CONTENT;
    config.configurable.metadata.allSlideContext = SLIDE_CONTEXT;
    
    // Add specific slide content and context for the current slide
    const currentSlideNumber = explicitPresentationSlide || state.presentationSlide || 1;
    config.configurable.metadata.currentSlideContent = SLIDES_CONTENT[currentSlideNumber];
    config.configurable.metadata.currentSlideContext = SLIDE_CONTEXT[currentSlideNumber];
  }
  
  // If explicit presentation mode flags are provided, use them
  if (explicitPresentationMode !== undefined) {
    // Add slide content to the state for improved context
    const slideNum = explicitPresentationSlide || state.presentationSlide || 1;
    return createPresentationRoute(slideNum, {
      showPresentationQuestion: showPresentationQuestion || false,
      isContentQuestion: isContentQuestion || false
    });
  }
  
  // Check if we're already in presentation mode
  if (state.presentationMode) {
    // Check if we should show a question
    const showQuestion = incomingData?.showPresentationQuestion || false;
    
    // Get the latest message
    if (state._messages.length > 0) {
      const latestMessage = state._messages[state._messages.length - 1];
      const messageContent = getMessageContent(latestMessage);
      
      // Enhanced content question detection
      if (!isPresentationCommand(messageContent) && !showQuestion && !isContentQuestion) {
        // Also add a direct check for start commands to prevent them being processed as content questions
        if (!normalizeMessage(messageContent).includes('start carvedilol') && 
            !normalizeMessage(messageContent).includes('start presentation')) {
          // Route to presentationModeHandler with isContentQuestion=true
          const currentSlideNum = state.presentationSlide || 1;
          return createPresentationRoute(currentSlideNum, { isContentQuestion: true });
        }
      }
      
      // Check if the user requested a question
      const normalizedContent = normalizeMessage(messageContent);
      const isQuestionRequest = matchesAnyPattern(normalizedContent, COMMAND_PATTERNS.questionRequest) ||
                                normalizedContent.includes('yes') ||
                                normalizedContent.includes('sure');
      
      if (isQuestionRequest) {
        const currentSlideNum = state.presentationSlide || 1;
        return createPresentationRoute(currentSlideNum, { showPresentationQuestion: true });
      }
      
      // Parse for navigation commands
      const currentSlide = state.presentationSlide || 1;
      const parsedSlideNumber = parseNavigationCommand(messageContent, currentSlide);
      
      // If a navigation command was detected, update the presentation slide
      if (parsedSlideNumber !== null) {
        return createPresentationRoute(parsedSlideNumber);
      }
    }
    
    // If we reach here and isContentQuestion is true, still route to presentationModeHandler
    if (isContentQuestion) {
      const currentSlideNum = state.presentationSlide || 1;
      return createPresentationRoute(currentSlideNum, { isContentQuestion: true });
    }
    
    // Default routing for presentation mode
    const currentSlideNum = state.presentationSlide || 1;
    return createPresentationRoute(currentSlideNum, { showPresentationQuestion: showQuestion });
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

  // Handle special state flags with a consistent pattern
  if (state.highlightedCode) {
    return createRoute("updateArtifact", newMessages);
  }
  
  if (state.highlightedText) {
    return createRoute("updateHighlightedText", newMessages);
  }

  if (
    state.language ||
    state.artifactLength ||
    state.regenerateWithEmojis ||
    state.readingLevel
  ) {
    return createRoute("rewriteArtifactTheme", newMessages);
  }

  if (
    state.addComments ||
    state.addLogs ||
    state.portLanguage ||
    state.fixBugs
  ) {
    return createRoute("rewriteCodeArtifactTheme", newMessages);
  }

  if (state.customQuickActionId) {
    return createRoute("customAction", newMessages);
  }

  if (state.webSearchEnabled) {
    return createRoute("webSearch", newMessages);
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

  // Enhanced check for presentation-related commands
  if (state._messages.length > 0) {
    const latestMessage = state._messages[state._messages.length - 1];
    const messageContent = getMessageContent(latestMessage);
    
    // Check for presentation start commands
    const normalizedContent = normalizeMessage(messageContent);
    const isStartCommand = matchesAnyPattern(normalizedContent, COMMAND_PATTERNS.startPresentation);
    
    if (isStartCommand) {
      return createPresentationRoute(1);
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

  // Return the result
  return {
    next: route,
    ...messages,
  };
}