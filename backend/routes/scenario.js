const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');


let ExpoClass;
let expoInstance;

async function initExpo() {
    if (!ExpoClass) {
        const { Expo } = await import('expo-server-sdk');
        ExpoClass = Expo;
        expoInstance = new ExpoClass();
    }
    return expoInstance;
}

// 輔助函數
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};
const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();


async function hasActiveScenario(userId) {
    const rows = await query(
        'SELECT id FROM user_scenarios WHERE (user_id = ? OR target_user_id = ?) AND status = "active" LIMIT 1',
        [userId, userId]
    );
    return rows.length > 0;
}
async function sendPushNotification(userId, { title, body, data }) {
    const expo = await initExpo();   // ← 改這裡

    const tokens = await query('SELECT expo_push_token FROM users WHERE id = ?', [userId]);
    if (!tokens[0]?.expo_push_token) return;

    const pushToken = tokens[0].expo_push_token;
    if (!ExpoClass.isExpoPushToken(pushToken)) return;   // 注意這裡也要用 ExpoClass

    await expo.sendPushNotificationsAsync([{
        to: pushToken,
        sound: 'default',
        title,
        body,
        data
    }]);
}



async function completeScenario(scenarioId, scenarioDataRaw, userA, userB, io) {
    // 1. 解析 scenarioData
    let scenarioData = scenarioDataRaw;
    if (typeof scenarioData === 'string') {
        scenarioData = JSON.parse(scenarioData);
    }
    const keywords = scenarioData.keywords || [];

    // 2. 輸出調試信息
    console.log(`\n🔍 結算劇本 ${scenarioId}`);
    console.log(`   用戶A: ${userA} (${typeof userA})`);
    console.log(`   用戶B: ${userB} (${typeof userB})`);
    keywords.forEach((k, idx) => {
        console.log(`   關鍵字 ${idx}: "${k.word}", 監聽者=${k.listener} (${typeof k.listener}), 已完成=${k.completed}`);
    });

    // 3. 統計雙方完成數
    const userANum = Number(userA);
    const userBNum = Number(userB);
    const countA = keywords.filter(k => Number(k.listener) === userANum && k.completed === true).length;
    const countB = keywords.filter(k => Number(k.listener) === userBNum && k.completed === true).length;
    console.log(`✅ 用戶A完成數: ${countA}, 用戶B完成數: ${countB}`);

    // 4. 計算積分（先定義再使用）
    let pointsA = 0, pointsB = 0;
    if (countA === countB) {
        pointsA = pointsB = 50;
    } else if (countA > countB) {
        pointsA = 100;
        pointsB = 0;
    } else {
        pointsA = 0;
        pointsB = 100;
    }
    console.log(`📢 分配積分: 用戶A得分=${pointsA}, 用戶B得分=${pointsB}`);

    // 5. 更新積分
    if (pointsA > 0) {
        await query('UPDATE users SET points = points + ? WHERE id = ?', [pointsA, userA]);
        await query('INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "task_reward", ?)',
            [userA, pointsA, `完成劇本「${scenarioData.title}」獎勵`]);
    }
    if (pointsB > 0) {
        await query('UPDATE users SET points = points + ? WHERE id = ?', [pointsB, userB]);
        await query('INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "task_reward", ?)',
            [userB, pointsB, `完成劇本「${scenarioData.title}」獎勵`]);
    }

    // 6. 更新劇本狀態
    await query('UPDATE user_scenarios SET status = "completed", completed_at = NOW() WHERE id = ?', [scenarioId]);

    // 7. 廣播完成事件（使用 scores 對象）
    console.log(`📡 廣播 scenario-completed 到房間 scenario_${scenarioId}, 數據:`, { scenarioId, scores: { [userANum]: pointsA, [userBNum]: pointsB } });
    io.to(`scenario_${scenarioId}`).emit('scenario-completed', {
        scenarioId,
        scores: {
            [userANum]: pointsA,
            [userBNum]: pointsB
        }
    });
}





