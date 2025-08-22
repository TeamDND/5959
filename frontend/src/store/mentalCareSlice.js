import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  currentEmotion: 'neutral',
  isLoading: false
};

const mentalCareSlice = createSlice({
  name: 'mentalCare',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setCurrentEmotion: (state, action) => {
      state.currentEmotion = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.currentEmotion = 'neutral';
    },
    addBotMessage: (state, action) => {
      state.messages.push({
        id: Date.now() + 1,
        message: action.payload.message,
        isUser: false,
        emotion: action.payload.emotion,
        quote: action.payload.quote,
        timestamp: action.payload.timestamp
      });
    }
  }
});

export const { 
  addMessage, 
  setCurrentEmotion, 
  setLoading, 
  clearMessages, 
  addBotMessage 
} = mentalCareSlice.actions;

export default mentalCareSlice.reducer;
