import React from 'react';

interface ThreadListProps {
  onSelectThread: (thread: any) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
  onResetCategory: () => void;
  onCreateNewThread: () => void;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  onSelectThread,
  selectedCategory,
  onSelectCategory,
  onResetCategory,
  onCreateNewThread
}) => {
  // This is a minimal implementation - enhance as needed
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm">Thread List</h3>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {/* If you have actual thread data, map through it here */}
        <div 
          className="p-2 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => onCreateNewThread()}
        >
          New Thread
        </div>
        {/* Example thread */}
        <div 
          className="p-2 hover:bg-gray-100 rounded cursor-pointer mt-2"
          onClick={() => onSelectThread({ id: 'example-thread' })}
        >
          Example Thread
        </div>
      </div>
    </div>
  );
};