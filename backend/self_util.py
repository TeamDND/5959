import re
from collections import Counter
import pdfplumber
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import numpy as np
import pytesseract

def detect_and_convert_symbols(text):
    """
    텍스트에서 특수기호를 동적으로 감지하고 질문 패턴인지 판단하여 변환 (■ 문자 특별 처리)
    """
    print("[동적 특수기호 감지] 시작...")
    
    # 1. ■ 문자 우선 처리 (자기소개서에서 흔히 사용됨)
    square_pattern = r'■\s*([^■\n]{3,50})'
    square_matches = re.findall(square_pattern, text)
    
    if square_matches:
        print(f"[동적 특수기호 감지] ■ 패턴 {len(square_matches)}개 발견")
        converted_text = text
        question_number = 1
        
        def replace_square_with_number(match):
            nonlocal question_number
            content = match.group(1).strip()
            result = f"\n{question_number}. {content}"
            question_number += 1
            print(f"[동적 특수기호 감지] ■ 변환: '■ {content[:20]}...' -> '{question_number-1}. {content[:20]}...'")
            return result
        
        converted_text = re.sub(square_pattern, replace_square_with_number, converted_text)
        return converted_text
    
    # 2. 한글, 영어, 숫자가 아닌 모든 문자 찾기 (■가 없을 경우)
    special_chars = re.findall(r'[^가-힣a-zA-Z0-9\s\n.,?!()\[\]/-]', text)
    
    if not special_chars:
        print("[동적 특수기호 감지] 특수기호가 발견되지 않음")
        return text
    
    # 3. 특수기호 빈도 분석
    char_counts = Counter(special_chars)
    
    print(f"[동적 특수기호 감지] 발견된 특수기호: {dict(char_counts)}")
    
    # 4. 질문 구분자로 사용될 가능성이 높은 특수기호 찾기
    potential_markers = []
    
    for char, count in char_counts.items():
        # 조건: 2회 이상 나타나고, 질문 키워드 근처에 있는 기호
        if count >= 2 and is_question_marker(text, char):
            potential_markers.append(char)
            print(f"[동적 특수기호 감지] 질문 구분자 후보: '{char}' (출현 {count}회)")
    
    # 5. 발견된 특수기호들을 숫자로 변환
    converted_text = text
    question_number = 1
    
    for marker in potential_markers:
        # 특수기호 + 공백 + 텍스트 패턴을 찾아서 변환
        pattern = rf'{re.escape(marker)}\s*([^{re.escape(marker)}\n]{{3,50}})'
        
        def replace_with_number(match):
            nonlocal question_number
            content = match.group(1).strip()
            result = f"\n{question_number}. {content}"
            question_number += 1
            print(f"[동적 특수기호 감지] 변환: '{marker} {content[:20]}...' -> '{question_number-1}. {content[:20]}...'")
            return result
        
        converted_text = re.sub(pattern, replace_with_number, converted_text)
    
    return converted_text

def is_question_marker(text, char):
    """
    특정 문자가 질문 구분자로 사용되고 있는지 판단
    """
    # 자기소개서 관련 키워드들
    question_keywords = [
        '성장과정', '지원동기', '포부', '성격', '장단점', '자기소개', 
        '강점', '약점', '경험', '어려움', '극복', '협업', '팀워크',
        '계획', '목표', '역량', '능력', '특기', '취미'
    ]
    
    # 해당 특수기호 주변 텍스트들 찾기
    pattern = rf'{re.escape(char)}\s*([^{re.escape(char)}\n]{{3,50}})'
    matches = re.findall(pattern, text)
    
    if not matches:
        return False
    
    # 키워드 매칭 점수 계산
    keyword_score = 0
    total_matches = len(matches)
    
    for match in matches:
        match_text = match.strip().lower()
        
        # 자기소개서 키워드가 포함되어 있는지 체크
        for keyword in question_keywords:
            if keyword in match_text:
                keyword_score += 1
                break
        
        # 길이가 적절한지 체크 (너무 짧거나 길지 않은)
        if 3 <= len(match_text) <= 30:
            keyword_score += 0.5
    
    # 점수 기준: 전체 매치의 50% 이상이 의미있는 내용이면 질문 구분자로 판단
    confidence = keyword_score / total_matches
    
    print(f"[특수기호 분석] '{char}': {total_matches}개 패턴, 신뢰도 {confidence:.2f}")
    
    return confidence >= 0.5

