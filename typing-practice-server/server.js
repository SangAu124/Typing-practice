require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 4000;

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
    const { text } = req.query;  // GET 요청은 query에서 파라미터를 가져옴
    const targetLang = 'en';

    // URL 인코딩
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
