import React, { useState, useRef } from 'react';
import Layout from './Layout.js';
import '../style/TextCleanup.css';

function TextCleanup() {
  const [activeTab, setActiveTab] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [analysisType, setAnalysisType] = useState('general'); // general, business, study, news
  
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

  const analyzeText = async () => {
    if (!textInput.trim()) {
      alert('텍스트를 입력해주세요.');
      return;
    }
    await sendRequest({ 
      text: textInput, 
      type: 'text',
      analysisType: analysisType 
    });
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      alert('이미지를 선택해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      sendRequest({ 
        image: e.target.result, 
        type: 'image',
        analysisType: analysisType 
      });
    };
    reader.readAsDataURL(selectedImage);
  };

  const analyzeLink = async () => {
    if (!linkInput.trim()) {
      alert('링크를 입력해주세요.');
      return;
    }
    
    // URL 유효성 검사
    try {
      new URL(linkInput);
    } catch {
      alert('올바른 URL을 입력해주세요.');
      return;
    }
    
    await sendRequest({ 
      link: linkInput, 
      type: 'link',
      analysisType: analysisType 
    });
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
      const response = await fetch('/api/analyze-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      console.log('서버 응답:', result);

      if (response.ok) {
        setResult(result);
      } else {
        setError(result.error || '분석 중 오류가 발생했습니다.');
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
      const businessInfo = result.summary.business_info || '';
      const keyPoints = result.summary.key_points || [];
      const sentiment = result.summary.sentiment || '';
      
      return (
        <div className="result">
          <h3>📋 분석 결과</h3>
          
          {/* 분류 정보 */}
          <div className="result-section">
            <h4 className="result-section-title">📊 내용 분류</h4>
            <div className="result-section-content classification">
              {classification}
            </div>
          </div>

          {/* 감정 분석 */}
          {sentiment && (
            <div className="result-section">
              <h4 className="result-section-title">😊 감정 분석</h4>
              <div className="result-section-content sentiment">
                {sentiment}
              </div>
            </div>
          )}

          {/* 주요 내용 */}
          <div className="result-section">
            <h4 className="result-section-title">📋 주요 내용</h4>
            <div className="result-section-content main-content">
              {mainContent}
            </div>
          </div>

          {/* 핵심 포인트 */}
          {keyPoints && keyPoints.length > 0 && (
            <div className="result-section">
              <h4 className="result-section-title">🎯 핵심 포인트</h4>
              <div className="result-section-content key-points">
                <ul>
                  {keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 비즈니스 정보 */}
          {businessInfo && (
            <div className="result-section">
              <h4 className="result-section-title">🏢 비즈니스 정보</h4>
              <div className="result-section-content business-info">
                {businessInfo}
              </div>
            </div>
          )}

          {/* 공부 내용 정리 */}
          {isStudyContent && studyNotes && (
            <div className="result-section">
              <h4 className="result-section-title">📚 학습 노트</h4>
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
                {isGeneratingImage ? '🖼️ 이미지 생성 중...' : '🖼️ 학습 노트를 이미지로 변환'}
              </button>
              <div className="image-generation-info">
                💡 학습 내용을 시각적 자료로 변환합니다
              </div>
            </div>
          )}

          {/* 생성된 이미지 표시 */}
          {isGeneratingImage && (
            <div className="generating-message">
              <p>AI가 학습 노트를 이미지로 변환하고 있습니다...</p>
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
    } else if (result.type === 'text' && typeof result.summary === 'object') {
      const classification = result.summary.classification || '';
      const mainContent = result.summary.main_content || '';
      const keyPoints = result.summary.key_points || [];
      const sentiment = result.summary.sentiment || '';
      const businessInfo = result.summary.business_info || '';
      const recommendations = result.summary.recommendations || [];
      
      return (
        <div className="result">
          <h3>📋 텍스트 분석 결과</h3>
          
          {/* 분류 정보 */}
          <div className="result-section">
            <h4 className="result-section-title">📊 내용 분류</h4>
            <div className="result-section-content classification">
              {classification}
            </div>
          </div>

          {/* 감정 분석 */}
          {sentiment && (
            <div className="result-section">
              <h4 className="result-section-title">😊 감정 분석</h4>
              <div className="result-section-content sentiment">
                {sentiment}
              </div>
            </div>
          )}

          {/* 주요 내용 */}
          <div className="result-section">
            <h4 className="result-section-title">📋 주요 내용</h4>
            <div className="result-section-content main-content">
              {mainContent}
            </div>
          </div>

          {/* 핵심 포인트 */}
          {keyPoints && keyPoints.length > 0 && (
            <div className="result-section">
              <h4 className="result-section-title">🎯 핵심 포인트</h4>
              <div className="result-section-content key-points">
                <ul>
                  {keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 비즈니스 정보 */}
          {businessInfo && (
            <div className="result-section">
              <h4 className="result-section-title">🏢 비즈니스 정보</h4>
              <div className="result-section-content business-info">
                {businessInfo}
              </div>
            </div>
          )}

          {/* 추천사항 */}
          {recommendations && recommendations.length > 0 && (
            <div className="result-section">
              <h4 className="result-section-title">💡 추천사항</h4>
              <div className="result-section-content recommendations">
                <ul>
                  {recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      );
    } else if (result.type === 'link' && typeof result.summary === 'object') {
      const title = result.summary.title || '';
      const description = result.summary.description || '';
      const companyInfo = result.summary.company_info || '';
      const keyInsights = result.summary.key_insights || [];
      const marketAnalysis = result.summary.market_analysis || '';
      const recommendations = result.summary.recommendations || [];
      
      return (
        <div className="result">
          <h3>🔗 링크 분석 결과</h3>
          
          {/* 제목 */}
          {title && (
            <div className="result-section">
              <h4 className="result-section-title">📰 제목</h4>
              <div className="result-section-content title">
                {title}
              </div>
            </div>
          )}

          {/* 설명 */}
          {description && (
            <div className="result-section">
              <h4 className="result-section-title">📝 설명</h4>
              <div className="result-section-content description">
                {description}
              </div>
            </div>
          )}

          {/* 기업 정보 */}
          {companyInfo && (
            <div className="result-section">
              <h4 className="result-section-title">🏢 기업 정보</h4>
              <div className="result-section-content company-info">
                {companyInfo}
              </div>
            </div>
          )}

          {/* 핵심 인사이트 */}
          {keyInsights && keyInsights.length > 0 && (
            <div className="result-section">
              <h4 className="result-section-title">💡 핵심 인사이트</h4>
              <div className="result-section-content key-insights">
                <ul>
                  {keyInsights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 시장 분석 */}
          {marketAnalysis && (
            <div className="result-section">
              <h4 className="result-section-title">📊 시장 분석</h4>
              <div className="result-section-content market-analysis">
                {marketAnalysis}
              </div>
            </div>
          )}

          {/* 추천사항 */}
          {recommendations && recommendations.length > 0 && (
            <div className="result-section">
              <h4 className="result-section-title">🎯 추천사항</h4>
              <div className="result-section-content recommendations">
                <ul>
                  {recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="result">
          <h3>📋 분석 결과</h3>
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
      <div className="textcleanup-wrapper">
        <div className="title">
          <h2>🤖 AI 콘텐츠 분석 도구</h2>
          <p>텍스트, 이미지, 링크를 분석하여 분류하고 요약해드립니다</p>
        </div>
        
        <div className="container">
          <div className="content-wrapper">
          {/* 분석 유형 선택 */}
          <div className="analysis-type-selector">
            <h3>📊 분석 유형 선택</h3>
            <div className="analysis-type-buttons">
              <button 
                className={`analysis-type-btn ${analysisType === 'general' ? 'active' : ''}`}
                onClick={() => setAnalysisType('general')}
              >
                🔍 일반 분석
              </button>
              <button 
                className={`analysis-type-btn ${analysisType === 'business' ? 'active' : ''}`}
                onClick={() => setAnalysisType('business')}
              >
                🏢 비즈니스 분석
              </button>
              <button 
                className={`analysis-type-btn ${analysisType === 'study' ? 'active' : ''}`}
                onClick={() => setAnalysisType('study')}
              >
                📚 학습 분석
              </button>
              <button 
                className={`analysis-type-btn ${analysisType === 'news' ? 'active' : ''}`}
                onClick={() => setAnalysisType('news')}
              >
                📰 뉴스 분석
              </button>
            </div>
          </div>

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => switchTab('text')}
            >
              📝 텍스트 분석
            </button>
            <button 
              className={`tab ${activeTab === 'image' ? 'active' : ''}`}
              onClick={() => switchTab('image')}
            >
              🖼️ 이미지 분석
            </button>
            <button 
              className={`tab ${activeTab === 'link' ? 'active' : ''}`}
              onClick={() => switchTab('link')}
            >
              🔗 링크 분석
            </button>
          </div>

          {activeTab === 'text' && (
            <div className="content active">
              <div className="input-group">
                <label htmlFor="text-input">분석할 텍스트를 입력하세요:</label>
                <textarea 
                  id="text-input"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="여기에 텍스트를 입력하세요..."
                />
              </div>
              <button 
                className="submit-btn"
                onClick={analyzeText}
                disabled={isLoading}
              >
                {isLoading ? '분석 중...' : '분석하기'}
              </button>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="content active">
              <div className="input-group">
                <label htmlFor="image-input">분석할 이미지를 선택하세요:</label>
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
                onClick={analyzeImage}
                disabled={isLoading}
              >
                {isLoading ? '분석 중...' : '분석하기'}
              </button>
            </div>
          )}

          {activeTab === 'link' && (
            <div className="content active">
              <div className="input-group">
                <label htmlFor="link-input">분석할 링크를 입력하세요:</label>
                <input 
                  type="url" 
                  id="link-input"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://example.com"
                  className="link-input"
                />
                <div className="link-examples">
                  <p>💡 예시: 기업 홈페이지, 뉴스 기사, 블로그 포스트 등</p>
                </div>
              </div>
              <button 
                className="submit-btn"
                onClick={analyzeLink}
                disabled={isLoading}
              >
                {isLoading ? '분석 중...' : '분석하기'}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="result loading">
              <h3>📋 분석 결과</h3>
              <p>AI가 콘텐츠를 분석하고 있습니다...</p>
            </div>
          )}

          {error && (
            <div className="result error">
              <h3>📋 분석 결과</h3>
              <p>{error}</p>
            </div>
          )}

          {renderResult()}
        </div>
      </div>
      </div>
    </Layout>
  );
}

export default TextCleanup;

