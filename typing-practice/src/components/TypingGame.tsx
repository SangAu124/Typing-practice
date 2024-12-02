import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import axios from 'axios';
import ResultsChart from './ResultsChart';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
`;

const TextDisplay = styled.div`
  font-size: 1.5rem;
  margin: 20px 0;
  padding: 20px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  line-height: 1.6;
  color: var(--text-tertiary);
  border: 2px solid var(--accent-secondary);
`;

const Input = styled.textarea`
  width: 100%;
  height: 100px;
  padding: 15px;
  font-size: 1.2rem;
  margin: 20px 0;
  background-color: var(--bg-secondary);
  border: 2px solid var(--accent-secondary);
  border-radius: 8px;
  resize: none;
  color: var(--text-tertiary);
  font-family: 'Roboto Mono', monospace;
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin: 20px 0;
`;

const StatBox = styled(motion.div)`
  padding: 15px;
  background-color: var(--bg-secondary);
  border: 2px solid var(--accent-secondary);
  border-radius: 8px;
  text-align: center;

  h3 {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 5px;
    font-weight: normal;
  }

  p {
    color: var(--text-primary);
    font-size: 1.5rem;
    font-weight: bold;
  }
`;

const Progress = styled.div`
  text-align: center;
  margin-bottom: 20px;
  font-size: 1.2rem;
  color: var(--text-secondary);
  
  span {
    color: var(--text-primary);
    font-weight: bold;
  }
`;

const Author = styled.div`
  text-align: right;
  margin-top: 10px;
  font-style: italic;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const LanguageToggle = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  gap: 10px;
