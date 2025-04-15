// contexts/MultipleChoiceContext.tsx

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from "uuid";
import { useGraphContext } from './GraphContext';
import { usePresentation } from './PresentationContext';
import { HumanMessage } from '@langchain/core/messages';

// Define types for questions
export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  choices: Choice[];
  slideNumber?: number;
}

// Updated question data with slide numbers
export const quizQuestions: Question[] = [
  // Slide 2 – Heart Failure Burden
  {
    id: 'q1',
    text: 'Approximately how many Americans are diagnosed with heart failure each year?',
    slideNumber: 2,
    choices: [
      { id: 'q1-a', text: '3.5 million', isCorrect: false },
      { id: 'q1-b', text: '6.7 million', isCorrect: true },
      { id: 'q1-c', text: '10 million', isCorrect: false },
      { id: 'q1-d', text: '1.2 million', isCorrect: false },
    ]
  },
  {
    id: 'q2',
    text: 'What is the current individual lifetime risk of developing heart failure?',
    slideNumber: 2,
    choices: [
      { id: 'q2-a', text: '1 in 10', isCorrect: false },
      { id: 'q2-b', text: '1 in 5', isCorrect: false },
      { id: 'q2-c', text: '1 in 4', isCorrect: true },
      { id: 'q2-d', text: '1 in 8', isCorrect: false },
    ]
  },
  {
    id: 'q3',
    text: 'How many hospitalizations are attributed to heart failure annually in the U.S.?',
    slideNumber: 2,
    choices: [
      { id: 'q3-a', text: '2 million', isCorrect: false },
      { id: 'q3-b', text: '3.5 million', isCorrect: false },
      { id: 'q3-c', text: '5 million', isCorrect: true },
      { id: 'q3-d', text: '6.5 million', isCorrect: false },
    ]
  },
  
  // Slide 3 – Mechanism & Indication of Carvedilol
  {
    id: 'q4',
    text: 'Which of the following best describes the pharmacologic profile of Carvedilol?',
    slideNumber: 3,
    choices: [
      { id: 'q4-a', text: 'Selective beta-1 blocker', isCorrect: false },
      { id: 'q4-b', text: 'Non-selective beta-blocker with alpha-1 blockade', isCorrect: true },
      { id: 'q4-c', text: 'ACE inhibitor with diuretic properties', isCorrect: false },
      { id: 'q4-d', text: 'Calcium channel blocker', isCorrect: false },
    ]
  },
  {
    id: 'q5',
    text: 'Carvedilol is indicated for:',
    slideNumber: 3,
    choices: [
      { id: 'q5-a', text: 'Acute decompensated heart failure only', isCorrect: false },
      { id: 'q5-b', text: 'As monotherapy in hypertension', isCorrect: false },
      { id: 'q5-c', text: 'Mild to severe chronic heart failure of ischemic or cardiomyopathic origin', isCorrect: true },
      { id: 'q5-d', text: 'Arrhythmias and angina', isCorrect: false },
    ]
  },
  
  // Slide 4 – COPERNICUS Trial Results
  {
    id: 'q6',
    text: 'In the COPERNICUS trial, patients treated with carvedilol experienced what percent reduction in all-cause mortality?',
    slideNumber: 4,
    choices: [
      { id: 'q6-a', text: '15%', isCorrect: false },
      { id: 'q6-b', text: '25%', isCorrect: false },
      { id: 'q6-c', text: '35%', isCorrect: true },
      { id: 'q6-d', text: '50%', isCorrect: false },
    ]
  },
  {
    id: 'q7',
    text: 'What was the number needed to treat (NNT) with carvedilol to save one life?',
    slideNumber: 4,
    choices: [
      { id: 'q7-a', text: '5', isCorrect: false },
      { id: 'q7-b', text: '10', isCorrect: false },
      { id: 'q7-c', text: '14', isCorrect: true },
      { id: 'q7-d', text: '25', isCorrect: false },
    ]
  },
  {
    id: 'q8',
    text: 'Aside from mortality reduction, which of the following was also significantly improved in the carvedilol group?',
    slideNumber: 4,
    choices: [
      { id: 'q8-a', text: 'Blood glucose control', isCorrect: false },
      { id: 'q8-b', text: 'Global assessments and hospitalization rates', isCorrect: true },
      { id: 'q8-c', text: 'Renal function', isCorrect: false },
      { id: 'q8-d', text: 'Stroke incidence', isCorrect: false },
    ]
  },
  
  // Slide 5 – Subgroup Effects
  {
    id: 'q9',
    text: 'The benefits of carvedilol on mortality were:',
    slideNumber: 5,
    choices: [
      { id: 'q9-a', text: 'Seen only in low-risk patients', isCorrect: false },
      { id: 'q9-b', text: 'Not consistent across sub-groups', isCorrect: false },
      { id: 'q9-c', text: 'Maintained across all sub-groups, including high-risk patients', isCorrect: true },
      { id: 'q9-d', text: 'Limited to patients under 65', isCorrect: false },
    ]
  },
  
  // Slide 6 – Safety Profile
  {
    id: 'q10',
    text: 'How many subjects have been evaluated for carvedilol safety in clinical trials?',
    slideNumber: 6,
    choices: [
      { id: 'q10-a', text: 'Over 500', isCorrect: false },
      { id: 'q10-b', text: 'Over 2,000', isCorrect: false },
      { id: 'q10-c', text: 'Over 3,000', isCorrect: false },
      { id: 'q10-d', text: 'Over 4,500', isCorrect: true },
    ]
  },
  {
    id: 'q11',
    text: 'Which side effect was the only one leading to discontinuation in more than 1% of patients and more often with carvedilol than placebo?',
    slideNumber: 6,
    choices: [
      { id: 'q11-a', text: 'Fatigue', isCorrect: false },
      { id: 'q11-b', text: 'Dizziness', isCorrect: true },
      { id: 'q11-c', text: 'Nausea', isCorrect: false },
      { id: 'q11-d', text: 'Bradycardia', isCorrect: false },
    ]
  },
  
  // Slide 7 – Dosing
  {
    id: 'q12',
    text: 'What is the recommended starting dose of carvedilol in heart failure?',
    slideNumber: 7,
    choices: [
      { id: 'q12-a', text: '6.25 mg twice daily', isCorrect: false },
      { id: 'q12-b', text: '12.5 mg once daily', isCorrect: false },
      { id: 'q12-c', text: '3.125 mg twice daily', isCorrect: true },
      { id: 'q12-d', text: '25 mg once daily', isCorrect: false },
    ]
  },
  {
    id: 'q13',
    text: 'Over what minimum interval should the carvedilol dose be titrated?',
    slideNumber: 7,
    choices: [
      { id: 'q13-a', text: 'Every 3 days', isCorrect: false },
      { id: 'q13-b', text: 'Weekly', isCorrect: false },
      { id: 'q13-c', text: 'At least every 2 weeks', isCorrect: true },
      { id: 'q13-d', text: 'Monthly', isCorrect: false },
    ]
  },
  {
    id: 'q14',
    text: 'Why should patients be instructed to take carvedilol with food?',
    slideNumber: 7,
    choices: [
      { id: 'q14-a', text: 'To improve taste', isCorrect: false },
      { id: 'q14-b', text: 'To reduce blood pressure more effectively', isCorrect: false },
      { id: 'q14-c', text: 'To slow the absorption and reduce the risk of hypotension', isCorrect: true },
      { id: 'q14-d', text: 'To enhance bioavailability', isCorrect: false },
    ]
  }
];

