// components/ui/QuizNavigation.tsx

import React from 'react';

interface QuizNavigationProps {
  currentSlideQuestionCount: number;
  currentQuestionIndex: number;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  isCurrentQuestionAnswered: boolean;
  showNextButton?: boolean;
  disableNextButton?: boolean;
  globalProgress?: string;
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentSlideQuestionCount,
  currentQuestionIndex,
  onPreviousQuestion,
  onNextQuestion,
  isCurrentQuestionAnswered,
  showNextButton = true,
  disableNextButton = false,
  globalProgress
}) => {
  return (
    <div className="flex justify-between p-2 bg-gray-100">
      <div className="flex space-x-3">
        {/* Previous navigation */}
        <button 
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          onClick={onPreviousQuestion}
        >
          Previous Question
        </button>
      </div>
      
      {/* Status display */}
      <div className="flex items-center">
        {globalProgress ? (
          <span className="mx-2">{globalProgress}</span>
        ) : currentSlideQuestionCount > 0 ? (
          <span className="mx-2">Question {currentQuestionIndex + 1} of {currentSlideQuestionCount}</span>
        ) : null}
      </div>
      
      {/* Next navigation */}
      <div className="flex space-x-3">
        {showNextButton && (
          <button 
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
            onClick={onNextQuestion}
            disabled={disableNextButton}
          >
            {isCurrentQuestionAnswered ? "Next Question" : "Please Answer Question"}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizNavigation;
