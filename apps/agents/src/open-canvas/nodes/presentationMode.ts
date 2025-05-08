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
  
  // Helper function to safely check if content includes a string
  const safeIncludes = (content: string | null | undefined, search: string): boolean => {
    return !!content && content.toLowerCase().includes(search.toLowerCase());
  };
  
  // Helper function to check if questions are available for the current slide
  const hasQuestionsForSlide = (slideNumber: number): boolean => {
    return [2, 3, 4, 5, 6, 7].includes(slideNumber); // All content slides have questions
  };
  
  // Helper function to get the appropriate prompt based on slide number
  const getAppropriatePrompt = (slideNum: number): string => {
    if (slideNum === 1) {
      // For intro slide, just ask about continuing
      return "Would you like to continue to the next slide?";
    } else {
      // For content slides, only ask about testing knowledge with this specific slide
      return "Would you like to test your knowledge with a question about this slide?";
    }
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

# PRESENTATION CONTENT
## Slide 1: Introduction
Thank you for joining me for a discussion on advances in severe heart failure.

## Slide 2: Heart Failure Burden
Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.

## Slide 3: Mechanism & Indication of Carvedilol
Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.

## Slide 4: COPERNICUS Trial Results
Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.

## Slide 5: Subgroup Effects
The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.

## Slide 6: Safety Profile
Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).

## Slide 7: Dosing
The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food.

# ADDITIONAL SLIDE CONTEXT
## Slide 1: Introduction
This presentation will cover the latest advances in treating severe heart failure, with a focus on carvedilol, a non-selective beta-blocker that has shown significant mortality benefits in clinical trials. We'll examine its mechanism of action, clinical evidence, safety profile, and dosing recommendations.

## Slide 2: Heart Failure Burden
The increasing prevalence of heart failure is attributed to an aging population, improved survival from other cardiovascular conditions, and better treatments allowing patients to live longer with heart failure. Risk factors like obesity, diabetes, and hypertension are also contributing to the rising incidence. The economic burden exceeds $30 billion annually in healthcare costs and lost productivity. The lifetime risk has been steadily increasing over the past decades, from approximately 1 in 5 to now 1 in 4. This represents a significant public health challenge requiring innovative treatment approaches.

## Slide 3: Mechanism & Indication of Carvedilol
Carvedilol's unique dual mechanism of non-selective beta-blockade and alpha-1 blockade addresses both the increased sympathetic activity and vascular resistance in heart failure. Unlike selective beta-blockers, carvedilol provides more comprehensive neurohormonal blockade. This mechanism helps prevent further cardiac remodeling, reduces afterload, and protects cardiac myocytes from catecholamine-induced injury. The sympathetic activation in heart failure creates a vicious cycle, where myocyte injury leads to remodeling, which increases sympathetic activation further. Carvedilol breaks this cycle through its comprehensive adrenergic blockade, improving both short-term hemodynamics and long-term outcomes.

## Slide 4: COPERNICUS Trial Results
The COPERNICUS trial (Carvedilol Prospective Randomized Cumulative Survival) was a landmark study specifically designed to assess carvedilol in severe heart failure patients with an ejection fraction < 25%. The 35% reduction in all-cause mortality was consistent across demographic subgroups. The study was actually terminated early due to the significant survival benefit observed in the carvedilol group. The NNT (number needed to treat) of 14 is particularly impressive for a severe heart failure population and compares favorably with other heart failure interventions. The improvements in hospitalization rates and global assessments also translate to significant quality of life benefits and healthcare cost savings.

## Slide 5: Subgroup Effects
The consistent mortality benefit across subgroups is particularly important for clinical practice. Even in patients with recent decompensation events, who traditionally have been considered poor candidates for beta-blocker therapy, carvedilol showed significant benefits. This challenges the prior clinical paradigm of avoiding beta-blockers in high-risk heart failure patients. The subgroup analysis showed consistent benefits regardless of age, gender, ejection fraction severity, NYHA class, and etiology of heart failure (ischemic vs. non-ischemic). This robust consistency across subgroups strengthens the evidence for carvedilol's use in a broad heart failure population.

