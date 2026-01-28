-- Adminer 5.4.1 MySQL 9.5.0 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `chat_room_members`;
CREATE TABLE `chat_room_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chat_room_members_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`),
  CONSTRAINT `chat_room_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `chat_room_members` (`id`, `room_id`, `user_id`, `joined_at`) VALUES
(1,	1,	4,	'2026-01-07 08:11:39'),
(2,	1,	3,	'2026-01-07 08:11:39'),
(3,	2,	3,	'2026-01-10 13:24:11'),
(5,	2,	4,	'2026-01-10 14:54:36'),
(6,	3,	7,	'2026-01-26 05:08:49'),
(7,	3,	3,	'2026-01-26 05:08:49'),
(8,	4,	7,	'2026-01-26 05:09:44'),
(9,	4,	3,	'2026-01-26 05:09:44');

DROP TABLE IF EXISTS `chat_room_reads`;
CREATE TABLE `chat_room_reads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `message_id` int DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_read` (`user_id`,`room_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `chat_room_reads_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_room_reads_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `chat_room_reads` (`id`, `user_id`, `room_id`, `message_id`, `read_at`) VALUES
(1,	4,	1,	38,	'2026-01-23 10:24:49'),
(68,	3,	1,	43,	'2026-01-23 16:12:31'),
(3155,	3,	2,	30,	'2026-01-23 16:13:50'),
(3277,	4,	2,	23,	'2026-01-10 14:56:31'),
(3528,	7,	3,	44,	'2026-01-26 05:09:02'),
(3531,	7,	4,	45,	'2026-01-26 05:09:48');

DROP TABLE IF EXISTS `chat_rooms`;
CREATE TABLE `chat_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `type` enum('private','group','public') DEFAULT 'private',
  `description` text,
  `avatar` varchar(500) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `chat_rooms_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `chat_rooms` (`id`, `name`, `type`, `description`, `avatar`, `created_by`, `created_at`, `last_activity`) VALUES
(1,	'test',	'private',	NULL,	NULL,	NULL,	'2026-01-07 08:11:39',	'2026-01-23 14:17:32'),
(2,	'AV',	'group',	'Test',	NULL,	NULL,	'2026-01-10 13:24:11',	'2026-01-23 07:41:14'),
(3,	'test',	'private',	NULL,	'http://192.168.0.26:3000/uploads/avatars/user_3_1768501742098.jpg?cb=1769404188994',	NULL,	'2026-01-26 05:08:49',	'2026-01-26 05:08:56'),
(4,	'HI',	'group',	'GG',	NULL,	NULL,	'2026-01-26 05:09:44',	'2026-01-26 05:09:48');

DROP TABLE IF EXISTS `daily_checkins`;
CREATE TABLE `daily_checkins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `checkin_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `checkin_day` date GENERATED ALWAYS AS (cast(`checkin_date` as date)) STORED,
  `points_earned` int DEFAULT '10',
  `streak` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_daily_checkin` (`user_id`,`checkin_day`),
  CONSTRAINT `daily_checkins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `daily_checkins` (`id`, `user_id`, `checkin_date`, `points_earned`, `streak`) VALUES
(7,	3,	'2026-01-23 04:05:05',	10,	1),
(8,	4,	'2026-01-23 10:24:22',	10,	1),
(9,	3,	'2026-01-25 16:32:15',	10,	1),
(10,	6,	'2026-01-26 04:52:55',	10,	1),
(11,	7,	'2026-01-26 04:59:57',	10,	1),
(12,	3,	'2026-01-27 02:25:04',	20,	2);

DROP TABLE IF EXISTS `friend_requests`;
CREATE TABLE `friend_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `from_user_id` (`from_user_id`),
  KEY `to_user_id` (`to_user_id`),
  CONSTRAINT `friend_requests_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `friend_requests_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `friend_requests` (`id`, `from_user_id`, `to_user_id`, `status`, `created_at`) VALUES
(1,	3,	4,	'accepted',	'2026-01-07 08:11:21'),
(3,	5,	3,	'accepted',	'2026-01-12 08:39:38'),
(4,	7,	3,	'accepted',	'2026-01-26 05:06:16');

