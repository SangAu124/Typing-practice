const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// CORS 설정을 더 구체적으로 지정
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://typing-practice-front-end.vercel.app'
    ];
    // origin이 undefined인 경우는 같은 도메인에서의 요청
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());

// GET과 POST 모두 처리할 수 있도록 라우트 추가
app.get('/translate', async (req, res) => {
  try {
    const { text } = req.query;  // GET 요청은 query에서 파라미터를 가져옴
    const targetLang = 'en';

    // URL 인코딩
    const encodedText = encodeURI(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${targetLang}&dt=t&q=${encodedText}`;

    const response = await axios.get(url);
    
    // 번역 결과 추출
    const translatedText = response.data[0].reduce((acc, curr) => {
      if (curr[0]) {
        return acc + curr[0];
      }
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
      if (curr[0]) {
        return acc + curr[0];
      }
      return acc;
    }, '');

    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});