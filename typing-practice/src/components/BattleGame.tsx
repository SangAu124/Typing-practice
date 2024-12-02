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

interface Player {
  id: string;
  progress: number;
  speed: number;
  accuracy: number;
}

const BattleGame: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // URL에서 roomId 파라미터 확인
    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('room');

    // Socket.io 연결
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:4000');
    setSocket(newSocket);

    if (roomIdParam) {
      // 방 참여
      newSocket.emit('join-room', { roomId: roomIdParam });
    } else {
      // 새 방 생성
      newSocket.emit('create-room');
    }

    // 이벤트 리스너 설정
    newSocket.on('room-created', ({ roomId, text }) => {
      setRoomId(roomId);
      setText(text);
      // URL 업데이트
      window.history.pushState({}, '', `?room=${roomId}`);
    });

    newSocket.on('room-joined', ({ text }) => {
      setText(text);
    });

    newSocket.on('game-start', () => {
      setGameStatus('playing');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });

    newSocket.on('player-update', ({ players }) => {
      setPlayers(players);
    });

    newSocket.on('game-over', ({ winner }) => {
      setGameStatus('finished');
      // 승자 표시 로직 추가
    });

    newSocket.on('player-left', () => {
      // 상대방이 나갔을 때 처리
      setGameStatus('waiting');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (socket && roomId) {
      // 진행률 계산
      const progress = Math.round((value.length / text.length) * 100);
      
      // 정확도 계산
      let correctChars = 0;
      const minLength = Math.min(value.length, text.length);
      for (let i = 0; i < minLength; i++) {
        if (value[i] === text[i]) correctChars++;
      }
      const accuracy = Math.round((correctChars / value.length) * 100) || 100;

      // 속도 계산 (기존 로직 사용)
      const player = players.find(p => p.id === socket.id);
      const speed = player?.speed || 0;

      // 진행 상황 업데이트
      socket.emit('update-progress', {
        roomId,
        progress,
        speed,
        accuracy
      });

      // 게임 종료 체크
      if (progress === 100) {
        setGameStatus('finished');
      }
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <Container>
      <BattleHeader>
        {gameStatus === 'waiting' && roomId && (
          <ShareLink>
            <input 
              type="text" 
              value={`${window.location.origin}${window.location.pathname}?room=${roomId}`} 
              readOnly 
            />
            <button onClick={copyRoomLink}>링크 복사</button>
          </ShareLink>
        )}
      </BattleHeader>

      <BattleArea>
        {players.map((player, index) => (
          <div key={player.id}>
            <PlayerStats>
              <span>Player {index + 1}</span>
              <span>Speed: {player.speed} 타/분</span>
              <span>Accuracy: {player.accuracy}%</span>
            </PlayerStats>
            <ProgressBar $progress={player.progress} />
          </div>
        ))}

        <TextDisplay>
          {text}
        </TextDisplay>

        <Input
          ref={inputRef}
          value={userInput}
          onChange={handleInputChange}
          disabled={gameStatus !== 'playing'}
          placeholder={
            gameStatus === 'waiting' 
              ? '상대방을 기다리는 중...' 
              : gameStatus === 'finished'
              ? '게임 종료!'
              : '입력을 시작하세요...'
          }
        />
      </BattleArea>
    </Container>
  );
};

export default BattleGame;
