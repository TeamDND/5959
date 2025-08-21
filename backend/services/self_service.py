import re
import time
import json
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

from config import CLIENT, OPENAI_API_KEY as API_KEY
from self_util import basic_question_parsing_with_keywords

def ai_smart_parse_questions(question_text):
    """
    AI를 사용하여 텍스트에서 실제 자소서 질문만 지능적으로 추출합니다. (Vision API 우선, 간소화된 처리)
    """
    if not API_KEY or not CLIENT:
        return basic_question_parsing_with_keywords(question_text)
    
    try:
        print(f"[AI 스마트 파싱] 분석 시작...")
        print(f"[AI 스마트 파싱] 입력 텍스트 길이: {len(question_text)}")
        print(f"[AI 스마트 파싱] 입력 텍스트 샘플: {question_text[:300]}...")
        
        # Vision API에서 이미 잘 구조화된 결과인지 확인
        if ('1.' in question_text and '2.' in question_text) or 'Vision API' in str(question_text):
            print("[AI 스마트 파싱] Vision API 결과로 추정, 간단 파싱 사용")
            # Vision API 결과는 이미 잘 구조화되어 있으므로 간단하게 파싱
            questions = []
            lines = question_text.strip().split('\n')
            for line in lines:
                line = line.strip()
                if re.match(r'^\d+\.', line):
                    content = re.sub(r'^\d+\.\s*', '', line).strip()
                    if content:
                        questions.append({
                            'number': str(len(questions) + 1),
                            'content': content
                        })
            
            if questions:
                print(f"[AI 스마트 파싱] Vision API 결과에서 {len(questions)}개 질문 추출")
                return questions
        
        # 텍스트가 너무 짧거나 의미없는 경우 체크
        if len(question_text.strip()) < 20:
            print(f"[AI 스마트 파싱] 텍스트가 너무 짧음 ({len(question_text)}자), 기본 질문 사용")
            return [
                {'number': '1', 'content': '성장과정에 대해 설명해주세요'},
                {'number': '2', 'content': '지원동기를 말씀해주세요'},
                {'number': '3', 'content': '입사 후 포부를 설명해주세요'}
            ]
        
        # 의미없는 텍스트인지 체크 (파일 추출 실패 메시지 등)
        meaningless_patterns = [
            "파일에서 텍스트를 추출할 수 없습니다",
            "지원하지 않는 형식",
            "보호되어 있거나"
        ]
        
        if any(pattern in question_text for pattern in meaningless_patterns):
            print("[AI 스마트 파싱] 의미없는 텍스트 감지, 기본 질문으로 대체")
            return [
                {'number': '1', 'content': '성장과정에 대해 설명해주세요'},
                {'number': '2', 'content': '지원동기를 말씀해주세요'},
                {'number': '3', 'content': '입사 후 포부를 설명해주세요'},
                {'number': '4', 'content': '성격의 장단점을 말씀해주세요'}
            ]
        
        symbol_info = "" # 누락된 변수 정의

        prompt = f"""
        다음은 자기소개서 양식에서 추출된 텍스트입니다.
        HWP 파일에서 추출되었으며, ■ 기호나 다른 특수기호가 질문 구분자로 사용될 수 있습니다.
        {symbol_info}
        
        중요: 아래 텍스트에서 실제로 존재하는 질문만 추출해야 합니다. 임의로 질문을 만들지 마세요.
        
        텍스트:
        ---
        {question_text}
        ---
        
        중요 지침:
        1. 위의 텍스트에서 실제로 보이는 내용만을 바탕으로 질문을 추출하세요
        2. ■ 기호나 숫자 뒤에 오는 실제 텍스트만 질문으로 변환하세요
        3. 텍스트에 없는 내용은 절대 추가하지 마세요
        4. 만약 위 텍스트에서 명확한 질문을 찾을 수 없다면 빈 배열을 반환하세요
        
        예시:
        - 텍스트에 "■ 성장과정"이 있다면 → "성장과정에 대해 설명해주세요"
        - 텍스트에 "1. 지원동기"가 있다면 → "지원동기를 말씀해주세요"
        - 하지만 텍스트에 없는 내용은 절대 만들지 마세요
        
        JSON 형식으로 반환:
        {{
            "questions": [
                "실제 텍스트에서 발견된 질문만"
            ]
        }}
        
        텍스트에서 질문을 찾을 수 없으면 빈 배열 []을 반환하세요.
        """
        
        response = CLIENT.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.1
        )
        
        result = response.choices[0].message.content.strip()
        print(f"[AI 스마트 파싱] AI 응답 원문: '{result}'")
        print(f"[AI 스마트 파싱] AI 응답 길이: {len(result)}")
        
        if not result:
            print("[AI 스마트 파싱] 빈 응답 받음, 키워드 기반 파싱으로 대체")
            return basic_question_parsing_with_keywords(question_text)
        
        try:
            # JSON 파싱 전에 코드 블록 제거 (```json으로 감싸진 경우)
            if result.startswith('```'):
                lines = result.split('\n')
                result = '\n'.join(lines[1:-1])  # 첫 줄과 마지막 줄 제거
                print(f"[AI 스마트 파싱] 코드 블록 제거 후: '{result}'")
            
            parsed_data = json.loads(result)
            question_list = parsed_data.get('questions', [])
            
            questions = []
            for i, q in enumerate(question_list, 1):
                if q and len(q.strip()) > 5:
                    questions.append({
                        'number': str(i),
                        'content': q.strip()
                    })
            
            if questions and len(questions) > 0:
                print(f"[AI 스마트 파싱] {len(questions)}개 질문 추출 성공")
                for q in questions:
                    print(f"  - 질문 {q['number']}: {q['content']}")
                return questions
            else:
                print("[AI 스마트 파싱] AI가 질문을 찾지 못함, 키워드 기반 파싱으로 대체")
                return basic_question_parsing_with_keywords(question_text)
                
        except json.JSONDecodeError as e:
            print(f"[AI 스마트 파싱] JSON 파싱 오류: {e}")
            return basic_question_parsing_with_keywords(question_text)
            
    except Exception as e:
        print(f"[AI 스마트 파싱] 오류: {e}")
        return basic_question_parsing_with_keywords(question_text)

