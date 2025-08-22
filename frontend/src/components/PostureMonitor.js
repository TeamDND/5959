import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/PostureMonitor.css';
import Layout from './Layout';

function PostureMonitor() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const realtimeVideoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [baseImage, setBaseImage] = useState(null);
    const [isBaseImageCaptured, setIsBaseImageCaptured] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [postureStatus, setPostureStatus] = useState('normal');
    const [alertCount, setAlertCount] = useState(0); // 연속 경고 카운터 (settings.alertCount와 비교용)
    const [analysisInterval, setAnalysisInterval] = useState(null);
    const [analysisCount, setAnalysisCount] = useState(0);
    const [lastCapturedImage, setLastCapturedImage] = useState(null);
    const [analysisStartTime, setAnalysisStartTime] = useState(null);
    const [previousPostureStatus, setPreviousPostureStatus] = useState('normal'); // 이전 자세 상태 추적

    // 🎨 커스텀 미니 알림창 상태
    const [miniAlert, setMiniAlert] = useState({
        isVisible: false,
        status: '',
        count: 0,
        id: 0
    });

    // 설정 상태
    const [settings, setSettings] = useState({
        movementThreshold: 'medium',
        interval: 3,
        alertCount: 3,
        backgroundMode: false,        // 백그라운드 분석 모드
        notificationEnabled: false    // 브라우저 알림 허용
    });

    useEffect(() => {
        // 화면 진입 시 기본 이미지 초기화
        setBaseImage(null);
        setIsBaseImageCaptured(false);
        localStorage.removeItem('postureBaseImage');

        // 저장된 설정만 불러오기
        const savedSettings = localStorage.getItem('postureSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }

        startCamera();

        // 📱 페이지 가시성 변경 감지 (백그라운드 모드 지원)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // 백그라운드 모드가 활성화된 경우
                if (settings.backgroundMode) {
                    console.log('📱 페이지가 숨겨짐 - 백그라운드 모드: 분석 지속');
                    // 웹캠은 유지하고 분석도 계속 진행
                    // UI 업데이트만 최소화
                } else {
                    console.log('📱 페이지가 숨겨짐 - 일반 모드: 웹캠 및 분석 중지');
                    stopCamera();
                    if (isAnalyzing) {
                        stopAnalysis();
                    }
                }
            } else {
                console.log('📱 페이지가 다시 보임 - 웹캠 재시작');
                if (!isCameraOn) {
                    startCamera();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopCamera();
            if (analysisInterval) {
                clearInterval(analysisInterval);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const startCamera = async () => {
        try {
            if (stream) {
                stopCamera();
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            setStream(mediaStream);

            // 기본 자세용 video 요소에 스트림 연결
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            // 실시간 자세용 video 요소에 스트림 연결
            if (realtimeVideoRef.current) {
                realtimeVideoRef.current.srcObject = mediaStream;
            }

            setIsCameraOn(true);
            console.log('📹 웹캠 스트림 시작됨 - 두 화면에 연결');
        } catch (error) {
            console.error('카메라 접근 실패:', error);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);

            // 기본 자세용 video 요소 정리
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }

            // 실시간 자세용 video 요소 정리
            if (realtimeVideoRef.current) {
                realtimeVideoRef.current.srcObject = null;
            }

            setIsCameraOn(false);
            console.log('웹캠 스트림 중지됨 - 두 화면에서 해제');
        }
    };

    const captureBaseImage = async () => {
        // 촬영 시 실시간 모니터링 중단
        if (isAnalyzing) {
            stopAnalysis();
            console.log('📸 기본 이미지 촬영을 위해 실시간 모니터링 중단');
        }

        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);

            const imageData = canvas.toDataURL('image/jpeg');

            try {
                // 백엔드 API 호출
                const response = await fetch('/api/posture/setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageData })
                });

                const result = await response.json();

                if (response.ok) {
                    setBaseImage(imageData);
                    setIsBaseImageCaptured(true);
                    localStorage.setItem('postureBaseImage', imageData);
                    localStorage.setItem('postureAnalysisResult', JSON.stringify(result));
                    console.log('✅ 기본 자세 이미지 저장 완료');
                } else {
                    alert('이미지 저장 실패: ' + result.error);
                }
            } catch (error) {
                console.error('API 호출 오류:', error);
                alert('서버 연결 오류가 발생했습니다.');
            }
        }
    };

    const recaptureBaseImage = () => {
        console.log('🔄 재촬영을 위해 페이지 새로고침');
        window.location.reload();
    };

    const captureCurrentImage = () => {
        if (realtimeVideoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = realtimeVideoRef.current.videoWidth;
            canvas.height = realtimeVideoRef.current.videoHeight;
            context.drawImage(realtimeVideoRef.current, 0, 0);

            const timestamp = new Date().toLocaleTimeString();
            console.log(`📸 [${timestamp}] 이미지 캡처 완료 - 해상도: ${canvas.width}x${canvas.height}`);

            const imageData = canvas.toDataURL('image/jpeg');
            setLastCapturedImage(imageData);
            return imageData;
        }
        return null;
    };

    const analyzePosture = async () => {
        if (!baseImage) {
            console.log('⚠️ 기본 이미지가 없어서 분석을 건너뜁니다.');
            return;
        }

        const currentImage = captureCurrentImage();
        if (!currentImage) {
            console.log('❌ 현재 이미지 캡처에 실패했습니다.');
            return;
        }

        // 이미지 데이터 유효성 검사
        if (!baseImage.startsWith('data:image') || !currentImage.startsWith('data:image')) {
            console.log('❌ 유효하지 않은 이미지 데이터입니다.');
            return;
        }

        setAnalysisCount(prev => prev + 1);
        const timestamp = new Date().toLocaleTimeString();
        console.log(`🔍 [${timestamp}] 자세 분석 시작 - ${analysisCount + 1}번째 분석`);
        console.log(`📊 기본 이미지 크기: ${baseImage.length}, 현재 이미지 크기: ${currentImage.length}`);

        try {
            const requestData = {
                base_image: baseImage,
                current_image: currentImage,
                movement_threshold: settings.movementThreshold || 'medium'
            };

            console.log(`📤 API 요청 데이터:`, {
                base_image_length: requestData.base_image.length,
                current_image_length: requestData.current_image.length,
                movement_threshold: requestData.movement_threshold
            });

            const response = await fetch('/api/posture/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log(`📥 응답 상태: ${response.status} ${response.statusText}`);

            const result = await response.json();

            if (response.ok) {
                // 🔄 정상화 감지: 이전 상태가 경고/주의였고 현재 상태가 정상인 경우
                const isRecovered = (previousPostureStatus === 'warning' || previousPostureStatus === 'alert') && result.status === 'normal';

                // 이전 상태 업데이트
                setPreviousPostureStatus(postureStatus);
                setPostureStatus(result.status);

                if (result.status === 'warning' || result.status === 'alert') {
                    // 📊 연속 경고 카운터 증가 (함수형 업데이트로 정확한 상태 보장)
                    setAlertCount(prevCount => {
                        const newAlertCount = prevCount + 1;

                        console.log(`📊 [UI 업데이트] 연속 경고 카운터: ${prevCount} → ${newAlertCount}/${settings.alertCount}`);

                        // 🔔 알림 조건 검사: settings.alertCount에 처음 도달하거나 그 이후 배수일 때만 알림
                        const shouldShowAlert = newAlertCount === settings.alertCount ||
                            (newAlertCount > settings.alertCount && newAlertCount % settings.alertCount === 0);

                        if (shouldShowAlert) {
                            console.log(`🚨 알림 조건 충족! ${newAlertCount}회 연속 경고 - 알림 표시`);
                            console.log(`🔍 조건 분석: 첫 도달=${newAlertCount === settings.alertCount}, 배수=${newAlertCount % settings.alertCount === 0}`);

                            // 🔔 브라우저 알림 전송
                            sendPostureNotification(result.status, newAlertCount);

                            // 🎨 커스텀 미니 알림창 표시
                            showMiniAlert(result.status, newAlertCount);
                        } else {
                            console.log(`⏳ 알림 대기 중... (${newAlertCount}/${settings.alertCount})`);
                        }

                        return newAlertCount;
                    });
                } else if (result.status === 'normal') {
                    // 🔄 정상 상태로 복구 시 카운터 초기화 (함수형 업데이트)
                    setAlertCount(prevCount => {
                        if (prevCount > 0) {
                            console.log(`🔄 [UI 업데이트] 정상 복구: 연속 경고 카운터 ${prevCount} → 0 으로 초기화`);

                            // 정상화 알림 (이전에 경고가 있었던 경우만)
                            if (isRecovered) {
                                console.log('🎉 자세가 정상으로 복구되었습니다!');
                                showMiniAlert('normal', 0);
                            }

                            return 0;
                        }
                        return prevCount; // 이미 0이면 변경하지 않음
                    });
                }

                console.log(`✅ [${timestamp}] 자세 분석 완료 - 상태: ${result.status}, 차이: ${result.difference?.toFixed(3) || 'N/A'}`);
                console.log(`🎯 사용된 임계값: ${result.thresholds_used?.description || 'N/A'}`);
            } else {
                console.error(`❌ [${timestamp}] 자세 분석 실패:`, {
                    status: response.status,
                    statusText: response.statusText,
                    error: result.error || result.message || 'Unknown error',
                    result: result
                });
            }
        } catch (error) {
            console.error(`❌ [${timestamp}] 자세 분석 네트워크 오류:`, error);
            console.error('네트워크 오류 상세:', {
                message: error.message,
                stack: error.stack
            });
        }
    };

    const startAnalysis = () => {
        // 디버깅 로그 추가
        console.log('🔍 분석 시작 버튼 클릭됨');
        console.log('baseImage 상태:', !!baseImage);
        console.log('isBaseImageCaptured 상태:', isBaseImageCaptured);

        // 기본 자세가 설정되지 않았다면 알림 표시
        if (!baseImage) {
            console.log('❌ 기본자세가 설정되지 않음 - 알림 표시');
            alert('기본자세를 먼저 설정해주세요');
            return;
        }

        console.log('✅ 기본자세 확인됨 - 분석 시작');
        setIsAnalyzing(true);
        setAlertCount(0);
        setAnalysisCount(0);
        setAnalysisStartTime(new Date()); // 분석 시작 시간 기록

        const interval = Math.max(settings.interval || 2, 3);
        console.log(`🚀 자세 분석 시작 - ${interval}초마다 이미지 캡처 및 분석 수행 (최소 3초)`);

        const analysisInterval = setInterval(analyzePosture, interval * 1000);
        setAnalysisInterval(analysisInterval);
    };

    const stopAnalysis = () => {
        setIsAnalyzing(false);
        setPostureStatus('normal');

        // 📊 연속 경고 카운터 초기화 (함수형 업데이트)
        setAlertCount(prevCount => {
            if (prevCount > 0) {
                console.log(`🔄 [분석 중지] 연속 경고 카운터 ${prevCount} → 0 으로 초기화`);
            }
            return 0;
        });

        setAnalysisStartTime(null); // 분석 시작 시간 초기화
        setPreviousPostureStatus('normal'); // 이전 상태 초기화

        console.log(`⏹️ 자세 분석 중지 - 총 ${analysisCount}번의 분석 수행됨`);
        console.log(`✅ 상태 초기화: 자세 상태 → 정상, 연속 경고 → 0`);

        if (analysisInterval) {
            clearInterval(analysisInterval);
            setAnalysisInterval(null);
        }
    };

    const handleSettingChange = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('postureSettings', JSON.stringify(newSettings));

        // 분석 중이면 자동으로 중지 (설정 변경 시)
        if (isAnalyzing) {
            stopAnalysis();
        }
    };

    const getStatusColor = () => {
        switch (postureStatus) {
            case 'warning': return '#ff9900';
            case 'alert': return '#ff0000';
            case 'normal':
            default: return '#005793';
        }
    };

    const getMovementThresholdDescription = (threshold) => {
        switch (threshold) {
            case 'low': return '민감 - 적당한 움직임에서 감지 (조정됨)';
            case 'medium': return '보통 - 명확한 움직임에서 감지 (조정됨)';
            case 'high': return '덜 민감 - 큰 움직임에서만 감지 (조정됨)';
            default: return '보통 - 명확한 움직임에서 감지 (조정됨)';
        }
    };

    const formatDateTime = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const period = hours < 12 ? '오전' : '오후';
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;

        return `${year}년 ${month}월 ${day}일 ${period} ${displayHours}:${minutes}`;
    };

    // 🔔 브라우저 Notification API 관련 함수들

    /**
     * 브라우저 알림 권한을 요청하는 함수
     * @returns {Promise<boolean>} 알림 권한 허용 여부
     */
    const requestNotificationPermission = async () => {
        // Notification API가 브라우저에서 지원되는지 확인
        if (!('Notification' in window)) {
            console.warn('이 브라우저는 Notification API를 지원하지 않습니다.');
            return false;
        }

        // 이미 권한이 허용된 경우
        if (Notification.permission === 'granted') {
            console.log('알림 권한이 이미 허용되었습니다.');
            return true;
        }

        // 권한이 거부된 경우
        if (Notification.permission === 'denied') {
            console.warn('알림 권한이 거부되었습니다. 브라우저 설정에서 직접 허용해야 합니다.');
            return false;
        }

        try {
            // 사용자에게 알림 권한 요청
            const permission = await Notification.requestPermission();
            const isGranted = permission === 'granted';

            console.log(`알림 권한 요청 결과: ${permission}`);
            return isGranted;
        } catch (error) {
            console.error('알림 권한 요청 중 오류 발생:', error);
            return false;
        }
    };

    /**
     * 자세 경고 알림을 브라우저 알림으로 표시하는 함수
     * @param {string} status - 자세 상태 ('warning' 또는 'alert')
     * @param {number} count - 누적 경고 횟수
     */
    const sendPostureNotification = (status, count) => {
        console.log(`🔔 [브라우저 알림] 호출됨 - status: ${status}, count: ${count}`);
        console.log(`🔍 [브라우저 알림] 설정 확인 - notificationEnabled: ${settings.notificationEnabled}, permission: ${Notification.permission}, hidden: ${document.hidden}`);

        // 알림 기능이 비활성화된 경우 실행하지 않음
        if (!settings.notificationEnabled) {
            console.log('❌ [브라우저 알림] 브라우저 알림이 비활성화되어 있습니다.');
            return;
        }

        // 알림 권한이 없는 경우 실행하지 않음
        if (Notification.permission !== 'granted') {
            console.warn('❌ [브라우저 알림] 알림 권한이 없어 브라우저 알림을 표시할 수 없습니다.');
            return;
        }

        // 🔄 중복 방지: 페이지가 보이는 상태에서는 브라우저 알림 대신 미니 알림창만 사용
        if (!document.hidden) {
            console.log('⏭️ [브라우저 알림] 페이지가 활성 상태이므로 브라우저 알림 대신 미니 알림창을 사용합니다.');
            return;
        }

        // 상태에 따른 알림 메시지 설정
        const messages = {
            warning: {
                title: '⚠️ 자세 주의',
                body: `자세가 약간 틀어졌습니다. 올바른 자세로 돌아가세요.`,
                icon: '⚠️'
            },
            alert: {
                title: '🚨 자세 경고',
                body: `자세가 많이 틀어졌습니다! 즉시 올바른 자세로 돌아가세요.`,
                icon: '🚨'
            }
        };

        const message = messages[status] || messages.warning;

        try {
            // 브라우저 알림 생성
            const notification = new Notification(message.title, {
                body: message.body,
                icon: '/favicon.ico', // 브라우저 탭 아이콘 사용
                tag: 'posture-alert', // 중복 알림 방지를 위한 태그
                requireInteraction: false, // 자동으로 사라지도록 설정
                silent: false, // 소리 알림 허용
                renotify: true, // 같은 태그의 알림도 새로 표시
                timestamp: Date.now()
            });

            // 알림 클릭 시 이벤트 처리
            notification.onclick = () => {
                console.log('자세 알림이 클릭되었습니다.');
                // 브라우저 창을 포커스
                window.focus();
                // 알림 닫기
                notification.close();
            };

            // 알림이 표시된 후 자동으로 닫기 (5초 후)
            setTimeout(() => {
                notification.close();
            }, 5000);

            console.log(`✅ 자세 ${status} 알림이 표시되었습니다.`);

        } catch (error) {
            console.error('브라우저 알림 생성 중 오류 발생:', error);
        }
    };

    /**
     * 알림 설정을 토글하고 필요시 권한을 요청하는 함수
     */
    const toggleNotificationSetting = async () => {
        if (!settings.notificationEnabled) {
            // 알림을 활성화하려는 경우 권한 요청
            const hasPermission = await requestNotificationPermission();
            if (hasPermission) {
                handleSettingChange('notificationEnabled', true);
                console.log('브라우저 알림이 활성화되었습니다.');
            } else {
                alert('브라우저 알림 권한이 필요합니다. 브라우저 설정에서 알림을 허용해주세요.');
            }
        } else {
            // 알림을 비활성화하는 경우
            handleSettingChange('notificationEnabled', false);
            console.log('브라우저 알림이 비활성화되었습니다.');
        }
    };

    /**
     * 백그라운드 분석 모드를 토글하는 함수
     * 백그라운드 모드 활성화 시 다른 탭/페이지로 이동해도 자세 분석이 지속됩니다.
     */
    const toggleBackgroundMode = () => {
        const newBackgroundMode = !settings.backgroundMode;
        handleSettingChange('backgroundMode', newBackgroundMode);

        if (newBackgroundMode) {
            console.log('🌙 백그라운드 모드가 활성화되었습니다. 다른 탭으로 이동해도 분석이 지속됩니다.');

            // 백그라운드 모드 활성화 시 브라우저 알림도 함께 권장
            if (!settings.notificationEnabled) {
                setTimeout(() => {
                    if (window.confirm('백그라운드 모드에서는 브라우저 알림을 함께 사용하는 것을 권장합니다. 알림을 활성화하시겠습니까?')) {
                        toggleNotificationSetting();
                    }
                }, 500);
            }
        } else {
            console.log('☀️ 백그라운드 모드가 비활성화되었습니다. 다른 탭으로 이동하면 분석이 중지됩니다.');
        }
    };

    // 🎨 커스텀 미니 알림창 관련 함수들

    /**
     * 커스텀 미니 알림창을 표시하는 함수
     * 우측하단에서 아래에서 위로 슬라이드업 애니메이션과 함께 표시됩니다.
     * @param {string} status - 자세 상태 ('warning', 'alert', 또는 'normal')
     * @param {number} count - 누적 경고 횟수
     */
    const showMiniAlert = (status, count) => {
        console.log(`🎨 [미니 알림창] 호출됨 - status: ${status}, count: ${count}`);
        console.log(`🔍 [미니 알림창] 페이지 상태 - hidden: ${document.hidden}`);

        // 🔄 중복 방지: 페이지가 숨겨진 상태에서는 미니 알림창 대신 브라우저 알림 사용
        if (document.hidden) {
            console.log('⏭️ [미니 알림창] 페이지가 비활성 상태이므로 미니 알림창 대신 브라우저 알림을 사용합니다.');
            return;
        }

        // 새로운 알림 ID 생성 (기존 알림과 구분하기 위해)
        const newAlertId = Date.now();

        // 미니 알림창 표시
        setMiniAlert({
            isVisible: true,
            status: status,
            count: count,
            id: newAlertId
        });

        console.log(`✅ [미니 알림창] 표시됨: ${status} - ID: ${newAlertId}`);

        // 자동 닫기 시간 설정 (정상화 알림은 3초, 경고는 5초)
        const autoCloseTime = status === 'normal' ? 3000 : 5000;

        setTimeout(() => {
            setMiniAlert(prev => {
                // 현재 표시된 알림이 이 알림인 경우에만 숨기기 (중복 방지)
                if (prev.id === newAlertId) {
                    console.log(`⏰ [미니 알림창] 자동 닫기 - ID: ${newAlertId}`);
                    return { ...prev, isVisible: false };
                }
                return prev;
            });
        }, autoCloseTime);
    };

    /**
     * 미니 알림창을 수동으로 닫는 함수
     */
    const closeMiniAlert = () => {
        setMiniAlert(prev => ({ ...prev, isVisible: false }));
        console.log('🎨 미니 알림창 수동 닫기');
    };

    /**
     * 자세 상태에 따른 미니 알림창 메시지를 반환하는 함수
     * @param {string} status - 자세 상태
     * @param {number} count - 누적 횟수
     * @returns {object} 메시지 객체
     */
    const getMiniAlertMessage = (status, count) => {
        const messages = {
            warning: {
                icon: '⚠️',
                title: '자세 주의',
                body: `자세가 약간 틀어졌습니다.\n올바른 자세로 돌아가세요.`,
                countText: '자세 교정 필요'
            },
            alert: {
                icon: '🚨',
                title: '자세 경고',
                body: `자세가 많이 틀어졌습니다!\n즉시 올바른 자세로 돌아가세요.`,
                countText: '즉시 교정 필요'
            },
            normal: {
                icon: '🎉',
                title: '자세 정상화',
                body: `훌륭합니다!\n올바른 자세로 돌아왔습니다.`,
                countText: '정상 상태 복구'
            }
        };

        return messages[status] || messages.warning;
    };

    return (
        <Layout>
        <div className="posture-monitor">
                <div className="posture-wrapper">
                    <div className="title">
                        <h2>💡 AI 자세 분석 도구</h2>
                        <p>기본 자세를 기준으로 실시간 자세 이탈을 감지하여 알려줍니다</p>
                    </div>
                    <div className="container">

                        {/* 모니터링 설정 섹션 */}
                        <div className="settings-section">
                            <h3>⚙️ 모니터링 설정</h3>

                            <div className="settings-grid">
                                {/* 움직임 민감도 설정 */}
                                <div className="setting-group">
                                    <h4>🎯 움직임 민감도</h4>
                                    <div className="radio-group">
                                        {['low', 'medium', 'high'].map((value) => (
                                            <label key={value} className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="movementThreshold"
                                                    value={value}
                                                    checked={settings.movementThreshold === value}
                                                    onChange={(e) => handleSettingChange('movementThreshold', e.target.value)}
                                                />
                                                <span>
                                                    {value === 'low' ? '낮음' : value === 'medium' ? '보통' : '높음'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="description-text">
                                        💡 {getMovementThresholdDescription(settings.movementThreshold)}
                                    </p>
                                </div>

                                {/* 분석 주기 설정 */}
                                <div className="setting-group">
                                    <h4>⏱️ 분석 주기</h4>
                                    <div className="slider-container">
                                        <input
                                            type="range"
                                            min="3"
                                            max="10"
                                            value={settings.interval}
                                            onChange={(e) => handleSettingChange('interval', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <p className="slider-value">
                                        {settings.interval}초마다 분석
                                    </p>
                                </div>

                                {/* 알림 설정 */}
                                <div className="setting-group">
                                    <h4>🔔 알림 설정</h4>
                                    <div className="slider-container">
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={settings.alertCount}
                                            onChange={(e) => handleSettingChange('alertCount', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <p className="slider-value">
                                        {settings.alertCount}회 이상 어긋나면 알림
                                    </p>

                                    {/* 🔔 브라우저 알림 토글 */}
                                    <div className="checkbox-container">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.notificationEnabled}
                                                onChange={toggleNotificationSetting}
                                            />
                                            <span>📢 브라우저 알림</span>
                                        </label>
                                        <p className="checkbox-description">
                                            {settings.notificationEnabled ?
                                                '✅ 자세 경고 시 브라우저 알림이 표시됩니다' :
                                                '❌ 브라우저 알림이 비활성화되어 있습니다'
                                            }
                                        </p>
                                    </div>

                                    {/* 🌙 백그라운드 모드 토글 */}
                                    <div className="checkbox-container">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.backgroundMode}
                                                onChange={toggleBackgroundMode}
                                            />
                                            <span>🌙 백그라운드 모드</span>
                                        </label>
                                        <p className="checkbox-description">
                                            {settings.backgroundMode ?
                                                '✅ 다른 탭으로 이동해도 분석이 지속됩니다' :
                                                '❌ 다른 탭으로 이동하면 분석이 중지됩니다'
                                            }
                                        </p>
                                        {settings.backgroundMode && (
                                            <p className="checkbox-warning">
                                                ⚠️ 배터리 사용량이 증가할 수 있습니다
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3개 이미지 가로 배치 */}
                        <div className="image-section">
                            <h3>📸 자세 모니터링</h3>

                            <div className="image-grid">
                                {/* 1. 기본 자세 이미지 */}
                                <div className="image-container">
                                    <h4>기본 자세</h4>
                                    <div className="image-wrapper">
                                        {!isBaseImageCaptured ? (
                                            // 처음부터 실시간 웹캠 표시
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                className="video-element"
                                            />
                                        ) : (
                                            // 촬영된 기본 이미지 표시
                                            <img
                                                src={baseImage}
                                                alt="기본 자세"
                                                className="captured-image"
                                            />
                                        )}
                                        <canvas ref={canvasRef} className="canvas-element" />
                                    </div>

                                    {/* 촬영/재촬영 버튼 */}
                                    <div className="button-container">
                                        {!isBaseImageCaptured ? (
                                            <button
                                                className="btn btn-primary"
                                                onClick={captureBaseImage}
                                                disabled={!isCameraOn}
                                            >
                                                📸 촬영
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-accent"
                                                onClick={recaptureBaseImage}
                                            >
                                                🔄 재촬영
                                            </button>
                                        )}
                                    </div>

                                    <p className="description-text">
                                        {!isBaseImageCaptured ? '올바른 자세를 취하고 촬영해주세요' : '기본 자세가 설정되었습니다'}
                                    </p>
                                </div>

                                {/* 2. 마지막 캡처 이미지 */}
                                <div className="image-container">
                                    <h4>마지막 분석 사진</h4>
                                    {lastCapturedImage ? (
                                        <img
                                            src={lastCapturedImage}
                                            alt="마지막 캡처된 이미지"
                                            className="captured-image"
                                        />
                                    ) : (
                                        <div className="placeholder-container">
                                            📸 분석 시작 후<br />마지막 캡처 이미지가<br />여기에 표시됩니다
                                        </div>
                                    )}
                                    <p className="description-text">
                                        {analysisCount > 0 ? `${analysisCount}번째 분석 이미지` : '분석을 시작하면 표시됩니다'}
                                    </p>
                                </div>

                                {/* 3. 실시간 자세 이미지 */}
                                <div className="image-container">
                                    <h4>실시간 자세</h4>
                                    {/* 처음부터 항상 웹캠 표시 */}
                                    <video
                                        ref={realtimeVideoRef}
                                        autoPlay
                                        playsInline
                                        className="video-element"
                                    />
                                    <p className="description-text">
                                        실시간 자세 화면
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 상태 표시 및 제어 */}
                        <div className={`status-section ${postureStatus}`}>
                            <h3>자세 상태: {
                                postureStatus === 'alert' ? '🚨 경고' :
                                    postureStatus === 'warning' ? '⚠️ 주의' : '✅ 정상'
                            }</h3>

                            <div className="status-info">
                                <p className={alertCount > 0 ? 'alert-count' : 'normal-count'}>
                                    연속 경고: {alertCount}/{settings.alertCount}
                                </p>
                                <p>총 분석 횟수: {analysisCount}회</p>
                                {analysisStartTime && (
                                    <p>분석 시작: {formatDateTime(analysisStartTime)}</p>
                                )}
                            </div>

                            {/* MediaPipe 분석 결과 상세 정보 */}
                            {postureStatus !== 'normal' && (
                                <div className="analysis-details">
                                    <h4>🔍 분석 상세 정보</h4>
                                    <p>
                                        <strong>MediaPipe 랜드마크 기반 분석:</strong>
                                    </p>
                                    <p>• 어깨 수평성, 머리 위치, 목 각도 등을 종합 분석</p>
                                    <p>• 실시간 자세 변화를 정확하게 감지</p>
                                    <p className="analysis-setting-info">
                                        <strong>🎯 현재 설정:</strong> {settings.movementThreshold === 'low' ? '낮음 (매우 민감)' :
                                            settings.movementThreshold === 'high' ? '높음 (덜 민감)' : '보통 (적당한 민감)'}
                                    </p>
                                </div>
                            )}

                            {/* 제어 버튼들 */}
                            <div className="control-section">
                                {!isAnalyzing ? (
                                    <button
                                        className="btn btn-primary"
                                        onClick={startAnalysis}
                                        title={!baseImage ? '기본 자세를 먼저 설정해주세요' : '자세 분석을 시작합니다'}
                                    >
                                        🚀 분석 시작
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-accent"
                                        onClick={stopAnalysis}
                                    >
                                        ⏹️ 분석 중지
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            

            {/* 🎨 커스텀 미니 알림창 */}
            {miniAlert.isVisible && (
                <div className={`mini-alert ${miniAlert.status} ${miniAlert.isVisible ? '' : 'hidden'}`}>
                    {(() => {
                        const message = getMiniAlertMessage(miniAlert.status, miniAlert.count);
                        return (
                            <>
                                {/* 알림창 헤더 */}
                                <div className="mini-alert-header">
                                    <div className="mini-alert-title">
                                        <span className="mini-alert-icon">
                                            {message.icon}
                                        </span>
                                        <span className="mini-alert-title-text">
                                            {message.title}
                                        </span>
                                    </div>
                                    <button
                                        className="mini-alert-close"
                                        onClick={closeMiniAlert}
                                        title="알림 닫기"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* 알림창 본문 */}
                                <div className="mini-alert-body">
                                    {message.body.split('\n').map((line, index) => (
                                        <div key={index}>{line}</div>
                                    ))}
                                </div>

                                {/* 횟수 표시 */}
                                <div className="mini-alert-count">
                                    {message.countText}
                                </div>

                            </>
                        );
                    })()}
                </div>
            )}
        </div>
        </Layout>
    );
}

export default PostureMonitor;