import os
from dotenv import load_dotenv
import openai
# import pytesseract

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
    
    # Flask 환경 설정
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    # CORS 설정
    CORS_ORIGIN = os.getenv('CORS_ORIGIN', 'http://localhost:3000')
    
    # 로깅 설정
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    LOG_FILE = os.environ.get('LOG_FILE') or 'app.log'
    
    # API 키들
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    # Gemini API 설정
    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

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

def get_openai_client():
    """OpenAI 클라이언트를 반환합니다."""
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        return openai.OpenAI(api_key=api_key)
    return None

# 전역 클라이언트 인스턴스
CLIENT = get_openai_client()

# 기존 코드와의 호환성을 위한 전역 변수들
GEMINI_API_URL = Config.GEMINI_API_URL
GEMINI_API_KEY = Config.GEMINI_API_KEY
API_KEY = Config.GEMINI_API_KEY  # API_KEY는 GEMINI_API_KEY의 별칭
CORS_ORIGIN = Config.CORS_ORIGIN
FLASK_DEBUG = Config.FLASK_DEBUG
FLASK_HOST = Config.HOST
FLASK_PORT = Config.PORT
OPENAI_API_KEY = Config.OPENAI_API_KEY
ANTHROPIC_API_KEY = Config.ANTHROPIC_API_KEY

# # Tesseract-OCR 경로 설정 (필요시 주석 해제)
# TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# if os.path.exists(TESSERACT_PATH):
#     pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
# else:
#     print(f"경고: Tesseract-OCR 경로를 찾을 수 없습니다: {TESSERACT_PATH}")