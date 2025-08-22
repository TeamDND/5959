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
    print("OpenAI API 키가 설정되었습니다.")
else:
    print("OpenAI API 키가 설정되지 않았습니다. 이미지 분석 기능을 사용할 수 없습니다.")

# API 키 확인
if not os.getenv('OPENAI_API_KEY'):
    print("OpenAI API 키가 설정되지 않았습니다!")
    print("환경변수 OPENAI_API_KEY를 설정해주세요.")
else:
    print("OpenAI API 키가 설정되었습니다.")

def call_ai_service(prompt):
    """AI 서비스 호출 함수"""
    try:
        if not client:
            return "AI 서비스를 사용할 수 없습니다. API 키를 확인해주세요."
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 전문적인 콘텐츠 분석가입니다. 요청받은 내용을 정확하고 구조화된 형태로 분석해주세요."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=4000,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"AI 서비스 호출 오류: {str(e)}")
        return f"AI 서비스 호출 중 오류가 발생했습니다: {str(e)}"

def extract_text_from_image(image_data):
    """이미지에서 텍스트 추출"""
    try:
        if not client:
            return "OpenAI API 키가 설정되지 않았습니다."
        
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
                            "text": "이 이미지에서 모든 텍스트를 정확히 추출해주세요. 이미지에 있는 모든 글자, 숫자, 기호, 표, 그래프의 텍스트를 포함하여 모든 텍스트를 그대로 반환해주세요. 텍스트가 여러 줄이나 여러 섹션에 있다면 구조를 유지하여 추출해주세요. 길이 제한 없이 모든 텍스트를 추출해주세요. 이미지에 텍스트가 전혀 없다면 '텍스트가 없습니다'라고 답변해주세요."
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
            max_tokens=4000
        )
        
        extracted_text = response.choices[0].message.content
        
        # 디버깅을 위한 로그
        print(f"=== 텍스트 추출 결과 ===")
        print(f"추출된 텍스트: {extracted_text}")
        print(f"=======================")
        
        # 텍스트가 없거나 "텍스트가 없습니다"라는 메시지인 경우
        if not extracted_text.strip() or "텍스트가 없습니다" in extracted_text:
            print("텍스트 추출 실패 - None 반환")
            return None  # None을 반환하여 실패를 명확히 표시
        
        print("텍스트 추출 성공")
        return extracted_text
        
    except Exception as e:
        print(f"이미지 텍스트 추출 오류: {str(e)}")
        return None

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
                            "text": "이 이미지를 분석하고 다음 형식으로 답변해주세요:\n\n📊 **내용 분류**: [다음 중 하나 선택]\n- 📚 공부/학습 내용 (수업 노트, 교재, 문제집, 개념 정리 등)\n- 📰 뉴스/기사 내용 (신문, 잡지, 온라인 기사 등)\n- 📄 문서/서류 (공문서, 계약서, 보고서 등)\n- 💼 업무/회사 내용 (회의록, 업무 자료 등)\n- 🏠 개인/일상 내용 (일기, 메모, 개인 기록 등)\n- ❓ 기타/분류 불가\n\n🔍 **분류 근거**: [왜 이 분류를 선택했는지 설명]\n\n📋 **주요 내용**: [핵심 내용 요약 - 이미지에 있는 모든 텍스트를 포함하여 상세하게 설명]\n\n📚 **공부 내용 정리** (공부/학습 내용으로 분류된 경우에만 반드시 작성):\n- 🎯 핵심 개념: [이미지에서 발견된 중요한 개념, 용어, 인물, 사건 등을 나열]\n- 📝 요약 노트: [이미지의 내용을 이해하기 쉽게 체계적으로 정리]\n- ❓ 질문/확인사항: [이 내용과 관련해서 더 알아보면 좋을 질문이나 확인이 필요한 부분]\n- 🔗 관련 주제: [이 내용과 연관된 다른 학습 주제나 배경 지식]\n\n⚠️ 매우 중요: 공부/학습 내용으로 분류했다면 반드시 위의 4가지 항목을 모두 구체적으로 작성해주세요. 빈 항목으로 두지 마세요! 각 항목에 실제 내용을 반드시 포함해주세요!"
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
            max_tokens=4000
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
        in_main_content = False
        
        for line in lines:
            line_stripped = line.strip()
            
            if line.startswith('📊 **내용 분류**') or '📊' in line and '내용 분류' in line:
                classification_info += line + '\n'
                # 공부/학습 내용인지 확인
                if '📚 공부/학습 내용' in line or '공부' in line or '학습' in line:
                    is_study_content = True
            elif line.startswith('🔍 **분류 근거**') or '🔍' in line and '분류 근거' in line:
                classification_info += line + '\n'
            elif line.startswith('📋 **주요 내용**') or '📋' in line and '주요 내용' in line:
                # 주요 내용 섹션 시작
                in_main_content = True
                main_content_line = line.replace('📋 **주요 내용**: ', '').replace('📋 **주요 내용**:', '').replace('📋', '').replace('**주요 내용**', '').replace(':', '').strip()
                if main_content_line:
                    main_content += main_content_line + ' '
            elif in_main_content and not line.startswith('📚') and not line.startswith('📊') and not line.startswith('🔍') and line_stripped:
                # 주요 내용 섹션 내의 텍스트
                main_content += line_stripped + ' '
            elif line.startswith('📚 **공부 내용 정리**') or '📚' in line and '공부 내용 정리' in line:
                in_study_notes = True
                in_main_content = False
                study_notes += line + '\n'
                is_study_content = True  # 공부 내용 정리가 있으면 학습 내용으로 판단
            elif in_study_notes and (line.startswith('- 🎯') or line.startswith('- 📝') or line.startswith('- ❓') or line.startswith('- 🔗') or line_stripped.startswith('-') or line_stripped):
                study_notes += line + '\n'
            elif in_study_notes and line_stripped == '':
                study_notes += line + '\n'
            elif in_study_notes and not line.startswith('📊') and not line.startswith('🔍') and not line.startswith('📋'):
                # 공부 내용 정리 섹션 내의 일반 텍스트도 포함
                study_notes += line + '\n'
        
        # main_content가 비어있는 경우 전체 텍스트를 사용
        if not main_content.strip():
            # 공부 내용 정리가 있으면 그것을 main_content로 사용
            if study_notes.strip():
                main_content = "이미지에서 학습 내용을 추출했습니다. 상세 내용은 아래 학습 노트를 참조하세요."
                is_study_content = True
            else:
                # 그것도 없으면 전체 텍스트를 요약해서 사용
                main_content = extracted_text[:300] + ('...' if len(extracted_text) > 300 else '')
        
        # 결과 구성
        result = {
            'classification': classification_info.strip() if classification_info.strip() else '이미지 텍스트',
            'main_content': main_content.strip(),
            'is_study_content': is_study_content,
            'study_notes': study_notes.strip() if is_study_content else ""
        }
        
        print(f"=== 파싱 결과 ===")
        print(f"classification: {result['classification']}")
        print(f"main_content: {result['main_content'][:100]}...")
        print(f"is_study_content: {result['is_study_content']}")
        print(f"study_notes length: {len(result['study_notes'])}")
        print("==================")
        
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

