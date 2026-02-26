// data/mbti-questions.js
export const MBTI_GAME_SCENES = [
  {
    id: 1,
    title: "派對社交場景",
    description: "你被邀請參加一個大型派對，現場人很多...",
    question: "你會如何度過這個夜晚？",
    options: [
      {
        text: "主動與陌生人聊天，認識新朋友",
        mbti: { E: 2, S: 1 },
        icon: "account-group",
        color: "#FF6B6B"
      },
      {
        text: "找個安靜角落觀察人群，或與熟悉的朋友聊天",
        mbti: { I: 2, N: 1 },
        icon: "eye",
        color: "#4ECDC4"
      },
      {
        text: "組織大家玩有趣的團體遊戲",
        mbti: { E: 1, J: 2 },
        icon: "gamepad-variant",
        color: "#FFD166"
      },
      {
        text: "思考派對背後的社交意義，想像不同人的故事",
        mbti: { I: 1, N: 2 },
        icon: "thought-bubble",
        color: "#06D6A0"
      }
    ]
  },
  {
    id: 2,
    title: "旅行規劃挑戰",
    description: "你和朋友計劃一次旅行，需要決定行程安排...",
    question: "你會如何規劃這次旅行？",
    options: [
      {
        text: "制定詳細的行程表，包括時間和預算",
        mbti: { J: 2, S: 1 },
        icon: "calendar-clock",
        color: "#118AB2"
      },
      {
        text: "隨遇而安，看心情決定每天做什麼",
        mbti: { P: 2, N: 1 },
        icon: "weather-sunny",
        color: "#EF476F"
      },
      {
        text: "研究最有效率的路線和最佳性價比方案",
        mbti: { T: 2, J: 1 },
        icon: "chart-timeline",
        color: "#073B4C"
      },
      {
        text: "優先考慮大家的情感和體驗，讓每個人都開心",
        mbti: { F: 2, P: 1 },
        icon: "heart",
        color: "#FF6B6B"
      }
    ]
  },
  {
    id: 3,
    title: "創意工作坊",
    description: "公司舉辦創意比賽，需要解決一個實際問題...",
    question: "你的創新方法是？",
    options: [
      {
        text: "分析現有數據，找出最可靠的解決方案",
        mbti: { S: 2, T: 1 },
        icon: "chart-box",
        color: "#118AB2"
      },
      {
        text: "跳出框架，提出從未有人想過的全新點子",
        mbti: { N: 2, P: 1 },
        icon: "lightbulb-on",
        color: "#FFD166"
      },
      {
        text: "先做市場調研，確保方案符合用戶需求",
        mbti: { S: 1, F: 2 },
        icon: "account-search",
        color: "#06D6A0"
      },
      {
        text: "建立完整的理論模型，然後測試驗證",
        mbti: { N: 1, T: 2 },
        icon: "atom",
        color: "#4ECDC4"
      }
    ]
  },
  {
    id: 4,
    title: "團隊危機處理",
    description: "團隊中兩位成員發生激烈爭執...",
    question: "你會如何處理這場衝突？",
    options: [
      {
        text: "直接介入調解，幫助雙方達成共識",
        mbti: { E: 2, F: 1 },
        icon: "handshake",
        color: "#FF6B6B"
      },
      {
        text: "分析衝突的根本原因，提供邏輯解決方案",
        mbti: { T: 2, I: 1 },
        icon: "magnify",
        color: "#073B4C"
      },
      {
        text: "先讓雙方冷靜，然後單獨與每個人談心",
        mbti: { I: 2, F: 1 },
        icon: "chat-processing",
        color: "#4ECDC4"
      },
      {
        text: "提出新的合作框架，讓大家重新聚焦目標",
        mbti: { N: 2, J: 1 },
        icon: "target",
        color: "#118AB2"
      }
    ]
  },
  {
    id: 5,
    title: "學習新技能",
    description: "你需要學習一項完全陌生的新技能...",
    question: "你的學習策略是？",
    options: [
      {
        text: "找實體課程，透過動手操作來學習",
        mbti: { S: 2, E: 1 },
        icon: "hammer-wrench",
        color: "#EF476F"
      },
      {
        text: "閱讀大量理論書籍，徹底理解原理",
        mbti: { N: 2, I: 1 },
        icon: "book-open-variant",
        color: "#06D6A0"
      },
      {
        text: "制定學習計畫，按部就班完成每個階段",
        mbti: { J: 2, T: 1 },
        icon: "clipboard-check",
        color: "#118AB2"
      },
      {
        text: "邊做邊學，遇到問題再尋找答案",
        mbti: { P: 2, S: 1 },
        icon: "compass",
        color: "#FFD166"
      }
    ]
  },
  {
    id: 6,
    title: "緊急狀況應對",
    description: "突然發生緊急事件，需要立即做出反應...",
    question: "你的第一反應是？",
    options: [
      {
        text: "冷靜評估情況，制定應對步驟",
        mbti: { T: 2, J: 1 },
        icon: "brain",
        color: "#073B4C"
      },
      {
        text: "立即行動，相信自己的直覺判斷",
        mbti: { P: 2, N: 1 },
        icon: "lightning-bolt",
        color: "#FFD166"
      },
      {
        text: "確保每個人都安全，照顧他人情緒",
        mbti: { F: 2, E: 1 },
        icon: "shield-heart",
        color: "#FF6B6B"
      },
      {
        text: "觀察細節，尋找最可靠的解決方案",
        mbti: { S: 2, I: 1 },
        icon: "magnify-scan",
        color: "#4ECDC4"
      }
    ]
  },
  {
    id: 7,
    title: "腦力激盪會議",
    description: "團隊進行腦力激盪，需要產生新想法...",
    question: "你的貢獻方式是？",
    options: [
      {
        text: "踴躍發言，即時提供許多點子",
        mbti: { E: 2, P: 1 },
        icon: "microphone",
        color: "#EF476F"
      },
      {
        text: "先傾聽，再提出深思熟慮的完整方案",
        mbti: { I: 2, J: 1 },
        icon: "head-lightbulb",
        color: "#06D6A0"
      },
      {
        text: "用具體案例說明想法的可行性",
        mbti: { S: 2, T: 1 },
        icon: "chart-bell-curve",
        color: "#118AB2"
      },
      {
        text: "將不同想法連結，創造全新概念",
        mbti: { N: 2, P: 1 },
        icon: "vector-link",
        color: "#4ECDC4"
      }
    ]
  },
  {
    id: 8,
    title: "個人充電時光",
    description: "經歷忙碌一周後，你有完全自由的時間...",
    question: "你會如何度過這天？",
    options: [
      {
        text: "約朋友出去，參加社交活動",
        mbti: { E: 2, S: 1 },
        icon: "party-popper",
        color: "#FF6B6B"
      },
      {
        text: "獨自在家看書、思考或創作",
        mbti: { I: 2, N: 1 },
        icon: "book-account",
        color: "#06D6A0"
      },
      {
        text: "學習新東西或完成個人專案",
        mbti: { T: 2, J: 1 },
        icon: "progress-check",
        color: "#073B4C"
      },
      {
        text: "隨興所至，做讓自己開心的事",
        mbti: { F: 2, P: 1 },
        icon: "emoticon-happy",
        color: "#FFD166"
      }
    ]
  },
  {
    id: 9,
    title: "購物決策時刻",
    description: "你想購買一件重要物品，有多個選擇...",
    question: "你的決策過程是？",
    options: [
      {
        text: "詳細比較規格和價格，選擇性價比最高的",
        mbti: { T: 2, S: 1 },
        icon: "scale-balance",
        color: "#118AB2"
      },
      {
        text: "跟隨直覺，選擇感覺最對的那一個",
        mbti: { N: 2, F: 1 },
        icon: "heart-flash",
        color: "#EF476F"
      },
      {
        text: "詢問朋友意見，考慮大家會怎麼看",
        mbti: { E: 2, F: 1 },
        icon: "account-group",
        color: "#FF6B6B"
      },
      {
        text: "深入研究產品背後的技術和原理",
        mbti: { I: 2, T: 1 },
        icon: "microscope",
        color: "#073B4C"
      }
    ]
  },
  {
    id: 10,
    title: "專案領導角色",
    description: "你被任命為一個重要專案的負責人...",
    question: "你的領導風格是？",
    options: [
      {
        text: "制定清晰計劃，分配任務，定期檢查進度",
        mbti: { J: 2, T: 1 },
        icon: "clipboard-list",
        color: "#118AB2"
      },
      {
        text: "創造激勵環境，讓團隊成員自主發揮",
        mbti: { P: 2, F: 1 },
        icon: "flower",
        color: "#06D6A0"
      },
      {
        text: "親自示範，帶領團隊一起衝刺",
        mbti: { E: 2, S: 1 },
        icon: "run-fast",
        color: "#FF6B6B"
      },
      {
        text: "提出願景，鼓勵創新，挑戰傳統做法",
        mbti: { N: 2, P: 1 },
        icon: "flag-variant",
        color: "#FFD166"
      }
    ]
  }
];

