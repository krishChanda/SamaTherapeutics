import React from "react";

interface SlideDeckProps {
  // You can add props to customize the presentation if needed
}

const SlideDeck: React.FC<SlideDeckProps> = () => {
  return (
    <div className="w-full h-full flex flex-col bg-white slidedeck-component">
      <iframe
        src="/presentation.html"
        title="Open Canvas Presentation"
        className="w-full h-full border-none flex-1 presentation-iframe"
        allow="fullscreen"
        style={{ backgroundColor: 'white' }}
      />
    </div>
  );
};

export default SlideDeck;