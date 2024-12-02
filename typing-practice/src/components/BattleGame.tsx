import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const BattleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ShareLink = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  
  input {
    padding: 5px 10px;
    border: 1px solid var(--accent-secondary);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  
  button {
    padding: 5px 10px;
    background: var(--accent-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
      opacity: 0.9;
    }
  }
`;

const BattleArea = styled.div`
  margin-top: 20px;
`;

const ProgressBar = styled.div<{ $progress: number }>`
  width: 100%;
  height: 20px;
  background-color: var(--bg-secondary);
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
  
  &::after {
    content: '';
    display: block;
    width: ${props => props.$progress}%;
    height: 100%;
    background-color: var(--accent-primary);
    transition: width 0.3s ease;
  }
`;

const PlayerStats = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  
  span {
    color: var(--text-secondary);
  }
`;

const SentenceDisplay = styled.div`
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
`;

const CurrentSentence = styled.div`
  font-size: 1.2em;
  margin-bottom: 10px;
  color: #333;
`;

const NextSentence = styled.div`
  font-size: 0.9em;
  color: #666;
  border-top: 1px solid #ddd;
  padding-top: 10px;
  margin-top: 10px;
`;

const TextDisplay = styled.div`
  font-size: 1.5rem;
  margin: 20px 0;
  padding: 20px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  line-height: 1.6;
  color: var(--text-tertiary);
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
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
`;

const RematchButton = styled.button`
  background-color: #4CAF50;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  margin: 10px;

  &:hover {
    background-color: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

const ResultDisplay = styled.div`
  text-align: center;
  margin: 20px 0;

  h3 {
    font-size: 24px;
    color: #2c3e50;
    margin-bottom: 15px;
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 20px;
  }

  .stat-item {
    background-color: #f8f9fa;
    padding: 10px 20px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);

    span {
      display: block;
      &:first-child {
        font-weight: bold;
        color: #34495e;
      }
    }
  }
`;

interface Player {
  id: string;
  progress: number;
  speed: number;
  accuracy: number;
  currentSentence: number;
  sentenceProgress: number[];
  overallProgress: number;
  rematchReady?: boolean;
}

const BattleGame: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<string>('');
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [currentSentence, setCurrentSentence] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('room');

    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:4000');
    setSocket(newSocket);

    if (roomIdParam) {
      newSocket.emit('join-room', { roomId: roomIdParam });
      setRoomId(roomIdParam);
    } else {
      newSocket.emit('create-room');
    }

    newSocket.on('room-created', ({ roomId, sentences }) => {
      setRoomId(roomId);
      setSentences(sentences);
      window.history.pushState({}, '', `?room=${roomId}`);
    });

    newSocket.on('room-joined', ({ sentences }) => {
      setSentences(sentences);
    });

    newSocket.on('player-update', ({ players }) => {
      setPlayers(players);
    });

    newSocket.on('game-start', () => {
      setGameStatus('playing');
      setGameStartTime(Date.now());
      setUserInput('');
      setCurrentSentence(0);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });

    newSocket.on('game-over', ({ winner, players }) => {
      setGameStatus('finished');
      setWinner(winner);
      setPlayers(players);
    });

    newSocket.on('player-left', () => {
      setGameStatus('waiting');
      setUserInput('');
      setSentences([]);
      setCurrentSentence(0);
    });

    newSocket.on('rematch-start', ({ sentences }) => {
      setSentences(sentences);
      setUserInput('');
      setGameStatus('playing');
      setWinner('');
      setCurrentSentence(0);
      setGameStartTime(Date.now());
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (socket && roomId && gameStatus === 'playing' && currentSentence < sentences.length) {
      const currentText = sentences[currentSentence];
      const progress = Math.round((value.length / currentText.length) * 100);
      
      let correctChars = 0;
      const minLength = Math.min(value.length, currentText.length);
      for (let i = 0; i < minLength; i++) {
        if (value[i] === currentText[i]) correctChars++;
      }
      const accuracy = Math.round((correctChars / value.length) * 100) || 100;

      const words = value.trim().split(/\s+/).length;
      const minutes = (Date.now() - gameStartTime) / 60000;
      const speed = Math.round(words / minutes) || 0;

      socket.emit('update-progress', {
        roomId,
        progress,
        speed,
        accuracy,
        currentSentence
      });

      // 현재 문장을 완료했을 때
      if (value === currentText) {
        socket.emit('sentence-completed', { 
          roomId,
          sentenceIndex: currentSentence
        });

        // 다음 문장으로 이동
        if (currentSentence < sentences.length - 1) {
          setCurrentSentence(prev => prev + 1);
          setUserInput('');
        } else {
          // 모든 문장 완료
          socket.emit('game-finished', { 
            roomId,
            speed,
            accuracy
          });
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  const handleRematch = () => {
    if (socket && roomId) {
      socket.emit('rematch-request', { roomId });
    }
  };

  return (
    <Container>
      <BattleHeader>
        <h2>타자 대결</h2>
        {roomId && gameStatus === 'waiting' && (
          <ShareLink>
            <input 
              type="text" 
              value={`${window.location.origin}/battle?room=${roomId}`} 
              readOnly 
            />
            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/battle?room=${roomId}`)}>
              링크 복사
            </button>
          </ShareLink>
        )}
      </BattleHeader>

      <BattleArea>
        {players.map((player, index) => (
          <div key={player.id}>
            <PlayerStats>
              <span>플레이어 {index + 1}{player.id === socket?.id ? ' (나)' : ''}</span>
              <span>정확도: {player.accuracy}%</span>
              <span>속도: {player.speed} WPM</span>
              <span>진행도: {player.overallProgress}%</span>
              <span>현재 문장: {player.currentSentence + 1}/{sentences.length}</span>
              {gameStatus === 'finished' && player.rematchReady && (
                <span>재대결 준비 완료</span>
              )}
            </PlayerStats>
            <ProgressBar $progress={player.overallProgress} />
          </div>
        ))}

        {gameStatus === 'waiting' && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            상대방을 기다리는 중...
          </div>
        )}

        {(gameStatus === 'playing' || gameStatus === 'finished') && sentences.length > 0 && (
          <>
            <SentenceDisplay>
              <CurrentSentence>{sentences[currentSentence]}</CurrentSentence>
              {currentSentence < sentences.length - 1 && (
                <NextSentence>다음 문장: {sentences[currentSentence + 1]}</NextSentence>
              )}
            </SentenceDisplay>
            <Input
              ref={inputRef}
              value={userInput}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onCopy={handleCopy}
              onKeyDown={handleKeyDown}
              disabled={gameStatus === 'finished'}
              placeholder="여기에 입력하세요..."
            />
          </>
        )}

        {gameStatus === 'finished' && (
          <ResultDisplay>
            <h3>
              {winner === socket?.id ? (
                <>🏆 승리!</>
              ) : (
                <>😢 패배...</>
              )}
            </h3>
            <div className="stats">
              {players.map((player) => (
                <div key={player.id} className="stat-item">
                  <span>{player.id === socket?.id ? '나의 기록' : '상대방 기록'}</span>
                  <span>정확도: {player.accuracy}%</span>
                  <span>속도: {player.speed} WPM</span>
                </div>
              ))}
            </div>
            <RematchButton onClick={handleRematch}>
              🔄 재대결
            </RematchButton>
          </ResultDisplay>
        )}
      </BattleArea>
    </Container>
  );
};

export default BattleGame;