interface MultipleChoiceContextProps {
  isMultipleChoiceMode: boolean;
  toggleMultipleChoiceMode: () => void;
  enableMultipleChoiceMode: () => void;
  disableMultipleChoiceMode: () => void;
  currentQuestionIndex: number;
  currentQuestion: Question | null;
  totalQuestions: number;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  getQuestionsBySlide: (slideNumber: number) => Question[];
  getSlideForQuestion: (questionId: string) => number | undefined;
  goToQuestionById: (questionId: string) => void;
  handleAnswerSelected: (choiceId: string, isCorrect: boolean) => void;
  getAnsweredQuestions: () => string[];
  setAnsweredQuestion: (questionId: string) => void;
  isQuestionAnswered: (questionId: string) => boolean;
  resetQuizProgress: () => void;
  getTotalQuestionsCount: () => number;
  getCorrectAnswersCount: () => number;
  incrementCorrectAnswers: () => void;
}

const MultipleChoiceContext = createContext<MultipleChoiceContextProps | undefined>(undefined);

export const MultipleChoiceProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isMultipleChoiceMode, setIsMultipleChoiceMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages } = graphData;
  
  // Get the presentation context
  const { currentSlide, goToSlide } = usePresentation();
  
  // Keep track of answered questions
  const getAnsweredQuestions = useCallback(() => {
    return answeredQuestions;
  }, [answeredQuestions]);
  
  const setAnsweredQuestion = useCallback((questionId: string) => {
    setAnsweredQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev;
      }
      return [...prev, questionId];
    });
  }, []);
  
  const isQuestionAnswered = useCallback((questionId: string) => {
    return answeredQuestions.includes(questionId);
  }, [answeredQuestions]);
  
  const resetQuizProgress = useCallback(() => {
    setAnsweredQuestions([]);
    setCorrectAnswers(0);
  }, []);
  
  const getTotalQuestionsCount = useCallback(() => {
    return quizQuestions.length;
  }, []);
  
  const getCorrectAnswersCount = useCallback(() => {
    return correctAnswers;
  }, [correctAnswers]);
  
  const incrementCorrectAnswers = useCallback(() => {
    setCorrectAnswers(prev => prev + 1);
  }, []);
  
  // Automatically adjust the current question based on the slide
  useEffect(() => {
    if (isMultipleChoiceMode) {
      const slideQuestions = getQuestionsBySlide(currentSlide);
      if (slideQuestions.length > 0) {
        // Find the first unanswered question for this slide
        const firstUnansweredQuestion = slideQuestions.find(q => !answeredQuestions.includes(q.id));
        
        if (firstUnansweredQuestion) {
          // Go to the first unanswered question
          const index = quizQuestions.findIndex(q => q.id === firstUnansweredQuestion.id);
          if (index !== -1) {
            setCurrentQuestionIndex(index);
          }
        } else {
          // All questions for this slide are answered, show the first one
          const firstQuestionIndex = quizQuestions.findIndex(q => q.id === slideQuestions[0].id);
          if (firstQuestionIndex !== -1) {
            setCurrentQuestionIndex(firstQuestionIndex);
          }
        }
      }
    }
  }, [currentSlide, isMultipleChoiceMode, answeredQuestions]);

  const toggleMultipleChoiceMode = useCallback(() => {
    setIsMultipleChoiceMode(prev => !prev);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('multipleChoiceModeChange', { 
      detail: { isActive: !isMultipleChoiceMode } 
    }));
  }, [isMultipleChoiceMode]);

  const enableMultipleChoiceMode = useCallback(() => {
    setIsMultipleChoiceMode(true);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('multipleChoiceModeChange', { 
      detail: { isActive: true } 
    }));
  }, []);

  const disableMultipleChoiceMode = useCallback(() => {
    setIsMultipleChoiceMode(false);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('multipleChoiceModeChange', { 
      detail: { isActive: false } 
    }));
  }, []);
  
  // Sync with presentation
  const syncWithPresentation = useCallback(() => {
    if (isMultipleChoiceMode) {
      const currentQuestion = quizQuestions[currentQuestionIndex];
      if (currentQuestion && currentQuestion.slideNumber) {
        // Navigate to the slide associated with the current question
        goToSlide(currentQuestion.slideNumber);
      }
    }
  }, [currentQuestionIndex, isMultipleChoiceMode, goToSlide]);

  // Enhanced nextQuestion function to sync with presentation
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      // Set the next question index
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      // Get the next question
      const nextQuestion = quizQuestions[nextIndex];
      if (nextQuestion && nextQuestion.slideNumber) {
        // Navigate to the slide associated with the next question
        goToSlide(nextQuestion.slideNumber);
      }
    } else {
      // If we're at the last question, loop back to the first question
      const firstSlideWithQuestions = quizQuestions[0].slideNumber || 1;
      setCurrentQuestionIndex(0);
      goToSlide(firstSlideWithQuestions);
    }
  }, [currentQuestionIndex, goToSlide]);
  
  // Enhanced previousQuestion function to sync with presentation
  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      // Set the previous question index
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      
      // Get the previous question
      const prevQuestion = quizQuestions[prevIndex];
      if (prevQuestion && prevQuestion.slideNumber) {
        // Navigate to the slide associated with the previous question
        goToSlide(prevQuestion.slideNumber);
      }
    } else {
      // If we're at the first question, loop to the last question
      const lastIndex = quizQuestions.length - 1;
      const lastSlideWithQuestions = quizQuestions[lastIndex].slideNumber || 1;
      setCurrentQuestionIndex(lastIndex);
      goToSlide(lastSlideWithQuestions);
    }
  }, [currentQuestionIndex, goToSlide]);
  
  // Enhanced goToQuestion function to sync with presentation
  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < quizQuestions.length) {
      setCurrentQuestionIndex(index);
      
      // Get the target question's slide number
      const targetQuestion = quizQuestions[index];
      if (targetQuestion.slideNumber) {
        // Navigate to the slide associated with the target question
        goToSlide(targetQuestion.slideNumber);
      }
    }
  }, [goToSlide]);
  
  // Function to find and go to a specific question by ID
  const goToQuestionById = useCallback((questionId: string) => {
    const index = quizQuestions.findIndex(q => q.id === questionId);
    if (index !== -1) {
      goToQuestion(index);
    }
  }, [goToQuestion]);
  
  // Enhanced getQuestionsBySlide to be more efficient
  const getQuestionsBySlide = useCallback((slideNumber: number) => {
    return quizQuestions.filter(q => q.slideNumber === slideNumber);
  }, []);
  
  // Additional function to get the slide number for a question
  const getSlideForQuestion = useCallback((questionId: string) => {
    const question = quizQuestions.find(q => q.id === questionId);
    return question?.slideNumber || 1;
  }, []);
  
  // Enhanced handle answer selection with progress tracking
  const handleAnswerSelected = useCallback((choiceId: string, isCorrect: boolean) => {
    // Create a message ID
    const messageId = uuidv4();
    
    // Get the current question
    const question = quizQuestions[currentQuestionIndex];
    
    // Mark the question as answered
    setAnsweredQuestion(question.id);
    
    // If the answer is correct, increment the correct answers count
    if (isCorrect) {
      incrementCorrectAnswers();
    }
    
    // Create a message about the answer
    const answerMessage = new HumanMessage({
      content: `Selected answer for question ${currentQuestionIndex + 1}: ${choiceId} (${isCorrect ? 'correct' : 'incorrect'})`,
      id: messageId,
    });
    
    // Update messages state
    setMessages(prevMessages => [...prevMessages, answerMessage]);
    
    // Stream message with the answer
    streamMessage({
      messages: [{
        role: "human",
        content: `Selected answer for question: "${question.text}". Choice: ${choiceId} (${isCorrect ? 'correct' : 'incorrect'})`,
        id: messageId
      }]
    } as any);
  }, [currentQuestionIndex, setMessages, streamMessage, setAnsweredQuestion, incrementCorrectAnswers]);

  // Get the current question
  const currentQuestion = currentQuestionIndex >= 0 && currentQuestionIndex < quizQuestions.length 
    ? quizQuestions[currentQuestionIndex] 
    : null;

  return (
    <MultipleChoiceContext.Provider value={{
      isMultipleChoiceMode,
      toggleMultipleChoiceMode,
      enableMultipleChoiceMode,
      disableMultipleChoiceMode,
      currentQuestionIndex,
      currentQuestion,
      totalQuestions: quizQuestions.length,
      nextQuestion,
      previousQuestion,
      goToQuestion,
      getQuestionsBySlide,
      getSlideForQuestion,
      goToQuestionById,
      handleAnswerSelected,
      getAnsweredQuestions,
      setAnsweredQuestion,
      isQuestionAnswered,
      resetQuizProgress,
      getTotalQuestionsCount,
      getCorrectAnswersCount,
      incrementCorrectAnswers
    }}>
      {children}
    </MultipleChoiceContext.Provider>
  );
};

export const useMultipleChoice = () => {
  const context = useContext(MultipleChoiceContext);
  if (context === undefined) {
    throw new Error('useMultipleChoice must be used within a MultipleChoiceProvider');
  }
  return context;
};