// 從PDF題目中提取的傳統MBTI問題（可隨機選擇使用）
export const MBTI_TRADITIONAL_QUESTIONS = [
  {
    id: 101,
    question: "當你某日想去某個地方，你會？",
    options: [
      {
        text: "計劃好將做的事情以及何時做",
        mbti: { J: 1 },
        icon: "calendar-check",
        color: "#118AB2"
      },
      {
        text: "什麼都不想就去",
        mbti: { P: 1 },
        icon: "walk",
        color: "#06D6A0"
      }
    ]
  },
  {
    id: 102,
    question: "如果你是一位老師，你願教？",
    options: [
      {
        text: "涉及事實的課程",
        mbti: { S: 1 },
        icon: "book-open-page-variant",
        color: "#4ECDC4"
      },
      {
        text: "涉及理論的課程",
        mbti: { N: 1 },
        icon: "thought-bubble-outline",
        color: "#9B59B6"
      }
    ]
  },
  {
    id: 103,
    question: "你通常是？",
    options: [
      {
        text: "一個善於交際的人",
        mbti: { E: 1 },
        icon: "account-multiple",
        color: "#FF6B6B"
      },
      {
        text: "安靜沉默的人",
        mbti: { I: 1 },
        icon: "account",
        color: "#3498DB"
      }
    ]
  },
  {
    id: 104,
    question: "做決定時，你更傾向於？",
    options: [
      {
        text: "依邏輯行事",
        mbti: { T: 1 },
        icon: "brain",
        color: "#2C3E50"
      },
      {
        text: "感性地做事",
        mbti: { F: 1 },
        icon: "heart",
        color: "#E74C3C"
      }
    ]
  },
  {
    id: 105,
    question: "你更喜歡？",
    options: [
      {
        text: "事先安排好約會、聚會等",
        mbti: { J: 1 },
        icon: "calendar",
        color: "#118AB2"
      },
      {
        text: "只要時機恰當就無拘無束地做任何有趣的事",
        mbti: { P: 1 },
        icon: "weather-sunny",
        color: "#F1C40F"
      }
    ]
  },
  {
    id: 106,
    question: "你通常和什麼樣的人相處得更好？",
    options: [
      {
        text: "現實的人",
        mbti: { S: 1 },
        icon: "earth",
        color: "#27AE60"
      },
      {
        text: "想像力豐富的人",
        mbti: { N: 1 },
        icon: "auto-fix",
        color: "#9B59B6"
      }
    ]
  },
  {
    id: 107,
    question: "當和一群人在一起時，你會？",
    options: [
      {
        text: "參加大家的談話",
        mbti: { E: 1 },
        icon: "microphone",
        color: "#FF6B6B"
      },
      {
        text: "只同你熟知的人單獨談話",
        mbti: { I: 1 },
        icon: "account-voice",
        color: "#3498DB"
      }
    ]
  },
  {
    id: 108,
    question: "往往，你是？",
    options: [
      {
        text: "情感駕馭理智",
        mbti: { F: 1 },
        icon: "emoticon-excited",
        color: "#E74C3C"
      },
      {
        text: "理智駕馭情感",
        mbti: { T: 1 },
        icon: "head-cog",
        color: "#2C3E50"
      }
    ]
  },
  {
    id: 109,
    question: "你更喜歡怎樣做多數事情？",
    options: [
      {
        text: "有計劃地",
        mbti: { J: 1 },
        icon: "clipboard-check",
        color: "#118AB2"
      },
      {
        text: "即興地",
        mbti: { P: 1 },
        icon: "star-four-points",
        color: "#F1C40F"
      }
    ]
  },
  {
    id: 110,
    question: "你願意自己被認為是一個？",
    options: [
      {
        text: "善於動手的人",
        mbti: { S: 1 },
        icon: "hammer",
        color: "#27AE60"
      },
      {
        text: "善於創意的人",
        mbti: { N: 1 },
        icon: "palette",
        color: "#9B59B6"
      }
    ]
  }
];