def analyze_content_api():
    """콘텐츠 분석 API 엔드포인트 로직"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        content_type = data.get('type', 'text')
        analysis_type = data.get('analysisType', 'general')
        
        if content_type == 'text' and 'text' in data and data['text']:
            # 텍스트 분석
            result = analyze_text_logic(data['text'], analysis_type)
            return jsonify({'summary': result, 'type': 'text'})
            
        elif content_type == 'image' and 'image' in data and data['image']:
            # 이미지 분석
            result = analyze_image_logic(data['image'], analysis_type)
            return jsonify({'summary': result, 'type': 'image'})
            
        elif content_type == 'link' and 'link' in data and data['link']:
            # 링크 분석
            result = analyze_link_logic(data['link'], analysis_type)
            return jsonify({'summary': result, 'type': 'link'})
            
        else:
            return jsonify({'error': '올바른 콘텐츠 타입과 데이터가 필요합니다.'}), 400
            
    except Exception as e:
        print(f"콘텐츠 분석 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

def analyze_text_logic(text, analysis_type='general'):
    """텍스트 분석 로직"""
    try:
        # 분석 유형에 따른 프롬프트 생성
        if analysis_type == 'business':
            prompt = f"""
다음 텍스트를 비즈니스 관점에서 분석해주세요:

