// components/ui/IntegratedMultipleChoiceView.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useMultipleChoice, Question } from '@/contexts/MultipleChoiceContext';
import { usePresentation } from '@/contexts/PresentationContext';
import MultipleChoicePanel from './MultipleChoicePanel';
import SynchronizedSlideFrame from './SynchronizedSlideFrame';
import QuizNavigation from './QuizNavigation';

const IntegratedMultipleChoiceView: React.FC = () => {
  const { 
    currentQuestion, 
    handleAnswerSelected, 
    disableMultipleChoiceMode,
    getQuestionsBySlide,
    goToQuestionById
  } = useMultipleChoice();
  
  const { currentSlide, totalSlides, goToSlide } = usePresentation();
  const [slideQuestions, setSlideQuestions] = useState<Question[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  
  // Update questions when the slide changes
  useEffect(() => {
    const questions = getQuestionsBySlide(currentSlide);
    setSlideQuestions(questions);
    
    // If there are no questions on the current slide, find the next slide with questions
    if (questions.length === 0) {
      let nextSlideWithQuestions = -1;
      
      // Search forward for a slide with questions
      for (let i = currentSlide + 1; i <= totalSlides; i++) {
        if (getQuestionsBySlide(i).length > 0) {
          nextSlideWithQuestions = i;
          break;
        }
      }
      
      // If no slides ahead have questions, search backwards
      if (nextSlideWithQuestions === -1) {
        for (let i = currentSlide - 1; i >= 1; i--) {
          if (getQuestionsBySlide(i).length > 0) {
            nextSlideWithQuestions = i;
            break;
          }
        }
      }
      
      // Navigate to the slide with questions if found
      if (nextSlideWithQuestions !== -1) {
        goToSlide(nextSlideWithQuestions);
      }
    } else {
      // Reset to first question when changing to a slide with questions
      setSelectedQuestionIndex(0);
    }
  }, [currentSlide, getQuestionsBySlide, goToSlide, totalSlides]);
  
  const displayedQuestion = slideQuestions.length > 0 && selectedQuestionIndex < slideQuestions.length 
    ? slideQuestions[selectedQuestionIndex] 
    : null;
  
  // Navigate between questions for the current slide
  const goToPreviousQuestion = useCallback(() => {
    if (selectedQuestionIndex > 0) {
      setSelectedQuestionIndex(prev => prev - 1);
    }
  }, [selectedQuestionIndex]);
  
  const goToNextQuestion = useCallback(() => {
    if (selectedQuestionIndex < slideQuestions.length - 1) {
      setSelectedQuestionIndex(prev => prev + 1);
    }
  }, [selectedQuestionIndex, slideQuestions.length]);

  // Handle slide loaded
  const handleSlideLoaded = useCallback(() => {
    setIframeLoaded(true);
  }, []);
  
  // Handle answer selection with enhanced feedback
  const handleAnswer = useCallback((choiceId: string, isCorrect: boolean) => {
    handleAnswerSelected(choiceId, isCorrect);
    
    // Auto-advance to next question after a delay if correct
    if (isCorrect && selectedQuestionIndex < slideQuestions.length - 1) {
      setTimeout(() => {
        goToNextQuestion();
      }, 1500); // Delay to allow user to see feedback
    }
  }, [handleAnswerSelected, selectedQuestionIndex, slideQuestions.length, goToNextQuestion]);

  // Check if there are any questions in the quiz
  const hasAnyQuestions = useCallback(() => {
    for (let i = 1; i <= totalSlides; i++) {
      if (getQuestionsBySlide(i).length > 0) {
        return true;
      }
    }
    return false;
  }, [getQuestionsBySlide, totalSlides]);

  // If no questions are available, show a message
  if (!hasAnyQuestions()) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-white">
        <div className="p-8 bg-gray-100 rounded-lg shadow-md max-w-lg text-center">
          <h2 className="text-2xl font-bold mb-4">No Quiz Questions Available</h2>
          <p className="mb-6">There are no quiz questions configured for this presentation.</p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={disableMultipleChoiceMode}
          >
            Exit Quiz Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white integrated-quiz-panel">
      {/* Header with title and exit button */}
      <div className="flex justify-between items-center p-2 border-b bg-white">
        <h1 className="text-xl font-semibold">Carvedilol Quiz</h1>
        <button
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md shadow-md"
          onClick={disableMultipleChoiceMode}
        >
          Exit Quiz Mode
        </button>
      </div>
      
      {/* Two-panel layout: slides on top, questions on bottom */}
      <div className="flex-1 flex flex-col">
        {/* Slides panel - takes 60% of the space */}
        <div className="h-3/5 border-b border-gray-200">
          <SynchronizedSlideFrame 
            slideNumber={currentSlide}
            onSlideLoaded={handleSlideLoaded}
            className="w-full h-full"
          />
        </div>
        
        {/* Questions panel - takes 40% of the space */}
        <div className="h-2/5 overflow-y-auto bg-gray-50">
          {!iframeLoaded ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading presentation...</p>
            </div>
          ) : displayedQuestion ? (
            <MultipleChoicePanel
              question={displayedQuestion}
              onAnswerSelected={handleAnswer}
              className="h-full"
              slideNumber={currentSlide}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-lg">No questions available for this slide.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation controls */}
      <QuizNavigation
        currentSlideQuestionCount={slideQuestions.length}
        currentQuestionIndex={selectedQuestionIndex}
        onPreviousQuestion={goToPreviousQuestion}
        onNextQuestion={goToNextQuestion}
      />
    </div>
  );
};

export default IntegratedMultipleChoiceView;