// MBTI類型描述
export const MBTI_DESCRIPTIONS = {
  ISTJ: {
    name: "檢查員型",
    description: "安靜、嚴肅、可靠、實際，重視傳統和責任",
    strengths: ["有責任感", "邏輯清晰", "注重細節", "堅持到底"],
    match: ["ESTP", "ESFP"],
    color: "#3498db"
  },
  ISFJ: {
    name: "保護者型",
    description: "溫暖、忠誠、勤奮，重視和諧與他人感受",
    strengths: ["體貼入微", "可靠穩定", "善於合作", "實際務實"],
    match: ["ESFP", "ESTP"],
    color: "#2ecc71"
  },
  INFJ: {
    name: "提倡者型",
    description: "理想主義、有洞察力、富創造力，追求意義和深度",
    strengths: ["富有遠見", "善解人意", "堅持原則", "創意無限"],
    match: ["ENFP", "ENTP"],
    color: "#9b59b6"
  },
  INTJ: {
    name: "建築師型",
    description: "戰略思想家、獨立、有決心，擅長制定長遠計劃",
    strengths: ["戰略思維", "獨立自主", "追求效率", "堅持目標"],
    match: ["ENFP", "ENTP"],
    color: "#1abc9c"
  },
  ISTP: {
    name: "鑑賞家型",
    description: "大膽、實際、靈活，善於分析問題和即興發揮",
    strengths: ["冷靜理性", "動手能力強", "適應力佳", "解決問題"],
    match: ["ESTJ", "ESFJ"],
    color: "#e74c3c"
  },
  ISFP: {
    name: "探險家型",
    description: "藝術家、溫柔、靈活，活在當下，重視個人價值",
    strengths: ["藝術天賦", "善解人意", "適應力強", "真誠自然"],
    match: ["ESTJ", "ESFJ"],
    color: "#f39c12"
  },
  INFP: {
    name: "調停者型",
    description: "理想主義、有同理心、忠於價值觀，尋求和諧",
    strengths: ["富有創意", "忠於自我", "善解人意", "靈活適應"],
    match: ["ENFJ", "ENTJ"],
    color: "#d35400"
  },
  INTP: {
    name: "邏輯學家型",
    description: "創新、好奇、理性，熱愛理論和抽象概念",
    strengths: ["邏輯分析", "獨立思考", "創新思維", "客觀理性"],
    match: ["ENTJ", "ENFJ"],
    color: "#34495e"
  },
  ESTP: {
    name: "企業家型",
    description: "精力充沛、實際、善於社交，享受當下冒險",
    strengths: ["行動力強", "適應力佳", "務實靈活", "善於社交"],
    match: ["ISFJ", "ISTJ"],
    color: "#e67e22"
  },
  ESFP: {
    name: "表演者型",
    description: "外向、友善、熱愛生活，享受與人互動",
    strengths: ["熱情洋溢", "善於社交", "活在當下", "樂觀積極"],
    match: ["ISTJ", "ISFJ"],
    color: "#f1c40f"
  },
  ENFP: {
    name: "競選者型",
    description: "熱情、創意、樂觀，充滿可能性和靈感",
    strengths: ["富有創意", "熱情洋溢", "善於溝通", "適應力強"],
    match: ["INFJ", "INTJ"],
    color: "#2ecc71"
  },
  ENTP: {
    name: "辯論家型",
    description: "聰明、好奇、有創造力，喜歡智力挑戰",
    strengths: ["思維敏捷", "善於創新", "適應力強", "充滿活力"],
    match: ["INFJ", "INTJ"],
    color: "#9b59b6"
  },
  ESTJ: {
    name: "總經理型",
    description: "實際、果斷、有組織，善於管理和執行",
    strengths: ["領導能力", "務實高效", "責任心強", "善於組織"],
    match: ["ISFP", "ISTP"],
    color: "#3498db"
  },
  ESFJ: {
    name: "執政官型",
    description: "友善、盡責、善於合作，重視和諧與傳統",
    strengths: ["體貼周到", "善於合作", "可靠負責", "社交能力強"],
    match: ["ISFP", "ISTP"],
    color: "#1abc9c"
  },
  ENFJ: {
    name: "主人公型",
    description: "有魅力、有說服力、善於激勵他人",
    strengths: ["善於溝通", "鼓舞人心", "體貼周到", "領導力強"],
    match: ["INFP", "INTP"],
    color: "#e74c3c"
  },
  ENTJ: {
    name: "指揮官型",
    description: "大膽、有遠見、果斷，天生的領導者",
    strengths: ["戰略思維", "果斷決策", "領導能力", "效率至上"],
    match: ["INFP", "INTP"],
    color: "#f39c12"
  }
};