텍스트: {text}

다음 형식으로 JSON 응답해주세요:
{{
    "classification": "비즈니스 분류 (예: 기업 소개, 시장 분석, 전략 등)",
    "main_content": "주요 내용 요약",
    "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
    "sentiment": "감정 분석 (긍정/부정/중립)",
    "business_info": "비즈니스 관련 정보",
    "recommendations": ["추천사항 1", "추천사항 2"]
}}
"""
        elif analysis_type == 'study':
            prompt = f"""
다음 텍스트를 학습 관점에서 분석해주세요:

텍스트: {text}

다음 형식으로 JSON 응답해주세요:
{{
    "classification": "학습 분류 (예: 개념 설명, 실습 가이드, 이론 등)",
    "main_content": "주요 내용 요약",
    "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
    "sentiment": "감정 분석 (긍정/부정/중립)",
    "study_notes": "학습 노트 형태로 정리",
    "recommendations": ["학습 추천사항 1", "학습 추천사항 2"]
}}
"""
        elif analysis_type == 'news':
            prompt = f"""
다음 텍스트를 뉴스 관점에서 분석해주세요:

텍스트: {text}

다음 형식으로 JSON 응답해주세요:
{{
    "classification": "뉴스 분류 (예: 경제, 기술, 사회, 정치 등)",
    "main_content": "주요 내용 요약",
    "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
    "sentiment": "감정 분석 (긍정/부정/중립)",
    "impact_analysis": "영향도 분석",
    "recommendations": ["관련 추천사항 1", "관련 추천사항 2"]
}}
"""
        else:  # general
            prompt = f"""
다음 텍스트를 일반적인 관점에서 분석해주세요:

텍스트: {text}

