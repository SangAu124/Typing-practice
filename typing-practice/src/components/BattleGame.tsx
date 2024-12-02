import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: var(--text-primary);
`;

const BattleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--primary-color);

  h2 {
    color: var(--primary-color);
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
  }
`;

const ShareLink = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;

  input {
    width: 300px;
    padding: 10px;
    border: 2px solid var(--primary-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  button {
    padding: 10px 20px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;

    &:hover {
      background: var(--primary-dark);
      transform: translateY(-2px);
    }
  }
`;

const BattleArea = styled.div`
  background: var(--bg-secondary);
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const PlayerStats = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 15px;
  padding: 15px;
  background: var(--bg-primary);
  border-radius: 10px;
  border-left: 4px solid var(--primary-color);

  span {
    color: var(--text-secondary);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 5px;

    &:first-child {
      color: var(--primary-color);
      font-weight: 700;
      font-size: 1.1rem;
    }
  }
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 20px;
  background-color: #2a2a2a;
  border-radius: 10px;
  margin: 10px 0;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
  border: 1px solid #3a3a3a;
`;

const ProgressBarFill = styled.div<{ $progress: number }>`
  width: ${props => props.$progress}%;
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFEB3B);
  transition: width 0.3s ease-in-out;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
`;

const SentenceDisplay = styled.div`
  margin: 20px 0;
  padding: 25px;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 2px solid var(--primary-color);
`;

const CurrentSentence = styled.div`
  font-size: 1.3em;
  margin-bottom: 15px;
  color: var(--text-primary);
  line-height: 1.6;
  letter-spacing: 0.3px;
`;

const NextSentence = styled.div`
  font-size: 1rem;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color);
  padding-top: 15px;
  margin-top: 15px;
  opacity: 0.8;
`;

const Input = styled.textarea`
  width: 100%;
  padding: 15px;
  margin: 20px 0;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1.1rem;
  resize: none;
  height: 100px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-light);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ResultDisplay = styled.div`
  text-align: center;
  margin: 30px 0;
  padding: 30px;
  background: var(--bg-primary);
  border-radius: 15px;
  border: 2px solid var(--primary-color);

  h3 {
    font-size: 2rem;
    margin-bottom: 20px;
    color: var(--primary-color);
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin: 20px 0;

    .stat-item {
      padding: 15px 25px;
      background: var(--bg-secondary);
      border-radius: 10px;
      border-left: 4px solid var(--primary-color);

      span {
        display: block;
        margin: 5px 0;
        color: var(--text-secondary);

        &:first-child {
          color: var(--primary-color);
          font-weight: 600;
          margin-bottom: 10px;
        }
      }
    }
  }
`;

const RematchButton = styled.button`
  padding: 12px 30px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 20px;

  &:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
`;

const WaitingMessage = styled.div`
  text-align: center;
  margin: 40px 0;
  padding: 30px;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 2px dashed var(--primary-color);
  color: var(--text-secondary);
  font-size: 1.2rem;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
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

const SOCKET_SERVER_URL = process.env.REACT_APP_API_URL || 'https://typing-practice-server.vercel.app';

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

    const newSocket = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 60000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: false
    });

    // Socket 연결 시도
    try {
      newSocket.connect();
    } catch (error) {
      console.error('Socket connection attempt failed:', error);
    }

    // Socket 연결 디버깅
    newSocket.on('connect', () => {
      console.log('Socket connected successfully:', newSocket.id);
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Socket connection error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      // 재연결 시도
      setTimeout(() => {
        newSocket.connect();
      }, 1000);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected. Reason:', reason);
      if (reason === 'io server disconnect' || reason === 'transport error') {
        // 서버에서 연결을 끊었을 때 재연결 시도
        setTimeout(() => {
          newSocket.connect();
        }, 1000);
      }
    });

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
      console.log('Player update received:', players); // 디버깅용 로그
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

      // 진행도 업데이트
      socket.emit('update-progress', {
        roomId,
        progress,
        speed,
        accuracy,
        currentSentence
      });

      // 디버깅용 로그
      console.log('Progress update sent:', {
        progress,
        currentSentence,
        speed,
        accuracy
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
        {players.map((player, index) => {
          const progress = Math.max(0, Math.min(100, player.overallProgress || 0));
          console.log(`Rendering progress bar for player ${player.id}:`, {
            rawProgress: player.overallProgress,
            calculatedProgress: progress
          });
          
          return (
            <div key={player.id}>
              <PlayerStats>
                <span>플레이어 {index + 1}{player.id === socket?.id ? ' (나)' : ''}</span>
                <span>정확도: {player.accuracy}%</span>
                <span>속도: {player.speed} WPM</span>
                <span>진행도: {Math.round(progress)}%</span>
                <span>현재 문장: {player.currentSentence + 1}/{sentences.length}</span>
                {gameStatus === 'finished' && player.rematchReady && (
                  <span>재대결 준비 완료</span>
                )}
              </PlayerStats>
              <ProgressBarContainer>
                <ProgressBarFill $progress={progress} />
              </ProgressBarContainer>
            </div>
          );
        })}
        
        {gameStatus === 'waiting' && (
          <WaitingMessage>
            상대방을 기다리는 중...
          </WaitingMessage>
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
