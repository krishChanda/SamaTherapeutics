import { carvedilolPresentationScript } from './presentation-script';

export const handlePresentationMessage = (userMessage: string, currentSlide: number) => {
  // Check if the message is a navigation command
  if (userMessage.toLowerCase().includes('next slide') || 
      userMessage.toLowerCase().includes('go forward')) {
    return {
      isNavigation: true,
      direction: 'next'
    };
  }
  
  if (userMessage.toLowerCase().includes('previous slide') || 
      userMessage.toLowerCase().includes('go back')) {
    return {
      isNavigation: true,
      direction: 'previous'
    };
  }
  
  // If it's a question, prepare context for the AI
  const currentSlideScript = carvedilolPresentationScript.find(
    script => script.slideNumber === currentSlide
  );
  
  return {
    isNavigation: false,
    context: `You are currently presenting slide ${currentSlide} about Carvedilol. 
    The current slide is titled "${currentSlideScript?.title}" and covers: 
    ${currentSlideScript?.content.substring(0, 150)}... 
    Please answer the user's question in the context of this presentation, 
    focusing particularly on the content of the current slide when relevant.`
  };
};