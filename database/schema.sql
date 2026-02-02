-- 資料庫：mufyp
DROP DATABASE IF EXISTS mufyp;
CREATE DATABASE mufyp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE mufyp;

-- 1. users （最基礎的表，大多數表都參考它）
CREATE TABLE users (
    id          INT NOT NULL AUTO_INCREMENT,
    points      INT DEFAULT 0,
    username    VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    password    VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    email       VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    avatar      VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '/uploads/avatars/default.png',
    mbti        VARCHAR(4) DEFAULT NULL,
    status      VARCHAR(255) DEFAULT NULL,
    last_active TIMESTAMP NULL DEFAULT NULL,
    bio         TEXT,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. chat_rooms （參考 users.created_by）
CREATE TABLE chat_rooms (
    id          INT NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) DEFAULT NULL,
    type        ENUM('private','group','public') DEFAULT 'private',
    description TEXT,
    avatar      VARCHAR(500) DEFAULT NULL,
    created_by  INT DEFAULT NULL,
    created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. chat_room_members （參考 chat_rooms + users）
CREATE TABLE chat_room_members (
    id        INT NOT NULL AUTO_INCREMENT,
    room_id   INT NOT NULL,
    user_id   INT NOT NULL,
    joined_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_room  (room_id),
    KEY idx_user  (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. chat_room_reads （參考 users + chat_rooms）
CREATE TABLE chat_room_reads (
    id         INT NOT NULL AUTO_INCREMENT,
    user_id    INT DEFAULT NULL,
    room_id    INT DEFAULT NULL,
    message_id INT DEFAULT NULL,
    read_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_read (user_id, room_id),
    KEY idx_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. daily_checkins （參考 users）
CREATE TABLE daily_checkins (
    id            INT NOT NULL AUTO_INCREMENT,
    user_id       INT NOT NULL,
    checkin_date  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checkin_day   DATE GENERATED ALWAYS AS (CAST(checkin_date AS DATE)) STORED,
    points_earned INT DEFAULT 10,
    streak        INT DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY unique_daily_checkin (user_id, checkin_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. friendships （參考 users × 2）
CREATE TABLE friendships (
    id         INT NOT NULL AUTO_INCREMENT,
    user1_id   INT NOT NULL,
    user2_id   INT NOT NULL,
    status     ENUM('pending','accepted','blocked') DEFAULT 'pending',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user1 (user1_id),
    KEY idx_user2 (user2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. friend_requests （參考 users × 2）
CREATE TABLE friend_requests (
    id           INT NOT NULL AUTO_INCREMENT,
    from_user_id INT NOT NULL,
    to_user_id   INT NOT NULL,
    status       ENUM('pending','accepted','rejected') DEFAULT 'pending',
    created_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_from (from_user_id),
    KEY idx_to   (to_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. messages （參考 chat_rooms + users）
CREATE TABLE messages (
    id           INT NOT NULL AUTO_INCREMENT,
    room_id      INT NOT NULL,
    sender_id    INT NOT NULL,
    content      TEXT NOT NULL,
    created_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    message_type VARCHAR(20) DEFAULT 'text',
    file_size    INT DEFAULT NULL,
    file_name    VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_room   (room_id),
    KEY idx_sender (sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. points_history （參考 users）
CREATE TABLE points_history (
    id          INT NOT NULL AUTO_INCREMENT,
    user_id     INT NOT NULL,
    points      INT NOT NULL,
    type        ENUM('task_reward','daily_checkin','item_redeem','system_bonus','referral') DEFAULT 'task_reward',
    description VARCHAR(255) DEFAULT NULL,
    created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. posts （參考 users）
CREATE TABLE posts (
    id          INT NOT NULL AUTO_INCREMENT,
    user_id     INT DEFAULT NULL,
    content     TEXT,
    media_urls  TEXT,
    media_types TEXT,
    media_type  ENUM('image','video','none') DEFAULT 'none',
    created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. post_comments （參考 posts + users）
CREATE TABLE post_comments (
    id         INT NOT NULL AUTO_INCREMENT,
    post_id    INT DEFAULT NULL,
    user_id    INT DEFAULT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post (post_id),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. post_likes （參考 posts + users）
CREATE TABLE post_likes (
    id         INT NOT NULL AUTO_INCREMENT,
    post_id    INT DEFAULT NULL,
    user_id    INT DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_like (post_id, user_id),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. reposts （參考 posts + users）
CREATE TABLE reposts (
    id         INT NOT NULL AUTO_INCREMENT,
    post_id    INT NOT NULL,
    user_id    INT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post (post_id),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14. shop_items （獨立）
CREATE TABLE shop_items (
    id             INT NOT NULL AUTO_INCREMENT,
    name           VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    description    TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    category       VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'general',
    points_required INT NOT NULL,
    stock          INT DEFAULT 1,
    limit_per_user INT DEFAULT 1,
    image_url      VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    is_active      TINYINT(1) DEFAULT 1,
    created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. tasks （獨立）
CREATE TABLE tasks (
    id             INT NOT NULL AUTO_INCREMENT,
    title          VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    description    TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    task_type      ENUM('daily','achievement','special') DEFAULT 'daily',
    points_required INT DEFAULT 1,
    points_reward  INT DEFAULT 10,
    priority       INT DEFAULT 5,
    is_active      TINYINT(1) DEFAULT 1,
    created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. user_redemptions （參考 users + shop_items）
CREATE TABLE user_redemptions (
    id          INT NOT NULL AUTO_INCREMENT,
    user_id     INT NOT NULL,
    item_id     INT NOT NULL,
    status      ENUM('pending','redeemed','shipped','cancelled') DEFAULT 'pending',
    redeemed_at TIMESTAMP NULL DEFAULT NULL,
    created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user (user_id),
    KEY idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. user_tasks （參考 users + tasks）
CREATE TABLE user_tasks (
    id              INT NOT NULL AUTO_INCREMENT,
    user_id         INT NOT NULL,
    task_id         INT NOT NULL,
    started_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP NULL DEFAULT NULL,
    current_progress INT DEFAULT 0,
    user_status     ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
    PRIMARY KEY (id),
    UNIQUE KEY unique_user_task (user_id, task_id),
    KEY idx_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- 插入任務的初始資料
INSERT INTO tasks 
(id, title, description, task_type, points_required, points_reward, priority, is_active, created_at, updated_at) 
VALUES
(1, '完成MBTI測驗', '完成一次完整的MBTI性格測試', 'achievement', 1, 500, 1, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(2, '發送第一條消息', '在好友或群組聊天中發送第一條消息', 'achievement', 1, 100, 2, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(3, '添加第一位好友', '成功添加一位好友', 'achievement', 1, 500, 3, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(4, '在討論區張貼首個貼文', '在討論區發佈第一篇貼文', 'achievement', 1, 200, 4, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(5, '點讚一個貼文', '對任何貼文點讚一次', 'achievement', 1, 100, 5, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(6, '轉發一個貼文', '轉發任何一篇貼文', 'achievement', 1, 50, 6, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(7, '上傳頭像', '設置個人頭像（非預設）', 'achievement', 1, 200, 7, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(8, '連續7天簽到', '連續簽到7天', 'achievement', 7, 500, 8, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(9, '連續14天簽到', '連續簽到14天', 'achievement', 14, 600, 9, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(10, '連續30天簽到', '連續簽到30天', 'achievement', 30, 800, 10, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(11, '連續60天簽到', '連續簽到60天', 'achievement', 60, 1000, 11, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(12, '連續90天簽到', '連續簽到90天', 'achievement', 90, 1500, 12, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(13, '連續180天簽到', '連續簽到180天', 'achievement', 180, 2500, 13, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(14, '連續365天簽到', '連續簽到365天', 'achievement', 365, 5000, 14, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(15, '每日發送5條訊息', '在任何聊天室發送5條訊息', 'daily', 5, 50, 15, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45'),
(16, '每日完成MBTI測驗一次', '當天完成一次MBTI測驗', 'daily', 1, 100, 16, 1, '2026-01-27 01:36:45', '2026-01-27 01:36:45');

-- 插入商品的初始資料
INSERT INTO shop_items 
(id, name, description, category, points_required, stock, limit_per_user, image_url, is_active, created_at, updated_at) 
VALUES
(1, '電影優惠券', '可用於指定影院的電影票優惠', 'coupon', 500, 100, 1, '/uploads/shop/movie_ticket.jpg', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(2, '咖啡券', '星巴克或類似咖啡店優惠券', 'coupon', 300, 200, 1, '/uploads/shop/coffee_coupon.jpg', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(3, '個性化頭像框', '特殊頭像框裝飾', 'virtual', 200, 1000, 1, '/uploads/shop/avatar_frame.png', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(4, '聊天氣泡皮膚', '個性化聊天氣泡樣式', 'virtual', 150, 500, 1, '/uploads/shop/chat_bubble.png', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(5, '7天VIP體驗', 'VIP特權體驗（無廣告、優先匹配）', 'virtual', 1000, 50, 1, '/uploads/shop/vip_badge.png', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(6, '實體禮品卡', '100元購物禮品卡（需填寫郵寄地址）', 'physical', 5000, 10, 1, '/uploads/shop/gift_card.jpg', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08');