

import React, { useEffect, useState, useCallback } from 'react';
import { usePresentation } from '@/contexts/PresentationContext';
import SlideDeck from './slidedeck';
import { useGraphContext } from '@/contexts/GraphContext';
import { HumanMessage } from '@langchain/core/messages';
import MultipleChoicePanel from './MultipleChoicePanel';
import { v4 as uuidv4 } from "uuid";

// Define question and choice interfaces
interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  choices: Choice[];
}

interface SlideData {
  id: number;
  question?: Question;
}

// Sample slide data with questions
const slideData: SlideData[] = [
  {
    id: 1,
    question: {
      id: 'q1',
      text: 'Approximately how many Americans are diagnosed with heart failure each year?',
      choices: [
        { id: 'q1-a', text: '3.5 million', isCorrect: false },
        { id: 'q1-b', text: '6.7 million', isCorrect: true },
        { id: 'q1-c', text: '10 million', isCorrect: false },
        { id: 'q1-d', text: '1.2 million', isCorrect: false },
      ]
    }
  },
  {
    id: 2,
    question: {
      id: 'q2',
      text: 'What is the primary mechanism of action for carvedilol?',
      choices: [
        { id: 'q2-a', text: 'Alpha blocker only', isCorrect: false },
        { id: 'q2-b', text: 'Beta blocker only', isCorrect: false },
        { id: 'q2-c', text: 'Combined alpha and beta blocker', isCorrect: true },
        { id: 'q2-d', text: 'ACE inhibitor', isCorrect: false },
      ]
    }
  },
  {
    id: 3,
    question: {
      id: 'q3',
      text: 'Which patient group requires careful monitoring when starting carvedilol?',
      choices: [
        { id: 'q3-a', text: 'Patients with asthma', isCorrect: true },
        { id: 'q3-b', text: 'Patients with hypertension', isCorrect: false },
        { id: 'q3-c', text: 'Patients with diabetes', isCorrect: false },
        { id: 'q3-d', text: 'Patients with arthritis', isCorrect: false },
      ]
    }
  },
  {
    id: 4,
    question: {
      id: 'q4',
      text: 'What is a common side effect of carvedilol?',
      choices: [
        { id: 'q4-a', text: 'Increased heart rate', isCorrect: false },
        { id: 'q4-b', text: 'Dizziness', isCorrect: true },
        { id: 'q4-c', text: 'Increased blood sugar', isCorrect: false },
        { id: 'q4-d', text: 'Insomnia', isCorrect: false },
      ]
    }
  },
  {
    id: 5,
    question: {
      id: 'q5',
      text: 'How should carvedilol dosing be initiated in heart failure patients?',
      choices: [
        { id: 'q5-a', text: 'High dose immediately', isCorrect: false },
        { id: 'q5-b', text: 'Medium dose with gradual increase', isCorrect: false },
        { id: 'q5-c', text: 'Low dose with gradual titration', isCorrect: true },
        { id: 'q5-d', text: 'Variable dosing based on weight', isCorrect: false },
      ]
    }
  },
  {
    id: 6,
    question: {
      id: 'q6',
      text: 'Which of the following is NOT an indication for carvedilol?',
      choices: [
        { id: 'q6-a', text: 'Heart failure', isCorrect: false },
        { id: 'q6-b', text: 'Hypertension', isCorrect: false },
        { id: 'q6-c', text: 'Angina', isCorrect: false },
        { id: 'q6-d', text: 'Primary pulmonary hypertension', isCorrect: true },
      ]
    }
  },
  {
    id: 7,
    question: {
      id: 'q7',
      text: 'What percentage reduction in mortality has carvedilol shown in heart failure trials?',
      choices: [
        { id: 'q7-a', text: '10-15%', isCorrect: false },
        { id: 'q7-b', text: '20-25%', isCorrect: false },
        { id: 'q7-c', text: '35-40%', isCorrect: true },
        { id: 'q7-d', text: '50-55%', isCorrect: false },
      ]
    }
  }
];

