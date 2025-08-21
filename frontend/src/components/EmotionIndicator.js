import React from 'react';
import { Heart } from 'lucide-react';

const EmotionIndicator = ({ emotion }) => {
  if (!emotion || emotion === 'neutral') return null;
  
  const emotionLabels = {
    happy: '😊 기쁨',
    sad: '😢 슬픔',  
    angry: '😠 화남',
    anxious: '😰 불안',
    neutral: '😐 평온'
  };
  
  const emotionColor = {
    happy: '#F76800',
    sad: '#4A90E2',
    angry: '#E74C3C',
    anxious: '#9B59B6',
    neutral: '#005793'
  }[emotion];
  
  return (
    <div className="emotion-indicator" style={{ backgroundColor: emotionColor }}>
      <Heart size={16} />
      <span>{emotionLabels[emotion]}</span>
    </div>
  );
};

export default EmotionIndicator;
