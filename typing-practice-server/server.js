const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { translate } = require('@vitalets/google-translate-api');

const app = express();
const server = createServer(app);

// CORS 설정
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
      callback(null, true); // Vercel 환경에서는 모든 origin 허용
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// 번역 API 엔드포인트
app.post('/api/translate', async (req, res) => {
  try {
    const { text } = req.body;
    const { text: translatedText } = await translate(text, { to: 'en' });
    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Socket.IO 서버 설정
const io = new Server(server, {
  cors: {
    origin: '*', // Vercel 환경에서는 모든 origin 허용
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  upgradeTimeout: 10000,
  pingInterval: 25000,
  pingTimeout: 60000,
  connectTimeout: 60000,
  maxHttpBufferSize: 1e6
});

// 방 관리
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let currentRoom = null;

  // 연결 상태 확인
  const interval = setInterval(() => {
    if (socket.connected) {
      socket.emit('ping');
    }
  }, 25000);

  socket.on('create-room', () => {
    try {
      const roomId = Math.random().toString(36).substring(7);
      currentRoom = roomId;
      socket.join(roomId);
      rooms.set(roomId, {
        players: [{ id: socket.id, ready: false }],
        sentences: generateSentences()
      });
      socket.emit('room-created', {
        roomId,
        sentences: rooms.get(roomId).sentences
      });
      console.log('Room created:', roomId);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  socket.on('join-room', ({ roomId }) => {
    try {
      const room = rooms.get(roomId);
      if (room && room.players.length < 2) {
        currentRoom = roomId;
        socket.join(roomId);
        room.players.push({ id: socket.id, ready: false });
        socket.emit('room-joined', {
          roomId,
          sentences: room.sentences
        });
        io.to(roomId).emit('player-joined', {
          players: room.players
        });
        console.log('Player joined room:', roomId);
      } else {
        socket.emit('error', { message: 'Room not found or full' });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('player-ready', () => {
    try {
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          const player = room.players.find(p => p.id === socket.id);
          if (player) {
            player.ready = true;
            if (room.players.every(p => p.ready)) {
              io.to(currentRoom).emit('game-start');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in player-ready:', error);
    }
  });

  socket.on('progress-update', (data) => {
    try {
      if (currentRoom) {
        socket.to(currentRoom).emit('opponent-progress', data);
      }
    } catch (error) {
      console.error('Error in progress-update:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      clearInterval(interval);
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.players = room.players.filter(p => p.id !== socket.id);
          if (room.players.length === 0) {
            rooms.delete(currentRoom);
          } else {
            io.to(currentRoom).emit('player-left', {
              players: room.players
            });
          }
        }
      }
      console.log('Client disconnected:', socket.id);
    } catch (error) {
      console.error('Error in disconnect:', error);
    }
  });
});

// 문장 생성 함수
function generateSentences() {
  const sentences = [
    "타자 연습의 첫 번째 문장입니다. 천천히 정확하게 입력해보세요.",
    "두 번째 문장입니다. 이제 속도를 조금 올려볼까요?",
    "마지막 문장입니다. 최선을 다해 입력해주세요!"
  ];
  return sentences;
}

// 서버 시작
const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