// 從PDF中提取的完整MBTI題庫（簡化版）
export const MBTI_FULL_QUESTIONS = [
  {
    id: 201,
    question: "可以容忍噪音和群眾 vs 避免人群，喜歡安靜",
    options: [
      { text: "可以容忍噪音和群眾", mbti: { E: 1 }, icon: "volume-high", color: "#FF6B6B" },
      { text: "避免人群，喜歡安靜", mbti: { I: 1 }, icon: "volume-off", color: "#3498DB" }
    ]
  },
  {
    id: 202,
    question: "從普遍一般概念學習新事物 vs 從模仿和觀察中學習",
    options: [
      { text: "從普遍一般概念學習新事物", mbti: { N: 1 }, icon: "chart-bubble", color: "#9B59B6" },
      { text: "從模仿和觀察中學習新事物", mbti: { S: 1 }, icon: "eye", color: "#27AE60" }
    ]
  },
  {
    id: 203,
    question: "把真理當作目標 vs 把和睦共處當作目標",
    options: [
      { text: "把真理當作目標", mbti: { T: 1 }, icon: "scale-balance", color: "#2C3E50" },
      { text: "把和睦共處當作目標", mbti: { F: 1 }, icon: "handshake", color: "#E74C3C" }
    ]
  },
  {
    id: 204,
    question: "多開口，少聆聽 vs 多聆聽，少說話",
    options: [
      { text: "多開口，少聆聽", mbti: { E: 1 }, icon: "microphone", color: "#FF6B6B" },
      { text: "多聆聽，少說話", mbti: { I: 1 }, icon: "ear-hearing", color: "#3498DB" }
    ]
  },
  {
    id: 205,
    question: "聚焦於實際經驗 vs 聚焦於理想的可能性",
    options: [
      { text: "聚焦於實際經驗", mbti: { S: 1 }, icon: "chart-line", color: "#27AE60" },
      { text: "聚焦於理想的可能性", mbti: { N: 1 }, icon: "chart-timeline", color: "#9B59B6" }
    ]
  },
  {
    id: 206,
    question: "多用腦來抉擇 vs 多用心來抉擇",
    options: [
      { text: "多用腦來抉擇", mbti: { T: 1 }, icon: "brain", color: "#2C3E50" },
      { text: "多用心來抉擇", mbti: { F: 1 }, icon: "heart", color: "#E74C3C" }
    ]
  },
  {
    id: 207,
    question: "喜愛適應新環境 vs 寧願認識自己正進入什麼狀況",
    options: [
      { text: "喜愛適應新環境", mbti: { P: 1 }, icon: "compass", color: "#F1C40F" },
      { text: "寧願認識自己正進入什麼狀況", mbti: { J: 1 }, icon: "map-marker-check", color: "#118AB2" }
    ]
  },
  {
    id: 208,
    question: "把火熱的心局限於自己內心 vs 與人溝通時，會把熱心散發出去",
    options: [
      { text: "把火熱的心局限於自己內心", mbti: { I: 1 }, icon: "home-heart", color: "#3498DB" },
      { text: "與人溝通時，會把熱心散發出去", mbti: { E: 1 }, icon: "fire", color: "#FF6B6B" }
    ]
  },
  {
    id: 209,
    question: "傾向於明確和求實 vs 傾向於一般化和象徵性",
    options: [
      { text: "傾向於明確和求實", mbti: { S: 1 }, icon: "format-list-bulleted", color: "#27AE60" },
      { text: "傾向於一般化和象徵性", mbti: { N: 1 }, icon: "shape", color: "#9B59B6" }
    ]
  }
];

