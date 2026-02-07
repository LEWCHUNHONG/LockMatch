// routes/rewards.js
const express = require('express');
const router = express.Router();

module.exports = (connection, authMiddleware, JWT_SECRET) => {
    // ==================== 任務檢查和完成邏輯 ====================
    async function checkAndCompleteTask(userId, taskTitle) {
        try {
            // 1. 查找任務
            const [taskResults] = await connection.promise().query(
                'SELECT * FROM tasks WHERE title = ? AND is_active = 1',
                [taskTitle]
            );
            
            if (taskResults.length === 0) {
                console.log(`任務不存在: ${taskTitle}`);
                return { success: false, message: '任務不存在' };
            }
            
            const task = taskResults[0];
            const taskId = task.id;
            
            // 2. 檢查任務是否已經完成
            const [userTaskResults] = await connection.promise().query(
                'SELECT * FROM user_tasks WHERE user_id = ? AND task_id = ?',
                [userId, taskId]
            );
            
            // 對於每日任務，檢查今天是否已完成
            if (task.task_type === 'daily') {
                const today = new Date().toISOString().split('T')[0];
                const [todayTask] = await connection.promise().query(
                    `SELECT * FROM user_tasks 
                     WHERE user_id = ? AND task_id = ? 
                     AND DATE(completed_at) = ?`,
                    [userId, taskId, today]
                );
                
                if (todayTask.length > 0 && todayTask[0].user_status === 'completed') {
                    return { 
                        success: false, 
                        message: '今日任務已完成',
                        daily_completed: true 
                    };
                }
            } else {
                // 非每日任務的完成檢查
                if (userTaskResults.length > 0 && userTaskResults[0].user_status === 'completed') {
                    return { success: false, message: '任務已完成' };
                }
            }
            
            // 3. 檢查任務完成條件
            let isCompleted = false;
            let currentProgress = 0;
            let message = '任務進行中';
            
            switch (taskTitle) {
                case '上傳頭像':
                    const [userResults] = await connection.promise().query(
                        'SELECT avatar FROM users WHERE id = ?',
                        [userId]
                    );
                    if (userResults.length > 0) {
                        const user = userResults[0];
                        isCompleted = user.avatar && 
                                    !user.avatar.includes('default.png') && 
                                    user.avatar !== null;
                        currentProgress = isCompleted ? 1 : 0;
                        message = isCompleted ? '已上傳頭像' : '尚未上傳頭像';
                    }
                    break;
                    
                case '參與群聊':
                    const [groupMsgResults] = await connection.promise().query(
                        'SELECT COUNT(*) as count FROM messages WHERE sender_id = ?',
                        [userId]
                    );
                    if (groupMsgResults.length > 0) {
                        const count = groupMsgResults[0].count;
                        currentProgress = count;
                        isCompleted = count >= 5;
                        message = isCompleted ? `已發送 ${count} 條訊息` : `已發送 ${count}/5 條訊息`;
                    }
                    break;
                    
                case '每日發送5條訊息':
                    const today = new Date().toISOString().split('T')[0];
                    const [msgCountResults] = await connection.promise().query(
                        'SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND DATE(created_at) = ?',
                        [userId, today]
                    );
                    if (msgCountResults.length > 0) {
                        const count = msgCountResults[0].count;
                        currentProgress = count;
                        isCompleted = count >= 5;
                        message = isCompleted ? `今日已發送 ${count} 條訊息` : `今日已發送 ${count}/5 條訊息`;
                    }
                    break;
                    
                case '完成MBTI測試':
                case '完成MBTI測驗':
                    const [mbtiResults] = await connection.promise().query(
                        'SELECT mbti FROM users WHERE id = ?',
                        [userId]
                    );
                    if (mbtiResults.length > 0) {
                        const mbti = mbtiResults[0].mbti;
                        const isValidMbti = mbti !== null && mbti !== '' && /^[IE][SN][TF][JP]$/.test(mbti);
                        isCompleted = isValidMbti;
                        currentProgress = isCompleted ? 1 : 0;
                        message = isCompleted ? `MBTI類型: ${mbti}` : '尚未完成MBTI測試';
                    }
                    break;
                    
                case '每日完成MBTI測驗一次':
                    const todayDate = new Date().toISOString().split('T')[0];
                    // 改為檢查 mbti_history 表
                    const [dailyMbtiResults] = await connection.promise().query(
                        `SELECT COUNT(*) as count FROM mbti_history 
                         WHERE user_id = ? AND DATE(created_at) = ?`,
                        [userId, todayDate]
                    );
                    isCompleted = dailyMbtiResults[0].count > 0;
                    currentProgress = isCompleted ? 1 : 0;
                    message = isCompleted ? '今日已完成MBTI測驗' : '今日未完成MBTI測驗';
                    break;
                    
                case '發送第一條訊息':
                case '發送第一條消息':
                    const [firstMsgResults] = await connection.promise().query(
                        'SELECT COUNT(*) as count FROM messages WHERE sender_id = ?',
                        [userId]
                    );
                    if (firstMsgResults.length > 0) {
                        isCompleted = firstMsgResults[0].count >= 1;
                        currentProgress = isCompleted ? 1 : 0;
                        message = isCompleted ? '已發送第一條訊息' : '尚未發送訊息';
                    }
                    break;
                    
                case '添加第一位好友':
                    const [friendsResults] = await connection.promise().query(
                        `SELECT COUNT(*) as count FROM friendships 
                         WHERE (user1_id = ? OR user2_id = ?) AND status = 'accepted'`,
                        [userId, userId]
                    );
                    if (friendsResults.length > 0) {
                        isCompleted = friendsResults[0].count >= 1;
                        currentProgress = isCompleted ? 1 : 0;
                        message = isCompleted ? '已添加好友' : '尚未添加好友';
                    }
                    break;
                    
                case '在討論區張貼首個貼文':
                    const [postResults] = await connection.promise().query(
                        'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
                        [userId]
                    );
                    if (postResults.length > 0) {
                        isCompleted = postResults[0].count >= 1;
                        currentProgress = isCompleted ? 1 : 0;
                        message = isCompleted ? '已發佈貼文' : '尚未發佈貼文';
                    }
                    break;
                    
                case '點讚一個貼文':
                    const [likeResults] = await connection.promise().query(
                        'SELECT COUNT(*) as count FROM post_likes WHERE user_id = ?',
                        [userId]
                    );
                    if (likeResults.length > 0) {
                        isCompleted = likeResults[0].count >= 1;
                        currentProgress = isCompleted ? 1 : 0;
                        message = isCompleted ? '已點讚貼文' : '尚未點讚任何貼文';
                    }
                    break;
                    
                case '轉發一個貼文':
                    const [repostResults] = await connection.promise().query(
                        'SELECT COUNT(*) as count FROM reposts WHERE user_id = ?',
                        [userId]
                    );
                    if (repostResults.length > 0) {
                        isCompleted = repostResults[0].count >= 1;
                        currentProgress = isCompleted ? 1 : 0;
                        message = isCompleted ? '已轉發貼文' : '尚未轉發貼文';
                    } else {
                        isCompleted = false;
                        currentProgress = 0;
                        message = '轉發功能暫未開放';
                    }
                    break;
                    
                case '連續7天簽到':
                case '連續14天簽到':
                case '連續30天簽到':
                case '連續60天簽到':
                case '連續90天簽到':
                case '連續180天簽到':
                case '連續365天簽到':
                    const daysMatch = taskTitle.match(/連續(\d+)天簽到/);
                    const requiredDays = daysMatch ? parseInt(daysMatch[1]) : task.points_required || 7;
                    
                    const [streakResults] = await connection.promise().query(
                        'SELECT MAX(streak) as max_streak FROM daily_checkins WHERE user_id = ?',
                        [userId]
                    );
                    if (streakResults.length > 0) {
                        const maxStreak = streakResults[0].max_streak || 0;
                        currentProgress = maxStreak;
                        isCompleted = maxStreak >= requiredDays;
                        message = isCompleted 
                            ? `已連續簽到 ${maxStreak} 天！` 
                            : `已連續簽到 ${maxStreak}/${requiredDays} 天`;
                    }
                    break;
                    
                case '每日簽到':
                    const [todayCheckin] = await connection.promise().query(
                        `SELECT id FROM daily_checkins 
                         WHERE user_id = ? AND DATE(checkin_date) = CURDATE()`,
                        [userId]
                    );
                    isCompleted = todayCheckin.length > 0;
                    currentProgress = isCompleted ? 1 : 0;
                    message = isCompleted ? '今日已簽到' : '今日尚未簽到';
                    break;
                    
                default:
                    console.log(`未知任務: ${taskTitle}`);
                    return { success: false, message: '未知任務' };
            }
            
            // 4. 對於每日任務，重置狀態（如果不是今天完成的）
            if (task.task_type === 'daily') {
                const today = new Date().toISOString().split('T')[0];
                
                if (userTaskResults.length > 0) {
                    const userTask = userTaskResults[0];
                    const completedDate = userTask.completed_at 
                        ? new Date(userTask.completed_at).toISOString().split('T')[0]
                        : null;
                    
                    // 如果不是今天完成的，重置任務狀態
                    if (completedDate !== today) {
                        await connection.promise().query(
                            `UPDATE user_tasks 
                             SET user_status = ?, current_progress = ?, completed_at = NULL
                             WHERE user_id = ? AND task_id = ?`,
                            [isCompleted ? 'completed' : 'in_progress', currentProgress, userId, taskId]
                        );
                    } else {
                        // 如果是今天完成的，保持完成狀態
                        await connection.promise().query(
                            `UPDATE user_tasks 
                             SET user_status = ?, current_progress = ?, completed_at = ?
                             WHERE user_id = ? AND task_id = ?`,
                            [isCompleted ? 'completed' : 'in_progress', currentProgress, 
                             isCompleted ? new Date() : null, userId, taskId]
                        );
                    }
                } else {
                    // 創建新記錄
                    await connection.promise().query(
                        `INSERT INTO user_tasks (user_id, task_id, user_status, current_progress, started_at, completed_at) 
                         VALUES (?, ?, ?, ?, NOW(), ?)`,
                        [userId, taskId, isCompleted ? 'completed' : 'in_progress', 
                         currentProgress, isCompleted ? new Date() : null]
                    );
                }
            } else {
                // 非每日任務的正常更新邏輯
                if (userTaskResults.length === 0) {
                    await connection.promise().query(
                        `INSERT INTO user_tasks (user_id, task_id, user_status, current_progress, started_at, completed_at) 
                         VALUES (?, ?, ?, ?, NOW(), ?)`,
                        [userId, taskId, isCompleted ? 'completed' : 'in_progress', 
                         currentProgress, isCompleted ? new Date() : null]
                    );
                } else {
                    await connection.promise().query(
                        `UPDATE user_tasks 
                         SET user_status = ?, current_progress = ?, completed_at = ?
                         WHERE user_id = ? AND task_id = ?`,
                        [isCompleted ? 'completed' : 'in_progress', currentProgress, 
                         isCompleted ? new Date() : null, userId, taskId]
                    );
                }
            }
            
            // 5. 如果任務完成，發放獎勵
            if (isCompleted) {
                // 檢查是否已經領取過獎勵（特別處理每日任務）
                let hasRewarded = false;
                if (task.task_type === 'daily') {
                    const today = new Date().toISOString().split('T')[0];
                    const [rewardCheck] = await connection.promise().query(
                        `SELECT COUNT(*) as count FROM points_history 
                         WHERE user_id = ? AND type = 'task_reward' 
                         AND description LIKE ? AND DATE(created_at) = ?`,
                        [userId, `%完成任務: ${taskTitle}%`, today]
                    );
                    hasRewarded = rewardCheck[0].count > 0;
                } else {
                    const [rewardCheck] = await connection.promise().query(
                        `SELECT COUNT(*) as count FROM points_history 
                         WHERE user_id = ? AND type = 'task_reward' 
                         AND description LIKE ?`,
                        [userId, `%完成任務: ${taskTitle}%`]
                    );
                    hasRewarded = rewardCheck[0].count > 0;
                }
                
                if (!hasRewarded) {
                    await connection.promise().beginTransaction();
                    
                    try {
                        await connection.promise().query(
                            'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "task_reward", ?)',
                            [userId, task.points_reward, `完成任務: ${taskTitle}`]
                        );
                        
                        await connection.promise().query(
                            'UPDATE users SET points = IFNULL(points, 0) + ? WHERE id = ?',
                            [task.points_reward, userId]
                        );
                        
                        await connection.promise().commit();
                        
                        console.log(`用戶 ${userId} 完成任務: ${taskTitle}, 獲得 ${task.points_reward} 積分`);
                        
                        return { 
                            success: true, 
                            completed: true,
                            points_earned: task.points_reward,
                            message: message || `恭喜完成任務！獲得 ${task.points_reward} 積分`
                        };
                    } catch (err) {
                        await connection.promise().rollback();
                        console.error(`發放任務獎勵失敗: ${taskTitle}`, err);
                        return { success: false, message: '發放獎勵失敗' };
                    }
                }
            }
            
            return { 
                success: true, 
                completed: false,
                current_progress: currentProgress,
                required_progress: task.points_required,
                message: message
            };
            
        } catch (err) {
            console.error(`檢查任務失敗: ${taskTitle}`, err);
            return { success: false, message: '檢查任務失敗' };
        }
    }

    // ==================== 新增：記錄 MBTI 測試歷史 ====================
    
    // 記錄 MBTI 測試完成
    router.post('/record-mbti-test', authMiddleware(JWT_SECRET), async (req, res) => {
        const { mbtiType, testMode = 'traditional' } = req.body;
        const userId = req.user.id;

        try {
            // 檢查今天是否已經記錄過
            const today = new Date().toISOString().split('T')[0];
            const [todayRecord] = await connection.promise().query(
                `SELECT id FROM mbti_history 
                 WHERE user_id = ? AND DATE(created_at) = ?`,
                [userId, today]
            );

            if (todayRecord.length === 0) {
                // 插入新的記錄
                await connection.promise().query(
                    `INSERT INTO mbti_history (user_id, mbti_type, test_mode) 
                     VALUES (?, ?, ?)`,
                    [userId, mbtiType, testMode]
                );
                
                console.log(`用戶 ${userId} 完成 MBTI 測試，類型: ${mbtiType}`);
            }

            res.json({
                success: true,
                message: 'MBTI 測試記錄已保存'
            });

        } catch (err) {
            console.error('記錄 MBTI 測試失敗:', err);
            res.status(500).json({ error: '記錄測試結果失敗' });
        }
    });

    // 獲取用戶 MBTI 測試歷史
    router.get('/mbti-history', authMiddleware(JWT_SECRET), (req, res) => {
        const { limit = 10, offset = 0 } = req.query;
        
        connection.query(
            `SELECT 
                mbti_type,
                test_mode,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as formatted_time,
                created_at
             FROM mbti_history 
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [req.user.id, parseInt(limit), parseInt(offset)],
            (err, results) => {
                if (err) {
                    console.error('獲取 MBTI 歷史失敗:', err);
                    return res.status(500).json({ error: '獲取歷史記錄失敗' });
                }
                
                res.json({
                    success: true,
                    history: results || [],
                    total: results.length
                });
            }
        );
    });

    // ==================== 獎勵任務系統 API ====================

    // 獲取用戶積分總數
    router.get('/user-points', authMiddleware(JWT_SECRET), (req, res) => {
        connection.query(
            `SELECT 
                IFNULL(SUM(points), 0) as points,
                (SELECT COUNT(*) FROM user_tasks WHERE user_id = ? AND completed_at IS NOT NULL) as completed_tasks_count
            FROM points_history 
            WHERE user_id = ?`,
            [req.user.id, req.user.id],
            (err, results) => {
                if (err) {
                    console.error('獲取用戶積分失敗:', err);
                    return res.status(500).json({ error: '獲取積分失敗' });
                }
                
                const calculateLevel = (points) => {
                    if (points >= 5000) return '鉑金會員';
                    if (points >= 2000) return '黃金會員';
                    if (points >= 500) return '白銀會員';
                    if (points >= 100) return '青銅會員';
                    return '新手會員';
                };
                
                res.json({
                    success: true,
                    points: results[0].points || 0,
                    completed_tasks_count: results[0].completed_tasks_count || 0,
                    level: calculateLevel(results[0].points || 0)
                });
            }
        );
    });

    // ==================== 更新的任務API ====================

    // 獲取任務列表（帶動態狀態更新）
    router.get('/tasks', authMiddleware(JWT_SECRET), async (req, res) => {
        const userId = req.user.id;
        
        try {
            // 獲取所有活躍任務
            const [tasks] = await connection.promise().query(
                'SELECT * FROM tasks WHERE is_active = 1 ORDER BY priority ASC'
            );
            
            // 修改這裡：增加 daily 分類
            const grouped = { initial: [], achievement: [], daily: [] };
            
            // 對每個任務進行動態檢查
            for (const task of tasks) {
                // 檢查並更新任務狀態
                const checkResult = await checkAndCompleteTask(userId, task.title);
                
                // 獲取用戶任務狀態
                const [userTask] = await connection.promise().query(
                    'SELECT user_status, current_progress, completed_at FROM user_tasks WHERE user_id = ? AND task_id = ?',
                    [userId, task.id]
                );
                
                // 處理每日任務的狀態顯示
                if (task.task_type === 'daily') {
                    const today = new Date().toISOString().split('T')[0];
                    const completedToday = userTask[0]?.completed_at 
                        ? new Date(userTask[0].completed_at).toISOString().split('T')[0] === today
                        : false;
                    
                    if (completedToday) {
                        task.user_status = 'completed';
                    } else {
                        task.user_status = userTask[0]?.user_status || 'not_started';
                    }
                } else {
                    task.user_status = userTask[0]?.user_status || 'not_started';
                }
                
                task.current_progress = userTask[0]?.current_progress || 0;
                
                // 計算進度百分比
                if (task.points_required > 0) {
                    task.progress = Math.min(100, Math.round((task.current_progress / task.points_required) * 100));
                } else {
                    task.progress = task.user_status === 'completed' ? 100 : 0;
                }
                
                // 根據任務類型分類
                if (task.task_type === 'initial') {
                    grouped.initial.push(task);
                } else if (task.task_type === 'achievement') {
                    grouped.achievement.push(task);
                } else if (task.task_type === 'daily') {
                    grouped.daily.push(task);
                }
            }
            
            res.json({
                success: true,
                tasks: grouped
            });
        } catch (err) {
            console.error('獲取任務列表失敗:', err);
            res.status(500).json({ error: '獲取任務列表失敗' });
        }
    });

    // 開始任務
    router.post('/start-task', authMiddleware(JWT_SECRET), async (req, res) => {
        const { taskId } = req.body;
        const userId = req.user.id;
        
        try {
            const [tasks] = await connection.promise().query(
                'SELECT * FROM tasks WHERE id = ? AND is_active = 1',
                [taskId]
            );
            
            if (tasks.length === 0) {
                return res.status(400).json({ error: '任務不存在或已失效' });
            }
            
            const task = tasks[0];
            
            // 檢查是否已經開始或完成
            const [userTask] = await connection.promise().query(
                'SELECT * FROM user_tasks WHERE user_id = ? AND task_id = ?',
                [userId, taskId]
            );
            
            // 對於每日任務，檢查今天是否已完成
            if (task.task_type === 'daily') {
                const today = new Date().toISOString().split('T')[0];
                const [todayTask] = await connection.promise().query(
                    `SELECT * FROM user_tasks 
                     WHERE user_id = ? AND task_id = ? 
                     AND DATE(completed_at) = ?`,
                    [userId, taskId, today]
                );
                
                if (todayTask.length > 0 && todayTask[0].user_status === 'completed') {
                    return res.status(400).json({ error: '今日任務已完成，請明天再來' });
                }
            } else if (userTask.length > 0) {
                if (userTask[0].user_status === 'completed') {
                    return res.status(400).json({ error: '任務已完成' });
                }
                return res.status(400).json({ error: '任務已開始' });
            }
            
            // 創建任務記錄
            await connection.promise().query(
                'INSERT INTO user_tasks (user_id, task_id, started_at, current_progress, user_status) VALUES (?, ?, NOW(), 0, "in_progress")',
                [userId, taskId]
            );
            
            // 立即檢查任務狀態
            const result = await checkAndCompleteTask(userId, task.title);
            
            res.json({ 
                success: true, 
                message: '任務已開始',
                task: {
                    ...task,
                    user_status: result.completed ? 'completed' : 'in_progress',
                    current_progress: result.current_progress || 0,
                    progress: result.completed ? 100 : 0
                },
                ...result
            });
        } catch (err) {
            console.error('開始任務失敗:', err);
            res.status(500).json({ error: '開始任務失敗' });
        }
    });

    // 檢查任務進度
    router.post('/check-task-progress', authMiddleware(JWT_SECRET), async (req, res) => {
        const { taskId } = req.body;
        const userId = req.user.id;
        
        try {
            const [tasks] = await connection.promise().query(
                'SELECT * FROM tasks WHERE id = ? AND is_active = 1',
                [taskId]
            );
            
            if (tasks.length === 0) {
                return res.status(400).json({ error: '任務不存在或已失效' });
            }
            
            const task = tasks[0];
            
            // 檢查任務狀態
            const result = await checkAndCompleteTask(userId, task.title);
            
            // 獲取更新後的任務狀態
            const [userTask] = await connection.promise().query(
                'SELECT user_status, current_progress FROM user_tasks WHERE user_id = ? AND task_id = ?',
                [userId, taskId]
            );
            
            const taskStatus = userTask[0] || { user_status: 'not_started', current_progress: 0 };
            
            res.json({
                success: true,
                completed: result.completed || false,
                points_earned: result.points_earned || 0,
                current_progress: taskStatus.current_progress,
                required_progress: task.points_required,
                progress: task.points_required > 0 
                    ? Math.min(100, Math.round((taskStatus.current_progress / task.points_required) * 100))
                    : (taskStatus.user_status === 'completed' ? 100 : 0),
                message: result.message,
                task: {
                    ...task,
                    user_status: taskStatus.user_status,
                    current_progress: taskStatus.current_progress
                }
            });
        } catch (err) {
            console.error('檢查任務進度失敗:', err);
            res.status(500).json({ error: '檢查任務進度失敗' });
        }
    });

    // 提交任務進度
    router.post('/submit-task-progress', authMiddleware(JWT_SECRET), (req, res) => {
        const { taskId, progress } = req.body;
        
        connection.beginTransaction(err => {
            if (err) return res.status(500).json({ error: '交易失敗' });
            
            connection.query(
                `SELECT ut.*, t.points_required, t.points_reward, t.task_type 
                 FROM user_tasks ut
                 JOIN tasks t ON ut.task_id = t.id
                 WHERE ut.user_id = ? AND ut.task_id = ? AND t.is_active = 1`,
                [req.user.id, taskId],
                (err, results) => {
                    if (err || results.length === 0) {
                        return connection.rollback(() => {
                            res.status(400).json({ error: '任務不存在或未開始' });
                        });
                    }
                    
                    const userTask = results[0];
                    const newProgress = Math.min(progress, userTask.points_required);
                    
                    // 更新進度
                    connection.query(
                        'UPDATE user_tasks SET current_progress = ? WHERE user_id = ? AND task_id = ?',
                        [newProgress, req.user.id, taskId],
                        (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    res.status(500).json({ error: '更新進度失敗' });
                                });
                            }
                            
                            // 如果進度達到要求，完成任務
                            if (newProgress >= userTask.points_required && !userTask.completed_at) {
                                connection.query(
                                    'UPDATE user_tasks SET completed_at = NOW() WHERE user_id = ? AND task_id = ?',
                                    [req.user.id, taskId],
                                    (err) => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                res.status(500).json({ error: '完成任務失敗' });
                                            });
                                        }
                                        
                                        // 添加積分記錄
                                        connection.query(
                                            'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "task_reward", ?)',
                                            [req.user.id, userTask.points_reward, `完成任務: ${userTask.task_id}`],
                                            (err) => {
                                                if (err) {
                                                    return connection.rollback(() => {
                                                        res.status(500).json({ error: '發放獎勵失敗' });
                                                    });
                                                }
                                                
                                                connection.commit(err => {
                                                    if (err) {
                                                        return connection.rollback(() => {
                                                            res.status(500).json({ error: '提交失敗' });
                                                        });
                                                    }
                                                    
                                                    connection.query(
                                                        'SELECT IFNULL(SUM(points), 0) as points FROM points_history WHERE user_id = ?',
                                                        [req.user.id],
                                                        (err, pointResults) => {
                                                            if (err) {
                                                                return res.json({ 
                                                                    success: true, 
                                                                    message: '任務完成！',
                                                                    points_earned: userTask.points_reward,
                                                                    task_completed: true
                                                                });
                                                            }
                                                            
                                                            const calculateLevel = (points) => {
                                                                if (points >= 5000) return '鉑金會員';
                                                                if (points >= 2000) return '黃金會員';
                                                                if (points >= 500) return '白銀會員';
                                                                if (points >= 100) return '青銅會員';
                                                                return '新手會員';
                                                            };
                                                            
                                                            res.json({ 
                                                                success: true, 
                                                                message: '任務完成！',
                                                                points_earned: userTask.points_reward,
                                                                points: pointResults[0].points,
                                                                task_completed: true,
                                                                level: calculateLevel(pointResults[0].points)
                                                            });
                                                        }
                                                    );
                                                });
                                            }
                                        );
                                    }
                                );
                            } else {
                                connection.commit(err => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            res.status(500).json({ error: '提交失敗' });
                                        });
                                    }
                                    
                                    res.json({ 
                                        success: true, 
                                        message: '進度已更新',
                                        current_progress: newProgress,
                                        points_needed: userTask.points_required - newProgress,
                                        task_completed: false
                                    });
                                });
                            }
                        }
                    );
                }
            );
        });
    });

    // 獲取積分歷史記錄
    router.get('/points-history', authMiddleware(JWT_SECRET), (req, res) => {
        const { limit = 50, offset = 0 } = req.query;
        
        connection.query(
            `SELECT 
                ph.*,
                DATE_FORMAT(ph.created_at, '%Y-%m-%d %H:%i') as formatted_time,
                CASE 
                    WHEN ph.points > 0 THEN 'earn'
                    ELSE 'spend'
                END as action_type
            FROM points_history ph
            WHERE ph.user_id = ?
            ORDER BY ph.created_at DESC
            LIMIT ? OFFSET ?`,
            [req.user.id, parseInt(limit), parseInt(offset)],
            (err, results) => {
                if (err) {
                    console.error('獲取積分歷史失敗:', err);
                    return res.status(500).json({ error: '獲取歷史記錄失敗' });
                }
                
                connection.query(
                    'SELECT COUNT(*) as total FROM points_history WHERE user_id = ?',
                    [req.user.id],
                    (err, countResults) => {
                        if (err) {
                            return res.json({ success: true, history: results });
                        }
                        
                        res.json({
                            success: true,
                            history: results,
                            total: countResults[0].total,
                            has_more: results.length === parseInt(limit)
                        });
                    }
                );
            }
        );
    });

    // 獲取商店商品列表
    router.get('/shop-items', authMiddleware(JWT_SECRET), (req, res) => {
        connection.query(
            `SELECT 
                si.*,
                (si.stock - (SELECT COUNT(*) FROM user_redemptions WHERE item_id = si.id AND status = 'redeemed')) as available_stock,
                CASE 
                    WHEN (SELECT COUNT(*) FROM user_redemptions WHERE user_id = ? AND item_id = si.id AND status = 'redeemed') > 0 
                    THEN true 
                    ELSE false 
                END as is_redeemed
            FROM shop_items si
            WHERE si.is_active = 1
            ORDER BY si.points_required ASC, si.created_at DESC`,
            [req.user.id],
            (err, results) => {
                if (err) {
                    console.error('獲取商店商品失敗:', err);
                    return res.status(500).json({ error: '獲取商品列表失敗' });
                }
                
                if (!results) {
                    results = [];
                }
                
                connection.query(
                    'SELECT IFNULL(SUM(points), 0) as points FROM points_history WHERE user_id = ?',
                    [req.user.id],
                    (err, pointResults) => {
                        if (err) {
                            console.error('獲取用戶積分失敗:', err);
                            return res.json({ 
                                success: true, 
                                items: results, 
                                user_points: 0 
                            });
                        }
                        
                        res.json({
                            success: true,
                            items: results,
                            user_points: pointResults[0].points || 0
                        });
                    }
                );
            }
        );
    });

    // 兌換商品
    router.post('/redeem-item', authMiddleware(JWT_SECRET), (req, res) => {
        const { itemId } = req.body;
        
        connection.beginTransaction(err => {
            if (err) return res.status(500).json({ error: '交易失敗' });
            
            connection.query(
                `SELECT * FROM shop_items 
                 WHERE id = ? AND is_active = 1 
                   AND stock > (SELECT COUNT(*) FROM user_redemptions WHERE item_id = ? AND status = 'redeemed')`,
                [itemId, itemId],
                (err, results) => {
                    if (err || results.length === 0) {
                        return connection.rollback(() => {
                            res.status(400).json({ error: '商品不存在或已售罄' });
                        });
                    }
                    
                    const item = results[0];
                    
                    if (item.limit_per_user > 0) {
                        connection.query(
                            `SELECT COUNT(*) as redeemed_count 
                             FROM user_redemptions 
                             WHERE user_id = ? AND item_id = ? AND status = 'redeemed'`,
                            [req.user.id, itemId],
                            (err, redeemResults) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        res.status(500).json({ error: '數據庫錯誤' });
                                    });
                                }
                                
                                if (redeemResults[0].redeemed_count >= item.limit_per_user) {
                                    return connection.rollback(() => {
                                        res.status(400).json({ error: '已達到兌換上限' });
                                    });
                                }
                                
                                checkUserPoints(item);
                            }
                        );
                    } else {
                        checkUserPoints(item);
                    }
                    
                    function checkUserPoints(item) {
                        connection.query(
                            'SELECT IFNULL(SUM(points), 0) as points FROM points_history WHERE user_id = ?',
                            [req.user.id],
                            (err, pointResults) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        res.status(500).json({ error: '數據庫錯誤' });
                                    });
                                }
                                
                                const userPoints = pointResults[0].points || 0;
                                
                                if (userPoints < item.points_required) {
                                    return connection.rollback(() => {
                                        res.status(400).json({ error: '積分不足' });
                                    });
                                }
                                
                                connection.query(
                                    'INSERT INTO user_redemptions (user_id, item_id, status) VALUES (?, ?, "pending")',
                                    [req.user.id, itemId],
                                    (err, result) => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                res.status(500).json({ error: '兌換失敗' });
                                            });
                                        }
                                        
                                        connection.query(
                                            'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "item_redeem", ?)',
                                            [req.user.id, -item.points_required, `兌換商品: ${item.name}`],
                                            (err) => {
                                                if (err) {
                                                    return connection.rollback(() => {
                                                        res.status(500).json({ error: '扣除積分失敗' });
                                                    });
                                                }
                                                
                                                connection.query(
                                                    'UPDATE user_redemptions SET status = "redeemed", redeemed_at = NOW() WHERE id = ?',
                                                    [result.insertId],
                                                    (err) => {
                                                        if (err) {
                                                            return connection.rollback(() => {
                                                                res.status(500).json({ error: '更新狀態失敗' });
                                                            });
                                                        }
                                                        
                                                        connection.commit(err => {
                                                            if (err) {
                                                                return connection.rollback(() => {
                                                                    res.status(500).json({ error: '提交失敗' });
                                                                });
                                                            }
                                                            
                                                            connection.query(
                                                                'SELECT IFNULL(SUM(points), 0) as points FROM points_history WHERE user_id = ?',
                                                                [req.user.id],
                                                                (err, finalPointResults) => {
                                                                    if (err) {
                                                                        return res.json({ 
                                                                            success: true, 
                                                                            message: '兌換成功！',
                                                                            redemption_id: result.insertId
                                                                        });
                                                                    }
                                                                    
                                                                    const calculateLevel = (points) => {
                                                                        if (points >= 5000) return '鉑金會員';
                                                                        if (points >= 2000) return '黃金會員';
                                                                        if (points >= 500) return '白銀會員';
                                                                        if (points >= 100) return '青銅會員';
                                                                        return '新手會員';
                                                                    };
                                                                    
                                                                    res.json({ 
                                                                        success: true, 
                                                                        message: '兌換成功！',
                                                                        redemption_id: result.insertId,
                                                                        remaining_points: finalPointResults[0].points,
                                                                        level: calculateLevel(finalPointResults[0].points)
                                                                    });
                                                                }
                                                            );
                                                        });
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                }
            );
        });
    });

    // 獲取用戶兌換記錄
    router.get('/user-redemptions', authMiddleware(JWT_SECRET), (req, res) => {
        const { limit = 20, offset = 0 } = req.query;
        
        connection.query(
            `SELECT 
                ur.*,
                si.name as item_name,
                si.description as item_description,
                si.image_url as item_image,
                si.points_required,
                DATE_FORMAT(ur.redeemed_at, '%Y-%m-%d %H:%i') as formatted_time,
                CASE 
                    WHEN ur.status = 'redeemed' THEN '已完成'
                    WHEN ur.status = 'pending' THEN '處理中'
                    WHEN ur.status = 'shipped' THEN '已發貨'
                    ELSE ur.status
                END as status_text
            FROM user_redemptions ur
            JOIN shop_items si ON ur.item_id = si.id
            WHERE ur.user_id = ?
            ORDER BY ur.redeemed_at DESC
            LIMIT ? OFFSET ?`,
            [req.user.id, parseInt(limit), parseInt(offset)],
            (err, results) => {
                if (err) {
                    console.error('獲取兌換記錄失敗:', err);
                    return res.status(500).json({ error: '獲取兌換記錄失敗' });
                }
                
                res.json({
                    success: true,
                    redemptions: results,
                    total: results.length,
                    has_more: results.length === parseInt(limit)
                });
            }
        );
    });

    // 每日簽到 API
    router.post('/daily-checkin', authMiddleware(JWT_SECRET), async (req, res) => {
        const userId = req.user.id;

        try {
            const [todayCheckin] = await connection.promise().query(
                `SELECT id 
                 FROM daily_checkins 
                 WHERE user_id = ? 
                 AND DATE(checkin_date) = CURDATE()`,
                [userId]
            );

            if (todayCheckin.length > 0) {
                return res.status(400).json({ 
                    success: false,
                    error: '今日已簽到' 
                });
            }

            const [yesterdayCheckin] = await connection.promise().query(
                `SELECT streak 
                 FROM daily_checkins 
                 WHERE user_id = ? 
                 AND DATE(checkin_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                 ORDER BY checkin_date DESC 
                 LIMIT 1`,
                [userId]
            );

            let streak = 1;

            if (yesterdayCheckin.length > 0) {
                const yesterdayStreak = Number(yesterdayCheckin[0].streak || 1);
                streak = yesterdayStreak + 1;
            }

            const points = streak * 10;

            await connection.promise().query(
                `INSERT INTO daily_checkins 
                 (user_id, checkin_date, points_earned, streak) 
                 VALUES (?, NOW(), ?, ?)`,
                [userId, points, streak]
            );

            await connection.promise().query(
                'UPDATE users SET points = points + ? WHERE id = ?',
                [points, userId]
            );

            await connection.promise().query(
                `INSERT INTO points_history 
                 (user_id, points, type, description) 
                 VALUES (?, ?, 'daily_checkin', ?)`,
                [userId, points, `每日簽到 (連續 ${streak} 天，獲得 ${points} 積分)`]
            );

            res.json({
                success: true,
                message: `簽到成功！獲得 ${points} 積分`,
                streak: streak,
                points_earned: points
            });

        } catch (err) {
            console.error('每日簽到失敗:', err);
            res.status(500).json({ 
                success: false, 
                error: '伺服器錯誤，請稍後再試' 
            });
        }
    });

    // 檢查今日簽到狀態
    router.get('/checkin-status', authMiddleware(JWT_SECRET), (req, res) => {
        const today = new Date().toISOString().split('T')[0];
        
        connection.query(
            `SELECT 
                EXISTS(SELECT 1 FROM daily_checkins WHERE user_id = ? AND DATE(checkin_date) = ?) as checked_in_today,
                (SELECT COUNT(*) FROM daily_checkins WHERE user_id = ? AND checkin_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)) as consecutive_week_days,
                (SELECT MAX(checkin_date) FROM daily_checkins WHERE user_id = ?) as last_checkin_date
            FROM dual`,
            [req.user.id, today, req.user.id, req.user.id],
            (err, results) => {
                if (err) {
                    console.error('檢查簽到狀態失敗:', err);
                    return res.status(500).json({ error: '檢查簽到狀態失敗' });
                }
                
                res.json({
                    success: true,
                    checked_in_today: Boolean(results[0].checked_in_today),
                    consecutive_week_days: results[0].consecutive_week_days || 0,
                    last_checkin_date: results[0].last_checkin_date
                });
            }
        );
    });

    // 初始化獎勵系統數據庫表
    router.get('/init-rewards-db', authMiddleware(JWT_SECRET), (req, res) => {
        const queries = [
            `CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                task_type ENUM('initial', 'achievement', 'daily', 'special') DEFAULT 'initial',
                points_required INT DEFAULT 1,
                points_reward INT DEFAULT 10,
                priority INT DEFAULT 5,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS user_tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                task_id INT NOT NULL,
                user_status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                current_progress INT DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_task (user_id, task_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS points_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                points INT NOT NULL,
                type ENUM('task_reward', 'daily_checkin', 'item_redeem', 'system_bonus', 'referral') DEFAULT 'task_reward',
                description VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            `CREATE TABLE IF NOT EXISTS shop_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) DEFAULT 'general',
                points_required INT NOT NULL,
                stock INT DEFAULT 1,
                limit_per_user INT DEFAULT 1,
                image_url VARCHAR(500),
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS user_redemptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                item_id INT NOT NULL,
                status ENUM('pending', 'redeemed', 'shipped', 'cancelled') DEFAULT 'pending',
                redeemed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
            )`,
            
            `CREATE TABLE IF NOT EXISTS daily_checkins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                checkin_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                points_earned INT DEFAULT 10,
                streak INT DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_daily_checkin (user_id, DATE(checkin_date))
            )`,
            
            // 新增 mbti_history 表
            `CREATE TABLE IF NOT EXISTS mbti_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                mbti_type VARCHAR(4) NOT NULL,
                test_mode VARCHAR(20) DEFAULT 'traditional',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id_created_at (user_id, created_at)
            )`
        ];
        
        let completed = 0;
        let errors = [];
        
        queries.forEach((query, index) => {
            connection.query(query, (err, result) => {
                if (err) {
                    console.error(`初始化表 ${index + 1} 失敗:`, err.message);
                    errors.push(`表 ${index + 1}: ${err.message}`);
                }
                
                completed++;
                if (completed === queries.length) {
                    if (errors.length > 0) {
                        res.status(500).json({ success: false, errors });
                    } else {
                        insertSampleData()
                            .then(() => {
                                res.json({ success: true, message: '獎勵系統數據庫初始化完成，示例數據已添加' });
                            })
                            .catch(sampleErr => {
                                res.json({ success: true, message: '獎勵系統數據庫初始化完成，但示例數據添加失敗: ' + sampleErr.message });
                            });
                    }
                }
            });
        });
    });

    // 插入示例數據
    const insertSampleData = async () => {
        return new Promise((resolve, reject) => {
            // 插入示例任務 - 確保每日任務存在
            const sampleTasks = [
                // 初始任務
                ['上傳頭像', '上傳您的個人頭像以個性化您的帳戶', 'initial', 1, 50, 1],
                ['參與群聊', '在任何聊天室發送5條訊息來參與討論', 'initial', 5, 100, 2],
                
                // 成就任務
                ['完成MBTI測試', '完成MBTI性格測試來了解自己', 'achievement', 1, 200, 3],
                ['發送第一條訊息', '在聊天室發送您的第一條訊息', 'achievement', 1, 50, 4],
                ['添加第一位好友', '添加您的第一位好友來擴大社交圈', 'achievement', 1, 100, 5],
                ['在討論區張貼首個貼文', '在討論區發佈您的第一個貼文', 'achievement', 1, 150, 6],
                
                // 每日任務 - 確保這些任務存在
                ['每日發送5條訊息', '每天發送5條訊息，獲得積分', 'daily', 5, 50, 1],
                ['每日完成MBTI測驗一次', '每天完成一次MBTI測驗，獲得積分', 'daily', 1, 100, 2],
                ['每日簽到', '每天簽到獲得積分', 'daily', 1, 30, 3],
                ['點讚一個貼文', '在討論區點讚一個貼文', 'daily', 1, 20, 4]
            ];
            
            sampleTasks.forEach((task, index) => {
                connection.query(
                    `INSERT IGNORE INTO tasks (title, description, task_type, points_required, points_reward, priority) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    task,
                    (err) => {
                        if (err) console.error('插入任務失敗:', err);
                    }
                );
            });
            
            // 插入示例商品
            const sampleItems = [
                ['電影優惠券', '可用於指定影院的電影票優惠', 'coupon', 500, 100, '/uploads/shop/movie_ticket.jpg'],
                ['咖啡券', '星巴克或類似咖啡店優惠券', 'coupon', 300, 200, '/uploads/shop/coffee_coupon.jpg'],
                ['個性化頭像框', '特殊頭像框裝飾', 'virtual', 200, 1000, '/uploads/shop/avatar_frame.png'],
                ['聊天氣泡皮膚', '個性化聊天氣泡樣式', 'virtual', 150, 500, '/uploads/shop/chat_bubble.png'],
                ['7天VIP體驗', 'VIP特權體驗（無廣告、優先匹配）', 'virtual', 1000, 50, '/uploads/shop/vip_badge.png'],
                ['實體禮品卡', '100元購物禮品卡（需填寫郵寄地址）', 'physical', 5000, 10, '/uploads/shop/gift_card.jpg']
            ];
            
            sampleItems.forEach((item, index) => {
                connection.query(
                    `INSERT IGNORE INTO shop_items (name, description, category, points_required, stock, image_url) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    item,
                    (err) => {
                        if (err) console.error('插入商品失敗:', err);
                    }
                );
            });
            
            setTimeout(resolve, 1000);
        });
    };

    // 給新用戶初始積分
    router.post('/give-welcome-points', authMiddleware(JWT_SECRET), (req, res) => {
        const userId = req.user.id;
        
        connection.query(
            'SELECT COUNT(*) as count FROM points_history WHERE user_id = ? AND type = "system_bonus" AND description LIKE "歡迎積分%"',
            [userId],
            (err, results) => {
                if (err) return res.status(500).json({ error: '數據庫錯誤' });
                
                if (results[0].count > 0) {
                    return res.status(400).json({ error: '已經領取過歡迎積分' });
                }
                
                connection.query(
                    'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "system_bonus", "歡迎積分")',
                    [userId, 100],
                    (err) => {
                        if (err) {
                            console.error('發放歡迎積分失敗:', err);
                            return res.status(500).json({ error: '發放積分失敗' });
                        }
                        
                        res.json({ 
                            success: true, 
                            message: '成功獲得100歡迎積分！',
                            points_earned: 100 
                        });
                    }
                );
            }
        );
    });

    return router;
};