DROP TABLE IF EXISTS `friendships`;
CREATE TABLE `friendships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user1_id` int NOT NULL,
  `user2_id` int NOT NULL,
  `status` enum('pending','accepted','blocked') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user1_id` (`user1_id`),
  KEY `user2_id` (`user2_id`),
  CONSTRAINT `friendships_ibfk_1` FOREIGN KEY (`user1_id`) REFERENCES `users` (`id`),
  CONSTRAINT `friendships_ibfk_2` FOREIGN KEY (`user2_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `friendships` (`id`, `user1_id`, `user2_id`, `status`, `created_at`) VALUES
(1,	3,	4,	'accepted',	'2026-01-07 08:11:35'),
(2,	5,	3,	'accepted',	'2026-01-12 11:47:48'),
(3,	7,	3,	'accepted',	'2026-01-26 05:07:19');

DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `message_type` varchar(20) DEFAULT 'text',
  `file_size` int DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`),
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `messages` (`id`, `room_id`, `sender_id`, `content`, `created_at`, `message_type`, `file_size`, `file_name`) VALUES
(28,	1,	3,	'/uploads/chat_media/images/user_3_1769153644608_da0a4c70-112a-4528-a17e-be8c06ccd60a.jpeg',	'2026-01-23 07:33:07',	'image',	627947,	'da0a4c70-112a-4528-a17e-be8c06ccd60a.jpeg'),
(29,	1,	3,	'/uploads/chat_media/images/user_3_1769153747745_ec7ecc4d-caa2-4766-a681-fa6d2db3b0b1.jpeg',	'2026-01-23 07:34:51',	'image',	699844,	'ec7ecc4d-caa2-4766-a681-fa6d2db3b0b1.jpeg'),
(30,	2,	3,	'/uploads/chat_media/images/user_3_1769154130805_ed24fe52-6c98-49d0-9e83-5c5355e1f178.jpeg',	'2026-01-23 07:41:14',	'image',	121953,	'ed24fe52-6c98-49d0-9e83-5c5355e1f178.jpeg'),
(31,	1,	4,	'/uploads/chat_media/images/user_4_1769155024912_a9a2b6e6-6d34-4927-881f-eedf8048a283.png',	'2026-01-23 07:56:08',	'image',	2940088,	'a9a2b6e6-6d34-4927-881f-eedf8048a283.png'),
(32,	1,	3,	'test',	'2026-01-23 07:57:17',	'text',	NULL,	NULL),
(33,	1,	3,	'Hi',	'2026-01-23 07:57:32',	'text',	NULL,	NULL),
(34,	1,	3,	'test',	'2026-01-23 10:22:05',	'text',	NULL,	NULL),
(35,	1,	3,	'YO',	'2026-01-23 10:22:19',	'text',	NULL,	NULL),
(36,	1,	3,	'/uploads/chat_media/images/user_3_1769163816742_28fac60b-53b8-4941-9106-0526c10c3278.png',	'2026-01-23 10:22:40',	'image',	2444494,	'28fac60b-53b8-4941-9106-0526c10c3278.png'),
(37,	1,	4,	'Test',	'2026-01-23 10:24:30',	'text',	NULL,	NULL),
(38,	1,	4,	'/uploads/chat_media/images/user_4_1769163946114_cbaf7a65-b6e5-4726-8ae0-4d12a43bed67.png',	'2026-01-23 10:24:49',	'image',	449796,	'cbaf7a65-b6e5-4726-8ae0-4d12a43bed67.png'),
(39,	1,	3,	'Hi',	'2026-01-23 11:17:20',	'text',	NULL,	NULL),
(40,	1,	3,	'/uploads/chat_media/images/user_3_1769167144554_14aeb5c8-1661-491b-ad5e-8ffc9cfad68d.png',	'2026-01-23 11:18:07',	'image',	316898,	'14aeb5c8-1661-491b-ad5e-8ffc9cfad68d.png'),
(41,	1,	3,	'/uploads/chat_media/images/user_3_1769167800791_6c8fde5e-90aa-4c84-8d90-6b8a4d8ae5d4.jpeg',	'2026-01-23 11:29:04',	'image',	583868,	'6c8fde5e-90aa-4c84-8d90-6b8a4d8ae5d4.jpeg'),
(42,	1,	3,	'/uploads/chat_media/images/user_3_1769168988583_9b40b593-75c4-4426-91d9-0e43399d1112.jpeg',	'2026-01-23 11:48:51',	'image',	589586,	'9b40b593-75c4-4426-91d9-0e43399d1112.jpeg'),
(43,	1,	3,	'/uploads/chat_media/images/user_3_1769177908704_f753412c-3977-4acc-a858-935baf88e379.png',	'2026-01-23 14:17:32',	'image',	914535,	'f753412c-3977-4acc-a858-935baf88e379.png'),
(44,	3,	7,	'Fuck',	'2026-01-26 05:08:56',	'text',	NULL,	NULL),
(45,	4,	7,	'Fff',	'2026-01-26 05:09:48',	'text',	NULL,	NULL);

DROP TABLE IF EXISTS `points_history`;
CREATE TABLE `points_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `points` int NOT NULL,
  `type` enum('task_reward','daily_checkin','item_redeem','system_bonus','referral') COLLATE utf8mb4_unicode_ci DEFAULT 'task_reward',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `points_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `points_history` (`id`, `user_id`, `points`, `type`, `description`, `created_at`) VALUES
(4,	3,	10,	'daily_checkin',	'每日簽到 (連續 1 天)',	'2026-01-23 04:05:05'),
(5,	4,	10,	'daily_checkin',	'每日簽到 (連續 1 天，獲得 10 積分)',	'2026-01-23 10:24:22'),
(6,	3,	10,	'daily_checkin',	'每日簽到 (連續 1 天，獲得 10 積分)',	'2026-01-25 16:32:15'),
(7,	6,	10,	'daily_checkin',	'每日簽到 (連續 1 天，獲得 10 積分)',	'2026-01-26 04:52:55'),
(9,	7,	10,	'daily_checkin',	'每日簽到 (連續 1 天，獲得 10 積分)',	'2026-01-26 04:59:57'),
(12,	3,	20,	'daily_checkin',	'每日簽到 (連續 2 天，獲得 20 積分)',	'2026-01-27 02:25:04'),
(13,	3,	500,	'task_reward',	'完成任務: 完成MBTI測驗',	'2026-01-27 02:25:12'),
(14,	3,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-01-27 02:25:12'),
(15,	3,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-01-27 02:25:12'),
(16,	3,	200,	'task_reward',	'完成任務: 在討論區張貼首個貼文',	'2026-01-27 02:25:12'),
(17,	3,	200,	'task_reward',	'完成任務: 上傳頭像',	'2026-01-27 02:25:12'),
(18,	3,	100,	'task_reward',	'完成任務: 每日完成MBTI測驗一次',	'2026-01-27 02:25:12'),
(19,	3,	100,	'task_reward',	'完成任務: 點讚一個貼文',	'2026-01-27 02:25:54');

DROP TABLE IF EXISTS `post_comments`;
CREATE TABLE `post_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `post_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `post_comments` (`id`, `post_id`, `user_id`, `content`, `created_at`) VALUES
(2,	2,	7,	'Hi',	'2026-01-26 05:10:25');

DROP TABLE IF EXISTS `post_likes`;
CREATE TABLE `post_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`post_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `post_likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES
(2,	2,	7,	'2026-01-26 05:10:45'),
(3,	2,	3,	'2026-01-27 02:25:50');

DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `content` text,
  `media_urls` text,
  `media_types` text,
  `media_type` enum('image','video','none') DEFAULT 'none',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `posts` (`id`, `user_id`, `content`, `media_urls`, `media_types`, `media_type`, `created_at`) VALUES
(2,	3,	'AV',	'[\"/uploads/post_media/images/post_3_1769139665695.jpg\"]',	'[\"image\"]',	'none',	'2026-01-23 03:40:08');

DROP TABLE IF EXISTS `reposts`;
CREATE TABLE `reposts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `reposts_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reposts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `shop_items`;
CREATE TABLE `shop_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `points_required` int NOT NULL,
  `stock` int DEFAULT '1',
  `limit_per_user` int DEFAULT '1',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `shop_items` (`id`, `name`, `description`, `category`, `points_required`, `stock`, `limit_per_user`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES
(1,	'電影優惠券',	'可用於指定影院的電影票優惠',	'coupon',	500,	100,	1,	'/uploads/shop/movie_ticket.jpg',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(2,	'咖啡券',	'星巴克或類似咖啡店優惠券',	'coupon',	300,	200,	1,	'/uploads/shop/coffee_coupon.jpg',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(3,	'個性化頭像框',	'特殊頭像框裝飾',	'virtual',	200,	1000,	1,	'/uploads/shop/avatar_frame.png',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(4,	'聊天氣泡皮膚',	'個性化聊天氣泡樣式',	'virtual',	150,	500,	1,	'/uploads/shop/chat_bubble.png',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(5,	'7天VIP體驗',	'VIP特權體驗（無廣告、優先匹配）',	'virtual',	1000,	50,	1,	'/uploads/shop/vip_badge.png',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(6,	'實體禮品卡',	'100元購物禮品卡（需填寫郵寄地址）',	'physical',	5000,	10,	1,	'/uploads/shop/gift_card.jpg',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08');

DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `task_type` enum('daily','achievement','special') COLLATE utf8mb4_unicode_ci DEFAULT 'daily',
  `points_required` int DEFAULT '1',
  `points_reward` int DEFAULT '10',
  `priority` int DEFAULT '5',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tasks` (`id`, `title`, `description`, `task_type`, `points_required`, `points_reward`, `priority`, `is_active`, `created_at`, `updated_at`) VALUES
