// config/deepseekAI.js
const OpenAI = require('openai');

class SimpleDeepSeekAI {
    constructor() {
        this.client = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY,
        });
    }

    async invoke(messages, options = {}) {
        try {
            console.log('🔗 呼叫 DeepSeek API...');

            const completion = await this.client.chat.completions.create({
                messages: messages,
                model: "deepseek-v4-flash",
                max_tokens: options.max_tokens || 2000,
                temperature: options.temperature || 0.7,
                
                // 控制思考模式
                thinking: options.thinking || { type: "disabled" },   // 預設關閉思考模式
                // thinking: { type: "enabled" }   // 開啟思考模式
            });

            console.log('✅ DeepSeek 回應成功');
            return {
                content: completion.choices[0].message.content
            };
        } catch (error) {
            console.error('❌ DeepSeek API 錯誤:');
            if (error.response) {
                console.error('  Status:', error.response.status);
                console.error('  Data:', error.response.data);
            } else {
                console.error('  Message:', error.message);
            }
            throw error;
        }
    }
}

const initDeepSeekAI = () => {
    console.log('🔧 DeepSeek AI 配置 (v4-flash)');
    return new SimpleDeepSeekAI();
};

module.exports = { initDeepSeekAI };