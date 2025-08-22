import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import Layout from './Layout.js';
import '../style/JobAnalysis.css';



function JobAnalysis() {
  const navigate = useNavigate();
  const { dispatch } = useInterview();
  const [jobUrl, setJobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [jobInfo, setJobInfo] = useState(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('혼합');
  const [inputMode, setInputMode] = useState('url'); // 'url' 또는 'manual'
  const [manualInfo, setManualInfo] = useState({
    company: '',
    position: '',
    responsibilities: '',
    requirements: ''
  });

  const analyzeJob = async () => {
    if (inputMode === 'url' && !jobUrl.trim()) {
      alert('채용공고 URL을 입력해주세요.');
      return;
    }
    
    if (inputMode === 'manual' && (!manualInfo.company.trim() || !manualInfo.position.trim())) {
      alert('회사명과 직무는 필수 입력 항목입니다.');
      return;
    }

    setLoading(true);
    try {
      const requestData = inputMode === 'url' 
        ? { url: jobUrl }
        : {
            company: manualInfo.company,
            position: manualInfo.position,
            responsibilities: manualInfo.responsibilities,
            requirements: manualInfo.requirements
          };

      const response = await fetch('/api/analyze-job-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setJobInfo(data.job_info);
        setQuestions(data.questions);
        
        dispatch({
          type: 'SET_JOB_INFO',
          payload: {
            jobInfo: data.job_info,
            questions: data.questions
          }
        });
      }
    } catch (error) {
      console.error('채용공고 분석 실패:', error);
      alert('채용공고 분석에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    if (questions.length === 0) {
      alert('먼저 채용공고를 분석해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questions,
          num_questions: numQuestions,
          difficulty_level: difficulty
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        dispatch({
          type: 'START_INTERVIEW',
          payload: {
            questions: data.questions,
            sessionId: data.session_id
          }
        });
        
        navigate('/device-test');
      }
    } catch (error) {
      console.error('면접 시작 실패:', error);
      alert('면접 시작에 실패했습니다.');
    }
  };

  return (
    <Layout>
      <div className="job-analysis-wrapper">
        <h1 className="job-analysis-title-standalone">채용공고 분석</h1>
        <div className="container">
          <div className="card">
            <div className="job-analysis-card">
              
              <div className="job-analysis-main-container">
                <div className="job-analysis-input-section">
                  <div className="job-analysis-tab-container">
                    <button 
                      className={`job-analysis-tab ${inputMode === 'url' ? 'active' : ''}`}
                      onClick={() => setInputMode('url')}
                    >
                      URL 입력
                    </button>
                    <button 
                      className={`job-analysis-tab ${inputMode === 'manual' ? 'active' : ''}`}
                      onClick={() => setInputMode('manual')}
                    >
                      직접 입력
                    </button>
                  </div>

                  {inputMode === 'url' ? (
                    <div className="job-analysis-input-group">
                      <label className="job-analysis-label">채용공고 URL</label>
                      <input
                        className="job-analysis-input"
                        type="url"
                        placeholder="https://example.com/job-posting"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="job-analysis-input-group">
                        <label className="job-analysis-label">회사명 *</label>
                        <input
                          className="job-analysis-input"
                          type="text"
                          placeholder="회사명을 입력하세요"
                          value={manualInfo.company}
                          onChange={(e) => setManualInfo({...manualInfo, company: e.target.value})}
                        />
                      </div>
                      
                      <div className="job-analysis-input-group">
                        <label className="job-analysis-label">직무 *</label>
                        <input
                          className="job-analysis-input"
                          type="text"
                          placeholder="예: 프론트엔드 개발자, 마케팅 매니저"
                          value={manualInfo.position}
                          onChange={(e) => setManualInfo({...manualInfo, position: e.target.value})}
                        />
                      </div>
                      
                      <div className="job-analysis-input-group">
                        <label className="job-analysis-label">주요업무</label>
                        <textarea
                          className="job-analysis-textarea"
                          placeholder="주요 담당 업무를 입력하세요"
                          value={manualInfo.responsibilities}
                          onChange={(e) => setManualInfo({...manualInfo, responsibilities: e.target.value})}
                        />
                      </div>
                      
                      <div className="job-analysis-input-group">
                        <label className="job-analysis-label">요구사항</label>
                        <textarea
                          className="job-analysis-textarea"
                          placeholder="필요한 기술, 경험, 자격 요건을 입력하세요"
                          value={manualInfo.requirements}
                          onChange={(e) => setManualInfo({...manualInfo, requirements: e.target.value})}
                        />
                      </div>
                    </>
                  )}

                  <button
                    className="job-analysis-button"
                    onClick={analyzeJob}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="job-analysis-loading-spinner"></div>
                    ) : (
                      '분석하기'
                    )}
                  </button>
                </div>

                <div className="job-analysis-result-section">
                  {jobInfo ? (
                    <>
                      <h3 className="job-analysis-section-title">분석 결과</h3>
                      
                      {/* 실제 분석 결과 */}
                      <div className="job-analysis-job-info-card">
                        <div className="job-analysis-job-info-item">
                          <strong>회사:</strong> {jobInfo.company}
                        </div>
                        <div className="job-analysis-job-info-item">
                          <strong>직무:</strong> {jobInfo.position}
                        </div>
                        <div className="job-analysis-job-info-item">
                          <strong>주요업무:</strong> {jobInfo.responsibilities}
                        </div>
                        {jobInfo.requirements && (
                          <div className="job-analysis-job-info-item">
                            <strong>요구사항:</strong> {jobInfo.requirements}
                          </div>
                        )}
                      </div>

                      {questions.length > 0 && (
                        <>
                          <h3 className="job-analysis-section-title">생성된 질문 목록 ({questions.length}개)</h3>
                          <div className="job-analysis-question-list">
                            {questions.slice(0, 10).map((question, index) => (
                              <div key={index} className="job-analysis-question-item">
                                {index + 1}. {question}
                              </div>
                            ))}
                            {questions.length > 10 && (
                              <div className="job-analysis-question-item" style={{ fontStyle: 'italic', color: '#999' }}>
                                ... 외 {questions.length - 10}개 질문
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="job-analysis-section-title">분석 결과 예시</h3>
                      
                      {/* 예시 데이터 */}
                      <div className="job-analysis-job-info-card">
                        <div className="job-analysis-job-info-item">
                          <strong>회사:</strong> 테크스타트업
                        </div>
                        <div className="job-analysis-job-info-item">
                          <strong>직무:</strong> 프론트엔드 개발자
                        </div>
                        <div className="job-analysis-job-info-item">
                          <strong>주요업무:</strong> React, Vue.js를 활용한 웹 애플리케이션 개발 및 유지보수
                        </div>
                        <div className="job-analysis-job-info-item">
                          <strong>요구사항:</strong> JavaScript, HTML, CSS 경험 3년 이상, React/Vue.js 프레임워크 경험
                        </div>
                      </div>

                      <h3 className="job-analysis-section-title">생성된 질문 예시 (10개)</h3>
                      <div className="job-analysis-question-list">
                        <div className="job-analysis-question-item">
                          1. React의 주요 특징과 장점에 대해 설명해주세요.
                        </div>
                        <div className="job-analysis-question-item">
                          2. 컴포넌트 기반 개발의 장점은 무엇인가요?
                        </div>
                        <div className="job-analysis-question-item">
                          3. 상태 관리 라이브러리(Redux, Vuex)를 사용하는 이유는?
                        </div>
                        <div className="job-analysis-question-item">
                          4. 웹 성능 최적화를 위해 어떤 방법들을 사용하시나요?
                        </div>
                        <div className="job-analysis-question-item">
                          5. 반응형 웹 디자인을 구현할 때 주의사항은?
                        </div>
                        <div className="job-analysis-question-item">
                          6. 크로스 브라우징 이슈를 해결한 경험이 있다면?
                        </div>
                        <div className="job-analysis-question-item">
                          7. Git을 사용한 협업 과정에서 겪은 어려움은?
                        </div>
                        <div className="job-analysis-question-item">
                          8. 코드 리뷰를 통해 배운 점이 있다면?
                        </div>
                        <div className="job-analysis-question-item">
                          9. 새로운 기술을 학습하는 방법은?
                        </div>
                        <div className="job-analysis-question-item">
                          10. 프로젝트에서 가장 어려웠던 기술적 도전은?
                        </div>
                      </div>
                    </>
                  )}

                  <h3 className="job-analysis-section-title">면접 설정</h3>
                  <div className="job-analysis-settings-group">
                    <div>
                      <label className="job-analysis-label">질문 개수</label>
                      <select
                        className="job-analysis-select"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      >
                        <option value={5}>5개</option>
                        <option value={10}>10개</option>
                        <option value={15}>15개</option>
                        <option value={20}>20개</option>
                      </select>
                    </div>
                    <div>
                      <label className="job-analysis-label">난이도</label>
                      <select
                        className="job-analysis-select"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        <option value="기초">기초</option>
                        <option value="중급">중급</option>
                        <option value="고급">고급</option>
                        <option value="혼합">혼합</option>
                      </select>
                    </div>
                  </div>

                  <button
                    className="job-analysis-start-interview-button"
                    onClick={startInterview}
                    disabled={questions.length === 0}
                  >
                    모의면접 시작하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default JobAnalysis;