router.get('/templates', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    try {
        const templates = await query('SELECT id, title, description, cover_image, location_name, tasks FROM scenario_templates ORDER BY id ASC');
        const result = templates.map(t => {
            let tasks = t.tasks;
            if (typeof tasks === 'string') tasks = JSON.parse(tasks);
            else if (!tasks) tasks = [];
            return { ...t, tasks };
        });
        res.json({ success: true, templates: result });
    } catch (error) {
        console.error('獲取劇本模板失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});


// 獲取當前用戶正在進行的劇本（最多一個）
router.get('/active-scenario', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    try {
        const rows = await query(
            `SELECT id, user_id, target_user_id, scenario_data, status, created_at
             FROM user_scenarios
             WHERE (user_id = ? OR target_user_id = ?) AND status = 'active'
             LIMIT 1`,
            [userId, userId]
        );
        if (rows.length === 0) {
            return res.json({ success: true, hasActive: false });
        }
        const scenario = rows[0];
        let scenarioData = scenario.scenario_data;
        if (typeof scenarioData === 'string') scenarioData = JSON.parse(scenarioData);
        res.json({
            success: true,
            hasActive: true,
            scenario: {
                id: scenario.id,
                title: scenarioData.title,
                description: scenarioData.backstory,
                location_name: scenarioData.location_name,
                // 其他需要顯示的字段
            },
            createdAt: scenario.created_at
        });
    } catch (error) {
        console.error('獲取進行中劇本失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});


router.get('/template/:id', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const templateId = req.params.id;
    try {
        const rows = await query('SELECT * FROM scenario_templates WHERE id = ?', [templateId]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: '模板不存在' });
        const template = rows[0];
        let tasks = template.tasks;
        if (typeof tasks === 'string') tasks = JSON.parse(tasks);
        else if (!tasks) tasks = [];
        res.json({
            success: true,
            template: {
                id: template.id,
                title: template.title,
                description: template.description,
                location_name: template.location_name,
                tasks: tasks,
            }
        });
    } catch (error) {
        console.error('獲取模板詳情失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.get('/list', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    try {
        const rows = await query(`SELECT * FROM user_scenarios WHERE user_id = ? OR target_user_id = ? ORDER BY created_at DESC`, [userId, userId]);
        const scenarios = rows.map(row => {
            let data = row.scenario_data;
            if (typeof data === 'string') data = JSON.parse(data);
            row.scenario_data = data;
            return row;
        });
        res.json({ success: true, scenarios });
    } catch (error) {
        console.error('獲取劇本列表失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.get('/active', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const targetUserId = req.query.targetUserId;
    if (!targetUserId) return res.status(400).json({ success: false, error: '缺少targetUserId' });
    try {
        const rows = await query(`SELECT * FROM user_scenarios WHERE ((user_id = ? AND target_user_id = ?) OR (user_id = ? AND target_user_id = ?)) AND status = 'active' ORDER BY created_at DESC LIMIT 1`, [userId, targetUserId, targetUserId, userId]);
        if (rows.length === 0) return res.json({ success: true, hasActive: false });
        const scenario = rows[0];
        let scenarioData = scenario.scenario_data;
        if (typeof scenarioData === 'string') scenarioData = JSON.parse(scenarioData);
        const myCode = scenario.user_id === userId ? scenarioData.tasks.find(t => t.type === 'code_exchange')?.codes?.userA : scenarioData.tasks.find(t => t.type === 'code_exchange')?.codes?.userB;
        res.json({ success: true, hasActive: true, scenario: scenarioData, myCode, scenarioId: scenario.id });
    } catch (error) {
        console.error('獲取進行中劇本錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// ==================== 發送劇本邀請路由（已修正） ====================
router.post('/invite', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const fromUserId = req.user.id;
    const { targetUserId, templateId } = req.body;
    if (!targetUserId || !templateId) 
        return res.status(400).json({ success: false, error: '缺少必要參數' });

    try {
        // 檢查雙方是否有進行中的劇本
        if (await hasActiveScenario(fromUserId)) 
            return res.status(400).json({ success: false, error: '你已有進行中的劇本' });
        
        if (await hasActiveScenario(targetUserId)) 
            return res.status(400).json({ success: false, error: '對方已有進行中的劇本' });

        const templateRows = await query('SELECT * FROM scenario_templates WHERE id = ?', [templateId]);
        if (templateRows.length === 0) 
            return res.status(404).json({ success: false, error: '劇本模板不存在' });

        const template = templateRows[0];
        let tasks = template.tasks;
        if (typeof tasks === 'string') tasks = JSON.parse(tasks);

        let keywordWords = [];
        const otherTasks = [];
        tasks.forEach(task => {
            if (task.type === 'keywords' && task.words) keywordWords = task.words;
            else otherTasks.push(task);
        });
        if (keywordWords.length === 0) 
            keywordWords = ["我愛你", "你好", "再見", "謝謝", "對不起", "請", "好", "不好", "可以", "不可以"];

        // 隨機分配關鍵字
        const shuffled = [...keywordWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const half = Math.ceil(shuffled.length / 2);
        const keywords = shuffled.map((word, idx) => ({
            word: word,
            listener: idx < half ? fromUserId : targetUserId,
            completed: false
        }));

        const codeA = generateCode();
        const codeB = generateCode();
        const processedTasks = otherTasks.map(task => {
            if (task.desc && task.desc.includes('{my_code}')) {
                return { 
                    ...task, 
                    desc: task.desc.replace('{my_code}', `${codeA} / ${codeB}`), 
                    type: 'code_exchange', 
                    codes: { userA: codeA, userB: codeB } 
                };
            }
            return task;
        });

        const scenarioData = {
            title: template.title,
            backstory: template.description,
            roles: { A: '你', B: '對方' },
            tasks: processedTasks,
            keywords: keywords
        };

        // 儲存邀請
        const insertResult = await query(
            'INSERT INTO scenario_invites (from_user_id, to_user_id, scenario_data, status) VALUES (?, ?, ?, "pending")',
            [fromUserId, targetUserId, JSON.stringify(scenarioData)]
        );

        const inviteId = insertResult.insertId;

        // 取得發送者與接收者資訊
        const fromUserRow = await query('SELECT username FROM users WHERE id = ?', [fromUserId]);
        const fromUsername = fromUserRow[0]?.username || '一位朋友';

        const targetUserRow = await query('SELECT username FROM users WHERE id = ?', [targetUserId]);
        const targetUsername = targetUserRow[0]?.username || '對方';

        // ==================== 關鍵修正：發送 Socket 事件 ====================
        const io = req.app.get('io');
        if (io) {
            // 發送給被邀請者（targetUserId）
            io.to(`user_${targetUserId}`).emit('scenario-invite', {
                inviteId: inviteId,
                fromUserId: fromUserId,
                fromUsername: fromUsername,
                scenarioTitle: scenarioData.title,
                scenarioData: scenarioData   // 可選：如果前端需要更多資訊
            });

            console.log(`📡 [Socket] 已發送 scenario-invite 給用戶 ${targetUserId}，邀請ID: ${inviteId}`);
        } else {
            console.error('❌ io 對象未找到，無法發送 scenario-invite Socket 事件');
        }

        // 保留原本的 Push Notification（作為備用）
        await sendPushNotification(targetUserId, {
            title: '新劇本邀請',
            body: `${fromUsername} 邀請你一起玩「${scenarioData.title}」`,
            data: { 
                inviteId: inviteId, 
                type: 'scenario_invite',
                fromUsername: fromUsername,
                scenarioTitle: scenarioData.title 
            }
        });

        res.json({ 
            success: true, 
            message: '邀請已發送',
            inviteId: inviteId 
        });

    } catch (error) {
        console.error('發送邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.get('/invites/pending', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    try {
        const invites = await query(`SELECT si.*, u.username as from_username FROM scenario_invites si JOIN users u ON si.from_user_id = u.id WHERE si.to_user_id = ? AND si.status = 'pending'`, [userId]);
        invites.forEach(inv => {
            let scenarioData = inv.scenario_data;
            if (typeof scenarioData === 'string') scenarioData = JSON.parse(scenarioData);
            inv.scenario_data = scenarioData;
        });
        res.json({ success: true, invites });
    } catch (error) {
        console.error('獲取邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.post('/invite/accept', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;        // 接受者（B）
    const { inviteId } = req.body;

    try {
        // 1. 查詢邀請
        const invites = await query(
            'SELECT * FROM scenario_invites WHERE id = ? AND to_user_id = ? AND status = "pending"',
            [inviteId, userId]
        );
        if (invites.length === 0) {
            return res.status(404).json({ success: false, error: '邀請不存在或已處理' });
        }
        const invite = invites[0];

        // 2. 檢查是否已有進行中劇本
        if (await hasActiveScenario(userId)) {
            return res.status(400).json({ success: false, error: '你已有進行中的劇本' });
        }
        if (await hasActiveScenario(invite.from_user_id)) {
            return res.status(400).json({ success: false, error: '對方已有進行中的劇本' });
        }

        let scenarioData = invite.scenario_data;
        if (typeof scenarioData === 'string') {
            scenarioData = JSON.parse(scenarioData);
        }

        // 3. 建立正式劇本
        const insertResult = await query(
            'INSERT INTO user_scenarios (user_id, target_user_id, scenario_data, status) VALUES (?, ?, ?, "active")',
            [invite.from_user_id, userId, JSON.stringify(scenarioData)]
        );

        const newScenarioId = insertResult.insertId;

        const io = req.app.get('io');
        if (io) {
            // === 修正重點：發送給邀請方（A） ===
            io.to(`user_${invite.from_user_id}`).emit('scenario-started', {
                scenarioId: newScenarioId,
                fromUserId: invite.from_user_id,     // ← 關鍵：告訴 A 「我是發送方」
                fromUsername: '你',                  // A 自己看到時顯示「對方」
                scenarioTitle: scenarioData.title || '未知劇本',
                type: 'accepted'                     // 可選標記
            });

            console.log(`📡 已向邀請方 ${invite.from_user_id} 發送 scenario-started（對方已接受）`);

            // 可選：也發送給接受方（B），讓 B 直接進入
            io.to(`user_${userId}`).emit('scenario-started', {
                scenarioId: newScenarioId,
                fromUserId: invite.from_user_id,     // B 收到的 fromUserId 是 A
                scenarioTitle: scenarioData.title || '未知劇本',
            });
        }

        // 4. 更新邀請狀態
        await query('UPDATE scenario_invites SET status = "accepted" WHERE id = ?', [inviteId]);

        // 5. Push Notification（可保留）
        await sendPushNotification(invite.from_user_id, {
            title: '劇本邀請已接受',
            body: '對方已接受你的劇本邀請',
            data: { scenarioId: newScenarioId, type: 'scenario_accepted' }
        });

        res.json({ 
            success: true, 
            scenarioId: newScenarioId,
            message: '邀請接受成功'
        });

    } catch (error) {
        console.error('接受邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.post('/invite/reject', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { inviteId } = req.body;
    try {
        await query('UPDATE scenario_invites SET status = "rejected" WHERE id = ? AND to_user_id = ?', [inviteId, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('拒絕邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.post('/leave', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { scenarioId } = req.body;
    try {
        const rows = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = rows[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) return res.status(403).json({ success: false, error: '無權操作' });
        if (scenario.status !== 'active') return res.json({ success: true, message: '劇本已結束' });

        await query('UPDATE user_scenarios SET status = "expired" WHERE id = ?', [scenarioId]);
        const io = req.app.get('io');
        io.to(`scenario_${scenarioId}`).emit('scenario-aborted', { scenarioId });
        res.json({ success: true, message: '已離開劇本' });
    } catch (error) {
        console.error('離開劇本失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.post('/complete', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { scenarioId } = req.body;
    try {
        const rows = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = rows[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) return res.status(403).json({ success: false, error: '無權操作' });
        if (scenario.status !== 'active') return res.json({ success: true, message: '劇本已結束' });



        await completeScenario(scenarioId, scenario.scenario_data, scenario.user_id, scenario.target_user_id, req.app.get('io'));
        res.json({ success: true, message: '劇本完成' });



    } catch (error) {
        console.error('完成劇本失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});




router.post('/end', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { scenarioId } = req.body;
    if (!scenarioId) return res.status(400).json({ success: false, error: '缺少劇本ID' });
    try {
        const rows = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = rows[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) return res.status(403).json({ success: false, error: '無權操作' });
        if (scenario.status !== 'active') return res.json({ success: true, message: '劇本已結束' });

        const io = req.app.get('io');
        console.log('🔍 /end 路由中獲取的 io:', io ? '存在' : '不存在');
        await completeScenario(scenarioId, scenario.scenario_data, scenario.user_id, scenario.target_user_id, io); res.json({ success: true, message: '劇本已結束' });
    } catch (error) {
        console.error('手動結束劇本失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});


router.post('/complete-keyword', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { scenarioId, keywordIndex } = req.body;
    console.log(`🔵 收到標記請求: scenarioId=${scenarioId}, keywordIndex=${keywordIndex}, userId=${userId}`);

    try {
        const rows = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = rows[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) return res.status(403).json({ success: false, error: '無權操作' });

        let scenarioData = scenario.scenario_data;
        if (typeof scenarioData === 'string') scenarioData = JSON.parse(scenarioData);
        const keywords = scenarioData.keywords;
        if (!keywords || keywordIndex >= keywords.length) return res.status(400).json({ success: false, error: '關鍵字不存在' });
        const keyword = keywords[keywordIndex];
        if (keyword.listener !== userId) return res.status(403).json({ success: false, error: '此關鍵字不是由你監聽' });
        if (keyword.completed) return res.status(400).json({ success: false, error: '此關鍵字已完成' });

        keyword.completed = true;
        scenarioData.keywords = keywords;
        await query('UPDATE user_scenarios SET scenario_data = ? WHERE id = ?', [JSON.stringify(scenarioData), scenarioId]);

        const allCompleted = keywords.every(k => k.completed);
        if (allCompleted) {
            await completeScenario(scenarioId, scenarioData, scenario.user_id, scenario.target_user_id, req.app.get('io'));
        }


        // 更新後
        const check = await query('SELECT scenario_data FROM user_scenarios WHERE id = ?', [scenarioId]);
        console.log('更新後的 scenario_data:', check[0].scenario_data);

        console.log(`✅ 關鍵字 ${keywordIndex} 標記完成，當前完成數: ${keywords.filter(k => k.completed).length}`);

        const io = req.app.get('io');
        io.to(`scenario_${scenarioId}`).emit('keyword-completed', { scenarioId, keywordIndex, userId });
        res.json({ success: true, message: '關鍵字已標記' });

    } catch (error) {
        console.error('標記關鍵字失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

router.get('/:id', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const scenarioId = req.params.id;
    try {
        const rows = await query('SELECT * FROM user_scenarios WHERE id = ?', [scenarioId]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: '劇本不存在' });
        const scenario = rows[0];
        if (scenario.user_id !== userId && scenario.target_user_id !== userId) return res.status(403).json({ success: false, error: '無權訪問' });

        let scenarioData = scenario.scenario_data;
        if (typeof scenarioData === 'string') scenarioData = JSON.parse(scenarioData);
        scenario.scenario_data = scenarioData;

        const verifications = await query('SELECT task_index, user_id, type FROM task_verifications WHERE scenario_id = ?', [scenarioId]);
        if (scenario.scenario_data.tasks) {
            scenario.scenario_data.tasks = scenario.scenario_data.tasks.map((task, index) => {
                const taskVerifications = verifications.filter(v => v.task_index === index);
                const gpsUsers = taskVerifications.filter(v => v.type === 'gps').map(v => v.user_id);
                const codeUsers = taskVerifications.filter(v => v.type === 'code_exchange').map(v => v.user_id);
                return { ...task, verifications: { gps: gpsUsers, code: codeUsers } };
            });
        }

        let myCode = '';
        const codeTask = scenario.scenario_data.tasks?.find(t => t.codes);
        if (codeTask) myCode = scenario.user_id === userId ? codeTask.codes.userA : codeTask.codes.userB;

        res.json({
            success: true,
            scenario: scenario.scenario_data,
            myCode,
            status: scenario.status,
            user_id: scenario.user_id,
            target_user_id: scenario.target_user_id,
            created_at: scenario.created_at
        });
    } catch (error) {
        console.error('獲取劇本詳情錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;