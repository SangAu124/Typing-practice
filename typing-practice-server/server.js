const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: ['https://typing-practice-front-end.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// CORS 설정을 더 구체적으로 지정
app.use(cors({
  origin: ['https://typing-practice-front-end.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// 상태 확인용 엔드포인트
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

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

// POST 라우트는 유지
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

const sentences = [
  "The quick brown fox jumps over the lazy dog. A wizard's job is to vex chumps quickly in fog. Pack my box with five dozen liquor jugs.",
  "She sells seashells by the seashore. The waves crashed on the sandy beach. The sun set behind the mountains.",
  "The old clock struck midnight. The wind howled through the trees. The stars twinkled in the night sky.",
  "A rainbow appeared after the storm. Birds sang their morning songs. Flowers bloomed in the garden.",
  "The coffee machine beeped loudly. Steam rose from the cup. The aroma filled the room."
];

const getRandomText = () => {
  const usedTexts = new Set();
  return () => {
    let availableTexts = sentences.filter(text => !usedTexts.has(text));
    if (availableTexts.length === 0) {
      usedTexts.clear();
      availableTexts = sentences;
    }
    const text = availableTexts[Math.floor(Math.random() * availableTexts.length)];
    usedTexts.add(text);
    return text;
  };
};

const textGenerator = getRandomText();
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('create-room', () => {
    const roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    rooms.set(roomId, {
      text: textGenerator(),
      players: [{
        id: socket.id,
        progress: 0,
        speed: 0,
        accuracy: 100
      }],
      gameStatus: 'waiting'
    });
    
    socket.join(roomId);
    socket.emit('room-created', { roomId, text: rooms.get(roomId).text });
    console.log('Room created:', roomId);
  });

  socket.on('join-room', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2) {
      room.players.push({
        id: socket.id,
        progress: 0,
        speed: 0,
        accuracy: 100
      });
      
      socket.join(roomId);
      room.gameStatus = 'playing';
      socket.emit('room-joined', { text: room.text });
      io.to(roomId).emit('player-update', { players: room.players });
      io.to(roomId).emit('game-start');
    }
  });

  socket.on('update-progress', ({ roomId, progress, speed, accuracy }) => {
    const room = rooms.get(roomId);
    if (room && room.gameStatus === 'playing') {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.progress = progress;
        player.speed = speed;
        player.accuracy = accuracy;
        
        io.to(roomId).emit('player-update', { players: room.players });
      }
    }
  });

  socket.on('game-finished', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.gameStatus === 'playing') {
      const winner = socket.id;
      room.gameStatus = 'finished';
      io.to(roomId).emit('game-over', { winner });
    }
  });

  socket.on('rematch-request', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.gameStatus === 'finished') {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.rematchReady = true;
        
        if (room.players.every(p => p.rematchReady)) {
          room.text = textGenerator();
          room.gameStatus = 'playing';
          room.players.forEach(p => {
            p.rematchReady = false;
            p.progress = 0;
            p.speed = 0;
            p.accuracy = 100;
          });
          io.to(roomId).emit('rematch-start', { text: room.text });
        } else {
          io.to(roomId).emit('player-update', { players: room.players });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          room.gameStatus = 'waiting';
          io.to(roomId).emit('player-left');
          io.to(roomId).emit('player-update', { players: room.players });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
