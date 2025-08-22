import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMentalCare } from '../App';
import Header from './Header';
import '../style/global.css';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openMentalCare } = useMentalCare();
  
  const isMainPage = location.pathname === '/';

  return (
    <div className="layout">
         <Header />
      <div className="main-content">
        {children}
      </div>
      
      {/* 홈 버튼 - 오른쪽 하단 고정 */}
      <div className="home-button-container">
        <button 
          className="home-button"
          onClick={() => navigate('/')}
          title="홈으로"
        >
        <img src={"/home.jpg"} alt="home" />
        </button>
      </div>
      
      {/* 채팅 버튼 - 홈 버튼 위에 위치 */}
      <div className="chat-button-container">
        <button 
          className="chat-button"
          onClick={openMentalCare}
          title="AI 멘탈 상담"
        >
          <img src="/chat.jpg" alt="chat" />
        </button>
      </div>
    </div>
  );
};

export default Layout;
