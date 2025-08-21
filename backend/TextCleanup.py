from flask import request, jsonify
import os
from PIL import Image
# from transformers import pipeline
import base64
import io
from dotenv import load_dotenv
from openai import OpenAI

# .env 파일 로드
load_dotenv()

# OpenAI 클라이언트 초기화
api_key = os.getenv('OPENAI_API_KEY')
client = None
if api_key:
    client = OpenAI(api_key=api_key)
    print("✅ OpenAI API 키가 설정되었습니다.")
else:
    print("⚠️ OpenAI API 키가 설정되지 않았습니다. 이미지 분석 기능을 사용할 수 없습니다.")

# API 키 확인
if not os.getenv('OPENAI_API_KEY'):
    print("⚠️ OpenAI API 키가 설정되지 않았습니다!")
    print("환경변수 OPENAI_API_KEY를 설정해주세요.")
else:
    print("✅ OpenAI API 키가 설정되었습니다.")

def summarize_text_logic(text):
    """텍스트 요약 로직"""
    if len(text) < 50:
        return text
    
    # 텍스트를 청크로 나누기 (모델 제한 고려)
    max_length = 1024
    if len(text) > max_length:
        text = text[:max_length]
    
    # 간단한 텍스트 요약 로직
    text_length = len(text)
    if text_length < 200:
        # 짧은 텍스트는 그대로 반환
        result = text
    else:
        # 긴 텍스트는 첫 200자 + "..." 반환
        result = text[:200] + "..."
    
    return result

def summarize_image_logic(image_data):
    """이미지 요약 로직"""
    try:
        # OpenAI 클라이언트 확인
        if not client:
            return {'error': 'OpenAI API 키가 설정되지 않았습니다. 이미지 분석을 사용할 수 없습니다.'}
        
        # base64 데이터 부분만 추출
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # OpenAI GPT Vision으로 텍스트 추출
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "이 이미지를 분석하고 다음 형식으로 답변해주세요:\n\n📊 **내용 분류**: [다음 중 하나 선택]\n- 📚 공부/학습 내용 (수업 노트, 교재, 문제집, 개념 정리 등)\n- 📰 뉴스/기사 내용 (신문, 잡지, 온라인 기사 등)\n- 📄 문서/서류 (공문서, 계약서, 보고서 등)\n- 💼 업무/회사 내용 (회의록, 업무 자료 등)\n- 🏠 개인/일상 내용 (일기, 메모, 개인 기록 등)\n- ❓ 기타/분류 불가\n\n🔍 **분류 근거**: [왜 이 분류를 선택했는지 설명]\n\n📋 **주요 내용**: [핵심 내용 요약]\n\n📚 **공부 내용 정리** (공부/학습 내용으로 분류된 경우에만 반드시 작성):\n- 🎯 핵심 개념: [이미지에서 발견된 중요한 개념, 용어, 인물, 사건 등을 나열]\n- 📝 요약 노트: [이미지의 내용을 이해하기 쉽게 체계적으로 정리]\n- ❓ 질문/확인사항: [이 내용과 관련해서 더 알아보면 좋을 질문이나 확인이 필요한 부분]\n- 🔗 관련 주제: [이 내용과 연관된 다른 학습 주제나 배경 지식]\n\n⚠️ 매우 중요: 공부/학습 내용으로 분류했다면 반드시 위의 4가지 항목을 모두 구체적으로 작성해주세요. 빈 항목으로 두지 마세요! 각 항목에 실제 내용을 반드시 포함해주세요!"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000
        )
        extracted_text = response.choices[0].message.content
        
        # 디버깅을 위한 로그 추가
        print("=== GPT Vision 응답 ===")
        print(extracted_text)
        print("======================")
        
        if not extracted_text.strip():
            return {'error': '이미지에서 텍스트를 추출할 수 없습니다.'}
        
        # GPT Vision 분석 결과를 구조화하여 반환
        lines = extracted_text.split('\n')
        classification_info = ""
        main_content = ""
        study_notes = ""
        is_study_content = False
        in_study_notes = False
        
        for line in lines:
            if line.startswith('📊 **내용 분류**') or line.startswith('🔍 **분류 근거**'):
                classification_info += line + '\n'
                # 공부/학습 내용인지 확인
                if '📚 공부/학습 내용' in line:
                    is_study_content = True
            elif line.startswith('📋 **주요 내용**'):
                main_content = line.replace('📋 **주요 내용**: ', '')
            elif line.startswith('📚 **공부 내용 정리**'):
                in_study_notes = True
                study_notes += line + '\n'
            elif in_study_notes and (line.startswith('- 🎯 핵심 개념') or line.startswith('- 📝 요약 노트') or line.startswith('- ❓ 질문/확인사항') or line.startswith('- 🔗 관련 주제') or line.strip().startswith('-') or line.strip()):
                study_notes += line + '\n'
            elif in_study_notes and line.strip() == '':
                study_notes += line + '\n'
            elif in_study_notes and not line.startswith('📊') and not line.startswith('🔍') and not line.startswith('📋'):
                # 공부 내용 정리 섹션 내의 일반 텍스트도 포함
                study_notes += line + '\n'
        
        # 결과 구성
        result = {
            'classification': classification_info.strip(),
            'main_content': main_content.strip(),
            'is_study_content': is_study_content,
            'study_notes': study_notes.strip() if is_study_content else ""
        }
        
        return result
        
    except Exception as e:
        print(f"이미지 분석 오류: {str(e)}")
        return {'error': f'이미지 분석 중 오류가 발생했습니다: {str(e)}'}

