import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useGraphContext } from './GraphContext';
import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from "uuid";

interface QuizQuestion {
  id: string;
  slideNumber: number;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  correctAnswer: string;
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
}

const PresentationContext = createContext<PresentationContextProps | undefined>(undefined);

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(7); // Total slides in the Carvedilol presentation
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages, messages } = graphData;

  // Quiz questions for the presentation
  const [quizQuestions] = useState<QuizQuestion[]>([
    // Slide 2 – Heart Failure Burden
    {
      id: '1',
      slideNumber: 2,
      question: 'Approximately how many Americans are diagnosed with heart failure each year?',
      options: [
        { id: 'A', text: '3.5 million' },
        { id: 'B', text: '6.7 million' },
        { id: 'C', text: '10 million' },
        { id: 'D', text: '1.2 million' },
      ],
      correctAnswer: 'B'
    },
    {
      id: '2',
      slideNumber: 2,
      question: 'What is the current individual lifetime risk of developing heart failure?',
      options: [
        { id: 'A', text: '1 in 10' },
        { id: 'B', text: '1 in 5' },
        { id: 'C', text: '1 in 4' },
        { id: 'D', text: '1 in 8' },
      ],
      correctAnswer: 'C'
    },
    {
      id: '3',
      slideNumber: 2,
      question: 'How many hospitalizations are attributed to heart failure annually in the U.S.?',
      options: [
        { id: 'A', text: '2 million' },
        { id: 'B', text: '3.5 million' },
        { id: 'C', text: '5 million' },
        { id: 'D', text: '6.5 million' },
      ],
      correctAnswer: 'C'
    },
    
    // Slide 3 – Mechanism & Indication of Carvedilol
    {
      id: '4',
      slideNumber: 3,
      question: 'Which of the following best describes the pharmacologic profile of Carvedilol?',
      options: [
        { id: 'A', text: 'Selective beta-1 blocker' },
        { id: 'B', text: 'Non-selective beta-blocker with alpha-1 blockade' },
        { id: 'C', text: 'ACE inhibitor with diuretic properties' },
        { id: 'D', text: 'Calcium channel blocker' },
      ],
      correctAnswer: 'B'
    },
    {
      id: '5',
      slideNumber: 3,
      question: 'Carvedilol is indicated for:',
      options: [
        { id: 'A', text: 'Acute decompensated heart failure only' },
        { id: 'B', text: 'As monotherapy in hypertension' },
        { id: 'C', text: 'Mild to severe chronic heart failure of ischemic or cardiomyopathic origin' },
        { id: 'D', text: 'Arrhythmias and angina' },
      ],
      correctAnswer: 'C'
    },
    
    // Slide 4 – COPERNICUS Trial Results
    {
      id: '6',
      slideNumber: 4,
      question: 'In the COPERNICUS trial, patients treated with carvedilol experienced what percent reduction in all-cause mortality?',
      options: [
        { id: 'A', text: '15%' },
        { id: 'B', text: '25%' },
        { id: 'C', text: '35%' },
        { id: 'D', text: '50%' },
      ],
      correctAnswer: 'C'
    },
    {
      id: '7',
      slideNumber: 4,
      question: 'What was the number needed to treat (NNT) with carvedilol to save one life?',
      options: [
        { id: 'A', text: '5' },
        { id: 'B', text: '10' },
        { id: 'C', text: '14' },
        { id: 'D', text: '25' },
      ],
      correctAnswer: 'C'
    },
    {
      id: '8',
      slideNumber: 4,
      question: 'Aside from mortality reduction, which of the following was also significantly improved in the carvedilol group?',
      options: [
        { id: 'A', text: 'Blood glucose control' },
        { id: 'B', text: 'Global assessments and hospitalization rates' },
        { id: 'C', text: 'Renal function' },
        { id: 'D', text: 'Stroke incidence' },
      ],
      correctAnswer: 'B'
    },
    
    // Slide 5 – Subgroup Effects
    {
      id: '9',
      slideNumber: 5,
      question: 'The benefits of carvedilol on mortality were:',
      options: [
        { id: 'A', text: 'Seen only in low-risk patients' },
        { id: 'B', text: 'Not consistent across sub-groups' },
        { id: 'C', text: 'Maintained across all sub-groups, including high-risk patients' },
        { id: 'D', text: 'Limited to patients under 65' },
      ],
      correctAnswer: 'C'
    },
    
    // Slide 6 – Safety Profile
    {
      id: '10',
      slideNumber: 6,
      question: 'How many subjects have been evaluated for carvedilol safety in clinical trials?',
      options: [
        { id: 'A', text: 'Over 500' },
        { id: 'B', text: 'Over 2,000' },
        { id: 'C', text: 'Over 3,000' },
        { id: 'D', text: 'Over 4,500' },
      ],
      correctAnswer: 'D'
    },
    {
      id: '11',
      slideNumber: 6,
      question: 'Which side effect was the only one leading to discontinuation in more than 1% of patients and more often with carvedilol than placebo?',
      options: [
        { id: 'A', text: 'Fatigue' },
        { id: 'B', text: 'Dizziness' },
        { id: 'C', text: 'Nausea' },
        { id: 'D', text: 'Bradycardia' },
      ],
      correctAnswer: 'B'
    },
    
    // Slide 7 – Dosing
    {
      id: '12',
      slideNumber: 7,
      question: 'What is the recommended starting dose of carvedilol in heart failure?',
      options: [
        { id: 'A', text: '6.25 mg twice daily' },
        { id: 'B', text: '12.5 mg once daily' },
        { id: 'C', text: '3.125 mg twice daily' },
        { id: 'D', text: '25 mg once daily' },
      ],
      correctAnswer: 'C'
    },
    {
      id: '13',
      slideNumber: 7,
      question: 'Over what minimum interval should the carvedilol dose be titrated?',
      options: [
        { id: 'A', text: 'Every 3 days' },
        { id: 'B', text: 'Weekly' },
        { id: 'C', text: 'At least every 2 weeks' },
        { id: 'D', text: 'Monthly' },
      ],
      correctAnswer: 'C'
    },
    {
      id: '14',
      slideNumber: 7,
      question: 'Why should patients be instructed to take carvedilol with food?',
      options: [
        { id: 'A', text: 'To improve taste' },
        { id: 'B', text: 'To reduce blood pressure more effectively' },
        { id: 'C', text: 'To slow the absorption and reduce the risk of hypotension' },
        { id: 'D', text: 'To enhance bioavailability' },
      ],
      correctAnswer: 'C'
    },
  ]);

  // Get questions for a specific slide
  const getQuestionsForSlide = (slideNumber: number) => {
    return quizQuestions.filter(q => q.slideNumber === slideNumber);
  };

  // Listen for presentation mode changes from other components
  React.useEffect(() => {
    const handleExitPresentation = () => {
      exitPresentation();
    };
    
    window.addEventListener('exitPresentation', handleExitPresentation);
    
    return () => {
      window.removeEventListener('exitPresentation', handleExitPresentation);
    };
  }, []);

  // Start the presentation
  const startPresentation = () => {
    console.log("🔍 Starting presentation");
    setIsPresentationMode(true);
    setCurrentSlide(1);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('presentationModeChange', { 
      detail: { isActive: true } 
    }));
    
    // Create a message ID we can reuse
    const messageId = uuidv4();
    
    // Create a message object in the expected format
    const initialMessage = {
      role: "human",
      content: "Start carvedilol presentation",
      id: messageId
    };
    
    // Create a HumanMessage for UI purposes
    const humanMessageForUI = new HumanMessage({
      content: "Start carvedilol presentation",
      id: messageId,
    });
    
    // Update messages state
    setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
    
    // Stream message with presentation mode enabled
    streamMessage({
      messages: [initialMessage],
      presentationMode: true,
      presentationSlide: 1
    } as any);
  };

  // Exit the presentation
  const exitPresentation = () => {
    setIsPresentationMode(false);
    
    // Notify other components that presentation mode has ended
    window.dispatchEvent(new CustomEvent('presentationModeChange', { 
      detail: { isActive: false } 
    }));
  };

  // Navigate to the next slide
  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      const newSlideNumber = currentSlide + 1;
      goToSlide(newSlideNumber);
    }
  };

  // Navigate to the previous slide
  const previousSlide = () => {
    if (currentSlide > 1) {
      const newSlideNumber = currentSlide - 1;
      goToSlide(newSlideNumber);
    }
  };

  // Go to a specific slide
  const goToSlide = (slideNumber: number) => {
    console.log("🔍 Going to slide:", slideNumber);
    if (slideNumber >= 1 && slideNumber <= totalSlides) {
      setCurrentSlide(slideNumber);
      
      // Send message to update the slide in the iframe
      const iframe = document.querySelector('.presentation-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'goToSlide',
          slideNumber
        }, '*');
      }
      
      // Create a message ID we can reuse
      const messageId = uuidv4();
      
      // Create a message object in the expected format
      const slideChangeMessage = {
        role: "human",
        content: `Continue to slide ${slideNumber}`,
        id: messageId
      };
      
      // Create a HumanMessage for UI purposes
      const humanMessageForUI = new HumanMessage({
        content: `Continue to slide ${slideNumber}`,
        id: messageId,
      });
      
      // Update messages state
      setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
      console.log("🔍 Stream message called with slide:", slideNumber);
      
      // Get quiz questions for this slide, if any
      const slideQuestions = getQuestionsForSlide(slideNumber);
      
      // Stream message with the new slide and include questions if available
      streamMessage({
        messages: [slideChangeMessage],
        presentationMode: true,
        presentationSlide: slideNumber,
        quizQuestions: slideQuestions.length > 0 ? slideQuestions : undefined
      } as any);
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
      getQuestionsForSlide
    }}>
      {children}
    </PresentationContext.Provider>
  );
}

export const usePresentation = () => {
  const context = useContext(PresentationContext);
  if (context === undefined) {
    throw new Error('usePresentation must be used within a PresentationProvider');
  }
  return context;
};