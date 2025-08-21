# 환경 변수 설정 가이드

이 파일은 Flask 애플리케이션의 환경 변수 설정 방법을 설명합니다.

## 1. .env 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성하세요:

```bash
# 프로젝트 루트에서
touch .env  # Linux/macOS
# 또는 Windows에서 직접 파일 생성
```

## 2. .env 파일 내용

`.env` 파일에 다음 내용을 추가하세요:

```env
# Flask 환경 설정
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=True

# 보안 키 (실제 운영환경에서는 복잡한 랜덤 키 사용)
SECRET_KEY=your-super-secret-key-change-this-in-production

# 서버 설정
HOST=0.0.0.0
PORT=5000

# 업로드 설정
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=104857600

# 로깅 설정
LOG_LEVEL=INFO
LOG_FILE=app.log
```

## 3. 환경별 설정

### 개발 환경 (Development)
```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=dev-secret-key
```

### 운영 환경 (Production)
```env
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=super-complex-production-secret-key-here
```

### 테스트 환경 (Testing)
```env
FLASK_ENV=testing
FLASK_DEBUG=False
```

## 4. 보안 키 생성

운영 환경에서 사용할 강력한 SECRET_KEY를 생성하려면:

### Python에서 생성:
```python
import secrets
print(secrets.token_hex(32))
```

### 또는 온라인 도구 사용:
- https://djecrety.ir/
- https://randomkeygen.com/

## 5. 환경 변수 사용 예시

### 명령줄에서 설정:
```bash
# Windows
set FLASK_ENV=production
set SECRET_KEY=your-secret-key
python app.py

# Linux/macOS
export FLASK_ENV=production
export SECRET_KEY=your-secret-key
python app.py
```

### PowerShell에서 설정:
```powershell
$env:FLASK_ENV="production"
$env:SECRET_KEY="your-secret-key"
python app.py
```

## 6. Docker 환경에서 사용

### Dockerfile:
```dockerfile
ENV FLASK_ENV=production
ENV SECRET_KEY=your-secret-key
```

### docker-compose.yml:
```yaml
services:
  app:
    build: .
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=your-secret-key
    env_file:
      - .env
```

## 7. 클라우드 배포시 환경 변수

### Heroku:
```bash
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=your-secret-key
```

### AWS Elastic Beanstalk:
환경 구성에서 환경 속성 추가

### Vercel:
프로젝트 설정에서 Environment Variables 추가

## 8. 주의사항

1. **절대로 .env 파일을 git에 커밋하지 마세요**
   - `.gitignore`에 `.env`가 포함되어 있는지 확인
   
2. **운영 환경에서는 강력한 SECRET_KEY 사용**
   - 최소 32자 이상의 랜덤 문자열
   
3. **민감한 정보는 환경 변수로 관리**
   - API 키, 데이터베이스 비밀번호 등
   
4. **환경별로 다른 설정 파일 사용 가능**
   - `.env.development`
   - `.env.production`
   - `.env.testing`

## 9. 문제 해결

### .env 파일이 로드되지 않는 경우:
1. 파일 위치 확인 (프로젝트 루트에 있어야 함)
2. 파일 이름 확인 (`.env`, 확장자 없음)
3. `python-dotenv` 패키지 설치 확인

### 환경 변수가 적용되지 않는 경우:
1. 애플리케이션 재시작
2. 가상환경 재활성화
3. 환경 변수 이름 확인 (대소문자 구분)

## 10. 실행 방법

환경 설정 완료 후:

```bash
# 의존성 설치
pip install -r requirements.txt

# 애플리케이션 실행
python app.py

# 또는 Flask CLI 사용
flask run
```
