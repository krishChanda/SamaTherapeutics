// contexts/PresentationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGraphContext } from './GraphContext';
import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from "uuid";
import { GraphInput } from "@opencanvas/shared/types";

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

export function PresentationProvider({ children }: { children: React.ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides] = useState(7); // Total slides in the Carvedilol presentation
  const { graphData } = useGraphContext();
  const { streamMessage, setMessages } = graphData;

  // Listen for presentation mode changes from other components
  useEffect(() => {
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
    
    // Create a message ID
    const messageId = uuidv4();
    
    // Create a message with special content that the generatePath function will recognize
    const initialMessage = {
      role: "human",
      content: "Start carvedilol presentation", // This specific phrase is recognized in generatePath
      id: messageId
    };
    
    // Create a HumanMessage for UI purposes
    const humanMessageForUI = new HumanMessage({
      content: "Start carvedilol presentation",
      id: messageId,
    });
    
    // Update messages state
    setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
    
    console.log("🔍 Streaming message for presentation start");
    
    // Stream the message with explicit presentation mode flags
    streamMessage({
      messages: [initialMessage],
      presentationMode: true,
      presentationSlide: 1
    } as GraphInput);
  };

  // Exit the presentation
  const exitPresentation = () => {
    setIsPresentationMode(false);
    
    // Notify other components that presentation mode has ended
    window.dispatchEvent(new CustomEvent('presentationModeChange', { 
      detail: { isActive: false } 
    }));
    
    // Create a message ID
    const messageId = uuidv4();
    
    // Create a message to exit presentation
    const exitMessage = new HumanMessage({
      content: "Exit presentation mode",
      id: messageId,
    });
    
    // Update messages state
    setMessages(prevMessages => [...prevMessages, exitMessage]);
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
      
      // Send message to update the slide in the iframe if it exists
      const iframe = document.querySelector('.presentation-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'goToSlide',
          slideNumber
        }, '*');
      }
      
      // Create a message ID
      const messageId = uuidv4();
      
      // Create a message with specific format that generatePath will recognize
      // as a navigation command
      const slideChangeMessage = {
        role: "human",
        content: `go to slide ${slideNumber}`, // This format is recognized in generatePath
        id: messageId
      };
      
      // Create a HumanMessage for UI purposes
      const humanMessageForUI = new HumanMessage({
        content: `go to slide ${slideNumber}`,
        id: messageId,
      });
      
      // Update messages state
      setMessages(prevMessages => [...prevMessages, humanMessageForUI]);
      console.log("🔍 Stream message called with slide:", slideNumber);
      
      // Pass explicit presentationMode and presentationSlide flags to ensure they're set
      streamMessage({
        messages: [slideChangeMessage],
        presentationMode: true,
        presentationSlide: slideNumber
      } as GraphInput);
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