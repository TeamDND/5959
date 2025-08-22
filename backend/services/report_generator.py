from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import os
import urllib.request
from typing import Dict, List

class ReportGenerator:
    def __init__(self):
        # 한글 폰트 설정
        self.font_name = self._setup_korean_font()
    
    def _setup_korean_font(self):
        """한글 폰트 설정"""
        try:
            # Malgun Gothic (Windows 기본 한글 폰트) 시도
            font_paths = [
                'C:/Windows/Fonts/malgun.ttf',  # 맑은 고딕
                'C:/Windows/Fonts/gulim.ttc',   # 굴림
                'C:/Windows/Fonts/batang.ttc',  # 바탕
            ]
            
            for font_path in font_paths:
                if os.path.exists(font_path):
                    try:
                        pdfmetrics.registerFont(TTFont('KoreanFont', font_path))
                        print(f"한글 폰트 로딩 성공: {font_path}")
                        return 'KoreanFont'
                    except Exception as e:
                        print(f"폰트 로딩 실패 {font_path}: {e}")
                        continue
            
            # 모든 폰트 실패시 기본 폰트
            print("한글 폰트를 찾을 수 없어 기본 폰트를 사용합니다.")
            return 'Helvetica'
            
        except Exception as e:
            print(f"폰트 설정 오류: {e}")
            return 'Helvetica'
    
    def _safe_text(self, text):
        """한글 텍스트 안전 처리"""
        if not text:
            return ""
        try:
            # 문자열로 변환 후 안전하게 처리
            safe_text = str(text).replace('\u00a0', ' ')  # non-breaking space 제거
            return safe_text
        except:
            return str(text)
    
    def create_pdf_report(self, session_data: Dict) -> str:
        filename = f"interview_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        # 임시 파일로만 생성 (폴더 저장 안함)
        import tempfile
        file_path = os.path.join(tempfile.gettempdir(), filename)
        
        doc = SimpleDocTemplate(file_path, pagesize=A4)
        story = []
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=self.font_name,
            fontSize=24,
            spaceAfter=30,
            alignment=1,  # 중앙 정렬
            textColor=colors.darkblue
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=self.font_name,
            fontSize=16,
            spaceAfter=12,
            textColor=colors.darkblue
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName=self.font_name,
            fontSize=12,
            spaceAfter=6
        )
        
        # 제목
        story.append(Paragraph(self._safe_text("모의면접 결과 리포트"), title_style))
        story.append(Spacer(1, 20))
        
        # 기본 정보
        story.append(Paragraph(self._safe_text("면접 정보"), heading_style))
        info_data = [
            [self._safe_text("면접 날짜"), self._safe_text(datetime.now().strftime('%Y년 %m월 %d일'))],
            [self._safe_text("총 질문 수"), self._safe_text(str(len(session_data.get('questions', []))))],
            [self._safe_text("평균 점수"), self._safe_text(f"{self._calculate_average_score(session_data.get('scores', []))}점")],
            [self._safe_text("총 소요 시간"), self._safe_text(self._calculate_total_time(session_data))]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 3*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # 점수 분석
        story.append(Paragraph(self._safe_text("점수 분석"), heading_style))
        scores = session_data.get('scores', [])
        if scores:
            score_analysis = self._generate_score_analysis(scores)
            story.append(Paragraph(self._safe_text(score_analysis), normal_style))
        story.append(Spacer(1, 20))
        
        # 질문별 상세 결과
        story.append(Paragraph(self._safe_text("질문별 상세 결과"), heading_style))
        
        questions = session_data.get('questions', [])
        answers = session_data.get('answers', [])
        scores = session_data.get('scores', [])
        feedback = session_data.get('feedback', [])
        
        for i, question in enumerate(questions):
            if i < len(answers):
                story.append(Paragraph(self._safe_text(f"질문 {i+1}"), heading_style))
                story.append(Paragraph(self._safe_text(f"Q: {question}"), normal_style))
                story.append(Paragraph(self._safe_text(f"A: {answers[i]}"), normal_style))
                
                if i < len(scores):
                    story.append(Paragraph(self._safe_text(f"점수: {scores[i]}점"), normal_style))
                
                if i < len(feedback):
                    story.append(Paragraph(self._safe_text(f"피드백: {feedback[i]}"), normal_style))
                
                story.append(Spacer(1, 15))
        
        # 종합 평가
        story.append(Paragraph(self._safe_text("종합 평가"), heading_style))
        overall_evaluation = self._generate_overall_evaluation(scores)
        story.append(Paragraph(self._safe_text(overall_evaluation), normal_style))
        
        # 개선 방안
        story.append(Spacer(1, 20))
        story.append(Paragraph(self._safe_text("개선 방안"), heading_style))
        improvement_suggestions = self._generate_improvement_suggestions(scores, feedback)
        story.append(Paragraph(self._safe_text(improvement_suggestions), normal_style))
        
        doc.build(story)
        return file_path
    
    def _calculate_average_score(self, scores: List[int]) -> float:
        if not scores:
            return 0
        return round(sum(scores) / len(scores), 1)
    
    def _calculate_total_time(self, session_data: Dict) -> str:
        answers = session_data.get('answers', [])
        total_minutes = len(answers) * 3  # 평균 3분으로 가정
        return f"{total_minutes}분"
    
    def _generate_score_analysis(self, scores: List[int]) -> str:
        if not scores:
            return "점수 데이터가 없습니다."
        
        avg_score = self._calculate_average_score(scores)
        max_score = max(scores)
        min_score = min(scores)
        
        analysis = f"평균 점수는 {avg_score}점입니다. "
        
        if avg_score >= 80:
            analysis += "전반적으로 우수한 답변을 보여주셨습니다."
        elif avg_score >= 60:
            analysis += "보통 수준의 답변이지만 더 발전할 여지가 있습니다."
        else:
            analysis += "답변 준비와 연습이 더 필요합니다."
        
        analysis += f" 최고 점수는 {max_score}점, 최저 점수는 {min_score}점입니다."
        
        return analysis
    
    def _generate_overall_evaluation(self, scores: List[int]) -> str:
        if not scores:
            return "평가 데이터가 없습니다."
        
        avg_score = self._calculate_average_score(scores)
        
        if avg_score >= 85:
            return "매우 우수한 면접 수행을 보여주셨습니다. 자신감을 가지고 실제 면접에 임하시기 바랍니다."
        elif avg_score >= 70:
            return "양호한 면접 수행이었습니다. 몇 가지 부분만 보완하면 더 좋은 결과를 얻을 수 있을 것입니다."
        elif avg_score >= 55:
            return "기본적인 면접 수행은 되었지만, 답변의 구체성과 논리성을 더 높여야 합니다."
        else:
            return "면접 준비가 더 필요합니다. 예상 질문에 대한 답변을 미리 준비하고 연습하시기 바랍니다."
    
    def _generate_improvement_suggestions(self, scores: List[int], feedback: List[str]) -> str:
        suggestions = []
        
        if not scores:
            return "개선 방안을 제시할 데이터가 없습니다."
        
        avg_score = self._calculate_average_score(scores)
        
        if avg_score < 70:
            suggestions.append("• 예상 질문에 대한 답변을 미리 준비하고 연습하세요.")
            suggestions.append("• STAR 기법(Situation, Task, Action, Result)을 활용해 답변을 구조화하세요.")
        
        if any(score < 60 for score in scores):
            suggestions.append("• 답변 시 구체적인 경험과 사례를 포함하세요.")
            suggestions.append("• 시간 내에 답변을 완료할 수 있도록 연습하세요.")
        
        # 피드백에서 공통 개선사항 추출
        if feedback:
            feedback_text = " ".join(feedback)
            if "시간" in feedback_text:
                suggestions.append("• 시간 관리에 더 신경 쓰세요.")
            if "구체적" in feedback_text:
                suggestions.append("• 더 구체적이고 상세한 답변을 준비하세요.")
        
        if not suggestions:
            suggestions.append("• 현재 수준을 유지하되, 답변의 일관성을 더 높이세요.")
        
        return "\n".join(suggestions)