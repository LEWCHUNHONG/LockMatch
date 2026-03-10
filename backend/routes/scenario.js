// routes/scenario.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');
const OpenAI = require('openai');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

const openai = new OpenAI({
    baseURL: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY
});

// ------------------------------
//  Helper functions
// ------------------------------
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

// Haversine formula to calculate distance in meters
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


// 檢查用戶是否完成特定驗證
async function checkUserTaskVerification(scenarioId, taskIndex, userId, type) {
    const rows = await query(
        'SELECT id FROM task_verifications WHERE scenario_id = ? AND task_index = ? AND user_id = ? AND type = ?',
        [scenarioId, taskIndex, userId, type]
    );
    return rows.length > 0;
}

// 檢查雙方是否都完成特定驗證
async function checkBothVerification(scenarioId, taskIndex, type) {
    const rows = await query(
        'SELECT COUNT(DISTINCT user_id) as cnt FROM task_verifications WHERE scenario_id = ? AND task_index = ? AND type = ?',
        [scenarioId, taskIndex, type]
    );
    return rows[0].cnt === 2;
}

// 檢查雙方是否都已確認
async function checkBothConfirmed(scenarioId, taskIndex) {
    const rows = await query(
        'SELECT COUNT(DISTINCT user_id) as cnt FROM task_confirmations WHERE scenario_id = ? AND task_index = ? AND confirmed = TRUE',
        [scenarioId, taskIndex]
    );
    return rows[0].cnt === 2;
}

// 標記任務完成（發放積分）
async function markTaskCompleted(scenarioId, taskIndex) {
    const scenarioRows = await query('SELECT user_id, target_user_id FROM user_scenarios WHERE id = ?', [scenarioId]);
    if (scenarioRows.length === 0) return;
    const { user_id: userA, target_user_id: userB } = scenarioRows[0];

    // 假設每個任務獎勵 50 分
    const reward = 50;
    await query('UPDATE users SET points = points + ? WHERE id IN (?, ?)', [reward, userA, userB]);
    await query(
        'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "task_reward", ?), (?, ?, "task_reward", ?)',
        [userA, reward, `完成劇本任務 ${taskIndex + 1}`, userB, reward, `完成劇本任務 ${taskIndex + 1}`]
    );

    // 更新 user_scenarios 中的任務狀態（可選）
    const scenario = await query('SELECT scenario_data FROM user_scenarios WHERE id = ?', [scenarioId]);
    const scenarioData = JSON.parse(scenario[0].scenario_data);
    if (!scenarioData.tasks_status) scenarioData.tasks_status = [];
    scenarioData.tasks_status[taskIndex] = 'completed';
    await query('UPDATE user_scenarios SET scenario_data = ? WHERE id = ?', [JSON.stringify(scenarioData), scenarioId]);
}


// Mark a task as completed and reward points
async function markTaskCompleted(scenarioId, taskIndex) {
    const scenarioRows = await query('SELECT user_id, target_user_id FROM user_scenarios WHERE id = ?', [scenarioId]);
    if (scenarioRows.length === 0) return;
    const { user_id: userA, target_user_id: userB } = scenarioRows[0];

    // 假設每個任務獎勵 50 分
    const reward = 50;
    await query('UPDATE users SET points = points + ? WHERE id IN (?, ?)', [reward, userA, userB]);
    await query(
        'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "task_reward", ?), (?, ?, "task_reward", ?)',
        [userA, reward, `完成劇本任務 ${taskIndex + 1}`, userB, reward, `完成劇本任務 ${taskIndex + 1}`]
    );

    // 更新 user_scenarios 中的任務狀態（可選）
    const scenario = await query('SELECT scenario_data FROM user_scenarios WHERE id = ?', [scenarioId]);
    const scenarioData = JSON.parse(scenario[0].scenario_data);
    if (!scenarioData.tasks_status) scenarioData.tasks_status = [];
    scenarioData.tasks_status[taskIndex] = 'completed';
    await query('UPDATE user_scenarios SET scenario_data = ? WHERE id = ?', [JSON.stringify(scenarioData), scenarioId]);
}

// Send push notification
async function sendPushNotification(userId, { title, body, data }) {
    const tokens = await query('SELECT expo_push_token FROM users WHERE id = ?', [userId]);
    if (!tokens[0]?.expo_push_token) return;
    const pushToken = tokens[0].expo_push_token;
    if (!Expo.isExpoPushToken(pushToken)) return;
    await expo.sendPushNotificationsAsync([{
        to: pushToken,
        sound: 'default',
        title,
        body,
        data
    }]);
}

