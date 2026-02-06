-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- 主機： 192.168.1.222:3308
-- 產生時間： 2026 年 02 月 03 日 05:23
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
-- 資料庫： `mufyp_demo`
--

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
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- 傾印資料表的資料 `chat_rooms`
--

INSERT INTO `chat_rooms` (`id`, `name`, `type`, `description`, `avatar`, `created_by`, `created_at`, `last_activity`) VALUES
(1, 'Ben', 'private', NULL, 'http://192.168.1.11:3000/uploads/avatars/1770093813166-972135021.jpg', NULL, '2026-02-03 04:44:41', '2026-02-03 04:45:16'),
(2, '吹水 Group', 'group', '', NULL, NULL, '2026-02-03 04:47:09', '2026-02-03 04:47:09'),
(3, 'Sam', 'private', NULL, 'http://192.168.1.11:3000/uploads/avatars/1770093565758-79996471.jpg', NULL, '2026-02-03 04:47:14', '2026-02-03 04:47:14');

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

--
-- 傾印資料表的資料 `chat_room_members`
--

INSERT INTO `chat_room_members` (`id`, `room_id`, `user_id`, `joined_at`) VALUES
(1, 1, 1, '2026-02-03 04:44:41'),
(2, 1, 4, '2026-02-03 04:44:41'),
(3, 2, 2, '2026-02-03 04:47:09'),
(4, 2, 1, '2026-02-03 04:47:09'),
(5, 3, 2, '2026-02-03 04:47:14'),
(6, 3, 1, '2026-02-03 04:47:14'),
(7, 2, 4, '2026-02-03 04:48:12');

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

--
-- 傾印資料表的資料 `chat_room_reads`
--

INSERT INTO `chat_room_reads` (`id`, `user_id`, `room_id`, `message_id`, `read_at`) VALUES
(1, 1, 1, 2, '2026-02-03 04:45:32'),
(4, 4, 1, 2, '2026-02-03 04:45:17');

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
-- 資料表結構 `friendships`
--