def generate_image_logic(content):
    """이미지 생성 로직 - HTML/CSS로 한글 노트 생성"""
    try:
        # HTML 템플릿 생성
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }}
        .study-note {{
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 800px;
            width: 100%;
        }}
        .title {{
            text-align: center;
            color: #333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 30px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }}
        .section {{
            margin-bottom: 25px;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid;
        }}
        .section h3 {{
            margin: 0 0 15px 0;
            font-size: 18px;
            font-weight: bold;
        }}
        .section p {{
            margin: 5px 0;
            line-height: 1.6;
            color: #555;
        }}
        .concepts {{
            background: #f0f8ff;
            border-left-color: #4CAF50;
        }}
        .summary {{
            background: #fff8e1;
            border-left-color: #FF9800;
        }}
        .questions {{
            background: #f3e5f5;
            border-left-color: #9C27B0;
        }}
        .related {{
            background: #e8f5e8;
            border-left-color: #2196F3;
        }}
        .icon {{
            font-size: 20px;
            margin-right: 10px;
        }}
    </style>
</head>
<body>
    <div class="study-note">
        <div class="title">📚 학습 노트</div>
        
        <div class="section concepts">
            <h3><span class="icon">🎯</span>핵심 개념</h3>
            <p>{content.split('🎯 핵심 개념:')[1].split('- 📝 요약 노트:')[0].replace('- ', '• ').strip() if '🎯 핵심 개념:' in content else '핵심 개념이 없습니다.'}</p>
        </div>
        
        <div class="section summary">
            <h3><span class="icon">📝</span>요약 노트</h3>
            <p>{content.split('- 📝 요약 노트:')[1].split('- ❓ 질문/확인사항:')[0].replace('- ', '• ').strip() if '- 📝 요약 노트:' in content else '요약 노트가 없습니다.'}</p>
        </div>
        
        <div class="section questions">
            <h3><span class="icon">❓</span>질문/확인사항</h3>
            <p>{content.split('- ❓ 질문/확인사항:')[1].split('- 🔗 관련 주제:')[0].replace('- ', '• ').strip() if '- ❓ 질문/확인사항:' in content else '질문/확인사항이 없습니다.'}</p>
        </div>
        
        <div class="section related">
            <h3><span class="icon">🔗</span>관련 주제</h3>
            <p>{content.split('- 🔗 관련 주제:')[1].strip() if '- 🔗 관련 주제:' in content else '관련 주제가 없습니다.'}</p>
        </div>
    </div>
</body>
</html>
"""
        
        # HTML을 base64로 인코딩하여 데이터 URL 생성
        import base64
        html_bytes = html_content.encode('utf-8')
        html_base64 = base64.b64encode(html_bytes).decode('utf-8')
        
        # 데이터 URL 생성
        data_url = f"data:text/html;base64,{html_base64}"
        
        return {'image': data_url, 'type': 'html'}
        
    except Exception as e:
        print(f"이미지 생성 오류: {str(e)}")
        return {'error': f'이미지 생성 중 오류가 발생했습니다: {str(e)}'}

def summarize_api():
    """요약 API 엔드포인트 로직"""
    try:
        data = request.get_json()
        
        if 'text' in data and data['text']:
            # 텍스트 요약
            result = summarize_text_logic(data['text'])
            return jsonify({'summary': result, 'type': 'text'})
            
        elif 'image' in data and data['image']:
            # 이미지에서 텍스트 추출 후 요약
            result = summarize_image_logic(data['image'])
            return jsonify({'summary': result, 'type': 'image'})
            
        else:
            return jsonify({'error': '텍스트 또는 이미지가 필요합니다.'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_image_api():
    """이미지 생성 API 엔드포인트 로직"""
    try:
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({'error': '생성할 내용이 필요합니다.'}), 400
        
        content = data['content']
        
        # AI 서비스로 이미지 생성
        result = generate_image_logic(content)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 400
        
        return jsonify({
            'image': result['image'],
            'message': '이미지가 성공적으로 생성되었습니다.'
        })
        
    except Exception as e:
        print(f"이미지 생성 오류: {str(e)}")
        return jsonify({'error': f'이미지 생성 중 오류가 발생했습니다: {str(e)}'}), 500