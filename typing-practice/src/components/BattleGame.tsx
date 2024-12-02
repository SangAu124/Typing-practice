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
  rematchReady?: boolean;
}

const BattleGame: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<string>('');
  const [gameStartTime, setGameStartTime] = useState<number>(0);
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

    newSocket.on('room-created', ({ roomId, text }) => {
      setRoomId(roomId);
      setText(text);
      window.history.pushState({}, '', `?room=${roomId}`);
    });

    newSocket.on('room-joined', ({ text }) => {
      setText(text);
    });

    newSocket.on('player-update', ({ players }: { players: Player[] }) => {
      setPlayers(players);
    });

    newSocket.on('game-start', () => {
      setGameStatus('playing');
      setGameStartTime(Date.now());
      setUserInput('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });

    newSocket.on('game-over', ({ winner }) => {
      setGameStatus('finished');
      setWinner(winner);
    });

    newSocket.on('player-left', () => {
      setGameStatus('waiting');
      setUserInput('');
      setText('');
    });

    newSocket.on('rematch-start', ({ text }) => {
      setText(text);
      setUserInput('');
      setGameStatus('playing');
      setWinner('');
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

    if (socket && roomId && gameStatus === 'playing') {
      const progress = Math.round((value.length / text.length) * 100);
      
      let correctChars = 0;
      const minLength = Math.min(value.length, text.length);
      for (let i = 0; i < minLength; i++) {
        if (value[i] === text[i]) correctChars++;
      }
      const accuracy = Math.round((correctChars / value.length) * 100) || 100;

      const words = value.trim().split(/\s+/).length;
      const minutes = (Date.now() - gameStartTime) / 60000;
      const speed = Math.round(words / minutes) || 0;

      socket.emit('update-progress', {
        roomId,
        progress,
        speed,
        accuracy
      });

      if (progress === 100) {
        socket.emit('game-finished', { roomId });
      }
    }
  };

  const handleRematch = () => {
    if (socket && roomId) {
      socket.emit('rematch-request', { roomId });
    }
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/battle?room=${roomId}`;
    navigator.clipboard.writeText(url);
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
            <button onClick={copyRoomLink}>링크 복사</button>
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
              {gameStatus === 'finished' && player.rematchReady && (
                <span>재대결 준비 완료</span>
              )}
            </PlayerStats>
            <ProgressBar $progress={player.progress} />
          </div>
        ))}

        {gameStatus === 'waiting' && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            상대방을 기다리는 중...
          </div>
        )}

        {(gameStatus === 'playing' || gameStatus === 'finished') && (
          <>
            <TextDisplay>{text}</TextDisplay>
            <Input
              ref={inputRef}
              value={userInput}
              onChange={handleInputChange}
              disabled={gameStatus === 'finished'}
              placeholder="여기에 입력하세요..."
            />
          </>
        )}

        {gameStatus === 'finished' && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <h3>{winner === socket?.id ? '승리!' : '패배...'}</h3>
            <button onClick={handleRematch}>재대결</button>
          </div>
        )}
      </BattleArea>
    </Container>
  );
};

export default BattleGame;
