import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header.js';
import '../style/global.css';

function Layout({ children }) {
    const navigate = useNavigate();

    return (
        <div className="layout">
            {/* 헤더 */}
            <Header />
            
            {/* 메인 콘텐츠 영역 */}
            <main className="main-content">
                {children}
            </main>

            {/* 홈 버튼 - 오른쪽 하단 고정 */}
            <div style={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                zIndex: 1000
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#667eea',
                        color: 'white',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    }}
                >
                    <img src='/home.jpg' style={{ width: '60px', height: '60px',borderRadius: '50%'}}/>
                </button>
            </div>


        </div>
    );
}

export default Layout;
