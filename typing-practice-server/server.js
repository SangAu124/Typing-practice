const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = createServer(app);

// CORS 설정 업데이트
const allowedOrigins = [
  'https://typing-practice-front-end.vercel.app',
  'http://localhost:3000',
  'https://typing-practice-git-main-sangau124.vercel.app',
  'https://typing-practice-sangau124.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Socket.IO 서버 설정 최적화
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['*']
  },
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  upgradeTimeout: 10000,
  pingInterval: 10000,
  pingTimeout: 5000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true,
  path: '/socket.io/',
  adapter: require('socket.io-adapter')(),
  perMessageDeflate: {
    threshold: 1024
  }
});

// 활성 연결 관리
const activeConnections = new Map();

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // 연결 관리에 추가
  activeConnections.set(socket.id, {
    lastActive: Date.now(),
    reconnectAttempts: 0
  });

  // 클라이언트 상태 모니터링
  const heartbeat = setInterval(() => {
    socket.emit('heartbeat');
  }, 5000);

  socket.on('heartbeat-response', () => {
    if (activeConnections.has(socket.id)) {
      activeConnections.get(socket.id).lastActive = Date.now();
      activeConnections.get(socket.id).reconnectAttempts = 0;
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
    clearInterval(heartbeat);
    
    // 재연결 시도 중인 소켓 정보 유지
    if (reason === 'transport close' || reason === 'ping timeout') {
      setTimeout(() => {
        if (activeConnections.has(socket.id)) {
          const connection = activeConnections.get(socket.id);
          if (connection.reconnectAttempts < 5) {
            connection.reconnectAttempts++;
            activeConnections.set(socket.id, connection);
          } else {
            activeConnections.delete(socket.id);
            const room = Array.from(rooms.entries()).find(([_, r]) => 
              r.players.some(p => p.id === socket.id)
            );
            if (room) {
              handlePlayerDisconnect(room[0], socket.id);
            }
          }
        }
      }, 5000);
    } else {
      activeConnections.delete(socket.id);
      const room = Array.from(rooms.entries()).find(([_, r]) => 
        r.players.some(p => p.id === socket.id)
      );
      if (room) {
        handlePlayerDisconnect(room[0], socket.id);
      }
    }
  });

  socket.on('create-room', () => {
    const roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sentences = textGenerator();
    rooms.set(roomId, {
      id: roomId,
      players: [{
        id: socket.id,
        progress: 0,
        speed: 0,
        accuracy: 100,
        currentSentence: 0,
        sentenceProgress: Array(sentences.length).fill(0),
        finished: false,
        rematchReady: false,
        overallProgress: 0
      }],
      sentences,
      gameStatus: 'waiting'
    });
    
    socket.join(roomId);
    socket.emit('room-created', { roomId, sentences });
    console.log('Room created:', roomId);
  });

  socket.on('join-room', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2) {
      room.players.push({
        id: socket.id,
        progress: 0,
        speed: 0,
        accuracy: 100,
        currentSentence: 0,
        sentenceProgress: Array(room.sentences.length).fill(0),
        finished: false,
        rematchReady: false,
        overallProgress: 0
      });
      
      socket.join(roomId);
      socket.emit('room-joined', { sentences: room.sentences });
      io.to(roomId).emit('player-update', { players: room.players });
      
      if (room.players.length === 2) {
        room.gameStatus = 'playing';
        io.to(roomId).emit('game-start');
      }
    }
  });

  socket.on('update-progress', ({ roomId, progress, speed, accuracy, currentSentence }) => {
    const room = rooms.get(roomId);
    if (room && room.gameStatus === 'playing') {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        // 현재 문장의 진행도 업데이트
        player.progress = progress;
        player.speed = speed;
        player.accuracy = accuracy;
        player.currentSentence = currentSentence;
        player.sentenceProgress[currentSentence] = progress;

        // 전체 진행도 계산
        player.overallProgress = calculateOverallProgress(player.sentenceProgress);
        
        // 모든 플레이어의 상태 전송
        io.to(roomId).emit('player-update', { 
          players: room.players.map(p => ({
            id: p.id,
            progress: p.progress,
            speed: p.speed,
            accuracy: p.accuracy,
            currentSentence: p.currentSentence,
            sentenceProgress: p.sentenceProgress,
            overallProgress: p.overallProgress,
            rematchReady: p.rematchReady
          }))
        });

        // 디버깅용 로그
        console.log(`Player ${socket.id} progress update:`, {
          currentSentence,
          progress,
          sentenceProgress: player.sentenceProgress,
          overallProgress: player.overallProgress
        });
      }
    }
  });

  socket.on('sentence-completed', ({ roomId, sentenceIndex }) => {
    const room = rooms.get(roomId);
    if (room && room.gameStatus === 'playing') {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.currentSentence = sentenceIndex + 1;
        player.sentenceProgress[sentenceIndex] = 100;
        player.overallProgress = calculateOverallProgress(player.sentenceProgress);
        
        io.to(roomId).emit('player-update', { 
          players: room.players.map(p => ({
            id: p.id,
            progress: p.progress,
            speed: p.speed,
            accuracy: p.accuracy,
            currentSentence: p.currentSentence,
            sentenceProgress: p.sentenceProgress,
            overallProgress: p.overallProgress,
            rematchReady: p.rematchReady
          }))
        });
      }
    }
  });

  socket.on('game-finished', ({ roomId, speed, accuracy }) => {
    const room = rooms.get(roomId);
    if (room && room.gameStatus === 'playing') {
      const finishedPlayer = room.players.find(p => p.id === socket.id);
      if (finishedPlayer) {
        finishedPlayer.finished = true;
        finishedPlayer.finalSpeed = speed;
        finishedPlayer.finalAccuracy = accuracy;

        // 모든 플레이어가 완료했는지 확인
        if (room.players.every(p => p.finished)) {
          // 승자 결정: 정확도와 속도를 모두 고려
          const scores = room.players.map(p => ({
            id: p.id,
            score: (p.finalAccuracy * 0.6) + (p.finalSpeed * 0.4) // 정확도 60%, 속도 40% 비중
          }));
          
          scores.sort((a, b) => b.score - a.score);
          const winner = scores[0].id;
          
          room.gameStatus = 'finished';
          io.to(roomId).emit('game-over', { 
            winner,
            players: room.players.map(p => ({
              id: p.id,
              progress: p.progress,
              speed: p.finalSpeed,
              accuracy: p.finalAccuracy
            }))
          });
        }
      }
    }
  });

  socket.on('rematch-request', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.gameStatus === 'finished') {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.rematchReady = true;
        
        if (room.players.every(p => p.rematchReady)) {
          room.sentences = textGenerator();
          room.gameStatus = 'playing';
          room.players.forEach(p => {
            p.rematchReady = false;
            p.progress = 0;
            p.speed = 0;
            p.accuracy = 100;
            p.currentSentence = 0;
            p.sentenceProgress = Array(room.sentences.length).fill(0);
            p.finished = false;
            p.finalSpeed = 0;
            p.finalAccuracy = 0;
            p.overallProgress = 0;
          });
          io.to(roomId).emit('rematch-start', { sentences: room.sentences });
        } else {
          io.to(roomId).emit('player-update', { players: room.players });
        }
      }
    }
  });
});

