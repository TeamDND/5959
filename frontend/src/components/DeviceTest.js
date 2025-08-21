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
      
      if (micStatus === 'error') {
        mode = 'text-only';
      } else if (cameraStatus === 'success' && micStatus === 'success') {
        mode = 'video-voice';
      } else if (cameraStatus === 'error' && micStatus === 'success') {
        mode = 'voice-only';
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
          description: '키보드로 답변을 입력하여 면접을 진행합니다.'
        };
      case 'video-voice':
        return {
          title: '🎥 화상 면접 모드', 
          description: '카메라 화면을 보며 음성으로 답변하는 실제 면접과 가장 유사한 환경입니다.'
        };
      case 'voice-only':
        return {
          title: '🎤 음성 면접 모드',
          description: '가상 면접관과 음성으로 대화하며, 답변을 텍스트로 확인하고 수정할 수 있습니다.'
        };
      default:
        return { title: '', description: '' };
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
                <h3>{getModeDescription().title}</h3>
                <p>{getModeDescription().description}</p>
                
                <button
                  className="device-test-start-button"
                  onClick={startInterview}
                >
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