// components/ui/MultipleChoicePanel.tsx

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Choice, Question } from '@/contexts/MultipleChoiceContext';

interface MultipleChoicePanelProps {
  question: Question | null;
  onAnswerSelected: (choiceId: string, isCorrect: boolean) => void;
  className?: string;
  slideNumber?: number;
  isAnswered?: boolean;
  readOnly?: boolean;
}

const MultipleChoicePanel: React.FC<MultipleChoicePanelProps> = ({
  question,
  onAnswerSelected,
  className,
  slideNumber,
  isAnswered = false,
  readOnly = false
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | undefined>(undefined);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Reset state when question changes
  useEffect(() => {
    // Do not reset if in read-only mode to maintain selected state
    if (!readOnly) {
      setSelectedChoice(undefined);
      setShowFeedback(false);
    }
  }, [question?.id, readOnly]);
  
  if (!question) {
    return <div className={cn("flex items-center justify-center h-full", className)}>
      <p className="text-gray-500">No question available for this slide.</p>
    </div>;
  }

  const handleChoiceClick = (choiceId: string, isCorrect: boolean) => {
    // Only allow selection if not already answered and not in read-only mode
    if (!showFeedback && !readOnly) {
      setSelectedChoice(choiceId);
      setShowFeedback(true);
      onAnswerSelected(choiceId, isCorrect);
    }
  };

  // Find the correct choice for highlighting
  const correctChoice = question.choices.find(c => c.isCorrect);
  const correctChoiceId = correctChoice?.id;

  const getButtonClass = (choiceId: string, isCorrect: boolean) => {
    if (!showFeedback && !readOnly) {
      return selectedChoice === choiceId 
        ? "bg-blue-500 text-white hover:bg-blue-600" 
        : "bg-white border-2 border-gray-300 hover:bg-gray-100";
    }
    
    // In feedback mode or read-only mode
    if (isCorrect) {
      return "bg-green-500 text-white border-2 border-green-600"; 
    }
    
    if (selectedChoice === choiceId && !isCorrect) {
      return "bg-red-500 text-white border-2 border-red-600";
    }
    
    return "bg-white border-2 border-gray-300";
  };

  return (
    <div className={cn("p-4 bg-white", className)}>
      <div className="font-semibold text-xl mb-4 text-center">{question.text}</div>
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {question.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoiceClick(choice.id, choice.isCorrect)}
            disabled={showFeedback || readOnly}
            className={cn(
              "p-4 rounded-md transition-colors duration-200 font-medium text-center text-lg",
              getButtonClass(choice.id, choice.isCorrect)
            )}
          >
            {choice.text}
          </button>
        ))}
      </div>
      
      {showFeedback && (
        <div className={cn(
          "mt-6 p-4 rounded-md text-center font-medium text-lg max-w-4xl mx-auto",
          selectedChoice && question.choices.find(c => c.id === selectedChoice)?.isCorrect
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        )}>
          {selectedChoice && question.choices.find(c => c.id === selectedChoice)?.isCorrect
            ? "Correct! Well done!"
            : `Incorrect. The correct answer is: ${correctChoice?.text}`}
        </div>
      )}
      
      {/* Add indicator if in read-only mode */}
      {readOnly && !showFeedback && (
        <div className="mt-6 p-4 rounded-md text-center font-medium text-lg max-w-4xl mx-auto bg-gray-100 text-gray-600">
          This question has not been answered yet.
        </div>
      )}
    </div>
  );
};

export default MultipleChoicePanel;