def generate_ai_answer(resume_text, question_text):
    """
    OpenAI GPT 모델을 호출하여 실제 답변을 생성합니다.
    개별 질문별로 답변을 생성합니다. (개선된 인재상 참조)
    """
    if not API_KEY or not CLIENT:
        return {"error": "오류: OpenAI API 키가 설정되지 않았습니다. .env 파일을 확인해주세요."}

    try:
        # AI 스마트 파싱으로 실제 질문만 추출
        questions = ai_smart_parse_questions(question_text)
        
        print(f"[모니터링] 파싱된 질문 개수: {len(questions)}")
        for i, q in enumerate(questions):
            print(f"[모니터링] 질문 {q['number']}: {q['content'][:50]}...")
        
        answers = {}
        
        for question in questions:
            print(f"[모니터링] 질문 {question['number']} 답변 생성 중...")
            
            prompt = f"""
            당신은 자기소개서 컨설턴트입니다. 아래 제공된 자기소개서 내용을 깊이 분석하고, 특정 질문에 대한 답변 초안을 작성해주세요.

            [전체 질문 및 채용 정보]:
            ---
            {question_text}
            ---

            [자기소개서 내용]:
            ---
            {resume_text}
            ---

            [답변할 질문]:
            {question['content']}

            [작성 가이드]:
            1. 전체 질문 및 채용 정보에서 다음 요소들을 확인하고 반영하세요:
               - 인재상, 우대사항, 핵심역량, 필요조건
               - 회사 가치관, 기업문화, 핵심가치
               - 우대하는 경험이나 역량
            
            2. 자기소개서 내용 중에서 이 특정 질문과 가장 관련성이 높은 경험, 역량, 사례를 근거로 답변을 구성하세요.
            
            3. 회사가 원하는 인재상이나 가치와 본인의 경험을 연결하여 적합성을 강조하세요.
            
            4. 이 질문 하나에만 집중하여 답변하세요.
            
            5. 내용을 단순히 요약하지 말고, 질문의 의도에 맞게 스토리를 재구성하고 강조할 부분을 부각시켜 주세요.
            
            6. 문장은 간결하고 명확하게 작성해주세요.
            
            7. 답변은 다음 형식으로 작성해주세요:
               **[질문]**: 답변하는 질문 내용
               
               (답변 내용)

            예시) 만약 질문이 "성장과정에 대해 설명해주세요"라면:
            → **[성장과정에 대해 설명해주세요]**
            
            (답변 내용으로 이어짐)
            """
            
            response = CLIENT.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.7
            )
            
            answer_content = response.choices[0].message.content
            
            # "죄송합니다" 같은 답변은 필터링
            if "죄송합니다" in answer_content and "이해할 수 없는" in answer_content:
                print(f"[모니터링] 질문 {question['number']} 무의미한 답변으로 건너뜀")
                continue
                
            answers[question['number']] = {
                'question': question['content'],
                'answer': answer_content
            }
            
            print(f"[모니터링] 질문 {question['number']} 답변 완료: {answer_content[:50]}...")
        
        return {
            "success": True,
            "total_questions": len(questions),
            "answers": answers
        }
        
    except Exception as e:
        error_msg = f"AI 모델 호출 중 오류가 발생했습니다: {e}"
        print(f"[모니터링] 오류: {error_msg}")
        return {"error": error_msg}