`;

const ToggleButton = styled.button<{ $isActive?: boolean }>`
  padding: 8px 16px;
  border: 2px solid var(--accent-primary);
  background: ${props => props.$isActive ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.$isActive ? 'var(--bg-primary)' : 'var(--accent-primary)'};
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const TypingGame: React.FC = () => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [userInput, setUserInput] = useState('');
  const [attempt, setAttempt] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const [accuracy, setAccuracy] = useState(100);
  const [speed, setSpeed] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(0);
  const [errorRate, setErrorRate] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const translateText = async (text: string): Promise<string> => {
    try {
      const encodedText = encodeURI(text);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/translate?text=${encodedText}`
      );
      return response.data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const fetchQuote = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('https://korean-advice-open-api.vercel.app/api/advice');
      const translatedMessage = await translateText(response.data.message);
      
      setCurrentQuote({
        message: response.data.message,
        translatedMessage,
        author: response.data.author,
        authorProfile: response.data.authorProfile
      });
    } catch (error) {
      console.error('Error fetching quote:', error);
      setCurrentQuote({
        message: '네트워크 오류가 발생했습니다.',
        translatedMessage: 'A network error occurred.',
        author: '',
        authorProfile: ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startNewGame = useCallback(() => {
    fetchQuote();
    setUserInput("");
    setStartTime(null);
    setAccuracy(100);
    setSpeed(0);
    setTypingSpeed(0);
    setErrorRate(0);
    setIsComplete(false);
    setAttempt(1);
    setResults([]);
  }, []);

  const resetAttempt = useCallback(() => {
    fetchQuote();
    setUserInput("");
    setStartTime(null);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCompletion();
    }
  };

  const calculateErrorRate = (input: string, target: string): number => {
    let errors = 0;
    const maxLength = Math.max(input.length, target.length);
    
    // 입력된 텍스트와 목표 텍스트의 길이 차이로 인한 오차
    const lengthDiff = Math.abs(input.length - target.length);
    errors += lengthDiff;

    // 문자별 비교
    const minLength = Math.min(input.length, target.length);
    for (let i = 0; i < minLength; i++) {
      if (input[i] !== target[i]) {
        errors++;
      }
    }

    return Math.round((errors / maxLength) * 100);
  };

  const handleCompletion = () => {
    const currentErrorRate = calculateErrorRate(userInput.trim(), getCurrentText());
    setErrorRate(currentErrorRate);

    const result: Result = {
      attempt,
      speed,
      accuracy,
      typingSpeed,
      errorRate: currentErrorRate,
    };
    
    setResults(prev => [...prev, result]);
    
    if (attempt < TOTAL_ATTEMPTS) {
      setAttempt(prev => prev + 1);
      resetAttempt();
    } else {
      setIsComplete(true);
    }
  };

  const calculateKeystrokes = (text: string): number => {
    let keystrokes = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/[\u3131-\u314E\u314F-\u3163\u3165-\u318E\uAC00-\uD7A3]/.test(char)) {
        // 한글인 경우
        if (char >= '\uAC00' && char <= '\uD7A3') {
          // 완성형 한글
          const unicode = char.charCodeAt(0) - 0xAC00;
          const jong = unicode % 28;
          keystrokes += jong > 0 ? 3 : 2; // 종성이 있으면 3타, 없으면 2타
        } else {
          // 자음/모음
          keystrokes += 1;
        }
      } else {
        // 영문, 숫자, 특수문자, 공백
        keystrokes += 1;
      }
    }
    return keystrokes;
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUserInput(value);
  
    if (!startTime && value.length === 1) {
      setStartTime(Date.now());
    }
  
    // 정확도 계산 (기존 코드)
    let correctChars = 0;
    const minLength = Math.min(value.length, getCurrentText().length);
    for (let i = 0; i < minLength; i++) {
      if (value[i] === getCurrentText()[i]) correctChars++;
    }
    const newAccuracy = Math.round((correctChars / value.length) * 100) || 100;
    setAccuracy(newAccuracy);
  
    if (startTime) {
      const timeElapsed = (Date.now() - startTime) / 1000;
      const minutes = timeElapsed / 60;
      
      // 타수 계산 수정
      const keystrokes = calculateKeystrokes(value);
      const newTypingSpeed = Math.round((keystrokes * 60) / timeElapsed);
      setTypingSpeed(newTypingSpeed);
  
      // WPM 계산 (기존 코드)
      const wordsTyped = value.length / 5;
      const newSpeed = Math.round(wordsTyped / minutes);
      setSpeed(newSpeed);
    }
  };

  const getCurrentText = () => {
    if (!currentQuote) return '';
    return language === 'ko' ? currentQuote.message : currentQuote.translatedMessage;
  };

  if (isComplete) {
    return <ResultsChart results={results} onReset={startNewGame} />;
  }

  return (
    <Container>
      <LanguageToggle>
        <ToggleButton
          $isActive={language === 'ko'}
          onClick={() => setLanguage('ko')}
        >
          한글
        </ToggleButton>
        <ToggleButton
          $isActive={language === 'en'}
          onClick={() => setLanguage('en')}
        >
          English
        </ToggleButton>
      </LanguageToggle>
      <Progress>
        진행률: <span>{attempt}</span> / {TOTAL_ATTEMPTS}
      </Progress>
      <TextDisplay>
        {isLoading ? "명언을 불러오는 중..." : getCurrentText()}
        {!isLoading && currentQuote && (
          <Author>
            - {currentQuote.author} ({currentQuote.authorProfile})
          </Author>
        )}
      </TextDisplay>
      <Input
        ref={inputRef}
        value={userInput}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder="여기에 입력하세요... (Enter를 눌러 제출)"
        disabled={isLoading}
      />
      <Stats>
        <StatBox
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <h3>정확도</h3>
          <p>{accuracy}%</p>
        </StatBox>
        <StatBox
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <h3>WPM</h3>
          <p>{speed}</p>
        </StatBox>
        <StatBox
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <h3>타수</h3>
          <p>{typingSpeed}</p>
        </StatBox>
        <StatBox
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <h3>오타율</h3>
          <p>{errorRate}%</p>
        </StatBox>
      </Stats>
    </Container>
  );
};

interface Quote {
  message: string;
  translatedMessage: string;
  author: string;
  authorProfile: string;
}

interface Result {
  attempt: number;
  speed: number;
  accuracy: number;
  typingSpeed: number;
  errorRate: number;
}

const TOTAL_ATTEMPTS = 5;

export default TypingGame;