## Slide 6: Safety Profile
The favorable safety profile of carvedilol, with dizziness being the only significant side effect leading to discontinuation, is noteworthy compared to other heart failure medications. The vasodilatory effects from alpha-blockade may contribute to the dizziness. Other reported side effects include fatigue, weight gain, and bradycardia, but these rarely led to discontinuation. The safety evaluation spanned mild to severe heart failure patients and showed consistent tolerability. This safety profile supports the use of carvedilol even in higher-risk patients who might have been considered poor candidates for beta-blockade in the past.

## Slide 7: Dosing Guidelines
The gradual titration approach for carvedilol is critical to minimize adverse effects. Starting at 3.125 mg twice daily allows the body to adjust to beta-blockade. The target dose of 25 mg twice daily has shown optimal outcomes in clinical trials, but even lower maintenance doses provide benefit if higher doses cannot be tolerated. Taking with food reduces the risk of orthostatic hypotension by slowing absorption. The minimum 2-week intervals between dose increases are essential to allow for physiological adaptation to increased beta-blockade. Patients should be monitored for signs of worsening heart failure, hypotension, or bradycardia during the titration phase.

# RISK CONTEXT
The increasing lifetime risk of heart failure (now 1 in 4) is driven by several factors:

1. Aging population: As more people live longer, the incidence of heart failure increases since age is a primary risk factor.
2. Improved survival from other cardiovascular conditions: Better treatments for heart attacks and other heart conditions mean more people survive these events but may later develop heart failure as a consequence.
3. Rising prevalence of risk factors: Increasing rates of obesity, diabetes, hypertension, and metabolic syndrome in the population contribute significantly to heart failure risk.
4. Sedentary lifestyle: Decreased physical activity levels in the general population contribute to cardiovascular deconditioning and increased risk factors.
5. Improved diagnosis: Better diagnostic techniques and increased awareness have led to more cases being identified that might have been missed previously.
6. Environmental factors: Air pollution and other environmental exposures may contribute to cardiovascular damage over time.
7. Socioeconomic factors: Disparities in healthcare access and quality can lead to poorly controlled risk factors in certain populations.

