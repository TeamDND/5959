import React from 'react';
import { useMentalCare } from '../App';
import '../style/Main.css';

export default function Main() {
    const { openMentalCare } = useMentalCare();
    
    return (
        <div className="main-container">
            <div className="main-content">
                {/* 왼쪽 섹션 - main.gif */}
                <div className="left-section">
                    <img src="/main.gif" alt="demo" className="main-gif" />
                    <p className="copyright-text">*Copyright 2025. 5959. All rights reserved</p>
                    <img src="/heart.jpg" alt="heart" className="heart-overlay" />
                </div>
                
                {/* 오른쪽 섹션 - logo.jpg + 버튼들 */}
                <div className="right-section">
                    <div className="main-logo">
                        <img src="/logo.jpg" alt="demo" />
                    </div>
                    <div className="main-buttons">
                        {/* <button onClick={() => window.location.href='/interview'}>면접 분석</button> */}
                        <button onClick={() => window.location.href='/text-cleanup'}>AI 요약도구</button>
                        <button onClick={() => window.location.href='/job-analysis'}>AI 채용공고 분석</button>
                        {/* <button onClick={() => window.location.href='/mentalcare'}>AI 멘탈 상담</button> */}
                        <button onClick={() => window.location.href='/self'}>AI 자기소개서 작성</button>
                        {/* <button onClick={() => window.location.href='/posture'}>자세교정</button> */}
                        <button onClick={() => window.location.href='/networking-ai'}>AI 네트워크</button>
                    </div>
                </div>
            </div>
            
            {/* 채팅 버튼 - 오른쪽 하단 고정 */}
            <div className="chat-button-container">
                <button 
                    className="chat-button"
                    onClick={openMentalCare}
                    title="AI 멘탈 상담"
                >
                    <img src="/chat.jpg" alt="chat" />
                </button>
            </div>
            
            {/* 자세교정 버튼 - 오른쪽 하단 고정 */}
            <div className="posture-button-container">
                <button 
                    className="posture-button"
                    onClick={() => window.location.href='/posture'}
                    title="자세교정"
                >
                    <img src="/Posture.jpg" alt="posture" />
                </button>
            </div>
        </div>
    )
}