// 遊戲模式配置
export const GAME_MODES = {
  SCENARIO: {
    name: "情境遊戲模式",
    description: "透過生活情境選擇題進行測試",
    questions: MBTI_GAME_SCENES,
    questionCount: 8
  },
  TRADITIONAL: {
    name: "傳統問卷模式",
    description: "經典MBTI問卷題目",
    questions: MBTI_TRADITIONAL_QUESTIONS,
    questionCount: 10
  },
  QUICK: {
    name: "快速測試模式",
    description: "精選題目快速測試",
    questions: MBTI_FULL_QUESTIONS.slice(0, 5),
    questionCount: 5
  }
};

// 工具函數：隨機選擇題目
export const getRandomQuestions = (mode = 'SCENARIO', count = null) => {
  const modeConfig = GAME_MODES[mode] || GAME_MODES.SCENARIO;
  const questions = modeConfig.questions;
  const questionCount = count || modeConfig.questionCount;
  
  // 隨機打亂並選擇指定數量的題目
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(questionCount, shuffled.length));
};

// 工具函數：計算MBTI結果
export const calculateMbtiResult = (scores) => {
  const ei = scores.E >= scores.I ? 'E' : 'I';
  const sn = scores.S >= scores.N ? 'S' : 'N';
  const tf = scores.T >= scores.F ? 'T' : 'F';
  const jp = scores.J >= scores.P ? 'J' : 'P';
  
  return {
    type: ei + sn + tf + jp,
    scores: scores,
    description: MBTI_DESCRIPTIONS[ei + sn + tf + jp] || MBTI_DESCRIPTIONS.ISTJ
  };
};