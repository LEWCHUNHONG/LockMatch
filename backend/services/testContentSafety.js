// services/testContentSafety.js
const textAnalytics = require('./textAnalyticsService');

async function testContentSafety() {
    console.log('🚀 開始內容安全測試...\n');

    const testCases = [
        { content: "這是一個很棒的評論！", type: "comment" },
        { content: "我討厭這個東西，真是垃圾！", type: "comment" },
        { content: "我的電話是 0912-345-678", type: "comment" },
        { content: "我想死，生活沒有意義", type: "comment" },
        { content: "明天要去殺了他", type: "comment" },
        { content: "你真是一個笨蛋", type: "comment" },
        { content: "感謝分享，很有幫助", type: "comment" },
        { content: "", type: "comment" },
        { content: "x".repeat(1500), type: "comment" }
    ];

    for (let i = 0; i < testCases.length; i++) {
        const test = testCases[i];
        console.log(`測試 ${i + 1}: "${test.content.substring(0, 50)}${test.content.length > 50 ? '...' : ''}"`);

        const result = await textAnalytics.checkCommentSafety(test.content, test.type);

        console.log(`  類型: ${test.type}`);
        console.log(`  結果: ${result.isSafe ? '✅ 安全' : '❌ 不安全'}`);
        console.log(`  評分: ${result.score}`);
        console.log(`  訊息: ${result.message}`);
        if (result.reasons && result.reasons.length > 0) {
            console.log(`  原因: ${result.reasons.join(', ')}`);
        }
        console.log('---\n');
    }
}

testContentSafety();