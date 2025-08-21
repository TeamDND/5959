import re
import os
import requests
from bs4 import BeautifulSoup
from typing import Dict, List
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

class JobAnalyzer:
    def __init__(self):
        try:
            self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            self.use_ai = True
            print("Claude API 연결 성공")
        except Exception as e:
            print(f"Claude API 연결 실패: {e}")
            self.use_ai = False
    
    async def analyze_posting(self, url: str) -> Dict:
        try:
            # 1. 웹 크롤링으로 페이지 내용 가져오기
            print(f"웹 크롤링으로 URL 분석 중: {url}")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, timeout=15, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 불필요한 태그 제거
            for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                script.decompose()
            
            text_content = soup.get_text()
            cleaned_text = re.sub(r'\s+', ' ', text_content).strip()
            
            print(f"추출된 텍스트 길이: {len(cleaned_text)}")
            
            # 2. Claude로 텍스트 분석
            if self.use_ai and len(cleaned_text) > 100:
                try:
                    return await self._analyze_content_with_claude(cleaned_text)
                except Exception as e:
                    print(f"Claude 텍스트 분석 실패: {e}")
            
            # 3. 기본 정보로 대체
            return self._get_default_job_info()
            
        except Exception as e:
            print(f"웹 크롤링 실패: {str(e)}")
            return self._get_default_job_info()
    
    def _get_default_job_info(self) -> Dict:
        print("기본 채용공고 정보로 대체합니다.")
        return {
            "company": "㈔서울시관광협회",
            "position": "관광통역 안내사(중국어)",
            "responsibilities": "서울시 움직이는안내소 관광통역 안내업무, 외국인 관광객 안내 및 통역",
            "requirements": "중국어 新HSK 6급 이상, 관광통역안내사 자격증",
            "preferred": "중국어 능통자, 관광업계 경험자, 서비스 마인드",
            "full_text": "서울시 움직이는안내소 관광통역 안내사 채용공고"
        }
    
    
    async def _analyze_content_with_claude(self, text_content: str) -> Dict:
        """Claude API로 크롤링된 텍스트 내용 분석"""
        response = self.client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""
다음은 채용공고 웹페이지에서 추출한 텍스트입니다. 이 내용을 분석해서 채용공고 정보를 추출해주세요:

{text_content[:3000]}

다음 JSON 형식으로 정확히 답변해주세요:
{{
    "company": "회사명",
    "position": "직무명/채용제목",
    "responsibilities": "주요업무 및 담당업무",
    "requirements": "자격요건 및 필수조건",
    "preferred": "우대사항"
}}

주의사항:
- 실제 채용공고 내용만 추출하고 광고나 메뉴는 제외
- 각 항목이 명확하지 않으면 관련 내용을 유추해서 작성
- 모든 항목을 한국어로 작성
- 반드시 JSON 형식으로만 답변
"""
            }]
        )
        
        content = response.content[0].text
        print(f"Claude 분석 응답: {content[:200]}...")
        
        # JSON 파싱
        import json
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            
            if start != -1 and end != 0:
                json_str = content[start:end]
                parsed = json.loads(json_str)
                parsed["full_text"] = f"Claude로 분석된 채용공고: {parsed.get('company', '')} {parsed.get('position', '')}"
                print(f"분석 성공: {parsed.get('company')} - {parsed.get('position')}")
                return parsed
            else:
                raise Exception("JSON 형식을 찾을 수 없음")
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 실패: {e}")
            raise Exception("JSON 파싱 실패")
    
    async def generate_questions(self, job_info: Dict) -> List[str]:
        position = job_info.get("position", "일반")
        company = job_info.get("company", "")
        responsibilities = job_info.get("responsibilities", "")
        requirements = job_info.get("requirements", "")
        
        if self.use_ai:
            try:
                response = self.client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=2000,
                    messages=[{
                        "role": "user",
                        "content": f"""
다음 채용공고 정보를 바탕으로 모의면접 질문 40개를 생성해주세요:

회사: {company}
직무: {position}
주요업무: {responsibilities}
요구사항: {requirements}

다음 기준으로 질문을 만들어주세요:
- 기초 질문 (1-15번): 기본적인 경험과 지식
- 중급 질문 (16-30번): 실무 능력과 문제해결
- 고급 질문 (31-40번): 심화 지식과 리더십

