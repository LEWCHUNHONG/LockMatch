// routes/discuss.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const textAnalytics = require('../services/textAnalyticsService');

module.exports = (connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, postMediaUpload) => {


  // 發佈新帖子（支援文字或媒體）- 帶有內容安全檢查
  router.post('/posts', authMiddleware(JWT_SECRET), postMediaUpload.array('media', 10), async (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;

    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: '帖子必須有內容或媒體' });
    }

    // 如果有文字內容，進行安全檢查
    if (content && content.trim().length > 0) {
      // 移除這裡的 const textAnalytics = require('../services/textAnalyticsService');
      // 因為已經在頂部導入了

      const safetyCheck = await textAnalytics.checkCommentSafety(content, 'post');

      if (!safetyCheck.isSafe || safetyCheck.blocked) {
        // 清理已上傳的檔案
        if (req.files) {
          req.files.forEach((file) => fs.unlink(file.path, () => { }));
        }

        return res.status(403).json({
          success: false,
          error: '⚠️ 帖子內容審核未通過',
          message: safetyCheck.message || '您的言論包含不當內容，無法發布',
          details: {
            reasons: safetyCheck.reasons,
            score: safetyCheck.score,
            suggestion: '請修改內容後重新發佈'
          }
        });
      }
    }

    const mediaUrls = [];
    const mediaTypes = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const type = file.mimetype.split('/')[0];
        const subDir = type === 'video' ? 'videos' : 'images';
        const mediaUrl = `/uploads/post_media/${subDir}/${file.filename}`;
        mediaUrls.push(mediaUrl);
        mediaTypes.push(type === 'video' ? 'video' : 'image');
      });
    }

    // 計算安全評分
    let safetyScore = 0;
    if (content && content.trim().length > 0) {
      const safetyCheck = await textAnalytics.checkCommentSafety(content, 'post');
      safetyScore = safetyCheck.score;
    }

    connection.query(
      'INSERT INTO posts (user_id, content, media_urls, media_types, safety_score, is_approved) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userId,
        content || '',
        JSON.stringify(mediaUrls),
        JSON.stringify(mediaTypes),
        safetyScore,
        1  // 默認通過審核
      ],
      (err, result) => {
        if (err) {
          // 如果插入失敗，刪除已上傳文件
          if (req.files) {
            req.files.forEach((file) => fs.unlink(file.path, () => { }));
          }
          console.error('插入失敗:', err);
          return res.status(500).json({ error: '發布失敗' });
        }
        res.json({
          success: true,
          postId: result.insertId,
          safetyScore: safetyScore
        });
      }
    );
  });

  // 獲取帖子列表（時間線，按時間倒序）
  router.get('/posts', authMiddleware(JWT_SECRET), (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    connection.query(
      `SELECT 
      p.id, p.content, p.media_urls, p.media_types, p.created_at,
      u.id as user_id, u.username, u.avatar,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset],
      (err, results) => {
        if (err) {
          console.error('獲取帖子列表失敗:', err);
          return res.status(500).json({ error: '獲取失敗' });
        }

        // 解析 JSON 為陣列
        const formattedPosts = results.map(post => ({
          ...post,
          media_urls: post.media_urls ? JSON.parse(post.media_urls) : [],
          media_types: post.media_types ? JSON.parse(post.media_types) : []
        }));

        res.json({ success: true, posts: formattedPosts });
      }
    );
  });


  // 添加評論 - 帶有內容安全檢查
  router.post('/posts/:postId/comment', authMiddleware(JWT_SECRET), async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // 1. 內容安全檢查 - 使用頂部導入的 textAnalytics
    const safetyCheck = await textAnalytics.checkCommentSafety(content, 'comment');

    if (!safetyCheck.isSafe || safetyCheck.blocked) {
      return res.status(403).json({
        success: false,
        error: '⚠️ 評論內容審核未通過',
        message: safetyCheck.message || '您的言論包含不當內容，無法發布',
        details: {
          reasons: safetyCheck.reasons,
          score: safetyCheck.score,
          suggestion: '請修改內容後重新發佈'
        }
      });
    }

    // 2. 檢查帖子是否存在
    connection.query(
      'SELECT id FROM posts WHERE id = ?',
      [postId],
      (err, results) => {
        if (err) {
          console.error('檢查帖子失敗:', err);
          return res.status(500).json({ error: '伺服器錯誤' });
        }
        if (results.length === 0) {
          return res.status(404).json({ error: '帖子不存在' });
        }

        // 3. 插入評論到數據庫（添加安全評分）
        connection.query(
          'INSERT INTO post_comments (post_id, user_id, content, safety_score, is_approved, moderation_reason, moderated_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [
            postId,
            userId,
            content.trim(),
            safetyCheck.score,
            safetyCheck.isSafe ? 1 : 0,
            safetyCheck.reasons?.join('; ') || null
          ],
          (err, result) => {
            if (err) {
              console.error('添加評論失敗:', err);
              return res.status(500).json({ error: '添加失敗' });
            }

            // 4. 返回成功響應
            res.json({
              success: true,
              commentId: result.insertId,
              safetyCheck: {
                isSafe: safetyCheck.isSafe,
                score: safetyCheck.score,
                message: '評論發布成功'
              }
            });
          }
        );
      }
    );
  });


  // 獲取單個貼文 - 修正版
  router.get('/posts/:id', authMiddleware(JWT_SECRET), (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`正在獲取貼文 ID: ${id}, 用戶 ID: ${userId}`);

    connection.query(
      `SELECT 
    p.id, p.content, p.media_urls, p.media_types, p.created_at, p.safety_score, p.is_approved,
    u.id as user_id, u.username, u.avatar,
    COUNT(DISTINCT pl.id) as like_count,
    IF(MAX(pl2.user_id) IS NOT NULL, 1, 0) as is_liked_by_me,
    COUNT(DISTINCT pc.id) as comment_count
  FROM posts p
  JOIN users u ON p.user_id = u.id
  LEFT JOIN post_likes pl ON p.id = pl.post_id
  LEFT JOIN post_likes pl2 ON p.id = pl2.post_id AND pl2.user_id = ?
  LEFT JOIN post_comments pc ON p.id = pc.post_id
  WHERE p.id = ?
  GROUP BY p.id, u.id`,
      [userId, id],
      (err, results) => {
        if (err) {
          console.error('獲取貼文失敗:', err);
          return res.status(500).json({
            success: false,
            error: '伺服器錯誤',
            details: err.message
          });
        }
        if (results.length === 0) {
          console.log(`貼文 ID ${id} 不存在`);
          return res.status(404).json({
            success: false,
            error: '貼文不存在'
          });
        }

        console.log(`成功找到貼文 ID: ${id}`);

        // 解析 JSON 字段
        const post = results[0];
        let media_urls = [];
        let media_types = [];

        try {
          if (post.media_urls) {
            media_urls = JSON.parse(post.media_urls);
          }
          if (post.media_types) {
            media_types = JSON.parse(post.media_types);
          }
        } catch (parseErr) {
          console.warn('解析媒體 URL/類型失敗:', parseErr);
        }

        const formattedPost = {
          id: post.id,
          content: post.content || '',
          media_urls: media_urls,
          media_types: media_types,
          created_at: post.created_at,
          user_id: post.user_id,
          username: post.username,
          avatar: post.avatar,
          like_count: post.like_count || 0,
          is_liked_by_me: post.is_liked_by_me || 0,
          comment_count: post.comment_count || 0,
          safety_score: post.safety_score || 0,
          is_approved: post.is_approved || 1
        };

        res.json({
          success: true,
          post: formattedPost
        });
      }
    );
  });

  // 點讚/取消點讚
  router.post('/posts/:postId/like', authMiddleware(JWT_SECRET), (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    // 檢查是否已點讚
    connection.query(
      'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId],
      (err, results) => {
        if (err) return res.status(500).json({ error: '資料庫錯誤' });

        if (results.length > 0) {
          // 取消點讚
          connection.query(
            'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId],
            (err) => {
              if (err) return res.status(500).json({ error: '取消點讚失敗' });
              res.json({ success: true, liked: false });
            }
          );
        } else {
          // 添加點讚
          connection.query(
            'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
            [postId, userId],
            (err) => {
              if (err) return res.status(500).json({ error: '點讚失敗' });
              res.json({ success: true, liked: true });
            }
          );
        }
      }
    );
  });

  // 添加評論
  router.post('/posts/:postId/comment', authMiddleware(JWT_SECRET), (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '評論內容不能為空' });
    }

    connection.query(
      'INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, userId, content.trim()],
      (err, result) => {
        if (err) {
          console.error('添加評論失敗:', err);
          return res.status(500).json({ error: '添加失敗' });
        }
        res.json({ success: true, commentId: result.insertId });
      }
    );
  });

  // 獲取評論列表
  router.get('/posts/:postId/comments', authMiddleware(JWT_SECRET), (req, res) => {
    const { postId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    connection.query(
      `SELECT 
      c.id, c.content, c.created_at,
      u.id as user_id, u.username, u.avatar
    FROM post_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?`,
      [postId, limit, offset],
      (err, results) => {
        if (err) {
          console.error('獲取評論失敗:', err);
          return res.status(500).json({ error: '獲取失敗' });
        }
        res.json({ success: true, comments: results });
      }
    );
  });

  // 刪除評論
  router.delete('/posts/:postId/comments/:commentId', authMiddleware(JWT_SECRET), async (req, res) => {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    try {
      // 檢查評論是否存在並屬於當前用戶
      const [comment] = await connection.promise().query(
        'SELECT * FROM post_comments WHERE id = ? AND post_id = ? AND user_id = ?',
        [commentId, postId, userId]
      );

      if (comment.length === 0) {
        return res.status(404).json({ error: '評論不存在或無權限刪除' });
      }

      // 刪除評論
      await connection.promise().query('DELETE FROM post_comments WHERE id = ?', [commentId]);

      res.json({ success: true, message: '評論已刪除' });
    } catch (err) {
      console.error('刪除評論失敗:', err);
      res.status(500).json({ error: '伺服器錯誤' });
    }
  });

  // 刪除貼文（同時刪除伺服器上的媒體檔案）
  router.delete('/posts/:id', authMiddleware(JWT_SECRET), async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
      // 1. 檢查貼文是否存在且屬於當前用戶
      const [postRows] = await connection.promise().query(
        'SELECT user_id, media_urls FROM posts WHERE id = ?',
        [postId]
      );

      if (postRows.length === 0) {
        return res.status(404).json({ success: false, message: '貼文不存在' });
      }

      if (postRows[0].user_id !== userId) {
        return res.status(403).json({ success: false, message: '無權刪除此貼文' });
      }

      // 2. 解析 media_urls 並刪除實體檔案
      let mediaUrls = [];
      if (postRows[0].media_urls) {
        try {
          mediaUrls = JSON.parse(postRows[0].media_urls);
        } catch (parseErr) {
          console.warn('media_urls 解析失敗:', parseErr);
        }
      }

      // 刪除每個媒體檔案
      mediaUrls.forEach((url) => {
        if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;

        const filePath = path.join(process.cwd(), url);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);

          } catch (unlinkErr) {

            // 不中斷流程
          }
        }
      });

      // 3. 刪除資料庫記錄
      await connection.promise().query('DELETE FROM post_comments WHERE post_id = ?', [postId]);
      await connection.promise().query('DELETE FROM post_likes WHERE post_id = ?', [postId]);
      await connection.promise().query('DELETE FROM posts WHERE id = ?', [postId]);

      res.json({
        success: true,
        message: '貼文及相關媒體已成功刪除'
      });

    } catch (err) {
      console.error('刪除貼文失敗:', err);
      res.status(500).json({
        success: false,
        message: '刪除貼文失敗，請稍後再試'
      });
    }
  });

  // 更新貼文 - 修正版
  router.put('/posts/:id', authMiddleware(JWT_SECRET), postMediaUpload.array('media', 10), async (req, res) => {
    const postId = req.params.id;
    const { content, removeMedia } = req.body;
    const userId = req.user.id;
    const newMediaFiles = req.files || [];

    try {
      // 1. 檢查貼文是否存在且屬於當前用戶
      const [postRows] = await connection.promise().query(
        'SELECT * FROM posts WHERE id = ? AND user_id = ?',
        [postId, userId]
      );

      if (postRows.length === 0) {
        return res.status(404).json({ success: false, message: '貼文不存在或無權限編輯' });
      }

      const existingPost = postRows[0];

      // 2. 內容安全檢查
      if (content && content.trim().length > 0) {
        const safetyCheck = await textAnalytics.checkCommentSafety(content.trim(), 'post');

        if (!safetyCheck.isSafe || safetyCheck.blocked) {
          // 清理已上傳的新檔案
          if (newMediaFiles.length > 0) {
            newMediaFiles.forEach(file => {
              try {
                fs.unlinkSync(file.path);
              } catch (unlinkErr) {
                console.warn('清理新媒體檔案失敗:', unlinkErr);
              }
            });
          }

          return res.status(403).json({
            success: false,
            error: '⚠️ 貼文內容審核未通過',
            message: safetyCheck.message || '您的言論包含不當內容，無法更新',
            details: {
              reasons: safetyCheck.reasons,
              score: safetyCheck.score,
              suggestion: '請修改內容後重新更新'
            }
          });
        }
      }

      // 3. 解析現有媒體
      let mediaUrls = existingPost.media_urls ? JSON.parse(existingPost.media_urls) : [];
      let mediaTypes = existingPost.media_types ? JSON.parse(existingPost.media_types) : [];

      // 4. 處理要刪除的舊媒體
      if (removeMedia) {
        let removeList;
        try {
          removeList = JSON.parse(removeMedia);
          if (!Array.isArray(removeList)) removeList = [];
        } catch (e) {
          removeList = [];
        }

        // 刪除實體檔案
        removeList.forEach((url) => {
          if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;
          const mediaPath = path.join(process.cwd(), url);
          if (fs.existsSync(mediaPath)) {
            try {
              fs.unlinkSync(mediaPath);
            } catch (unlinkErr) {
              console.warn('無法刪除舊媒體檔案:', unlinkErr);
            }
          }
        });

        // 從陣列中移除
        mediaUrls = mediaUrls.filter(url => !removeList.includes(url));
        mediaTypes = mediaTypes.filter((_, index) => !removeList.includes(mediaUrls[index]));
      }

      // 5. 處理新上傳的媒體
      const newMediaUrls = [];
      const newMediaTypes = [];

      if (newMediaFiles.length > 0) {
        newMediaFiles.forEach(file => {
          const type = file.mimetype.split('/')[0];
          const subDir = type === 'video' ? 'videos' : 'images';
          const mediaUrl = `/uploads/post_media/${subDir}/${file.filename}`;
          newMediaUrls.push(mediaUrl);
          newMediaTypes.push(type === 'video' ? 'video' : 'image');
        });
      }

      // 合併新舊媒體
      mediaUrls = [...mediaUrls, ...newMediaUrls];
      mediaTypes = [...mediaTypes, ...newMediaTypes];

      // 6. 計算安全評分
      let safetyScore = existingPost.safety_score || 0;
      if (content && content.trim().length > 0) {
        const safetyCheck = await textAnalytics.checkCommentSafety(content.trim(), 'post');
        safetyScore = safetyCheck.score;
      }

      // 7. 更新資料庫 - 修正 SQL，移除 updated_at
      await connection.promise().query(
        'UPDATE posts SET content = ?, media_urls = ?, media_types = ?, safety_score = ?, is_approved = ? WHERE id = ?',
        [
          content?.trim() || existingPost.content || '',
          JSON.stringify(mediaUrls),
          JSON.stringify(mediaTypes),
          safetyScore,
          safetyScore >= 0.7 ? 1 : 1, // 根據安全評分決定是否通過
          postId
        ]
      );

      // 8. 回傳更新後的貼文
      const updatedPost = {
        id: postId,
        content: content?.trim() || existingPost.content,
        media_urls: mediaUrls,
        media_types: mediaTypes,
        safety_score: safetyScore,
        created_at: existingPost.created_at,
        updated_at: new Date().toISOString() // 只在返回數據中記錄，不存到資料庫
      };

      res.json({
        success: true,
        message: '貼文已更新',
        post: updatedPost
      });

    } catch (err) {
      console.error('更新貼文失敗:', err);

      // 清理新上傳但失敗的檔案
      if (newMediaFiles.length > 0) {
        newMediaFiles.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkErr) {
            console.warn('清理新媒體檔案失敗:', unlinkErr);
          }
        });
      }

      res.status(500).json({
        success: false,
        message: '更新貼文失敗，請稍後再試',
        error: err.message
      });
    }
  });

  // 獲取朋友圈貼文（只顯示朋友的貼文，不包括自己）
  router.get('/friend-posts', authMiddleware(JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 15;
    const offset = parseInt(req.query.offset) || 0;

    try {
      // 步驟1: 找出所有朋友的 user ID（雙向關係，不包含自己）
      const [friendRows] = await connection.promise().query(`
      SELECT user2_id AS friend_id
      FROM friendships
      WHERE user1_id = ? AND status = 'accepted'
      UNION
      SELECT user1_id AS friend_id
      FROM friendships
      WHERE user2_id = ? AND status = 'accepted'
    `, [userId, userId]);

      if (friendRows.length === 0) {
        return res.json({ success: true, posts: [] });
      }

      const friendIds = friendRows.map(row => row.friend_id);

      // 步驟2: 動態生成 IN clause 的 ? 占位符
      const placeholders = friendIds.map(() => '?').join(', ');
      const sql = `
      SELECT
        p.*,
        u.username,
        u.avatar,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked_by_me,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id IN (${placeholders})
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

      // 參數順序：先 is_liked_by_me 的 userId，再 friendIds，再 limit/offset
      const params = [userId, ...friendIds, limit, offset];

      const [posts] = await connection.promise().query(sql, params);

      // 處理媒體與頭像（保持相對路徑，讓前端統一加上 baseURL）
      posts.forEach(post => {
        if (post.media_urls) {
          try {
            post.media_urls = JSON.parse(post.media_urls);
          } catch (e) {
            post.media_urls = [];
          }
        }
        // avatar 保持相對路徑
        if (post.avatar && post.avatar.startsWith('http')) {
          // 如果後端不小心加了 http，可選擇這裡移除，但建議統一由前端處理
        }
      });

      res.json({ success: true, posts });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '伺服器錯誤'
      });
    }
  });

  return router;
};