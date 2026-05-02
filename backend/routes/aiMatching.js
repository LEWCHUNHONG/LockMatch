// routes/aiMatching.js
const express = require('express');
const router = express.Router();
require('dotenv').config();

const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');
const { initDeepSeekAI } = require('../config/deepseekAI');

const deepseekAI = initDeepSeekAI();

// 匹配多個用戶 (用於推薦列表)
router.post('/matching', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    try {
        const currentUserId = req.user.id;

        const [currentUserRows] = await connection.promise().query(
            'SELECT username, mbti, bio FROM users WHERE id = ?',
            [currentUserId]
        );
        if (currentUserRows.length === 0) {
            return res.status(404).json({ success: false, error: '用戶不存在' });
        }
        const currentUser = currentUserRows[0];

        const [otherUsers] = await connection.promise().query(
            'SELECT id, username, mbti, bio, avatar FROM users WHERE id != ?',
            [currentUserId]
        );

        if (otherUsers.length === 0) {
            return res.json({ success: true, users: [] });
        }

        // 限制用戶數量以節省 Token
        let usersToSend = otherUsers;
        if (otherUsers.length > 10) {
            usersToSend = otherUsers.sort(() => 0.5 - Math.random()).slice(0, 10);
            console.log(`⚠️ 用戶過多，隨機選取 10 個進行 AI 匹配`);
        }

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

請根據 MBTI 相容性與自我介紹內容，推薦最匹配的 5 位用戶。
**重要規則**：全部使用繁體中文思考，只回傳 JSON 格式，不要包含任何其他文字、註解或 Markdown。
格式如下：
{
  "matches": [
    { "user_id": 數字, "reason": "匹配原因", "match_score": 分數(0-100) },
    ...
  ]
}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '請推薦最匹配的 5 位用戶。' }
        ];

        let matches = [];

        try {
            console.log('🔍 呼叫 DeepSeek 進行匹配...');
            const result = await deepseekAI.invoke(messages, {
                thinking: { type: "enabled" },
                temperature: 0.5
            });
            const aiResponse = result.content;
            console.log('🤖 DeepSeek 原始回應:', aiResponse);

            if (aiResponse && aiResponse.trim()) {
                try {
                    const parsed = JSON.parse(aiResponse);
                    matches = parsed.matches || [];
                } catch (parseError) {
                    console.error('❌ JSON 解析失敗:', parseError.message);
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
            console.error('❌ DeepSeek 呼叫失敗:', aiError.message);
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

        // 8. 過濾 matches
        let filteredMatches = matches.filter(m => {
            return !friendIds.has(m.user_id) &&
                !sentRequestIds.has(m.user_id) &&
                !receivedRequestIds.has(m.user_id);
        });

        // 9. 補充隨機新朋友
        const MIN_MATCHES = 2;
        if (filteredMatches.length < MIN_MATCHES) {
            const existingMatchIds = new Set(filteredMatches.map(m => m.user_id));
            const availableUsers = otherUsers.filter(u => {
                return !friendIds.has(u.id) &&
                    !sentRequestIds.has(u.id) &&
                    !receivedRequestIds.has(u.id) &&
                    !existingMatchIds.has(u.id);
            });

            const shuffledAvailable = [...availableUsers].sort(() => 0.5 - Math.random());
            const needed = MIN_MATCHES - filteredMatches.length;
            const toAdd = shuffledAvailable.slice(0, needed);

            const additionalMatches = toAdd.map(user => ({
                user_id: user.id,
                reason: '系統推薦的新朋友',
                match_score: 50
            }));

            filteredMatches = [...filteredMatches, ...additionalMatches];
        }

        matches = filteredMatches;

        // 10. 過濾有效用戶
        const matchUserIds = matches.map(m => m.user_id);
        const [validUsers] = await connection.promise().query(
            'SELECT id FROM users WHERE id IN (?)',
            [matchUserIds.length ? matchUserIds : [0]]
        );
        const validIds = new Set(validUsers.map(u => u.id));
        matches = matches.filter(m => validIds.has(m.user_id));

        // 11. 組合最終資料
        const users = matches.map(match => {
            const user = otherUsers.find(u => u.id === match.user_id);
            if (!user) return null;

            let avatarUrl = null;
            if (user.avatar) {
                if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
                    avatarUrl = user.avatar;
                } else {
                    const path = user.avatar.startsWith('/') ? user.avatar : '/' + user.avatar;
                    avatarUrl = `${process.env.BASE_URL}${path}`;
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

        const [currentUserRows] = await connection.promise().query(
            'SELECT username, mbti, bio FROM users WHERE id = ?',
            [currentUserId]
        );
        if (currentUserRows.length === 0) {
            return res.status(404).json({ success: false, error: '用戶不存在' });
        }
        const currentUser = currentUserRows[0];

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

        let usersToSend = otherUsers;
        if (otherUsers.length > 10) {
            usersToSend = otherUsers.sort(() => 0.5 - Math.random()).slice(0, 10);
        }

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

請根據 MBTI 相容性與自我介紹內容，推薦**最匹配的一位用戶**。
**重要規則**：全部使用繁體中文思考，只回傳 JSON 格式，不要包含任何其他文字。
格式如下：
{
  "user_id": 數字,
  "reason": "匹配原因",
  "match_score": 分數(0-100)
}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '請推薦最匹配的一位用戶。' }
        ];

        let match = null;

        try {
            console.log('🔍 呼叫 DeepSeek 進行自動匹配...');
            const result = await deepseekAI.invoke(messages, {
                thinking: { type: "enabled" },
                temperature: 0.5
            });
            const aiResponse = result.content;
            console.log('🤖 DeepSeek 自動匹配回應:', aiResponse);

            if (aiResponse && aiResponse.trim()) {
                try {
                    const parsed = JSON.parse(aiResponse);
                    match = parsed;
                } catch (parseError) {
                    console.error('❌ JSON 解析失敗:', parseError.message);
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        match = JSON.parse(jsonMatch[0]);
                    }
                }
            }
        } catch (aiError) {
            console.error('❌ DeepSeek 呼叫失敗:', aiError.message);
        }

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

        const [friendRows] = await connection.promise().query(
            `SELECT id FROM friendships 
             WHERE (user1_id = ? AND user2_id = ? AND status = 'accepted')
                OR (user1_id = ? AND user2_id = ? AND status = 'accepted')`,
            [currentUserId, matchedUserId, matchedUserId, currentUserId]
        );
        if (friendRows.length > 0) {
            return res.status(400).json({ success: false, error: '你們已經是好友了' });
        }

        const [requestRows] = await connection.promise().query(
            `SELECT id FROM friend_requests 
             WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
               AND status = 'pending'`,
            [currentUserId, matchedUserId, matchedUserId, currentUserId]
        );
        if (requestRows.length > 0) {
            return res.status(400).json({ success: false, error: '已經有好友請求待處理' });
        }

        await connection.promise().query(
            'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, "pending")',
            [currentUserId, matchedUserId]
        );

        let avatarUrl = null;
        if (matchedUser.avatar) {
            if (matchedUser.avatar.startsWith('http')) {
                avatarUrl = matchedUser.avatar;
            } else {
                const path = matchedUser.avatar.startsWith('/') ? matchedUser.avatar : '/' + matchedUser.avatar;
                avatarUrl = `${process.env.BASE_URL}${path}`;
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