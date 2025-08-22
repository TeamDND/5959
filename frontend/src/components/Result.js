import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import Layout from './Layout.js';
import '../style/Result.css';



function Result() {
  const navigate = useNavigate();
  const { state, dispatch } = useInterview();

  useEffect(() => {
    if (state.selectedQuestions.length === 0) {
      navigate('/');
    }
  }, [state.selectedQuestions.length, navigate]);

  const calculateAverageScore = () => {
    if (state.scores.length === 0) return 0;
    return Math.round(state.scores.reduce((sum, score) => sum + score, 0) / state.scores.length);
  };

  const getScoreGrade = (score) => {
    if (score >= 85) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    return 'D';
  };

  const getOverallFeedback = (avgScore) => {
    if (avgScore >= 85) {
      return "뛰어난 면접 수행이었습니다! 자신감을 가지고 실제 면접에 임하세요.";
    } else if (avgScore >= 70) {
      return "양호한 면접 수행이었습니다. 몇 가지 부분만 보완하면 더 좋은 결과를 얻을 수 있습니다.";
    } else if (avgScore >= 55) {
      return "기본적인 면접 수행은 되었지만, 답변의 구체성과 논리성을 더 높여야 합니다.";
    } else {
      return "면접 준비가 더 필요합니다. 예상 질문에 대한 답변을 미리 준비하고 연습하세요.";
    }
  };

  const downloadReport = async () => {
    try {
      const sessionData = {
        session_id: state.sessionId || 'session_' + Date.now(),
        questions: state.selectedQuestions.map(q => q.text || q.question || q),
        answers: state.answers || [],
        scores: state.scores || [],
        feedback: state.feedback || []
      };
      
      console.log('PDF 생성 요청 데이터:', sessionData);

      const response = await fetch('http://localhost:5000/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF 생성 API 오류:', response.status, errorText);
        throw new Error(`서버 오류: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        // 파일 다운로드
        const downloadUrl = `http://localhost:5000${data.download_url}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('면접 결과 리포트가 다운로드되었습니다!');
      } else {
        console.error('PDF 생성 실패:', data.error);
        alert(`리포트 생성에 실패했습니다: ${data.error}`);
      }
    } catch (error) {
      console.error('리포트 생성 실패:', error);
      alert(`리포트 생성에 실패했습니다: ${error.message}`);
    }
  };

  const restartInterview = () => {
    dispatch({ type: 'RESET_INTERVIEW' });
    navigate('/');
  };

  const averageScore = calculateAverageScore();
  const grade = getScoreGrade(averageScore);
  const passedQuestions = state.scores.filter(score => score >= 60).length;

  return (
    <Layout>
      <div className="container">
        <div className="card">
          <div className="result-card">
            <h1 className="result-title">🎉 면접 완료!</h1>
            
            <div className="result-content-container">
              <div className="result-score-section">
                <div className="result-score-display">{averageScore}점</div>
                <div className="result-score-label">평균 점수 ({grade} 등급)</div>
              </div>

              <div className="result-stats-grid">
                <div className="result-stat-card">
                  <div className="result-stat-value">{state.selectedQuestions.length}</div>
                  <div className="result-stat-label">총 질문 수</div>
                </div>
                <div className="result-stat-card">
                  <div className="result-stat-value">{passedQuestions}</div>
                  <div className="result-stat-label">합격 기준 통과</div>
                </div>
                <div className="result-stat-card">
                  <div className="result-stat-value">{state.scores.length > 0 ? Math.max(...state.scores) : 0}</div>
                  <div className="result-stat-label">최고 점수</div>
                </div>
                <div className="result-stat-card">
                  <div className="result-stat-value">{state.scores.length > 0 ? Math.min(...state.scores) : 0}</div>
                  <div className="result-stat-label">최저 점수</div>
                </div>
              </div>

              <div className="result-overall-feedback">
                <h3>종합 평가</h3>
                <p>{getOverallFeedback(averageScore)}</p>
              </div>

              <div className="result-qa-section">
                <h3>질문별 상세 결과</h3>
                {state.selectedQuestions.map((question, index) => {
                  const score = state.scores[index] || 0;
                  const scoreClass = score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'poor';
                  
                  return (
                    <div key={index} className="result-qa-item">
                      <div className="result-question">Q{index + 1}. {question.question}</div>
                      <div className="result-answer">
                        <strong>답변:</strong> {state.answers[index] || '답변하지 않음'}
                      </div>
                      <div className="result-score-feedback">
                        <div className="result-feedback">
                          <strong>피드백:</strong> {state.feedback[index] || '피드백 없음'}
                        </div>
                        <div className={`result-question-score ${scoreClass}`}>
                          {score}점
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="result-button-group">
              <button
                className="result-button secondary"
                onClick={downloadReport}
              >
                📄 PDF 다운로드
              </button>
              <button
                className="result-button primary"
                onClick={restartInterview}
              >
                다시 도전하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Result;