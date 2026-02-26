// routes/insights.js (修正版)
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');
const { initAzureOpenAI } = require('../config/azureOpenAI'); // 引入你嘅客戶端

const azureAI = initAzureOpenAI(); // 初始化一次

// 輔助函數：將 connection.query 包裝成 Promise
function queryPromise(sql, params) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// GET /api/insights/report
router.get('/report', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. 獲取用戶MBTI歷史
        const mbtiHistory = await queryPromise(
            'SELECT mbti_type, created_at FROM mbti_history WHERE user_id = ? ORDER BY created_at',
            [userId]
        );

        // 2. 獲取聊天統計（與不同MBTI類型的好友聊天次數）
        const chatStats = await queryPromise(`
            SELECT 
                u.mbti AS friend_mbti,
                COUNT(*) AS message_count
            FROM messages m
            JOIN chat_room_members crm1 ON m.room_id = crm1.room_id AND crm1.user_id = ?  -- 自己
            JOIN chat_room_members crm2 ON m.room_id = crm2.room_id AND crm2.user_id != ? -- 對方
            JOIN users u ON crm2.user_id = u.id
            WHERE m.sender_id = ?  -- 自己發送嘅消息
                AND u.mbti IS NOT NULL
            GROUP BY u.mbti
            ORDER BY message_count DESC
        `, [userId, userId, userId]);

        // 3. 獲取活躍時段統計（按小時）
        const activeHours = await queryPromise(`
            SELECT HOUR(created_at) AS hour, COUNT(*) AS count
            FROM messages
            WHERE sender_id = ?
            GROUP BY HOUR(created_at)
            ORDER BY count DESC
        `, [userId]);

        // 4. 獲取話題成功率（簡單定義：自己發送消息後，對方在24小時內回覆）
        const topicSuccess = await queryPromise(`
            SELECT 
                COUNT(DISTINCT m1.id) AS total_messages,
                COUNT(DISTINCT m2.id) AS replied_messages
            FROM messages m1
            LEFT JOIN messages m2 
                ON m1.room_id = m2.room_id 
                AND m2.sender_id != m1.sender_id 
                AND m2.created_at > m1.created_at 
                AND m2.created_at < DATE_ADD(m1.created_at, INTERVAL 1 DAY)
            WHERE m1.sender_id = ?
        `, [userId]);

        // 5. 獲取最近7篇日記
        const recentDiaries = await queryPromise(`
            SELECT content, created_at FROM daily_journals WHERE user_id = ? ORDER BY created_at DESC LIMIT 7
        `, [userId]);

        // 6. 獲取用戶發帖/評論內容（可選）
        const posts = await queryPromise(`
            SELECT content, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        `, [userId]);

        // 構建 prompt 內容
        const mbtiHistoryText = mbtiHistory.map(m => `${m.created_at}: ${m.mbti_type}`).join('\n');
        const chatStatsText = chatStats.map(c => `${c.friend_mbti}: ${c.message_count} 次`).join('\n');
        const activeHourText = activeHours.map(a => `${a.hour} 時: ${a.count} 條消息`).join('\n');
        const successRate = topicSuccess[0]?.total_messages
            ? ((topicSuccess[0].replied_messages / topicSuccess[0].total_messages) * 100).toFixed(1)
            : 0;
        const diaryText = recentDiaries.map(d => `${d.created_at}: ${d.content}`).join('\n');
        const postText = posts.map(p => p.content).join('\n');

        const systemPrompt = `你係一個社交洞察分析師，擅長根據用戶數據生成MBTI社交報告。請用廣東話，親切有趣嘅方式為用戶總結以下洞察：
1. 性格變化趨勢（根據MBTI歷史同日記）
2. 最常互動嘅MBTI類型
3. 最活躍嘅時間段
4. 話題成功率（定義為對方回覆嘅比率）及建議改善話題
5. 整體社交建議

請以以下格式回覆：
【性格趨勢】
...
【交友報告】
• 最常傾偈嘅MBTI：...
• 活躍時間：...
• 話題成功率：...
【小貼士】
...`;

        const userPrompt = `
用戶MBTI歷史：
${mbtiHistoryText || '未有記錄'}

最近日記：
${diaryText || '未有日記'}

最近發帖：
${postText || '未有發帖'}

與不同MBTI好友聊天次數：
${chatStatsText || '未有數據'}

活躍時段統計：
${activeHourText || '未有數據'}

話題成功率：${successRate}%

請生成一份完整報告。`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        // 調用 Azure OpenAI（改用你嘅客戶端）
        const result = await azureAI.invoke(messages);
        const report = result.content;

        res.json({
            success: true,
            report,
            stats: {
                chatStats,
                activeHours,
                successRate,
                mbtiHistory
            }
        });

    } catch (error) {
        console.error('❌ 生成報告錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// 提交日記並獲取AI分析
router.post('/diary', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    try {
        const { content, mood } = req.body;
        const userId = req.user.id;

        if (!content) {
            return res.status(400).json({ success: false, error: '請輸入日記內容' });
        }

        // 儲存日記到數據庫
        const insertDiary = 'INSERT INTO daily_journals (user_id, content, mood) VALUES (?, ?, ?)';
        connection.query(insertDiary, [userId, content, mood || null], async (err) => {
            if (err) {
                console.error('❌ 儲存日記失敗:', err);
                return res.status(500).json({ success: false, error: '日記儲存失敗' });
            }

            // 獲取用戶最近7日的日記（用於趨勢分析）
            const diaryQuery = `
                SELECT content, DATE(created_at) as date
                FROM daily_journals
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 7
            `;
            connection.query(diaryQuery, [userId], async (err, diaries) => {
                if (err) console.error('❌ 獲取日記歷史失敗:', err);

                // 獲取用戶MBTI歷史（可選）
                const mbtiQuery = 'SELECT mbti_type, created_at FROM mbti_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5';
                connection.query(mbtiQuery, [userId], async (err, mbtiHistory) => {
                    // 構建 prompt
                    const diaryText = diaries.map(d => `${d.date}: ${d.content}`).join('\n');
                    const mbtiText = mbtiHistory.map(m => `${m.created_at}: ${m.mbti_type}`).join('\n');

                    const systemPrompt = `你係一個擅長分析MBTI性格嘅心理學助手。用戶寫咗一篇日記，請你根據日記內容分析佢今日可能表現出嘅MBTI維度傾向（例如今日傾向ISTJ模式），並俾出一句放鬆建議。如果有多篇日記，可以簡單講下性格變化趨勢。請用廣東話回覆，親切有禮。`;

                    const userPrompt = `今日日記：${content}\n\n最近日記（最多7篇）：${diaryText}\n\nMBTI歷史記錄：${mbtiText}`;

                    try {
                        // 改用 azureAI.invoke
                        const messages = [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ];
                        const result = await azureAI.invoke(messages);
                        const aiResponse = result.content;

                        res.json({
                            success: true,
                            analysis: aiResponse,
                            diarySaved: true
                        });
                    } catch (aiError) {
                        console.error('❌ AI 分析錯誤:', aiError);
                        res.json({ success: true, message: '日記已儲存，但AI分析暫時不可用' });
                    }
                });
            });
        });
    } catch (error) {
        console.error('❌ 日記API錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;