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
  const [answerTimeLimit, setAnswerTimeLimit] = useState(180); // 답변 시간 제한 (초)

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const cameraInitializedRef = useRef(false);

  // 타이머 설정 - 각 질문의 timeLimit 합계 사용
  const time = new Date();
  const totalTimeLimit = state.selectedQuestions.reduce((total, question) => {
    return total + (question.timeLimit || 180); // 기본 3분
  }, 0);
  time.setSeconds(time.getSeconds() + totalTimeLimit);
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

    // 면접 모드 설정 (Context에서 가져오기)
    if (state.interviewMode) {
      setInterviewMode(state.interviewMode);
      
      // 모드별 답변 시간 제한 설정
      switch (state.interviewMode) {
        case 'video-voice':
          setAnswerTimeLimit(180); // 3분 - 실제 면접과 동일
          break;
        case 'voice-only':
          setAnswerTimeLimit(240); // 4분 - 음성 인식 오류 고려
          break;
        case 'camera-only':
          setAnswerTimeLimit(240); // 4분 - 카메라 + 텍스트
          break;
        case 'text-only':
          setAnswerTimeLimit(300); // 5분 - 타이핑 시간 고려
          break;
        default:
          setAnswerTimeLimit(180);
      }
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
        timeLimit: answerTimeLimit,
        questionNumber: 1,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }

    // 카메라/마이크 초기화 (한 번만 실행)
    if (!cameraInitializedRef.current && !mediaStreamRef.current) {
      if (state.interviewMode === 'video-voice' || state.interviewMode === 'text-only') {
        cameraInitializedRef.current = true;
        console.log('카메라 초기화 시작');
        // 약간의 지연 후 카메라 시작 (컴포넌트 완전 마운트 대기)
        setTimeout(async () => {
          await startCamera();
          console.log('초기 카메라 시작 완료');
        }, 500);
      }
    }

    // 음성 인식 초기화 (한 번만 실행)
    if (!recognitionRef.current && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
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

      recognitionRef.current.onend = () => {
        console.log('음성 인식 종료됨');
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };
    }

    return () => {
      // 컴포넌트 언마운트 시에만 정리
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [state.selectedQuestions, navigate, dispatch]); // currentQuestionIndex와 messages.length 제거

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // isVideoEnabled가 true로 변경될 때마다 비디오 재생 시도
  useEffect(() => {
    if (isVideoEnabled && videoRef.current && mediaStreamRef.current) {
      console.log('isVideoEnabled가 true로 변경됨, 비디오 재생 시도');
      
      const tryPlayOnStateChange = async () => {
        if (videoRef.current && videoRef.current.paused) {
          try {
            await videoRef.current.play();
            console.log('상태 변경 후 비디오 재생 성공');
          } catch (error) {
            console.warn('상태 변경 후 비디오 재생 실패:', error);
          }
        }
      };
      
      // 상태 변경 직후와 약간의 지연 후 시도
      tryPlayOnStateChange();
      setTimeout(tryPlayOnStateChange, 100);
      setTimeout(tryPlayOnStateChange, 300);
    }
  }, [isVideoEnabled]);

  // 텍스트를 직접 받아서 처리하는 함수
  const handleSubmitAnswerWithText = async (answerText) => {
    if (!answerText.trim() || !currentQuestion) {
      console.log('답변이 없거나 질문이 없음:', { answerText, currentQuestion });
      return;
    }
    
    console.log('답변 제출 시작 (텍스트 직접):', answerText.trim());

    // 사용자 답변 추가
    const userMessage = {
      id: messages.length + 1,
      text: answerText,
      isInterviewer: false,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 백엔드에 답변 제출 및 평가 받기
    try {
      const response = await fetch('http://localhost:5000/api/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.sessionId,
          question: currentQuestion.text,
          answer: answerText,
          time_taken: currentQuestion.timeLimit || 180,
          max_time: currentQuestion.timeLimit || 180
        })
      });
      
      const evaluationData = await response.json();
      const score = evaluationData.score || 0;
      const feedback = evaluationData.feedback || '평가 없음';
      
      // Context에 답변, 점수, 피드백 저장
      dispatch({
        type: 'SUBMIT_ANSWER',
        payload: {
          answer: answerText,
          score: score,
          feedback: feedback
        }
      });
      
    } catch (error) {
      console.error('답변 평가 실패:', error);
      // 에러 시 기본값으로 저장
      dispatch({
        type: 'SUBMIT_ANSWER',
        payload: {
          answer: answerText,
          score: 0,
          feedback: '평가 실패'
        }
      });
    }
    
    // 상태 초기화
    setCurrentAnswer('');
    setRecognitionText(''); // 음성 인식 텍스트도 초기화

    // 다음 질문으로 이동
    const currentIndex = state.currentQuestionIndex || 0;
    const nextIndex = currentIndex + 1;
    
    console.log(`현재 질문 인덱스: ${currentIndex}, 다음 질문 인덱스: ${nextIndex}, 총 질문 수: ${state.selectedQuestions.length}`);
    
    if (nextIndex < state.selectedQuestions.length) {
      dispatch({ type: 'SET_CURRENT_QUESTION_INDEX', payload: nextIndex });
      const nextQuestion = state.selectedQuestions[nextIndex];
      setCurrentQuestion(nextQuestion);
      
      // 구분선 메시지 추가
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: `--- 질문 ${nextIndex + 1} ---`,
          isInterviewer: false,
          isTransition: true,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }, 500);
      
      // 타이핑 효과로 다음 질문 추가
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: nextQuestion.text,
          isInterviewer: true,
          difficulty: nextQuestion.difficulty,
          timeLimit: nextQuestion.timeLimit,
          questionNumber: nextIndex + 1,
          timestamp: new Date().toLocaleTimeString()
        }]);
        setIsTyping(false);
      }, 1500);
    } else {
      // 면접 완료 메시지 추가
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: '🎉 면접이 완료되었습니다! 결과를 확인해보세요.',
          isInterviewer: true,
          isCompletion: true,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }, 1000);
      
      // 2초 후 결과 페이지로 이동
      setTimeout(() => {
        console.log('면접 완료 - 결과 페이지로 이동');
        navigate('/result');
      }, 3000);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !currentQuestion) {
      console.log('답변이 없거나 질문이 없음:', { currentAnswer, currentQuestion });
      return;
    }
    
    // 기존 currentAnswer 상태를 사용하는 경우
    await handleSubmitAnswerWithText(currentAnswer);
  };

  const handleSkip = () => {
    // 건너뛰기 시에도 답변 데이터 저장
    dispatch({
      type: 'SUBMIT_ANSWER',
      payload: {
        answer: '답변하지 않음',
        score: 0,
        feedback: '답변을 건너뛰었습니다.'
      }
    });
    
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
    if (recognitionRef.current && !isRecording) {
      try {
        // 기존 세션이 있다면 중지
        if (recognitionRef.current.recognition && recognitionRef.current.recognition.abort) {
          recognitionRef.current.abort();
        }
        
        // 잠시 대기 후 시작
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            
            recordingIntervalRef.current = setInterval(() => {
              setRecordingTime(prev => prev + 1);
            }, 1000);
            console.log('음성 인식 시작됨');
          } catch (error) {
            console.error('음성 인식 시작 실패 (재시도):', error);
            setIsRecording(false);
          }
        }, 100);
      } catch (error) {
        console.error('음성 인식 시작 실패:', error);
        setIsRecording(false);
      }
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
        
        // 음성 인식 결과를 currentAnswer에 설정하지 않고 recognitionText에만 유지
        // 사용자가 수정 후 직접 제출하도록 함
      } catch (error) {
        console.error('음성 인식 중지 실패:', error);
        setIsRecording(false);
      }
    }
  };

  // 카메라 시작 함수
  const startCamera = async () => {
    try {
      // 이미 스트림이 있고 활성 상태라면 비디오가 실제로 재생되고 있는지 확인
      if (mediaStreamRef.current && mediaStreamRef.current.active) {
        const videoTracks = mediaStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
          // 비디오 요소가 실제로 재생되고 있는지 확인
          const isVideoPlaying = videoRef.current && 
                                !videoRef.current.paused && 
                                videoRef.current.readyState >= 2;
          
          if (videoTracks[0].enabled && isVideoPlaying) {
            console.log('카메라 이미 활성화되고 재생 중, 재시작하지 않음');
            return;
          } else {
            console.log('스트림은 있지만 비디오가 재생되지 않음, 강제 재시작');
            // 기존 스트림으로 비디오 재시작 시도
            videoTracks[0].enabled = true;
            setIsVideoEnabled(true);
            
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStreamRef.current;
              
              // 여러 번 재생 시도
              const forcePlay = async (attempts = 0) => {
                if (attempts > 5) {
                  console.error('비디오 재생 시도 5번 실패, 포기');
                  return;
                }
                
                try {
                  await videoRef.current.play();
                  console.log(`기존 스트림 재생 성공 (시도 ${attempts + 1})`);
                } catch (error) {
                  console.warn(`재생 시도 ${attempts + 1} 실패:`, error);
                  setTimeout(() => forcePlay(attempts + 1), 200);
                }
              };
              
              setTimeout(() => forcePlay(), 100);
            }
            return;
          }
        }
      }
      
      if (mediaStreamRef.current) {
        stopCamera();
      }
      
      let constraints = {};
      
      // 모드별 미디어 제약 조건 설정
      if (state.interviewMode === 'video-voice') {
        // 화상면접: 카메라 + 마이크
        constraints = { 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: true
        };
      } else if (state.interviewMode === 'voice-only') {
        // 음성면접: 마이크만
        constraints = { 
          audio: true,
          video: false
        };
      } else if (state.interviewMode === 'text-only') {
        // 텍스트면접: 카메라만 (선택적)
        constraints = { 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        };
      } else {
        // 기본값: 비디오만
        constraints = { 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        };
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      mediaStreamRef.current = mediaStream;
      
      if (videoRef.current && constraints.video) {
        videoRef.current.srcObject = mediaStream;
        
        // 모든 비디오 트랙을 명시적으로 활성화
        const videoTracks = mediaStream.getVideoTracks();
        if (videoTracks.length > 0) {
          videoTracks[0].enabled = true;
          console.log('비디오 트랙 수동 활성화:', videoTracks[0].enabled);
          // 트랙이 활성화된 후에 상태 설정
          setIsVideoEnabled(true);
          console.log('비디오 상태 true로 설정됨');
        } else {
          setIsVideoEnabled(false);
        }
        
        // 비디오 이벤트 핸들러 설정 (더 적극적인 재생)
        videoRef.current.onloadedmetadata = () => {
          console.log('비디오 메타데이터 로드됨');
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('메타데이터 로드 후 비디오 재생 시작됨');
            }).catch(error => {
              console.error('메타데이터 로드 후 비디오 재생 실패:', error);
            });
          }
        };
        
        videoRef.current.oncanplay = () => {
          console.log('비디오 재생 가능');
          // canplay 이벤트에서도 재생 시도
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(console.error);
          }
        };
        
        videoRef.current.onplay = () => {
          console.log('비디오 재생 중');
        };
        
        videoRef.current.onloadeddata = () => {
          console.log('비디오 데이터 로드됨');
          // 데이터 로드 후에도 재생 시도
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(console.error);
          }
        };
        
        videoRef.current.onerror = (e) => {
          console.error('비디오 에러:', e);
          setIsVideoEnabled(false);
        };
        
        // 강제로 비디오 재생 시도 (더 강력한 로직)
        const tryPlay = async (attempts = 0) => {
          if (attempts > 10) {
            console.error('비디오 재생 시도 10번 실패, 포기');
            return;
          }
          
          if (videoRef.current) {
            try {
              // srcObject 재설정 (혹시 모를 연결 문제 해결)
              if (attempts > 3) {
                videoRef.current.srcObject = mediaStream;
              }
              
              await videoRef.current.play();
              console.log(`초기 비디오 재생 성공 (시도 ${attempts + 1})`);
            } catch (error) {
              console.warn(`초기 재생 시도 ${attempts + 1} 실패:`, error);
              setTimeout(() => tryPlay(attempts + 1), 150);
            }
          } else {
            setTimeout(() => tryPlay(attempts), 100);
          }
        };
        
        // 즉시 그리고 여러 시점에서 재생 시도
        tryPlay();                         // 즉시 시도
        setTimeout(() => tryPlay(), 100);  // 100ms 후 재시도
        setTimeout(() => tryPlay(), 300);  // 300ms 후 재시도
        setTimeout(() => tryPlay(), 600);  // 600ms 후 재시도
        setTimeout(() => tryPlay(), 1000); // 1초 후 재시도
        
        // 강제로 이벤트 기반이 아닌 직접 재생 시도
        const forceInitialPlay = async () => {
          for (let i = 0; i < 5; i++) {
            if (videoRef.current && videoRef.current.paused) {
              try {
                await videoRef.current.play();
                console.log(`강제 초기 재생 성공 (루프 ${i + 1})`);
                break;
              } catch (error) {
                console.warn(`강제 초기 재생 실패 (루프 ${i + 1}):`, error);
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            } else {
              break;
            }
          }
        };
        
        setTimeout(forceInitialPlay, 200);
      } else {
        setIsVideoEnabled(false);
      }
      
      if (constraints.audio) {
        setIsMicEnabled(true);
      }
      
      console.log('📹 미디어 스트림 시작됨 - 모드:', state.interviewMode);
      
      // 최종 상태 확인 및 강제 설정
      if (constraints.video && mediaStreamRef.current) {
        const videoTracks = mediaStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0 && videoTracks[0].enabled) {
          console.log('최종 비디오 상태 강제 설정: true');
          setIsVideoEnabled(true);
          
          // React 상태 업데이트 후 추가 재생 시도
          setTimeout(() => {
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play().then(() => {
                console.log('최종 강제 재생 성공');
              }).catch(error => {
                console.warn('최종 강제 재생 실패:', error);
              });
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('미디어 접근 실패:', error);
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
              <div className="fun-interviewer-avatar">
                <div className="avatar-face">🤖</div>
                <div className="avatar-speech-bubble">
                  <div className="speech-text">안녕하세요! 저는 AI 면접관입니다</div>
                  <div className="speech-tail"></div>
                </div>
              </div>
              <div className="fun-message">
                <div className="typing-animation">텍스트로 편안하게 대화해요!</div>
                <div className="floating-icons">
                  <span className="float-icon">💬</span>
                  <span className="float-icon">✍️</span>
                  <span className="float-icon">🚀</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="interview-chat-section">
        <div className="interview-chat-container">
          <div className="interview-messages-area">
            {messages.map((message) => (
              <div key={message.id} className={`interview-message-wrapper ${
                message.isTransition ? 'transition' : 
                message.isCompletion ? 'completion' :
                message.isInterviewer ? 'interviewer' : 'user'
              }`}>
                {!message.isTransition && (
                  <div className={`interview-avatar ${message.isInterviewer ? 'interviewer' : 'user'}`}>
                    {message.isInterviewer ? '👤' : '🙋'}
                  </div>
                )}
                <div className={`interview-message-bubble ${
                  message.isTransition ? 'transition' :
                  message.isCompletion ? 'completion' :
                  message.isInterviewer ? 'interviewer' : 'user'
                }`}>
                  {message.isInterviewer && message.questionNumber && (
                    <div className="question-header">
                      <span className="question-number">질문 {message.questionNumber}</span>
                      <span className="question-time">{message.timestamp}</span>
                    </div>
                  )}
                  {message.text}
                  {message.isInterviewer && message.difficulty && (
                    <div className="interview-message-info">
                      <span className="difficulty-badge">난이도: {message.difficulty}</span>
                      <span className="time-badge">제한시간: {Math.floor(message.timeLimit / 60)}분 {message.timeLimit % 60}초</span>
                    </div>
                  )}
                  {!message.isInterviewer && !message.isTransition && (
                    <div className="answer-timestamp">
                      {message.timestamp}
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
            <div className="text-mode-features">
              <div className="answer-helper">
                <div className="helper-text">💡 텍스트 모드 도움말</div>
                <div className="helper-tips">
                  • 충분한 시간({Math.floor(answerTimeLimit/60)}분)이 주어집니다
                  • 문법 검사와 자동완성을 활용하세요
                  • 논리적 구조로 답변을 작성해보세요
                </div>
              </div>
              
              <textarea 
                className="interview-textarea enhanced"
                placeholder="답변을 입력하세요... (논리적 구조: 결론 → 근거 → 예시 → 마무리)" 
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)} 
                disabled={isTyping || !currentQuestion}
                spellCheck="true"
              />
              
              <div className="answer-stats">
                <span>글자수: {currentAnswer.length}</span>
                <span>예상 읽기시간: {Math.ceil(currentAnswer.length / 200)}분</span>
              </div>
            </div>
            
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
          <div className="avatar-inner">🎙️</div>
          <div className="sound-waves">
            <span className="wave"></span>
            <span className="wave"></span>
            <span className="wave"></span>
          </div>
        </div>
        <div className="interview-question-display">
          <div className="question-title-bar">
            <span className="question-icon">📋</span>
            <span className="question-title">질문 {currentIndex + 1} / {state.selectedQuestions.length}</span>
            <span className="question-difficulty">{currentQuestion?.difficulty}</span>
          </div>
          <div className="interview-question-bubble-large">
            <div className="question-text-large">
              {currentQuestion?.text}
            </div>
            <div className="question-info-bar">
              <span className="time-info">⏰ 답변시간: {Math.floor(answerTimeLimit/60)}분</span>
              <span className="mode-info">🎤 음성모드</span>
            </div>
          </div>
        </div>
      </div>

      <div className="interview-answer-section">
        <div className="voice-mode-features">
          <div className="voice-helper">
            <div className="helper-text">🎤 음성 모드 안내</div>
            <div className="helper-tips">
              • 여유있는 시간({Math.floor(answerTimeLimit/60)}분)이 주어집니다
              • 천천히 명확하게 말씀해주세요
              • 답변 후 텍스트 수정이 가능합니다
            </div>
          </div>
          
          <div className="interview-voice-textarea">
            {recognitionText || '🎙️ 마이크 버튼을 눌러 음성으로 답변해주세요...'}
          </div>
          
          {recognitionText && (
            <div className="voice-edit-section">
              <textarea 
                className="voice-text-editor"
                placeholder="음성 인식 결과를 수정하세요..."
                value={recognitionText}
                onChange={(e) => setRecognitionText(e.target.value)}
              />
              <div className="voice-edit-buttons">
                <button 
                  className="interview-button primary"
                  onClick={() => {
                    handleSubmitAnswerWithText(recognitionText);
                  }}
                  disabled={!recognitionText.trim()}
                >
                  답변 제출
                </button>
                <button 
                  className="interview-button secondary"
                  onClick={() => setRecognitionText('')}
                >
                  다시 녹음
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className={`interview-recording-status ${isRecording ? 'recording' : ''}`}>
          <div className="status-icon">
            {isRecording ? '🔴' : '⏸️'}
          </div>
          <div className="status-text">
            {isRecording ? `녹음 중... ${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, '0')}` : '대기 중'}
          </div>
        </div>

        {!isTyping && (
          <div className="interview-button-group">
            <button 
              className={`interview-button voice ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
              disabled={isTyping || !currentQuestion}
            >
              {isRecording ? '🔴 답변 종료' : '🎤 답변 시작'}
            </button>
            <button className="interview-button" onClick={handleSkip} disabled={isTyping}>
              건너뛰기
            </button>
          </div>
        )}
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
          {mediaStreamRef.current && mediaStreamRef.current.getVideoTracks().length > 0 && isVideoEnabled ? (
            <div className="video-with-status">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="interview-video"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onLoadedData={() => console.log('비디오 데이터 로드됨')}
                onError={(e) => console.error('비디오 JSX 에러:', e)}
                onLoadedMetadata={() => {
                  console.log('JSX: 비디오 메타데이터 로드됨');
                  if (videoRef.current) {
                    console.log('비디오 크기:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                  }
                }}
              />
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-text">녹화 중</span>
              </div>
            </div>
          ) : (
            <div className="interview-video-placeholder">
              <div className="icon">📹</div>
              <div className="title">화상 면접</div>
              <div className="message">
                {state.interviewMode === 'video-voice' ? 
                  '카메라를 활성화해주세요' : 
                  '텍스트 면접 모드입니다'
                }
              </div>
            </div>
          )}
        </div>
        
        <div className="interview-video-controls">
          <button 
            className={`interview-control-button ${isVideoEnabled ? 'active' : ''}`}
            onClick={async () => {
              console.log('화상면접 카메라 버튼 클릭, 현재 상태:', isVideoEnabled);
              
              if (mediaStreamRef.current) {
                const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
                if (videoTrack) {
                  console.log('현재 비디오 트랙 상태:', videoTrack.enabled);
                  
                  // 항상 startCamera를 호출해서 확실히 작동하도록
                  await startCamera();
                } else {
                  console.log('비디오 트랙이 없음, 카메라 재시작');
                  await startCamera();
                }
              } else {
                console.log('미디어 스트림이 없음, 카메라 시작');
                await startCamera();
              }
            }}
          >
            {isVideoEnabled ? '📹' : '📷'}
          </button>
          {state.interviewMode === 'video-voice' && (
            <button
              className={`interview-control-button ${isMicEnabled ? 'active' : ''}`}
              onClick={() => {
                if (mediaStreamRef.current) {
                  const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
                  if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled;
                    setIsMicEnabled(audioTrack.enabled);
                    console.log('오디오 트랙 상태:', audioTrack.enabled);
                  }
                }
              }}
            >
              {isMicEnabled ? '🎤' : '🔇'}
            </button>
          )}
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
              // 화상면접 모드: 음성으로만 답변 + 실시간 피드백
              <div className="interview-voice-only-mode">
                <div className="video-mode-features">
                  <div className="video-helper">
                    <div className="helper-text">🎥 화상면접 모드</div>
                    <div className="helper-tips">
                      • 실제 면접과 동일한 환경({Math.floor(answerTimeLimit/60)}분)
                      • 자세와 표정도 평가에 포함됩니다
                      • 자연스럽게 카메라를 바라보며 답변하세요
                    </div>
                  </div>
                  
                  <div className="posture-indicator">
                    <span className="indicator-icon">📐</span>
                    <span className="indicator-text">자세 양호</span>
                  </div>
                  
                  <div className="interview-voice-instruction">
                    🎤 음성으로 답변해주세요 (실시간 인식 중)
                  </div>
                  
                  {recognitionText && (
                    <div className="live-transcription">
                      <div className="transcription-label">실시간 음성 인식:</div>
                      <div className="transcription-text">{recognitionText}</div>
                      <div className="voice-edit-section">
                        <textarea 
                          className="voice-text-editor"
                          placeholder="음성 인식 결과를 수정하세요..."
                          value={recognitionText}
                          onChange={(e) => setRecognitionText(e.target.value)}
                        />
                        <div className="voice-edit-buttons">
                          <button 
                            className="interview-button primary"
                            onClick={() => {
                              if (recognitionText.trim()) {
                                // 직접 텍스트를 전달하여 상태 업데이트 대기 없이 처리
                                handleSubmitAnswerWithText(recognitionText);
                              }
                            }}
                            disabled={!recognitionText.trim()}
                          >
                            답변 제출
                          </button>
                          <button 
                            className="interview-button secondary"
                            onClick={() => setRecognitionText('')}
                          >
                            다시 녹음
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {!recognitionText && (
                  <div className="interview-button-group">
                    <button
                      className={`interview-button voice ${isRecording ? 'active recording' : ''}`}
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
                )}
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

  // 새로운 텍스트 모드 레이아웃 (카메라 O + 마이크 X)
  const renderTextOnlyModeNew = () => (
    <div className="interview-container text-only-mode">
      <div className="interview-header">
        <div>질문 {currentIndex + 1} / {state.selectedQuestions.length}</div>
        <div className="interview-progress-bar">
          <div className="interview-progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className={`interview-timer ${timeWarning ? 'warning' : ''}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* 왼쪽: 사용자 웹캠 */}
      <div className="interview-video-section">
        <div className="user-camera-title">
          <h3>📹 내 모습</h3>
        </div>
        <div className="interview-video-container">
          {mediaStreamRef.current && mediaStreamRef.current.getVideoTracks().length > 0 && isVideoEnabled ? (
            <div className="video-with-status">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="interview-video"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onLoadedData={() => console.log('비디오 데이터 로드됨')}
                onError={(e) => console.error('비디오 JSX 에러:', e)}
                onLoadedMetadata={() => {
                  console.log('JSX: 비디오 메타데이터 로드됨');
                  if (videoRef.current) {
                    console.log('비디오 크기:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                  }
                }}
              />
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-text">녹화 중</span>
              </div>
            </div>
          ) : (
            <div className="interview-video-placeholder">
              <div className="fun-interviewer-avatar">
                <div className="avatar-face">📹</div>
                <div className="avatar-speech-bubble">
                  <div className="speech-text">카메라 활성화 중...</div>
                  <div className="speech-tail"></div>
                </div>
              </div>
              <div className="fun-message">
                <div className="typing-animation">잠시만 기다려주세요!</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="interview-video-controls">
          <button 
            className={`interview-control-button ${isVideoEnabled ? 'active' : ''}`}
            onClick={async () => {
              console.log('카메라 버튼 클릭, 현재 상태:', isVideoEnabled);
              
              if (mediaStreamRef.current) {
                const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
                if (videoTrack) {
                  console.log('현재 비디오 트랙 상태:', videoTrack.enabled);
                  
                  // 항상 startCamera를 호출해서 확실히 작동하도록
                  await startCamera();
                } else {
                  console.log('비디오 트랙이 없음, 카메라 재시작');
                  await startCamera();
                }
              } else {
                console.log('미디어 스트림이 없음, 카메라 시작');
                await startCamera();
              }
            }}
          >
            {isVideoEnabled ? '📹' : '📷'}
          </button>
        </div>
        
        {/* 카메라 사용 안내 */}
        <div className="camera-help-message">
          <span className="help-icon">💡</span>
          <span className="help-text">만약에 카메라 화면이 안보이면 📹버튼을 클릭하세요</span>
        </div>
      </div>

      {/* 오른쪽: 통합된 대화 영역 */}
      <div className="interview-chat-section unified">
        <div className="chat-header">
          <h3>💬 면접 진행 상황</h3>
        </div>
        
        <div className="interview-chat-container">
          <div className="interview-messages-area">
            {/* AI 면접관 인사말을 첫 번째 메시지로 표시 */}
            <div className="interview-message-wrapper interviewer welcome">
              <div className="interview-avatar interviewer">🤖</div>
              <div className="interview-message-bubble interviewer welcome">
                <div className="welcome-text">안녕하세요! 저는 AI 면접관입니다</div>
                <div className="welcome-subtitle">차근차근 질문드릴테니 편안하게 답변해주세요</div>
              </div>
            </div>
            
            {/* 현재 질문을 메시지 형태로 표시 */}
            {currentQuestion && (
              <div className="interview-message-wrapper interviewer current">
                <div className="interview-avatar interviewer">🤖</div>
                <div className="interview-message-bubble interviewer current">
                  <div className="question-header">
                    <span className="question-number">질문 {currentIndex + 1}/{state.selectedQuestions.length}</span>
                    <span className="question-time">진행 중</span>
                  </div>
                  <div className="current-question-text">{currentQuestion.text}</div>
                  <div className="interview-message-info">
                    <span className="difficulty-badge">난이도: {currentQuestion.difficulty}</span>
                    <span className="time-badge">제한시간: {Math.floor(answerTimeLimit/60)}분</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 기존 메시지들 */}
            {messages.map((message) => (
              <div key={message.id} className={`interview-message-wrapper ${
                message.isTransition ? 'transition' : 
                message.isCompletion ? 'completion' :
                message.isInterviewer ? 'interviewer' : 'user'
              }`}>
                {!message.isTransition && (
                  <div className={`interview-avatar ${message.isInterviewer ? 'interviewer' : 'user'}`}>
                    {message.isInterviewer ? '🤖' : '🙋'}
                  </div>
                )}
                <div className={`interview-message-bubble ${
                  message.isTransition ? 'transition' :
                  message.isCompletion ? 'completion' :
                  message.isInterviewer ? 'interviewer' : 'user'
                }`}>
                  {message.isInterviewer && message.questionNumber && (
                    <div className="question-header">
                      <span className="question-number">질문 {message.questionNumber}</span>
                      <span className="question-time">{message.timestamp}</span>
                    </div>
                  )}
                  {message.text}
                  {message.isInterviewer && message.difficulty && (
                    <div className="interview-message-info">
                      <span className="difficulty-badge">난이도: {message.difficulty}</span>
                      <span className="time-badge">제한시간: {Math.floor(message.timeLimit / 60)}분 {message.timeLimit % 60}초</span>
                    </div>
                  )}
                  {!message.isInterviewer && !message.isTransition && (
                    <div className="answer-timestamp">
                      {message.timestamp}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="interview-message-wrapper interviewer">
                <div className="interview-avatar interviewer">🤖</div>
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
            <div className="text-mode-features">
              <div className="answer-helper">
                <div className="helper-text">💡 텍스트 모드 도움말</div>
                <div className="helper-tips">
                  • 충분한 시간({Math.floor(answerTimeLimit/60)}분)이 주어집니다
                  • 문법 검사와 자동완성을 활용하세요
                  • 논리적 구조로 답변을 작성해보세요
                </div>
              </div>
              
              <textarea 
                className="interview-textarea enhanced"
                placeholder="답변을 입력하세요... (논리적 구조: 결론 → 근거 → 예시 → 마무리)" 
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)} 
                disabled={isTyping || !currentQuestion}
                spellCheck="true"
              />
              
              <div className="answer-stats">
                <span>글자수: {currentAnswer.length}</span>
                <span>예상 읽기시간: {Math.ceil(currentAnswer.length / 200)}분</span>
              </div>
            </div>
            
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

  // 순수 텍스트 모드 (카메라 X + 마이크 X) - 채팅창 스타일
  const renderPureTextMode = () => (
    <div className="chat-interview-container">
      <div className="interview-header">
        <div>질문 {currentIndex + 1} / {state.selectedQuestions.length}</div>
        <div className="interview-progress-bar">
          <div className="interview-progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className={`interview-timer ${timeWarning ? 'warning' : ''}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* 채팅 스타일 메인 영역 */}
      <div className="chat-main-area">
        <div className="chat-messages-container">
          {/* AI 면접관 인사말 */}
          <div className="chat-message ai-message">
            <div className="chat-avatar">🤖</div>
            <div className="chat-bubble ai-bubble">
              <div className="chat-name">AI 면접관</div>
              <div className="chat-text">안녕하세요! 텍스트 면접을 시작하겠습니다. 편안하게 답변해주세요.</div>
              <div className="chat-time">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          {/* 현재 질문 */}
          {currentQuestion && (
            <div className="chat-message ai-message">
              <div className="chat-avatar">🤖</div>
              <div className="chat-bubble ai-bubble current-question">
                <div className="chat-name">AI 면접관</div>
                <div className="question-badge">질문 {currentIndex + 1}</div>
                <div className="chat-text">{currentQuestion.text}</div>
                <div className="question-info">
                  <span className="difficulty-tag">난이도: {currentQuestion.difficulty}</span>
                  <span className="time-tag">제한시간: {Math.floor(answerTimeLimit/60)}분</span>
                </div>
                <div className="chat-time">진행 중</div>
              </div>
            </div>
          )}

          {/* 기존 메시지들 */}
          {messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.isInterviewer ? 'ai-message' : 'user-message'}`}>
              <div className="chat-avatar">{message.isInterviewer ? '🤖' : '👤'}</div>
              <div className={`chat-bubble ${message.isInterviewer ? 'ai-bubble' : 'user-bubble'}`}>
                <div className="chat-name">{message.isInterviewer ? 'AI 면접관' : '지원자'}</div>
                {message.isInterviewer && message.questionNumber && (
                  <div className="question-badge">질문 {message.questionNumber}</div>
                )}
                <div className="chat-text">{message.text}</div>
                {message.isInterviewer && message.difficulty && (
                  <div className="question-info">
                    <span className="difficulty-tag">난이도: {message.difficulty}</span>
                    <span className="time-tag">제한시간: {Math.floor(message.timeLimit / 60)}분</span>
                  </div>
                )}
                <div className="chat-time">{message.timestamp}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-message ai-message">
              <div className="chat-avatar">🤖</div>
              <div className="chat-bubble ai-bubble">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 채팅 입력 영역 */}
        <div className="chat-input-area">
          <div className="chat-input-header">
            <span className="input-label">💬 답변 작성</span>
            <div className="input-stats">
              <span>글자수: {currentAnswer.length}</span>
              <span>예상 읽기시간: {Math.ceil(currentAnswer.length / 200)}분</span>
            </div>
          </div>
          
          <div className="chat-input-container">
            <textarea 
              className="chat-textarea"
              placeholder="답변을 입력하세요... (논리적 구조: 결론 → 근거 → 예시 → 마무리)" 
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)} 
              disabled={isTyping || !currentQuestion}
              spellCheck="true"
              rows="4"
            />
            
            <div className="chat-button-group">
              <button className="chat-button skip-button" onClick={handleSkip} disabled={isTyping}>
                ⏭️ 건너뛰기
              </button>
              <button 
                className="chat-button send-button" 
                onClick={handleSubmitAnswer} 
                disabled={isTyping || !currentAnswer.trim()}
              >
                📤 답변 전송
              </button>
            </div>
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
  } else if (interviewMode === 'camera-only') {
    return <Layout>{renderTextOnlyModeNew()}</Layout>; // 카메라 O + 마이크 X
  } else {
    return <Layout>{renderPureTextMode()}</Layout>; // 카메라 X + 마이크 X
  }
}