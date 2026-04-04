// routes/game.js
const express = require('express');
const router = express.Router();

const PRESET_LEVEL_IDS = ['ei-dimension', 'sn-dimension', 'tf-dimension', 'jp-dimension'];
const WEEKLY_LIMIT = 1000;

module.exports = (connection, authMiddleware, JWT_SECRET, BASE_URL) => {
  
  // =============================================
  // 測試遊戲API連接
  // =============================================
  router.get('/game/test', authMiddleware(JWT_SECRET), (req, res) => {
    res.json({ 
      success: true, 
      message: '遊戲API連接正常',
      timestamp: new Date(),
      user_id: req.user.id
    });
  });

  // =============================================
  // 上傳遊戲結果
  // =============================================
  router.post('/game/upload-result', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const userId = req.user.id;
      const { level_id, game_type, play_data, calculated_mbti, score, play_time_seconds } = req.body;
      
      const levelIdStr = String(level_id);
      
      console.log('🎮 收到遊戲結果上傳:', { userId, level_id: levelIdStr, game_type, calculated_mbti, score });
      
      if (!level_id || !play_data) {
        return res.status(400).json({ success: false, error: '缺少必要參數 (level_id 或 play_data)' });
      }
      
      // 確保表格存在
      await connection.promise().query(`
        CREATE TABLE IF NOT EXISTS mbti_game_results (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          level_id VARCHAR(50) NOT NULL,
          game_type VARCHAR(50) DEFAULT 'mbti_adventure',
          play_data JSON,
          calculated_mbti VARCHAR(4),
          score INT DEFAULT 0,
          play_time_seconds INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_created (user_id, created_at)
        )
      `);
      
      const [result] = await connection.promise().query(
        `INSERT INTO mbti_game_results 
         (user_id, level_id, game_type, play_data, calculated_mbti, score, play_time_seconds) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, 
          levelIdStr, 
          game_type || 'mbti_adventure', 
          JSON.stringify(play_data), 
          calculated_mbti, 
          score || 0, 
          play_time_seconds || 0
        ]
      );
      
      console.log('✅ 遊戲結果已保存, resultId:', result.insertId);
      
      // ========== 積分計算邏輯 ==========
      let pointsEarned = 0;
      const isPreset = PRESET_LEVEL_IDS.includes(levelIdStr);
      const isEndless = levelIdStr === 'endless' || game_type === 'endless';
      const isCustom = levelIdStr.startsWith('custom_') || /^\d+$/.test(levelIdStr);

      // 主線關卡首次完成獎勵積分
      if (isPreset) {
        const [existing] = await connection.promise().query(
          'SELECT id FROM mbti_game_results WHERE user_id = ? AND level_id = ?',
          [userId, levelIdStr]
        );
        // 如果只有一條記錄（剛插入的這條），說明是首次完成
        if (existing.length === 1) {
          pointsEarned = 100;
          console.log(`🏆 主線關卡首次完成，獎勵 100 分`);
        } else {
          console.log(`⏭️ 主線關卡重複完成，不獎勵積分`);
        }
      } else if (isEndless) {
        // 無限模式積分計算
        const now = new Date();
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const [weekly] = await connection.promise().query(
          `SELECT COALESCE(SUM(points), 0) as total 
           FROM points_history 
           WHERE user_id = ? 
             AND type = 'game_reward' 
             AND description LIKE '%無限模式%'
             AND created_at BETWEEN ? AND ?`,
          [userId, monday, sunday]
        );
        const weeklyUsed = weekly[0].total;
        const remaining = WEEKLY_LIMIT - weeklyUsed;
        if (remaining > 0) {
          const rawPoints = Math.floor((score || 0) / 10);
          pointsEarned = Math.min(rawPoints, remaining);
          console.log(`♾️ 無限模式，本周已用 ${weeklyUsed}，剩餘 ${remaining}，獲得 ${pointsEarned} 分`);
        } else {
          console.log(`♾️ 無限模式本周額度已用完，無積分`);
        }
      } else if (isCustom) {
        console.log(`⚙️ 自定義關卡，不獎勵積分`);
      } else {
        console.log(`❓ 未知關卡類型，不獎勵積分`);
      }

      // 發放積分（如果 pointsEarned > 0）
      if (pointsEarned > 0) {
        await connection.promise().query(
          'UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?',
          [pointsEarned, userId]
        );

        // 確保 points_history 表格存在
        await connection.promise().query(`
          CREATE TABLE IF NOT EXISTS points_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            points INT NOT NULL,
            type VARCHAR(50) DEFAULT 'task_reward',
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        let description = '';
        if (isPreset) description = `主線關卡首次完成獎勵`;
        else if (isEndless) description = `無限模式得分獎勵: ${score}分`;
        else description = `遊戲獎勵`;

        await connection.promise().query(
          `INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, 'game_reward', ?)`,
          [userId, pointsEarned, description]
        );

        console.log(`✅ 獎勵積分: ${pointsEarned}`);
      }

      // ========== 自動計算 MBTI（僅當四個維度都有非零分數時）==========
      let finalMbti = null;
      let totalScores = null;

      // 查詢使用者所有主線關卡的記錄
      const [allPresetResults] = await connection.promise().query(
        `SELECT level_id, play_data FROM mbti_game_results 
         WHERE user_id = ? AND level_id IN (?)`,
        [userId, PRESET_LEVEL_IDS]
      );

      // 篩選出有非零分數的記錄（即真正玩過的關卡）
      const nonZeroRecords = allPresetResults.filter(row => {
        if (!row.play_data || !row.play_data.scores) return false;
        return Object.values(row.play_data.scores).some(v => v > 0);
      });

      // 檢查這些記錄是否覆蓋了所有四個維度
      const nonZeroLevels = new Set(nonZeroRecords.map(r => r.level_id));
      const hasAllDimensionsWithScore = PRESET_LEVEL_IDS.every(id => nonZeroLevels.has(id));

      if (hasAllDimensionsWithScore) {
        // 累計所有分數
        totalScores = { E:0, I:0, S:0, N:0, T:0, F:0, J:0, P:0 };
        nonZeroRecords.forEach(row => {
          if (row.play_data && row.play_data.scores) {
            Object.entries(row.play_data.scores).forEach(([dim, val]) => {
              totalScores[dim] = (totalScores[dim] || 0) + val;
            });
          }
        });

        finalMbti = 
          (totalScores.E >= totalScores.I ? 'E' : 'I') +
          (totalScores.S >= totalScores.N ? 'S' : 'N') +
          (totalScores.T >= totalScores.F ? 'T' : 'F') +
          (totalScores.J >= totalScores.P ? 'J' : 'P');

        // 更新使用者 MBTI
        await connection.promise().query(
          'UPDATE users SET mbti = ? WHERE id = ?',
          [finalMbti, userId]
        );
        console.log(`✅ 自動更新用戶 MBTI 為: ${finalMbti}`);
      } else {
        console.log(`⏳ 尚未完成所有維度（有分數的記錄：${[...nonZeroLevels].join(', ') || '無'}`);
      }

      // 取得使用者最新積分
      const [user] = await connection.promise().query(
        'SELECT points FROM users WHERE id = ?',
        [userId]
      );
      const totalPoints = user[0]?.points || 0;

      // 返回結果
      res.json({ 
        success: true, 
        resultId: result.insertId,
        pointsEarned: pointsEarned,
        totalPoints: totalPoints,
        mbti: finalMbti,                     // 若完成所有主線且分數非零則回傳 MBTI，否則 null
        totalMbtiScores: totalScores,         // 累計分數，若未完成則為 null
      });
      
    } catch (error) {
      console.error('❌ 上傳遊戲結果失敗:', error);
      res.status(500).json({ 
        success: false, 
        error: '上傳失敗',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // =============================================
  // 獲取遊戲歷史
  // =============================================
  router.get('/game/history', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      
      const [results] = await connection.promise().query(
        `SELECT 
          id, level_id, game_type, calculated_mbti, score, 
          play_time_seconds, created_at 
         FROM mbti_game_results 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      );
      
      console.log(`📊 獲取遊戲歷史, userId: ${userId}, 記錄數: ${results.length}`);
      
      res.json({ 
        success: true, 
        history: results,
        count: results.length
      });
      
    } catch (error) {
      console.error('❌ 獲取遊戲歷史失敗:', error);
      res.status(500).json({ 
        success: false, 
        error: '獲取歷史失敗',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // =============================================
  // 獲取排行榜
  // =============================================
  router.get('/game/leaderboard', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      
      const [leaderboard] = await connection.promise().query(`
        SELECT 
          u.id,
          u.username,
          u.avatar,
          u.mbti,
          COUNT(DISTINCT gr.id) as games_played,
          COALESCE(SUM(gr.score), 0) as total_score,
          MAX(gr.score) as best_score
        FROM users u
        INNER JOIN mbti_game_results gr ON u.id = gr.user_id
        GROUP BY u.id, u.username, u.avatar, u.mbti
        ORDER BY total_score DESC, best_score DESC
        LIMIT ?
      `, [limit]);
      
      const formattedLeaderboard = leaderboard.map(user => ({
        ...user,
        avatar: user.avatar && !user.avatar.startsWith('http') 
          ? `${BASE_URL}${user.avatar}` 
          : user.avatar
      }));
      
      console.log(`🏆 獲取排行榜, 玩家數: ${formattedLeaderboard.length}`);
      
      res.json({ 
        success: true, 
        leaderboard: formattedLeaderboard,
        updated_at: new Date()
      });
      
    } catch (error) {
      console.error('❌ 獲取排行榜失敗:', error);
      res.status(500).json({ 
        success: false, 
        error: '獲取排行榜失敗',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // =============================================
  // 獲取遊戲統計
  // =============================================
  router.get('/game/stats', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const userId = req.user.id;
      
      const [userStats] = await connection.promise().query(`
        SELECT 
          COUNT(*) as total_games,
          COALESCE(SUM(score), 0) as total_score,
          COALESCE(AVG(score), 0) as average_score,
          MAX(score) as best_score,
          COALESCE(SUM(play_time_seconds), 0) as total_play_time,
          COUNT(DISTINCT level_id) as unique_levels_played
        FROM mbti_game_results 
        WHERE user_id = ?
      `, [userId]);
      
      const [mbtiStats] = await connection.promise().query(`
        SELECT calculated_mbti, COUNT(*) as count
        FROM mbti_game_results
        WHERE user_id = ? AND calculated_mbti IS NOT NULL
        GROUP BY calculated_mbti
        ORDER BY count DESC
        LIMIT 1
      `, [userId]);
      
      console.log(`📈 獲取遊戲統計, userId: ${userId}`);
      
      res.json({ 
        success: true, 
        stats: {
          ...userStats[0],
          favorite_mbti: mbtiStats[0]?.calculated_mbti || null,
          favorite_mbti_count: mbtiStats[0]?.count || 0
        }
      });
      
    } catch (error) {
      console.error('❌ 獲取遊戲統計失敗:', error);
      res.status(500).json({ 
        success: false, 
        error: '獲取統計失敗',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // =============================================
  // 獲取本週已用積分（無限模式）
  // =============================================
  router.get('/game/weekly-points', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const [weekly] = await connection.promise().query(
        `SELECT COALESCE(SUM(points), 0) as total 
         FROM points_history 
         WHERE user_id = ? 
           AND type = 'game_reward' 
           AND description LIKE '%無限模式%'
           AND created_at BETWEEN ? AND ?`,
        [userId, monday, sunday]
      );

      res.json({
        success: true,
        used: weekly[0].total,
        limit: WEEKLY_LIMIT,
        remaining: WEEKLY_LIMIT - weekly[0].total
      });
    } catch (error) {
      console.error('獲取每週積分失敗:', error);
      res.status(500).json({ success: false, error: '獲取失敗' });
    }
  });

  // =============================================
  // 取得使用者 MBTI 累計分數與已完成預設關卡
  // =============================================
  router.get('/game/mbti-scores', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const userId = req.user.id;
      const presetLevelIds = PRESET_LEVEL_IDS;

      const [results] = await connection.promise().query(
        `SELECT level_id, play_data FROM mbti_game_results 
         WHERE user_id = ? AND level_id IN (?)`,
        [userId, presetLevelIds]
      );

      const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
      const completedPresetLevels = [];

      results.forEach(row => {
        let hasNonZeroScore = false;
        if (row.play_data && row.play_data.scores) {
          Object.entries(row.play_data.scores).forEach(([dim, val]) => {
            scores[dim] = (scores[dim] || 0) + val;
            if (val > 0) hasNonZeroScore = true;
          });
        }
        // 只有當該關卡有非零分數時，才計入已完成
        if (hasNonZeroScore && !completedPresetLevels.includes(row.level_id)) {
          completedPresetLevels.push(row.level_id);
        }
      });

      res.json({
        success: true,
        scores,
        completedPresetLevels,
      });
    } catch (error) {
      console.error('❌ 獲取 MBTI 分數失敗:', error);
      res.status(500).json({ success: false, error: '獲取失敗' });
    }
  });

  // =============================================
  // 重置使用者 MBTI 進度（將分數歸零，保留記錄）
  // =============================================
  router.post('/game/reset-mbti', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const userId = req.user.id;
      const presetLevelIds = PRESET_LEVEL_IDS;

      // 查詢所有預設關卡的記錄
      const [results] = await connection.promise().query(
        'SELECT id, play_data FROM mbti_game_results WHERE user_id = ? AND level_id IN (?)',
        [userId, presetLevelIds]
      );

      for (const row of results) {
        const playData = row.play_data || {};
        // 將 scores 清零
        if (playData.scores) {
          Object.keys(playData.scores).forEach(key => {
            playData.scores[key] = 0;
          });
        } else {
          playData.scores = { E:0, I:0, S:0, N:0, T:0, F:0, J:0, P:0 };
        }
        // 清除 calculated_mbti
        playData.calculated_mbti = null;

        await connection.promise().query(
          'UPDATE mbti_game_results SET play_data = ? WHERE id = ?',
          [JSON.stringify(playData), row.id]
        );
      }

      // 同時清除使用者表的 mbti 欄位
      await connection.promise().query(
        'UPDATE users SET mbti = NULL WHERE id = ?',
        [userId]
      );

      res.json({
        success: true,
        message: 'MBTI 進度已重置（分數歸零，記錄保留）',
      });
    } catch (error) {
      console.error('❌ 重置 MBTI 失敗:', error);
      res.status(500).json({ success: false, error: '重置失敗' });
    }
  });
  
  return router;
};