// components/ui/MultipleChoicePanel.tsx
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

// Interface for Choice objects
interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

// Interface for Question objects
interface Question {
  id: string;
  text: string;
  choices: Choice[];
}

interface MultipleChoicePanelProps {
  question: Question | null;
  onAnswerSelected: (choiceId: string, isCorrect: boolean) => void;
  className?: string;
  slideNumber?: number;
  isAnswered?: boolean;
}

const MultipleChoicePanel: React.FC<MultipleChoicePanelProps> = ({
  question,
  onAnswerSelected,
  className,
  slideNumber,
  isAnswered = false
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | undefined>(undefined);
  const [showFeedback, setShowFeedback] = useState(isAnswered);
  
  // Reset state when question changes or isAnswered changes
  useEffect(() => {
    setShowFeedback(isAnswered);
    // Reset selection when question changes
    if (!isAnswered) {
      setSelectedChoice(undefined);
    }
  }, [question?.id, isAnswered]);
  
  if (!question) {
    return <div className={cn("p-4 flex items-center justify-center", className)}>
      <p className="text-gray-500">No question available for this slide.</p>
    </div>;
  }

  const handleChoiceClick = (choiceId: string, isCorrect: boolean) => {
    // Only allow selection if not already answered
    if (!showFeedback) {
      console.log(`Selected: ${choiceId}, isCorrect: ${isCorrect}`); // Debug log
      
      setSelectedChoice(choiceId);
      setShowFeedback(true);
      onAnswerSelected(choiceId, isCorrect);
    }
  };

  // Find the correct choice for highlighting
  const correctChoice = question.choices.find(c => c.isCorrect === true);
  
  // Check if the selected choice is correct (with explicit comparison)
  const isSelectedChoiceCorrect = selectedChoice ? 
    question.choices.find(c => c.id === selectedChoice)?.isCorrect === true : 
    false;
  
  const getButtonClass = (choiceId: string, isCorrect: boolean) => {
    if (!showFeedback) {
      return selectedChoice === choiceId 
        ? "bg-blue-500 text-white hover:bg-blue-600" 
        : "bg-white border-2 border-gray-300 hover:bg-gray-100";
    }
    
    // In feedback mode - use explicit comparison
    if (isCorrect === true) {
      return "bg-green-500 text-white border-2 border-green-600"; 
    }
    
    if (selectedChoice === choiceId && isCorrect === false) {
      return "bg-red-500 text-white border-2 border-red-600";
    }
    
    return "bg-white border-2 border-gray-300";
  };

  return (
    <div className={cn("p-4 bg-white", className)}>
      <div className="font-semibold text-xl mb-4">{question.text}</div>
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {question.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoiceClick(choice.id, choice.isCorrect)}
            disabled={showFeedback}
            className={cn(
              "p-4 rounded-md transition-colors duration-200 font-medium",
              getButtonClass(choice.id, choice.isCorrect)
            )}
          >
            {choice.text}
          </button>
        ))}
      </div>
      
      {showFeedback && selectedChoice && (
        <div className={cn(
          "mt-6 p-4 rounded-md text-center font-medium",
          isSelectedChoiceCorrect
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        )}>
          {isSelectedChoiceCorrect
            ? "Correct! Well done!"
            : `Incorrect. The correct answer is: ${correctChoice?.text}`}
        </div>
      )}
    </div>
  );
};

export default MultipleChoicePanel;