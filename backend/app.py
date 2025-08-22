from flask import Flask, render_template, request, jsonify, send_file
# backend/app.py
# 멘탈 관리 서비스 백엔드 애플리케이션 (Gemini API 연동 버전)

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import time
import os
import asyncio

import base64
from io import BytesIO
from PIL import Image

from config import CORS_ORIGIN, FLASK_DEBUG, FLASK_HOST, FLASK_PORT
from gemini_client import get_gemini_client

from config import config
from interview import analyze_video_api
from TextCleanup import summarize_api
from services.job_analyzer import JobAnalyzer
from services.interview_service import InterviewService
from services.report_generator import ReportGenerator
from posture_analyzer import PostureAnalyzer
from TextCleanup import summarize_api, generate_image_api, analyze_content_api
from self_app import self_bp
from network import networking_ai


app = Flask(__name__)

# 환경에 따른 설정 로드
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# 업로드 폴더 생성
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'posture'), exist_ok=True)

# 자세 분석기 인스턴스 생성
posture_analyzer = PostureAnalyzer()

def save_base64_image(image_data, filename):
    """base64 이미지 데이터를 파일로 저장"""
    try:
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes))
        
        # JPEG 형식으로 저장
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'posture', filename)
        image.save(file_path, 'JPEG', quality=85)
        
        return file_path
    except Exception as e:
        print(f"이미지 저장 오류: {e}")
        return None

# 서비스 인스턴스 생성
job_analyzer = JobAnalyzer()
interview_service = InterviewService()
report_generator = ReportGenerator()
# CORS 설정에 supports_credentials=True 추가
CORS(app, origins=[CORS_ORIGIN], supports_credentials=True)
app.register_blueprint(self_bp)

# 간단한 세션 관리용 변수
message_count = 0

# 업로드 폴더 설정
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 모델은 파이토치 환경에서 """으로 사용합니다.
# ----------------------------------------------------
"""
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForCausalLM

class EmotionModel(nn.Module):
    # PyTorch 모델 정의 예시
    pass

