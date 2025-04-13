// components/ui/PresentationController.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useGraphContext } from '@/contexts/GraphContext';
import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from "uuid";
import MultipleChoicePanel from './MultipleChoicePanel';
import { useMultipleChoice, Question } from '@/contexts/MultipleChoiceContext';

interface PresentationControllerProps {
  exitPresentation: () => void;
}

const PresentationController: React.FC<PresentationControllerProps> = ({ exitPresentation }) => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(7);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages } = graphData;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Use the MultipleChoice context
  const { getQuestionsBySlide, handleAnswerSelected } = useMultipleChoice();

  // Listen for slide changes from the iframe
  useEffect(() => {
    const handleMessageFromIframe = (event: MessageEvent) => {
      if (event.data && event.data.type === 'slideChanged') {
        setCurrentSlide(event.data.slideNumber);
      }
    };
    
    window.addEventListener('message', handleMessageFromIframe);
    
    return () => {
      window.removeEventListener('message', handleMessageFromIframe);
    };
  }, []);

  // Update current question when slide changes - using the context's getQuestionsBySlide
  useEffect(() => {
    const slideQuestions = getQuestionsBySlide(currentSlide);
    setCurrentQuestion(slideQuestions.length > 0 ? slideQuestions[0] : null);
  }, [currentSlide, getQuestionsBySlide]);

  // Initialize presentation on first load
  useEffect(() => {
    if (isFirstLoad) {
      console.log("🔍 Initializing presentation");
      // Create a message to start the presentation
      const startMessage = new HumanMessage({
        content: "Start the carvedilol presentation",
        id: uuidv4(),
      });
      
      // Update messages
      setMessages(prevMessages => [...prevMessages, startMessage]);
      
      // Use streamMessage to trigger the presentation mode
      streamMessage({
        messages: [startMessage],
        presentationMode: true,
        presentationSlide: 1
      } as any);
      
      setIsFirstLoad(false);
    }
  }, [isFirstLoad, streamMessage, setMessages]);

  // Handle slide changes to update the AI
  useEffect(() => {
    if (!isFirstLoad) {
      console.log("🔍 Slide changed to:", currentSlide);
      // Create a message to request the new slide
      const slideChangeMessage = new HumanMessage({
        content: `Continue to slide ${currentSlide}`,
        id: uuidv4(),
      });
      
      // Update messages
      setMessages(prevMessages => [...prevMessages, slideChangeMessage]);
      
      // Use streamMessage to trigger the presentation mode with the new slide
      streamMessage({
        messages: [slideChangeMessage],
        presentationMode: true,
        presentationSlide: currentSlide
      } as any);
    }
  }, [currentSlide, streamMessage, setMessages, isFirstLoad]);

  // Handle changing slides
  const navigateToSlide = (direction: 'next' | 'previous') => {
    if (direction === 'next' && currentSlide < totalSlides) {
      const newSlide = currentSlide + 1;
      setCurrentSlide(newSlide);
      
      // Send message to iframe to change slide
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'goToSlide',
          slideNumber: newSlide
        }, '*');
      }
    } else if (direction === 'previous' && currentSlide > 1) {
      const newSlide = currentSlide - 1;
      setCurrentSlide(newSlide);
      
      // Send message to iframe to change slide
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'goToSlide',
          slideNumber: newSlide
        }, '*');
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
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
      
      {/* Main content layout with slide at top and question at bottom */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Slide presentation takes most of the space */}
        <div className="flex-1 overflow-hidden">
          <iframe 
            ref={iframeRef}
            src={`/presentation.html?slide=${currentSlide}`}
            className="w-full h-full border-none presentation-iframe"
            title="Carvedilol Presentation"
          />
        </div>
        
        {/* Question panel fixed at the bottom if available */}
        {currentQuestion && (
          <div className="border-t border-gray-200">
            <div className="bg-gray-50 py-2 px-4 text-center font-semibold text-lg">
              Question {currentSlide}:
            </div>
            <MultipleChoicePanel
              question={currentQuestion}
              onAnswerSelected={handleAnswerSelected}
              slideNumber={currentSlide}
            />
          </div>
        )}
      </div>
      
      {/* Navigation controls */}
      <div className="flex justify-between p-2 bg-gray-100">
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          onClick={() => navigateToSlide('previous')}
          disabled={currentSlide <= 1}
        >
          Previous
        </button>
        <span className="self-center">Page {currentSlide} of {totalSlides}</span>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          onClick={() => navigateToSlide('next')}
          disabled={currentSlide >= totalSlides}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PresentationController;