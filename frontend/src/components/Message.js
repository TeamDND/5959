import React from 'react';

// 감정별 색상 매핑
const emotionColors = {
  happy: '#F76800',  // 포인트 색상
  sad: '#4A90E2',    // 차분한 블루
  angry: '#E74C3C',  // 붉은색
  anxious: '#9B59B6', // 보라색   
  neutral: '#005793'  // 메인 색상
};

const Message = ({ message, isUser, emotion, quote, timestamp }) => {
  const emotionColor = emotionColors[emotion] || emotionColors.neutral;
  
  return (
    <div className={`message ${isUser ? 'user' : 'bot'}`}>
      <div className="message-content">
        <p>{message}</p>
        {quote && !isUser && (
          <div className="quote" style={{ borderLeftColor: emotionColor }}>
            <span>💭 "{quote}"</span>
          </div>
        )}
        {timestamp && (
          <div className="timestamp">
            {new Date(timestamp).toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
