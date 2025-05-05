// components/ui/SynchronizedSlideFrame.tsx

import React, { useEffect, useRef } from 'react';
import { usePresentation } from '@/contexts/PresentationContext';

interface SynchronizedSlideFrameProps {
  slideNumber: number;
  onSlideLoaded?: () => void;
  className?: string;
}

const SynchronizedSlideFrame: React.FC<SynchronizedSlideFrameProps> = ({
  slideNumber,
  onSlideLoaded,
  className
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { goToSlide } = usePresentation();
  
  // Handle iframe load
  const handleIframeLoad = () => {
    if (onSlideLoaded) {
      onSlideLoaded();
    }
  };
  
  // Update the iframe when the slide number changes
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Send a message to the iframe to update the slide
      iframeRef.current.contentWindow.postMessage({
        type: 'goToSlide',
        slideNumber
      }, '*');
    }
  }, [slideNumber]);
  
  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessageFromIframe = (event: MessageEvent) => {
      if (event.data && event.data.type === 'slideChanged') {
        // If the slide changes internally within the iframe, update our context
        if (event.data.slideNumber !== slideNumber) {
          goToSlide(event.data.slideNumber);
        }
      }
    };
    
    window.addEventListener('message', handleMessageFromIframe);
    
    return () => {
      window.removeEventListener('message', handleMessageFromIframe);
    };
  }, [slideNumber, goToSlide]);

  return (
    <iframe 
      ref={iframeRef}
      src={`/presentation.html?slide=${slideNumber}`}
      className={`w-full h-full border-none presentation-iframe ${className || ''}`}
      title="Carvedilol Presentation"
      onLoad={handleIframeLoad}
    />
  );
};

export default SynchronizedSlideFrame;