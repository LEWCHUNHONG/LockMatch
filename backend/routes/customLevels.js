// routes/customLevels.js
const express = require('express');
const router = express.Router();

module.exports = (connection, authMiddleware, JWT_SECRET) => {

    const safeJsonParse = (value) => {
        if (!value) return null;
        if (typeof value === 'object') return value;
        try {
            return JSON.parse(value);
        } catch (e) {
            console.error('JSON 解析失敗:', value);
            return null;
        }
    };

    // 獲取所有自定義關卡
    router.get('/', authMiddleware(JWT_SECRET), async (req, res) => {
        const userId = req.user.id;
        try {
            const [levels] = await connection.promise().query(
                `SELECT id, user_id, name, bgColor, backgroundImage, floors, totalFloors, unlockCondition, originalId, created_at, updated_at
                 FROM custom_levels
                 WHERE user_id = ?
                 ORDER BY created_at DESC`,
                [userId]
            );

            const parsedLevels = levels.map(level => {
                let floors = safeJsonParse(level.floors);
                if (!floors || !Array.isArray(floors)) floors = [];
                let unlockCondition = safeJsonParse(level.unlockCondition);
                if (!unlockCondition) unlockCondition = { type: 'none' };

                return {
                    id: level.id,
                    user_id: level.user_id,
                    name: level.name,
                    bgColor: level.bgColor,
                    backgroundImage: level.backgroundImage,
                    floors: floors,
                    totalFloors: level.totalFloors,
                    unlockCondition: unlockCondition,
                    originalId: level.originalId,
                    created_at: level.created_at,
                    updated_at: level.updated_at,
                };
            });

            res.json({ success: true, levels: parsedLevels });
        } catch (err) {
            console.error('獲取自定義關卡失敗:', err);
            res.status(500).json({ success: false, error: '獲取關卡失敗' });
        }
    });

    // 獲取單個關卡
    router.get('/:id', authMiddleware(JWT_SECRET), async (req, res) => {
        const userId = req.user.id;
        const levelId = req.params.id;

        if (!levelId || levelId.trim() === '') {
            return res.status(400).json({ success: false, error: '無效的關卡 ID' });
        }

        try {
            const [levels] = await connection.promise().query(
                `SELECT id, user_id, name, bgColor, backgroundImage, floors, totalFloors, unlockCondition, originalId, created_at, updated_at
                 FROM custom_levels
                 WHERE id = ? AND user_id = ?`,
                [levelId, userId]
            );

            if (levels.length === 0) {
                return res.status(404).json({ success: false, error: '關卡不存在或無權訪問' });
            }

            const level = levels[0];
            let floors = safeJsonParse(level.floors);
            if (!floors || !Array.isArray(floors)) floors = [];
            let unlockCondition = safeJsonParse(level.unlockCondition);
            if (!unlockCondition) unlockCondition = { type: 'none' };

            res.json({
                success: true,
                level: { ...level, floors, unlockCondition }
            });
        } catch (err) {
            console.error('獲取單個關卡失敗:', err);
            res.status(500).json({ success: false, error: '獲取關卡失敗' });
        }
    });

    // 創建關卡
    router.post('/', authMiddleware(JWT_SECRET), async (req, res) => {
        const userId = req.user.id;
        const { name, bgColor, backgroundImage, floors, totalFloors, unlockCondition, originalId } = req.body;

        if (!name || !floors) {
            return res.status(400).json({ success: false, error: '缺少必要參數 (name, floors)' });
        }

        try {
            const floorsArray = Array.isArray(floors) ? floors : [floors];
            const floorsJSON = JSON.stringify(floorsArray);
            const unlockConditionJSON = unlockCondition ? JSON.stringify(unlockCondition) : null;

            const [result] = await connection.promise().query(
                `INSERT INTO custom_levels (user_id, name, bgColor, backgroundImage, floors, totalFloors, unlockCondition, originalId)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, name, bgColor || '#2ecc71', backgroundImage || null, floorsJSON, totalFloors || 1, unlockConditionJSON, originalId || null]
            );

            res.json({ success: true, id: result.insertId, message: '關卡創建成功' });
        } catch (err) {
            console.error('創建關卡失敗:', err);
            res.status(500).json({ success: false, error: '創建關卡失敗' });
        }
    });

    // 更新關卡
    router.put('/:id', authMiddleware(JWT_SECRET), async (req, res) => {
        const userId = req.user.id;
        const levelId = req.params.id;

        console.log(`📥 更新請求: userId=${userId}, levelId=${levelId}, body=`, req.body);

        if (!levelId || levelId.trim() === '') {
            return res.status(400).json({ success: false, error: '無效的關卡 ID' });
        }

        const { name, bgColor, backgroundImage, floors, totalFloors, unlockCondition, originalId } = req.body;

        try {
            const [existing] = await connection.promise().query(
                'SELECT id FROM custom_levels WHERE id = ? AND user_id = ?',
                [levelId, userId]
            );

            console.log('查詢結果:', existing);

            if (existing.length === 0) {
                return res.status(404).json({ success: false, error: '關卡不存在或無權修改' });
            }

            const updates = [];
            const values = [];

            if (name !== undefined) {
                updates.push('name = ?');
                values.push(name);
            }
            if (bgColor !== undefined) {
                updates.push('bgColor = ?');
                values.push(bgColor);
            }
            if (backgroundImage !== undefined) {
                updates.push('backgroundImage = ?');
                values.push(backgroundImage);
            }
            if (floors !== undefined) {
                const floorsArray = Array.isArray(floors) ? floors : [floors];
                const floorsJSON = JSON.stringify(floorsArray);
                updates.push('floors = ?');
                values.push(floorsJSON);
            }
            if (totalFloors !== undefined) {
                updates.push('totalFloors = ?');
                values.push(totalFloors);
            }
            if (unlockCondition !== undefined) {
                updates.push('unlockCondition = ?');
                values.push(unlockCondition ? JSON.stringify(unlockCondition) : null);
            }
            if (originalId !== undefined) {
                updates.push('originalId = ?');
                values.push(originalId);
            }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, error: '沒有提供更新欄位' });
            }

            values.push(levelId, userId);

            await connection.promise().query(
                `UPDATE custom_levels SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
                values
            );

            res.json({ success: true, message: '關卡更新成功' });
        } catch (err) {
            console.error('更新關卡失敗:', err);
            res.status(500).json({ success: false, error: '更新關卡失敗' });
        }
    });

    // 刪除關卡
    router.delete('/:id', authMiddleware(JWT_SECRET), async (req, res) => {
        const userId = req.user.id;
        const levelId = req.params.id;

        if (!levelId || levelId.trim() === '') {
            return res.status(400).json({ success: false, error: '無效的關卡 ID' });
        }

        try {
            const [result] = await connection.promise().query(
                'DELETE FROM custom_levels WHERE id = ? AND user_id = ?',
                [levelId, userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: '關卡不存在或無權刪除' });
            }

            res.json({ success: true, message: '關卡刪除成功' });
        } catch (err) {
            console.error('刪除關卡失敗:', err);
            res.status(500).json({ success: false, error: '刪除關卡失敗' });
        }
    });

    // 初始化表
    router.get('/init-db', authMiddleware(JWT_SECRET), async (req, res) => {
        try {
            await connection.promise().query(`
                CREATE TABLE IF NOT EXISTS custom_levels (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    bgColor VARCHAR(50) DEFAULT '#2ecc71',
                    backgroundImage VARCHAR(500),
                    floors JSON NOT NULL,
                    totalFloors INT DEFAULT 1,
                    unlockCondition JSON,
                    originalId VARCHAR(100) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id)
                )
            `);
            res.json({ success: true, message: '自定義關卡表已初始化' });
        } catch (err) {
            console.error('初始化自定義關卡表失敗:', err);
            res.status(500).json({ success: false, error: '初始化失敗' });
        }
    });

    return router;
};