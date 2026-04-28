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
        icon: "thought-bubble-outline", // 修正
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
        icon: "chart-timeline-variant",
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
        icon: "chart-box-outline",
        color: "#118AB2"
      },
      {
        text: "跳出框架，提出從未有人想過的全新點子",
        mbti: { N: 2, P: 1 },
        icon: "lightbulb-on-outline",
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
        icon: "shield-outline",
        color: "#FF6B6B"
      },
      {
        text: "觀察細節，尋找最可靠的解決方案",
        mbti: { S: 2, I: 1 },
        icon: "magnify-expand",
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
        icon: "lightbulb-variant-outline",
        color: "#06D6A0"
      },
      {
        text: "用具體案例說明想法的可行性",
        mbti: { S: 2, T: 1 },
        icon: "chart-bell-curve-cumulative",
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
        icon: "heart-pulse",
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
        icon: "run",
        color: "#FF6B6B"
      },
      {
        text: "提出願景，鼓勵創新，挑戰傳統做法",
        mbti: { N: 2, P: 1 },
        icon: "flag-variant",
        color: "#FFD166"
      }
    ]
  },
  {
  id: 11,
  title: "意見衝突時刻",
  description: "團隊會議中，你提出一個想法，但有人強烈反對...",
  question: "這時候你最可能怎麼做？",
  options: [
    {
      text: "堅持自己的觀點，用邏輯和數據說服對方",
      mbti: { T: 2, J: 1 },
      icon: "scale-balance",
      color: "#118AB2"
    },
    {
      text: "試著理解對方的感受，尋找雙方都能接受的折衷方案",
      mbti: { F: 2, E: 1 },
      icon: "handshake",
      color: "#FF6B6B"
    },
    {
      text: "先安靜觀察，之後私下再思考如何調整自己的想法",
      mbti: { I: 2, N: 1 },
      icon: "thought-bubble-outline",
      color: "#4ECDC4"
    },
    {
      text: "立刻提出另一個替代方案，讓討論繼續前進",
      mbti: { P: 2, N: 1 },
      icon: "lightbulb-on-outline",
      color: "#FFD166"
    }
  ]
},
{
  id: 12,
  title: "週末放鬆選擇",
  description: "連續工作兩週後，你終於迎來一個完整的週末...",
  question: "你最想如何度過這個週末？",
  options: [
    {
      text: "安排好幾個活動，約朋友聚會或參加展覽",
      mbti: { E: 2, S: 1 },
      icon: "calendar-clock",
      color: "#FF6B6B"
    },
    {
      text: "一個人宅在家，追劇、看書、聽音樂",
      mbti: { I: 2, N: 1 },
      icon: "book-open-variant",
      color: "#06D6A0"
    },
    {
      text: "報名一個短期課程或工作坊，學習新技能",
      mbti: { J: 2, T: 1 },
      icon: "school-outline",
      color: "#118AB2"
    },
    {
      text: "什麼都不計劃，睡到自然醒，看心情決定要做什麼",
      mbti: { P: 2, F: 1 },
      icon: "emoticon-happy",
      color: "#EF476F"
    }
  ]
},
{
  id: 13,
  title: "面對批評反應",
  description: "你花了很多心血完成一份報告，上司卻給了嚴厲的批評...",
  question: "你的第一反應通常是？",
  options: [
    {
      text: "冷靜分析批評內容，找出可以改進的具體地方",
      mbti: { T: 2, S: 1 },
      icon: "magnify",
      color: "#073B4C"
    },
    {
      text: "先感到難過或受傷，需要時間消化情緒",
      mbti: { F: 2, I: 1 },
      icon: "emoticon-sad-outline",
      color: "#FF6B6B"
    },
    {
      text: "馬上思考如何反駁或證明自己的做法是對的",
      mbti: { T: 2, E: 1 },
      icon: "sword-cross",
      color: "#118AB2"
    },
    {
      text: "把批評當成學習機會，馬上開始思考新方向",
      mbti: { N: 2, P: 1 },
      icon: "rocket-launch",
      color: "#FFD166"
    }
  ]
},
{
  id: 14,
  title: "資訊接收偏好",
  description: "你需要了解一個全新的複雜專案...",
  question: "你比較喜歡用什麼方式接收資訊？",
  options: [
    {
      text: "詳細的書面報告和數據表格",
      mbti: { S: 2, T: 1 },
      icon: "file-document",
      color: "#4ECDC4"
    },
    {
      text: "高層次的概念和整體願景說明",
      mbti: { N: 2, I: 1 },
      icon: "lightbulb-on",
      color: "#9B59B6"
    },
    {
      text: "和相關人員面對面討論，邊問邊了解",
      mbti: { E: 2, F: 1 },
      icon: "account-voice",
      color: "#FF6B6B"
    },
    {
      text: "先給我大綱，我自己再去深入研究細節",
      mbti: { J: 2, N: 1 },
      icon: "file-tree",
      color: "#118AB2"
    }
  ]
},
{
  id: 15,
  title: "危機時刻決策",
  description: "你在旅行途中突然遇到航班取消，所有人都很慌...",
  question: "你會怎麼處理？",
  options: [
    {
      text: "立刻打電話給航空公司，研究所有替代方案",
      mbti: { J: 2, T: 1 },
      icon: "phone",
      color: "#118AB2"
    },
    {
      text: "安撫同行的人，告訴大家會沒事的",
      mbti: { F: 2, E: 1 },
      icon: "shield-heart",
      color: "#FF6B6B"
    },
    {
      text: "先觀察其他人怎麼做，再決定自己的行動",
      mbti: { I: 2, S: 1 },
      icon: "eye",
      color: "#4ECDC4"
    },
    {
      text: "腦中快速冒出好幾個創意解決方案（轉機、改搭火車等）",
      mbti: { N: 2, P: 1 },
      icon: "lightning-bolt",
      color: "#FFD166"
    }
  ]
},
  {
    id: 16,
    title: "新環境適應",
    description: "你剛加入一個全新的團隊或公司...",
    question: "在最初的幾週，你最可能怎麼做？",
    options: [
      {
        text: "主動找同事聊天，盡快融入團隊",
        mbti: { E: 2, F: 1 },
        icon: "account-group",
        color: "#FF6B6B"
      },
      {
        text: "先安靜觀察，了解團隊文化和運作方式",
        mbti: { I: 2, S: 1 },
        icon: "eye",
        color: "#4ECDC4"
      },
      {
        text: "快速學習工作流程，爭取盡早獨立完成任務",
        mbti: { J: 2, T: 1 },
        icon: "clipboard-check",
        color: "#118AB2"
      },
      {
        text: "思考這個團隊可以如何變得更好，提出新想法",
        mbti: { N: 2, P: 1 },
        icon: "lightbulb-on-outline",
        color: "#FFD166"
      }
    ]
  },
  {
    id: 17,
    title: "禮物選擇難題",
    description: "朋友生日即將到來，你要挑選一份禮物...",
    question: "你會如何選擇禮物？",
    options: [
      {
        text: "買實用且高品質的東西，確保對方用得到",
        mbti: { S: 2, T: 1 },
        icon: "gift",
        color: "#118AB2"
      },
      {
        text: "選擇有創意、獨特且有紀念意義的禮物",
        mbti: { N: 2, F: 1 },
        icon: "star",
        color: "#EF476F"
      },
      {
        text: "直接問對方想要什麼，或參考他平常的喜好",
        mbti: { E: 2, S: 1 },
        icon: "account-question",
        color: "#FF6B6B"
      },
      {
        text: "花時間思考對方的個性和夢想，挑選有意義的東西",
        mbti: { I: 2, N: 1 },
        icon: "heart-outline",
        color: "#06D6A0"
      }
    ]
  },
  {
    id: 18,
    title: "電影或書籍選擇",
    description: "你有空想看一部電影或一本書...",
    question: "你比較傾向選擇哪一類？",
    options: [
      {
        text: "輕鬆有趣、娛樂性強的商業片或小說",
        mbti: { E: 1, S: 2 },
        icon: "popcorn",
        color: "#FFD166"
      },
      {
        text: "探討人生、充滿哲理或心理層面的作品",
        mbti: { I: 2, N: 1 },
        icon: "book-open-page-variant",
        color: "#9B59B6"
      },
      {
        text: "有明確結局、邏輯清晰的故事",
        mbti: { J: 2, T: 1 },
        icon: "movie-roll",
        color: "#118AB2"
      },
      {
        text: "開放式結局、充滿想像空間的藝術作品",
        mbti: { P: 2, N: 1 },
        icon: "palette",
        color: "#4ECDC4"
      }
    ]
  },
  {
    id: 19,
    title: "壓力排解方式",
    description: "最近工作壓力很大，你覺得快要喘不過氣...",
    question: "你最常怎麼紓解壓力？",
    options: [
      {
        text: "找朋友聚會聊天，大聲說出來",
        mbti: { E: 2, F: 1 },
        icon: "chat",
        color: "#FF6B6B"
      },
      {
        text: "獨自安靜思考，或寫日記整理心情",
        mbti: { I: 2, N: 1 },
        icon: "notebook",
        color: "#06D6A0"
      },
      {
        text: "列出問題，逐一制定解決計劃",
        mbti: { T: 2, J: 1 },
        icon: "checklist",
        color: "#118AB2"
      },
      {
        text: "去做運動、旅行或從事喜歡的休閒活動",
        mbti: { S: 2, P: 1 },
        icon: "run",
        color: "#EF476F"
      }
    ]
  },
  {
    id: 20,
    title: "規則與彈性",
    description: "公司突然宣布一項新規定，大家都覺得不合理...",
    question: "你的態度通常是？",
    options: [
      {
        text: "遵守規定，因為規則就是用來執行的",
        mbti: { J: 2, S: 1 },
        icon: "gavel",
        color: "#118AB2"
      },
      {
        text: "找出規定的漏洞或彈性空間",
        mbti: { P: 2, N: 1 },
        icon: "puzzle",
        color: "#FFD166"
      },
      {
        text: "分析這項規定是否合理，有必要就提出建議",
        mbti: { T: 2, I: 1 },
        icon: "magnify",
        color: "#073B4C"
      },
      {
        text: "考慮這規定對團隊成員的影響，試著幫助大家",
        mbti: { F: 2, E: 1 },
        icon: "account-heart",
        color: "#FF6B6B"
      }
    ]
  },
  {
    id: 21,
    title: "未來規劃",
    description: "有人問你對未來五年的打算...",
    question: "你會如何回答？",
    options: [
      {
        text: "我已經有明確的職業規劃和時間表",
        mbti: { J: 2, T: 1 },
        icon: "map-marker-path",
        color: "#118AB2"
      },
      {
        text: "我喜歡保持開放，隨時迎接新機會",
        mbti: { P: 2, N: 1 },
        icon: "compass",
        color: "#FFD166"
      },
      {
        text: "我希望能做自己真正熱愛、有意義的事",
        mbti: { F: 2, N: 1 },
        icon: "heart",
        color: "#EF476F"
      },
      {
        text: "我會先專注眼前，把當下的事情做好",
        mbti: { S: 2, I: 1 },
        icon: "eye",
        color: "#4ECDC4"
      }
    ]
  }
];

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
  },
  {
  id: 111,
  question: "你比較喜歡的工作環境是？",
  options: [
    { text: "安靜、有明確規則和流程", mbti: { I: 1, J: 1 }, icon: "office-building", color: "#118AB2" },
    { text: "熱鬧、變化多、可以自由發揮", mbti: { E: 1, P: 1 }, icon: "account-group", color: "#FF6B6B" }
  ]
},
{
  id: 112,
  question: "當你有空閒時間時，你更傾向於？",
  options: [
    { text: "做一些實際且有用的事情", mbti: { S: 1 }, icon: "hammer", color: "#27AE60" },
    { text: "沉浸在自己的想像和想法中", mbti: { N: 1 }, icon: "brain", color: "#9B59B6" }
  ]
},
{
  id: 113,
  question: "你做決定時通常會？",
  options: [
    { text: "先考慮這件事對別人有什麼影響", mbti: { F: 1 }, icon: "heart", color: "#E74C3C" },
    { text: "先分析這件事本身是否合理", mbti: { T: 1 }, icon: "scale", color: "#2C3E50" }
  ]
},
{
  id: 114,
  question: "你更喜歡的生活節奏是？",
  options: [
    { text: "井然有序、一切都在掌控之中", mbti: { J: 1 }, icon: "clock-check", color: "#118AB2" },
    { text: "彈性自由、可以隨時調整", mbti: { P: 1 }, icon: "calendar-blank", color: "#F1C40F" }
  ]
},
  {
    id: 115,
    question: "參加派對時，你通常會？",
    options: [
      { text: "主動認識很多新朋友", mbti: { E: 1 }, icon: "account-plus", color: "#FF6B6B" },
      { text: "只和少數熟悉的人聊天", mbti: { I: 1 }, icon: "account", color: "#3498DB" }
    ]
  },
  {
    id: 116,
    question: "你更相信？",
    options: [
      { text: "豐富的實際經驗", mbti: { S: 1 }, icon: "hammer", color: "#27AE60" },
      { text: "大膽的想像與直覺", mbti: { N: 1 }, icon: "auto-fix", color: "#9B59B6" }
    ]
  },
  {
    id: 117,
    question: "當別人犯錯時，你比較容易？",
    options: [
      { text: "直接指出錯誤，並告訴他正確做法", mbti: { T: 1 }, icon: "alert", color: "#2C3E50" },
      { text: "委婉表達，避免傷害對方感受", mbti: { F: 1 }, icon: "heart", color: "#E74C3C" }
    ]
  },
  {
    id: 118,
    question: "你的房間或工作桌通常是？",
    options: [
      { text: "整齊有序，一切都有固定位置", mbti: { J: 1 }, icon: "clipboard-check", color: "#118AB2" },
      { text: "比較隨性，有些凌亂也沒關係", mbti: { P: 1 }, icon: "desk-lamp", color: "#F1C40F" }
    ]
  },
  {
    id: 119,
    question: "你更喜歡的學習方式是？",
    options: [
      { text: "一步一步按照教程或說明書學習", mbti: { S: 1, J: 1 }, icon: "book-open", color: "#27AE60" },
      { text: "先理解整體概念，再自己摸索", mbti: { N: 1, P: 1 }, icon: "lightbulb", color: "#9B59B6" }
    ]
  },
  {
    id: 120,
    question: "面對不熟悉的任務，你傾向於？",
    options: [
      { text: "先做好詳細計劃再開始行動", mbti: { J: 1 }, icon: "map", color: "#118AB2" },
      { text: "邊做邊調整，保持彈性", mbti: { P: 1 }, icon: "compass", color: "#F1C40F" }
    ]
  },
  {
    id: 121,
    question: "你通常如何表達關心？",
    options: [
      { text: "用實際行動幫忙解決問題", mbti: { T: 1, S: 1 }, icon: "handshake", color: "#2C3E50" },
      { text: "用言語安慰和鼓勵對方", mbti: { F: 1, E: 1 }, icon: "chat-heart", color: "#E74C3C" }
    ]
  },
  {
    id: 122,
    question: "你比較享受？",
    options: [
      { text: "有明確目標和截止日期的挑戰", mbti: { J: 1, T: 1 }, icon: "target", color: "#118AB2" },
      { text: "沒有太多限制、可以自由發揮的過程", mbti: { P: 1, N: 1 }, icon: "palette", color: "#9B59B6" }
    ]
  }
];

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
      { text: "聚焦於理想的可能性", mbti: { N: 1 }, icon: "chart-timeline-variant", color: "#9B59B6" } // 修正
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
  },
  {
    id: 210,
    question: "你更喜歡與人交談的方式是？",
    options: [
      { text: "討論很多不同話題，輕鬆聊天", mbti: { E: 1 }, icon: "chat-multiple", color: "#FF6B6B" },
      { text: "深入討論少數感興趣的主題", mbti: { I: 1 }, icon: "chat-processing", color: "#3498DB" }
    ]
  },
  {
    id: 211,
    question: "當面對問題時，你通常先？",
    options: [
      { text: "思考實際可行的解決方法", mbti: { S: 1 }, icon: "wrench", color: "#27AE60" },
      { text: "思考問題背後的意義與可能性", mbti: { N: 1 }, icon: "lightbulb-on", color: "#9B59B6" }
    ]
  },
  {
    id: 212,
    question: "你做決定時最重視？",
    options: [
      { text: "公平、公正與客觀事實", mbti: { T: 1 }, icon: "scale-balance", color: "#2C3E50" },
      { text: "他人感受與和諧關係", mbti: { F: 1 }, icon: "heart-outline", color: "#E74C3C" }
    ]
  },
  {
    id: 213,
    question: "你的生活習慣比較接近？",
    options: [
      { text: "按計劃行事，有條不紊", mbti: { J: 1 }, icon: "calendar-check", color: "#118AB2" },
      { text: "隨機應變，保持彈性", mbti: { P: 1 }, icon: "calendar-blank", color: "#F1C40F" }
    ]
  },
  {
    id: 214,
    question: "參加團體活動時，你通常？",
    options: [
      { text: "喜歡成為焦點，積極參與", mbti: { E: 1 }, icon: "account-star", color: "#FF6B6B" },
      { text: "比較低調，觀察或小範圍互動", mbti: { I: 1 }, icon: "account", color: "#3498DB" }
    ]
  },
  {
    id: 215,
    question: "你更擅長？",
    options: [
      { text: "記住具體事實和細節", mbti: { S: 1 }, icon: "format-list-bulleted", color: "#27AE60" },
      { text: "看見整體格局與未來趨勢", mbti: { N: 1 }, icon: "chart-timeline-variant", color: "#9B59B6" }
    ]
  },
  {
    id: 216,
    question: "批評別人時，你傾向？",
    options: [
      { text: "直接說出問題所在", mbti: { T: 1 }, icon: "alert-circle", color: "#2C3E50" },
      { text: "用溫和的方式表達，避免傷害對方", mbti: { F: 1 }, icon: "emoticon-happy", color: "#E74C3C" }
    ]
  },
  {
    id: 217,
    question: "完成工作後，你比較喜歡？",
    options: [
      { text: "立刻開始下一個任務", mbti: { J: 1 }, icon: "rocket-launch", color: "#118AB2" },
      { text: "先休息一下，再看看下一步", mbti: { P: 1 }, icon: "coffee", color: "#F1C40F" }
    ]
  },
  {
    id: 218,
    question: "你比較容易被什麼吸引？",
    options: [
      { text: "實際、可靠、有用的事物", mbti: { S: 1 }, icon: "toolbox", color: "#27AE60" },
      { text: "新奇、有創意、與眾不同的想法", mbti: { N: 1 }, icon: "star", color: "#9B59B6" }
    ]
  },
  {
    id: 219,
    question: "在團隊中，你通常扮演的角色是？",
    options: [
      { text: "負責協調、激勵大家", mbti: { E: 1, F: 1 }, icon: "account-group", color: "#FF6B6B" },
      { text: "專注把自己的部分做好", mbti: { I: 1, T: 1 }, icon: "account-cog", color: "#3498DB" }
    ]
  },
  {
    id: 220,
    question: "面對變化時，你的態度是？",
    options: [
      { text: "喜歡穩定和可預測的環境", mbti: { J: 1, S: 1 }, icon: "shield-check", color: "#118AB2" },
      { text: "享受變化帶來的新可能性", mbti: { P: 1, N: 1 }, icon: "compass", color: "#F1C40F" }
    ]
  },
  {
    id: 221,
    question: "你更喜歡的溝通方式？",
    options: [
      { text: "電話或面對面直接溝通", mbti: { E: 1 }, icon: "phone", color: "#FF6B6B" },
      { text: "文字訊息或 email 溝通", mbti: { I: 1 }, icon: "message-text", color: "#3498DB" }
    ]
  }
];

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
    questionCount: 12
  },
  QUICK: {
    name: "快速測試模式",
    description: "精選題目快速測試",
    questions: MBTI_FULL_QUESTIONS.slice(0, 15),
    questionCount: 5
  }
};

