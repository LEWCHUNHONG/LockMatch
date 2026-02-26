// config/azureOpenAI.js
const axios = require('axios');

class SimpleAzureOpenAI {
    constructor() {
        this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        this.apiKey = process.env.AZURE_OPENAI_API_KEY;
        this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
        this.apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    }

    async invoke(messages) {
        try {
            // 構建完整 URL，你嘅 endpoint 已經包含路徑，所以要小心拼接
            const baseUrl = this.endpoint.endsWith('/') ? this.endpoint : this.endpoint + '/';
            const url = `${baseUrl}openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;

            const response = await axios.post(url, {
                messages: Array.isArray(messages) ? messages : [{ role: "user", content: messages }],
                max_tokens: 1000,
                temperature: 0.7
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                }
            });

            return {
                content: response.data.choices[0].message.content
            };
        } catch (error) {
            console.error('Azure OpenAI API 錯誤:', error.response?.data || error.message);
            throw error;
        }
    }
}

const initAzureOpenAI = () => {
    console.log('🔧 Azure OpenAI 配置:');
    console.log(`  Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
    console.log(`  Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT}`);
    console.log(`  API Version: ${process.env.AZURE_OPENAI_API_VERSION}`);

    return new SimpleAzureOpenAI();
};

module.exports = { initAzureOpenAI };