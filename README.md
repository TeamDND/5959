# 미니 프로젝트

React + Flask 기반의 웹 애플리케이션입니다.

## 기술 스택

- **프론트엔드**: React
- **백엔드**: Python Flask
- **폰트**: Noto-Sans KR
- **색상 팔레트**:
  - 주조색: #005793
  - 보조색: #E6F0F5
  - 포인트색: #F76800

## 프로젝트 구조

```
minipj/
├── frontend/          # React 프론트엔드
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── style/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── backend/           # Flask 백엔드
│   ├── app.py
│   ├── config.py
│   └── requirements.txt
├── ui.svg            # UI 디자인 미리보기
├── f.svg             # 폴더 구조 다이어그램
└── README.md
```

## 설치 및 실행

### 프론트엔드 실행

```bash
cd frontend
npm install
npm start
```

### 백엔드 실행

1. **환경 변수 설정**
   
   `backend` 폴더에 `.env` 파일을 생성하고 다음 내용을 추가하세요:
   
   ```env
   # Flask 설정
   FLASK_ENV=development
   SECRET_KEY=your-secret-key-here-change-this-in-production
   DEBUG=True
   HOST=0.0.0.0
   PORT=5000
   
   # OpenAI API 설정 (텍스트 정렬 도구 사용시 필요)
   OPENAI_API_KEY=your-openai-api-key-here
   
   # 업로드 설정
   UPLOAD_FOLDER=uploads
   MAX_CONTENT_LENGTH=16777216
   ```
   
   **⚠️ 중요**: 
   - `SECRET_KEY`는 실제 프로덕션에서는 안전한 랜덤 문자열로 변경하세요
   - `OPENAI_API_KEY`는 OpenAI에서 발급받은 API 키를 입력하세요
   - `.env` 파일은 `.gitignore`에 포함되어 있어 GitHub에 업로드되지 않습니다

2. **패키지 설치 및 실행**
   
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

## API 엔드포인트

- `GET /api/hello`: 인사 메시지
- `GET /api/info`: 프로젝트 정보

## 폰트 정보

온글잎 대롱체는 [눈누](https://noonnu.cc/font_page/1644)에서 제공하는 무료 폰트입니다.

# 5959
miniproject
