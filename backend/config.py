import os
from dotenv import load_dotenv
import openai
import pytesseract

# .env 파일 로드
load_dotenv()



class Config:
    """기본 설정"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 업로드 설정
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', '104857600'))  # 100MB
    
    # 허용된 파일 확장자
    ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'webm', 'mkv'}
    
    # 서버 설정
    HOST = os.environ.get('HOST') or '0.0.0.0'
    PORT = int(os.environ.get('PORT', '5000'))
    
    # 로깅 설정
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    LOG_FILE = os.environ.get('LOG_FILE') or 'app.log'

class DevelopmentConfig(Config):
    """개발 환경 설정"""
    DEBUG = True
    FLASK_ENV = 'development'

class ProductionConfig(Config):
    """운영 환경 설정"""
    DEBUG = False
    FLASK_ENV = 'production'
    
    # 운영환경에서는 더 강력한 보안 키 필요
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("운영 환경에서는 SECRET_KEY 환경 변수가 필요합니다.")

class TestingConfig(Config):
    """테스트 환경 설정"""
    TESTING = True
    FLASK_ENV = 'testing'

# 환경에 따른 설정 선택
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
# Gemini API 설정
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Flask 앱 설정
FLASK_ENV = os.getenv('FLASK_ENV', 'development')
FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))

# CORS 설정
CORS_ORIGIN = os.getenv('CORS_ORIGIN', 'http://localhost:3000')

# # Tesseract-OCR 경로 설정
# TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# if os.path.exists(TESSERACT_PATH):
#     pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
# else:
#     print(f"경고: Tesseract-OCR 경로를 찾을 수 없습니다: {TESSERACT_PATH}")

# OpenAI API 키 설정
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def get_openai_client():
    """OpenAI 클라이언트를 반환합니다."""
    if OPENAI_API_KEY:
        return openai.OpenAI(api_key=OPENAI_API_KEY)
    return None

CLIENT = get_openai_client()