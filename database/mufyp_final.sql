-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- 主機： 192.168.1.222:3308
-- 產生時間： 2026 年 04 月 16 日 08:19
-- 伺服器版本： 9.6.0
-- PHP 版本： 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 資料庫： `mufyp_6`
--

-- --------------------------------------------------------

--
-- 資料表結構 `ai_chat_history`
--

CREATE TABLE `ai_chat_history` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `chat_rooms`
--

CREATE TABLE `chat_rooms` (
  `id` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `type` enum('private','group','public') DEFAULT 'private',
  `description` text,
  `avatar` varchar(500) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_temp` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `chat_room_members`
--

CREATE TABLE `chat_room_members` (
  `id` int NOT NULL,
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `chat_room_reads`
--

CREATE TABLE `chat_room_reads` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `message_id` int DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `custom_levels`
--

CREATE TABLE `custom_levels` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `bgColor` varchar(50) DEFAULT '#2ecc71',
  `backgroundImage` varchar(500) DEFAULT NULL,
  `floors` json NOT NULL,
  `totalFloors` int DEFAULT '1',
  `unlockCondition` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `originalId` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `daily_checkins`
--

CREATE TABLE `daily_checkins` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `checkin_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `checkin_day` date GENERATED ALWAYS AS (cast(`checkin_date` as date)) STORED,
  `points_earned` int DEFAULT '10',
  `streak` int DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `daily_journals`
--

CREATE TABLE `daily_journals` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `content` text NOT NULL,
  `mood` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `friendships`
--

CREATE TABLE `friendships` (
  `id` int NOT NULL,
  `user1_id` int NOT NULL,
  `user2_id` int NOT NULL,
  `status` enum('pending','accepted','blocked') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `friend_requests`
--

CREATE TABLE `friend_requests` (
  `id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `group_invites`
--

CREATE TABLE `group_invites` (
  `id` int NOT NULL,
  `group_id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `instant_chat_invites`
--

CREATE TABLE `instant_chat_invites` (
  `id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `room_id` int NOT NULL,
  `status` enum('pending','accepted','rejected','expired') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `interests`
--

CREATE TABLE `interests` (
  `id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `category` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `keyword_triggers`
--

CREATE TABLE `keyword_triggers` (
  `id` int NOT NULL,
  `scenario_id` int NOT NULL,
  `task_index` int NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `speaker_id` int NOT NULL,
  `recorder_id` int NOT NULL,
  `points` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `mbti_game_results`
--

CREATE TABLE `mbti_game_results` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `level_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `game_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'mbti_adventure',
  `play_data` json DEFAULT NULL,
  `calculated_mbti` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` int DEFAULT '0',
  `play_time_seconds` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `mbti_history`
--

CREATE TABLE `mbti_history` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `mbti_type` varchar(4) NOT NULL,
  `test_mode` varchar(20) DEFAULT 'traditional',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `messages`
--

CREATE TABLE `messages` (
  `id` int NOT NULL,
  `room_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `message_type` varchar(20) DEFAULT 'text',
  `file_size` int DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `notifications`
--

CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` int NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text,
  `data` json DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `points_history`
--

CREATE TABLE `points_history` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `points` int NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'task_reward',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `posts`
--

CREATE TABLE `posts` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `content` text,
  `media_urls` text,
  `media_types` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `safety_score` float DEFAULT '0',
  `is_approved` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `post_comments`
--

CREATE TABLE `post_comments` (
  `id` int NOT NULL,
  `post_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `safety_score` float DEFAULT '0',
  `is_approved` tinyint(1) DEFAULT '1',
  `moderation_reason` text,
  `moderated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `post_likes`
--

CREATE TABLE `post_likes` (
  `id` int NOT NULL,
  `post_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `reposts`
--

CREATE TABLE `reposts` (
  `id` int NOT NULL,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `scenario_invites`
--

CREATE TABLE `scenario_invites` (
  `id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `scenario_data` json DEFAULT NULL,
  `status` enum('pending','accepted','rejected','expired') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `scenario_templates`
--

CREATE TABLE `scenario_templates` (
  `id` int NOT NULL,
  `title` varchar(100) NOT NULL COMMENT '劇本標題',
  `description` text COMMENT '劇本簡介',
  `cover_image` varchar(255) DEFAULT NULL COMMENT '封面圖片 URL',
  `location_name` varchar(255) DEFAULT NULL COMMENT '建議地點名稱',
  `location_lat` decimal(10,8) DEFAULT NULL COMMENT '建議地點緯度',
  `location_lng` decimal(11,8) DEFAULT NULL COMMENT '建議地點經度',
  `radius` int DEFAULT '100' COMMENT '打卡半徑(米)',
  `tasks` json DEFAULT NULL COMMENT '任務清單 (JSON)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- 傾印資料表的資料 `scenario_templates`
--

INSERT INTO `scenario_templates` (`id`, `title`, `description`, `cover_image`, `location_name`, `location_lat`, `location_lng`, `radius`, `tasks`, `created_at`) VALUES
(1, '星巴克特務密令', '兩位特務在星巴克交換情報，必須說出暗號「我愛咖啡」才算成功。', NULL, '星巴克 (中環店)', 22.28140000, 114.15850000, 50, '[{\"code\": \"我愛咖啡\", \"desc\": \"說出暗號「我愛咖啡」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"我愛你\", \"你好\", \"再見\", \"謝謝\", \"對不起\", \"請\", \"好\", \"不好\", \"可以\", \"不可以\"]}]', '2026-03-22 14:07:40'),
(2, '摩天輪下的約定', '在維港摩天輪下相遇，必須完成合照任務。', NULL, '香港摩天輪', 22.28540000, 114.15970000, 80, '[{\"code\": \"摩天輪好靚\", \"desc\": \"說出暗號「摩天輪好靚」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"摩天輪\", \"維港\", \"夜景\", \"浪漫\", \"幸福\", \"快樂\", \"約會\", \"甜蜜\", \"笑容\", \"回憶\"]}]', '2026-03-22 14:07:40'),
(3, '文青書店邂逅', '在誠品書店尋找同一本書，然後用「這本書很好看」作為暗號。', NULL, '誠品書店 (銅鑼灣)', 22.28070000, 114.18320000, 60, '[{\"code\": \"這本書很好看\", \"desc\": \"說出暗號「這本書很好看」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"書店\", \"文青\", \"閱讀\", \"文學\", \"故事\", \"作者\", \"扉頁\", \"咖啡\", \"寧靜\", \"靈感\"]}]', '2026-03-22 14:07:40'),
(4, '深夜食堂挑戰', '在日式居酒屋完成暗號「おいしい」，並互拍一張食物照。', NULL, '和民居酒屋 (尖沙咀)', 22.29520000, 114.17230000, 70, '[{\"code\": \"おいしい\", \"desc\": \"說出暗號「おいしい」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"美食\", \"居酒屋\", \"刺身\", \"壽司\", \"清酒\", \"味增\", \"烤物\", \"炸物\", \"和風\", \"新鮮\"]}]', '2026-03-22 14:07:40'),
(5, '海濱長廊漫步', '在觀塘海濱長廊找到對方，並說出「海風好舒服」。', NULL, '觀塘海濱長廊', 22.31110000, 114.22380000, 100, '[{\"code\": \"海風好舒服\", \"desc\": \"說出暗號「海風好舒服」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"海風\", \"海濱\", \"長廊\", \"散步\", \"夕陽\", \"海浪\", \"微風\", \"寧靜\", \"愜意\", \"放鬆\"]}]', '2026-03-22 14:07:40');

-- --------------------------------------------------------

--
-- 資料表結構 `shop_items`
--

CREATE TABLE `shop_items` (
  `id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `points_required` int NOT NULL,
  `stock` int DEFAULT '1',
  `limit_per_user` int DEFAULT '1',
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `shop_items`
--

INSERT INTO `shop_items` (`id`, `name`, `description`, `category`, `points_required`, `stock`, `limit_per_user`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES
(1, '電影優惠券', '可用於指定影院的電影票優惠', 'coupon', 500, 100, 1, '/uploads/shop/movie_ticket.png', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(2, '咖啡券', '星巴克或類似咖啡店優惠券', 'coupon', 300, 200, 1, '/uploads/shop/coffee_coupon.png', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(3, '$50 現金券', '$50 現金券', 'virtual', 150, 1000, 1, '/uploads/shop/50_coupon.png', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(4, '$100 現金券', '$100 現金券', 'virtual', 300, 500, 1, '/uploads/shop/100_coupon.png', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(5, '超級市場現金券', '超級市場現金券', 'virtual', 1000, 50, 1, '/uploads/shop/supermarket.png', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08'),
(6, '禮品卡', '購物禮品卡', 'physical', 5000, 10, 1, '/uploads/shop/gift_card.jpg', 1, '2026-01-15 17:47:08', '2026-01-15 17:47:08');

-- --------------------------------------------------------

--
-- 資料表結構 `tasks`
--

CREATE TABLE `tasks` (
  `id` int NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `task_type` enum('daily','achievement','special') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'daily',
  `points_required` int DEFAULT '1',
  `points_reward` int DEFAULT '10',
  `priority` int DEFAULT '5',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `description`, `task_type`, `points_required`, `points_reward`, `priority`, `is_active`, `created_at`, `updated_at`) VALUES
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

-- --------------------------------------------------------

--
-- 資料表結構 `task_confirmations`
--

CREATE TABLE `task_confirmations` (
  `id` int NOT NULL,
  `scenario_id` int NOT NULL,
  `task_index` int NOT NULL,
  `user_id` int NOT NULL,
  `confirmed` tinyint(1) DEFAULT '0',
  `confirmed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `task_verifications`
--

CREATE TABLE `task_verifications` (
  `id` int NOT NULL,
  `scenario_id` int NOT NULL,
  `task_index` int NOT NULL,
  `user_id` int NOT NULL,
  `type` enum('gps','code_exchange','photo') NOT NULL,
  `data` json DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `temp_chat_invites`
--

CREATE TABLE `temp_chat_invites` (
  `id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `status` enum('pending','accepted','rejected','expired') DEFAULT 'pending',
  `room_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `notify_sender` tinyint(1) DEFAULT '0',
  `sender_entered` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `points` int DEFAULT '0',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '/uploads/avatars/default.png',
  `mbti` varchar(4) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `last_active` timestamp NULL DEFAULT NULL,
  `bio` text,
  `expo_push_token` varchar(255) DEFAULT NULL,
  `character` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `user_coupons`
--

CREATE TABLE `user_coupons` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `coupon_code` varchar(50) NOT NULL,
  `qr_code_data` text,
  `status` enum('unused','used','expired') DEFAULT 'unused',
  `expires_at` timestamp NULL DEFAULT NULL,
  `redeemed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `user_insights_cache`
--

CREATE TABLE `user_insights_cache` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `report_type` enum('personality_trend','social_report') NOT NULL,
  `report_data` json DEFAULT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `user_interests`
--

CREATE TABLE `user_interests` (
  `user_id` int NOT NULL,
  `interest_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `user_locations`
--

CREATE TABLE `user_locations` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `accuracy` float DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `user_redemptions`
--

CREATE TABLE `user_redemptions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `status` enum('pending','redeemed','shipped','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `redeemed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `user_scenarios`
--

CREATE TABLE `user_scenarios` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `target_user_id` int NOT NULL,
  `scenario_data` json DEFAULT NULL,
  `status` enum('active','completed','expired') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `tasks_status` json DEFAULT NULL COMMENT '記錄每個任務嘅雙方完成狀態'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- 資料表結構 `user_tasks`
--

CREATE TABLE `user_tasks` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `task_id` int NOT NULL,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `current_progress` int DEFAULT '0',
  `user_status` enum('not_started','in_progress','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'not_started'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


--
-- 已傾印資料表的索引
--

--
-- 資料表索引 `ai_chat_history`
--
ALTER TABLE `ai_chat_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_created` (`user_id`,`created_at`);

--
-- 資料表索引 `chat_rooms`
--
ALTER TABLE `chat_rooms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by` (`created_by`);

--
-- 資料表索引 `chat_room_members`
--
ALTER TABLE `chat_room_members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room` (`room_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- 資料表索引 `chat_room_reads`
--
ALTER TABLE `chat_room_reads`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_read` (`user_id`,`room_id`),
  ADD KEY `idx_room` (`room_id`);

--
-- 資料表索引 `custom_levels`
--
ALTER TABLE `custom_levels`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- 資料表索引 `daily_checkins`
--
ALTER TABLE `daily_checkins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_daily_checkin` (`user_id`,`checkin_day`);

--
-- 資料表索引 `daily_journals`
--
ALTER TABLE `daily_journals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_date` (`user_id`,`created_at`);

--
-- 資料表索引 `friendships`
--
ALTER TABLE `friendships`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user1` (`user1_id`),
  ADD KEY `idx_user2` (`user2_id`);

--
-- 資料表索引 `friend_requests`
--
ALTER TABLE `friend_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_from` (`from_user_id`),
  ADD KEY `idx_to` (`to_user_id`);

--
-- 資料表索引 `group_invites`
--
ALTER TABLE `group_invites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_invite` (`group_id`,`to_user_id`),
  ADD KEY `from_user_id` (`from_user_id`),
  ADD KEY `to_user_id` (`to_user_id`);

--
-- 資料表索引 `instant_chat_invites`
--
ALTER TABLE `instant_chat_invites`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `to_user_id` (`to_user_id`);

--
-- 資料表索引 `interests`
--
ALTER TABLE `interests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_interest` (`name`);

--
-- 資料表索引 `keyword_triggers`
--
ALTER TABLE `keyword_triggers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_keyword` (`scenario_id`,`task_index`,`keyword`),
  ADD KEY `speaker_id` (`speaker_id`),
  ADD KEY `recorder_id` (`recorder_id`);

--
-- 資料表索引 `mbti_game_results`
--
ALTER TABLE `mbti_game_results`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `created_at` (`created_at`);

--
-- 資料表索引 `mbti_history`
--
ALTER TABLE `mbti_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id_created_at` (`user_id`,`created_at`);

--
-- 資料表索引 `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room` (`room_id`),
  ADD KEY `idx_sender` (`sender_id`);

--
-- 資料表索引 `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_read` (`user_id`,`is_read`,`created_at`);

--
-- 資料表索引 `points_history`
--
ALTER TABLE `points_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`);

--
-- 資料表索引 `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_posts_approved` (`user_id`,`is_approved`,`created_at`);

--
-- 資料表索引 `post_comments`
--
ALTER TABLE `post_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_post` (`post_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_post_comments_approved` (`post_id`,`is_approved`,`created_at`);

--
-- 資料表索引 `post_likes`
--
ALTER TABLE `post_likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_like` (`post_id`,`user_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- 資料表索引 `reposts`
--
ALTER TABLE `reposts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_post` (`post_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- 資料表索引 `scenario_invites`
--
ALTER TABLE `scenario_invites`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_from` (`from_user_id`),
  ADD KEY `idx_to` (`to_user_id`);

--
-- 資料表索引 `scenario_templates`
--
ALTER TABLE `scenario_templates`
  ADD PRIMARY KEY (`id`);

--
-- 資料表索引 `shop_items`
--
ALTER TABLE `shop_items`
  ADD PRIMARY KEY (`id`);

--
-- 資料表索引 `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`);

--
-- 資料表索引 `task_confirmations`
--
ALTER TABLE `task_confirmations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_confirmation` (`scenario_id`,`task_index`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- 資料表索引 `task_verifications`
--
ALTER TABLE `task_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_task` (`scenario_id`,`task_index`,`user_id`,`type`),
  ADD KEY `user_id` (`user_id`);

--
-- 資料表索引 `temp_chat_invites`
--
ALTER TABLE `temp_chat_invites`
  ADD PRIMARY KEY (`id`),
  ADD KEY `from_user_id` (`from_user_id`),
  ADD KEY `to_user_id` (`to_user_id`);

--
-- 資料表索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- 資料表索引 `user_coupons`
--
ALTER TABLE `user_coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `coupon_code` (`coupon_code`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `item_id` (`item_id`);

--
-- 資料表索引 `user_insights_cache`
--
ALTER TABLE `user_insights_cache`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_type` (`user_id`,`report_type`);

--
-- 資料表索引 `user_interests`
--
ALTER TABLE `user_interests`
  ADD PRIMARY KEY (`user_id`,`interest_id`),
  ADD KEY `interest_id` (`interest_id`);

--
-- 資料表索引 `user_locations`
--
ALTER TABLE `user_locations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- 資料表索引 `user_redemptions`
--
ALTER TABLE `user_redemptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_item` (`item_id`);

--
-- 資料表索引 `user_scenarios`
--
ALTER TABLE `user_scenarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `target_user_id` (`target_user_id`),
  ADD KEY `idx_users` (`user_id`,`target_user_id`);

--
-- 資料表索引 `user_tasks`
--
ALTER TABLE `user_tasks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_task` (`user_id`,`task_id`),
  ADD KEY `idx_task` (`task_id`);

--
-- 在傾印的資料表使用自動遞增(AUTO_INCREMENT)
--

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `ai_chat_history`
--
ALTER TABLE `ai_chat_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `chat_rooms`
--
ALTER TABLE `chat_rooms`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `chat_room_members`
--
ALTER TABLE `chat_room_members`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `chat_room_reads`
--
ALTER TABLE `chat_room_reads`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `custom_levels`
--
ALTER TABLE `custom_levels`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `daily_checkins`
--
ALTER TABLE `daily_checkins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `daily_journals`
--
ALTER TABLE `daily_journals`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `friendships`
--
ALTER TABLE `friendships`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `friend_requests`
--
ALTER TABLE `friend_requests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `group_invites`
--
ALTER TABLE `group_invites`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `instant_chat_invites`
--
ALTER TABLE `instant_chat_invites`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `interests`
--
ALTER TABLE `interests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `keyword_triggers`
--
ALTER TABLE `keyword_triggers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `mbti_game_results`
--
ALTER TABLE `mbti_game_results`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `mbti_history`
--
ALTER TABLE `mbti_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `points_history`
--
ALTER TABLE `points_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `posts`
--
ALTER TABLE `posts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `post_comments`
--
ALTER TABLE `post_comments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `post_likes`
--
ALTER TABLE `post_likes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `reposts`
--
ALTER TABLE `reposts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `scenario_invites`
--
ALTER TABLE `scenario_invites`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `scenario_templates`
--
ALTER TABLE `scenario_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `shop_items`
--
ALTER TABLE `shop_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `task_confirmations`
--
ALTER TABLE `task_confirmations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `task_verifications`
--
ALTER TABLE `task_verifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `temp_chat_invites`
--
ALTER TABLE `temp_chat_invites`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_coupons`
--
ALTER TABLE `user_coupons`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_insights_cache`
--
ALTER TABLE `user_insights_cache`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_locations`
--
ALTER TABLE `user_locations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_redemptions`
--
ALTER TABLE `user_redemptions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_scenarios`
--
ALTER TABLE `user_scenarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_tasks`
--
ALTER TABLE `user_tasks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=145;

--
-- 已傾印資料表的限制式
--

--
-- 資料表的限制式 `custom_levels`
--
ALTER TABLE `custom_levels`
  ADD CONSTRAINT `custom_levels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `daily_journals`
--
ALTER TABLE `daily_journals`
  ADD CONSTRAINT `daily_journals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `group_invites`
--
ALTER TABLE `group_invites`
  ADD CONSTRAINT `group_invites_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_invites_ibfk_2` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_invites_ibfk_3` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `keyword_triggers`
--
ALTER TABLE `keyword_triggers`
  ADD CONSTRAINT `keyword_triggers_ibfk_1` FOREIGN KEY (`scenario_id`) REFERENCES `user_scenarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `keyword_triggers_ibfk_2` FOREIGN KEY (`speaker_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `keyword_triggers_ibfk_3` FOREIGN KEY (`recorder_id`) REFERENCES `users` (`id`);

--
-- 資料表的限制式 `mbti_game_results`
--
ALTER TABLE `mbti_game_results`
  ADD CONSTRAINT `mbti_game_results_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `mbti_history`
--
ALTER TABLE `mbti_history`
  ADD CONSTRAINT `fk_mbti_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `points_history`
--
ALTER TABLE `points_history`
  ADD CONSTRAINT `points_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

--
-- 資料表的限制式 `scenario_invites`
--
ALTER TABLE `scenario_invites`
  ADD CONSTRAINT `scenario_invites_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `scenario_invites_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `task_confirmations`
--
ALTER TABLE `task_confirmations`
  ADD CONSTRAINT `task_confirmations_ibfk_1` FOREIGN KEY (`scenario_id`) REFERENCES `user_scenarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_confirmations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `task_verifications`
--
ALTER TABLE `task_verifications`
  ADD CONSTRAINT `task_verifications_ibfk_1` FOREIGN KEY (`scenario_id`) REFERENCES `user_scenarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_verifications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `temp_chat_invites`
--
ALTER TABLE `temp_chat_invites`
  ADD CONSTRAINT `temp_chat_invites_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `temp_chat_invites_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `user_coupons`
--
ALTER TABLE `user_coupons`
  ADD CONSTRAINT `user_coupons_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_coupons_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `shop_items` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `user_insights_cache`
--
ALTER TABLE `user_insights_cache`
  ADD CONSTRAINT `user_insights_cache_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `user_interests`
--
ALTER TABLE `user_interests`
  ADD CONSTRAINT `user_interests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_interests_ibfk_2` FOREIGN KEY (`interest_id`) REFERENCES `interests` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `user_locations`
--
ALTER TABLE `user_locations`
  ADD CONSTRAINT `user_locations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `user_scenarios`
--
ALTER TABLE `user_scenarios`
  ADD CONSTRAINT `user_scenarios_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_scenarios_ibfk_2` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
