// Update the presentationMode.ts file
import { OpenCanvasGraphAnnotation, OpenCanvasGraphReturnType } from "../state.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { getModelFromConfig } from "../../utils.js";
import { AIMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import { SLIDES_CONTENT, SLIDE_CONTEXT, RISK_CONTEXT } from '@sama/shared';

/**
* Handler for presentation mode.
* This node processes slides and questions in presentation mode,
* providing appropriate context for content questions about slides.
*/
export const presentationMode = async (
  state: typeof OpenCanvasGraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<OpenCanvasGraphReturnType> => {
  console.log("🔍 Presentation mode handler called");
  
  // Safely get the most recent message from the human
  const messages = state.messages || [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const userContent = lastMessage && typeof lastMessage.content === 'string'
    ? lastMessage.content
    : '';
  
  // Get the current slide number
  const slideNumber = state.presentationSlide || 1;
  
  // Get content question flag - with type safety
  const isContentQuestion = 'isContentQuestion' in state ? !!state.isContentQuestion : false;
  
  // Get slide content - with type safety
  const providedSlideContent = 'slideContent' in state && typeof state.slideContent === 'string'
    ? state.slideContent
    : SLIDES_CONTENT[slideNumber];
  
  // Helper function to safely check if content includes a string
  const safeIncludes = (content: string | null | undefined, search: string): boolean => {
    return !!content && content.toLowerCase().includes(search.toLowerCase());
  };
  
  // Helper function to check if questions are available for the current slide
  const hasQuestionsForSlide = (slideNum: number): boolean => {
    return [2, 3, 4, 5, 6, 7].includes(slideNum); // All content slides have questions
  };
  
  // Create a response based on the message and slide
  let responseContent = "";
  let shouldShowQuestion = false;
  
  try {
    // If this is a content question about the slide, provide a detailed answer
    if (isContentQuestion) {
      console.log("🔍 Handling content question about slide:", userContent);
    
      // Get a model for generating contextual answers
      const model = await getModelFromConfig(config, {
        temperature: 0.7
      });
    
      // Check if this is a question about risk factors specifically
      const isRiskQuestion = safeIncludes(userContent, 'risk') ||
                           safeIncludes(userContent, 'increasing') ||
                           safeIncludes(userContent, 'higher') ||
                           safeIncludes(userContent, 'growing') ||
                           safeIncludes(userContent, 'more common');
    
      // Create a comprehensive system prompt with all slide content and extra context
      const systemPrompt = `You are an AI assistant explaining a medical presentation on Carvedilol and heart failure.

CURRENT PRESENTATION CONTEXT:
You are currently on Slide ${slideNumber}: ${SLIDES_CONTENT[slideNumber]}

ADDITIONAL SLIDE CONTEXT:
${SLIDE_CONTEXT[slideNumber]?.title || ''}: ${SLIDE_CONTEXT[slideNumber]?.details || ''}

${isRiskQuestion ? `\nSPECIAL RISK CONTEXT:\n${RISK_CONTEXT.factors}` : ''}

COMPLETE PRESENTATION CONTENT:
${Object.entries(SLIDES_CONTENT).map(([num, content]) => `Slide ${num}: ${content}`).join('\n\n')}

USER QUESTION:
The user has asked: "${userContent}"

INSTRUCTIONS:
- Answer the user's question directly and comprehensively based on the current slide content.
- Never respond with "I've outlined" or "I don't have enough context" - you have all the context you need.
- Always assume questions are related to the current slide and presentation context unless clearly specified otherwise.
- Provide specific information from the slide and your background knowledge about heart failure and carvedilol.
- Explain medical concepts and statistics in clear terms that demonstrate your understanding of cardiology.
- When answering questions about risk factors, treatments, or statistics, provide comprehensive explanations.
- Do not mention that you are using specific slide content or context - just incorporate it naturally in your answer.
- Keep your answer conversational but medically accurate and directly related to the current topic.
- You are a knowledgeable medical presenter - answer as you would in a live presentation to healthcare practitioners.`;
    
      // Call the model with the enhanced system prompt and user question
      const modelMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ];
    
      try {
        const response = await model.invoke(modelMessages);
        // Extract content as string, handling both simple strings and complex content
        responseContent = typeof response.content === 'string'
          ? response.content
          : "I couldn't process your question properly. Let me know if you'd like to try again.";
        
        // Clean up any "I've outlined" responses
        responseContent = responseContent
          .replace(/I've outlined/i, "Here are")
          .replace(/I outlined/i, "Here are");
      } catch (error) {
        console.error("Error invoking model:", error);
        responseContent = "I'm having trouble processing your question. Let's continue with the presentation. Would you like to see the next slide?";
      }
    }
    // Check if this is a question request or a positive response to the AI's prompt
    else if (safeIncludes(userContent, 'question') ||
        safeIncludes(userContent, 'quiz') ||
        safeIncludes(userContent, 'test') ||
        safeIncludes(userContent, 'knowledge') ||
        safeIncludes(userContent, 'yes') ||
        safeIncludes(userContent, 'sure') ||
        safeIncludes(userContent, 'okay') ||
        safeIncludes(userContent, 'ok') ||
        safeIncludes(userContent, 'please') ||
        safeIncludes(userContent, 'challenge') ||
        ('showPresentationQuestion' in state && !!state.showPresentationQuestion)) {
      console.log("🔍 Question requested by user");
      responseContent = `Let's test your knowledge on slide ${slideNumber}:`;
      shouldShowQuestion = true;
    }
    // If starting the presentation
    else if (safeIncludes(userContent, 'start')) {
      // Create a question prompt based on whether there are questions for this slide
      const hasQuestions = hasQuestionsForSlide(1);
      const questionPrompt = hasQuestions 
        ? "\n\nWould you like to test your knowledge with a question about this topic?"
        : "\n\nLet me know if you'd like to go to another slide or if you have any questions about this content.";
        
      responseContent = SLIDES_CONTENT[1] + questionPrompt;
    }
    // If navigating to a new slide or continuing the presentation
    else if (safeIncludes(userContent, 'slide') ||
            safeIncludes(userContent, 'continue') ||
            safeIncludes(userContent, 'next') ||
            safeIncludes(userContent, 'previous') ||
            safeIncludes(userContent, 'go to')) {
      // Create a question prompt based on whether there are questions for this slide
      const hasQuestions = hasQuestionsForSlide(slideNumber);
      const questionPrompt = hasQuestions 
        ? "\n\nWould you like to test your knowledge with a question about this topic?"
        : "\n\nLet me know if you'd like to go to another slide or if you have any questions about this content.";
        
      responseContent = providedSlideContent + questionPrompt;
    }
    // If the user declines a question and wants to move on
    else if (safeIncludes(userContent, 'no') ||
            safeIncludes(userContent, 'skip') ||
            safeIncludes(userContent, 'not now') ||
            safeIncludes(userContent, 'move on')) {
      // Create a question prompt based on whether there are questions for this slide
      const hasQuestions = hasQuestionsForSlide(slideNumber);
      const questionPrompt = hasQuestions 
        ? "\n\nWould you like to test your knowledge with a question about this topic?"
        : "\n\nLet me know if you'd like to go to another slide or if you have any questions about this content.";
        
      responseContent = `Let's continue with the presentation. Here's slide ${slideNumber}:\n\n${providedSlideContent}${questionPrompt}`;
    }
    // Default response
    else {
      // Create a question prompt based on whether there are questions for this slide
      const hasQuestions = hasQuestionsForSlide(slideNumber);
      const questionPrompt = hasQuestions 
        ? "\n\nWould you like to test your knowledge with a question about this topic?"
        : "\n\nLet me know if you'd like to go to another slide or if you have any questions about this content.";
        
      responseContent = providedSlideContent + questionPrompt;
    }
  } catch (error) {
    console.error("Error in presentationMode:", error);
    responseContent = `There was an error processing your request. Would you like to try again or continue to the next slide?`;
  }
  
  // Create an AI message with the response - FIXED: Removed the HTML comment from the message content
  const aiMessage = new AIMessage({
    content: responseContent,
    id: uuidv4(),
    additional_kwargs: {
      presentationMode: true,
      currentSlide: slideNumber,
      currentSlideContent: providedSlideContent,
      slideContext: SLIDE_CONTEXT[slideNumber]?.details || "",
      // FIXED: Add flag directly in additional_kwargs instead of using HTML comment
      showQuestion: shouldShowQuestion
    }
  });
  
  return {
    messages: [aiMessage],
    showPresentationQuestion: shouldShowQuestion
  };
};