// 연결 관리 함수
function handlePlayerDisconnect(roomId, playerId) {
  const room = rooms.get(roomId);
  if (room) {
    room.players = room.players.filter(p => p.id !== playerId);
    if (room.players.length === 0) {
      rooms.delete(roomId);
    } else {
      rooms.set(roomId, room);
      io.to(roomId).emit('player-left', playerId);
    }
  }
}

// 비활성 연결 정리
setInterval(() => {
  const now = Date.now();
  activeConnections.forEach((connection, socketId) => {
    if (now - connection.lastActive > 30000) { // 30초 동안 응답 없음
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      activeConnections.delete(socketId);
    }
  });
}, 10000);

// 번역 엔드포인트
app.get('/translate', async (req, res) => {
  try {
    const { text } = req.query;
    const targetLang = 'en';
    const encodedText = encodeURI(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${targetLang}&dt=t&q=${encodedText}`;
    
    const response = await axios.get(url);
    const translatedText = response.data[0].reduce((acc, curr) => {
      if (curr[0]) return acc + curr[0];
      return acc;
    }, '');
    
    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  }
});

// POST 라우트
app.post('/translate', async (req, res) => {
  try {
    const { text } = req.body;
    const targetLang = 'en';
    const encodedText = encodeURI(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${targetLang}&dt=t&q=${encodedText}`;
    
    const response = await axios.get(url);
    const translatedText = response.data[0].reduce((acc, curr) => {
      if (curr[0]) return acc + curr[0];
      return acc;
    }, '');
    
    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  }
});

// 기본 헬스 체크 엔드포인트
app.get('/', (req, res) => {
  res.send('Server is running');
});

const textGenerator = () => {
  // 여러 문장 배열 생성
  const sentences = [
    "타자 연습의 첫 번째 문장입니다. 천천히 정확하게 입력해보세요.",
    "두 번째 문장입니다. 이제 속도를 조금 올려볼까요?",
    "마지막 문장입니다. 최선을 다해 입력해주세요!"
  ];
  return sentences;
};

function calculateOverallProgress(sentenceProgress) {
  if (!sentenceProgress || sentenceProgress.length === 0) return 0;
  const sum = sentenceProgress.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / sentenceProgress.length);
}

setInterval(() => {
  io.emit('ping');
}, 25000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
