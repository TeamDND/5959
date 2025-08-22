import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import '../style/App.css';
import '../style/Self.css';
import Layout from './Layout.js';

function Self() {
  const [resumeFile, setResumeFile] = useState(null);
  const [questionImage, setQuestionImage] = useState(null);
  const [questionFile, setQuestionFile] = useState(null);
  const [questionUrl, setQuestionUrl] = useState('');
  const [answers, setAnswers] = useState({});
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressStep, setProgressStep] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const { getRootProps: getResumeRootProps, getInputProps: getResumeInputProps } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/x-hwp': ['.hwp']
    },
    multiple: false,
    onDrop: (files) => {
      setResumeFile(files[0]);
    }
  });

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    },
    multiple: false,
    onDrop: (files) => {
      setQuestionImage(files[0]);
    }
  });

  const { getRootProps: getQuestionFileRootProps, getInputProps: getQuestionFileInputProps } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/x-hwp': ['.hwp']
    },
    multiple: false,
    onDrop: (files) => {
      setQuestionFile(files[0]);
    }
  });

  const progressSteps = [
    '질문 파싱중',
    '질문 인식 완료', 
    '답변 생성중',
    '답변 완료'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnswers({});
    setTotalQuestions(0);
    setProgressStep(0);
    setProgressMessage('질문 파싱중...');

    // 진척도 시뮬레이션
    setTimeout(() => {
      setProgressStep(1);
      setProgressMessage('질문 인식 완료');
    }, 1000);

    setTimeout(() => {
      setProgressStep(2);
      setProgressMessage('답변 생성중...');
    }, 2000);

    const formData = new FormData();
    
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }
    
    
    if (questionImage) {
      formData.append('question_image', questionImage);
    }
    
    if (questionFile) {
      formData.append('question_file', questionFile);
    }
    
    if (questionUrl) {
      formData.append('question_url', questionUrl);
    }

    try {
      const response = await axios.post('http://localhost:5000/api/generate-answer', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setProgressStep(3);
        setProgressMessage('답변 완료');
        setAnswers(response.data.answers);
        setTotalQuestions(response.data.total_questions);
        console.log('받은 답변들:', response.data.answers);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  return (/* 리턴 */
    <>
    <Layout>
      <div className="title-wrapper">
        <div className="title">
          <h2>✒️AI 자기소개서 답변 생성기</h2>
          <p>텍스트, 이미지, 링크를 분석하여 분류하고 요약해드립니다</p>
        </div>
      <div className="container">
        <div className="content-wrapper">
          <form onSubmit={handleSubmit}>
          {/* 자기소개서 파일 업로드 */}
          <div className="form-group">
            <label>1. 자기소개서 파일 (.txt, .pdf)을 업로드하세요</label>
            {resumeFile ? (
              <div className="file-selected">
                <div className="file-info">
                  <span className="file-name">📄 {resumeFile.name}</span>
                  <button 
                    type="button" 
                    className="file-remove-btn"
                    onClick={() => setResumeFile(null)}
                    title="파일 제거"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div {...getResumeRootProps()} className="dropzone">
                <input {...getResumeInputProps()} />
                <p>클릭하거나 파일을 드래그하여 업로드</p>
              </div>
            )}
          </div>

          {/* 질문 이미지 업로드 */}
          <div className="form-group">
            <label>2. 질문 스크린샷 이미지를 업로드하세요</label>
            {questionImage ? (
              <div className="file-selected">
                <div className="file-info">
                  <span className="file-name">🖼️ {questionImage.name}</span>
                  <button 
                    type="button" 
                    className="file-remove-btn"
                    onClick={() => setQuestionImage(null)}
                    title="이미지 제거"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div {...getImageRootProps()} className="dropzone">
                <input {...getImageInputProps()} />
                <p>클릭하거나 이미지를 드래그하여 업로드</p>
              </div>
            )}
          </div>

          {/* 질문 파일 업로드 */}
          <div className="form-group">
            <label>또는 질문 파일(.txt, .pdf)을 업로드하세요</label>
            {questionFile ? (
              <div className="file-selected">
                <div className="file-info">
                  <span className="file-name">📄 {questionFile.name}</span>
                  <button 
                    type="button" 
                    className="file-remove-btn"
                    onClick={() => setQuestionFile(null)}
                    title="파일 제거"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div {...getQuestionFileRootProps()} className="dropzone">
                <input {...getQuestionFileInputProps()} />
                <p>클릭하거나 파일을 드래그하여 업로드</p>
              </div>
            )}
          </div>

          {/* URL 크롤링 */}
          <div className="form-group">
            <label>또는 자기소개서 양식이 있는 웹사이트 URL을 입력하세요</label>
            <input
              type="url"
              value={questionUrl}
              onChange={(e) => setQuestionUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '처리 중...' : '답변 생성하기'}
          </button>
        </form>

        {loading && (
          <div className="progress-container">
            <h3>{progressMessage}</h3>
            <div className="progress-bar-wrapper">
              <div 
                className="progress-bar" 
                style={{ width: `${((progressStep + 1) / progressSteps.length) * 100}%` }}
              ></div>
            </div>
            <div className="progress-steps">
              {progressSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`progress-step ${
                    index <= progressStep ? (index === progressStep ? 'active' : 'completed') : ''
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="error">
            <h2>오류</h2>
            <p>{error}</p>
          </div>
        )}

        {totalQuestions > 0 && (
          <div className="result">
            <h2>생성된 답변 초안 ({totalQuestions}개 항목)</h2>
            {Object.entries(answers).map(([questionNum, answerData]) => (
              <div key={questionNum} className="answer-item">
                <div className="answer-text">
                  <p>{answerData.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>{/* 표시 */}
    </Layout>
    </>
  );
}

export default Self;
