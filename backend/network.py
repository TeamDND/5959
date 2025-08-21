from flask import request, jsonify
import openai
import os
from dotenv import load_dotenv

load_dotenv()

def networking_ai():
    """네트워킹 AI API - LinkedIn 메시지, 이메일 템플릿, 시뮬레이션 생성"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        ai_type = data.get('type')  # linkedin, email, simulation
        user_input = data.get('input', '')
        user_context = data.get('user_context', {})
        
        if not ai_type or not user_input:
            return jsonify({'error': '타입과 입력이 필요합니다.'}), 400
        
        # OpenAI 클라이언트 가져오기
        api_key = os.getenv("SECRET_KEY")
        if not api_key:
            return jsonify({'error': 'OpenAI 서비스를 사용할 수 없습니다. API 키를 확인해주세요.'}), 500
        
        openai_client = openai.OpenAI(api_key=api_key)
        
        # AI 프롬프트 생성
        prompt = generate_networking_prompt(ai_type, user_input, user_context)
        
        # OpenAI API 호출
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 취업준비생을 위한 전문적인 네트워킹 어시스턴트입니다. 정중하고 실용적인 조언을 한국어로 제공해주세요."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        ai_response = response.choices[0].message.content
        
        return jsonify({
            'success': True,
            'result': ai_response,
            'provider': 'OpenAI GPT-4o-mini',
            'type': ai_type
        })
        
    except Exception as e:
        print(f"네트워킹 AI 처리 중 에러 발생: {e}")
        return jsonify({'error': str(e)}), 500

def generate_networking_prompt(ai_type, user_input, user_context):
    """네트워킹 AI 프롬프트 생성"""
    user_name = user_context.get('name', '김준혁')
    
    base_prompt = f"""
당신은 취업준비생을 위한 네트워킹 전문가입니다.
사용자 이름: {user_name}
요청 타입: {ai_type}
사용자 입력: {user_input}

다음 지침에 따라 응답해주세요:
"""
    
    if ai_type == 'linkedin':
        prompt = base_prompt + f"""
LinkedIn 메시지를 작성해주세요:
1. 정중하고 전문적인 톤 유지
2. 사용자의 상황에 맞는 개인화된 내용
3. 명확한 목적과 요청사항 포함
4. 150-200자 내외로 작성
5. 한국어로 작성

형식:
안녕하세요.
[자기소개]
[연락 이유]
[구체적 요청]
[마무리 인사]
{user_name} 드림
"""
    
    elif ai_type == 'email':
        prompt = base_prompt + f"""
이메일 템플릿을 작성해주세요:
1. 적절한 제목 라인 포함
2. 정중하고 비즈니스 적절한 톤
3. 명확한 목적과 요청사항
4. 구체적이고 실용적인 내용
5. 한국어로 작성

형식:
제목: [구체적인 제목]

안녕하세요,
[인사 및 자기소개]
[메일 목적 설명]
[구체적 요청사항]
[마무리 및 감사인사]

{user_name}
"""
    
    elif ai_type == 'simulation':
        prompt = base_prompt + f"""
네트워킹 시뮬레이션을 만들어주세요:
1. 상황 설정 명확히 제시
2. 상대방의 예상 대화 내용
3. 추천 응답 방법
4. 실용적인 대화 팁 5개
5. 한국어로 작성

형식:
🎯 네트워킹 시뮬레이션

**상황**: [상황 설명]
**상대방**: "[예상 대화]"
**추천 응답**: "[구체적 응답 예시]"

**대화 전략**:
✓ [팁 1]
✓ [팁 2]  
✓ [팁 3]
✓ [팁 4]
✓ [팁 5]

**주의사항**: [추가 조언]
"""
    
    else:
        prompt = base_prompt + "요청하신 내용에 대해 도움을 드리겠습니다."
    
    return prompt
