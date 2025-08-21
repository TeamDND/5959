import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Loader } from 'lucide-react';
import Message from './Message';
import EmotionIndicator from './EmotionIndicator';
import chatAPI from './api';
import Layout from './Layout.js';

const MentalCareChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const messagesEndRef = useRef(null);

  // 스크롤을 맨 아래로
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // 사용자 메시지 추가
    setMessages(prev => [...prev, {
      id: Date.now(),
      message: userMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    }]);

    try {
      // API 호출
      const response = await chatAPI.sendMessage(userMessage);
      
      // 봇 응답 추가
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        message: response.message,
        isUser: false,
        emotion: response.emotion,
        quote: response.quote,
        timestamp: response.timestamp
      }]);
      
      // 현재 감정 상태 업데이트
      setCurrentEmotion(response.emotion);
      
    } catch (error) {
      console.error('Message send error:', error);
      
      // 에러 시 기본 응답
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        message: '죄송해요, 지금 응답하기 어려워요. 잠시 후 다시 시도해주세요.',
        isUser: false,
        emotion: 'neutral',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키 핸들러
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 대화 초기화
  const handleClearChat = async () => {
    try {
      await chatAPI.clearHistory();
      setMessages([]);
      setCurrentEmotion('neutral');
    } catch (error) {
      console.error('Clear chat error:', error);
    }
  };

  return (
    <Layout>
      <div className="container">
        <div className="card">
          <div className="chat-app">
            <style>{`
              .chat-app {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              
              .chat-header {
                background: #005793;
                color: white;
                padding: 1rem 1.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 2px 10px rgba(0,87,147,0.1);
                border-bottom: 2px solid #F76800;
              }
              
              .chat-header h1 {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.25rem;
                font-weight: 500;
                margin: 0;
              }
              
              .clear-button {
                background: #F76800;
                border: 1px solid #e55a00;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                cursor: pointer;
                font-size: 0.875rem;
                transition: all 0.3s ease;
              }
              
              .clear-button:hover {
                background: #e55a00;
              }
              
              .chat-container {
                height: 500px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
              }
              
              .messages-container {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                background: #E6F0F5;
              }
              
              .message {
                display: flex;
                max-width: 80%;
              }
              
              .message.user {
                margin-left: auto;
              }
              
              .message.bot {
                margin-right: auto;
              }
              
              .message-content {
                background: white;
                padding: 0.75rem 1rem;
                border-radius: 18px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                position: relative;
              }
              
              .message.user .message-content {
                background: #005793;
                color: white;
              }
              
              .message.bot .message-content {
                background: white;
                border: 1px solid #E6F0F5;
              }
              
              .quote {
                margin-top: 0.5rem;
                padding: 0.5rem;
                background: #f8f9fa;
                border-left: 3px solid #005793;
                border-radius: 4px;
                font-style: italic;
                font-size: 0.875rem;
                color: #666;
              }
              
              .timestamp {
                margin-top: 0.25rem;
                font-size: 0.75rem;
                color: #999;
                text-align: right;
              }
              
              .message.user .timestamp {
                color: rgba(255,255,255,0.7);
              }
              
              .input-container {
                padding: 1rem 1.5rem;
                background: white;
                border-top: 1px solid #E6F0F5;
                display: flex;
                gap: 1rem;
                align-items: flex-end;
              }
              
              .input-wrapper {
                flex: 1;
                position: relative;
              }
              
              .input-field {
                width: 100%;
                border: 2px solid #E6F0F5;
                border-radius: 25px;
                padding: 0.75rem 1rem;
                font-size: 1rem;
                font-family: 'Noto Sans KR', sans-serif;
                resize: none;
                min-height: 50px;
                max-height: 120px;
                outline: none;
                transition: all 0.3s ease;
              }
              
              .input-field:focus {
                border-color: #005793;
                box-shadow: 0 0 0 3px rgba(0,87,147,0.1);
              }
              
              .send-button {
                background: #F76800;
                color: white;
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(247,104,0,0.3);
              }
              
              .send-button:hover:not(:disabled) {
                background: #e55a00;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(247,104,0,0.4);
              }
              
              .send-button:disabled {
                background: #ccc;
                cursor: not-allowed;
                box-shadow: none;
              }
              
              .emotion-indicator {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: #005793;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                animation: fadeIn 0.3s ease-in;
                z-index: 10;
              }
              
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              
              .welcome-message {
                text-align: center;
                padding: 3rem 2rem;
                color: #666;
              }
              
              .welcome-message h2 {
                color: #005793;
                margin-bottom: 1rem;
                font-weight: 500;
              }
              
              .welcome-message p {
                line-height: 1.6;
                margin-bottom: 0.5rem;
              }
              
              .spinning {
                animation: spin 1s linear infinite;
              }
              
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              
              @media (max-width: 768px) {
                .chat-app {
                  max-width: 100%;
                }
                
                .chat-header {
                  padding: 1rem;
                }
                
                .chat-header h1 {
                  font-size: 1.125rem;
                }
                
                .message {
                  max-width: 90%;
                }
                
                .input-container {
                  padding: 1rem;
                }
                
                .emotion-indicator {
                  right: 1rem;
                  top: 1rem;
                }
              }
            `}</style>
            
            {/* 헤더 */}
            <div className="chat-header">
              <h1>
                <MessageCircle size={24} />
                멘탈케어 상담봇
              </h1>
              {messages.length > 0 && (
                <button className="clear-button" onClick={handleClearChat}>
                  새로운 대화
                </button>
              )}
            </div>

            {/* 현재 감정 표시 */}
            <EmotionIndicator emotion={currentEmotion} />

            {/* 채팅 컨테이너 */}
            <div className="chat-container">
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="welcome-message">
                    <h2>안녕하세요! 👋</h2>
                    <p>마음이 힘드시거나 이야기하고 싶은 일이 있으시면</p>
                    <p>편하게 말씀해 주세요.</p>
                    <p>함께 이야기 나누며 마음을 돌봐드릴게요.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <Message
                      key={msg.id}
                      message={msg.message}
                      isUser={msg.isUser}
                      emotion={msg.emotion}
                      quote={msg.quote}
                      timestamp={msg.timestamp}
                    />
                  ))
                )}
                {isLoading && (
                  <div className="message bot">
                    <div className="message-content">
                      <Loader size={20} className="spinning" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 입력 영역 */}
              <div className="input-container">
                <div className="input-wrapper">
                  <textarea
                    className="input-field"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="마음에 있는 이야기를 편하게 들려주세요..."
                    disabled={isLoading}
                  />
                </div>
                <button
                  className="send-button"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                >
                  {isLoading ? <Loader size={20} className="spinning" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MentalCareChat;
