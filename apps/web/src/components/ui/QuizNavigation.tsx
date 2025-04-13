// components/ui/QuizNavigation.tsx

import React from 'react';
import { usePresentation } from '@/contexts/PresentationContext';
import { useMultipleChoice } from '@/contexts/MultipleChoiceContext';

interface QuizNavigationProps {
  currentSlideQuestionCount: number;
  currentQuestionIndex: number;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentSlideQuestionCount,
  currentQuestionIndex,
  onPreviousQuestion,
  onNextQuestion
}) => {
  const { 
    currentSlide, 
    totalSlides, 
    previousSlide, 
    nextSlide 
  } = usePresentation();
  
  const { getQuestionsBySlide } = useMultipleChoice();
  
  // Determine if we can go to the previous/next slide
  const previousSlideHasQuestions = currentSlide > 1 && 
    getQuestionsBySlide(currentSlide - 1).length > 0;
  
  const nextSlideHasQuestions = currentSlide < totalSlides && 
    getQuestionsBySlide(currentSlide + 1).length > 0;

  return (
    <div className="flex justify-between p-2 bg-gray-100">
      <div className="flex space-x-3">
        {/* Previous navigation */}
        {currentSlideQuestionCount > 1 && (
          <button 
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
            onClick={onPreviousQuestion}
            disabled={currentQuestionIndex <= 0}
          >
            Previous Question
          </button>
        )}
        
        {previousSlideHasQuestions && (
          <button 
            className="px-3 py-1 bg-green-500 text-white rounded"
            onClick={previousSlide}
          >
            Previous Slide
          </button>
        )}
      </div>
      
      {/* Status display */}
      <div className="flex items-center">
        <span className="mx-2">Slide {currentSlide}</span>
        {currentSlideQuestionCount > 1 && (
          <span className="mx-2">• Question {currentQuestionIndex + 1} of {currentSlideQuestionCount}</span>
        )}
      </div>
      
      {/* Next navigation */}
      <div className="flex space-x-3">
        {nextSlideHasQuestions && (
          <button 
            className="px-3 py-1 bg-green-500 text-white rounded"
            onClick={nextSlide}
          >
            Next Slide
          </button>
        )}
        
        {currentSlideQuestionCount > 1 && (
          <button 
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
            onClick={onNextQuestion}
            disabled={currentQuestionIndex >= currentSlideQuestionCount - 1}
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizNavigation;