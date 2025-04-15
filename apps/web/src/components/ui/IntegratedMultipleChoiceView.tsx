// components/ui/IntegratedMultipleChoiceView.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useMultipleChoice, Question } from '@/contexts/MultipleChoiceContext';
import { usePresentation } from '@/contexts/PresentationContext';
import MultipleChoicePanel from './MultipleChoicePanel';
import SynchronizedSlideFrame from './SynchronizedSlideFrame';
import QuizNavigation from './QuizNavigation';

const IntegratedMultipleChoiceView: React.FC = () => {
  const { 
    handleAnswerSelected, 
    disableMultipleChoiceMode,
    getQuestionsBySlide,
    isQuestionAnswered,
    resetQuizProgress,
    getTotalQuestionsCount,
    getCorrectAnswersCount,
    getAnsweredQuestions
  } = useMultipleChoice();
  
  const { currentSlide, totalSlides, goToSlide } = usePresentation();
  const [slideQuestions, setSlideQuestions] = useState<Question[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [globalQuestionIndex, setGlobalQuestionIndex] = useState(0);
  
  // Gather all questions on component mount
  useEffect(() => {
    const questions: Question[] = [];
    for (let i = 1; i <= totalSlides; i++) {
      const slideQuestions = getQuestionsBySlide(i);
      questions.push(...slideQuestions);
    }
    setAllQuestions(questions);
  }, [getQuestionsBySlide, totalSlides]);
  
  // Update slide questions when the slide changes
  useEffect(() => {
    if (!showSummary) {
      const questions = getQuestionsBySlide(currentSlide);
      setSlideQuestions(questions);
      
      // If we have questions on this slide, find the current question's index
      if (questions.length > 0) {
        // Find the global index of the first question on this slide
        const firstQuestionOnSlide = questions[0];
        const globalIndex = allQuestions.findIndex(q => q.id === firstQuestionOnSlide.id);
        if (globalIndex !== -1) {
          setGlobalQuestionIndex(globalIndex);
          setSelectedQuestionIndex(0);
        }
      }
    }
  }, [currentSlide, getQuestionsBySlide, showSummary, allQuestions]);
  
  const displayedQuestion = slideQuestions.length > 0 && selectedQuestionIndex < slideQuestions.length 
    ? slideQuestions[selectedQuestionIndex] 
    : null;
  
  // Navigate to the previous question globally
  const goToPreviousQuestion = useCallback(() => {
    if (globalQuestionIndex > 0) {
      const prevQuestion = allQuestions[globalQuestionIndex - 1];
      
      // If the previous question is on a different slide, navigate to that slide
      if (prevQuestion.slideNumber !== currentSlide) {
        goToSlide(prevQuestion.slideNumber || 1);
        
        // The slide change will trigger the useEffect which will update selectedQuestionIndex
      } else {
        // Previous question is on the same slide
        setSelectedQuestionIndex(prev => prev - 1);
        setGlobalQuestionIndex(prev => prev - 1);
      }
    }
  }, [globalQuestionIndex, allQuestions, currentSlide, goToSlide]);
  
  // Navigate to the next question globally
  const goToNextQuestion = useCallback(() => {
    if (globalQuestionIndex < allQuestions.length - 1) {
      const nextQuestion = allQuestions[globalQuestionIndex + 1];
      
      // If the next question is on a different slide, navigate to that slide
      if (nextQuestion.slideNumber !== currentSlide) {
        goToSlide(nextQuestion.slideNumber || 1);
        
        // The slide change will trigger the useEffect which will update selectedQuestionIndex
      } else {
        // Next question is on the same slide
        setSelectedQuestionIndex(prev => prev + 1);
        setGlobalQuestionIndex(prev => prev + 1);
      }
    } else {
      // We've reached the end of all questions - show summary
      setShowSummary(true);
    }
  }, [globalQuestionIndex, allQuestions, currentSlide, goToSlide]);

  // Handle slide loaded
  const handleSlideLoaded = useCallback(() => {
    setIframeLoaded(true);
  }, []);
  
  // Handle answer selection
  const handleAnswer = useCallback((choiceId: string, isCorrect: boolean) => {
    if (displayedQuestion) {
      handleAnswerSelected(choiceId, isCorrect);
    }
  }, [displayedQuestion, handleAnswerSelected]);

  // Check if there are any questions in the quiz
  const hasAnyQuestions = useCallback(() => {
    return allQuestions.length > 0;
  }, [allQuestions]);

  // Restart the quiz
  const handleRestartQuiz = useCallback(() => {
    resetQuizProgress();
    setShowSummary(false);
    
    // Go to the first question
    if (allQuestions.length > 0) {
      const firstQuestion = allQuestions[0];
      goToSlide(firstQuestion.slideNumber || 1);
      setGlobalQuestionIndex(0);
      setSelectedQuestionIndex(0);
    }
  }, [goToSlide, resetQuizProgress, allQuestions]);

  // Check if the current question has been answered
  const isCurrentQuestionAnswered = displayedQuestion 
    ? isQuestionAnswered(displayedQuestion.id) 
    : false;

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

  // Show the summary screen if we've reached the end
  if (showSummary) {
    const correctAnswers = getCorrectAnswersCount();
    const totalQuestions = getTotalQuestionsCount();
    
    return (
      <div className="h-full w-full flex flex-col bg-white">
        <div className="flex justify-between items-center p-2 border-b bg-white">
          <h1 className="text-xl font-semibold">Quiz Results</h1>
          <button
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md shadow-md"
            onClick={disableMultipleChoiceMode}
          >
            Exit Quiz Mode
          </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-6">Quiz Completed!</h2>
            <div className="text-6xl font-bold mb-4 text-blue-600">
              {correctAnswers} / {totalQuestions}
            </div>
            <p className="text-xl mb-8">
              You answered {correctAnswers} out of {totalQuestions} questions correctly!
            </p>
            <div className="flex justify-center space-x-4">
              <button
                className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 font-semibold"
                onClick={handleRestartQuiz}
              >
                Restart Quiz
              </button>
              <button
                className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold"
                onClick={disableMultipleChoiceMode}
              >
                Exit Quiz
              </button>
            </div>
          </div>
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
              isAnswered={isCurrentQuestionAnswered}
              readOnly={isCurrentQuestionAnswered}
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
        isCurrentQuestionAnswered={isCurrentQuestionAnswered}
        showNextButton={true}
        disableNextButton={!isCurrentQuestionAnswered}
        globalProgress={`Question ${globalQuestionIndex + 1} of ${allQuestions.length}`}
      />
    </div>
  );
};

export default IntegratedMultipleChoiceView;