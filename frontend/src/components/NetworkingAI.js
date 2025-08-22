import React, { useState } from 'react';
import { MessageSquare, Users, Mail, Send, CheckCircle, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../style/App.css';
import '../style/NetworkingAI.css';
import Layout from './Layout.js';

const NetworkingAI = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('linkedin');
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 입력 분석 함수
  const analyzeInput = (input) => {
    const lowerInput = input.toLowerCase();
    const analysis = {
      company: null,
      role: null,
      purpose: null,
      tone: 'formal'
    };

    // 회사 분석
    const companies = ['삼성', '네이버', '카카오', 'LG', 'SK', '현대', '쿠팡', '토스'];
    companies.forEach(company => {
      if (lowerInput.includes(company.toLowerCase())) {
        analysis.company = company;
      }
    });

    // 직무 분석
    if (lowerInput.includes('프론트엔드') || lowerInput.includes('프론트')) {
      analysis.role = '프론트엔드 개발자';
    } else if (lowerInput.includes('백엔드')) {
      analysis.role = '백엔드 개발자';
    } else if (lowerInput.includes('풀스택')) {
      analysis.role = '풀스택 개발자';
    } else if (lowerInput.includes('개발자')) {
      analysis.role = '개발자';
    } else if (lowerInput.includes('디자이너')) {
      analysis.role = '디자이너';
    } else if (lowerInput.includes('기획자')) {
      analysis.role = '기획자';
    }

    // 목적 분석
    if (lowerInput.includes('커피챗')) {
      analysis.purpose = 'coffee_chat';
    } else if (lowerInput.includes('멘토링')) {
      analysis.purpose = 'mentoring';
    } else if (lowerInput.includes('채용') || lowerInput.includes('지원')) {
      analysis.purpose = 'job_inquiry';
    } else if (lowerInput.includes('협업')) {
      analysis.purpose = 'collaboration';
    }

    // 톤 분석
    if (lowerInput.includes('친근하게') || lowerInput.includes('편하게')) {
      analysis.tone = 'casual';
    }

    return analysis;
  };

  // LinkedIn 메시지 생성
  const generateLinkedInMessage = (input, analysis) => {
    const { company, role, purpose, tone } = analysis;
    
    const greeting = tone === 'casual' ? '안녕하세요!' : '안녕하세요.';
    
    const introductions = [
      `저는 현재 ${role || '취업'} 준비를 하고 있는 OOO입니다.`,
      `${role || 'IT'} 분야로 커리어를 시작하려는 OOO이라고 합니다.`,
      `${role || '개발'} 분야에 관심이 많은 취업준비생 OOO입니다.`
    ];
    
    const randomIntro = introductions[Math.floor(Math.random() * introductions.length)];

    let connectionReason = '';
    if (company) {
      const companyReasons = {
        '삼성': '삼성의 혁신적인 기술 리더십과 글로벌 비전에 깊은 인상을 받았습니다.',
        '네이버': '네이버의 기술 생태계와 개발자 친화적인 문화에 깊은 인상을 받았습니다.',
        '카카오': '카카오의 사용자 중심 서비스 철학에 깊이 공감합니다.'
      };
      connectionReason = companyReasons[company] || `${company}의 비전과 기업 문화에 깊은 관심을 가지고 연락드립니다.`;
    } else {
      connectionReason = '업계 선배로서의 경험과 인사이트를 배우고 싶어 연락드립니다.';
    }

    let request = '';
    switch (purpose) {
      case 'coffee_chat':
        request = '혹시 시간이 되신다면 짧은 커피챗을 통해 업계 이야기를 나눌 수 있을까요?';
        break;
      case 'mentoring':
        request = '멘토링을 통해 커리어 방향성에 대한 조언을 구할 수 있을까요?';
        break;
      case 'job_inquiry':
        request = '채용 정보나 지원 과정에 대해 문의드릴 수 있을까요?';
        break;
      default:
        request = '업계 경험담과 조언을 들을 수 있는 기회가 있을까요?';
    }

    const closing = '소중한 시간 내주신다면 정말 감사하겠습니다.';

    return `${greeting}

${randomIntro}

${connectionReason}

${request}

${closing}

OOO 드림`;
  };

  // 이메일 템플릿 생성
  const generateEmailTemplate = (input, analysis) => {
    const { company, role } = analysis;

    let subject = '';
    let greeting = '';
    let mainContent = '';
    let closing = '';

    if (input.includes('면접')) {
      subject = `${company || '귀사'} ${role || ''} 면접 일정 관련 문의`;
      greeting = `${company || '귀사'}에 지원한 ${role || '해당 직무'}에 대한 면접 일정을 문의드리고자 합니다.`;
      mainContent = '현재 다른 회사들과의 면접 일정 조율이 필요한 상황이라, 가능한 면접 시간대를 미리 알려주시면 일정 조정에 큰 도움이 될 것 같습니다.';
    } else if (input.includes('지원') || input.includes('채용')) {
      subject = `${company || '귀사'} ${role || ''} 채용 지원서 제출`;
      greeting = `${company || '귀사'}의 ${role || '채용'} 공고를 보고 지원 의사를 밝히고자 연락드립니다.`;
      mainContent = `첨부된 이력서와 포트폴리오를 통해 저의 역량을 확인해 주시고, ${role || '해당 직무'}에 대한 열정을 보여드리고 싶습니다.`;
    } else {
      subject = `${role || '업무'} 관련 문의사항`;
      greeting = `${role || '업무'} 관련하여 몇 가지 문의사항이 있어 연락드립니다.`;
      mainContent = '관련 정보를 찾아보았지만 명확하지 않은 부분이 있어 직접 문의드리게 되었습니다.';
    }

    closing = '바쁘신 중에도 시간 내주셔서 감사합니다.\n좋은 하루 되세요.';

    return `제목: ${subject}

안녕하세요,

${greeting}

${mainContent}

추가로 필요한 정보가 있다면 알려주시기 바랍니다.

${closing}

OOO`;
  };

  // 네트워킹 시뮬레이션 생성
  const generateSimulation = (input, analysis) => {
    const { company, role } = analysis;

    let scenario = '';
    let opening = '';
    let response = '';
    let tips = [];

    if (input.includes('컨퍼런스')) {
      scenario = `${role || '개발자'} 컨퍼런스`;
      opening = '"안녕하세요! 방금 전 발표 정말 인상깊었어요."';
      response = `"안녕하세요! 감사합니다. 저는 ${role || '개발'} 분야 취업 준비 중인 OOO이라고 합니다. 혹시 어떤 업무를 담당하고 계신가요?"`;
      tips = [
        '발표나 세션 내용을 구체적으로 언급하며 대화 시작',
        '최신 기술 트렌드나 발표 내용에 대한 의견 교환',
        '본인의 학습 경험이나 관련 프로젝트 간략히 소개',
        '실무 경험담이나 업계 동향에 대한 질문'
      ];
    } else if (input.includes('박람회') || input.includes('채용')) {
      scenario = '채용 박람회';
      opening = `"안녕하세요! ${company || '이 회사'}에 대해 더 알고 싶어서 왔습니다."`;
      response = `"안녕하세요! 저는 ${role || '취업'} 준비 중인 OOO입니다. ${company || '회사'}의 어떤 점이 가장 매력적인지 궁금합니다."`;
      tips = [
        '회사의 비전, 문화, 복지에 대한 구체적 질문',
        '해당 직무의 실제 업무 내용과 성장 경로 문의',
        '신입사원 교육 프로그램이나 멘토링 시스템 확인',
        '채용 프로세스와 일정, 준비사항 문의'
      ];
    } else {
      scenario = '업계 네트워킹 모임';
      opening = '"안녕하세요! 처음 뵙겠습니다. 어떤 일을 하고 계신가요?"';
      response = `"안녕하세요! 저는 ${role || '취업'} 준비 중인 OOO입니다. 어떤 일을 하고 계신가요?"`;
      tips = [
        '상대방에게 먼저 질문하여 관심을 보이세요',
        '공통 관심사를 찾아 자연스럽게 연결하세요',
        '본인의 배경과 목표를 간략하게 소개하세요',
        '상대방의 경험담에 진심으로 귀 기울이세요'
      ];
    }

    let simulation = `🎯 네트워킹 시뮬레이션 시작!

**상황**: ${scenario} 현장

**상대방**: ${opening}

**추천 응답**:
"${response}"

**상황별 대화 전략**:`;

    tips.forEach(tip => {
      simulation += `\n✓ ${tip}`;
    });

    simulation += `\n\n**대화 연습 포인트**:
• 자연스러운 질문으로 대화 확장하기
• 본인의 경험이나 관심사 적절히 공유하기  
• 상대방과의 공통점 찾아 연결고리 만들기
• 구체적인 후속 액션 제안하기`;

    return simulation;
  };

  // AI 응답 생성 함수 - 실제 API 호출
  const generateResponse = async (type, input) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/networking-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          input: input,
          user_context: {
            name: 'OOO',
            role: 'job_seeker'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // AI 제공자 정보와 함께 결과 표시
        const providerInfo = data.provider ? `\n\n🤖 Generated by: ${data.provider}` : '';
        setResult(data.result + providerInfo);
      } else {
        throw new Error(data.message || 'API 응답에서 오류가 발생했습니다.');
      }
      
    } catch (error) {
      console.error('API 호출 오류:', error);
      
      // API 실패 시 fallback으로 로컬 생성 함수 사용
      console.log('API 호출 실패, 로컬 생성 함수를 사용합니다.');
      
      let fallbackResponse = '';
      const analysis = analyzeInput(input);
      
      switch(type) {
        case 'linkedin':
          fallbackResponse = generateLinkedInMessage(input, analysis);
          break;
        case 'email':
          fallbackResponse = generateEmailTemplate(input, analysis);
          break;
        case 'simulation':
          fallbackResponse = generateSimulation(input, analysis);
          break;
        default:
          fallbackResponse = '지원하지 않는 기능입니다.';
      }
      
      setResult(fallbackResponse + '\n\n⚠️ 현재 AI 서비스에 연결할 수 없어 기본 템플릿을 제공합니다.');
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (userInput.trim()) {
      generateResponse(activeTab, userInput);
    }
  };

  const tabs = [
    { id: 'linkedin', label: 'LinkedIn 메시지', icon: Users },
    { id: 'email', label: '이메일 템플릿', icon: Mail },
    { id: 'simulation', label: '네트워킹 시뮬레이션', icon: MessageSquare }
  ];

  const placeholders = {
    linkedin: '예: "삼성전자 개발자님께 커피챗 요청하고 싶어요"',
    email: '예: "지원한 회사에 면접 일정 문의 메일을 보내고 싶어요"',
    simulation: '예: "개발자 컨퍼런스에서 처음 만나는 사람과 대화하는 상황"'
  };

  return (
    <Layout>
      <div className="networking-wrapper">
        <div className="title">
          <h1>🤝 네트워킹 AI</h1>
          <p>
            취준생을 위한 스마트한 네트워킹 & 커뮤니케이션 도구
            <br />LinkedIn 메시지부터 이메일 작성, 실전 대화 연습까지!
          </p>
        </div>

        <div className="container">
          <div className="content-wrapper">
            {/* 탭 네비게이션 */}
            <div className="tab-container">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setResult('');
                      setUserInput('');
                    }}
                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <IconComponent size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* 입력 영역 */}
            <div className="input-section">
              <div className="input-group">
                <label>상황을 자세히 설명해주세요</label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={placeholders[activeTab]}
                  className="input-textarea"
                  rows="4"
                />
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={isLoading || !userInput.trim()}
                className="submit-btn"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner" />
                    <span>AI가 생성 중입니다...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    AI 추천 생성하기
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 결과 출력 */}
          {result && (
            <div className="result-card animate-slide-up">
              <div className="result-header">
                <CheckCircle size={20} />
                <h3>AI 추천 결과</h3>
              </div>
              
              <div className="result-content">
                <pre className="result-text">{result}</pre>
              </div>
              
              <div className="button-group">
                <button
                  onClick={() => navigator.clipboard.writeText(result)}
                  className="btn-primary"
                >
                  📋 텍스트 복사
                </button>
                <button
                  onClick={() => {
                    setUserInput('');
                    setResult('');
                  }}
                  className="btn-accent"
                >
                  ✏️ 새로 작성
                </button>
              </div>
            </div>
          )}

          {/* 사용 가이드 */}
          {!result && (
            <div className="guide-card">
              <div className="guide-header">
                <Lightbulb size={20} />
                <h3>사용 팁</h3>
              </div>
              
              <div className="components-grid">
                <div className="component-card">
                  <div className="component-icon">
                    <Users size={24} />
                  </div>
                  <h4>LinkedIn 메시지</h4>
                  <p>업계 선배나 관심 회사 직원에게 보낼 정중하고 효과적인 메시지를 생성합니다.</p>
                </div>
                
                <div className="component-card">
                  <div className="component-icon accent">
                    <Mail size={24} />
                  </div>
                  <h4>이메일 템플릿</h4>
                  <p>면접 문의, 지원서 제출, 업무 협의 등 다양한 상황의 이메일 템플릿을 제공합니다.</p>
                </div>
                
                <div className="component-card">
                  <div className="component-icon">
                    <MessageSquare size={24} />
                  </div>
                  <h4>대화 시뮬레이션</h4>
                  <p>네트워킹 이벤트나 모임에서의 실전 대화를 미리 연습해볼 수 있습니다.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NetworkingAI;