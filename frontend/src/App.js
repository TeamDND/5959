import React from 'react';
import './style/global.css';
import MentalCareChat from './components/MentalCareChat';

import TextCleanup from './components/TextCleanup';
import JobAnalysis from './components/JobAnalysis';
import DeviceTest from './components/DeviceTest';
import Interview from './components/Interview';
import Result from './components/Result';
import Self from './components/self';
import Main from './components/Main';

import { InterviewProvider } from './context/InterviewContext';
import PostureMonitor from './components/PostureMonitor';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <InterviewProvider>
      <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/text-cleanup" element={<TextCleanup />} />
          <Route path="/job-analysis" element={<JobAnalysis />} />
          <Route path="/mentalcare" element={<MentalCareChat />} />
          <Route path="/device-test" element={<DeviceTest />} />
          <Route path="/mock-interview" element={<Interview />} />
          <Route path="/interview-result" element={<Result />} />
          <Route path="/posture" element={<PostureMonitor />} />
          <Route path="/result" element={<Result />} />
          <Route path="/self" element={<Self />} />
          

      </Routes>
    </InterviewProvider>
  );
}

export default App;
