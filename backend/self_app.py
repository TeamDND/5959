import io
import base64
from flask import Blueprint, jsonify, request
from PIL import Image
import pytesseract

from config import CLIENT, OPENAI_API_KEY as API_KEY
from self_util import extract_text_from_file, preprocess_image_for_ocr
from services.self_service import generate_ai_answer, crawl_website

self_bp = Blueprint('self_bp', __name__)

@self_bp.route('/api/generate-answer', methods=['POST'])
def generate_answer_route():
    try:
        if not API_KEY or not CLIENT:
            return jsonify({
                'success': False,
                'error': 'OpenAI API 키가 .env 파일에 설정되지 않았습니다.'
            }), 400

        resume_file = request.files.get('resume')
        question_text = request.form.get('question_text')
        question_image = request.files.get('question_image')
        question_file = request.files.get('question_file')
        question_url = request.form.get('question_url')

        resume_text = ""
        if resume_file and resume_file.filename != '':
            resume_text = extract_text_from_file(resume_file)
            if "오류:" in resume_text:
                return jsonify({'success': False, 'error': resume_text}), 500

        final_question = ""
        if question_text:
            final_question = question_text
        elif question_image and question_image.filename != '':
            try:
                print("[이미지 처리] Vision API 우선 시도...")
                if API_KEY and CLIENT:
                    try:
                        image_bytes = question_image.read()
                        image = Image.open(io.BytesIO(image_bytes))
                        
                        if image.width > 1024 or image.height > 1024:
                            image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                        
                        if image.mode != 'RGB':
                            image = image.convert('RGB')
                        
                        buffer = io.BytesIO()
                        image.save(buffer, format='JPEG', quality=95)
                        img_base64 = base64.b64encode(buffer.getvalue()).decode()
                        
                        print("[Vision API] 이미지 분석 요청...")
                        response = CLIENT.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": """이 이미지에서 자기소개서 질문들을 정확히 추출해주세요. ..."""
                                        },
                                        {
                                            "type": "image_url",
                                            "image_url": {
                                                "url": f"data:image/jpeg;base64,{img_base64}"
                                            }
                                        }
                                    ]
                                }
                            ],
                            max_tokens=500,
                            temperature=0.1
                        )
                        vision_result = response.choices[0].message.content.strip()
                        print(f"[Vision API] 결과: {vision_result}")
                        
                        if len(vision_result) > 30 and ('1.' in vision_result or '질문' in vision_result):
                            final_question = vision_result
                            print("[Vision API] Vision API 결과 채택 - 키워드 기반 파싱 건너뜀")
                        else:
                            raise Exception("Vision API 결과 불만족")
                            
                    except Exception as vision_e:
                        print(f"[Vision API] 실패: {vision_e}, OCR 방식으로 대체...")
                        question_image.seek(0)
                        image_bytes = question_image.read()
                        image = Image.open(io.BytesIO(image_bytes))
                        processed_image = preprocess_image_for_ocr(image)
                        
                        try:
                            final_question = pytesseract.image_to_string(processed_image, lang='kor+eng', config=r'--oem 3 --psm 4').strip()
                            if len(final_question) < 20:
                                final_question = pytesseract.image_to_string(image, lang='kor+eng', config=r'--oem 3 --psm 6').strip()
                        except Exception as ocr_e:
                            print(f"[OCR 처리] OCR 실패: {ocr_e}")
                            final_question = ""
                else:
                    print("[이미지 처리] OpenAI API 키 없음, OCR만 사용...")
                    image_bytes = question_image.read()
                    image = Image.open(io.BytesIO(image_bytes))
                    processed_image = preprocess_image_for_ocr(image)
                    final_question = pytesseract.image_to_string(processed_image, lang='kor+eng', config=r'--oem 3 --psm 4').strip()
                
                print(f"[이미지 처리] 최종 결과: {len(final_question)}자")
                print(f"[이미지 처리] 최종 텍스트: {final_question[:200]}...")
                
            except Exception as e:
                return jsonify({'success': False, 'error': f'이미지 처리 중 오류: {e}'}), 500
        elif question_file and question_file.filename != '':
            try:
                final_question = extract_text_from_file(question_file)
                if "오류:" in final_question:
                    return jsonify({'success': False, 'error': final_question}), 500
            except Exception as e:
                return jsonify({'success': False, 'error': f'질문 파일 처리 중 오류: {e}'}), 500
        elif question_url:
            final_question = crawl_website(question_url)
            if "오류:" in final_question:
                return jsonify({'success': False, 'error': final_question}), 500
        
        if not final_question.strip():
            return jsonify({'success': False, 'error': '질문을 텍스트, 이미지, 파일(PDF/HWP) 또는 URL로 입력해주세요.'}), 400

        if not resume_text.strip():
            return jsonify({'success': False, 'error': '자기소개서 파일을 업로드해주세요.'}), 400

        ai_result = generate_ai_answer(resume_text, final_question)
        
        if "error" in ai_result:
            return jsonify({'success': False, 'error': ai_result["error"]}), 500
        
        return jsonify({
            'success': True,
            'total_questions': ai_result["total_questions"],
            'answers': ai_result["answers"],
            'original_question': final_question
        })

    except Exception as e:
        return jsonify({'success': False, 'error': f'서버 오류: {e}'}), 500

@self_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'API server is running'})