const PresentationMode: React.FC = () => {
  const { 
    currentSlide, 
    totalSlides, 
    exitPresentation, 
    nextSlide: nextSlideContext, 
    previousSlide: previousSlideContext,
    goToSlide: goToSlideContext
  } = usePresentation();
  
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages } = graphData;
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [lastProcessedSlide, setLastProcessedSlide] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswers, setUserAnswers] = useState<{
    [questionId: string]: {
      choiceId: string;
      isCorrect: boolean;
    }
  }>({});
  
  // Update current question when slide changes
  useEffect(() => {
    const slide = slideData.find(s => s.id === currentSlide);
    setCurrentQuestion(slide?.question || null);
  }, [currentSlide]);
  
  // Initialize presentation on first load
  useEffect(() => {
    if (isFirstLoad && iframeLoaded) {
      console.log("🔍 Starting presentation");
      setIsFirstLoad(false);
      
      // Create a message to start the presentation
      const initialMessage = new HumanMessage({
        content: "Start carvedilol presentation",
        id: uuidv4(),
      });
      
      // Update messages
      setMessages(prevMessages => [...prevMessages, initialMessage]);
      
      // Use streamMessage to trigger the presentation mode
      streamMessage({
        messages: [initialMessage],
        presentationMode: true,
        presentationSlide: 1
      } as any);
      
      setLastProcessedSlide(1);
    }
  }, [isFirstLoad, iframeLoaded, streamMessage, setMessages]);

  // Handle slide changes to update the AI
  useEffect(() => {
    if (!isFirstLoad && currentSlide !== lastProcessedSlide) {
      console.log("🔍 Slide changed to:", currentSlide, "Last processed:", lastProcessedSlide);
      
      // Create a message to request the new slide
      const slideChangeMessage = new HumanMessage({
        content: `Continue to slide ${currentSlide}`,
        id: uuidv4(),
      });
      
      // Update messages
      setMessages(prevMessages => [...prevMessages, slideChangeMessage]);
      
      console.log("🔍 Streaming message for slide:", currentSlide);
      
      // Use streamMessage to trigger the presentation mode with the new slide
      streamMessage({
        messages: [slideChangeMessage],
        presentationMode: true,
        presentationSlide: currentSlide
      } as any);
      
      setLastProcessedSlide(currentSlide);
    }
  }, [currentSlide, isFirstLoad, lastProcessedSlide, setMessages, streamMessage]);

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log("🔍 Iframe loaded");
    setIframeLoaded(true);
  };

  // Custom handlers that log actions for debugging
  const handleNextSlide = useCallback(() => {
    console.log("🔍 Next button clicked, current slide:", currentSlide);
    if (currentSlide < totalSlides) {
      nextSlideContext();
    }
  }, [currentSlide, nextSlideContext, totalSlides]);

  const handlePrevSlide = useCallback(() => {
    console.log("🔍 Previous button clicked, current slide:", currentSlide);
    if (currentSlide > 1) {
      previousSlideContext();
    }
  }, [currentSlide, previousSlideContext]);
  
  // Handle answer selection
  const handleAnswerSelected = useCallback((choiceId: string, isCorrect: boolean) => {
    if (currentQuestion) {
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: { choiceId, isCorrect }
      }));
      
      // Create a message about the answer
      const answerMessage = new HumanMessage({
        content: `Selected answer for question on slide ${currentSlide}: ${choiceId} (${isCorrect ? 'correct' : 'incorrect'})`,
        id: uuidv4(),
      });
      
      // Update messages
      setMessages(prevMessages => [...prevMessages, answerMessage]);
    }
  }, [currentQuestion, currentSlide, setMessages]);

  return (
    <div className="h-full w-full flex flex-col bg-white presentation-panel relative">
      {/* Header with title and exit button */}
      <div className="flex justify-between items-center p-2 border-b bg-white">
        <h1 className="text-xl font-semibold">Presentation on Carvedilol</h1>
        <button
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md shadow-md"
          onClick={exitPresentation}
        >
          Exit Presentation
        </button>
      </div>
      
      {/* Main content: Presentation container */}
      <div className="flex-1 flex flex-col">
        {/* Slide deck */}
        <div className="flex-1 overflow-hidden border-r border-gray-200">
          <iframe 
            src={`/presentation.html?slide=${currentSlide}`}
            className="w-full h-full border-none presentation-iframe"
            title="Carvedilol Presentation"
            onLoad={handleIframeLoad}
          />
        </div>
        
        {/* Multiple choice panel */}
        {currentQuestion && (
          <MultipleChoicePanel
            question={currentQuestion}
            onAnswerSelected={handleAnswerSelected}
            className="border-t border-gray-200"
          />
        )}
      </div>
      
      {/* Navigation controls */}
      <div className="flex justify-between p-2 bg-gray-100">
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          onClick={handlePrevSlide}
          disabled={currentSlide <= 1}
        >
          Previous
        </button>
        <span className="self-center">Page {currentSlide} of {totalSlides}</span>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          onClick={handleNextSlide}
          disabled={currentSlide >= totalSlides}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PresentationMode;