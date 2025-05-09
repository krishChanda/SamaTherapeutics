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

  // sets initial states for controller (first load, current slide, total slides, etc.)
  const PresentationController: React.FC<PresentationControllerProps> = ({ exitPresentation }) => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides] = useState(7);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages } = graphData;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // pull questions from context based on current slide
  const { getQuestionsBySlide, handleAnswerSelected } = useMultipleChoice();

  // checking for slide changes and updating current slide state
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

  // uses current slide value to get question for specific slide
  useEffect(() => {
    const slideQuestions = getQuestionsBySlide(currentSlide);
    setCurrentQuestion(slideQuestions.length > 0 ? slideQuestions[0] : null);
  }, [currentSlide, getQuestionsBySlide]);

  // starts presentation and sends initial message to AI to begin
  useEffect(() => {
    if (isFirstLoad) {
      // Create a message to start the presentation
      const startMessage = new HumanMessage({
        content: "Start the carvedilol presentation",
        id: uuidv4(),
      });
      
      // handles message history and appends most recently sent message to it
      setMessages(prevMessages => [...prevMessages, startMessage]); 
      
      // initiates presentation mode with default settings
      streamMessage({
        messages: [startMessage], // sends starting message to AI
        presentationMode: true, // sets presentation mode to true
        presentationSlide: 1 // sets to first slide as default 
      } as any);
      
      setIsFirstLoad(false);
    }
  }, [isFirstLoad, streamMessage, setMessages]);

  // handles non-first load slide updates, sends message to AI to move to next slide
  useEffect(() => {
    if (!isFirstLoad) {
      const slideChangeMessage = new HumanMessage({
        content: `Continue to slide ${currentSlide}`,
        id: uuidv4(),
      });
      
      // update message history
      setMessages(prevMessages => [...prevMessages, slideChangeMessage]);
      
      // updates presentation mode to the new slide number
      streamMessage({
        messages: [slideChangeMessage],
        presentationMode: true,
        presentationSlide: currentSlide
      } as any);
    }
  }, [currentSlide, streamMessage, setMessages, isFirstLoad]);

  // moves slides forward and backwards
  const navigateToSlide = (direction: 'next' | 'previous') => {
    if (direction === 'next' && currentSlide < totalSlides) { // if next slide is available
      const newSlide = currentSlide + 1; // update slide number
      setCurrentSlide(newSlide);
      
      // send message to iframe to update slide number
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'goToSlide',
          slideNumber: newSlide
        }, '*');
      }
    } else if (direction === 'previous' && currentSlide > 1) { // if previous slide is available
      const newSlide = currentSlide - 1;
      setCurrentSlide(newSlide);
      
      // send message to iframe to update slide number
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
      <div className="flex items-center justify-center p-3 border-b bg-white relative h-14">
        <h1 className="flex items-center justify-center text-xl font-semibold text-center">Presentation on Carvedilol</h1>
        {/* exit presentation button frontend */}
        <div className="absolute right-4">
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1 px-3 rounded-md shadow-sm text-sm"
            onClick={exitPresentation}
          >
            Exit Presentation
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 overflow-hidden">
          <iframe 
            ref={iframeRef}
            src={`/presentation.html?slide=${currentSlide}`}
            className="w-full h-full border-none presentation-iframe"
            title="Carvedilol Presentation"
          />
        </div>
        
        {/* question frontend */}
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
    </div>
  );
};

export default PresentationController;