def enhanced_symbol_detection(text):
    """
    더 정교한 특수기호 감지 (패턴 분석 포함)
    """
    print("[정교한 특수기호 분석] 시작...")
    
    # 1. 줄의 시작 부분에 나타나는 특수기호들 찾기
    line_start_symbols = re.findall(r'^\s*([^가-힣a-zA-Z0-9\s.,?!()\[\]/-])', text, re.MULTILINE)
    
    # 2. 단어 사이에 나타나는 반복 패턴 찾기
    repeated_patterns = re.findall(r'([^가-힣a-zA-Z0-9\s.,?!()\[\]/-])\s*([가-힣]{2,10})', text)
    
    print(f"[정교한 특수기호 분석] 줄 시작 기호: {set(line_start_symbols)}")
    print(f"[정교한 특수기호 분석] 반복 패턴: {len(repeated_patterns)}개")
    
    # 3. 가장 유력한 구분자 찾기
    if line_start_symbols:
        most_common = Counter(line_start_symbols).most_common(1)[0]
        print(f"[정교한 특수기호 분석] 가장 유력한 구분자: '{most_common[0]}' ({most_common[1]}회)")
        return most_common[0]
    
    return None

def clean_hwp_text(raw_text):
    """
    HWP에서 추출된 텍스트 정리 (동적 특수기호 감지 및 키워드 우선순위 처리 추가)
    """
    print(f"[HWP 정리] 원본 텍스트: {raw_text[:300]}...")
    
    # 1. 기본 정리
    text = raw_text.replace('\x00', '')  # null 문자 제거
    text = re.sub(r'\s+', ' ', text)  # 연속 공백을 하나로
    
    # 2. 동적 특수기호 감지 및 변환
    text = detect_and_convert_symbols(text)
    
    # 3. 표 구분선 제거
    text = re.sub(r'[─┌┬┐├┼┤└┴┘│┃━┏┳┓┣╋┫┗┻┛]+', '\n', text)  # 표 선 제거
    text = re.sub(r'\n+', '\n', text)  # 연속 줄바꿈 정리
    
    # 4. 키워드 기반 우선순위 처리
    lines = text.split('\n')
    
    # 자기소개서 관련 키워드 (우선순위별로 정렬)
    priority_keywords = {
        'high': ['성장과정', '지원동기', '입사 후 포부', '포부'],
        'medium': ['성격', '장단점', '자기소개', '강점', '약점'],
        'low': ['경험', '계획', '목표', '어려움', '극복', '협업', '팀워크']
    }
    
    # 키워드별로 줄을 분류
    high_priority_lines = []
    medium_priority_lines = []
    low_priority_lines = []
    numbered_lines = []  # 숫자로 시작하는 줄들
    other_lines = []
    
    for line in lines:
        line = line.strip()
        if len(line) < 3:  # 너무 짧은 줄은 건너뛰기
            continue
        
        # 숫자로 시작하는 줄 우선 처리
        if re.match(r'^\d+\.', line):
            numbered_lines.append(line)
            print(f"[HWP 정리] 숫자 패턴 발견: {line[:50]}...")
            continue
            
        # 우선순위 분류
        line_classified = False
        
        # 고우선순위 체크
        for keyword in priority_keywords['high']:
            if keyword in line:
                high_priority_lines.append(line)
                print(f"[HWP 정리] 고우선순위 발견: {line[:50]}... (키워드: {keyword})")
                line_classified = True
                break
        
        if not line_classified:
            # 중우선순위 체크
            for keyword in priority_keywords['medium']:
                if keyword in line:
                    medium_priority_lines.append(line)
                    print(f"[HWP 정리] 중우선순위 발견: {line[:50]}... (키워드: {keyword})")
                    line_classified = True
                    break
        
        if not line_classified:
            # 저우선순위 체크
            for keyword in priority_keywords['low']:
                if keyword in line:
                    low_priority_lines.append(line)
                    print(f"[HWP 정리] 저우선순위 발견: {line[:50]}... (키워드: {keyword})")
                    line_classified = True
                    break
        
        if not line_classified and len(line) > 10:
            other_lines.append(line)
    
    # 5. 우선순위별로 재정렬 (숫자 패턴을 가장 먼저)
    result_lines = []
    
    # 숫자로 시작하는 줄들 먼저 (동적으로 변환된 것들)
    if numbered_lines:
        result_lines.extend(numbered_lines)
        print(f"[HWP 정리] 숫자 패턴 줄 {len(numbered_lines)}개 추가")
    
    # 고우선순위
    if high_priority_lines:
        result_lines.extend(high_priority_lines)
        print(f"[HWP 정리] 고우선순위 줄 {len(high_priority_lines)}개 추가")
    
    # 중우선순위
    if medium_priority_lines:
        result_lines.extend(medium_priority_lines)
        print(f"[HWP 정리] 중우선순위 줄 {len(medium_priority_lines)}개 추가")
    
    # 저우선순위
    if low_priority_lines:
        result_lines.extend(low_priority_lines)
        print(f"[HWP 정리] 저우선순위 줄 {len(low_priority_lines)}개 추가")
    
    # 기타 (충분한 줄이 없으면 추가)
    if other_lines and len(result_lines) < 4:
        result_lines.extend(other_lines[:3])
        print(f"[HWP 정리] 기타 줄 {len(other_lines[:3])}개 추가")
    
    result = '\n'.join(result_lines)
    
    print(f"[HWP 정리] 최종 정리된 텍스트: {result[:300]}...")
    print(f"[HWP 정리] 총 {len(result_lines)}개 줄 추출됨")
    
    return result

