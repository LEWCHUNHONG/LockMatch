// controllers/commentController.js
const textAnalytics = require('../services/textAnalytics');

exports.createComment = async (req, res) => {
    try {
        const { content, postId } = req.body;
        const userId = req.user.id;

        // 1. 基本驗證
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: '評論內容不能為空'
            });
        }

        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                message: '評論內容太長（最多1000字）'
            });
        }

        // 2. Azure Text Analytics 檢查
        const safetyCheck = await textAnalytics.checkContentSafety(content);

        if (!safetyCheck.isSafe) {
            return res.status(403).json({
                success: false,
                message: '⚠️ 內容審核未通過',
                details: {
                    reason: safetyCheck.reasons.join('；'),
                    score: safetyCheck.score,
                    suggestion: '請修改內容後重新發佈'
                }
            });
        }

        // 3. 保存到數據庫
        const [result] = await db.execute(
            `INSERT INTO comments (user_id, post_id, content, sentiment_score, is_approved, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
            [
                userId,
                postId,
                content,
                safetyCheck.score,
                safetyCheck.isSafe ? 1 : 0
            ]
        );

        // 4. 返回成功響應
        res.status(201).json({
            success: true,
            message: '評論發佈成功',
            data: {
                commentId: result.insertId,
                safetyCheck: {
                    score: safetyCheck.score,
                    isSafe: safetyCheck.isSafe
                }
            }
        });

    } catch (error) {
        console.error('創建評論錯誤:', error);
        res.status(500).json({
            success: false,
            message: '發佈評論時發生錯誤',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};