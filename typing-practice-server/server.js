require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 4000;

// CORS 설정
const allowedOrigins = [
  'http://localhost:3000',
  'https://typing-practice-git-main-moderntec-sw.vercel.app',
  'https://typing-practice-moderntec-sw.vercel.app',
  'https://typing-practice.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
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
    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    console.log('Translating text:', text); // 디버깅용 로그

    const encodedText = encodeURI(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodedText}`;
    
    const response = await axios.get(url);
    
    if (!response.data || !response.data[0]) {
      throw new Error('Invalid response from translation service');
    }

    const translatedText = response.data[0].reduce((acc, curr) => {
      if (curr[0]) {
        return acc + curr[0];
      }
      return acc;
    }, '');

    console.log('Translated text:', translatedText); // 디버깅용 로그
    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error.message);
    res.status(500).json({ 
      error: 'Translation failed', 
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