다음 형식으로 JSON 응답해주세요:
{{
    "classification": "내용 분류",
    "main_content": "주요 내용 요약",
    "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
    "sentiment": "감정 분석 (긍정/부정/중립)",
    "recommendations": ["추천사항 1", "추천사항 2"]
}}
"""
        
        # AI 서비스 호출
        response = call_ai_service(prompt)
        
        # JSON 파싱
        try:
            import json
            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            # JSON 파싱 실패 시 기본 구조로 반환
            return {
                "classification": "일반 텍스트",
                "main_content": response,
                "key_points": [],
                "sentiment": "중립",
                "recommendations": []
            }
            
    except Exception as e:
        print(f"텍스트 분석 오류: {str(e)}")
        return {
            "classification": "분석 오류",
            "main_content": "텍스트 분석 중 오류가 발생했습니다.",
            "key_points": [],
            "sentiment": "중립",
            "recommendations": []
        }

def analyze_image_logic(image_data, analysis_type='general'):
    """이미지 분석 로직"""
    try:
        print("=== 이미지 분석 시작 ===")
        
        # 바로 GPT Vision으로 전체 이미지 분석 진행
        vision_result = summarize_image_logic(image_data)
        
        # 에러가 있는 경우 기본 값 반환
        if 'error' in vision_result:
            return {
                "classification": "이미지 텍스트",
                "main_content": "죄송하지만 이 이미지의 텍스트를 추출해 드릴 수 없습니다. 이미지의 해상도가 충분하지 않거나 텍스트가 너무 작아서 인식하기 어려울 수 있습니다.",
                "is_study_content": False,
                "study_notes": "",
                "key_points": [],
                "sentiment": "중립",
                "business_info": ""
            }
        
        # GPT Vision 결과를 분석 형식에 맞게 변환
        return {
            "classification": "이미지 텍스트",
            "main_content": vision_result.get('main_content', '이미지 분석을 완료했습니다.'),
            "is_study_content": vision_result.get('is_study_content', False),
            "study_notes": vision_result.get('study_notes', ''),
            "key_points": [],
            "sentiment": "중립",
            "business_info": ""
        }
            
    except Exception as e:
        print(f"이미지 분석 오류: {str(e)}")
        return {
            "classification": "분석 오류",
            "main_content": "이미지 분석 중 오류가 발생했습니다.",
            "is_study_content": False,
            "study_notes": "",
            "key_points": [],
            "sentiment": "중립",
            "business_info": ""
        }

def analyze_link_logic(url, analysis_type='general'):
    """링크 분석 로직"""
    try:
        import requests
        from bs4 import BeautifulSoup
        
        # 웹페이지 내용 가져오기
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 제목 추출
        title = soup.find('title')
        title_text = title.get_text().strip() if title else "제목 없음"
        
        # 메타 설명 추출
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        description = meta_desc.get('content', '') if meta_desc else ""
        
        # 본문 텍스트 추출 (간단한 방법)
        body = soup.find('body')
        if body:
            # 스크립트와 스타일 태그 제거
            for script in body(["script", "style"]):
                script.decompose()
            
            main_text = body.get_text()
            # 텍스트 정리
            lines = (line.strip() for line in main_text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            main_text = ' '.join(chunk for chunk in chunks if chunk)
            
            # 텍스트 길이 제한
            if len(main_text) > 2000:
                main_text = main_text[:2000] + "..."
        else:
            main_text = "본문을 추출할 수 없습니다."
        
        # 분석 유형에 따른 프롬프트 생성
        if analysis_type == 'business':
            prompt = f"""
다음 웹페이지를 비즈니스 관점에서 분석해주세요:

URL: {url}
제목: {title_text}
설명: {description}
본문: {main_text}

다음 형식으로 JSON 응답해주세요:
{{
    "title": "페이지 제목",
    "description": "페이지 설명",
    "company_info": "기업 정보",
    "key_insights": ["핵심 인사이트 1", "핵심 인사이트 2"],
    "market_analysis": "시장 분석",
    "recommendations": ["추천사항 1", "추천사항 2"]
}}
"""
        else:  # general
            prompt = f"""
다음 웹페이지를 일반적인 관점에서 분석해주세요:

URL: {url}
제목: {title_text}
설명: {description}
본문: {main_text}

다음 형식으로 JSON 응답해주세요:
{{
    "title": "페이지 제목",
    "description": "페이지 설명",
    "company_info": "기업 정보 (해당하는 경우)",
    "key_insights": ["핵심 인사이트 1", "핵심 인사이트 2"],
    "market_analysis": "시장 분석 (해당하는 경우)",
    "recommendations": ["추천사항 1", "추천사항 2"]
}}
"""
        
        # AI 서비스 호출
        response = call_ai_service(prompt)
        
        try:
            import json
            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            return {
                "title": title_text,
                "description": description,
                "company_info": "",
                "key_insights": [],
                "market_analysis": "",
                "recommendations": []
            }
            
    except Exception as e:
        print(f"링크 분석 오류: {str(e)}")
        return {
            "title": "분석 오류",
            "description": "링크 분석 중 오류가 발생했습니다.",
            "company_info": "",
            "key_insights": [],
            "market_analysis": "",
            "recommendations": []
        }