(1,	'完成MBTI測驗',	'完成一次完整的MBTI性格測試',	'achievement',	1,	500,	1,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(2,	'發送第一條消息',	'在好友或群組聊天中發送第一條消息',	'achievement',	1,	100,	2,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(3,	'添加第一位好友',	'成功添加一位好友',	'achievement',	1,	500,	3,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(4,	'在討論區張貼首個貼文',	'在討論區發佈第一篇貼文',	'achievement',	1,	200,	4,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(5,	'點讚一個貼文',	'對任何貼文點讚一次',	'achievement',	1,	100,	5,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(6,	'轉發一個貼文',	'轉發任何一篇貼文',	'achievement',	1,	50,	6,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(7,	'上傳頭像',	'設置個人頭像（非預設）',	'achievement',	1,	200,	7,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(8,	'連續7天簽到',	'連續簽到7天',	'achievement',	7,	500,	8,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(9,	'連續14天簽到',	'連續簽到14天',	'achievement',	14,	600,	9,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(10,	'連續30天簽到',	'連續簽到30天',	'achievement',	30,	800,	10,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(11,	'連續60天簽到',	'連續簽到60天',	'achievement',	60,	1000,	11,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(12,	'連續90天簽到',	'連續簽到90天',	'achievement',	90,	1500,	12,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(13,	'連續180天簽到',	'連續簽到180天',	'achievement',	180,	2500,	13,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(14,	'連續365天簽到',	'連續簽到365天',	'achievement',	365,	5000,	14,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(15,	'每日發送5條訊息',	'在任何聊天室發送5條訊息',	'daily',	5,	50,	15,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45'),
(16,	'每日完成MBTI測驗一次',	'當天完成一次MBTI測驗',	'daily',	1,	100,	16,	1,	'2026-01-27 01:36:45',	'2026-01-27 01:36:45');

DROP TABLE IF EXISTS `user_redemptions`;
CREATE TABLE `user_redemptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `status` enum('pending','redeemed','shipped','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `redeemed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `user_redemptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_redemptions_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `shop_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `user_tasks`;
CREATE TABLE `user_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `task_id` int NOT NULL,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `current_progress` int DEFAULT '0',
  `user_status` enum('not_started','in_progress','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'not_started',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_task` (`user_id`,`task_id`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `user_tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_tasks_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_tasks` (`id`, `user_id`, `task_id`, `started_at`, `completed_at`, `current_progress`, `user_status`) VALUES
(1,	3,	1,	'2026-01-27 02:25:12',	'2026-01-27 02:26:12',	1,	'completed'),
(2,	3,	2,	'2026-01-27 02:25:12',	'2026-01-27 02:26:12',	1,	'completed'),
(3,	3,	3,	'2026-01-27 02:25:12',	'2026-01-27 02:26:12',	1,	'completed'),
(4,	3,	4,	'2026-01-27 02:25:12',	'2026-01-27 02:26:13',	1,	'completed'),
(5,	3,	5,	'2026-01-27 02:25:12',	'2026-01-27 02:26:54',	1,	'completed'),
(6,	3,	6,	'2026-01-27 02:25:12',	NULL,	0,	'in_progress'),
(7,	3,	7,	'2026-01-27 02:25:12',	'2026-01-27 02:26:13',	1,	'completed'),
(8,	3,	8,	'2026-01-27 02:25:12',	NULL,	2,	'in_progress'),
(9,	3,	9,	'2026-01-27 02:25:12',	NULL,	2,	'in_progress'),
(10,	3,	10,	'2026-01-27 02:25:12',	NULL,	2,	'in_progress'),
(11,	3,	11,	'2026-01-27 02:25:12',	NULL,	2,	'in_progress'),
(12,	3,	12,	'2026-01-27 02:25:12',	NULL,	2,	'in_progress'),
(13,	3,	13,	'2026-01-27 02:25:12',	NULL,	2,	'in_progress'),
(14,	3,	14,	'2026-01-27 02:25:12',	NULL,	2,	'in_progress'),
(15,	3,	15,	'2026-01-27 02:25:12',	NULL,	0,	'in_progress'),
(16,	3,	16,	'2026-01-27 02:25:12',	'2026-01-27 02:26:13',	1,	'completed');

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `points` int DEFAULT '0',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '/uploads/avatars/default.png',
  `mbti` varchar(4) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `last_active` timestamp NULL DEFAULT NULL,
  `bio` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `users` (`id`, `points`, `username`, `password`, `email`, `avatar`, `mbti`, `status`, `last_active`, `bio`) VALUES
(3,	1740,	'test',	'$2b$10$fS8MFpkivcitkwNVGDUNv.sT2ySK02xjvC0jyQBbHGxX0Fk1uf7yG',	'test@gmail.com',	'/uploads/avatars/user_3_1768501742098.jpg',	'ISFJ',	'已測試',	'2026-01-27 02:47:04',	NULL),
(4,	10,	'sam',	'$2b$10$8Qccqip8XEVRBEhaP2nhsOvjaJgJEE4AHe3eCRoWo5naFcba..iVG',	'sam20040525@gmail.com',	'/uploads/avatars/default.png',	NULL,	NULL,	'2026-01-23 10:24:49',	NULL),
(5,	0,	'Tim',	'$2b$10$p2hNX92qFvzNbLo73TIg.uYG4AziAi1GrZBeev3YRvRORcU/8Weku',	'timtim12345@gmail.com',	'/uploads/avatars/default.png',	NULL,	NULL,	'2026-01-12 11:41:42',	NULL),
(6,	10,	'test2',	'$2b$10$TS.CpOsfVHjkOVuIzl0sZeUWvL3w2n79VuriBYTXNqOyay4ImYNlm',	'test2@gmail.com',	'/uploads/avatars/default.png',	'INFJ',	'已測試',	'2026-01-26 04:58:22',	NULL),
(7,	190,	'test3',	'$2b$10$69c.eAUDSC5zBGTvf8GV4OTlHMko3fS4zlNp8m8O3YL9/5oLJEsfG',	'test3@gmail.com',	'/uploads/avatars/default.png',	'ISFJ',	'已測試',	'2026-01-27 01:25:02',	NULL);

-- 2026-01-28 04:53:50 UTC
