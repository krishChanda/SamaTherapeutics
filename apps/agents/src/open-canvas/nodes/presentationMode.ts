import { OpenCanvasGraphAnnotation, OpenCanvasGraphReturnType } from "../state.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { getModelFromConfig } from "../../utils.js";
import { AIMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";

// Define types for slide content objects
interface SlideContent {
  [key: number]: string;
}

// Constants for slide content and contexts
const SLIDE_CONTENTS: SlideContent = {
  1: "Thank you for joining me for a discussion on advances in severe heart failure.",
  2: "Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
  3: "Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
  4: "Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
  5: "The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
  6: "Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
  7: "The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
};

const SLIDE_CONTEXTS: SlideContent = {
  1: "This presentation will cover the latest advances in treating severe heart failure, with a focus on carvedilol, a non-selective beta-blocker that has shown significant mortality benefits in clinical trials. We'll examine its mechanism of action, clinical evidence, safety profile, and dosing recommendations.",
  2: "The increasing prevalence of heart failure is attributed to an aging population, improved survival from other cardiovascular conditions, and better treatments allowing patients to live longer with heart failure. Risk factors like obesity, diabetes, and hypertension are also contributing to the rising incidence. The economic burden exceeds $30 billion annually in healthcare costs and lost productivity. The lifetime risk has been steadily increasing over the past decades, from approximately 1 in 5 to now 1 in 4. This represents a significant public health challenge requiring innovative treatment approaches.",
  3: "Carvedilol's unique dual mechanism of non-selective beta-blockade and alpha-1 blockade addresses both the increased sympathetic activity and vascular resistance in heart failure. Unlike selective beta-blockers, carvedilol provides more comprehensive neurohormonal blockade. This mechanism helps prevent further cardiac remodeling, reduces afterload, and protects cardiac myocytes from catecholamine-induced injury. The sympathetic activation in heart failure creates a vicious cycle, where myocyte injury leads to remodeling, which increases sympathetic activation further. Carvedilol breaks this cycle through its comprehensive adrenergic blockade, improving both short-term hemodynamics and long-term outcomes.",
  4: "The COPERNICUS trial (Carvedilol Prospective Randomized Cumulative Survival) was a landmark study specifically designed to assess carvedilol in severe heart failure patients with an ejection fraction < 25%. The 35% reduction in all-cause mortality was consistent across demographic subgroups. The study was actually terminated early due to the significant survival benefit observed in the carvedilol group. The NNT (number needed to treat) of 14 is particularly impressive for a severe heart failure population and compares favorably with other heart failure interventions. The improvements in hospitalization rates and global assessments also translate to significant quality of life benefits and healthcare cost savings.",
  5: "The consistent mortality benefit across subgroups is particularly important for clinical practice. Even in patients with recent decompensation events, who traditionally have been considered poor candidates for beta-blocker therapy, carvedilol showed significant benefits. This challenges the prior clinical paradigm of avoiding beta-blockers in high-risk heart failure patients. The subgroup analysis showed consistent benefits regardless of age, gender, ejection fraction severity, NYHA class, and etiology of heart failure (ischemic vs. non-ischemic). This robust consistency across subgroups strengthens the evidence for carvedilol's use in a broad heart failure population.",
  6: "The favorable safety profile of carvedilol, with dizziness being the only significant side effect leading to discontinuation, is noteworthy compared to other heart failure medications. The vasodilatory effects from alpha-blockade may contribute to the dizziness. Other reported side effects include fatigue, weight gain, and bradycardia, but these rarely led to discontinuation. The safety evaluation spanned mild to severe heart failure patients and showed consistent tolerability. This safety profile supports the use of carvedilol even in higher-risk patients who might have been considered poor candidates for beta-blockade in the past.",
  7: "The gradual titration approach for carvedilol is critical to minimize adverse effects. Starting at 3.125 mg twice daily allows the body to adjust to beta-blockade. The target dose of 25 mg twice daily has shown optimal outcomes in clinical trials, but even lower maintenance doses provide benefit if higher doses cannot be tolerated. Taking with food reduces the risk of orthostatic hypotension by slowing absorption. The minimum 2-week intervals between dose increases are essential to allow for physiological adaptation to increased beta-blockade. Patients should be monitored for signs of worsening heart failure, hypotension, or bradycardia during the titration phase."
};

/**
 * A unified function to generate prompt content with all slides
 */
function generateAllSlidesContent() {
  let content = '';
  
  for (let i = 1; i <= 7; i++) {
    const slideTitle = i === 1 ? ': Introduction' : 
                      i === 2 ? ': Heart Failure Burden' : 
                      i === 3 ? ': Mechanism & Indication of Carvedilol' : 
                      i === 4 ? ': COPERNICUS Trial Results' : 
                      i === 5 ? ': Subgroup Effects' : 
                      i === 6 ? ': Safety Profile' : 
                      ': Dosing';
                      
    content += `## Slide ${i}${slideTitle}\n${SLIDE_CONTENTS[i]}\n\n`;
  }
  
  return content.trim();
}

/**
 * A unified function to generate context content for all slides
 */
function generateAllContextContent() {
  let content = '';
  
  for (let i = 1; i <= 7; i++) {
    const slideTitle = i === 1 ? ': Introduction' : 
                      i === 2 ? ': Heart Failure Burden' : 
                      i === 3 ? ': Mechanism & Indication of Carvedilol' : 
                      i === 4 ? ': COPERNICUS Trial Results' : 
                      i === 5 ? ': Subgroup Effects' : 
                      i === 6 ? ': Safety Profile' : 
                      ': Dosing Guidelines';
                      
    content += `## Slide ${i}${slideTitle}\n${SLIDE_CONTEXTS[i]}\n\n`;
  }
  
  return content.trim();
}

// Generate content once
const ALL_SLIDES_CONTENT = generateAllSlidesContent();
const ALL_CONTEXT_CONTENT = generateAllContextContent();

/**
 * Helper function to safely check if content includes a string
 */
function safeIncludes(content: string | null | undefined, search: string): boolean {
  return !!content && content.toLowerCase().includes(search.toLowerCase());
}

/**
 * Helper function to get the appropriate prompt based on slide number
 */
function getAppropriatePrompt(slideNum: number): string {
  return slideNum === 1 
    ? "Would you like to continue to the next slide?" 
    : "Would you like to test your knowledge with a question about this slide?";
}

/**
 * Helper to ensure the appropriate prompt is added to a response if missing
 */
function ensurePromptIsIncluded(content: string, slideNumber: number): string {
  if (!content.includes("Would you like to test your knowledge") && 
      !content.includes("Would you like to continue") &&
      !content.includes("Do you have questions")) {
    return content + "\n\n" + getAppropriatePrompt(slideNumber);
  }
  return content;
}

/**
 * Unified prompt builder that handles all types of prompts
 * @param type The type of prompt to create
 * @param slideNumber The current slide number
 * @param userContent The user's message content (optional)
 * @param includeOptions Additional options to customize the prompt
 */
function createUnifiedPrompt(
  type: 'content-question' | 'welcome' | 'transition' | 'default' | 'slide',
  slideNumber: number,
  userContent: string = '',
  includeOptions: {
    includeRiskContext?: boolean;
    includeFullContext?: boolean;
  } = {}
): string {
  // Basic header differs by type
  const header = type === 'content-question'
    ? `You are an AI assistant explaining a medical presentation on Carvedilol and heart failure.`
    : `You are presenting a medical presentation on Carvedilol and heart failure.`;
    
  // Slide content section - needed for all types except 'welcome'
  const slideContentSection = type !== 'welcome' 
    ? `\n\n# PRESENTATION CONTENT\n${ALL_SLIDES_CONTENT}` 
    : '';
  
  // Additional context section - included for content questions or when explicitly requested
  const additionalContextSection = (type === 'content-question' || includeOptions.includeFullContext) 
    ? `\n\n# ADDITIONAL SLIDE CONTEXT\n${ALL_CONTEXT_CONTENT}` 
    : '';
    
  // Special instructions section based on type
  let instructionsSection = '';
  
  switch (type) {
    case 'content-question':
      instructionsSection = `\n\n# PRESENTATION GUIDANCE
You are currently on Slide ${slideNumber}.

Present the content slide-by-slide, focusing on one slide at a time.
After answering a question, add an appropriate closing prompt based on the slide number:
- For slide 1: "Would you like to continue to the next slide?"
- For all other slides: "Would you like to test your knowledge with a question about this slide?"
Do not repeat the knowledge test prompt - include it only ONCE.
Maintain a professional and informative tone.
If the user has questions, answer based on the slide content and additional context provided above.

# CURRENT USER INTERACTION
The user is currently viewing slide ${slideNumber} and has asked: "${userContent}"

Answer their question thoroughly and accurately based on the presentation content. Be detailed and precise in your explanations, providing the medical information in a way that demonstrates expertise in cardiology and heart failure treatment with carvedilol.`;
      break;
      
    case 'welcome':
      instructionsSection = `\n\n# PRESENTATION WELCOME INSTRUCTIONS
Create a welcome message for the start of a presentation on Carvedilol and heart failure. 
The welcome message should:
1. Thank the user for joining
2. Briefly mention that the discussion will be about advances in severe heart failure
3. End with: "Would you like to continue to the next slide?"
4. Be professional but warm
5. Be concise (2-3 sentences maximum)
6. Include the prompt ONLY ONCE at the end

Do not mention slide numbers or navigation instructions yet.`;
      break;
      
    case 'transition':
      instructionsSection = `\n\n# TRANSITION INSTRUCTIONS
Create a brief transition message for a user who has declined to answer a question or wants to move on.
The message should:
1. Acknowledge their choice politely
2. Present the current slide content again or ask if they want to proceed to the next slide
3. End with EXACTLY ONE prompt based on the slide number:
   - For slide 1 (Introduction): "Would you like to continue to the next slide?"
   - For all other slides: "Would you like to test your knowledge with a question about this slide?"
4. Do not include multiple prompts or repeat the prompt.
5. Be professional and concise

The user is currently on slide ${slideNumber}.`;
      break;
      
    case 'default':
      instructionsSection = `\n\n# DEFAULT RESPONSE INSTRUCTIONS
Create a brief response for when the user's input doesn't clearly indicate what they want to do next in the presentation.
The response should:
1. Politely acknowledge their message
2. Remind them they're in a presentation about Carvedilol and heart failure
3. End with EXACTLY ONE prompt based on the slide number:
   - For slide 1 (Introduction): "Would you like to continue to the next slide?"
   - For all other slides: "Would you like to test your knowledge with a question about this slide?"
4. Do not include multiple prompts or repeat the prompt.
5. Be professional and concise

The user is currently on slide ${slideNumber}.`;
      break;
      
    case 'slide':
      instructionsSection = `\n\n# PRESENTATION INSTRUCTIONS
You are showing slide ${slideNumber} now.

1. Present ONLY the content for slide ${slideNumber} exactly as written above.
2. After presenting the slide content, end with EXACTLY ONE prompt:
   - For slide 1 (Introduction): "Would you like to continue to the next slide?"
   - For all other slides: "Would you like to test your knowledge with a question about this slide?"
3. Do not include multiple prompts or repeat the prompt.
4. Do not add any other commentary, explanations, or content not in the slide.
5. Do not mention slide numbers in your presentation except when directly asked about navigation.
6. Keep your response concise and professional.`;
      break;
  }
  
  // Combine all sections to create the complete prompt
  return `${header}${slideContentSection}${additionalContextSection}${instructionsSection}`;
}

/**
 * Helper to get model response with error handling
 */
async function getModelResponse(
  model: any, 
  promptType: 'content-question' | 'welcome' | 'transition' | 'default' | 'slide',
  slideNumber: number,
  userContent: string = '',
  options: {
    includeRiskContext?: boolean;
    includeFullContext?: boolean;
  } = {}
): Promise<string> {
  try {
    const systemPrompt = createUnifiedPrompt(promptType, slideNumber, userContent, options);
    
    const modelMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent || `Show slide ${slideNumber}` }
    ];
    
    const response = await model.invoke(modelMessages);
    return typeof response.content === 'string'
      ? response.content
      : "I couldn't process your request properly. Let me know if you'd like to try again.";
  } catch (error) {
    console.error("Error invoking model:", error);
    return "I'm having trouble processing your request. " + getAppropriatePrompt(slideNumber);
  }
}

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
  const currentSlide = state.presentationSlide || 1;
  
  // Get content question flag - with type safety
  const isContentQuestion = 'isContentQuestion' in state ? !!state.isContentQuestion : false;
  
  // Create a response based on the message and slide
  let responseContent = "";
  let shouldShowQuestion = false;
  
  try {
    // Get a model for generating responses with appropriate temperature
    const model = await getModelFromConfig(config, {
      temperature: 0.7
    });

    // If this is a content question about the slide, provide a detailed answer
    if (isContentQuestion) {
      console.log("🔍 Handling content question about slide:", userContent);
    
      // Check if this is a question about risk factors specifically
      const isRiskQuestion = safeIncludes(userContent, 'risk') ||
                            safeIncludes(userContent, 'increasing') ||
                            safeIncludes(userContent, 'higher') ||
                            safeIncludes(userContent, 'growing') ||
                            safeIncludes(userContent, 'more common');
    
      // Get the response from the model using our unified approach
      responseContent = await getModelResponse(
        model, 
        'content-question', 
        currentSlide, 
        userContent, 
        { includeRiskContext: isRiskQuestion }
      );
      
      // Add the appropriate prompt if not already present
      responseContent = ensurePromptIsIncluded(responseContent, currentSlide);
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
      responseContent = `Let's test your knowledge on slide ${currentSlide}:`;
      shouldShowQuestion = true;
    }
    // If starting the presentation
    else if (safeIncludes(userContent, 'start')) {
      // Generate welcome message
      responseContent = await getModelResponse(model, 'welcome', currentSlide, userContent);
    }
    // If navigating to a new slide or continuing the presentation
    else if (safeIncludes(userContent, 'slide') ||
            safeIncludes(userContent, 'continue') ||
            safeIncludes(userContent, 'next') ||
            safeIncludes(userContent, 'previous') ||
            safeIncludes(userContent, 'go to')) {
      
      // Get slide content
      responseContent = await getModelResponse(model, 'slide', currentSlide, userContent);
      
      // Add the appropriate prompt if not already present
      responseContent = ensurePromptIsIncluded(responseContent, currentSlide);
    }
    // If the user declines a question and wants to move on
    else if (safeIncludes(userContent, 'no') ||
            safeIncludes(userContent, 'skip') ||
            safeIncludes(userContent, 'not now') ||
            safeIncludes(userContent, 'move on')) {
      
      // Generate transition message
      responseContent = await getModelResponse(model, 'transition', currentSlide, userContent);
      
      // Add the appropriate prompt if not already present
      responseContent = ensurePromptIsIncluded(responseContent, currentSlide);
    }
    // Default response
    else {
      // Generate default response
      responseContent = await getModelResponse(model, 'default', currentSlide, userContent);
      
      // Add the appropriate prompt if not already present
      responseContent = ensurePromptIsIncluded(responseContent, currentSlide);
    }
  } catch (error) {
    console.error("Error in presentationMode:", error);
    responseContent = `There was an error processing your request. ${getAppropriatePrompt(currentSlide)}`;
  }
  
  // Create an AI message with the response
  const aiMessage = new AIMessage({
    content: responseContent,
    id: uuidv4(),
    additional_kwargs: {
      presentationMode: true,
      currentSlide: currentSlide,
      currentSlideContent: responseContent,
      slideContext: "",
      showQuestion: shouldShowQuestion
    }
  });
  
  return {
    messages: [aiMessage],
    showPresentationQuestion: shouldShowQuestion
  };
};