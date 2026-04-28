// routes/aiChat.js
const express = require('express');
const router = express.Router();
require('dotenv').config();

const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');
// 引入你寫嘅 Azure OpenAI 客戶端（假設喺 config/azureOpenAI.js）
const { initAzureOpenAI } = require('../config/azureOpenAI');

// 初始化一次（會印出 config 資料）
const azureAI = initAzureOpenAI();

// 測試路由
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'AI Chat API is working',
    timestamp: new Date().toISOString()
  });
});

// 獲取聊天歷史
router.get('/history', authMiddleware(process.env.JWT_SECRET), (req, res) => {
  const userId = req.user.id;
  const query = `
    SELECT id, role, content, created_at
    FROM ai_chat_history
    WHERE user_id = ?
    ORDER BY created_at ASC
  `;
  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error('❌ 獲取歷史錯誤:', err);
      return res.json({ success: true, history: [] });
    }
    res.json({ success: true, history: results || [] });
  });
});

// 發送訊息
router.post('/message', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    console.log(`📨 用戶 ${userId} 發送訊息: ${message}`);

    if (!message) {
      return res.status(400).json({ success: false, error: '請輸入訊息' });
    }

    // 獲取用戶資料
    const userQuery = 'SELECT username, mbti, bio FROM users WHERE id = ?';
    connection.query(userQuery, [userId], async (err, results) => {
      let userInfo = {
        username: '用戶',
        mbti: '未知',
        bio: '未有自我介紹'
      };

      if (!err && results && results.length > 0) {
        const user = results[0];
        userInfo = {
          username: user.username || '用戶',
          mbti: user.mbti || '未知',
          bio: user.bio || '未有自我介紹'
        };
      } else if (err) {
        console.error('❌ 資料庫查詢錯誤:', err);
      }

      // 儲存用戶訊息到資料庫（唔好阻住回應）
      const insertMsg = 'INSERT INTO ai_chat_history (user_id, role, content) VALUES (?, ?, ?)';
      connection.query(insertMsg, [userId, 'user', message], (err) => {
        if (err) console.error('❌ 儲存用戶訊息失敗:', err);
      });

      // 構建 system prompt
      const systemContent = `你係一個友善嘅AI聊天助手，專門幫助用戶同新朋友打開話題。你了解用戶嘅背景：用戶名 ${userInfo.username}，MBTI 類型 ${userInfo.mbti}，自我介紹：${userInfo.bio}。你嘅任務係：
- 如果用戶問關於佢自己嘅問題（例如佢叫咩名、MBTI係咩），直接回答。
- 如果用戶想開始對話，根據佢嘅背景提供具體嘅話題建議。
- 如果用戶同你普通傾偈，輕鬆回應。
請用廣東話，親切有禮。`;

      const messages = [
        { role: 'system', content: systemContent },
        { role: 'user', content: message }
      ];

      try {
        // 用你寫嘅 azureAI.invoke 代替 openai SDK
        console.log('📤 呼叫 Azure OpenAI，messages:', messages);
        const result = await azureAI.invoke(messages);
        const aiResponse = result.content;

        console.log(`🤖 AI回應 (長度 ${aiResponse.length}):`, aiResponse);

        // 儲存 AI 回應
        connection.query(insertMsg, [userId, 'assistant', aiResponse], (err) => {
          if (err) console.error('❌ 儲存AI回應失敗:', err);
        });

        res.json({
          success: true,
          response: aiResponse
        });
      } catch (openaiError) {
        console.error('❌ Azure OpenAI 錯誤詳細:', openaiError.response?.data || openaiError.message);
        res.status(500).json({
          success: false,
          error: 'AI 回應失敗，請稍後再試',
          detail: openaiError.response?.data || openaiError.message
        });
      }
    });
  } catch (error) {
    console.error('❌ AI 聊天錯誤:', error);
    res.status(500).json({
      success: false,
      error: '伺服器錯誤'
    });
  }
});

module.exports = router;