def extract_text_from_file(file):
    """
    다양한 파일 형식에서 텍스트를 추출합니다. (HWP 동적 특수기호 감지 추가)
    """
    filename = file.filename
    if filename.endswith('.pdf'):
        try:
            with pdfplumber.open(file) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() or ''
                return text
        except Exception as e:
            return f"PDF 파일 처리 중 오류: {e}"
    
    elif filename.endswith('.hwp'):
        # HWP 파일 지원은 현재 제한적입니다
        return "HWP 파일은 현재 지원하지 않습니다. PDF나 TXT 파일을 사용해주세요."
    else:
        try:
            return file.read().decode('utf-8')
        except Exception as e:
            return f"일반 텍스트 파일 처리 중 오류: {e}"

def preprocess_image_for_ocr(image):
    """
    OCR 정확도를 높이기 위한 고급 이미지 전처리
    """
    try:
        print("[이미지 전처리] 시작...")
        
        # PIL Image를 numpy array로 변환
        img_array = np.array(image)
        original_size = img_array.shape
        print(f"[이미지 전처리] 원본 크기: {original_size}")
        
        # 그레이스케일로 변환
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # 1. 이미지 크기 조정 (너무 작으면 확대, 너무 크면 축소)
        height, width = gray.shape
        if height < 500 or width < 500:
            # 작은 이미지는 2-3배 확대
            scale_factor = 3 if min(height, width) < 300 else 2
            gray = cv2.resize(gray, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)
            print(f"[이미지 전처리] {scale_factor}배 확대: {gray.shape}")
        elif height > 2000 or width > 2000:
            # 너무 큰 이미지는 축소
            scale_factor = 0.5
            gray = cv2.resize(gray, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_AREA)
            print(f"[이미지 전처리] 0.5배 축소: {gray.shape}")
        
        # 2. 가우시안 블러로 노이즈 제거
        denoised = cv2.GaussianBlur(gray, (1, 1), 0)
        
        # 3. 대비 향상 (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # 4. 여러 임계값 방법 시도
        # Otsu's thresholding
        _, binary1 = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Adaptive thresholding
        binary2 = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                       cv2.THRESH_BINARY, 11, 2)
        
        # 가장 좋은 결과 선택 (텍스트 영역 비율로 판단)
        text_ratio1 = np.sum(binary1 == 0) / binary1.size  # 검은색 픽셀 비율
        text_ratio2 = np.sum(binary2 == 0) / binary2.size
        
        # 적절한 텍스트 비율 (5-30%)인 것 선택
        if 0.05 <= text_ratio1 <= 0.3:
            binary = binary1
            method = "Otsu"
        elif 0.05 <= text_ratio2 <= 0.3:
            binary = binary2
            method = "Adaptive"
        else:
            # 둘 다 적절하지 않으면 원본에 가까운 것 선택
            if abs(text_ratio1 - 0.15) < abs(text_ratio2 - 0.15):
                binary = binary1
                method = "Otsu (fallback)"
            else:
                binary = binary2
                method = "Adaptive (fallback)"
        
        print(f"[이미지 전처리] 이진화 방법: {method}, 텍스트 비율: {np.sum(binary == 0) / binary.size:.3f}")
        
        # 5. 모폴로지 연산으로 텍스트 정리
        kernel = np.ones((1,1), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        # 6. 작은 노이즈 제거
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        min_area = 10  # 최소 영역 크기
        for contour in contours:
            if cv2.contourArea(contour) < min_area:
                cv2.drawContours(binary, [contour], -1, 255, -1)
        
        # numpy array를 PIL Image로 다시 변환
        processed_image = Image.fromarray(binary)
        
        print("[이미지 전처리] 완료")
        return processed_image
        
    except Exception as e:
        print(f"[이미지 전처리] 오류: {e}")
        return image  # 전처리 실패시 원본 반환

def is_valid_question(text):
    """
    텍스트가 유효한 질문인지 검증합니다.
    """
    if not text or len(text.strip()) < 5:
        return False
    
    # 너무 많은 특수문자가 포함된 경우
    special_char_ratio = len(re.findall(r'[^가-힣a-zA-Z0-9\s.,?!()\[\]/-]', text)) / len(text)
    if special_char_ratio > 0.3:  # 30% 이상이 특수문자면 무효
        return False
    
    # 연속된 특수문자가 많은 경우
    if re.search(r'[^가-힣a-zA-Z0-9\s]{5,}', text):
        return False
    
    # 한글이나 영어가 전혀 없는 경우
    if not re.search(r'[가-힣a-zA-Z]', text):
        return False
    
    # 의미있는 단어가 있는지 체크
    meaningful_words = ['소개', '경험', '과정', '어려움', '극복', '강점', '지원', '동기', '포부', '계획', '목표']
    if any(word in text for word in meaningful_words):
        return True
    
    # 질문 형태인지 체크
    question_patterns = ['해주세요', '말해주세요', '설명해주세요', '작성해주세요', '어떻게', '무엇', '왜', '언제']
    if any(pattern in text for pattern in question_patterns):
        return True
    
    # 기본적으로 한글 비율이 높으면 유효로 간주
    korean_ratio = len(re.findall(r'[가-힣]', text)) / len(text)
    return korean_ratio > 0.3

def basic_question_parsing_with_keywords(text):
    """
    간소화된 키워드 기반 질문 추출 (Vision API 실패 시 대체용)
    """
    print("[키워드 기반 파싱] 간소화된 버전 시작...")
    print(f"[키워드 기반 파싱] 입력 텍스트: {text[:200]}...")
    
    # OCR 오류가 많은 텍스트인지 확인
    if len(text) > 50:
        valid_chars = len([c for c in text if c.isalnum() or c.isspace() or '\uac00' <= c <= '\ud7a3'])
        total_chars = len(text)
        if valid_chars / total_chars < 0.5:  # 절반 이상이 이상한 문자
            print("[키워드 기반 파싱] OCR 오류가 많은 텍스트로 판단, 기본 질문 사용")
            return [
                {'number': '1', 'content': '성장과정에 대해 설명해주세요'},
                {'number': '2', 'content': '지원동기를 말씀해주세요'},
                {'number': '3', 'content': '입사 후 포부를 설명해주세요'}
            ]
    
    # 핵심 키워드만 유지 (하드코딩 최소화)
    basic_keywords = {
        '성장과정': '성장과정에 대해 설명해주세요',
        '지원동기': '지원동기를 말씀해주세요', 
        '장단점': '성격의 장단점을 설명해주세요',
        '포부': '입사 후 포부를 말씀해주세요',
        '강점': '본인의 강점을 설명해주세요'
    }
    
    questions = []
    
    # 1. 숫자 패턴 우선 검색 (1. 2. 3. 형태)
    number_patterns = re.findall(r'(\d+)\.\s*([^0-9\n]{3,50})', text)
    for num, content in number_patterns:
        content = content.strip()
        if len(content) > 3:
            questions.append({
                'number': str(len(questions) + 1),
                'content': f"{content}에 대해 설명해주세요" if not content.endswith(('세요', '까요', '니까')) else content
            })
            print(f"[키워드 기반 파싱] 숫자 패턴으로 질문 생성: {content}")
    
    # 2. ■ 패턴 검색
    if len(questions) < 3:
        square_patterns = re.findall(r'■\s*([^■\n]{3,50})', text)
        for content in square_patterns:
            content = content.strip()
            questions.append({
                'number': str(len(questions) + 1),
                'content': f"{content}에 대해 설명해주세요" if not content.endswith(('세요', '까요', '니까')) else content
            })
            print(f"[키워드 기반 파싱] ■ 패턴으로 질문 생성: {content}")
    
    # 3. 기본 키워드 검색 (최소한만)
    if len(questions) < 3:
        for keyword, question in basic_keywords.items():
            if keyword in text and len(questions) < 3:
                questions.append({
                    'number': str(len(questions) + 1),
                    'content': question
                })
                print(f"[키워드 기반 파싱] '{keyword}' 키워드로 질문 생성")
                break  # 하나씩만 추가
    
    # 4. 기본값 (최소한의 질문 보장)
    if not questions:
        questions = [
            {'number': '1', 'content': '성장과정에 대해 설명해주세요'},
            {'number': '2', 'content': '지원동기를 말씀해주세요'},
            {'number': '3', 'content': '입사 후 포부를 설명해주세요'}
        ]
        print("[키워드 기반 파싱] 기본 질문 사용")
    
    print(f"[키워드 기반 파싱] 총 {len(questions)}개 질문 추출")
    for q in questions:
        print(f"  - 질문 {q['number']}: {q['content']}")
    
    return questions
