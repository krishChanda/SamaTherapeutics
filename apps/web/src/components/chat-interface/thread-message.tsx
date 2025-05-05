import React from 'react';
import { BaseMessage } from '@langchain/core/messages';

interface ThreadMessageProps {
  message: BaseMessage;
  inPresentationMode?: boolean;
}

const ThreadMessage: React.FC<ThreadMessageProps> = ({ 
  message, 
  inPresentationMode = false 
}) => {
  // Determine if it's a human message
  let isHuman = false;
  try {
    // First try the getType method if it exists
    if (typeof message.getType === 'function') {
      isHuman = message.getType() === 'human';
    } else {
      // Fallback - check if there's a _getType method
      isHuman = (message as any)._getType?.() === 'human' || 
                (message as any).role === 'human';
    }
  } catch (error) {
    // If all else fails, try to check some common properties
    isHuman = (message as any).role === 'human' || 
              String(message).includes('human');
  }
  
  return (
    <div className={`flex ${isHuman ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] p-3 rounded-lg mb-2 ${
        isHuman 
          ? 'bg-gray-100 rounded-tr-none' 
          : 'bg-white border border-gray-200 rounded-tl-none'
      }`}>
        {isHuman ? null : (
          <div className="flex items-center mb-1">
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-sm font-semibold mr-2">
              A
            </span>
            <span className="text-xs font-medium text-gray-700">Assistant</span>
          </div>
        )}
        <div className="text-sm">
          {typeof message.content === 'string' ? message.content : 'Complex message content'}
        </div>
        {isHuman ? null : (
          <div className="flex items-center mt-2 text-gray-500 text-xs">
            <button className="mr-2 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
            </button>
            <button className="hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadMessage;