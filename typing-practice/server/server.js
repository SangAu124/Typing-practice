const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/translate', async (req, res) => {
  try {
    const { text } = req.body;
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
    res.status(500).json({ error: 'Translation failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
