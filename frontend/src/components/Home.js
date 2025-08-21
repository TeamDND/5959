import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/Home.css';



function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: "🎯",
      title: "맞춤형 질문 생성",
      description: "채용공고를 분석하여 해당 직무에 특화된 면접 질문을 자동으로 생성합니다."
    },
    {
      icon: "⏰",
      title: "실시간 시간 관리",
      description: "난이도별 시간 제한을 두어 실제 면접과 유사한 환경을 제공합니다."
    },
    {
      icon: "📊",
      title: "상세한 피드백",
      description: "AI가 답변을 분석하여 구체적인 개선점과 점수를 제공합니다."
    },
    {
      icon: "📄",
      title: "결과 리포트",
      description: "면접 결과를 PDF로 저장하여 지속적인 개선에 활용할 수 있습니다."
    }
  ];

  return (
    <div className="home-container">
      <h1 className="home-title">
        AI 모의면접 도우미
      </h1>
      
      <p className="home-subtitle">
        채용공고 맞춤형 모의면접으로 취업 성공률을 높여보세요!
        실제 면접과 유사한 환경에서 연습하고 전문적인 피드백을 받아보세요.
      </p>

      <button
        className="home-start-button"
        onClick={() => navigate('/analysis')}
      >
        모의면접 시작하기
      </button>

      <div className="home-feature-grid">
        {features.map((feature, index) => (
          <div
            key={index}
            className="home-feature-card"
          >
            <div className="home-feature-icon">{feature.icon}</div>
            <h3 className="home-feature-title">{feature.title}</h3>
            <p className="home-feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;