// ------------------------------
//  AI Scenario Generation
// ------------------------------
async function getScenarioFromAI(userA, userB, codeA, codeB) {
    const systemPrompt = `你係一個約會劇本設計師。請根據以下兩位用戶嘅資料，創作一個有趣嘅「角色扮演約會劇本」，主題圍繞「卧底/特工/冒險」等。劇本需要包括：
1. 一個吸引嘅背景故事。
2. 為每人分配一個角色。
3. 列出 3 至 5 個具體任務，要喺約會過程中完成。任務應該循序漸進。
4. 任務要適合兩個人嘅MBTI性格。
5. 用廣東話寫，語氣輕鬆有趣。
6. 對於暗號交換任務，請喺描述中使用 {my_code} 標記，系統會自動替換成真實暗號。

用戶資料：
- 用戶A（發起人）：用戶名 ${userA.username}，MBTI ${userA.mbti || '未知'}，自我介紹 ${userA.bio || '無'}
- 用戶B（對象）：用戶名 ${userB.username}，MBTI ${userB.mbti || '未知'}，自我介紹 ${userB.bio || '無'}

請以JSON格式輸出，包含以下字段：
{
  "title": "劇本標題",
  "backstory": "背景故事",
  "roles": {
    "A": "角色A描述",
    "B": "角色B描述"
  },
  "tasks": [
    { "description": "任務一描述", "type": "normal" },
    { "description": "任務二描述（請用{my_code}標記暗號位置）", "type": "code_exchange" },
    ...
  ]
}`;

    const completion = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '請生成一個劇本' }
        ],
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        max_tokens: 1500,
        temperature: 0.8,
        response_format: { type: 'json_object' }
    });

    const scenarioData = JSON.parse(completion.choices[0].message.content);

    // Post-process tasks: inject codes, set requiresGps flag
    const tasks = scenarioData.tasks.map(task => {
        let newTask = { ...task };
        if (task.description.includes('到達') || task.description.includes('地點')) {
            newTask.requiresGps = true;
        } else {
            newTask.requiresGps = false;
        }
        if (task.description.includes('{my_code}')) {
            newTask.type = 'code_exchange';
            newTask.codes = { userA: codeA, userB: codeB };
            newTask.status = { userA_completed: false, userB_completed: false };
        }
        return newTask;
    });
    scenarioData.tasks = tasks;
    return scenarioData;
}

// ------------------------------
//  Invitation endpoints
// ------------------------------
router.post('/invite', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const fromUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
        return res.status(400).json({ success: false, error: '請指定對象' });
    }

    try {
        const userRows = await query('SELECT points FROM users WHERE id = ?', [fromUserId]);
        if (userRows[0].points < 300) {
            return res.status(400).json({ success: false, error: '積分不足' });
        }

        const [userA, userB] = await Promise.all([
            query('SELECT username, mbti, bio FROM users WHERE id = ?', [fromUserId]).then(r => r[0]),
            query('SELECT username, mbti, bio FROM users WHERE id = ?', [targetUserId]).then(r => r[0])
        ]);

        const codeA = generateCode();
        const codeB = generateCode();

        const scenarioData = await getScenarioFromAI(userA, userB, codeA, codeB);

        await query('UPDATE users SET points = points - 300 WHERE id = ?', [fromUserId]);
        await query(
            'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "scenario_invite", ?)',
            [fromUserId, -300, `發送劇本邀請給 ${userB.username}`]
        );

        const insertResult = await query(
            'INSERT INTO scenario_invites (from_user_id, to_user_id, scenario_data, status) VALUES (?, ?, ?, "pending")',
            [fromUserId, targetUserId, JSON.stringify(scenarioData)]
        );

        await sendPushNotification(targetUserId, {
            title: '新劇本邀請',
            body: `${userA.username} 邀請你一齊玩劇本「${scenarioData.title}」`,
            data: { inviteId: insertResult.insertId, type: 'scenario_invite' }
        });

        res.json({ success: true, message: '邀請已發送' });
    } catch (error) {
        console.error('發送邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.get('/invites/pending', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    try {
        const invites = await query(
            `SELECT si.*, u.username as from_username 
             FROM scenario_invites si
             JOIN users u ON si.from_user_id = u.id
             WHERE si.to_user_id = ? AND si.status = 'pending'`,
            [userId]
        );
        invites.forEach(inv => inv.scenario_data = JSON.parse(inv.scenario_data));
        res.json({ success: true, invites });
    } catch (error) {
        console.error('獲取邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.post('/invite/accept', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { inviteId } = req.body;

    try {
        const invites = await query(
            'SELECT * FROM scenario_invites WHERE id = ? AND to_user_id = ? AND status = "pending"',
            [inviteId, userId]
        );
        if (invites.length === 0) {
            return res.status(404).json({ success: false, error: '邀請不存在或已處理' });
        }
        const invite = invites[0];

        const insertResult = await query(
            'INSERT INTO user_scenarios (user_id, target_user_id, scenario_data, status) VALUES (?, ?, ?, "active")',
            [invite.from_user_id, userId, invite.scenario_data]
        );

        await query('UPDATE scenario_invites SET status = "accepted" WHERE id = ?', [inviteId]);

        await sendPushNotification(invite.from_user_id, {
            title: '邀請已接受',
            body: '對方已接受你的劇本邀請',
            data: { scenarioId: insertResult.insertId, type: 'scenario_accepted' }
        });

        res.json({ success: true, scenarioId: insertResult.insertId });
    } catch (error) {
        console.error('接受邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.post('/invite/reject', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { inviteId } = req.body;

    try {
        await query(
            'UPDATE scenario_invites SET status = "rejected" WHERE id = ? AND to_user_id = ?',
            [inviteId, userId]
        );
        // Optionally refund points to from_user (if you want)
        res.json({ success: true });
    } catch (error) {
        console.error('拒絕邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// ------------------------------
//  Unlock scenario (direct purchase)
// ------------------------------
router.post('/unlock', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { targetUserId, interests = [] } = req.body;

    if (!targetUserId) {
        return res.status(400).json({ success: false, error: '請指定約會對象' });
    }

    try {
        const userRows = await query('SELECT points FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ success: false, error: '用戶不存在' });
        const userPoints = userRows[0].points;
        const COST = 500;
        if (userPoints < COST) {
            return res.status(400).json({ success: false, error: '積分不足' });
        }

        const [userA, userB] = await Promise.all([
            query('SELECT username, mbti, bio FROM users WHERE id = ?', [userId]).then(r => r[0]),
            query('SELECT username, mbti, bio FROM users WHERE id = ?', [targetUserId]).then(r => r[0])
        ]);

        if (!userB) return res.status(404).json({ success: false, error: '對象用戶不存在' });

        const codeA = generateCode();
        const codeB = generateCode();

        const scenarioData = await getScenarioFromAI(userA, userB, codeA, codeB);

        await query('UPDATE users SET points = points - ? WHERE id = ?', [COST, userId]);
        await query(
            'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "scenario_unlock", ?)',
            [userId, -COST, `解鎖同 ${userB.username} 嘅劇本「${scenarioData.title}」`]
        );

        const insertResult = await query(
            'INSERT INTO user_scenarios (user_id, target_user_id, scenario_data) VALUES (?, ?, ?)',
            [userId, targetUserId, JSON.stringify(scenarioData)]
        );

        const scenarioId = insertResult.insertId;

        res.json({
            success: true,
            scenarioId,
            scenario: scenarioData,
            myCode: codeA,
            targetCode: codeB
        });
    } catch (error) {
        console.error('解鎖劇本錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// ------------------------------
//  Get active scenario with a user
// ------------------------------
router.get('/active', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const targetUserId = req.query.targetUserId;

    if (!targetUserId) {
        return res.status(400).json({ success: false, error: '缺少targetUserId' });
    }

    try {
        const rows = await query(
            `SELECT * FROM user_scenarios 
             WHERE ((user_id = ? AND target_user_id = ?) OR (user_id = ? AND target_user_id = ?)) 
               AND status = 'active'
             ORDER BY created_at DESC LIMIT 1`,
            [userId, targetUserId, targetUserId, userId]
        );

        if (rows.length === 0) {
            return res.json({ success: true, hasActive: false });
        }

        const scenario = rows[0];
        scenario.scenario_data = JSON.parse(scenario.scenario_data);

        const myCode = scenario.user_id === userId
            ? scenario.scenario_data.tasks.find(t => t.type === 'code_exchange')?.codes?.userA
            : scenario.scenario_data.tasks.find(t => t.type === 'code_exchange')?.codes?.userB;

        res.json({
            success: true,
            hasActive: true,
            scenario: scenario.scenario_data,
            myCode,
            scenarioId: scenario.id
        });
    } catch (error) {
        console.error('獲取進行中劇本錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// ------------------------------
//  Get scenario details
// ------------------------------
router.get('/:id', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const scenarioId = req.params.id;

    try {
        const rows = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = rows[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) {
            return res.status(403).json({ success: false, error: '無權訪問' });
        }

        scenario.scenario_data = JSON.parse(scenario.scenario_data);

        const verifications = await query(
            'SELECT task_index, user_id, type FROM task_verifications WHERE scenario_id = ?',
            [scenarioId]
        );

        scenario.scenario_data.tasks = scenario.scenario_data.tasks.map((task, index) => {
            const taskVerifications = verifications.filter(v => v.task_index === index);
            const gpsUsers = taskVerifications.filter(v => v.type === 'gps').map(v => v.user_id);
            const codeUsers = taskVerifications.filter(v => v.type === 'code_exchange').map(v => v.user_id);
            return {
                ...task,
                verifications: { gps: gpsUsers, code: codeUsers }
            };
        });

        const myCode = scenario.user_id === userId
            ? scenario.scenario_data.tasks.find(t => t.codes)?.codes?.userA
            : scenario.scenario_data.tasks.find(t => t.codes)?.codes?.userB;

        res.json({
            success: true,
            scenario: scenario.scenario_data,
            myCode,
            status: scenario.status,
            user_id: scenario.user_id,
            target_user_id: scenario.target_user_id
        });
    } catch (error) {
        console.error('獲取劇本詳情錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// ------------------------------
//  List all scenarios of current user
// ------------------------------
router.get('/list', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    try {
        const rows = await query(
            `SELECT * FROM user_scenarios 
             WHERE user_id = ? OR target_user_id = ?
             ORDER BY created_at DESC`,
            [userId, userId]
        );
        const scenarios = rows.map(row => {
            row.scenario_data = JSON.parse(row.scenario_data);
            return row;
        });
        res.json({ success: true, scenarios });
    } catch (error) {
        console.error('獲取劇本列表失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// ------------------------------
//  GPS Check‑in (with anti‑fraud)
// ------------------------------
// POST /api/scenario/gps-checkin
router.post('/gps-checkin', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { scenarioId, taskIndex, latitude, longitude, accuracy, clientTime, mocked } = req.body;

    if (!scenarioId || taskIndex === undefined || !latitude || !longitude) {
        return res.status(400).json({ success: false, error: '缺少必要參數' });
    }

    try {
        // 1. 驗證劇本同用戶權限
        const scenarios = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (scenarios.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = scenarios[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) {
            return res.status(403).json({ success: false, error: '無權操作' });
        }

        // 2. 獲取任務定義（從 scenario_data）
        const scenarioData = JSON.parse(scenario.scenario_data);
        const task = scenarioData.tasks[taskIndex];
        if (!task) return res.status(400).json({ success: false, error: '任務不存在' });

        // 如果任務需要 GPS，但冇 location 定義，可以拒絕（可選）
        if (!task.location) {
            return res.status(400).json({ success: false, error: '此任務唔需要打卡' });
        }

        // 3. 時間驗證（防止手機時間被篡改）
        const serverTime = Date.now();
        const clientTimeMs = clientTime ? new Date(clientTime).getTime() : serverTime;
        if (Math.abs(serverTime - clientTimeMs) > 5 * 60 * 1000) { // 允許5分鐘誤差
            return res.status(400).json({ success: false, error: '設備時間異常，請校正時間' });
        }

        // 4. 精度驗證（如果精度 > 100 米，可能信號差）
        if (accuracy && accuracy > 100) {
            return res.status(400).json({ success: false, error: 'GPS信號太弱，請到空曠地方再試' });
        }

        // 5. 模擬位置檢測（Android）
        if (mocked === true) {
            return res.status(400).json({ success: false, error: '檢測到模擬位置，無法打卡' });
        }

        // 6. 距離計算
        const targetLat = task.location.lat;
        const targetLng = task.location.lng;
        const radius = task.location.radius || 100; // 預設半徑100米
        const distance = haversine(targetLat, targetLng, latitude, longitude);
        if (distance > radius) {
            return res.status(400).json({ success: false, error: `位置不符，距離目標 ${Math.round(distance)} 米` });
        }

        // 7. 檢查是否已經打卡
        const existing = await query(
            'SELECT id FROM task_verifications WHERE scenario_id = ? AND task_index = ? AND user_id = ? AND type = "gps"',
            [scenarioId, taskIndex, userId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: '你已經打過卡' });
        }

        // 8. 記錄打卡
        const locationData = { latitude, longitude, accuracy, clientTime, serverTime };
        await query(
            'INSERT INTO task_verifications (scenario_id, task_index, user_id, type, data) VALUES (?, ?, ?, "gps", ?)',
            [scenarioId, taskIndex, userId, JSON.stringify(locationData)]
        );

        // 9. 可選：檢查雙方是否都已完成 GPS 打卡，如果完成可以發送推送
        const bothGps = await checkBothVerification(scenarioId, taskIndex, 'gps');
        if (bothGps) {
            // 發送推送通知俾雙方（可選）
            // 可以用 socket 或者推送
        }

        res.json({ success: true, message: '打卡成功' });
    } catch (error) {
        console.error('GPS 打卡失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// ------------------------------
//  Verify code exchange
// ------------------------------
// POST /api/scenario/verify-code
router.post('/verify-code', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { scenarioId, taskIndex, code } = req.body;

    try {
        const scenarios = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (scenarios.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = scenarios[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) {
            return res.status(403).json({ success: false, error: '無權操作' });
        }

        const scenarioData = JSON.parse(scenario.scenario_data);
        const task = scenarioData.tasks[taskIndex];
        if (!task || task.type !== 'code_exchange') {
            return res.status(400).json({ success: false, error: '此任務唔係暗號交換' });
        }

        // 獲取當前用戶應有嘅暗號
        const correctCode = scenario.user_id === userId ? task.codes.userA : task.codes.userB;
        if (code !== correctCode) {
            return res.status(400).json({ success: false, error: '暗號錯誤' });
        }

        // 檢查是否已驗證過
        const existing = await query(
            'SELECT id FROM task_verifications WHERE scenario_id = ? AND task_index = ? AND user_id = ? AND type = "code_exchange"',
            [scenarioId, taskIndex, userId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: '你已經驗證過暗號' });
        }

        await query(
            'INSERT INTO task_verifications (scenario_id, task_index, user_id, type, data) VALUES (?, ?, ?, "code_exchange", ?)',
            [scenarioId, taskIndex, userId, JSON.stringify({ code })]
        );

        res.json({ success: true, message: '暗號驗證成功' });
    } catch (error) {
        console.error('暗號驗證失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// ------------------------------
//  Confirm task completion
// ------------------------------
// POST /api/scenario/confirm-task
router.post('/confirm-task', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { scenarioId, taskIndex } = req.body;

    try {
        const scenarios = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (scenarios.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = scenarios[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) {
            return res.status(403).json({ success: false, error: '無權操作' });
        }

        // 可選：檢查必要驗證是否已完成（例如 GPS 打卡、暗號驗證）
        // 如果想強制必須先完成驗證先可以確認，可以加呢度
        // const gpsDone = await checkUserTaskVerification(scenarioId, taskIndex, userId, 'gps');
        // if (!gpsDone) return res.status(400).json({ success: false, error: '請先完成 GPS 打卡' });

        // 檢查是否已確認過
        const existing = await query(
            'SELECT id FROM task_confirmations WHERE scenario_id = ? AND task_index = ? AND user_id = ?',
            [scenarioId, taskIndex, userId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: '你已經確認過此任務' });
        }

        await query(
            'INSERT INTO task_confirmations (scenario_id, task_index, user_id, confirmed, confirmed_at) VALUES (?, ?, ?, TRUE, NOW())',
            [scenarioId, taskIndex, userId]
        );

        // 檢查雙方是否都已確認
        const bothConfirmed = await checkBothConfirmed(scenarioId, taskIndex);
        if (bothConfirmed) {
            // 任務完成，發放獎勵
            await markTaskCompleted(scenarioId, taskIndex);
            // 可選：發送推送通知
        }

        res.json({ success: true, message: '確認成功' });
    } catch (error) {
        console.error('確認任務失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;