import React from 'react';

interface ScrollAreaProps {
  className?: string;
  children: React.ReactNode;
}

// Simple div with scroll behavior instead of using forwardRef
export const ScrollArea: React.FC<ScrollAreaProps> = ({ className, children }) => {
  return (
    <div 
      className={`overflow-auto ${className || ''}`}
    >
      {children}
    </div>
  );
};