model = EmotionModel()
# model.load_state_dict(torch.load('model.pt'))
"""
# ----------------------------------------------------

@app.route('/')
def index():
    """메인 페이지"""
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """파일 업로드 API"""
    if 'file' not in request.files:
        return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
    
    if file:
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        return jsonify({
            'message': '파일이 성공적으로 업로드되었습니다.',
            'filename': filename,
            'size': os.path.getsize(file_path)
        })

# 대화 히스토리 조회 (임시)
@app.route('/api/history', methods=['GET'])
def get_chat_history():
    return jsonify({'history': []})

# 기본 엔드포인트
@app.route('/api/chat', methods=['POST'])
def chat_message():
    """
    사용자의 메시지를 받아 응답을 생성하는 엔드포인트.
    """
    global message_count
    
    try:
        data = request.get_json()
        message = data.get('message', '')

        # Gemini 클라이언트 가져오기
        gemini_client = get_gemini_client()
        if not gemini_client:
            return jsonify({'error': 'Gemini 클라이언트 초기화 실패'}), 500

        # 첫 번째 메시지인지 확인 (message_count로 판단)
        is_first_message = (message_count == 0)
        
        # Gemini API 호출을 통해 공감/위로 멘트 생성
        result = gemini_client.analyze_emotion_and_respond(message, is_first_message)
        
        message_count += 1
        
        response = {
            'message': result['response'],
            'timestamp': None, # 현재는 임시로 None
            'emotion': result['emotion']
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"채팅 처리 중 에러 발생: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_video_route():
    """비디오 분석 API 라우트"""
    # analyze_video_api 함수가 있다면 import해서 사용
    # from interview import analyze_video_api
    # return analyze_video_api()
    return jsonify({'message': '비디오 분석 기능은 추후 구현 예정입니다.'})

@app.route('/api/summarize', methods=['POST'])
def summarize_route():
    """텍스트/이미지 요약 API 라우트"""
    return summarize_api()

@app.route('/api/analyze-content', methods=['POST'])
def analyze_content_route():
    """콘텐츠 분석 API 라우트"""
    return analyze_content_api()

@app.route('/api/generate-image', methods=['POST'])
def generate_image_route():
    """이미지 생성 API 라우트"""
    return generate_image_api()

@app.route('/api/analyze-job-posting', methods=['POST'])
def analyze_job_posting():
    """채용공고 분석 API"""
    import asyncio
    
    try:
        data = request.get_json()
        
        if data.get('url'):
            # URL 기반 분석
            analysis = asyncio.run(job_analyzer.analyze_posting(data['url']))
        else:
            # 직접 입력된 정보 사용
            analysis = {
                "company": data.get('company', '입력된 회사'),
                "position": data.get('position', '입력된 직무'),
                "responsibilities": data.get('responsibilities', '입력된 주요업무'),
                "requirements": data.get('requirements', '입력된 요구사항'),
                "preferred": "관련 자격증 및 우대사항",
                "full_text": f"회사: {data.get('company')}, 직무: {data.get('position')}"
            }
        
        questions = asyncio.run(job_analyzer.generate_questions(analysis))
        return jsonify({
            "success": True,
            "job_info": analysis,
            "questions": questions
        })
    except Exception as e:
        # 에러 발생시 기본 질문 제공
        default_analysis = {
            "company": "테스트 회사",
            "position": "일반 직무",
            "responsibilities": "업무 수행 및 팀 협업",
            "requirements": "관련 경험 및 기술",
            "preferred": "추가 자격 요건",
            "full_text": "기본 분석 정보"
        }
        questions = asyncio.run(job_analyzer.generate_questions(default_analysis))
        return jsonify({
            "success": True,
            "job_info": default_analysis,
            "questions": questions
        })

@app.route('/api/start-interview', methods=['POST'])
def start_interview():
    """면접 시작 API"""
    try:
        data = request.get_json()
        print(f"면접 시작 요청: 질문수={data['num_questions']}, 난이도={data['difficulty_level']}")
        print(f"받은 질문 개수: {len(data['questions'])}")
        
        selected_questions = interview_service.select_questions(
            data['questions'], 
            data['num_questions'], 
            data['difficulty_level']
        )
        print(f"선택된 질문 개수: {len(selected_questions)}")
        
        session_id = interview_service.create_session(selected_questions)
        return jsonify({
            "success": True,
            "session_id": session_id,
            "questions": selected_questions
        })
    except Exception as e:
        print(f"면접 시작 에러: {str(e)}")
        return jsonify({"error": str(e)}), 400

@app.route('/api/submit-answer', methods=['POST'])
def submit_answer():
    """답변 제출 및 평가 API"""
    import asyncio
    
    try:
        data = request.get_json()
        evaluation = asyncio.run(interview_service.evaluate_answer(
            data['question'],
            data['answer'],
            data['time_taken'],
            data['max_time']
        ))
        return jsonify({
            "success": True,
            "score": evaluation["score"],
            "feedback": evaluation["feedback"],
            "next_question": evaluation.get("next_question")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    """면접 리포트 생성 API"""
    try:
        data = request.get_json()
        print(f"PDF 생성 요청: session_id={data['session_id']}")
        print(f"질문 수: {len(data['questions'])}, 답변 수: {len(data['answers'])}")
        
        # 세션 데이터를 딕셔너리로 변환
        session_data = {
            "session_id": data['session_id'],
            "questions": data['questions'],
            "answers": data['answers'],
            "scores": data['scores'],
            "feedback": data['feedback']
        }
        
        pdf_path = report_generator.create_pdf_report(session_data)
        
        # 파일명만 추출 (전체 경로에서)
        filename = os.path.basename(pdf_path)
        
        return jsonify({
            "success": True,
            "filename": filename,
            "download_url": f"/api/download-report/{filename}"
        })
    except Exception as e:
        print(f"PDF 생성 에러: {str(e)}")
        return jsonify({"error": str(e)}), 400

@app.route('/api/download-report/<filename>')
def download_report(filename):
    """PDF 리포트 다운로드"""
    import tempfile
    file_path = os.path.join(tempfile.gettempdir(), filename)
    
    if not os.path.exists(file_path):
        return jsonify({"error": "파일을 찾을 수 없습니다."}), 404
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf"
    )

@app.route('/api/health')
def health_check():
    """서버 상태 확인"""
    return jsonify({"status": "healthy"})

@app.route('/api/networking-ai', methods=['POST'])
def networking_ai_route():
    """네트워킹 AI API 라우트"""
    return networking_ai()
# 자세 관련 API 라우트들
@app.route('/api/posture/setup', methods=['POST'])
def posture_setup():
    """기본 자세 이미지 저장 API"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': '이미지 데이터가 없습니다.'}), 400
        
        # 이미지 분석
        result = posture_analyzer.analyze_image(data['image'])
        
        if result['success']:
            # 이미지를 파일로 저장
            filename = f"base_posture_{int(os.urandom(4).hex(), 16)}.jpg"
            file_path = save_base64_image(data['image'], filename)
            
            if file_path:
                return jsonify({
                    'message': '기본 자세가 성공적으로 저장되었습니다.',
                    'posture_score': result['posture_score'],
                    'status': result['status'],
                    'filename': filename,
                    'file_path': file_path
                })
            else:
                return jsonify({'error': '이미지 파일 저장에 실패했습니다.'}), 500
        else:
            return jsonify({'error': result['message']}), 400
            
    except Exception as e:
        return jsonify({'error': f'서버 오류: {str(e)}'}), 500

@app.route('/api/posture/analyze', methods=['POST'])
def posture_analyze():
    """실시간 자세 분석 API"""
    try:
        data = request.get_json()
        if not data or 'base_image' not in data or 'current_image' not in data:
            return jsonify({'error': '이미지 데이터가 부족합니다.'}), 400
        
        # 움직임 민감도 설정 가져오기 (기본값: medium)
        movement_threshold = data.get('movement_threshold', 'medium')
        
        result = posture_analyzer.compare_postures(
            data['base_image'], 
            data['current_image'],
            movement_threshold
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify({'error': result['message']}), 400
    except Exception as e:
        return jsonify({'error': f'서버 오류: {str(e)}'}), 500

@app.route('/api/posture/settings', methods=['GET'])
def get_posture_settings():
    """설정 정보 조회 API"""
    return jsonify({'message': '설정 조회 API 준비 중'})

@app.route('/api/posture/settings', methods=['POST'])
def save_posture_settings():
    """설정 정보 저장 API"""
    return jsonify({'message': '설정 저장 API 준비 중'})

@app.route('/api/posture/hello', methods=['GET'])
def posture_hello():
    """자세 서비스 테스트 API"""
    return jsonify({'message': '자세 경고알림 서비스가 준비되었습니다!'})

@app.route('/api/posture/draw-landmarks', methods=['POST'])
def posture_draw_landmarks():
    """이미지에 pose landmark를 그리는 API"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': '이미지 데이터가 없습니다.'}), 400
        
        result = posture_analyzer.draw_landmarks_on_image(data['image'])
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify({'error': result['error']}), 400
            
    except Exception as e:
        return jsonify({'error': f'서버 오류: {str(e)}'}), 500

if __name__ == '__main__':

    app.run(
        debug=app.config.get('DEBUG', True),
        host=app.config.get('HOST', '0.0.0.0'),
        port=app.config.get('PORT', '5000')
    )

