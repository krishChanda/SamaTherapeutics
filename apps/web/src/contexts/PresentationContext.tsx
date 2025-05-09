import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useGraphContext } from '@/contexts/GraphContext';

interface QuizQuestion {
  id: string;
  slideNumber: number;
  question: string;
  choices: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
}

interface PresentationContextProps {
  isPresentationMode: boolean;
  currentSlide: number;
  totalSlides: number;
  startPresentation: () => void;
  exitPresentation: () => void;
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (slideNumber: number) => void;
  quizQuestions: QuizQuestion[];
  getQuestionsForSlide: (slideNumber: number) => QuizQuestion[];
  getSlideContent: (slideNumber: number) => string;
}

const PresentationContext = createContext<PresentationContextProps | undefined>(undefined);

// base variables for presentation (mode, current slide, total slides)
export function PresentationProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides] = useState(7); 
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages, messages } = graphData;

  // slide content for each slide (key assigned to slide number)
  const SLIDES_CONTENT: { [key: number]: string } = {
    1: "Thank you for joining me for a discussion on advances in severe heart failure.\n\nTo navigate through the presentation, you can say:\n• **\"Next slide\"** to move forward\n• **\"Previous slide\"** to go back\n• **\"Go to slide [number]\"** to jump to a specific slide",
    2: "Heart failure remains a significant and growing burden for patients and the healthcare system. Despite advances, more than 6.7 million Americans are diagnosed yearly, and the individual lifetime risk has increased to 1 in 4. Heart failure is responsible for more than 425,000 deaths and 5 million hospitalizations each year. Proper treatment with evidence based regimens is critical to provide patients the best possible outcome.",
    3: "Sympathetic activation in heart failure results in cardiac myocyte injury, resulting in cardiac remodeling, which further increases sympathetic activation and drives worsening outcomes. Carvedilol is a third generation non-selective betablocker with alpha-1 blockade, that provides comprehensive adrenergic blockade in heart failure. Carvedilol is indicated for the treatment of mild to severe chronic heart failure of ischemic or cardiomyopathic origin, usually in the addition to diuretics, ACE inhibitors, and digitalis, to increase survival and reduce the risk of hospitalization.",
    4: "Carvedilol is the only beta-blocker prospectively studied in patients with severe heart failure. In a double blind trial (COPERNICUS), 2,289 subjects with heart failure and an ejection fraction of less than 25% were randomized to placebo or carvedilol. Patients on Carvedilol demonstrated a 35% reduction in the primary end point of all-cause mortality. The number of patients needed to treat with carvedilol to save 1 life was only 14. Patients treated with Carvedilol also had significantly less hospitalizations and a significant improvement in global assessments.",
    5: "The impact on all-cause mortality was maintained in all sub-groups examined. Importantly, the favorable effects were apparent even in the highest risk patients, namely, those with recent or recurrent cardiac decompensation.",
    6: "Carvedilol has been evaluated for safety in more then 4,500 subjects worldwide in mild, moderate and severe heart failure. The safety profile was consistent with the expected pharmacologic effects of the drug and health status of the patients. Across the broad clinical trial experience, dizziness was the only cause of discontinuation greater than 1% and occurring more often with carvedilol (1.3% vs .6%).",
    7: "The starting dose for carvedilol in heart failure is 3.125 mg twice daily. The dose should then be increased to 6.25, 12.5 and 25 mg twice daily over intervals of at least 2 weeks. Lower doses should be maintained if higher doses are not tolerated. Patients should be instructed to take carvedilol with food."
  };

  // all questions for the presentation
  const [quizQuestions] = useState<QuizQuestion[]>([
    {
      id: '1',
      slideNumber: 2,
      question: 'Approximately how many Americans are diagnosed with heart failure each year?',
      choices: [
        { id: 'A', text: '3.5 million', isCorrect: false },
        { id: 'B', text: '6.7 million', isCorrect: true },
        { id: 'C', text: '10 million', isCorrect: false },
        { id: 'D', text: '1.2 million', isCorrect: false },
      ]
    },
    {
      id: '2',
      slideNumber: 2,
      question: 'What is the current individual lifetime risk of developing heart failure?',
      choices: [
        { id: 'A', text: '1 in 10', isCorrect: false },
        { id: 'B', text: '1 in 5', isCorrect: false },
        { id: 'C', text: '1 in 4', isCorrect: true },
        { id: 'D', text: '1 in 8', isCorrect: false },
      ]
    },
    {
      id: '3',
      slideNumber: 2,
      question: 'How many hospitalizations are attributed to heart failure annually in the U.S.?',
      choices: [
        { id: 'A', text: '2 million', isCorrect: false },
        { id: 'B', text: '3.5 million', isCorrect: false },
        { id: 'C', text: '5 million', isCorrect: true },
        { id: 'D', text: '6.5 million', isCorrect: false },
      ]
    },
    {
      id: '4',
      slideNumber: 3,
      question: 'Which of the following best describes the pharmacologic profile of Carvedilol?',
      choices: [
        { id: 'A', text: 'Selective beta-1 blocker', isCorrect: false },
        { id: 'B', text: 'Non-selective beta-blocker with alpha-1 blockade', isCorrect: true },
        { id: 'C', text: 'ACE inhibitor with diuretic properties', isCorrect: false },
        { id: 'D', text: 'Calcium channel blocker', isCorrect: false },
      ]
    },
    {
      id: '5',
      slideNumber: 3,
      question: 'Carvedilol is indicated for:',
      choices: [
        { id: 'A', text: 'Acute decompensated heart failure only', isCorrect: false },
        { id: 'B', text: 'As monotherapy in hypertension', isCorrect: false },
        { id: 'C', text: 'Mild to severe chronic heart failure of ischemic or cardiomyopathic origin', isCorrect: true },
        { id: 'D', text: 'Arrhythmias and angina', isCorrect: false },
      ]
    },
    {
      id: '6',
      slideNumber: 4,
      question: 'In the COPERNICUS trial, patients treated with carvedilol experienced what percent reduction in all-cause mortality?',
      choices: [
        { id: 'A', text: '15%', isCorrect: false },
        { id: 'B', text: '25%', isCorrect: false },
        { id: 'C', text: '35%', isCorrect: true },
        { id: 'D', text: '50%', isCorrect: false },
      ]
    },
    {
      id: '7',
      slideNumber: 4,
      question: 'What was the number needed to treat (NNT) with carvedilol to save one life?',
      choices: [
        { id: 'A', text: '5', isCorrect: false },
        { id: 'B', text: '10', isCorrect: false },
        { id: 'C', text: '14', isCorrect: true },
        { id: 'D', text: '25', isCorrect: false },
      ]
    },
    {
      id: '8',
      slideNumber: 4,
      question: 'Aside from mortality reduction, which of the following was also significantly improved in the carvedilol group?',
      choices: [
        { id: 'A', text: 'Blood glucose control', isCorrect: false },
        { id: 'B', text: 'Global assessments and hospitalization rates', isCorrect: true },
        { id: 'C', text: 'Renal function', isCorrect: false },
        { id: 'D', text: 'Stroke incidence', isCorrect: false },
      ]
    },
    {
      id: '9',
      slideNumber: 5,
      question: 'The benefits of carvedilol on mortality were:',
      choices: [
        { id: 'A', text: 'Seen only in low-risk patients', isCorrect: false },
        { id: 'B', text: 'Not consistent across sub-groups', isCorrect: false },
        { id: 'C', text: 'Maintained across all sub-groups, including high-risk patients', isCorrect: true },
        { id: 'D', text: 'Limited to patients under 65', isCorrect: false },
      ]
    },
    {
      id: '10',
      slideNumber: 6,
      question: 'How many subjects have been evaluated for carvedilol safety in clinical trials?',
      choices: [
        { id: 'A', text: 'Over 500', isCorrect: false },
        { id: 'B', text: 'Over 2,000', isCorrect: false },
        { id: 'C', text: 'Over 3,000', isCorrect: false },
        { id: 'D', text: 'Over 4,500', isCorrect: true },
      ]
    },
    {
      id: '11',
      slideNumber: 6,
      question: 'Which side effect was the only one leading to discontinuation in more than 1% of patients and more often with carvedilol than placebo?',
      choices: [
        { id: 'A', text: 'Fatigue', isCorrect: false },
        { id: 'B', text: 'Dizziness', isCorrect: true },
        { id: 'C', text: 'Nausea', isCorrect: false },
        { id: 'D', text: 'Bradycardia', isCorrect: false },
      ]
    },
    {
      id: '12',
      slideNumber: 7,
      question: 'What is the recommended starting dose of carvedilol in heart failure?',
      choices: [
        { id: 'A', text: '6.25 mg twice daily', isCorrect: false },
        { id: 'B', text: '12.5 mg once daily', isCorrect: false },
        { id: 'C', text: '3.125 mg twice daily', isCorrect: true },
        { id: 'D', text: '25 mg once daily', isCorrect: false },
      ]
    },
    {
      id: '13',
      slideNumber: 7,
      question: 'Over what minimum interval should the carvedilol dose be titrated?',
      choices: [
        { id: 'A', text: 'Every 3 days', isCorrect: false },
        { id: 'B', text: 'Weekly', isCorrect: false },
        { id: 'C', text: 'At least every 2 weeks', isCorrect: true },
        { id: 'D', text: 'Monthly', isCorrect: false },
      ]
    },
    {
      id: '14',
      slideNumber: 7,
      question: 'Why should patients be instructed to take carvedilol with food?',
      choices: [
        { id: 'A', text: 'To improve taste', isCorrect: false },
        { id: 'B', text: 'To reduce blood pressure more effectively', isCorrect: false },
        { id: 'C', text: 'To slow the absorption and reduce the risk of hypotension', isCorrect: true },
        { id: 'D', text: 'To enhance bioavailability', isCorrect: false },
      ]
    },
  ]);
  

 // pull question for current slide
  const getQuestionsForSlide = (slideNumber: number) => {
    return quizQuestions.filter(q => q.slideNumber === slideNumber);
  };

