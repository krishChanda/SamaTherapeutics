// components/ui/MultipleChoicePanel.tsx

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Choice, Question } from '@/contexts/MultipleChoiceContext';

interface MultipleChoicePanelProps {
  question: Question | null;
  onAnswerSelected: (choiceId: string, isCorrect: boolean) => void;
  className?: string;
  slideNumber?: number;
}

const MultipleChoicePanel: React.FC<MultipleChoicePanelProps> = ({
  question,
  onAnswerSelected,
  className,
  slideNumber
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | undefined>(undefined);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Reset state when question changes
  useEffect(() => {
    setSelectedChoice(undefined);
    setShowFeedback(false);
  }, [question?.id, slideNumber]);
  
  if (!question) {
    return <div className={cn("flex items-center justify-center h-full", className)}>
      <p className="text-gray-500">No question available for this slide.</p>
    </div>;
  }

  const handleChoiceClick = (choiceId: string, isCorrect: boolean) => {
    setSelectedChoice(choiceId);
    setShowFeedback(true);
    onAnswerSelected(choiceId, isCorrect);
  };

  const getButtonClass = (choiceId: string, isCorrect: boolean) => {
    if (!showFeedback || selectedChoice !== choiceId) {
      return selectedChoice === choiceId 
        ? "bg-blue-500 text-white hover:bg-blue-600" 
        : "bg-white border-2 border-gray-300 hover:bg-gray-100";
    }
    
    return isCorrect 
      ? "bg-green-500 text-white border-2 border-green-600" 
      : "bg-red-500 text-white border-2 border-red-600";
  };

  return (
    <div className={cn("p-4 bg-white", className)}>
      <div className="font-semibold text-xl mb-4 text-center">{question.text}</div>
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {question.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoiceClick(choice.id, choice.isCorrect)}
            disabled={showFeedback}
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
            : "Incorrect. Try again!"}
        </div>
      )}
    </div>
  );
};

export default MultipleChoicePanel;