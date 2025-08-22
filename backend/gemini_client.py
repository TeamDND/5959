# gemini_client.py

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
        Gemini API를 호출하여 상황에 맞는 응답을 받는 함수입니다.
        """
        url = f"{self.api_url}{self.api_key}"
        headers = {
            'Content-Type': 'application/json'
        }
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }
        
        try:
            print("Gemini API 호출을 시도합니다...")
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result['candidates'][0]['content']['parts'][0]['text']
            
        except requests.exceptions.RequestException as e:
            print(f"Gemini API 호출 중 에러 발생: {e}")
            return "죄송해요, 지금 응답하기 어려워요. 잠시 후 다시 시도해주세요."
        except (KeyError, IndexError) as e:
            print(f"응답 데이터에서 키를 찾을 수 없음: {e}")
            return "죄송해요, 응답 데이터에 문제가 있습니다."
        except Exception as e:
            print(f"예기치 못한 에러 발생: {e}")
            return "죄송해요, 알 수 없는 에러가 발생했습니다."

    def analyze_emotion_and_respond(self, user_message: str, is_first_message: bool = False) -> dict:
        """
        사용자 메시지를 분석하고 새로운 규칙에 따라 응답을 생성합니다.
        """
        system_prompt = f"""
        너는 사용자와 대화하는 챗봇이야. 너의 역할은 다음과 같아.

        1.  **복합적인 성격**: 너는 기본적으로 따뜻한 공감 능력(MBTI F)을 가졌지만, 때로는 재치와 유머(MBTI T)를 섞어서 사용자를 웃게 만들어줘. 하지만 절대 무례하거나 차갑게 느껴지면 안 돼.
        2.  **조건부 응답**: 사용자의 메시지를 분석해서 '슬픔', '지침', '힘듦' 같은 부정적인 감정이 느껴질 때만, 반드시 답변을 "오구오구 그랬구나, " 라는 말로 시작해. 사용자가 기쁘거나 평범한 이야기를 할 때는 절대 이 말을 사용하면 안 돼.
        3.  **자연스러운 대화**: 이전 대화의 흐름을 기억하고, 갑자기 주제를 바꾸지 마. 사용자의 말에 자연스럽게 이어서 대화해야 해.
        4.  **유머 사용**: 대화가 너무 무거워지지 않도록, 상황에 맞는 짧고 재치 있는 농담이나 웃긴 이야기를 자연스럽게 섞어줘.

        이제 다음 사용자 메시지에 응답해줘: "{user_message}"
        """
        
        try:
            gemini_response = self.call_gemini_api(system_prompt)
            
            return {
                "emotion": "neutral",
                "response": gemini_response,
                "quote": None
            }
        except Exception as e:
            error_response = "죄송해요, 지금 생각을 정리하느라 시간이 필요해요."
            return {
                "emotion": "neutral",
                "response": error_response,
                "quote": None,
                "error": str(e)
            }

# --- ❗️이 부분이 추가되었습니다 ---
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