export const getRandomQuestions = (mode = 'SCENARIO', count = null) => {
  const modeConfig = GAME_MODES[mode] || GAME_MODES.SCENARIO;
  let questions = modeConfig.questions;

  if (mode === 'SCENARIO') questions = MBTI_GAME_SCENES;
  if (mode === 'TRADITIONAL') questions = MBTI_TRADITIONAL_QUESTIONS;
  if (mode === 'QUICK') questions = MBTI_FULL_QUESTIONS;

  const questionCount = count || modeConfig.questionCount;
  
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(questionCount, shuffled.length));
};

export const calculateMbtiResult = (scores) => {
  const ei = (scores.E || 0) >= (scores.I || 0) ? 'E' : 'I';
  const sn = (scores.S || 0) >= (scores.N || 0) ? 'S' : 'N';
  const tf = (scores.T || 0) >= (scores.F || 0) ? 'T' : 'F';
  const jp = (scores.J || 0) >= (scores.P || 0) ? 'J' : 'P';
  
  const type = ei + sn + tf + jp;
  return {
    type: type,
    scores: scores,
    description: MBTI_DESCRIPTIONS[type] || MBTI_DESCRIPTIONS.ISTJ
  };
};

export const getAllQuestions = () => {
  return [
    ...MBTI_GAME_SCENES,
    ...MBTI_TRADITIONAL_QUESTIONS,
    ...MBTI_FULL_QUESTIONS,
  ];
};