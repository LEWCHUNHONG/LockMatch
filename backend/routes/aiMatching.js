// routes/aiMatching.js
const express = require('express');
const router = express.Router();
require('dotenv').config();

const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');
const { initAzureOpenAI } = require('../config/azureOpenAI'); // 引入你寫嘅客戶端

const azureAI = initAzureOpenAI(); // 初始化一次

// 匹配多個用戶 (用於推薦列表)
router.post('/matching', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // 1. 獲取當前用戶資料
        const [currentUserRows] = await connection.promise().query(
            'SELECT username, mbti, bio FROM users WHERE id = ?',
            [currentUserId]
        );
        if (currentUserRows.length === 0) {
            return res.status(404).json({ success: false, error: '用戶不存在' });
        }
        const currentUser = currentUserRows[0];

        // 2. 獲取其他用戶
        const [otherUsers] = await connection.promise().query(
            'SELECT id, username, mbti, bio, avatar FROM users WHERE id != ?',
            [currentUserId]
        );

        if (otherUsers.length === 0) {
            return res.json({ success: true, users: [] });
        }

        // 限制傳入 AI 嘅用戶數量
        let usersToSend = otherUsers;
        if (otherUsers.length > 20) {
            usersToSend = otherUsers.sort(() => 0.5 - Math.random()).slice(0, 20);
            console.log(`⚠️ 用戶過多，隨機選取 20 個進行 AI 匹配`);
        }

        // 3. 建立用戶列表字串
        const userDescriptions = usersToSend.map(u =>
            `ID: ${u.id}, 用戶名: ${u.username}, MBTI: ${u.mbti || '未知'}, 自我介紹: ${u.bio || '無'}`
        ).join('\n');

        // 4. 準備俾 AI 嘅 prompt
        const systemPrompt = `你是一個專業的 MBTI 匹配顧問，擅長根據人格類型和自我介紹推薦最合適的朋友。
當前用戶的資料：
- 用戶名：${currentUser.username}
- MBTI：${currentUser.mbti || '未知'}
- 自我介紹：${currentUser.bio || '無'}

以下是其他用戶的資料列表：
${userDescriptions}

請根據 MBTI 相容性與自我介紹內容，推薦最匹配的 5 位用戶。請**只回傳 JSON 格式**，格式如下：
{
  "matches": [
    { "user_id": 數字, "reason": "匹配原因", "match_score": 分數(0-100) },
    ...
  ]
}
不要包含任何其他文字、註解或 Markdown 標記。`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '請推薦最匹配的 5 位用戶。' }
        ];

        let matches = [];

        // 5. 呼叫 Azure OpenAI，如果失敗就行後備隨機匹配
        try {
            console.log('🔍 呼叫 Azure OpenAI 進行匹配...');
            const result = await azureAI.invoke(messages);
            const aiResponse = result.content;
            console.log('🤖 AI 原始回應:', aiResponse);

            // 嘗試解析 JSON
            if (aiResponse && aiResponse.trim()) {
                try {
                    const parsed = JSON.parse(aiResponse);
                    matches = parsed.matches || [];
                } catch (parseError) {
                    console.error('❌ JSON 解析失敗:', parseError.message);
                    // 嘗試用正則提取 JSON
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            const extracted = JSON.parse(jsonMatch[0]);
                            matches = extracted.matches || [];
                            console.log('✅ 從大括號提取 JSON 成功');
                        } catch (e) {
                            console.error('❌ 提取後 JSON 解析仍然失敗:', e.message);
                        }
                    }
                }
            }
        } catch (aiError) {
            console.error('❌ Azure OpenAI 呼叫失敗:', aiError.message);
            // 唔好 throw error，繼續行後備
        }

        // 6. 如果 matches 係空，就用後備隨機匹配
        if (matches.length === 0) {
            console.log('🔄 使用後備匹配：隨機選取 5 位用戶');
            const shuffled = [...otherUsers].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 5);
            matches = selected.map(user => ({
                user_id: user.id,
                reason: '系統為您隨機推薦的朋友，希望您們聊得來！',
                match_score: 50
            }));
        }

        // 7. 查詢好友狀態
        const [friendRows] = await connection.promise().query(
            `SELECT user2_id AS friend_id FROM friendships WHERE user1_id = ? AND status = 'accepted'
             UNION
             SELECT user1_id FROM friendships WHERE user2_id = ? AND status = 'accepted'`,
            [currentUserId, currentUserId]
        );
        const friendIds = new Set(friendRows.map(row => row.friend_id));

        const [sentRows] = await connection.promise().query(
            'SELECT to_user_id FROM friend_requests WHERE from_user_id = ? AND status = "pending"',
            [currentUserId]
        );
        const sentRequestIds = new Set(sentRows.map(row => row.to_user_id));

        const [receivedRows] = await connection.promise().query(
            'SELECT from_user_id FROM friend_requests WHERE to_user_id = ? AND status = "pending"',
            [currentUserId]
        );
        const receivedRequestIds = new Set(receivedRows.map(row => row.from_user_id));

        // 8. 過濾 matches，只保留可加好友的用戶
        let filteredMatches = matches.filter(m => {
            return !friendIds.has(m.user_id) &&
                !sentRequestIds.has(m.user_id) &&
                !receivedRequestIds.has(m.user_id);
        });

        // 9. 如果過濾後少於 2 個，補充隨機新朋友
        const MIN_MATCHES = 2;
        if (filteredMatches.length < MIN_MATCHES) {
            const existingMatchIds = new Set(filteredMatches.map(m => m.user_id));
            // 從 otherUsers 中找出所有可用的用戶
            const availableUsers = otherUsers.filter(u => {
                return !friendIds.has(u.id) &&
                    !sentRequestIds.has(u.id) &&
                    !receivedRequestIds.has(u.id) &&
                    !existingMatchIds.has(u.id);
            });

            // 隨機排序
            const shuffledAvailable = [...availableUsers].sort(() => 0.5 - Math.random());
            const needed = MIN_MATCHES - filteredMatches.length;
            const toAdd = shuffledAvailable.slice(0, needed);

            // 轉換為 matches 格式
            const additionalMatches = toAdd.map(user => ({
                user_id: user.id,
                reason: '系統推薦的新朋友',
                match_score: 50
            }));

            filteredMatches = [...filteredMatches, ...additionalMatches];
        }

        // 更新 matches 為 filteredMatches
        matches = filteredMatches;

        // 10. 過濾出有效嘅用戶 ID
        const matchUserIds = matches.map(m => m.user_id);
        const [validUsers] = await connection.promise().query(
            'SELECT id FROM users WHERE id IN (?)',
            [matchUserIds.length ? matchUserIds : [0]]
        );
        const validIds = new Set(validUsers.map(u => u.id));
        matches = matches.filter(m => validIds.has(m.user_id));

        // 11. 組合最終用戶資料
        const users = matches.map(match => {
            const user = otherUsers.find(u => u.id === match.user_id);
            if (!user) return null;

            let avatarUrl = null;
            if (user.avatar) {
                if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
                    avatarUrl = user.avatar;
                } else {
                    const path = user.avatar.startsWith('/') ? user.avatar : '/' + user.avatar;
                    avatarUrl = `${process.env.API_URL || 'http://localhost:3000'}${path}`;
                }
            }

            return {
                id: user.id.toString(),
                name: user.username,
                username: user.username,
                mbti: user.mbti || '待測',
                distance: '未知',
                avatar: avatarUrl,
                status: user.bio || '尋找朋友中',
                isFriend: false,
                isRequestPending: false,
                matchReason: match.reason,
                matchScore: match.match_score
            };
        }).filter(u => u !== null);

        res.json({ success: true, users });
    } catch (error) {
        console.error('❌ MBTI 匹配錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// 自動匹配一位用戶並發送好友請求
router.post('/auto-match', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // 1. 獲取當前用戶資料
        const [currentUserRows] = await connection.promise().query(
            'SELECT username, mbti, bio FROM users WHERE id = ?',
            [currentUserId]
        );
        if (currentUserRows.length === 0) {
            return res.status(404).json({ success: false, error: '用戶不存在' });
        }
        const currentUser = currentUserRows[0];

        // 2. 獲取其他用戶
        const [otherUsers] = await connection.promise().query(
            'SELECT id, username, mbti, bio, avatar FROM users WHERE id != ?',
            [currentUserId]
        );
        if (otherUsers.length === 0) {
            return res.json({
                success: true,
                noOtherUsers: true,
                message: '目前沒有其他用戶可匹配',
                match: null
            });
        }

        // 限制用戶數量
        let usersToSend = otherUsers;
        if (otherUsers.length > 20) {
            usersToSend = otherUsers.sort(() => 0.5 - Math.random()).slice(0, 20);
        }

        // 3. 準備 prompt
        const userDescriptions = usersToSend.map(u =>
            `ID: ${u.id}, 用戶名: ${u.username}, MBTI: ${u.mbti || '未知'}, 自我介紹: ${u.bio || '無'}`
        ).join('\n');

        const systemPrompt = `你是一個專業的 MBTI 匹配顧問，擅長根據人格類型和自我介紹推薦最合適的朋友。
當前用戶的資料：
- 用戶名：${currentUser.username}
- MBTI：${currentUser.mbti || '未知'}
- 自我介紹：${currentUser.bio || '無'}

以下是其他用戶的資料列表：
${userDescriptions}

請根據 MBTI 相容性與自我介紹內容，推薦**最匹配的一位用戶**。請只回傳 JSON 格式，格式如下：
{
  "user_id": 數字,
  "reason": "匹配原因",
  "match_score": 分數(0-100)
}
不要包含任何其他文字。`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '請推薦最匹配的一位用戶。' }
        ];

        let match = null;

        // 4. 呼叫 Azure OpenAI，失敗就用後備隨機
        try {
            console.log('🔍 呼叫 Azure OpenAI 進行自動匹配...');
            const result = await azureAI.invoke(messages);
            const aiResponse = result.content;
            console.log('🤖 AI 自動匹配回應:', aiResponse);

            if (aiResponse && aiResponse.trim()) {
                try {
                    const parsed = JSON.parse(aiResponse);
                    match = parsed;
                } catch (parseError) {
                    console.error('❌ JSON 解析失敗:', parseError.message);
                    // 嘗試提取 JSON
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            match = JSON.parse(jsonMatch[0]);
                        } catch (e) { }
                    }
                }
            }
        } catch (aiError) {
            console.error('❌ Azure OpenAI 呼叫失敗:', aiError.message);
        }

        // 5. 若 AI 匹配失敗或無效，則隨機選擇一位用戶
        if (!match || !match.user_id) {
            console.log('🔄 使用隨機匹配作為後備');
            const randomIndex = Math.floor(Math.random() * otherUsers.length);
            const randomUser = otherUsers[randomIndex];
            match = {
                user_id: randomUser.id,
                reason: '系統為您隨機匹配的朋友，希望您們聊得來！',
                match_score: 50
            };
        }

        const matchedUserId = match.user_id;
        const matchedUser = otherUsers.find(u => u.id === matchedUserId);
        if (!matchedUser) {
            return res.status(404).json({ success: false, error: '匹配的用戶不存在' });
        }

        // 6. 檢查是否已是好友
        const [friendRows] = await connection.promise().query(
            `SELECT id FROM friendships 
             WHERE (user1_id = ? AND user2_id = ? AND status = 'accepted')
                OR (user1_id = ? AND user2_id = ? AND status = 'accepted')`,
            [currentUserId, matchedUserId, matchedUserId, currentUserId]
        );
        if (friendRows.length > 0) {
            return res.status(400).json({ success: false, error: '你們已經是好友了' });
        }

        // 7. 檢查是否已有待處理的好友請求
        const [requestRows] = await connection.promise().query(
            `SELECT id FROM friend_requests 
             WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
               AND status = 'pending'`,
            [currentUserId, matchedUserId, matchedUserId, currentUserId]
        );
        if (requestRows.length > 0) {
            return res.status(400).json({ success: false, error: '已經有好友請求待處理' });
        }

        // 8. 建立好友請求
        await connection.promise().query(
            'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, "pending")',
            [currentUserId, matchedUserId]
        );

        // 9. 回傳匹配到的用戶資訊
        let avatarUrl = null;
        if (matchedUser.avatar) {
            if (matchedUser.avatar.startsWith('http')) {
                avatarUrl = matchedUser.avatar;
            } else {
                const path = matchedUser.avatar.startsWith('/') ? matchedUser.avatar : '/' + matchedUser.avatar;
                avatarUrl = `${process.env.API_URL || 'http://localhost:3000'}${path}`;
            }
        }

        res.json({
            success: true,
            message: '匹配成功，好友請求已發送',
            match: {
                id: matchedUser.id.toString(),
                name: matchedUser.username,
                username: matchedUser.username,
                mbti: matchedUser.mbti || '待測',
                avatar: avatarUrl,
                reason: match.reason,
                score: match.match_score
            }
        });
    } catch (error) {
        console.error('❌ 自動匹配錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;