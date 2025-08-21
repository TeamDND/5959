import React, { useState, useRef } from 'react';
import Layout from './Layout.js';
import '../style/TextCleanup.css';

function TextCleanup() {
  const [activeTab, setActiveTab] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const fileInputRef = useRef(null);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setResult(null);
    setError('');
    setGeneratedImage(null);
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      setSelectedImage(files[0]);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const summarizeText = async () => {
    if (!textInput.trim()) {
      alert('텍스트를 입력해주세요.');
      return;
    }
    await sendRequest({ text: textInput });
  };

  const summarizeImage = async () => {
    if (!selectedImage) {
      alert('이미지를 선택해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      sendRequest({ image: e.target.result });
    };
    reader.readAsDataURL(selectedImage);
  };

  const generateImage = async () => {
    if (!result || result.type !== 'image') {
      alert('이미지 분석 결과가 없습니다.');
      return;
    }

    // 공부 내용으로 분류된 경우에만 이미지 생성
    if (!result.summary.is_study_content) {
      alert('공부 내용으로 분류된 경우에만 이미지 생성이 가능합니다.');
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImage(null);
    setError('');

    try {
      // 공부 내용 정리 전체를 이미지 생성용 텍스트로 변환
      const studyNotes = result.summary.study_notes || '';
      
      // 공부 내용 정리가 없으면 이미지 생성 불가
      if (!studyNotes) {
        setError('공부 내용 정리가 없어 이미지를 생성할 수 없습니다.');
        return;
      }

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: studyNotes,
          originalImage: imagePreview 
        })
      });

      const imageResult = await response.json();
      
      if (response.ok && imageResult.image) {
        setGeneratedImage(imageResult.image);
      } else {
        setError(imageResult.error || '이미지 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setError('이미지 생성 중 네트워크 오류가 발생했습니다.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const sendRequest = async (data) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      console.log('서버 응답:', result);
      console.log('응답 타입:', typeof result.summary);
      console.log('summary 내용:', result.summary);

      if (response.ok) {
        setResult(result);
      } else {
        setError(result.error || '요약 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (result.type === 'image' && typeof result.summary === 'object') {
      const classification = result.summary.classification || '';
      const mainContent = result.summary.main_content || '';
      const isStudyContent = result.summary.is_study_content || false;
      const studyNotes = result.summary.study_notes || '';
      
      return (
        <div className="result">
          <h3>📋 요약 결과</h3>
          <div className="result-section">
            <h4 className="result-section-title">📊 분류 정보</h4>
            <div className="result-section-content classification">
              {classification}
            </div>
          </div>
          <div className="result-section">
            <h4 className="result-section-title">📋 주요 내용</h4>
            <div className="result-section-content main-content">
              {mainContent}
            </div>
          </div>
          {isStudyContent && studyNotes && (
            <div className="result-section">
              <h4 className="result-section-title">📚 공부 내용 정리</h4>
              <div className="result-section-content study-content">
                {studyNotes}
              </div>
            </div>
          )}
          
          {/* 공부 내용으로 분류된 경우에만 이미지 생성 버튼 표시 */}
          {isStudyContent && (
            <div className="image-generation-section">
              <button 
                className="submit-btn image-generation-btn"
                onClick={generateImage}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? '🖼️ 이미지 생성 중...' : '🖼️ 요약 내용을 이미지로 변환'}
              </button>
              <div className="image-generation-info">
                💡 공부 내용을 시각적 학습 자료로 변환합니다
              </div>
            </div>
          )}

          {/* 생성된 이미지 표시 */}
          {isGeneratingImage && (
            <div className="generating-message">
              <p>AI가 공부 내용을 이미지로 변환하고 있습니다...</p>
            </div>
          )}

          {generatedImage && (
            <div className="generated-image-section">
              <h4 className="generated-image-title">🎨 생성된 학습 노트</h4>
              <div className="generated-image-container">
                <iframe 
                  src={generatedImage} 
                  className="generated-image-frame"
                  title="학습 노트"
                />
                <div className="download-button-container">
                  <button 
                    className="submit-btn download-btn"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generatedImage;
                      link.download = '학습노트.html';
                      link.click();
                    }}
                  >
                    💾 학습 노트 다운로드 (HTML)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } else if (result.type === 'text') {
      return (
        <div className="result">
          <h3>📋 요약 결과</h3>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            {result.summary}
          </div>
        </div>
      );
    } else {
      return (
        <div className="result">
          <h3>📋 요약 결과</h3>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', whiteSpace: 'pre-line' }}>
            <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: '14px' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      );
    }
  };

  return (
    <Layout>
      <div className="container">
        <div className="header">
          <h1>🤖 AI 요약 도구</h1>
        </div>

      <div className="content-wrapper">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => switchTab('text')}
          >
            📝 텍스트 요약
          </button>
          <button 
            className={`tab ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => switchTab('image')}
          >
            🖼️ 이미지 요약
          </button>
        </div>

        {activeTab === 'text' && (
          <div className="content active">
            <div className="input-group">
              <label htmlFor="text-input">요약할 텍스트를 입력하세요:</label>
              <textarea 
                id="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="여기에 텍스트를 입력하세요..."
              />
            </div>
            <button 
              className="submit-btn"
              onClick={summarizeText}
              disabled={isLoading}
            >
              {isLoading ? '요약 중...' : '요약하기'}
            </button>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="content active">
            <div className="input-group">
              <label htmlFor="image-input">요약할 이미지를 선택하세요:</label>
              <input 
                type="file" 
                id="image-input" 
                className="file-input" 
                accept="image/*" 
                onChange={handleImageSelect}
                ref={fileInputRef}
              />
              <label 
                htmlFor="image-input" 
                className="file-label"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                📁 이미지 파일을 선택하거나 여기에 드래그하세요
              </label>
              {imagePreview && (
                <img src={imagePreview} alt="미리보기" className="preview-image" />
              )}
            </div>
            <button 
              className="submit-btn"
              onClick={summarizeImage}
              disabled={isLoading}
            >
              {isLoading ? '요약 중...' : '요약하기'}
            </button>
          </div>
        )}

        {isLoading && (
          <div className="result loading">
            <h3>📋 요약 결과</h3>
            <p>AI가 요약을 생성하고 있습니다...</p>
          </div>
        )}

        {error && (
          <div className="result error">
            <h3>📋 요약 결과</h3>
            <p>{error}</p>
          </div>
        )}

        {renderResult()}
      </div>
      </div>
    </Layout>
  );
}

export default TextCleanup;

