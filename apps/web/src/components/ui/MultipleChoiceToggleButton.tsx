// components/ui/MultipleChoiceToggleButton.tsx

import React from 'react';
import { CheckSquare } from 'lucide-react';

interface MultipleChoiceToggleButtonProps {
  onClick: () => void;
  isActive?: boolean;
}

const MultipleChoiceToggleButton: React.FC<MultipleChoiceToggleButtonProps> = ({
  onClick,
  isActive = false
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md transition-colors ${
        isActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
      }`}
      title="Multiple Choice Mode"
    >
      <CheckSquare className="h-6 w-6" />
    </button>
  );
};

export default MultipleChoiceToggleButton;