CREATE TABLE `friendships` (
  `id` int NOT NULL,
  `user1_id` int NOT NULL,
  `user2_id` int NOT NULL,
  `status` enum('pending','accepted','blocked') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- 傾印資料表的資料 `friendships`
--

INSERT INTO `friendships` (`id`, `user1_id`, `user2_id`, `status`, `created_at`) VALUES
(1, 4, 1, 'accepted', '2026-02-03 04:44:34'),
(2, 1, 2, 'accepted', '2026-02-03 04:46:05');

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

--
-- 傾印資料表的資料 `friend_requests`
--

INSERT INTO `friend_requests` (`id`, `from_user_id`, `to_user_id`, `status`, `created_at`) VALUES
(1, 4, 1, 'accepted', '2026-02-03 04:44:16'),
(2, 1, 2, 'accepted', '2026-02-03 04:45:51');

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

--
-- 傾印資料表的資料 `mbti_history`
--

INSERT INTO `mbti_history` (`id`, `user_id`, `mbti_type`, `test_mode`, `created_at`) VALUES
(1, 2, 'ISTJ', 'app', '2026-02-03 04:41:19');

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

--
-- 傾印資料表的資料 `messages`
--

INSERT INTO `messages` (`id`, `room_id`, `sender_id`, `content`, `created_at`, `message_type`, `file_size`, `file_name`) VALUES
(1, 1, 1, 'Hello!', '2026-02-03 04:44:47', 'text', NULL, NULL),
(2, 1, 4, 'Hi! Nice to meet you', '2026-02-03 04:45:16', 'text', NULL, NULL);

-- --------------------------------------------------------

--
-- 資料表結構 `points_history`
--

CREATE TABLE `points_history` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `points` int NOT NULL,
  `type` enum('task_reward','daily_checkin','item_redeem','system_bonus','referral') COLLATE utf8mb4_unicode_ci DEFAULT 'task_reward',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `points_history`
--

INSERT INTO `points_history` (`id`, `user_id`, `points`, `type`, `description`, `created_at`) VALUES
(1, 1, 200, 'task_reward', '完成任務: 上傳頭像', '2026-02-03 04:39:27'),
(2, 2, 200, 'task_reward', '完成任務: 上傳頭像', '2026-02-03 04:40:57'),
(3, 2, 500, 'task_reward', '完成任務: 完成MBTI測驗', '2026-02-03 04:41:20'),
(4, 2, 100, 'task_reward', '完成任務: 每日完成MBTI測驗一次', '2026-02-03 04:41:20'),
(5, 4, 200, 'task_reward', '完成任務: 上傳頭像', '2026-02-03 04:43:35'),
(6, 1, 500, 'task_reward', '完成任務: 添加第一位好友', '2026-02-03 04:44:37'),
(7, 1, 100, 'task_reward', '完成任務: 發送第一條消息', '2026-02-03 04:44:51'),
(8, 4, 500, 'task_reward', '完成任務: 添加第一位好友', '2026-02-03 04:44:58'),
(9, 4, 100, 'task_reward', '完成任務: 發送第一條消息', '2026-02-03 04:45:19'),
(10, 2, 500, 'task_reward', '完成任務: 添加第一位好友', '2026-02-03 04:47:22'),
(11, 1, 200, 'task_reward', '完成任務: 在討論區張貼首個貼文', '2026-02-03 04:51:33'),
(12, 2, 200, 'task_reward', '完成任務: 在討論區張貼首個貼文', '2026-02-03 04:53:09'),
(13, 3, 200, 'task_reward', '完成任務: 在討論區張貼首個貼文', '2026-02-03 05:21:42'),
(14, 1, 100, 'task_reward', '完成任務: 點讚一個貼文', '2026-02-03 05:22:22'),
(15, 4, 100, 'task_reward', '完成任務: 點讚一個貼文', '2026-02-03 05:22:58');

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
  `media_type` enum('image','video','none') DEFAULT 'none',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- 傾印資料表的資料 `posts`
--

INSERT INTO `posts` (`id`, `user_id`, `content`, `media_urls`, `media_types`, `media_type`, `created_at`) VALUES
(1, 1, 'Beautiful view\n\n#tokyo', '[\"/uploads/post_media/images/1770094235808-538395763.jpg\"]', '[\"image\"]', 'none', '2026-02-03 04:50:36'),
(2, 2, 'Hi guys!\n\n#FirstPost', '[\"/uploads/post_media/images/1770094371766-816857412.jpg\"]', '[\"image\"]', 'none', '2026-02-03 04:52:52'),
(3, 3, 'Hi all!', '[]', '[]', 'none', '2026-02-03 05:21:35');

-- --------------------------------------------------------

--
-- 資料表結構 `post_comments`
--

CREATE TABLE `post_comments` (
  `id` int NOT NULL,
  `post_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- 傾印資料表的資料 `post_comments`
--

INSERT INTO `post_comments` (`id`, `post_id`, `user_id`, `content`, `created_at`) VALUES
(1, 2, 1, 'Hi!', '2026-02-03 05:22:14'),
(2, 3, 4, 'Welcome!', '2026-02-03 05:22:37'),
(3, 1, 4, 'good view!', '2026-02-03 05:22:50');

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

--
-- 傾印資料表的資料 `post_likes`
--

INSERT INTO `post_likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES
(1, 2, 1, '2026-02-03 05:22:03'),
(2, 3, 1, '2026-02-03 05:22:19'),
(3, 3, 4, '2026-02-03 05:22:32'),
(4, 1, 4, '2026-02-03 05:22:43');

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
(1, '電影優惠券', '可用於指定影院的電影票優惠', 'coupon', 500, 100, 1, '/uploads/shop/movie_ticket.jpg', 1, '2026-01-15 09:47:08', '2026-01-15 09:47:08'),
(2, '咖啡券', '星巴克或類似咖啡店優惠券', 'coupon', 300, 200, 1, '/uploads/shop/coffee_coupon.jpg', 1, '2026-01-15 09:47:08', '2026-01-15 09:47:08'),
(3, '個性化頭像框', '特殊頭像框裝飾', 'virtual', 200, 1000, 1, '/uploads/shop/avatar_frame.png', 1, '2026-01-15 09:47:08', '2026-01-15 09:47:08'),
(4, '聊天氣泡皮膚', '個性化聊天氣泡樣式', 'virtual', 150, 500, 1, '/uploads/shop/chat_bubble.png', 1, '2026-01-15 09:47:08', '2026-01-15 09:47:08'),
(5, '7天VIP體驗', 'VIP特權體驗（無廣告、優先匹配）', 'virtual', 1000, 50, 1, '/uploads/shop/vip_badge.png', 1, '2026-01-15 09:47:08', '2026-01-15 09:47:08'),
(6, '實體禮品卡', '100元購物禮品卡（需填寫郵寄地址）', 'physical', 5000, 10, 1, '/uploads/shop/gift_card.jpg', 1, '2026-01-15 09:47:08', '2026-01-15 09:47:08');

-- --------------------------------------------------------

--
-- 資料表結構 `tasks`
--

CREATE TABLE `tasks` (
  `id` int NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `task_type` enum('daily','achievement','special') COLLATE utf8mb4_unicode_ci DEFAULT 'daily',
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
(1, '完成MBTI測驗', '完成一次完整的MBTI性格測試', 'achievement', 1, 500, 1, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(2, '發送第一條消息', '在好友或群組聊天中發送第一條消息', 'achievement', 1, 100, 2, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(3, '添加第一位好友', '成功添加一位好友', 'achievement', 1, 500, 3, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(4, '在討論區張貼首個貼文', '在討論區發佈第一篇貼文', 'achievement', 1, 200, 4, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(5, '點讚一個貼文', '對任何貼文點讚一次', 'achievement', 1, 100, 5, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(6, '轉發一個貼文', '轉發任何一篇貼文', 'achievement', 1, 50, 6, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(7, '上傳頭像', '設置個人頭像（非預設）', 'achievement', 1, 200, 7, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(8, '連續7天簽到', '連續簽到7天', 'achievement', 7, 500, 8, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(9, '連續14天簽到', '連續簽到14天', 'achievement', 14, 600, 9, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(10, '連續30天簽到', '連續簽到30天', 'achievement', 30, 800, 10, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(11, '連續60天簽到', '連續簽到60天', 'achievement', 60, 1000, 11, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(12, '連續90天簽到', '連續簽到90天', 'achievement', 90, 1500, 12, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(13, '連續180天簽到', '連續簽到180天', 'achievement', 180, 2500, 13, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(14, '連續365天簽到', '連續簽到365天', 'achievement', 365, 5000, 14, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(15, '每日發送5條訊息', '在任何聊天室發送5條訊息', 'daily', 5, 50, 15, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45'),
(16, '每日完成MBTI測驗一次', '當天完成一次MBTI測驗', 'daily', 1, 100, 16, 1, '2026-01-26 17:36:45', '2026-01-26 17:36:45');

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
  `bio` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- 傾印資料表的資料 `users`
--

INSERT INTO `users` (`id`, `points`, `username`, `password`, `email`, `avatar`, `mbti`, `status`, `last_active`, `bio`) VALUES
(1, 1100, 'Sam', '$2b$10$DTZDqblK.FEcpEo2C6d52ukSw.Z.wIUMQ.m9kma6S9ZOMKPcbIoUK', 'sam@gmail.com', '/uploads/avatars/1770093565758-79996471.jpg', NULL, NULL, '2026-02-03 05:21:54', NULL),
(2, 1500, 'Mary', '$2b$10$4TwqQwZSkFrxJ8lkvegnqu1fzoIqsQ81.w6BkLy19M2N487yB.CeK', 'mary@gmail.com', '/uploads/avatars/1770093656449-439741123.jpg', 'ISTJ', NULL, '2026-02-03 04:52:30', NULL),
(3, 200, 'Tom', '$2b$10$kw/UEj.3pY.z.7p7ZVJ0befkpstffE1YZlTjL9h/a.yBspI1bKF2C', 'tom@gmail.com', '/uploads/avatars/default.png', NULL, NULL, '2026-02-03 05:21:23', NULL),
(4, 900, 'Ben', '$2b$10$UXdiXg.9WklPpuXkmQ8AqeoIOCN8SU.FPRsp54WyTVQrHhiMn6JRq', 'ben@gmail.com', '/uploads/avatars/1770093813166-972135021.jpg', NULL, NULL, '2026-02-03 05:22:29', NULL);

-- --------------------------------------------------------

--
-- 資料表結構 `user_redemptions`
--

CREATE TABLE `user_redemptions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `status` enum('pending','redeemed','shipped','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `redeemed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `user_status` enum('not_started','in_progress','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'not_started'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `user_tasks`
--

INSERT INTO `user_tasks` (`id`, `user_id`, `task_id`, `started_at`, `completed_at`, `current_progress`, `user_status`) VALUES
(1, 1, 1, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(2, 1, 2, '2026-02-03 04:36:38', '2026-02-03 04:44:51', 1, 'completed'),
(3, 1, 3, '2026-02-03 04:36:38', '2026-02-03 04:44:37', 1, 'completed'),
(4, 1, 4, '2026-02-03 04:36:38', '2026-02-03 04:51:33', 1, 'completed'),
(5, 1, 5, '2026-02-03 04:36:38', '2026-02-03 05:22:23', 1, 'completed'),
(6, 1, 6, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(7, 1, 7, '2026-02-03 04:36:38', '2026-02-03 04:39:27', 1, 'completed'),
(8, 1, 8, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(9, 1, 9, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(10, 1, 10, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(11, 1, 11, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(12, 1, 12, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(13, 1, 13, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(14, 1, 14, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(15, 1, 15, '2026-02-03 04:36:38', NULL, 1, 'in_progress'),
(16, 1, 16, '2026-02-03 04:36:38', NULL, 0, 'in_progress'),
(17, 2, 1, '2026-02-03 04:40:36', '2026-02-03 04:41:20', 1, 'completed'),
(18, 2, 2, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(19, 2, 3, '2026-02-03 04:40:36', '2026-02-03 04:47:22', 1, 'completed'),
(20, 2, 4, '2026-02-03 04:40:36', '2026-02-03 04:53:09', 1, 'completed'),
(21, 2, 5, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(22, 2, 6, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(23, 2, 7, '2026-02-03 04:40:36', '2026-02-03 04:40:57', 1, 'completed'),
(24, 2, 8, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(25, 2, 9, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(26, 2, 10, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(27, 2, 11, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(28, 2, 12, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(29, 2, 13, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(30, 2, 14, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(31, 2, 15, '2026-02-03 04:40:36', NULL, 0, 'in_progress'),
(32, 2, 16, '2026-02-03 04:40:36', NULL, 1, 'completed'),
(33, 3, 1, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(34, 3, 2, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(35, 3, 3, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(36, 3, 4, '2026-02-03 04:41:59', '2026-02-03 05:21:42', 1, 'completed'),
(37, 3, 5, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(38, 3, 6, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(39, 3, 7, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(40, 3, 8, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(41, 3, 9, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(42, 3, 10, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(43, 3, 11, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(44, 3, 12, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(45, 3, 13, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(46, 3, 14, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(47, 3, 15, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(48, 3, 16, '2026-02-03 04:41:59', NULL, 0, 'in_progress'),
(49, 4, 1, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(50, 4, 2, '2026-02-03 04:43:06', '2026-02-03 04:45:19', 1, 'completed'),
(51, 4, 3, '2026-02-03 04:43:06', '2026-02-03 04:44:58', 1, 'completed'),
(52, 4, 4, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(53, 4, 5, '2026-02-03 04:43:06', '2026-02-03 05:22:58', 1, 'completed'),
(54, 4, 6, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(55, 4, 7, '2026-02-03 04:43:06', '2026-02-03 04:43:35', 1, 'completed'),
(56, 4, 8, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(57, 4, 9, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(58, 4, 10, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(59, 4, 11, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(60, 4, 12, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(61, 4, 13, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(62, 4, 14, '2026-02-03 04:43:06', NULL, 0, 'in_progress'),
(63, 4, 15, '2026-02-03 04:43:06', NULL, 1, 'in_progress'),
(64, 4, 16, '2026-02-03 04:43:06', NULL, 0, 'in_progress');

--
-- 已傾印資料表的索引
--

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
-- 資料表索引 `daily_checkins`
--
ALTER TABLE `daily_checkins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_daily_checkin` (`user_id`,`checkin_day`);

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
  ADD KEY `idx_user` (`user_id`);

--
-- 資料表索引 `post_comments`
--
ALTER TABLE `post_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_post` (`post_id`),
  ADD KEY `idx_user` (`user_id`);

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
-- 資料表索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- 資料表索引 `user_redemptions`
--
ALTER TABLE `user_redemptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_item` (`item_id`);

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
-- 使用資料表自動遞增(AUTO_INCREMENT) `chat_rooms`
--
ALTER TABLE `chat_rooms`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `chat_room_members`
--
ALTER TABLE `chat_room_members`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `chat_room_reads`
--
ALTER TABLE `chat_room_reads`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `daily_checkins`
--
ALTER TABLE `daily_checkins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `friendships`
--
ALTER TABLE `friendships`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `friend_requests`
--
ALTER TABLE `friend_requests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `mbti_history`
--
ALTER TABLE `mbti_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `points_history`
--
ALTER TABLE `points_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `posts`
--
ALTER TABLE `posts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `post_comments`
--
ALTER TABLE `post_comments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `post_likes`
--
ALTER TABLE `post_likes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `reposts`
--
ALTER TABLE `reposts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

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
-- 使用資料表自動遞增(AUTO_INCREMENT) `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_redemptions`
--
ALTER TABLE `user_redemptions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_tasks`
--
ALTER TABLE `user_tasks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- 已傾印資料表的限制式
--

--
-- 資料表的限制式 `mbti_history`
--
ALTER TABLE `mbti_history`
  ADD CONSTRAINT `fk_mbti_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
