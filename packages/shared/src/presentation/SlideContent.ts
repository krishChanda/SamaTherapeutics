// SlideContent.ts
export const SLIDES_CONTENT: Record<number, string> = {
    1: "Thank you for joining me for a discussion on advances in severe heart failure. Are you ready to begin the presentation?",
    2: "Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
    3: "Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
    4: "Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
    5: "The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
    6: "Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
    7: "The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
  };
  
  // Type definition for slide context entry
  export interface SlideContextEntry {
    title: string;
    details: string;
  }
  
  // Extended slide context - providing additional information for each slide
  export const SLIDE_CONTEXT: Record<number, SlideContextEntry> = {
    1: {
      title: "Introduction",
      details: "This presentation will cover the latest advances in treating severe heart failure, with a focus on carvedilol, a non-selective beta-blocker that has shown significant mortality benefits in clinical trials. We'll examine its mechanism of action, clinical evidence, safety profile, and dosing recommendations."
    },
    2: {
      title: "Heart Failure Burden",
      details: "The increasing prevalence of heart failure is attributed to an aging population, improved survival from other cardiovascular conditions, and better treatments allowing patients to live longer with heart failure. Risk factors like obesity, diabetes, and hypertension are also contributing to the rising incidence. The economic burden exceeds $30 billion annually in healthcare costs and lost productivity. The lifetime risk has been steadily increasing over the past decades, from approximately 1 in 5 to now 1 in 4. This represents a significant public health challenge requiring innovative treatment approaches."
    },
    3: {
      title: "Mechanism & Indication of Carvedilol",
      details: "Carvedilol's unique dual mechanism of non-selective beta-blockade and alpha-1 blockade addresses both the increased sympathetic activity and vascular resistance in heart failure. Unlike selective beta-blockers, carvedilol provides more comprehensive neurohormonal blockade. This mechanism helps prevent further cardiac remodeling, reduces afterload, and protects cardiac myocytes from catecholamine-induced injury. The sympathetic activation in heart failure creates a vicious cycle, where myocyte injury leads to remodeling, which increases sympathetic activation further. Carvedilol breaks this cycle through its comprehensive adrenergic blockade, improving both short-term hemodynamics and long-term outcomes."
    },
    4: {
      title: "COPERNICUS Trial Results",
      details: "The COPERNICUS trial (Carvedilol Prospective Randomized Cumulative Survival) was a landmark study specifically designed to assess carvedilol in severe heart failure patients with an ejection fraction < 25%. The 35% reduction in all-cause mortality was consistent across demographic subgroups. The study was actually terminated early due to the significant survival benefit observed in the carvedilol group. The NNT (number needed to treat) of 14 is particularly impressive for a severe heart failure population and compares favorably with other heart failure interventions. The improvements in hospitalization rates and global assessments also translate to significant quality of life benefits and healthcare cost savings."
    },
    5: {
      title: "Subgroup Effects",
      details: "The consistent mortality benefit across subgroups is particularly important for clinical practice. Even in patients with recent decompensation events, who traditionally have been considered poor candidates for beta-blocker therapy, carvedilol showed significant benefits. This challenges the prior clinical paradigm of avoiding beta-blockers in high-risk heart failure patients. The subgroup analysis showed consistent benefits regardless of age, gender, ejection fraction severity, NYHA class, and etiology of heart failure (ischemic vs. non-ischemic). This robust consistency across subgroups strengthens the evidence for carvedilol's use in a broad heart failure population."
    },
    6: {
      title: "Safety Profile",
      details: "The favorable safety profile of carvedilol, with dizziness being the only significant side effect leading to discontinuation, is noteworthy compared to other heart failure medications. The vasodilatory effects from alpha-blockade may contribute to the dizziness. Other reported side effects include fatigue, weight gain, and bradycardia, but these rarely led to discontinuation. The safety evaluation spanned mild to severe heart failure patients and showed consistent tolerability. This safety profile supports the use of carvedilol even in higher-risk patients who might have been considered poor candidates for beta-blockade in the past."
    },
    7: {
      title: "Dosing Guidelines",
      details: "The gradual titration approach for carvedilol is critical to minimize adverse effects. Starting at 3.125 mg twice daily allows the body to adjust to beta-blockade. The target dose of 25 mg twice daily has shown optimal outcomes in clinical trials, but even lower maintenance doses provide benefit if higher doses cannot be tolerated. Taking with food reduces the risk of orthostatic hypotension by slowing absorption. The minimum 2-week intervals between dose increases are essential to allow for physiological adaptation to increased beta-blockade. Patients should be monitored for signs of worsening heart failure, hypotension, or bradycardia during the titration phase."
    }
  };
  
  // Provide additional risk-specific context to help answer questions about increasing risk
  export const RISK_CONTEXT = {
    factors: `The increasing lifetime risk of heart failure (now 1 in 4) is driven by several factors:
  
  1. Aging population: As more people live longer, the incidence of heart failure increases since age is a primary risk factor.
  
  2. Improved survival from other cardiovascular conditions: Better treatments for heart attacks and other heart conditions mean more people survive these events but may later develop heart failure as a consequence.
  
  3. Rising prevalence of risk factors: Increasing rates of obesity, diabetes, hypertension, and metabolic syndrome in the population contribute significantly to heart failure risk.
  
  4. Sedentary lifestyle: Decreased physical activity levels in the general population contribute to cardiovascular deconditioning and increased risk factors.
  
  5. Improved diagnosis: Better diagnostic techniques and increased awareness have led to more cases being identified that might have been missed previously.
  
  6. Environmental factors: Air pollution and other environmental exposures may contribute to cardiovascular damage over time.
  
  7. Socioeconomic factors: Disparities in healthcare access and quality can lead to poorly controlled risk factors in certain populations.`,
  
    prevention: `Evidence-based approaches to reduce heart failure risk include:
  
  1. Blood pressure control: Aggressive management of hypertension can significantly reduce heart failure risk.
  
  2. Lifestyle modifications: Regular physical activity, heart-healthy diet, maintaining healthy weight, smoking cessation.
  
  3. Diabetes management: Tight glycemic control and use of newer medications (SGLT2 inhibitors) that reduce heart failure risk.
  
  4. Early intervention for coronary artery disease: Prompt treatment of myocardial infarction and ischemia.
  
  5. Preventive medications: Use of statins, ACE inhibitors, and other cardioprotective medications in at-risk individuals.
  
  6. Regular screening: Earlier detection of heart failure through biomarkers (like BNP) and imaging in high-risk patients.
  
  7. Management of other risk factors: Treating sleep apnea, reducing alcohol consumption, and managing stress.`
  };
  
  // Function to get content for a specific slide
  export const getSlideContent = (slideNumber: number): string => {
    return SLIDES_CONTENT[slideNumber] || "Slide content not available.";
  };
  
  // Function to get context for a specific slide
  export const getSlideContext = (slideNumber: number): string => {
    return SLIDE_CONTEXT[slideNumber]?.details || "";
  };
  
  // Function to get title for a specific slide
  export const getSlideTitle = (slideNumber: number): string => {
    return SLIDE_CONTEXT[slideNumber]?.title || "";
  };