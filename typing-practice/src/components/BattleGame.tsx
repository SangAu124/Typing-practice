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

interface BattleGameProps {
  roomId?: string;
}

const SOCKET_SERVER_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : process.env.REACT_APP_API_URL;

const BattleGame: React.FC<BattleGameProps> = ({ roomId: initialRoomId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(initialRoomId || null);
  const [sentences, setSentences] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<string>('');
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('room') || initialRoomId;

    const newSocket = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 5000,
      autoConnect: true
    });

    setSocket(newSocket);

    // Socket 연결 시도
    try {
      newSocket.connect();
    } catch (error) {
      console.error('Socket connection error:', error);
    }

    // Socket 연결 이벤트
    newSocket.on('connect', () => {
      console.log('Socket connected, joining/creating room...');
      setIsConnected(true);
      
      // 방 생성 또는 참여
      if (roomIdParam) {
        newSocket.emit('join-room', { roomId: roomIdParam });
        setRoomId(roomIdParam);
      } else {
        newSocket.emit('create-room');
      }
    });

    // 방 생성 성공 이벤트
    newSocket.on('room-created', ({ roomId: newRoomId, sentences: newSentences }) => {
      console.log('Room created:', newRoomId);
      setRoomId(newRoomId);
      setSentences(newSentences);
      window.history.pushState({}, '', `?room=${newRoomId}`);
    });

    // Socket 연결 디버깅
    newSocket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected. Reason:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          newSocket.connect();
        }, 1000);
      }
    });

    // Heartbeat 응답
    newSocket.on('heartbeat', () => {
      newSocket.emit('heartbeat-response');
    });

    // 게임 상태 복구
    newSocket.on('reconnect', () => {
      console.log('Socket reconnected');
      if (roomId) {
        // 재연결 시 게임 상태 복구 요청
        newSocket.emit('rejoin-room', { roomId });
      }
    });

    // 다른 플레이어가 나갔을 때
    newSocket.on('player-left', (playerId: string) => {
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
      if (gameStatus === 'playing') {
        // 게임 중 플레이어가 나가면 게임 일시 중지
        setGameStatus('waiting');
      }
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
        {isConnected && roomId && (
          <ShareLink>
            <input 
              type="text" 
              value={`${window.location.origin}?room=${roomId}`} 
              readOnly 
            />
            <button onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`);
              alert('링크가 복사되었습니다!');
            }}>
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
              onChange={(e) => {
                const value = e.target.value;
                setUserInput(value);
                if (socket && roomId && gameStatus === 'playing') {
                  const currentText = sentences[currentSentence];
                  const progress = Math.round((value.length / currentText.length) * 100);
                  
                  const minLength = Math.min(value.length, currentText.length);
                  const correctChars = Array.from(value).reduce((acc, char, i) => 
                    acc + (i < minLength && char === currentText[i] ? 1 : 0), 0);
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

                  if (value === currentText) {
                    socket.emit('sentence-completed', { roomId, sentenceIndex: currentSentence });
                    if (currentSentence < sentences.length - 1) {
                      setCurrentSentence(prev => prev + 1);
                      setUserInput('');
                    } else {
                      socket.emit('game-finished', { roomId, speed, accuracy });
                    }
                  }
                }
              }}
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
