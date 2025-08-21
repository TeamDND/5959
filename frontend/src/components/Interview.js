import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import { useTimer } from 'react-timer-hook';
import Layout from './Layout.js';
import '../style/Interview.css';

export default function Interview() {
  const navigate = useNavigate();
  const { state, dispatch } = useInterview();
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recognitionText, setRecognitionText] = useState('');
  const [interviewMode, setInterviewMode] = useState('text'); // 'text', 'video-voice', 'voice-only'

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // 타이머 설정
  const time = new Date();
  time.setSeconds(time.getSeconds() + (state.selectedQuestions.length * 300)); // 5분씩
  const { seconds, minutes, restart } = useTimer({ 
    expiryTimestamp: time,
    onExpire: () => {
      alert('면접 시간이 종료되었습니다.');
      navigate('/result');
    }
  });

  useEffect(() => {
    if (state.selectedQuestions.length === 0) {
      navigate('/');
      return;
    }

    // currentQuestionIndex 초기화 (0으로 설정)
    if (state.currentQuestionIndex === undefined || state.currentQuestionIndex === null) {
      dispatch({ type: 'SET_CURRENT_QUESTION_INDEX', payload: 0 });
    }

    // 첫 번째 질문 설정
    const currentIndex = state.currentQuestionIndex || 0;
    const currentQuestion = state.selectedQuestions[currentIndex];
    setCurrentQuestion(currentQuestion);
    
    // 첫 번째 메시지 추가 (이미 있는 경우 추가하지 않음)
    if (messages.length === 0) {
      setMessages([{
        id: 1,
        text: currentQuestion.text,
        isInterviewer: true,
        difficulty: currentQuestion.difficulty,
        timeLimit: currentQuestion.timeLimit
      }]);
    }

    // 카메라/마이크 초기화
    startCamera();

    // 음성 인식 초기화
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ko-KR';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setRecognitionText(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [state.selectedQuestions, state.currentQuestionIndex, navigate, dispatch, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !currentQuestion) return;

    // 사용자 답변 추가
    const userMessage = {
      id: messages.length + 1,
      text: currentAnswer,
      isInterviewer: false
    };
    setMessages(prev => [...prev, userMessage]);
    setCurrentAnswer('');

    // 다음 질문으로 이동
    const currentIndex = state.currentQuestionIndex || 0;
    const nextIndex = currentIndex + 1;
    
    console.log(`현재 질문 인덱스: ${currentIndex}, 다음 질문 인덱스: ${nextIndex}, 총 질문 수: ${state.selectedQuestions.length}`);
    
    if (nextIndex < state.selectedQuestions.length) {
      dispatch({ type: 'SET_CURRENT_QUESTION_INDEX', payload: nextIndex });
      const nextQuestion = state.selectedQuestions[nextIndex];
      setCurrentQuestion(nextQuestion);
      
      // 타이핑 효과
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: nextQuestion.text,
          isInterviewer: true,
          difficulty: nextQuestion.difficulty,
          timeLimit: nextQuestion.timeLimit
        }]);
        setIsTyping(false);
      }, 1000);
    } else {
      // 면접 완료
      console.log('면접 완료 - 결과 페이지로 이동');
      navigate('/result');
    }
  };

  const handleSkip = () => {
    const currentIndex = state.currentQuestionIndex || 0;
    const nextIndex = currentIndex + 1;
    
    console.log(`건너뛰기 - 현재 질문 인덱스: ${currentIndex}, 다음 질문 인덱스: ${nextIndex}, 총 질문 수: ${state.selectedQuestions.length}`);
    
    if (nextIndex < state.selectedQuestions.length) {
      dispatch({ type: 'SET_CURRENT_QUESTION_INDEX', payload: nextIndex });
      const nextQuestion = state.selectedQuestions[nextIndex];
      setCurrentQuestion(nextQuestion);
      
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: nextQuestion.text,
          isInterviewer: true,
          difficulty: nextQuestion.difficulty,
          timeLimit: nextQuestion.timeLimit
        }]);
        setIsTyping(false);
      }, 1000);
    } else {
      console.log('면접 완료 (건너뛰기) - 결과 페이지로 이동');
      navigate('/result');
    }
  };

  const startVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      // 인식된 텍스트를 답변으로 설정
      if (recognitionText.trim()) {
        setCurrentAnswer(recognitionText);
        setRecognitionText('');
      }
    }
  };

  // 카메라 시작 함수
  const startCamera = async () => {
    try {
      if (mediaStreamRef.current) {
        stopCamera();
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: true
      });
      
      mediaStreamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setIsVideoEnabled(true);
      setIsMicEnabled(true);
      
      console.log('📹 카메라 및 마이크 스트림 시작됨');
    } catch (error) {
      console.error('카메라/마이크 접근 실패:', error);
      setIsVideoEnabled(false);
      setIsMicEnabled(false);
    }
  };

  // 카메라 중지 함수
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsVideoEnabled(false);
    setIsMicEnabled(false);
    
    console.log('📹 카메라 및 마이크 스트림 중지됨');
  };

  const currentIndex = state.currentQuestionIndex || 0;
  const progress = ((currentIndex + 1) / state.selectedQuestions.length) * 100;
  const timeWarning = minutes === 0 && seconds <= 30;

  // 모드 1: 텍스트만 (마이크 없음)
  const renderTextOnlyMode = () => (
    <div className="interview-container">
      <div className="interview-header">
        <div>질문 {currentIndex + 1} / {state.selectedQuestions.length}</div>
        <div className="interview-progress-bar">
          <div className="interview-progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className={`interview-timer ${timeWarning ? 'warning' : ''}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      <div className="interview-video-section">
        <div className="interview-video-container">
          {isVideoEnabled ? (
            <video ref={videoRef} autoPlay muted playsInline className="interview-video" />
          ) : (
            <div className="interview-video-placeholder">
              <div className="icon">👤</div>
              <div className="title">면접관</div>
              <div className="message">화상 면접 모드가 아닙니다.</div>
            </div>
          )}
        </div>
      </div>

      <div className="interview-chat-section">
        <div className="interview-chat-container">
          <div className="interview-messages-area">
            {messages.map((message) => (
              <div key={message.id} className={`interview-message-wrapper ${message.isInterviewer ? 'interviewer' : 'user'}`}>
                <div className={`interview-avatar ${message.isInterviewer ? 'interviewer' : 'user'}`}>
                  {message.isInterviewer ? '👤' : '🙋'}
                </div>
                <div className={`interview-message-bubble ${message.isInterviewer ? 'interviewer' : 'user'}`}>
                  {message.text}
                  {message.isInterviewer && (
                    <div className="interview-message-info">
                      난이도: {message.difficulty} | 제한시간: {Math.floor(message.timeLimit / 60)}분 {message.timeLimit % 60}초
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="interview-message-wrapper interviewer">
                <div className="interview-avatar interviewer">👤</div>
                <div className="interview-typing-indicator">
                  면접관이 입력중
                  <div className="interview-typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="interview-answer-area">
            <textarea 
              className="interview-textarea"
              placeholder="답변을 입력하세요..." 
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)} 
              disabled={isTyping || !currentQuestion} 
            />
            
            <div className="interview-button-group">
              <button className="interview-button" onClick={handleSkip} disabled={isTyping}>
                건너뛰기
              </button>
              <button className="interview-button primary" onClick={handleSubmitAnswer} disabled={isTyping || !currentAnswer.trim()}>
                답변 제출
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 모드 3: 음성 전용 (게임 스타일)
  const renderVoiceOnlyMode = () => (
    <div className="voice-only-container">
      <div className="interview-header">
        <div>질문 {currentIndex + 1} / {state.selectedQuestions.length}</div>
        <div className="interview-progress-bar">
          <div className="interview-progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className={`interview-timer ${timeWarning ? 'warning' : ''}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      <div className="interview-virtual-interviewer">
        <div className="interview-interviewer-avatar">
          👤
        </div>
        <div className="interview-question-bubble">
          {currentQuestion?.text}
        </div>
      </div>

      <div className="interview-answer-section">
        <div className="interview-voice-textarea">
          {recognitionText || '음성으로 답변해주세요...'}
        </div>
        
        <div className={`interview-recording-status ${isRecording ? 'recording' : ''}`}>
          {isRecording ? `녹음 중... ${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, '0')}` : '대기 중'}
        </div>

        <div className="interview-button-group">
          <button 
            className="interview-button voice"
            onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
            disabled={isTyping || !currentQuestion}
          >
            {isRecording ? '🔴 답변 종료' : '🎤 답변 시작'}
          </button>
          <button className="interview-button" onClick={handleSkip} disabled={isTyping}>
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );

  // 모드 2: 화상면접 (비디오 + 음성)
  const renderVideoVoiceMode = () => (
    <div className="interview-container">
      <div className="interview-header">
        <div>질문 {currentIndex + 1} / {state.selectedQuestions.length}</div>
        <div className="interview-progress-bar">
          <div className="interview-progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className={`interview-timer ${timeWarning ? 'warning' : ''}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      <div className="interview-video-section">
        <div className="interview-video-container">
          {isVideoEnabled ? (
            <video ref={videoRef} autoPlay muted playsInline className="interview-video" />
          ) : (
            <div className="interview-video-placeholder">
              <div className="icon">📹</div>
              <div className="title">화상 면접</div>
              <div className="message">카메라를 활성화해주세요</div>
            </div>
          )}
        </div>
        
        <div className="interview-video-controls">
          <button 
            className={`interview-control-button ${isVideoEnabled ? 'active' : ''}`}
            onClick={() => {
              if (mediaStreamRef.current) {
                const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
                if (videoTrack) {
                  videoTrack.enabled = !videoTrack.enabled;
                  setIsVideoEnabled(videoTrack.enabled);
                }
              }
            }}
          >
            {isVideoEnabled ? '📹' : '📷'}
          </button>
          <button
            className={`interview-control-button ${isMicEnabled ? 'active' : ''}`}
            onClick={() => {
              if (mediaStreamRef.current) {
                const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
                if (audioTrack) {
                  audioTrack.enabled = !audioTrack.enabled;
                  setIsMicEnabled(audioTrack.enabled);
                }
              }
            }}
          >
            {isMicEnabled ? '🎤' : '🔇'}
          </button>
        </div>
      </div>

      <div className="interview-chat-section">
        <div className="interview-chat-container">
          <div className="interview-messages-area">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`interview-message-wrapper ${message.isInterviewer ? 'interviewer' : 'user'}`}
              >
                <div className={`interview-avatar ${message.isInterviewer ? 'interviewer' : 'user'}`}>
                  {message.isInterviewer ? '👤' : '🙋'}
                </div>
                <div className={`interview-message-bubble ${message.isInterviewer ? 'interviewer' : 'user'}`}>
                  {message.text}
                  {message.isInterviewer && (
                    <div className="interview-message-info">
                      난이도: {message.difficulty} | 제한시간: {Math.floor(message.timeLimit / 60)}분 {message.timeLimit % 60}초
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="interview-message-wrapper interviewer">
                <div className="interview-avatar interviewer">👤</div>
                <div className="interview-typing-indicator">
                  면접관이 입력중
                  <div className="interview-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="interview-answer-area">
            {interviewMode === 'video-voice' ? (
              // 화상면접 모드: 음성으로만 답변
              <div className="interview-voice-only-mode">
                <div className="interview-voice-instruction">
                  음성으로 답변해주세요
                </div>
                <div className="interview-button-group">
                  <button
                    className={`interview-button voice ${isRecording ? 'active' : ''}`}
                    onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
                    disabled={isTyping || !currentQuestion}
                  >
                    {isRecording ? '🔴 답변 종료' : '🎤 답변 시작'}
                  </button>
                  <button
                    className="interview-button"
                    onClick={handleSkip}
                    disabled={isTyping}
                  >
                    건너뛰기
                  </button>
                </div>
              </div>
            ) : (
              // 기본 텍스트 + 음성 모드
              <>
                <textarea 
                  className="interview-textarea"
                  placeholder="답변을 입력하세요..." 
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)} 
                  disabled={isTyping || !currentQuestion} 
                />
                
                <div className="interview-button-group">
                  <button className="interview-button" onClick={handleSkip} disabled={isTyping}>
                    건너뛰기
                  </button>
                  <button className="interview-button primary" onClick={handleSubmitAnswer} disabled={isTyping || !currentAnswer.trim()}>
                    답변 제출
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 모드에 따라 렌더링
  if (interviewMode === 'voice-only') {
    return <Layout>{renderVoiceOnlyMode()}</Layout>;
  } else if (interviewMode === 'video-voice') {
    return <Layout>{renderVideoVoiceMode()}</Layout>;
  } else {
    return <Layout>{renderTextOnlyMode()}</Layout>;
  }
}