import uuid
import random
import re
import os
from typing import List, Dict
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

class InterviewService:
    def __init__(self):
        self.sessions = {}
        try:
            self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            self.use_ai = True
            print("Claude API 연결 성공 (면접 서비스)")
        except Exception as e:
            print(f"Claude API 연결 실패: {e}")
            self.use_ai = False
        
        self.difficulty_time_limits = {
            "기초": 120,  # 2분
            "중급": 180,  # 3분
            "고급": 300   # 5분
        }
    
    def select_questions(self, questions: List[str], num_questions: int, difficulty_level: str) -> List[Dict]:
        if difficulty_level == "기초":
            selected = questions[:10]
        elif difficulty_level == "중급":
            selected = questions[10:25]
        elif difficulty_level == "고급":
            selected = questions[25:40]
        else:  # 혼합
            basic = random.sample(questions[:10], min(3, num_questions // 3))
            intermediate = random.sample(questions[10:25], min(5, num_questions // 2))
            advanced = random.sample(questions[25:40], min(7, num_questions - len(basic) - len(intermediate)))
            selected = basic + intermediate + advanced
        
        random.shuffle(selected)
        selected = selected[:num_questions]
        
        structured_questions = []
        for i, question in enumerate(selected):
            if i < num_questions // 3:
                level = "기초"
            elif i < 2 * num_questions // 3:
                level = "중급"
            else:
                level = "고급"
            
            structured_questions.append({
                "question": question,
                "difficulty": level,
                "time_limit": self.difficulty_time_limits[level],
                "question_number": i + 1
            })
        
        return structured_questions
    
    def create_session(self, questions: List[Dict]) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "questions": questions,
            "current_question": 0,
            "answers": [],
            "scores": [],
            "feedback": []
        }
        return session_id
    
    async def evaluate_answer(self, question: str, answer: str, time_taken: int, max_time: int) -> Dict:
        if self.use_ai:
            try:
                response = self.client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=800,
                    messages=[{
                        "role": "user",
                        "content": f"""
다음 면접 질문과 답변을 평가해주세요:

질문: {question}
답변: {answer}
답변 시간: {time_taken}초 / {max_time}초

다음 기준으로 100점 만점으로 평가하고 피드백을 제공해주세요:
1. 답변의 적절성 (40점)
2. 논리적 구성 (30점)
3. 시간 관리 (20점)
4. 표현력 (10점)

다음 JSON 형식으로 답변해주세요:
{{
    "score": 점수(숫자),
    "feedback": "구체적인 피드백과 개선사항"
}}
"""
                    }]
                )
                
                content = response.content[0].text
                
                # JSON 파싱 시도
                try:
                    import json
                    start = content.find('{')
                    end = content.rfind('}') + 1
                    if start != -1 and end != 0:
                        json_str = content[start:end]
                        parsed = json.loads(json_str)
                        return {
                            "score": int(parsed.get("score", 75)),
                            "feedback": parsed.get("feedback", "좋은 답변이었습니다.")
                        }
                except:
                    pass
                    
            except Exception as e:
                print(f"Claude 평가 실패: {e}")
        
        # AI 실패시 스마트 평가 사용
        return self._get_smart_evaluation(question, answer, time_taken, max_time)
    
    def _parse_evaluation(self, text: str, time_taken: int, max_time: int) -> tuple:
        score_match = re.search(r'점수:\s*(\d+)', text)
        feedback_match = re.search(r'피드백:\s*(.+)', text, re.DOTALL)
        
        if score_match:
            score = int(score_match.group(1))
        else:
            score = self._calculate_basic_score(time_taken, max_time)
        
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        else:
            feedback = self._get_default_feedback(score, time_taken, max_time)
        
        return score, feedback
    
    def _calculate_basic_score(self, time_taken: int, max_time: int) -> int:
        if time_taken > max_time:
            return max(40, 80 - (time_taken - max_time) * 2)
        elif time_taken < max_time * 0.3:
            return 60  # 너무 짧은 답변
        else:
            return 75  # 기본 점수
    
    def _get_default_feedback(self, score: int, time_taken: int, max_time: int) -> str:
        feedback = []
        
        if score >= 80:
            feedback.append("좋은 답변이었습니다.")
        elif score >= 60:
            feedback.append("보통 수준의 답변입니다.")
        else:
            feedback.append("답변을 더 구체적으로 해주세요.")
        
        if time_taken > max_time:
            feedback.append("시간 관리에 주의해주세요.")
        elif time_taken < max_time * 0.3:
            feedback.append("좀 더 자세한 설명이 필요합니다.")
        
        return " ".join(feedback)
    
    def _get_smart_evaluation(self, question: str, answer: str, time_taken: int, max_time: int) -> Dict:
        """개선된 규칙 기반 평가 시스템"""
        score = 0
        feedback_parts = []
        
        # 1. 답변 길이 평가 (25점)
        answer_length = len(answer.strip())
        if answer_length < 20:
            score += 10
            feedback_parts.append("답변이 너무 짧습니다. 더 구체적으로 설명해주세요.")
        elif answer_length < 100:
            score += 15
            feedback_parts.append("답변을 좀 더 자세히 설명해주시면 좋겠습니다.")
        elif answer_length < 300:
            score += 25
            feedback_parts.append("적절한 길이의 답변입니다.")
        else:
            score += 20
            feedback_parts.append("답변이 상세하지만 핵심을 간결하게 정리하는 연습이 필요합니다.")
        
        # 2. 키워드 관련성 평가 (35점)
        keyword_score = self._evaluate_keywords(question, answer)
        score += keyword_score
        if keyword_score >= 30:
            feedback_parts.append("질문과 관련된 내용으로 잘 답변하셨습니다.")
        elif keyword_score >= 20:
            feedback_parts.append("질문과 어느 정도 관련된 답변이지만 더 구체적이면 좋겠습니다.")
        else:
            feedback_parts.append("질문의 핵심을 파악하여 더 관련성 있는 답변을 해주세요.")
        
        # 3. 시간 관리 평가 (25점)
        time_score = self._evaluate_time_management(time_taken, max_time)
        score += time_score
        if time_taken > max_time:
            feedback_parts.append("시간 관리에 주의해주세요.")
        elif time_taken < max_time * 0.3:
            feedback_parts.append("시간을 충분히 활용해서 더 자세한 설명을 해주세요.")
        else:
            feedback_parts.append("시간 관리가 적절합니다.")
        
        # 4. 구조적 답변 평가 (15점)
        structure_score = self._evaluate_structure(answer)
        score += structure_score
        if structure_score >= 12:
            feedback_parts.append("답변이 논리적으로 잘 구성되어 있습니다.")
        else:
            feedback_parts.append("답변을 더 체계적으로 구성해보세요.")
        
        feedback = " ".join(feedback_parts)
        
        return {
            "score": min(100, score),
            "feedback": feedback
        }
    
    def _evaluate_keywords(self, question: str, answer: str) -> int:
        """키워드 기반 관련성 평가"""
        # 질문과 답변을 소문자로 변환
        q_lower = question.lower()
        a_lower = answer.lower()
        
        # 기본 키워드 매칭
        common_keywords = []
        question_words = set(q_lower.split())
        answer_words = set(a_lower.split())
        common_keywords = question_words.intersection(answer_words)
        
        # 면접 관련 긍정적 키워드
        positive_keywords = [
            "경험", "프로젝트", "팀", "협업", "문제해결", "학습", "성장", "도전",
            "성과", "개선", "혁신", "창의", "리더십", "소통", "책임", "열정",
            "goal", "achieve", "success", "team", "project", "experience"
        ]
        
        positive_count = sum(1 for keyword in positive_keywords if keyword in a_lower)
        
        # 점수 계산
        base_score = min(20, len(common_keywords) * 3)
        positive_score = min(15, positive_count * 2)
        
        return base_score + positive_score
    
    def _evaluate_time_management(self, time_taken: int, max_time: int) -> int:
        """시간 관리 평가"""
        ratio = time_taken / max_time
        
        if ratio > 1.2:  # 20% 초과
            return 5
        elif ratio > 1.0:  # 시간 초과
            return 15
        elif ratio >= 0.7:  # 적절한 시간 사용
            return 25
        elif ratio >= 0.3:  # 빠른 답변
            return 20
        else:  # 너무 빠른 답변
            return 10
    
    def _evaluate_structure(self, answer: str) -> int:
        """답변 구조 평가"""
        score = 0
        
        # 문장 개수 확인
        sentences = [s.strip() for s in answer.split('.') if s.strip()]
        if len(sentences) >= 3:
            score += 5
        
        # 연결어 사용 확인
        connectors = ['그래서', '따라서', '또한', '하지만', '그러나', '예를 들어', '결과적으로']
        if any(conn in answer for conn in connectors):
            score += 5
        
        # 구체적 사례 언급
        examples = ['경험', '프로젝트', '사례', '예시', '때', '상황']
        if any(ex in answer for ex in examples):
            score += 5
        
        return score
    
    def _get_default_evaluation(self, answer: str, time_taken: int, max_time: int) -> Dict:
        """기존 기본 평가 (백업용)"""
        answer_length = len(answer.strip())
        
        if answer_length < 10:
            score = 30
            feedback = "답변이 너무 짧습니다. 더 구체적으로 설명해주세요."
        elif answer_length > 500:
            score = 70
            feedback = "답변이 길지만 핵심을 간결하게 정리하는 연습이 필요합니다."
        else:
            score = self._calculate_basic_score(time_taken, max_time)
            feedback = self._get_default_feedback(score, time_taken, max_time)
        
        return {
            "score": score,
            "feedback": feedback
        }