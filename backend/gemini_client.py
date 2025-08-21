import os
import json
import requests
from typing import Optional
from config import GEMINI_API_URL, GEMINI_API_KEY

class GeminiClient:
    def __init__(self):
        self.api_url = GEMINI_API_URL
        self.api_key = GEMINI_API_KEY
        
    def call_gemini_api(self, prompt: str) -> str:
        """
        Gemini API를 호출하여 공감 기반의 응답을 받는 함수입니다.
        """
        url = f"{self.api_url}/gemini-1.5-flash:generateContent?key={self.api_key}"
        headers = {
            'Content-Type': 'application/json'
        }
        
        # 공감과 위로에 초점을 맞춘 프롬프트
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"너는 따뜻한 멘탈 관리 챗봇이야. 사용자의 감정을 깊이 이해하고 공감하는 답변을 해주고, 그다음에 따뜻한 위로와 응원의 메시지를 전달해줘. 답변은 감정을 보듬는 공감의 말과 마음을 다독이는 위로의 말을 포함하는 1~2문장으로 구성해줘. 사용자의 이야기는 다음과 같아: '{prompt}'"}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "empathy": { "type": "STRING" },
                        "comfort": { "type": "STRING" }
                    }
                }
            }
        }
        
        try:
            print("Gemini API 호출을 시도합니다...")
            
            # 실제 API 호출 로직
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()  # HTTP 에러 발생 시 예외 처리
            
            result = response.json()
            raw_json_string = result['candidates'][0]['content']['parts'][0]['text']
            parsed_data = json.loads(raw_json_string)
            
            # 공감과 위로를 합친 문자열 반환
            return f"{parsed_data['empathy']} {parsed_data['comfort']}"
            
        except requests.exceptions.RequestException as e:
            print(f"Gemini API 호출 중 에러 발생: {e}")
            return "죄송해요, 지금 응답하기 어려워요. 잠시 후 다시 시도해주세요."
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 에러: {e}")
            return "죄송해요, 응답 형식이 올바르지 않습니다."
        except KeyError as e:
            print(f"응답 데이터에서 키를 찾을 수 없음: {e}")
            return "죄송해요, 응답 데이터에 문제가 있습니다."
        except Exception as e:
            print(f"예기치 못한 에러 발생: {e}")
            return "죄송해요, 알 수 없는 에러가 발생했습니다."

    def analyze_emotion_and_respond(self, user_message: str, is_first_message: bool = False) -> dict:
        """
        사용자 메시지를 분석하고 감정에 맞는 응답을 생성
        """
        try:
            # 프롬프트 구성
            system_prompt = """
            당신은 수강생들의 멘탈 케어를 담당하는 따뜻한 상담사입니다.
            
            역할:
            1. 사용자의 감정 상태를 파악하세요 (happy, sad, angry, anxious, neutral 중 하나)
            2. 감정에 맞는 공감적인 응답을 하세요
            3. 적절한 명언이나 격려 메시지를 포함하세요
            
            응답 형식:
            {
                "emotion": "감정상태",
                "response": "공감적인 응답 메시지",
                "quote": "관련 명언 (선택사항)"
            }
            
            주의사항:
            - 따뜻하고 공감적인 톤을 유지하세요
            - 구체적인 조언보다는 경청과 격려에 집중하세요
            - 전문적인 심리 상담이 필요한 경우 전문가 상담을 권유하세요
            """
            
            full_prompt = f"{system_prompt}\n\n사용자 메시지: {user_message}"
            
            # Gemini API 호출
            gemini_response = self.call_gemini_api(full_prompt)
            
            # 응답 파싱 시도
            try:
                # JSON 형태로 응답이 올 경우 파싱
                response_text = gemini_response
                
                # JSON 형태가 아닐 경우 기본 구조로 변환
                if not response_text.strip().startswith('{'):
                    # 모든 응답에 "오구오구 그랬구나" 추가
                    if "오구오구 그랬구나" not in response_text:
                        response_text = f"오구오구 그랬구나, {response_text}"
                    
                    return {
                        "emotion": "neutral",
                        "response": response_text,
                        "quote": None
                    }
                
                parsed_response = json.loads(response_text)
                
                # JSON 응답에도 "오구오구 그랬구나" 추가
                if "오구오구 그랬구나" not in parsed_response.get("response", ""):
                    parsed_response["response"] = f"오구오구 그랬구나, {parsed_response.get('response', '')}"
                
                return parsed_response
                
            except (json.JSONDecodeError, AttributeError):
                # JSON 파싱 실패 시 기본 응답 구조로 반환
                response_text = gemini_response if gemini_response else "죄송해요, 다시 한번 말씀해 주실 수 있을까요?"
                
                # 모든 응답에 "오구오구 그랬구나" 추가
                if "오구오구 그랬구나" not in response_text:
                    response_text = f"오구오구 그랬구나, {response_text}"
                
                return {
                    "emotion": "neutral",
                    "response": response_text,
                    "quote": None
                }
                
        except Exception as e:
            # API 오류 시 기본 응답
            error_response = "죄송해요, 지금 생각을 정리하느라 시간이 필요해요. 다시 한번 말씀해 주실 수 있을까요?"
            error_response = f"오구오구 그랬구나, {error_response}"
            
            return {
                "emotion": "neutral",
                "response": error_response,
                "quote": None,
                "error": str(e)
            }

# 전역 클라이언트 인스턴스
gemini_client = None

def get_gemini_client() -> Optional[GeminiClient]:
    """
    Gemini 클라이언트 인스턴스를 가져오는 함수
    """
    global gemini_client
    try:
        if gemini_client is None:
            gemini_client = GeminiClient()
        return gemini_client
    except Exception as e:
        print(f"Gemini client initialization error: {e}")
        return None