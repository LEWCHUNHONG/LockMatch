const OpenAI = require('openai');
require('dotenv').config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const modelName = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

// 構造完整嘅 baseURL，同 curl 一模一樣
const baseURL = `${endpoint}/openai/deployments/${modelName}`;

const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    defaultQuery: { 'api-version': apiVersion }  // 仍然保留，確保有 api-version
});

async function main() {
    try {
        const completion = await client.chat.completions.create({
            messages: [
                { role: "user", content: "你好！介紹吓你自己，同埋話我知你可以幫我做啲咩？" }
            ],
            model: '',        // 因為 baseURL 已有 deployment，呢度可以留空
            max_tokens: 500,
            temperature: 0.7
        });

        console.log('✅ 成功!');
        console.log('🤖 回應:', completion.choices[0].message.content);
        console.log('\n📊 使用統計:');
        console.log('  Prompt tokens:', completion.usage?.prompt_tokens);
        console.log('  Completion tokens:', completion.usage?.completion_tokens);
        console.log('  Total tokens:', completion.usage?.total_tokens);
    } catch (error) {
        console.error('❌ 錯誤:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

main();