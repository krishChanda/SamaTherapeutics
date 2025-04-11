import React, { useEffect, useState, useCallback } from 'react';
import { usePresentation } from '@/contexts/PresentationContext';
import SlideDeck from './slidedeck';
import { useGraphContext } from '@/contexts/GraphContext';
import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from "uuid";

const PresentationMode: React.FC = () => {
  const { 
    currentSlide, 
    totalSlides, 
    exitPresentation, 
    nextSlide: nextSlideContext, 
    previousSlide: previousSlideContext,
    goToSlide: goToSlideContext
  } = usePresentation();
  
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages } = graphData;
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [lastProcessedSlide, setLastProcessedSlide] = useState(0);

  // Initialize presentation on first load
  useEffect(() => {
    if (isFirstLoad && iframeLoaded) {
      console.log("🔍 Starting presentation");
      setIsFirstLoad(false);
      
      // Create a message to start the presentation
      const initialMessage = new HumanMessage({
        content: "Start carvedilol presentation",
        id: uuidv4(),
      });
      
      // Update messages
      setMessages(prevMessages => [...prevMessages, initialMessage]);
      
      // Use streamMessage to trigger the presentation mode
      streamMessage({
        messages: [initialMessage],
        presentationMode: true,
        presentationSlide: 1
      } as any);
      
      setLastProcessedSlide(1);
    }
  }, [isFirstLoad, iframeLoaded, streamMessage, setMessages]);

  // Handle slide changes to update the AI
  useEffect(() => {
    if (!isFirstLoad && currentSlide !== lastProcessedSlide) {
      console.log("🔍 Slide changed to:", currentSlide, "Last processed:", lastProcessedSlide);
      
      // Create a message to request the new slide
      const slideChangeMessage = new HumanMessage({
        content: `Continue to slide ${currentSlide}`,
        id: uuidv4(),
      });
      
      // Update messages
      setMessages(prevMessages => [...prevMessages, slideChangeMessage]);
      
      console.log("🔍 Streaming message for slide:", currentSlide);
      
      // Use streamMessage to trigger the presentation mode with the new slide
      streamMessage({
        messages: [slideChangeMessage],
        presentationMode: true,
        presentationSlide: currentSlide
      } as any);
      
      setLastProcessedSlide(currentSlide);
    }
  }, [currentSlide, isFirstLoad, lastProcessedSlide, setMessages, streamMessage]);

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log("🔍 Iframe loaded");
    setIframeLoaded(true);
  };

  // Custom handlers that log actions for debugging
  const handleNextSlide = useCallback(() => {
    console.log("🔍 Next button clicked, current slide:", currentSlide);
    if (currentSlide < totalSlides) {
      nextSlideContext();
    }
  }, [currentSlide, nextSlideContext, totalSlides]);

  const handlePrevSlide = useCallback(() => {
    console.log("🔍 Previous button clicked, current slide:", currentSlide);
    if (currentSlide > 1) {
      previousSlideContext();
    }
  }, [currentSlide, previousSlideContext]);

  return (
    <div className="h-full w-full flex flex-col bg-white presentation-panel relative">
      {/* Header with title and exit button */}
      <div className="flex justify-between items-center p-2 border-b bg-white">
        <h1 className="text-xl font-semibold">Presentation on Carvedilol</h1>
        <button
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md shadow-md"
          onClick={exitPresentation}
        >
          Exit Presentation
        </button>
      </div>
      
      {/* Main content: Presentation container */}
      <div className="flex-1 flex">
        {/* Slide deck */}
        <div className="flex-1 h-full overflow-hidden border-r border-gray-200">
          <iframe 
            src={`/presentation.html?slide=${currentSlide}`}
            className="w-full h-full border-none presentation-iframe"
            title="Carvedilol Presentation"
            onLoad={handleIframeLoad}
          />
        </div>
      </div>
      
      {/* Navigation controls */}
      <div className="flex justify-between p-2 bg-gray-100">
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          onClick={handlePrevSlide}
          disabled={currentSlide <= 1}
        >
          Previous
        </button>
        <span className="self-center">Page {currentSlide} of {totalSlides}</span>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          onClick={handleNextSlide}
          disabled={currentSlide >= totalSlides}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PresentationMode;