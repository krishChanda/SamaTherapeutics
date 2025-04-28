// Replace the presentationMode.ts file with this updated version

import { OpenCanvasGraphAnnotation, OpenCanvasGraphReturnType } from "../state.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { getModelFromConfig } from "../../utils.js";
import { AIMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";

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
    : getSlideContent(slideNumber);
  
  // Function to get content for a specific slide
  function getSlideContent(slide: number): string {
    const SLIDES_CONTENT: Record<number, string> = {
      1: "Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?",
      2: "Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
      3: "Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
      4: "Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
      5: "The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
      6: "Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
      7: "The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
    };
    
    return SLIDES_CONTENT[slide] || "Slide content not available.";
  };
  
  // Helper function to safely check if content includes a string
  const safeIncludes = (content: string | null | undefined, search: string): boolean => {
    return !!content && content.toLowerCase().includes(search.toLowerCase());
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
      
      // Get all slide content to provide comprehensive context to the model
      const allSlideContent = {
        1: "Introduction: Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?",
        2: "Heart Failure Burden: Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
        3: "Mechanism & Indication of Carvedilol: Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
        4: "COPERNICUS Trial Results: Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
        5: "Subgroup Effects: The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
        6: "Safety Profile: Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
        7: "Dosing Guidelines: The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
      };
      
      // Create a system prompt with comprehensive context
      const systemPrompt = `You are an AI assistant explaining a medical presentation on Carvedilol and heart failure.

PRESENTATION CONTENT:
${Object.entries(allSlideContent).map(([num, content]) => `Slide ${num}: ${content}`).join('\n\n')}

CURRENT SLIDE:
You are currently on Slide ${slideNumber}: ${allSlideContent[slideNumber as keyof typeof allSlideContent]}

USER QUESTION:
The user has asked: "${userContent}"

INSTRUCTIONS:
- Answer the user's question with specific reference to the information provided in the current slide.
- Be precise and direct in your response, referring to specific numbers, statistics, and facts from the slide when relevant.
- If the user's question relates to information on other slides, you may reference that information as well.
- For questions about statistics or significance of numbers in medical contexts, provide appropriate context from your knowledge of cardiology and clinical trials.
- Keep your answer concise, focused, and directly addressing the user's question.
- When discussing statistics or numbers, explain their significance in the medical context of heart failure treatment.`;
      
      // Call the model with the system prompt and user question
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
      responseContent = `Let's test your knowledge on slide ${slideNumber}:\n\n`;
      shouldShowQuestion = true;
    } 
    // If starting the presentation
    else if (safeIncludes(userContent, 'start')) {
      responseContent = getSlideContent(1) + "\n\nWould you like to test your knowledge with a question about this topic, or shall we continue to the next slide?";
    } 
    // If navigating to a new slide or continuing the presentation
    else if (safeIncludes(userContent, 'slide') || 
            safeIncludes(userContent, 'continue') || 
            safeIncludes(userContent, 'next') || 
            safeIncludes(userContent, 'previous') ||
            safeIncludes(userContent, 'go to')) {
      responseContent = `【Slide ${slideNumber}】\n\n${providedSlideContent}\n\nWould you like to test your knowledge with a question about this topic, or shall we continue to the next slide?`;
    } 
    // If the user declines a question and wants to move on
    else if (safeIncludes(userContent, 'no') || 
            safeIncludes(userContent, 'skip') || 
            safeIncludes(userContent, 'not now') || 
            safeIncludes(userContent, 'move on')) {
      responseContent = `Let's continue with the presentation. Here's slide ${slideNumber}:\n\n${providedSlideContent}\n\nWould you like to test your knowledge with a question about this topic, or shall we move to the next slide?`;
    }
    // Default response
    else {
      responseContent = `【Slide ${slideNumber}】\n\n${providedSlideContent}\n\nWould you like to test your knowledge with a question about this topic, or shall we continue to the presentation?`;
    }
  } catch (error) {
    console.error("Error in presentationMode:", error);
    responseContent = `【Slide ${slideNumber}】\n\n${providedSlideContent}\n\nWould you like to test your knowledge with a question about this topic, or shall we continue to the presentation?`;
  }
  
  // Create an AI message with the response
  const aiMessage = new AIMessage({
    content: responseContent + (shouldShowQuestion ? " <!-- SHOW_QUESTION -->" : ""),
    id: uuidv4(),
    additional_kwargs: {
      presentationMode: true,
      currentSlide: slideNumber,
      currentSlideContent: providedSlideContent
    }
  });
  
  return {
    messages: [aiMessage],
    showPresentationQuestion: shouldShowQuestion
  };
};