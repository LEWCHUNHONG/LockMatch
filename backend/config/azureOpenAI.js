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

            const baseUrl = this.endpoint.replace(/\/$/, '');

            const url = `${baseUrl}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;

            console.log('🔗 請求 URL:', url);
            console.log('📦 請求 messages:', messages);

            const response = await axios.post(url, {
                messages: messages,
                max_tokens: 2000,
                temperature: 0.7
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                }
            });

            console.log('✅ Azure OpenAI 回應成功');
            return {
                content: response.data.choices[0].message.content
            };
        } catch (error) {
            console.error('❌ Azure OpenAI API 錯誤（詳細）:');
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

const initAzureOpenAI = () => {
    console.log('🔧 Azure OpenAI 配置:');
    console.log(`  Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
    console.log(`  Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT}`);
    console.log(`  API Version: ${process.env.AZURE_OPENAI_API_VERSION}`);

    return new SimpleAzureOpenAI();
};

module.exports = { initAzureOpenAI };