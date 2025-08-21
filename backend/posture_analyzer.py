import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import mediapipe as mp

class PostureAnalyzer:
    def __init__(self):
        """자세 분석기 초기화"""
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5
        )
        self.base_landmarks = None
        self.base_posture = None
        
    def analyze_image(self, image_data):
        """MediaPipe를 사용한 실제 자세 분석"""
        try:
            # base64 이미지 데이터를 numpy 배열로 변환
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {
                    'success': False,
                    'error': '이미지 디코딩 실패',
                    'message': '이미지를 처리할 수 없습니다.'
                }
            
            # BGR을 RGB로 변환 (MediaPipe는 RGB 사용)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # MediaPipe로 포즈 랜드마크 추출
            results = self.pose.process(image_rgb)
            
            if not results.pose_landmarks:
                return {
                    'success': False,
                    'error': '포즈 랜드마크를 찾을 수 없음',
                    'message': '사람의 자세를 감지할 수 없습니다. 카메라 앞에 서주세요.'
                }
            
            # 랜드마크 좌표 추출
            landmarks = []
            for landmark in results.pose_landmarks.landmark:
                landmarks.append([landmark.x, landmark.y, landmark.z])
            
            # 자세 점수 계산 (어깨, 목, 머리 위치 기반)
            posture_score = self._calculate_posture_score(landmarks)
            
            return {
                'success': True,
                'posture_score': posture_score,
                'status': 'normal' if posture_score > 0.6 else 'warning',
                'message': 'MediaPipe 기반 자세 분석 완료',
                'landmarks': landmarks
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': f'이미지 분석 중 오류 발생: {str(e)}'
            }
    
    def _calculate_posture_score(self, landmarks):
        """랜드마크를 기반으로 자세 점수 계산"""
        try:
            # 주요 랜드마크 인덱스
            LEFT_SHOULDER = 11
            RIGHT_SHOULDER = 12
            LEFT_EAR = 7
            RIGHT_EAR = 8
            NOSE = 0
            
            # 어깨 수평성 확인
            left_shoulder = landmarks[LEFT_SHOULDER]
            right_shoulder = landmarks[RIGHT_SHOULDER]
            
            # 어깨 높이 차이 (수평성)
            shoulder_height_diff = abs(left_shoulder[1] - right_shoulder[1])
            
            # 머리 위치 확인 (어깨보다 위에 있는지)
            left_ear = landmarks[LEFT_EAR]
            right_ear = landmarks[RIGHT_EAR]
            nose = landmarks[NOSE]
            
            # 어깨 중앙점
            shoulder_center_y = (left_shoulder[1] + right_shoulder[1]) / 2
            
            # 머리가 어깨보다 위에 있는지 확인
            head_above_shoulders = (left_ear[1] + right_ear[1]) / 2 < shoulder_center_y
            
            # 자세 점수 계산
            score = 1.0
            
            # 어깨 수평성 (0.3 가중치)
            if shoulder_height_diff < 0.05:  # 5% 이내 차이
                score -= 0.0
            elif shoulder_height_diff < 0.1:  # 10% 이내 차이
                score -= 0.1
            else:
                score -= 0.3
            
            # 머리 위치 (0.4 가중치)
            if head_above_shoulders:
                score -= 0.0
            else:
                score -= 0.4
            
            # 목 각도 (0.3 가중치)
            neck_angle = self._calculate_neck_angle(landmarks)
            if neck_angle < 15:  # 15도 이내
                score -= 0.0
            elif neck_angle < 30:  # 30도 이내
                score -= 0.15
            else:
                score -= 0.3
            
            return max(0.0, score)
            
        except Exception as e:
            print(f"자세 점수 계산 오류: {e}")
            return 0.5  # 기본값
    
    def _calculate_neck_angle(self, landmarks):
        """목 각도 계산"""
        try:
            # 목 관련 랜드마크
            NOSE = 0
            LEFT_SHOULDER = 11
            RIGHT_SHOULDER = 12
            
            nose = landmarks[NOSE]
            left_shoulder = landmarks[LEFT_SHOULDER]
            right_shoulder = landmarks[RIGHT_SHOULDER]
            
            # 어깨 중앙점
            shoulder_center = [
                (left_shoulder[0] + right_shoulder[0]) / 2,
                (left_shoulder[1] + right_shoulder[1]) / 2
            ]
            
            # 수직선과의 각도 계산
            dx = nose[0] - shoulder_center[0]
            dy = nose[1] - shoulder_center[1]
            
            if dx == 0:
                return 0
            
            angle = abs(np.arctan(dx / dy) * 180 / np.pi)
            return angle
            
        except Exception as e:
            print(f"목 각도 계산 오류: {e}")
            return 0
    
    def compare_postures(self, base_image, current_image, movement_threshold='medium'):
        """기본 자세와 현재 자세 비교 - 움직임 민감도 기반"""
        try:
            # 기본 자세 분석
            base_result = self.analyze_image(base_image)
            if not base_result['success']:
                return base_result
            
            # 현재 자세 분석
            current_result = self.analyze_image(current_image)
            if not current_result['success']:
                return current_result
            
            # 랜드마크 기반 자세 차이 계산
            difference = self._calculate_landmark_difference(
                base_result['landmarks'], 
                current_result['landmarks']
            )
            
            # 움직임 민감도에 따른 임계값 동적 조정
            thresholds = self._get_thresholds_by_movement_level(movement_threshold)
            
            # 자세 상태 판단 - 동적 임계값 적용
            if difference < thresholds['normal']:
                status = 'normal'
                message = '자세가 정상입니다'
            elif difference < thresholds['warning']:
                status = 'warning'
                message = '자세가 약간 어긋났습니다'
            else:
                status = 'alert'
                message = '자세가 많이 어긋났습니다!'
            
            return {
                'success': True,
                'difference': difference,
                'status': status,
                'message': message,
                'base_score': base_result['posture_score'],
                'current_score': current_result['posture_score'],
                'base_landmarks': base_result['landmarks'],
                'current_landmarks': current_result['landmarks'],
                'thresholds_used': thresholds,
                'movement_threshold': movement_threshold
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': f'자세 비교 중 오류 발생: {str(e)}'
            }
    
    def _get_thresholds_by_movement_level(self, movement_threshold):
        """움직임 민감도 레벨에 따른 임계값 반환 - 전반적으로 덜 민감하게 조정"""
        thresholds = {
            'low': {
                'normal': 0.25,      # 매우 민감 → 덜 민감하게 조정 (0.12 → 0.25)
                'warning': 0.45,     # 0.25 → 0.45
                'description': '민감하게 설정됨 (조정됨)'
            },
            'medium': {
                'normal': 0.35,      # 보통 민감 → 덜 민감하게 조정 (0.175 → 0.35)
                'warning': 0.6,      # 0.375 → 0.6
                'description': '보통 민감하게 설정됨 (조정됨)'
            },
            'high': {
                'normal': 0.5,       # 덜 민감 → 더 덜 민감하게 조정 (0.25 → 0.5)
                'warning': 0.75,     # 0.5 → 0.75
                'description': '덜 민감하게 설정됨 (조정됨)'
            }
        }
        
        return thresholds.get(movement_threshold, thresholds['medium'])
    
    def _calculate_landmark_difference(self, base_landmarks, current_landmarks):
        """두 랜드마크 세트 간의 차이 계산"""
        try:
            if not base_landmarks or not current_landmarks:
                return 1.0
            
            if len(base_landmarks) != len(current_landmarks):
                return 1.0
            
            total_diff = 0.0
            valid_landmarks = 0
            
            # 주요 랜드마크만 비교 (어깨, 목, 머리)
            key_landmarks = [0, 7, 8, 11, 12]  # nose, ears, shoulders
            
            for idx in key_landmarks:
                if idx < len(base_landmarks) and idx < len(current_landmarks):
                    base_pos = base_landmarks[idx]
                    current_pos = current_landmarks[idx]
                    
                    # 3D 거리 계산
                    diff = np.sqrt(
                        (base_pos[0] - current_pos[0])**2 +
                        (base_pos[1] - current_pos[1])**2 +
                        (base_pos[2] - current_pos[2])**2
                    )
                    
                    total_diff += diff
                    valid_landmarks += 1
            
            if valid_landmarks == 0:
                return 1.0
            
            # 평균 차이를 0~1 범위로 정규화 - 스케일링 조정
            avg_diff = total_diff / valid_landmarks
            # 스케일링을 1.5로 줄여서 더 자연스러운 감지
            normalized_diff = min(avg_diff * 1.5, 1.0)  # 2.0 → 1.5로 감소
            
            return normalized_diff
            
        except Exception as e:
            print(f"랜드마크 차이 계산 오류: {e}")
            return 1.0
    
    def get_landmarks(self, image_data):
        """MediaPipe를 사용한 랜드마크 추출"""
        result = self.analyze_image(image_data)
        if result['success']:
            return {
                'success': True,
                'message': 'MediaPipe 랜드마크 추출 완료',
                'landmarks': result['landmarks']
            }
        else:
            return result