각 질문은 번호와 함께 한 줄씩 작성해주세요.
예: 1. 자기소개를 해주세요.
"""
                    }]
                )
                
                content = response.content[0].text
                questions = self._parse_claude_questions(content)
                
                if len(questions) >= 20:  # 최소 20개 이상이면 사용
                    return questions[:40]
                    
            except Exception as e:
                print(f"Claude 질문 생성 실패: {e}")
        
        # AI 실패시 기본 질문 사용
        base_questions = self._get_default_questions(position)
        job_specific_questions = self._get_job_specific_questions(position, job_info)
        all_questions = base_questions + job_specific_questions
        return all_questions[:40]
    
    def _parse_claude_questions(self, text: str) -> List[str]:
        questions = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if re.match(r'^\d+\.', line):
                question = re.sub(r'^\d+\.\s*', '', line)
                if question and len(question) > 5:  # 너무 짧은 질문 제외
                    questions.append(question)
        
        return questions
    
    def _parse_questions(self, text: str) -> List[str]:
        questions = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if re.match(r'^\d+\.', line):
                question = re.sub(r'^\d+\.\s*', '', line)
                if question:
                    questions.append(question)
        
        return questions
    
    def _get_job_specific_questions(self, position: str, job_info: Dict) -> List[str]:
        """직무별 맞춤 질문 생성"""
        questions = []
        
        if "개발" in position or "엔지니어" in position:
            if "JAVA" in position.upper() or "자바" in position:
                questions.extend([
                    "JAVA 개발 경험은 어느 정도 되시나요?",
                    "Spring Framework 사용 경험에 대해 말씀해주세요.",
                    "전자정부프레임워크 사용 경험이 있으신가요?",
                    "DBMS 설계 및 최적화 경험은?",
                    "웹 애플리케이션 보안은 어떻게 관리하시나요?",
                    "RESTful API 설계 시 고려사항은?",
                    "JPA와 MyBatis 중 어떤 것을 선호하시나요?",
                    "웹 성능 최적화 경험이 있으신가요?",
                    "리눅스 환경에서의 개발 및 배포 경험은?",
                    "코드 품질 관리는 어떻게 하시나요?"
                ])
            else:
                questions.extend([
                    "가장 자신있는 프로그래밍 언어는 무엇인가요?",
                    "최근에 작업한 프로젝트에 대해 설명해주세요.",
                    "코드 리뷰는 어떻게 진행하시나요?",
                    "버그를 디버깅하는 본인만의 방법이 있나요?",
                    "새로운 기술 트렌드를 어떻게 따라가시나요?",
                    "팀 단위 개발 경험이 있으신가요?",
                    "데이터베이스 설계 경험이 있나요?",
                    "성능 최적화를 위해 노력한 경험은?",
                    "오픈소스 기여 경험이 있나요?",
                    "테스트 코드 작성에 대한 생각은?"
                ])
        elif "디자인" in position or "기획" in position:
            questions.extend([
                "본인의 디자인 철학은 무엇인가요?",
                "사용자 경험을 개선한 사례가 있나요?",
                "프로젝트 기획 시 가장 중요하게 생각하는 요소는?",
                "데이터 기반 의사결정 경험이 있나요?",
                "이해관계자들과의 협업 경험은?",
                "창의적인 아이디어를 어떻게 발전시키나요?",
                "트렌드 분석은 어떻게 하시나요?",
                "프로젝트 일정 관리 경험은?",
                "고객 피드백을 어떻게 반영하시나요?",
                "브랜딩에 대한 이해도는 어느 정도인가요?"
            ])
        elif "마케팅" in position or "영업" in position:
            questions.extend([
                "성공적인 마케팅 캠페인 경험이 있나요?",
                "고객과의 관계 구축은 어떻게 하시나요?",
                "시장 분석은 어떤 방식으로 진행하시나요?",
                "매출 목표 달성을 위한 전략은?",
                "디지털 마케팅 경험이 있나요?",
                "고객 클레임 처리 경험은?",
                "경쟁사 분석은 어떻게 하시나요?",
                "브랜드 인지도 향상을 위한 아이디어는?",
                "데이터 분석 도구 사용 경험은?",
                "크로스셀링/업셀링 경험이 있나요?"
            ])
        
        return questions[:15]  # 직무별 질문 15개로 제한
    
    def _get_default_questions(self, position: str) -> List[str]:
        """기본 면접 질문들 (난이도별)"""
        basic_questions = [
            "자기소개를 해주세요.",
            "이 직무에 지원한 이유는 무엇인가요?",
            "본인의 강점과 약점은 무엇인가요?",
            "5년 후 본인의 모습을 어떻게 그리고 있나요?",
            "팀워크 경험에 대해 말씀해주세요.",
            "스트레스를 어떻게 관리하시나요?",
            "실패했던 경험과 그로부터 배운 점은?",
            "새로운 기술을 학습하는 방법은?",
            "업무 우선순위를 어떻게 정하시나요?",
            "갈등 상황을 어떻게 해결하시나요?"
        ]
        
        intermediate_questions = [
            "본인이 리더십을 발휘했던 경험은?",
            "창의적 문제해결 경험을 말씀해주세요.",
            "업무에서 가장 중요하게 생각하는 가치는?",
            "고객 만족을 위해 노력했던 경험은?",
            "시간 관리는 어떻게 하시나요?",
            "동료와 의견이 다를 때 어떻게 조율하나요?",
            "업무 개선을 위해 제안한 경험이 있나요?",
            "멀티태스킹을 어떻게 처리하시나요?",
            "피드백을 받을 때 어떻게 대응하시나요?",
            "압박 상황에서의 경험을 말씀해주세요."
        ]
        
        advanced_questions = [
            "조직의 변화를 이끌어본 경험이 있나요?",
            "전략적 의사결정을 내린 경험은?",
            "장기적 비전을 어떻게 설정하시나요?",
            "혁신적인 아이디어를 실현한 경험은?",
            "위기 상황을 관리한 경험이 있나요?",
            "다양한 이해관계자를 조율한 경험은?",
            "성과 측정과 개선 방안은?",
            "업계 트렌드를 어떻게 예측하시나요?",
            "글로벌 관점에서의 업무 경험은?",
            "미래 기술 발전에 대한 견해는?"
        ]
        
        return basic_questions + intermediate_questions + advanced_questions