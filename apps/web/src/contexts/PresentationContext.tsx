import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useGraphContext } from './GraphContext';
import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from "uuid";

interface PresentationContextProps {
  isPresentationMode: boolean;
  currentSlide: number;
  totalSlides: number;
  startPresentation: () => void;
  exitPresentation: () => void;
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (slideNumber: number) => void;
}

const PresentationContext = createContext<PresentationContextProps | undefined>(undefined);

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(7); // Total slides in the Carvedilol presentation
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages, messages } = graphData;

  // Listen for presentation mode changes from other components
  React.useEffect(() => {
    const handleExitPresentation = () => {
      exitPresentation();
    };
    
    window.addEventListener('exitPresentation', handleExitPresentation);
    
    return () => {
      window.removeEventListener('exitPresentation', handleExitPresentation);
    };
  }, []);

  // Start the presentation
  const startPresentation = () => {
    console.log("🔍 Starting presentation");
    setIsPresentationMode(true);
    setCurrentSlide(1);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('presentationModeChange', { 
      detail: { isActive: true } 
    }));
    
    // Create a message ID we can reuse
    const messageId = uuidv4();
    
    // Create a message object in the expected format
    const initialMessage = {
      role: "human",
      content: "Start carvedilol presentation",
      id: messageId
    };
    
    // Create a HumanMessage for UI purposes
    const humanMessageForUI = new HumanMessage({
      content: "Start carvedilol presentation",
      id: messageId,
    });
    
    // Update messages state
    setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
    
    // Stream message with presentation mode enabled
    streamMessage({
      messages: [initialMessage],
      presentationMode: true,
      presentationSlide: 1
    } as any);
  };

  // Exit the presentation
  const exitPresentation = () => {
    setIsPresentationMode(false);
    
    // Notify other components that presentation mode has ended
    window.dispatchEvent(new CustomEvent('presentationModeChange', { 
      detail: { isActive: false } 
    }));
  };

  // Navigate to the next slide
  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      const newSlideNumber = currentSlide + 1;
      goToSlide(newSlideNumber);
    }
  };

  // Navigate to the previous slide
  const previousSlide = () => {
    if (currentSlide > 1) {
      const newSlideNumber = currentSlide - 1;
      goToSlide(newSlideNumber);
    }
  };

  // Go to a specific slide
  const goToSlide = (slideNumber: number) => {
    console.log("🔍 Going to slide:", slideNumber);
    if (slideNumber >= 1 && slideNumber <= totalSlides) {
      setCurrentSlide(slideNumber);
      
      // Send message to update the slide in the iframe
      const iframe = document.querySelector('.presentation-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'goToSlide',
          slideNumber
        }, '*');
      }
      
      // Create a message ID we can reuse
      const messageId = uuidv4();
      
      // Create a message object in the expected format
      const slideChangeMessage = {
        role: "human",
        content: `Continue to slide ${slideNumber}`,
        id: messageId
      };
      
      // Create a HumanMessage for UI purposes
      const humanMessageForUI = new HumanMessage({
        content: `Continue to slide ${slideNumber}`,
        id: messageId,
      });
      
      // Update messages state
      setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
      console.log("🔍 Stream message called with slide:", slideNumber);
      
      // Stream message with the new slide
      streamMessage({
        messages: [slideChangeMessage],
        presentationMode: true,
        presentationSlide: slideNumber
      } as any);
    }
  };

  return (
    <PresentationContext.Provider value={{
      isPresentationMode,
      currentSlide,
      totalSlides,
      startPresentation,
      exitPresentation,
      nextSlide,
      previousSlide,
      goToSlide
    }}>
      {children}
    </PresentationContext.Provider>
  );
}

export const usePresentation = () => {
  const context = useContext(PresentationContext);
  if (context === undefined) {
    throw new Error('usePresentation must be used within a PresentationProvider');
  }
  return context;
};