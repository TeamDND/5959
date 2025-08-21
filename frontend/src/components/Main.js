import '../style/Main.css';

export default function Main() {
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
                        <button onClick={() => window.location.href='/mentalcare'}>AI 멘탈 상담</button>
                        <button onClick={() => window.location.href='/self'}>AI 자기소개서 작성</button>
                        <button onClick={() => window.location.href='/posture'}>자세교정</button>
                        <button onClick={() => window.location.href='/posture'}>AI 네트워크</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
