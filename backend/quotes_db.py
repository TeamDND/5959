import random
from typing import Dict, List, Optional

class QuotesDatabase:
    def __init__(self):
        self.quotes_by_emotion = {
            "sad": [
                "힘든 시간은 지나가지만, 강한 사람은 남는다.",
                "눈물은 마음을 정화하는 비와 같다.",
                "어둠이 깊을수록 새벽은 더욱 밝게 온다.",
                "슬픔도 우리 삶의 소중한 한 부분이다.",
                "지금의 아픔이 내일의 지혜가 될 거야.",
                "괜찮지 않아도 괜찮다. 천천히 치유해 나가면 돼.",
                "슬픔을 감추지 말아요. 그것도 당신의 진실한 모습이니까.",
            ],
            "angry": [
                "분노는 잠깐이지만, 후회는 오래간다.",
                "화는 마음의 독을 마시는 것과 같다.",
                "분노를 조절하는 것이 진정한 힘이다.",
                "잠깐 멈추고 깊게 숨을 쉬어보세요.",
                "화날 때일수록 한 번 더 생각해보는 지혜가 필요해요.",
                "분노 뒤에 숨어있는 진짜 감정을 들여다보세요.",
                "감정은 파도와 같아요. 잠시 후 잠잠해질 거예요.",
            ],
            "anxious": [
                "걱정의 99%는 일어나지 않는다.",
                "불안은 미래에 대한 관심이지만, 현재를 놓치게 한다.",
                "한 번에 한 가지씩, 천천히 해결해 나가면 돼요.",
                "완벽할 필요 없어요. 최선을 다하는 것만으로도 충분해요.",
                "불안한 마음도 당신을 보호하려는 마음의 신호예요.",
                "지금 이 순간에 집중해보세요. 숨을 깊게 들이마셔보세요.",
                "걱정은 내일의 슬픔을 덜어주지 못하고, 오늘의 힘만 빼앗아요.",
            ],
            "happy": [
                "행복은 나누면 배가 되고, 슬픔은 나누면 반이 된다.",
                "오늘의 기쁨을 내일의 힘으로 저장해두세요.",
                "행복한 순간들이 모여서 행복한 인생을 만든다.",
                "당신의 웃음이 세상을 더 밝게 만들어요.",
                "기쁜 마음은 가장 좋은 약이에요.",
                "행복은 선택이고, 당신은 지금 좋은 선택을 하고 있어요.",
                "이 순간의 행복을 마음 깊이 간직하세요.",
            ],
            "neutral": [
                "평범한 일상 속에도 작은 기적이 숨어있다.",
                "고요한 마음에서 가장 깊은 지혜가 나온다.",
                "오늘 하루도 충분히 의미 있는 시간이었어요.",
                "잠시 멈춰서 자신을 돌아보는 시간도 필요해요.",
                "평온함 속에서 진정한 자신을 발견할 수 있어요.",
                "지금 이 순간도 충분히 소중해요.",
                "작은 변화가 큰 차이를 만들어요.",
            ]
        }
    
    def get_quote_by_emotion(self, emotion: str) -> Optional[str]:
        """
        감정에 맞는 명언을 랜덤으로 반환
        """
        emotion = emotion.lower()
        if emotion in self.quotes_by_emotion:
            quotes = self.quotes_by_emotion[emotion]
            return random.choice(quotes)
        else:
            # 기본값으로 neutral 감정의 명언 반환
            return random.choice(self.quotes_by_emotion["neutral"])
    
    def get_random_quote(self) -> str:
        """
        모든 명언 중에서 랜덤으로 반환
        """
        all_quotes = []
        for quotes in self.quotes_by_emotion.values():
            all_quotes.extend(quotes)
        return random.choice(all_quotes)
    
    def get_all_emotions(self) -> List[str]:
        """
        사용 가능한 모든 감정 타입 반환
        """
        return list(self.quotes_by_emotion.keys())
    
    def add_quote(self, emotion: str, quote: str):
        """
        새로운 명언 추가
        """
        emotion = emotion.lower()
        if emotion not in self.quotes_by_emotion:
            self.quotes_by_emotion[emotion] = []
        self.quotes_by_emotion[emotion].append(quote)
    
    def get_quotes_count(self, emotion: str = None) -> int:
        """
        명언 개수 반환 (특정 감정 또는 전체)
        """
        if emotion:
            emotion = emotion.lower()
            return len(self.quotes_by_emotion.get(emotion, []))
        else:
            total = 0
            for quotes in self.quotes_by_emotion.values():
                total += len(quotes)
            return total

# 전역 인스턴스
quotes_db = QuotesDatabase()

def get_quotes_database() -> QuotesDatabase:
    """
    명언 데이터베이스 인스턴스를 반환하는 함수
    """
    return quotes_db