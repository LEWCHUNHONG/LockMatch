// config/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ================================================
// 建立所有需要的上傳目錄（如果不存在）
// ================================================

// 1. 頭像目錄
const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
  console.log('已建立頭像目錄:', avatarDir);
}

// 2. 聊天多媒體目錄（images / audio / videos / files）
const chatMediaBaseDir = path.join(__dirname, '../uploads/chat_media');
if (!fs.existsSync(chatMediaBaseDir)) {
  fs.mkdirSync(chatMediaBaseDir, { recursive: true });
}

['images', 'audio', 'videos', 'files'].forEach(subDir => {
  const dir = path.join(chatMediaBaseDir, subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`已建立聊天媒體子目錄: ${dir}`);
  }
});

// 3. 討論區貼文媒體目錄（images / videos）
const postMediaBaseDir = path.join(__dirname, '../uploads/post_media');
if (!fs.existsSync(postMediaBaseDir)) {
  fs.mkdirSync(postMediaBaseDir, { recursive: true });
}

['images', 'videos'].forEach(subDir => {
  const dir = path.join(postMediaBaseDir, subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`已建立貼文媒體子目錄: ${dir}`);
  }
});

// ================================================
// Multer 儲存引擎共用設定
// ================================================
const getFileName = (req, file, cb) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, `${uniqueSuffix}${ext}`);
};

// ================================================
// 1. 通用上傳（fallback）
// ================================================
const upload = multer({
  dest: 'uploads/temp/',  // 臨時目錄，建議之後再移動到正確位置
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// ================================================
// 2. 頭像上傳專用設定
// ================================================
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: getFileName
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 頭像限制 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 jpg、png、gif、webp 格式的圖片'), false);
    }
  }
});

// ================================================
// 3. 聊天媒體上傳（自動分類到 images/audio/videos/files）
// ================================================
const chatMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destFolder;

    if (file.mimetype.startsWith('image/')) {
      destFolder = path.join(chatMediaBaseDir, 'images');
    } else if (file.mimetype.startsWith('audio/')) {
      destFolder = path.join(chatMediaBaseDir, 'audio');
    } else if (file.mimetype.startsWith('video/')) {
      destFolder = path.join(chatMediaBaseDir, 'videos');
    } else {
      destFolder = path.join(chatMediaBaseDir, 'files');
    }

    cb(null, destFolder);
  },
  filename: getFileName
});

const chatMediaUpload = multer({
  storage: chatMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 聊天媒體允許較大，50MB
  fileFilter: (req, file, cb) => {
    // 可根據需求再嚴格限制允許的類型
    cb(null, true);
  }
});

// ================================================
// 4. 討論區貼文媒體上傳（images / videos）
// ================================================
const postMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destFolder;

    if (file.mimetype.startsWith('image/')) {
      destFolder = path.join(postMediaBaseDir, 'images');
    } else if (file.mimetype.startsWith('video/')) {
      destFolder = path.join(postMediaBaseDir, 'videos');
    } else {
      return cb(new Error('貼文僅支援圖片與影片'), false);
    }

    cb(null, destFolder);
  },
  filename: getFileName
});

const postMediaUpload = multer({
  storage: postMediaStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 貼文允許更大一點，100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/', 'video/'];
    if (allowed.some(type => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error('貼文僅支援圖片與影片上傳'), false);
    }
  }
});

// ================================================
// 匯出
// ================================================
module.exports = {
  upload,           // 通用（臨時）
  avatarUpload,     // 頭像專用
  chatMediaUpload,  // 聊天媒體（自動分類）
  postMediaUpload   // 討論區貼文媒體（images/videos）
};