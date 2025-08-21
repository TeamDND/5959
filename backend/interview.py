import random
from flask import jsonify

def analyze_video():
    """비디오 분석 API"""
    # 실제 AI 분석 로직은 여기에 구현
    # 현재는 시뮬레이션 결과를 반환
    
    # 성능 레벨 랜덤 설정
    performance_level = random.choice([1, 2, 3])
    
    if performance_level == 1:
        # 초급자 점수 범위
        results = {
            'totalScore': round(2.5 + random.random() * 1.2, 1),
            'wpm': round(100 + random.random() * 40),
            'volume': round(60 + random.random() * 25),
            'gaze': round(40 + random.random() * 30),
            'posture': round(50 + random.random() * 25),
            'expression': round(30 + random.random() * 35),
            'environment': round(2.5 + random.random() * 1.5, 1),
            'filler': round(12 + random.random() * 8),
            'silence': round(15 + random.random() * 10),
            'ending': round(45 + random.random() * 25),
            'smile': round(25 + random.random() * 30),
            'headMove': round(45 + random.random() * 25),
            'blinkPerMin': round(8 + random.random() * 12)
        }
    elif performance_level == 2:
        # 중급자 점수 범위
        results = {
            'totalScore': round(3.5 + random.random() * 1.0, 1),
            'wpm': round(130 + random.random() * 40),
            'volume': round(70 + random.random() * 20),
            'gaze': round(60 + random.random() * 25),
            'posture': round(65 + random.random() * 25),
            'expression': round(55 + random.random() * 25),
            'environment': round(3.5 + random.random() * 1.2, 1),
            'filler': round(5 + random.random() * 10),
            'silence': round(8 + random.random() * 12),
            'ending': round(60 + random.random() * 25),
            'smile': round(45 + random.random() * 30),
            'headMove': round(65 + random.random() * 25),
            'blinkPerMin': round(10 + random.random() * 10)
        }
    else:
        # 고급자 점수 범위
        results = {
            'totalScore': round(4.2 + random.random() * 0.8, 1),
            'wpm': round(150 + random.random() * 30),
            'volume': round(80 + random.random() * 15),
            'gaze': round(75 + random.random() * 20),
            'posture': round(80 + random.random() * 15),
            'expression': round(70 + random.random() * 25),
            'environment': round(4.0 + random.random() * 1.0, 1),
            'filler': round(2 + random.random() * 6),
            'silence': round(3 + random.random() * 8),
            'ending': round(75 + random.random() * 20),
            'smile': round(65 + random.random() * 25),
            'headMove': round(80 + random.random() * 15),
            'blinkPerMin': round(12 + random.random() * 8)
        }
    
    # 상관관계 적용
    if results['gaze'] < 60:
        results['expression'] = max(30, int(results['expression'] * 0.8))
    
    if results['filler'] > 12:
        results['wpm'] = max(80, int(results['wpm'] * 0.9))
    
    if results['environment'] < 3.0:
        results['totalScore'] = max(1.5, round(results['totalScore'] * 0.9, 1))
    
    # 코칭 팁 생성
    tips = generate_coaching_tips(results)
    
    return {
        'results': results,
        'tips': tips
    }

def generate_coaching_tips(r):
    """코칭 팁 생성 함수"""
    tips = []
    issues = []
    
    # 각 메트릭의 문제점과 중요도 평가
    if r['wpm'] < 120:
        issues.append({'priority': 9, 'tip': f"🗣️ 말속도가 매우 느립니다({r['wpm']} WPM). 140-160 WPM을 목표로 연습하세요."})
    elif r['wpm'] < 140:
        issues.append({'priority': 6, 'tip': f"🗣️ 말속도를 약간 올려보세요({r['wpm']} WPM). 자신감 있게 또박또박 말해보세요."})
    elif r['wpm'] > 200:
        issues.append({'priority': 8, 'tip': '⏱️ 말속도가 너무 빠릅니다. 청중이 따라올 수 있도록 천천히 말하세요.'})
    elif r['wpm'] > 180:
        issues.append({'priority': 5, 'tip': '⏱️ 말속도를 10% 정도 낮춰 문장 끝 호흡을 분명히 해보세요.'})
    
    if r['gaze'] < 50:
        issues.append({'priority': 10, 'tip': f"👀 시선 집중도가 낮습니다({r['gaze']}%). 카메라를 정면으로 바라보는 연습을 하세요."})
    elif r['gaze'] < 70:
        issues.append({'priority': 7, 'tip': '👀 카메라 렌즈를 더 자주 바라보세요. 핵심 문장 시작과 끝에 렌즈 고정!'})
    
    if r['filler'] > 15:
        issues.append({'priority': 9, 'tip': f"🧩 불필요어가 많습니다({r['filler']}%). 말하기 전 1초 생각하는 습관을 기르세요."})
    elif r['filler'] > 8:
        issues.append({'priority': 6, 'tip': '🧩 "음/어"를 줄이려면 문장 사이 0.5초 짧은 침묵으로 생각 정리 후 말하세요.'})
    
    if r['smile'] < 40:
        issues.append({'priority': 8, 'tip': f"😊 표정이 경직되어 있습니다({r['smile']}%). 자연스러운 미소로 친근함을 표현하세요."})
    elif r['smile'] < 60:
        issues.append({'priority': 5, 'tip': '🙂 인사/결론 구간에서 미소를 유지하면 신뢰감이 높아집니다.'})
    
    if r['posture'] < 60:
        issues.append({'priority': 7, 'tip': f"💺 자세가 불안정합니다({r['posture']}%). 등을 곧게 펴고 어깨를 자연스럽게 유지하세요."})
    elif r['posture'] < 75:
        issues.append({'priority': 4, 'tip': '💺 허리 세우고 어깨를 살짝 뒤로! 상체 흔들림을 줄여 안정감을 주세요.'})
    
    # 우수한 경우 격려 메시지
    if r['totalScore'] >= 4.5:
        tips.append('🎉 훌륭한 프레젠테이션입니다! 전문적이고 자신감 있는 모습이 인상적입니다.')
    elif r['totalScore'] >= 4.0:
        tips.append('👍 전반적으로 우수합니다! 몇 가지 세부사항만 보완하면 완벽해집니다.')
    elif r['totalScore'] >= 3.0:
        tips.append('💪 기본기는 갖춰져 있습니다. 아래 개선점을 연습하면 크게 향상될 것입니다.')
    else:
        tips.append('🌱 연습할 부분이 많지만 충분히 개선 가능합니다. 하나씩 차근차근 연습해보세요.')
    
    # 우선순위 순으로 정렬하여 상위 3개 이슈 선택
    issues.sort(key=lambda x: x['priority'], reverse=True)
    top_issues = issues[:3]
    
    for issue in top_issues:
        tips.append(issue['tip'])
    
    return tips[:4] if tips else ['🎉 전반적으로 우수합니다! 동일 조건에서 3회 반복 촬영으로 안정성을 높여보세요.']

def analyze_video_api():
    """비디오 분석 API"""
    try:
        result = analyze_video()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
