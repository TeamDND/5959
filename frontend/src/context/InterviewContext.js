import React, { createContext, useContext, useReducer } from 'react';

const InterviewContext = createContext();

const initialState = {
  jobInfo: null,
  questions: [],
  selectedQuestions: [],
  currentQuestionIndex: 0,
  answers: [],
  scores: [],
  feedback: [],
  sessionId: null,
  isInterviewActive: false,
  timeRemaining: 0,
  interviewMode: null // 'text-only', 'video-voice', 'voice-only'
};

function interviewReducer(state, action) {
  switch (action.type) {
    case 'SET_JOB_INFO':
      return {
        ...state,
        jobInfo: action.payload.jobInfo,
        questions: action.payload.questions
      };
    
    case 'START_INTERVIEW':
      return {
        ...state,
        selectedQuestions: action.payload.questions,
        sessionId: action.payload.sessionId,
        isInterviewActive: true,
        currentQuestionIndex: 0,
        answers: [],
        scores: [],
        feedback: []
      };
    
    case 'SUBMIT_ANSWER':
      const newAnswers = [...state.answers, action.payload.answer];
      const newScores = [...state.scores, action.payload.score];
      const newFeedback = [...state.feedback, action.payload.feedback];
      
      return {
        ...state,
        answers: newAnswers,
        scores: newScores,
        feedback: newFeedback,
        currentQuestionIndex: state.currentQuestionIndex + 1
      };
    
    case 'END_INTERVIEW':
      return {
        ...state,
        isInterviewActive: false
      };
    
    case 'SET_TIME_REMAINING':
      return {
        ...state,
        timeRemaining: action.payload
      };
    
    case 'SET_INTERVIEW_MODE':
      return {
        ...state,
        interviewMode: action.payload.mode
      };
    
    case 'SET_CURRENT_QUESTION_INDEX':
      return {
        ...state,
        currentQuestionIndex: action.payload
      };
    
    case 'RESET_INTERVIEW':
      return initialState;
    
    default:
      return state;
  }
}

export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  return (
    <InterviewContext.Provider value={{ state, dispatch }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within InterviewProvider');
  }
  return context;
}