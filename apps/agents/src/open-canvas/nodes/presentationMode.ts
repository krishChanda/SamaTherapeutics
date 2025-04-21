// src/nodes/presentationMode.ts
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { getModelFromConfig, isUsingO1MiniModel, createContextDocumentMessages } from "../../utils.js";
import { OpenCanvasGraphAnnotation, OpenCanvasGraphReturnType } from "../state.js";
import { AIMessage } from "@langchain/core/messages";

// Define the carvedilol presentation system prompt with slide-specific content
const CARVEDILOL_PRESENTATION_PROMPT = `You are now in presentation mode, presenting a medical slideshow about carvedilol for heart failure. Your task is to present the information as a knowledgeable healthcare professional would, maintaining a professional tone throughout.

Present slide-by-slide: Focus on presenting one slide at a time. When responding to the user, include the slide marker "【SlideX】" at the beginning of your response (e.g., "【Slide2】"), where X is the current slide number. Provide EXACTLY the script for that specific slide without deviation.

Also respond to navigation commands: If the user says "next slide", "previous slide", "go to next slide", "go to slide X", or similar commands, acknowledge their request and provide the script for the requested slide.

Answer questions briefly: If the user asks questions related to the presentation content, provide concise, accurate answers based on the information about carvedilol and heart failure, then ask if they would like to continue with the presentation.

The presentation script for each slide is as follows, and you must provide EXACTLY this content for each slide number:

【Slide1】
Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?

【Slide2】
Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.

【Slide3】
Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.

【Slide4】
Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.

【Slide5】
The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.

【Slide6】
Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).

【Slide7】
The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food.

Additional information for answering questions:
- Carvedilol blocks beta-1, beta-2, and alpha-1 receptors
- The COPERNICUS trial was specifically in severe heart failure
- Benefits include reduced mortality, hospitalizations, and improved quality of life
- Common side effects include dizziness, fatigue, and hypotension
- Carvedilol should be titrated slowly to target doses
- It is usually used with other heart failure medications such as ACE inhibitors and diuretics
- The unique mechanism involves breaking the cycle of sympathetic activation and cardiac remodeling`;

// Key slide content precomputed to avoid extraction - with proper TypeScript index signature
const SLIDES_CONTENT: { [key: number]: string } = {
  1: "Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?",
  2: "Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
  3: "Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
  4: "Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
  5: "The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
  6: "Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
  7: "The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
};

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
 * Handle presentation mode interactions with the AI
 */
export const presentationMode = async (
  state: typeof OpenCanvasGraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<OpenCanvasGraphReturnType> => {
  console.log("🔍 Presentation mode handler called");
  console.log("🔍 Current state:", JSON.stringify({
    presentationMode: state.presentationMode,
    presentationSlide: state.presentationSlide
  }, null, 2));
  
  // Use a more capable model for the presentation with lower temperature
  const presentationModel = await getModelFromConfig(config, {
    temperature: 0.1,
  });

  // Get the current slide number from the state (default to 1 if not set)
  let slideNumber = state.presentationSlide || 1;
  console.log("🔍 Using slide number:", slideNumber);
  
  // Also check if it was passed directly in the request
  const incomingData = config.configurable?.data as any;
  const explicitSlideNumber = incomingData?.presentationSlide;
  
  if (explicitSlideNumber) {
    console.log("🔍 Using explicit slide number from request:", explicitSlideNumber);
    slideNumber = explicitSlideNumber;
  }
  
  // Check for navigation commands in the latest message
  let targetSlideNumber = slideNumber;
  if (state._messages && state._messages.length > 0) {
    const latestMessage = state._messages[state._messages.length - 1];
    const messageContent = typeof latestMessage.content === 'string' 
      ? latestMessage.content 
      : Array.isArray(latestMessage.content) 
        ? latestMessage.content.map(c => typeof c === 'string' ? c : (c.type === 'text' ? c.text : '')).join(' ')
        : '';
    
    console.log("🔍 Latest message content:", messageContent);
    
    // Parse navigation command
    const parsedSlideNumber = parseNavigationCommand(messageContent, slideNumber);
    if (parsedSlideNumber !== null) {
      targetSlideNumber = parsedSlideNumber;
      console.log("🔍 Navigation command detected! Going to slide:", targetSlideNumber);
    }
  }
  
  // Create direct response with the slide content
  console.log("🔍 Creating response for slide", targetSlideNumber);
  
  // Get the slide content directly from our precomputed object
  const slideContent = SLIDES_CONTENT[targetSlideNumber];
  if (!slideContent) {
    console.error("🔍 Error: No content found for slide", targetSlideNumber);
  }
  
  // Create an AI message with the formatted slide content
  const response = new AIMessage({
    content: `【Slide${targetSlideNumber}】\n${slideContent}`,
  });
  
  // Log content safely with type checking
  console.log("🔍 Created response:", 
    typeof response.content === 'string' 
      ? response.content.substring(0, 50) + "..." 
      : "Complex message content"
  );
  
  // Make sure to return immediately to prevent delays in the UI
  return {
    messages: [response],
    _messages: [response],
    presentationMode: true, // Ensure this flag stays true
    presentationSlide: targetSlideNumber, // Update the slide number in the state
  };
};