import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import Layout from './Layout.js';
import '../style/DeviceTest.css';



function DeviceTest() {
  const navigate = useNavigate();
  const { state, dispatch } = useInterview();
  
  const [cameraStatus, setCameraStatus] = useState('testing'); // testing, success, error
  const [micStatus, setMicStatus] = useState('testing'); // testing, success, error, recording, recorded
  const [interviewMode, setInterviewMode] = useState('');
  const [isTestingComplete, setIsTestingComplete] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);

  // 카메라 테스트
  const testCamera = async () => {
    try {
      setCameraStatus('testing');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraStatus('success');
      
      // 3초 후 자동으로 카메라 중지
      setTimeout(() => {
        if (stream) {
          stream.getVideoTracks().forEach(track => track.stop());
        }
      }, 3000);
      
    } catch (error) {
      console.error('카메라 테스트 실패:', error);
      setCameraStatus('error');
    }
  };

  // 마이크 테스트 - 연결 확인만
  const testMicrophoneConnection = async () => {
    try {
      setMicStatus('testing');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 연결 성공하면 바로 녹음 단계로
      stream.getTracks().forEach(track => track.stop());
      setMicStatus('recording');
      
    } catch (error) {
      console.error('마이크 연결 실패:', error);
      setMicStatus('error');
    }
  };

  // 음성 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        setMicStatus('recorded');
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // 5초 후 자동 중지
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 5000);
      
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      setMicStatus('error');
    }
  };

  // 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 녹음된 음성 재생
  const playRecording = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play().catch(error => {
        console.error('재생 실패:', error);
        setIsPlaying(false);
      });
    }
  };

  // 마이크 테스트 완료
  const completeMicTest = (result) => {
    setMicStatus(result);
    setAudioBlob(null);
    setIsRecording(false);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // 자동 테스트 실행
  useEffect(() => {
    let isMounted = true;
    
    const runTests = async () => {
      if (isMounted) {
        await testCamera();
      }
      
      setTimeout(async () => {
        if (isMounted) {
          await testMicrophoneConnection();
        }
      }, 1000);
    };
    
    runTests();
    
    return () => {
      isMounted = false;
      // 컴포넌트 언마운트 시 모든 리소스 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // 테스트 완료 후 모드 결정
  useEffect(() => {
    if (cameraStatus !== 'testing' && 
        micStatus !== 'testing' && 
        micStatus !== 'recording' && 
        micStatus !== 'recorded') {
      let mode = '';
      
      if (cameraStatus === 'success' && micStatus === 'success') {
        mode = 'video-voice';  // 카메라 O + 마이크 O
      } else if (cameraStatus === 'success' && micStatus === 'error') {
        mode = 'camera-only';  // 카메라 O + 마이크 X
      } else if (cameraStatus === 'error' && micStatus === 'success') {
        mode = 'voice-only';   // 카메라 X + 마이크 O
      } else {
        mode = 'text-only';    // 카메라 X + 마이크 X
      }
      
      setInterviewMode(mode);
      setIsTestingComplete(true);
      
      // Context에 모드 저장
      dispatch({
        type: 'SET_INTERVIEW_MODE',
        payload: { mode }
      });
    }
  }, [cameraStatus, micStatus, dispatch]);

  const getModeDescription = () => {
    switch (interviewMode) {
      case 'text-only':
        return {
          title: '📝 텍스트 면접 모드',
          description: '키보드로 답변을 입력하여 면접을 진행합니다.',
          features: [
            '⏰ 충분한 답변 시간 (5분)',
            '✍️ 문법 검사 및 자동완성 지원',
            '📊 실시간 글자수 및 읽기시간 표시',
            '🧠 논리적 구조 가이드 제공'
          ],
          timeLimit: '5분',
          focus: '논리적 사고력과 문서 작성 능력'
        };
      case 'camera-only':
        return {
          title: '📹 카메라 텍스트 면접 모드',
          description: '카메라로 본인을 녹화하면서 텍스트로 답변을 작성하는 하이브리드 면접 환경입니다.',
          features: [
            '⏰ 충분한 답변 시간 (4분)',
            '📹 표정 및 자세 녹화',
            '✍️ 텍스트 답변 작성',
            '🎯 비언어적 소통 + 논리적 사고 병행 평가'
          ],
          timeLimit: '4분',
          focus: '비언어적 표현력과 논리적 문서 작성 능력'
        };
      case 'video-voice':
        return {
          title: '🎥 화상 면접 모드', 
          description: '카메라 화면을 보며 음성으로 답변하는 실제 면접과 가장 유사한 환경입니다.',
          features: [
            '⏰ 실제 면접 환경 (3분)',
            '📹 자세 및 표정 분석',
            '🎤 실시간 음성 인식',
            '👁️ 아이컨택 및 비언어적 소통 평가'
          ],
          timeLimit: '3분',
          focus: '전체적인 면접 역량 (언어적 + 비언어적)'
        };
      case 'voice-only':
        return {
          title: '🎤 음성 면접 모드',
          description: '가상 면접관과 음성으로 대화하며, 답변을 텍스트로 확인하고 수정할 수 있습니다.',
          features: [
            '⏰ 여유있는 답변 시간 (4분)',
            '🎙️ 음성 인식 후 텍스트 수정 가능',
            '🗣️ 발음 및 말하기 속도 분석',
            '🎵 억양 및 음성 톤 평가'
          ],
          timeLimit: '4분',
          focus: '음성 소통 능력과 발표 스킬'
        };
      default:
        return { title: '', description: '', features: [], timeLimit: '', focus: '' };
    }
  };

  const startInterview = () => {
    navigate('/mock-interview');
  };

  return (
    <Layout>
      <div className="container">
        <div className="card">
          <div className="device-test-card">
            <h1 className="device-test-title">🔧 장비 테스트</h1>
            <p className="device-test-description">
              최적의 면접 환경을 위해 카메라와 마이크를 테스트하고 있습니다.
            </p>

            <div className="device-test-container">
              <div className="device-test-section">
                <h3 className="device-test-section-title">카메라 테스트</h3>
                <video className="device-test-video-preview" ref={videoRef} autoPlay muted />
                <div className="device-test-status-icon">
                  {cameraStatus === 'testing' && '⏳'}
                  {cameraStatus === 'success' && '✅'}
                  {cameraStatus === 'error' && '❌'}
                </div>
                <div className={`device-test-status-text ${cameraStatus === 'success' ? 'success' : cameraStatus === 'error' ? 'error' : 'default'}`}>
                  {cameraStatus === 'testing' && '카메라를 테스트하고 있습니다...'}
                  {cameraStatus === 'success' && '카메라가 정상적으로 작동합니다'}
                  {cameraStatus === 'error' && '카메라를 사용할 수 없습니다'}
                </div>
                {cameraStatus === 'error' && (
                  <div className="device-test-button-container">
                    <button
                      className="device-test-button"
                      onClick={testCamera}
                    >
                      다시 테스트
                    </button>
                  </div>
                )}
              </div>

              <div className="device-test-section">
                <h3 className="device-test-section-title">마이크 테스트</h3>
                <div className="device-test-status-icon">
                  {micStatus === 'testing' && '⏳'}
                  {micStatus === 'recording' && '🎤'}
                  {micStatus === 'recorded' && '🔊'}
                  {micStatus === 'success' && '✅'}
                  {micStatus === 'error' && '❌'}
                </div>
                <div className={`device-test-status-text ${micStatus === 'success' ? 'success' : micStatus === 'error' ? 'error' : 'default'}`}>
                  {micStatus === 'testing' && '마이크 연결을 확인하고 있습니다...'}
                  {micStatus === 'recording' && '음성을 녹음할 준비가 되었습니다'}
                  {micStatus === 'recorded' && '녹음이 완료되었습니다. 음성을 확인해보세요'}
                  {micStatus === 'success' && '마이크가 정상적으로 작동합니다'}
                  {micStatus === 'error' && '마이크를 사용할 수 없습니다'}
                </div>
                
                {micStatus === 'recording' && (
                  <div className="device-test-recording-info">
                    <div style={{ marginBottom: '1rem', fontSize: '1rem', color: '#666' }}>
                      "안녕하세요" 라고 말해보세요 (최대 5초)
                    </div>
                    <button
                      className={`device-test-button ${isRecording ? 'device-test-recording-button' : ''}`}
                      onClick={isRecording ? stopRecording : startRecording}
                      style={{ minWidth: '160px' }}
                    >
                      {isRecording ? '🔴 녹음 중지' : '🎤 녹음 시작'}
                    </button>
                  </div>
                )}
                
                {micStatus === 'recorded' && audioBlob && (
                  <div>
                    <div className="device-test-button-container">
                      <button
                        className="device-test-button"
                        onClick={playRecording}
                        disabled={isPlaying}
                      >
                        {isPlaying ? '🔊 재생중' : '🔊 재생'}
                      </button>
                      <button
                        className="device-test-button"
                        onClick={startRecording}
                      >
                        🎤 다시 녹음
                      </button>
                    </div>
                    <div className="device-test-button-container">
                      <button
                        className="device-test-button device-test-success-button"
                        onClick={() => completeMicTest('success')}
                        style={{ minWidth: '160px' }}
                      >
                        ✅ 잘 들림
                      </button>
                      <button
                        className="device-test-button device-test-error-button"
                        onClick={() => completeMicTest('error')}
                        style={{ minWidth: '160px' }}
                      >
                        ❌ 안 들림
                      </button>
                    </div>
                  </div>
                )}
                
                {micStatus === 'error' && (
                  <div className="device-test-button-container">
                    <button
                      className="device-test-button"
                      onClick={testMicrophoneConnection}
                    >
                      다시 테스트
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isTestingComplete && (
              <div className="device-test-mode-info">
                <div className="mode-header">
                  <h3>{getModeDescription().title}</h3>
                  <div className="mode-badges">
                    <span className="time-badge">⏰ {getModeDescription().timeLimit}</span>
                    <span className="focus-badge">🎯 {getModeDescription().focus}</span>
                  </div>
                </div>
                
                <p className="mode-description">{getModeDescription().description}</p>
                
                <div className="mode-features">
                  <h4>이 모드의 특징:</h4>
                  <ul className="features-list">
                    {getModeDescription().features.map((feature, index) => (
                      <li key={index} className="feature-item">{feature}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="mode-recommendation">
                  <div className="recommendation-icon">💡</div>
                  <div className="recommendation-text">
                    <strong>추천:</strong> 이 모드는 <em>{getModeDescription().focus}</em>을 중점적으로 평가합니다.
                  </div>
                </div>
                
                <button
                  className="device-test-start-button enhanced"
                  onClick={startInterview}
                >
                  <span className="button-icon">🚀</span>
                  면접 시작하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default DeviceTest;