def crawl_website(url):
    """
    웹사이트에서 텍스트를 크롤링합니다. (Selenium을 사용하여 동적 콘텐츠 렌더링 지원)
    """
    driver = None  # driver 변수 초기화
    try:
        print(f"[웹 크롤링] URL 접근 시도 (Selenium): {url}")

        # Selenium WebDriver 설정
        options = ChromeOptions()
        options.add_argument("--headless")  # 브라우저 창을 띄우지 않음
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        # webdriver-manager를 사용하여 드라이버 자동 설치 및 경로 설정
        service = ChromeService(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)

        driver.get(url)

        # 페이지가 로드될 때까지 최대 30초 대기 (body 태그가 나타날 때까지)
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        print("[웹 크롤링] 동적 콘텐츠 로드를 위해 5초 추가 대기...")
        time.sleep(5) # SPA 렌더링 대기
        
        print("[웹 크롤링] 페이지 로드 완료, 콘텐츠 파싱 시작...")
        
        # 렌더링된 페이지 소스 가져오기
        html = driver.page_source
        soup = BeautifulSoup(html, 'html.parser')
        
        # 더 포괄적인 불필요한 태그 제거
        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'advertisement', 'ads']):
            tag.decompose()
        
        # 주요 콘텐츠 영역 우선 탐색
        main_content = None
        content_selectors = [
            'main', '.main', '#main',
            '.content', '#content', '.post-content',
            '.article', '#article', '.board-content',
            '.view-content', '.detail-content',
            'article', '.entry-content'
        ]
        
        for selector in content_selectors:
            main_content = soup.select_one(selector)
            if main_content:
                print(f"[웹 크롤링] 주요 콘텐츠 영역 발견: {selector}")
                break
        
        # 주요 콘텐츠 영역이 없으면 전체 body 사용
        if not main_content:
            main_content = soup.find('body') or soup
            print("[웹 크롤링] 전체 body 영역 사용")
        
        # 텍스트 추출
        text = main_content.get_text()
        print(f"[웹 크롤링] 추출된 텍스트 길이: {len(text)}")
        
        # 텍스트 정리
        lines = (line.strip() for line in text.splitlines())
        lines = (line for line in lines if line and len(line) > 2)
        text = '\n'.join(lines)
        
        print(f"[웹 크롤링] 최종 텍스트 샘플: {text[:200].encode('ascii', 'ignore').decode('ascii')}...")
        # cp949로 인코딩 안되는 문자(이모지 등)를 제거하여 반환
        return text.encode('cp949', 'ignore').decode('cp949')
        
    except TimeoutException:
        error_msg = f"오류: 요청 시간 초과 - 웹사이트({url}) 응답이 너무 느립니다."
        print(f"[웹 크롤링] {error_msg}")
        return error_msg
    except WebDriverException as e:
        error_msg = f"오류: WebDriver 오류 - 브라우저를 제어하는 중 문제가 발생했습니다. ({e})"
        print(f"[웹 크롤링] {error_msg}")
        return error_msg
    except Exception as e:
        error_msg = f"오류: 웹사이트 크롤링 실패 - {e}"
        print(f"[웹 크롤링] {error_msg}")
        return error_msg
    finally:
        if driver:
            driver.quit()
