import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Loader } from 'lucide-react';
import Message from './Message';
import EmotionIndicator from './EmotionIndicator';
import chatAPI from './api';
import Layout from './Layout.js';
import '../style/MentalCareChat.css';

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