# PRESENTATION GUIDANCE
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
        
        // Add the appropriate prompt if not already present and no other prompt exists
        if (!responseContent.includes("Would you like to test your knowledge") && 
            !responseContent.includes("Would you like to continue") &&
            !responseContent.includes("Do you have questions")) {
          responseContent += "\n\n" + getAppropriatePrompt(slideNumber);
        }
      } catch (error) {
        console.error("Error invoking model:", error);
        responseContent = "I'm having trouble processing your question. " + getAppropriatePrompt(slideNumber);
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
      // Get model to generate welcome message based on system prompt
      const model = await getModelFromConfig(config, {
        temperature: 0.7
      });
      
      const systemPrompt = `You are presenting a medical presentation on Carvedilol and heart failure.

# PRESENTATION WELCOME INSTRUCTIONS
Create a welcome message for the start of a presentation on Carvedilol and heart failure. 
The welcome message should:
1. Thank the user for joining
2. Briefly mention that the discussion will be about advances in severe heart failure
3. End with: "Would you like to continue to the next slide?"
4. Be professional but warm
5. Be concise (2-3 sentences maximum)
6. Include the prompt ONLY ONCE at the end

Do not mention slide numbers or navigation instructions yet.`;

      const modelMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Start presentation" }
      ];
      
      try {
        const response = await model.invoke(modelMessages);
        responseContent = typeof response.content === 'string'
          ? response.content
          : "Thank you for joining me for a discussion on advances in severe heart failure. Would you like to continue to the next slide?";
      } catch (error) {
        console.error("Error generating welcome:", error);
        responseContent = "Thank you for joining me for a discussion on advances in severe heart failure. Would you like to continue to the next slide?";
      }
    }
    // If navigating to a new slide or continuing the presentation
    else if (safeIncludes(userContent, 'slide') ||
            safeIncludes(userContent, 'continue') ||
            safeIncludes(userContent, 'next') ||
            safeIncludes(userContent, 'previous') ||
            safeIncludes(userContent, 'go to')) {
      
      // Get model to generate slide content from system prompt
      const model = await getModelFromConfig(config, {
        temperature: 0.7
      });
      
      const systemPrompt = `You are presenting a medical presentation on Carvedilol and heart failure.

# SLIDE CONTENT
## Slide 1: Introduction
Thank you for joining me for a discussion on advances in severe heart failure.

## Slide 2: Heart Failure Burden
Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.

## Slide 3: Mechanism & Indication of Carvedilol
Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.

## Slide 4: COPERNICUS Trial Results
Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.

## Slide 5: Subgroup Effects
The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.

## Slide 6: Safety Profile
Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).

## Slide 7: Dosing
The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food.

# PRESENTATION INSTRUCTIONS
You are showing slide ${slideNumber} now.

1. Present ONLY the content for slide ${slideNumber} exactly as written above.
2. After presenting the slide content, end with EXACTLY ONE prompt:
   - For slide 1 (Introduction): "Would you like to continue to the next slide?"
   - For all other slides: "Would you like to test your knowledge with a question about this slide?"
3. Do not include multiple prompts or repeat the prompt.
4. Do not add any other commentary, explanations, or content not in the slide.
5. Do not mention slide numbers in your presentation except when directly asked about navigation.
6. Keep your response concise and professional.`;

      const modelMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Show slide ${slideNumber}` }
      ];
      
      try {
        const response = await model.invoke(modelMessages);
        responseContent = typeof response.content === 'string'
          ? response.content
          : "I'm having trouble retrieving the slide content. " + getAppropriatePrompt(slideNumber);
        
        // Add the appropriate prompt if not already present and no other prompt exists
        if (!responseContent.includes("Would you like to test your knowledge") && 
            !responseContent.includes("Would you like to continue") &&
            !responseContent.includes("Do you have questions")) {
          responseContent += "\n\n" + getAppropriatePrompt(slideNumber);
        }
      } catch (error) {
        console.error("Error generating slide content:", error);
        responseContent = "I'm having trouble retrieving the slide content. " + getAppropriatePrompt(slideNumber);
      }
    }
    // If the user declines a question and wants to move on
    else if (safeIncludes(userContent, 'no') ||
            safeIncludes(userContent, 'skip') ||
            safeIncludes(userContent, 'not now') ||
            safeIncludes(userContent, 'move on')) {
      
      // Get model to generate appropriate transition message
      const model = await getModelFromConfig(config, {
        temperature: 0.7
      });
      
      const systemPrompt = `You are presenting a medical presentation on Carvedilol and heart failure.

# TRANSITION INSTRUCTIONS
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

      const modelMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ];
      
      try {
        const response = await model.invoke(modelMessages);
        responseContent = typeof response.content === 'string'
          ? response.content
          : "Let's continue with the presentation. " + getAppropriatePrompt(slideNumber);
        
        // Add the appropriate prompt if not already present and no other prompt exists
        if (!responseContent.includes("Would you like to test your knowledge") && 
            !responseContent.includes("Would you like to continue") &&
            !responseContent.includes("Do you have questions")) {
          responseContent += "\n\n" + getAppropriatePrompt(slideNumber);
        }
      } catch (error) {
        console.error("Error generating transition:", error);
        responseContent = "Let's continue with the presentation. " + getAppropriatePrompt(slideNumber);
      }
    }
    // Default response
    else {
      // Get model to generate appropriate default message
      const model = await getModelFromConfig(config, {
        temperature: 0.7
      });
      
      const systemPrompt = `You are presenting a medical presentation on Carvedilol and heart failure.

# DEFAULT RESPONSE INSTRUCTIONS
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

      const modelMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ];
      
      try {
        const response = await model.invoke(modelMessages);
        responseContent = typeof response.content === 'string'
          ? response.content
          : "I'm here to guide you through this presentation on Carvedilol and heart failure. " + getAppropriatePrompt(slideNumber);
        
        // Add the appropriate prompt if not already present and no other prompt exists
        if (!responseContent.includes("Would you like to test your knowledge") && 
            !responseContent.includes("Would you like to continue") &&
            !responseContent.includes("Do you have questions")) {
          responseContent += "\n\n" + getAppropriatePrompt(slideNumber);
        }
      } catch (error) {
        console.error("Error generating default response:", error);
        responseContent = "I'm here to guide you through this presentation on Carvedilol and heart failure. " + getAppropriatePrompt(slideNumber);
      }
    }
  } catch (error) {
    console.error("Error in presentationMode:", error);
    responseContent = `There was an error processing your request. ${getAppropriatePrompt(slideNumber)}`;
  }
  
  // Create an AI message with the response
  const aiMessage = new AIMessage({
    content: responseContent,
    id: uuidv4(),
    additional_kwargs: {
      presentationMode: true,
      currentSlide: slideNumber,
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