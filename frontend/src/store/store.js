import { configureStore } from '@reduxjs/toolkit';
import mentalCareReducer from './mentalCareSlice';

export const store = configureStore({
  reducer: {
    mentalCare: mentalCareReducer,
  },
});