// get content for current slide
  const getSlideContent = (slideNumber: number): string => {
    return SLIDES_CONTENT[slideNumber] || "Slide content not available.";
  };

  // start presentation and update event listener
  const startPresentation = () => {
    setIsPresentationMode(true);
    setCurrentSlide(1);
    
    window.dispatchEvent(new CustomEvent('presentationModeChange', { 
      detail: { isActive: true } 
    }));
    
  };

  // exit presentation based on event listener
  React.useEffect(() => {
    const handleExitPresentation = () => {
      exitPresentation();
    };
    
    window.addEventListener('exitPresentation', handleExitPresentation);
    
    return () => {
      window.removeEventListener('exitPresentation', handleExitPresentation);
    };
  }, []);

  // exit presentation and update event listener
  const exitPresentation = () => {
    setIsPresentationMode(false);
    
    window.dispatchEvent(new CustomEvent('presentationModeChange', { 
      detail: { isActive: false } 
    }));
  };

  // go to next slide
  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      const newSlideNumber = currentSlide + 1;
      goToSlide(newSlideNumber);
    }
  };

  // go to previous slide
  const previousSlide = () => {
    if (currentSlide > 1) {
      const newSlideNumber = currentSlide - 1;
      goToSlide(newSlideNumber);
    }
  };

  // jump to specific slide
  const goToSlide = (slideNumber: number) => {
    if (slideNumber >= 1 && slideNumber <= totalSlides) {
      setCurrentSlide(slideNumber);
      
      // update slide content in the iframe
      const iframe = document.querySelector('.presentation-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'goToSlide',
          slideNumber
        }, '*');
      }
    }
  };

  return (
    <PresentationContext.Provider value={{
      isPresentationMode,
      currentSlide,
      totalSlides,
      startPresentation,
      exitPresentation,
      nextSlide,
      previousSlide,
      goToSlide,
      quizQuestions,
      getQuestionsForSlide,
      getSlideContent
    }}>
      {children}
    </PresentationContext.Provider>
  );
}

export const usePresentation = () => {
  const context = useContext(PresentationContext);
  if (context === undefined) {
    throw new Error('usePresentation must be used within a PresentationProvider'); // if key presentation information is missing
  }
  return context;
};