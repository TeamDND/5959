import React, { useState, createContext, useContext } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import './style/global.css';
import MentalCareChat from './components/MentalCareChat';

import TextCleanup from './components/TextCleanup';
import JobAnalysis from './components/JobAnalysis';
import DeviceTest from './components/DeviceTest';
import Interview from './components/Interview';
import Result from './components/Result';
import Self from './components/self';
import Main from './components/Main';
import NetworkingAI from './components/NetworkingAI';
import { InterviewProvider } from './context/InterviewContext';
import PostureMonitor from './components/PostureMonitor';
import { Routes, Route } from 'react-router-dom';

// MentalCare 모달 상태를 위한 Context
const MentalCareContext = createContext();

export const useMentalCare = () => {
  const context = useContext(MentalCareContext);
  if (!context) {
    throw new Error('useMentalCare must be used within a MentalCareProvider');
  }
  return context;
};

function App() {
  const [isMentalCareOpen, setIsMentalCareOpen] = useState(false);

  const openMentalCare = () => setIsMentalCareOpen(true);
  const closeMentalCare = () => setIsMentalCareOpen(false);

  return (
    <Provider store={store}>
      <MentalCareContext.Provider value={{ isMentalCareOpen, openMentalCare, closeMentalCare }}>
        <InterviewProvider>
          <Routes>
              <Route path="/" element={<Main />} />
              <Route path="/text-cleanup" element={<TextCleanup />} />
              <Route path="/job-analysis" element={<JobAnalysis />} />
              <Route path="/device-test" element={<DeviceTest />} />
              <Route path="/mock-interview" element={<Interview />} />
              <Route path="/interview-result" element={<Result />} />
              <Route path="/posture" element={<PostureMonitor />} />
              <Route path="/result" element={<Result />} />
              <Route path="/self" element={<Self />} />
              <Route path="/networking-ai" element={<NetworkingAI />} />
          </Routes>
          
          {/* MentalCare 모달 */}
          {isMentalCareOpen && <MentalCareChat onClose={closeMentalCare} />}
        </InterviewProvider>
      </MentalCareContext.Provider>
    </Provider>
  );
}

export default App;
