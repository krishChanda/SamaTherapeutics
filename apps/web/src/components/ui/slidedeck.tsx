// components/ui/slidedeck.tsx
import React, { useEffect, useRef, useState } from 'react';
import { usePresentation } from '@/contexts/PresentationContext';
import { useMultipleChoice } from '@/contexts/MultipleChoiceContext';
import MultipleChoicePanel from './MultipleChoicePanel';

interface SlideDeckProps {
  showQuestion?: boolean;
}

const SlideDeck: React.FC<SlideDeckProps> = ({ showQuestion = false }) => {
  const { 
    currentSlide, 
    totalSlides
  } = usePresentation();
  
  const {
    getQuestionsBySlide,
    handleAnswerSelected,
    isQuestionAnswered,
    setAnsweredQuestion
  } = useMultipleChoice();
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // State to track the current question for this slide
  const [currentSlideQuestion, setCurrentSlideQuestion] = useState<any>(null);
  
  // When currentSlide changes, update the iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'goToSlide',
        slideNumber: currentSlide
      }, '*');
    }
    
    // Get the first question for this slide
    const slideQuestions = getQuestionsBySlide(currentSlide);
    if (slideQuestions.length > 0) {
      setCurrentSlideQuestion(slideQuestions[0]);
    } else {
      setCurrentSlideQuestion(null);
    }
  }, [currentSlide, getQuestionsBySlide]);
  
  const handleQuestionAnswer = (choiceId: string, isCorrect: boolean) => {
    if (currentSlideQuestion) {
      // Mark the question as answered
      setAnsweredQuestion(currentSlideQuestion.id);
      // Call the handler with the choice information
      handleAnswerSelected(choiceId, isCorrect);
    }
  };
  
  // Check if the current question is already answered
  const isCurrentQuestionAnswered = currentSlideQuestion ? 
    isQuestionAnswered(currentSlideQuestion.id) : false;
  
  return (
    <div className="h-full flex flex-col">
      {/* Slide viewer (takes up most or all of the space) */}
      <div className={`flex-1 ${showQuestion && currentSlideQuestion ? 'border-b border-gray-200' : ''}`}>
        <iframe 
          ref={iframeRef}
          src={`/presentation.html?slide=${currentSlide}`}
          className="w-full h-full border-none presentation-iframe"
          title="Carvedilol Presentation"
        />
      </div>
      
      {/* Question panel (only shown if there's a question for this slide AND showQuestion is true) */}
      {showQuestion && currentSlideQuestion && (
        <div className="bg-gray-50 border-t border-gray-200">
          <MultipleChoicePanel
            question={{
              id: currentSlideQuestion.id,
              text: currentSlideQuestion.text,
              choices: currentSlideQuestion.choices.map((choice: any) => ({
                id: choice.id,
                text: choice.text,
                isCorrect: choice.isCorrect
              }))
            }}
            onAnswerSelected={handleQuestionAnswer}
            isAnswered={isCurrentQuestionAnswered}
            slideNumber={currentSlide}
          />
        </div>
      )}
      
      {/* Simple page indicator */}
      {/* <div className="py-2 px-4 text-center bg-gray-100 border-t border-gray-200">
        Page {currentSlide} of {totalSlides}
      </div> */}
    </div>
  );
};

export default SlideDeck;