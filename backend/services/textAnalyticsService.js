// services/textAnalyticsService.js
const axios = require('axios');

class TextAnalyticsService {
    constructor() {
        this.endpoint = process.env.AZURE_TEXT_ANALYTICS_ENDPOINT;
        this.apiKey = process.env.AZURE_TEXT_ANALYTICS_API_KEY;
        this.enabled = !!this.endpoint && !!this.apiKey;

        if (this.enabled) {
            console.log('✅ Azure Text Analytics 已啟用');
        } else {
            console.log('⚠️  Azure Text Analytics 未配置，使用本地過濾');
        }
    }

    /**
     * 檢查評論內容是否安全
     */
    async checkCommentSafety(content, contentType = 'comment') {
        // 基本檢查
        if (!content || content.trim().length === 0) {
            return {
                isSafe: false,
                blocked: true,
                score: 1.0,
                reasons: ['內容不能為空'],
                message: `${contentType === 'comment' ? '評論' : '貼文'}內容不能為空`
            };
        }

        const trimmedContent = content.trim();

        if (trimmedContent.length > 1000) {
            return {
                isSafe: false,
                blocked: true,
                score: 0.8,
                reasons: ['內容太長（最多1000字）'],
                message: `${contentType === 'comment' ? '評論' : '貼文'}內容太長`
            };
        }

        // 如果有 Azure 服務，使用 Azure 檢查
        if (this.enabled) {
            try {
                const result = await this.checkWithAzure(trimmedContent, contentType);
                return result;
            } catch (error) {
                console.error('Azure 檢查失敗，使用本地檢查:', error.message);
                return this.checkLocally(trimmedContent, contentType);
            }
        }

        // 否則使用本地檢查
        return this.checkLocally(trimmedContent, contentType);
    }

    /**
     * 使用 Azure Text Analytics 檢查
     */
    async checkWithAzure(content, contentType) {
        try {
            // 1. 情感分析
            const sentimentResult = await this.analyzeSentiment(content);

            // 2. PII 檢測（個人敏感信息）
            const piiResult = await this.detectPii(content);

            let isSafe = true;
            let reasons = [];
            let score = 0;

            // 檢查負面情感
            if (sentimentResult.success && sentimentResult.confidenceScores.negative > 0.7) {
                score = sentimentResult.confidenceScores.negative;
                reasons.push(`負面情緒過高: ${(score * 100).toFixed(1)}%`);
                isSafe = false;
            }

            // 檢查敏感信息
            if (piiResult.success && piiResult.hasSensitiveInfo) {
                const sensitiveTypes = piiResult.entities.map(e => e.category).join(', ');
                reasons.push(`包含敏感個人信息: ${sensitiveTypes}`);
                score = Math.max(score, 0.8);
                isSafe = false;
            }

            // 本地關鍵詞檢查作為補充
            const localCheck = this.checkLocalKeywords(content);
            if (!localCheck.isSafe) {
                reasons = [...reasons, ...localCheck.reasons];
                score = Math.max(score, localCheck.score);
                isSafe = false;
            }

            return {
                isSafe,
                blocked: !isSafe,
                score,
                reasons,
                message: isSafe ? '內容安全' : '內容包含不當言論',
                details: {
                    sentiment: sentimentResult,
                    pii: piiResult,
                    localCheck: localCheck
                }
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Azure 情感分析
     */
    async analyzeSentiment(text) {
        try {
            const response = await axios.post(
                `${this.endpoint}/text/analytics/v3.1/sentiment`,
                {
                    documents: [
                        {
                            id: "1",
                            language: "zh-Hant",
                            text: text.substring(0, 5120)
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Ocp-Apim-Subscription-Key': this.apiKey
                    },
                    timeout: 5000
                }
            );

            const document = response.data.documents[0];

            return {
                success: true,
                sentiment: document.sentiment,
                confidenceScores: document.confidenceScores
            };

        } catch (error) {
            console.error('❌ 情感分析錯誤:', error.message);
            return {
                success: false,
                sentiment: 'neutral',
                confidenceScores: { positive: 0, neutral: 1, negative: 0 }
            };
        }
    }

    /**
     * Azure PII 檢測
     */
    async detectPii(text) {
        try {
            const response = await axios.post(
                `${this.endpoint}/text/analytics/v3.1/entities/recognition/pii`,
                {
                    documents: [
                        {
                            id: "1",
                            language: "zh-Hant",
                            text: text.substring(0, 5120)
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Ocp-Apim-Subscription-Key': this.apiKey
                    }
                }
            );

            const piiEntities = response.data.documents[0]?.entities || [];
            const hasSensitiveInfo = piiEntities.length > 0;

            return {
                success: true,
                hasSensitiveInfo,
                entities: piiEntities
            };

        } catch (error) {
            console.error('❌ PII 檢測錯誤:', error.message);
            return { success: false, hasSensitiveInfo: false, entities: [] };
        }
    }

    /**
     * 本地關鍵詞檢查
     */
    checkLocalKeywords(text) {
        const bannedWords = [
            // 仇恨言論
            '去死', '殺了你', '廢物', '垃圾', '白痴', '笨蛋', '蠢貨',
            // 歧視性語言
            '殘廢', '智障', '腦殘', '弱智', '瘋子', '神經病',
            // 暴力威脅
            '打死你', '砍死', '燒死', '炸死', '殺人', '放火',
            // 粗口
            '幹你', '操你', '媽的', '他媽的', '王八蛋',
            // 英文
            'fuck', 'shit', 'asshole', 'bastard', 'bitch', 'die', 'kill',
            // 極端言論
            '自殺', '想死', '不想活', '結束生命'
        ];

        const warningWords = [
            '討厭', '恨你', '煩死了', '氣死',
            'hate', 'stupid', 'idiot', 'moron'
        ];

        const lowerText = text.toLowerCase();
        const foundBanned = bannedWords.filter(word => lowerText.includes(word.toLowerCase()));
        const foundWarning = warningWords.filter(word => lowerText.includes(word.toLowerCase()));

        let isSafe = foundBanned.length === 0;
        let score = foundBanned.length * 0.3 + foundWarning.length * 0.1;
        score = Math.min(1, score);

        return {
            isSafe,
            score,
            reasons: [
                ...foundBanned.map(w => `禁止詞彙: ${w}`),
                ...foundWarning.map(w => `警告詞彙: ${w}`)
            ]
        };
    }

    /**
     * 純本地檢查（無 Azure 時使用）
     */
    checkLocally(content, contentType) {
        const localCheck = this.checkLocalKeywords(content);

        return {
            isSafe: localCheck.isSafe,
            blocked: !localCheck.isSafe,
            score: localCheck.score,
            reasons: localCheck.reasons,
            message: localCheck.isSafe
                ? '內容安全'
                : `${contentType === 'comment' ? '評論' : '貼文'}包含不當言論`,
            details: {
                isLocalCheck: true
            }
        };
    }
}

module.exports = new TextAnalyticsService();