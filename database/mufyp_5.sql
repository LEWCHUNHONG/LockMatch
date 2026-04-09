-- Adminer 5.4.2 MySQL 9.6.0 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `ai_chat_history`;
CREATE TABLE `ai_chat_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_created` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `chat_room_members`;
CREATE TABLE `chat_room_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_room` (`room_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `chat_room_reads`;
CREATE TABLE `chat_room_reads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `message_id` int DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_read` (`user_id`,`room_id`),
  KEY `idx_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


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
  `is_temp` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `custom_levels`;
CREATE TABLE `custom_levels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `bgColor` varchar(50) DEFAULT '#2ecc71',
  `backgroundImage` varchar(500) DEFAULT NULL,
  `floors` json NOT NULL,
  `totalFloors` int DEFAULT '1',
  `unlockCondition` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `originalId` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `custom_levels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `daily_checkins`;
CREATE TABLE `daily_checkins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `checkin_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `checkin_day` date GENERATED ALWAYS AS (cast(`checkin_date` as date)) STORED,
  `points_earned` int DEFAULT '10',
  `streak` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_daily_checkin` (`user_id`,`checkin_day`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `daily_journals`;
CREATE TABLE `daily_journals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `content` text NOT NULL,
  `mood` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`created_at`),
  CONSTRAINT `daily_journals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `friend_requests`;
CREATE TABLE `friend_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_from` (`from_user_id`),
  KEY `idx_to` (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `friendships`;
CREATE TABLE `friendships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user1_id` int NOT NULL,
  `user2_id` int NOT NULL,
  `status` enum('pending','accepted','blocked') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user1` (`user1_id`),
  KEY `idx_user2` (`user2_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `group_invites`;
CREATE TABLE `group_invites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_invite` (`group_id`,`to_user_id`),
  KEY `from_user_id` (`from_user_id`),
  KEY `to_user_id` (`to_user_id`),
  CONSTRAINT `group_invites_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_invites_ibfk_2` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_invites_ibfk_3` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `instant_chat_invites`;
CREATE TABLE `instant_chat_invites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `room_id` int NOT NULL,
  `status` enum('pending','accepted','rejected','expired') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  KEY `to_user_id` (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `interests`;
CREATE TABLE `interests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_interest` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `keyword_triggers`;
CREATE TABLE `keyword_triggers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scenario_id` int NOT NULL,
  `task_index` int NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `speaker_id` int NOT NULL,
  `recorder_id` int NOT NULL,
  `points` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_keyword` (`scenario_id`,`task_index`,`keyword`),
  KEY `speaker_id` (`speaker_id`),
  KEY `recorder_id` (`recorder_id`),
  CONSTRAINT `keyword_triggers_ibfk_1` FOREIGN KEY (`scenario_id`) REFERENCES `user_scenarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `keyword_triggers_ibfk_2` FOREIGN KEY (`speaker_id`) REFERENCES `users` (`id`),
  CONSTRAINT `keyword_triggers_ibfk_3` FOREIGN KEY (`recorder_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `mbti_game_results`;
CREATE TABLE `mbti_game_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `level_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `game_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'mbti_adventure',
  `play_data` json DEFAULT NULL,
  `calculated_mbti` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` int DEFAULT '0',
  `play_time_seconds` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `mbti_game_results_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `mbti_history`;
CREATE TABLE `mbti_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `mbti_type` varchar(4) NOT NULL,
  `test_mode` varchar(20) DEFAULT 'traditional',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id_created_at` (`user_id`,`created_at`),
  CONSTRAINT `fk_mbti_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


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
  KEY `idx_room` (`room_id`),
  KEY `idx_sender` (`sender_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` int NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text,
  `data` json DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`,`is_read`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `points_history`;
CREATE TABLE `points_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `points` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'task_reward',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `points_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `points_history` (`id`, `user_id`, `points`, `type`, `description`, `created_at`) VALUES
(1,	1,	200,	'task_reward',	'完成任務: 上傳頭像',	'2026-02-03 04:39:27'),
(2,	2,	200,	'task_reward',	'完成任務: 上傳頭像',	'2026-02-03 04:40:57'),
(3,	2,	500,	'task_reward',	'完成任務: 完成MBTI測驗',	'2026-02-03 04:41:20'),
(4,	2,	100,	'task_reward',	'完成任務: 每日完成MBTI測驗一次',	'2026-02-03 04:41:20'),
(5,	4,	200,	'task_reward',	'完成任務: 上傳頭像',	'2026-02-03 04:43:35'),
(6,	1,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-03 04:44:37'),
(7,	1,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-03 04:44:51'),
(8,	4,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-03 04:44:58'),
(9,	4,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-03 04:45:19'),
(10,	2,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-03 04:47:22'),
(11,	1,	200,	'task_reward',	'完成任務: 在討論區張貼首個貼文',	'2026-02-03 04:51:33'),
(12,	2,	200,	'task_reward',	'完成任務: 在討論區張貼首個貼文',	'2026-02-03 04:53:09'),
(13,	3,	200,	'task_reward',	'完成任務: 在討論區張貼首個貼文',	'2026-02-03 05:21:42'),
(14,	1,	100,	'task_reward',	'完成任務: 點讚一個貼文',	'2026-02-03 05:22:22'),
(15,	4,	100,	'task_reward',	'完成任務: 點讚一個貼文',	'2026-02-03 05:22:58'),
(16,	5,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-21 05:44:22'),
(17,	5,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-21 05:44:37'),
(18,	3,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-21 05:46:01'),
(19,	3,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-21 05:46:01'),
(20,	5,	100,	'task_reward',	'完成任務: 點讚一個貼文',	'2026-02-21 05:49:09'),
(21,	6,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-21 06:46:56'),
(22,	6,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-21 06:46:56'),
(23,	7,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-21 06:47:05'),
(24,	7,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-21 06:48:24'),
(25,	5,	50,	'task_reward',	'完成任務: 每日發送5條訊息',	'2026-02-21 07:57:09'),
(26,	8,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-21 08:31:35'),
(27,	8,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-21 08:32:11'),
(28,	1,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-21 17:03:19'),
(29,	1,	-300,	'item_redeem',	'兌換商品: 連鎖咖啡/飲品買一送一券',	'2026-02-21 17:03:32'),
(30,	1,	-400,	'item_redeem',	'兌換商品: 電影現金券',	'2026-02-21 17:04:04'),
(31,	1,	-200,	'item_redeem',	'兌換商品: 個性化頭像框',	'2026-02-21 17:05:36'),
(32,	6,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-21 17:29:26'),
(33,	6,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-21 17:29:30'),
(34,	7,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-21 17:35:13'),
(35,	6,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-21 17:41:46'),
(36,	10,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-23 04:36:33'),
(37,	2,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-23 05:09:51'),
(38,	1,	50,	'task_reward',	'完成任務: 每日發送5條訊息',	'2026-02-23 05:18:08'),
(39,	2,	50,	'task_reward',	'完成任務: 每日發送5條訊息',	'2026-02-23 05:18:24'),
(40,	2,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-23 05:20:35'),
(41,	2,	-300,	'item_redeem',	'兌換商品: 連鎖咖啡/飲品買一送一券',	'2026-02-23 05:20:47'),
(42,	8,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-23 05:21:59'),
(43,	5,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-23 05:37:00'),
(44,	5,	200,	'task_reward',	'完成任務: 在討論區張貼首個貼文',	'2026-02-26 03:33:08'),
(45,	11,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-02-26 16:19:07'),
(46,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:30:30'),
(47,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:30:33'),
(48,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:30:37'),
(49,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:30:39'),
(50,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:30:41'),
(51,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:31:07'),
(52,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:38:37'),
(53,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:39:24'),
(54,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:46:51'),
(55,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:49:20'),
(56,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:53:03'),
(57,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 16:59:33'),
(58,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 17:11:32'),
(59,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 17:11:58'),
(60,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 17:25:12'),
(61,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 17:27:10'),
(62,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 17:39:47'),
(63,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:13:43'),
(64,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:16:50'),
(65,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:17:55'),
(66,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:19:12'),
(67,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:19:12'),
(68,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:31:13'),
(69,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:37:57'),
(70,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:39:14'),
(71,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:39:37'),
(72,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:40:24'),
(73,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-27 18:42:27'),
(74,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:17:32'),
(75,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:23:27'),
(76,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:23:46'),
(77,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:26:39'),
(78,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:27:58'),
(79,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:28:20'),
(80,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:28:54'),
(81,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:29:09'),
(82,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:44:56'),
(83,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:45:09'),
(84,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:45:51'),
(85,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:48:28'),
(86,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:49:18'),
(87,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:49:18'),
(88,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:49:54'),
(89,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:49:54'),
(90,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:51:08'),
(91,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:51:13'),
(92,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:53:32'),
(93,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:53:44'),
(94,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:57:54'),
(95,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 07:57:55'),
(96,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:01:39'),
(97,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:01:53'),
(98,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:01:57'),
(99,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:03:09'),
(100,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:03:10'),
(101,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:08:53'),
(102,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:09:12'),
(103,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:09:34'),
(104,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:09:51'),
(105,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:10:45'),
(106,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:40:53'),
(107,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 08:41:29'),
(108,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:02:03'),
(109,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:02:31'),
(110,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:04:52'),
(111,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:09:13'),
(112,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:09:17'),
(113,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:14:24'),
(114,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:14:44'),
(115,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:15:41'),
(116,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:36:42'),
(117,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:44:28'),
(118,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:44:42'),
(119,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:46:48'),
(120,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:56:35'),
(121,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:56:53'),
(122,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:57:24'),
(123,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:57:51'),
(124,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:59:03'),
(125,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 09:59:16'),
(126,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:00:55'),
(127,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:02:25'),
(128,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:17:29'),
(129,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:17:34'),
(130,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:29:05'),
(131,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:29:34'),
(132,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:29:34'),
(133,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:30:36'),
(134,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:34:28'),
(135,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:34:43'),
(136,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:37:40'),
(137,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:37:44'),
(138,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:48:02'),
(139,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:48:08'),
(140,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:51:50'),
(141,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:52:02'),
(142,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:52:08'),
(143,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:52:17'),
(144,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:53:07'),
(145,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:53:16'),
(146,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 10:53:35'),
(147,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:07:12'),
(148,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:07:14'),
(149,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:09:09'),
(150,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:09:39'),
(151,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:10:37'),
(152,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:10:51'),
(153,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:11:23'),
(154,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:11:32'),
(155,	11,	100,	'task_reward',	'完成任務: 發送第一條消息',	'2026-02-28 11:12:14'),
(156,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 11:12:28'),
(157,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:17:47'),
(158,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:17:50'),
(159,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:25:52'),
(160,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:25:55'),
(161,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:26:25'),
(162,	11,	10,	'daily_checkin',	'每日簽到 (連續 1 天，獲得 10 積分)',	'2026-02-28 12:26:26'),
(163,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:26:30'),
(164,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:34:55'),
(165,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:35:14'),
(166,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:44:44'),
(167,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:44:47'),
(168,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:45:49'),
(169,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:45:54'),
(170,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:47:22'),
(171,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:48:04'),
(172,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:48:24'),
(173,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:51:19'),
(174,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:51:22'),
(175,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:53:15'),
(176,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:53:15'),
(177,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:56:56'),
(178,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 12:56:57'),
(179,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:01:08'),
(180,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:01:18'),
(181,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:01:51'),
(182,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:02:03'),
(183,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:02:26'),
(184,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:02:27'),
(185,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:07:24'),
(186,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:07:26'),
(187,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:14:30'),
(188,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:14:38'),
(189,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:15:22'),
(190,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:15:34'),
(191,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:15:53'),
(192,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:16:07'),
(193,	1,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:20:10'),
(194,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:20:13'),
(195,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:26:55'),
(196,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:27:00'),
(197,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:39:33'),
(198,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:39:42'),
(199,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:45:53'),
(200,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:46:06'),
(201,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:46:31'),
(202,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:46:36'),
(203,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:46:45'),
(204,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:53:01'),
(205,	5,	10,	'daily_checkin',	'每日簽到 (連續 1 天，獲得 10 積分)',	'2026-02-28 13:53:32'),
(206,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 13:53:49'),
(207,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:09:42'),
(208,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:09:42'),
(209,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:10:35'),
(210,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:12:25'),
(211,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:15:30'),
(212,	11,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:15:42'),
(213,	5,	50,	'task_reward',	'完成任務: 每日發送5條訊息',	'2026-02-28 14:17:02'),
(214,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:17:06'),
(215,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:19:57'),
(216,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:24:10'),
(217,	5,	50,	'task_reward',	'即時打卡獎勵 +50 積分',	'2026-02-28 14:25:59'),
(218,	8,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-23 15:26:23'),
(219,	9,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-23 15:26:23'),
(220,	8,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-23 15:41:19'),
(221,	9,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-23 15:41:19'),
(222,	6,	50,	'task_reward',	'完成劇本「摩天輪下的約定」獎勵',	'2026-03-24 12:55:07'),
(223,	7,	50,	'task_reward',	'完成劇本「摩天輪下的約定」獎勵',	'2026-03-24 12:55:07'),
(224,	5,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 13:03:17'),
(225,	1,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 13:03:17'),
(226,	6,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 13:46:39'),
(227,	7,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 13:46:39'),
(228,	6,	50,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-24 14:24:51'),
(229,	7,	50,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-24 14:24:51'),
(230,	1,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 14:31:11'),
(231,	4,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 14:31:11'),
(232,	1,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 14:48:45'),
(233,	4,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 14:48:45'),
(234,	2,	50,	'task_reward',	'完成劇本「海濱長廊漫步」獎勵',	'2026-03-24 14:49:11'),
(235,	11,	50,	'task_reward',	'完成劇本「海濱長廊漫步」獎勵',	'2026-03-24 14:49:11'),
(236,	5,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 15:02:53'),
(237,	6,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 15:02:53'),
(238,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 15:07:35'),
(239,	6,	100,	'task_reward',	'完成劇本「摩天輪下的約定」獎勵',	'2026-03-24 15:09:35'),
(240,	6,	100,	'task_reward',	'完成劇本「摩天輪下的約定」獎勵',	'2026-03-24 15:17:56'),
(241,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 15:20:02'),
(242,	6,	100,	'task_reward',	'完成劇本「海濱長廊漫步」獎勵',	'2026-03-24 15:20:29'),
(243,	6,	50,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-24 15:22:17'),
(244,	7,	50,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-24 15:22:17'),
(245,	7,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 15:28:14'),
(246,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-24 15:29:39'),
(247,	7,	100,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-24 15:30:11'),
(248,	6,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 06:48:04'),
(249,	7,	50,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 06:48:04'),
(250,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 06:55:18'),
(251,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 07:08:39'),
(252,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 07:09:04'),
(253,	6,	50,	'task_reward',	'完成劇本「海濱長廊漫步」獎勵',	'2026-03-25 07:26:45'),
(254,	7,	50,	'task_reward',	'完成劇本「海濱長廊漫步」獎勵',	'2026-03-25 07:26:45'),
(255,	6,	100,	'task_reward',	'完成劇本「深夜食堂挑戰」獎勵',	'2026-03-25 07:27:19'),
(256,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 07:45:00'),
(257,	7,	100,	'task_reward',	'完成劇本「深夜食堂挑戰」獎勵',	'2026-03-25 07:45:33'),
(258,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 07:50:39'),
(259,	6,	100,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-25 07:59:18'),
(260,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 08:05:51'),
(261,	7,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 08:07:33'),
(262,	6,	100,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-25 08:13:25'),
(263,	6,	50,	'task_reward',	'完成劇本「深夜食堂挑戰」獎勵',	'2026-03-25 08:13:56'),
(264,	7,	50,	'task_reward',	'完成劇本「深夜食堂挑戰」獎勵',	'2026-03-25 08:13:56'),
(265,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 11:24:52'),
(266,	6,	50,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-25 11:25:15'),
(267,	7,	50,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-25 11:25:15'),
(268,	6,	100,	'task_reward',	'完成劇本「星巴克特務密令」獎勵',	'2026-03-25 11:37:24'),
(269,	7,	50,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-25 11:37:59'),
(270,	6,	50,	'task_reward',	'完成劇本「文青書店邂逅」獎勵',	'2026-03-25 11:37:59'),
(271,	14,	500,	'task_reward',	'完成任務: 添加第一位好友',	'2026-03-25 16:11:11'),
(272,	1,	10,	'daily_checkin',	'每日簽到 (連續 1 天，獲得 10 積分)',	'2026-04-08 06:16:23'),
(273,	15,	10,	'daily_checkin',	'每日簽到 (連續 1 天，獲得 10 積分)',	'2026-04-08 07:45:47'),
(274,	15,	100,	'game_reward',	'主線關卡首次完成獎勵',	'2026-04-08 07:50:35');

DROP TABLE IF EXISTS `post_comments`;
CREATE TABLE `post_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `safety_score` float DEFAULT '0',
  `is_approved` tinyint(1) DEFAULT '1',
  `moderation_reason` text,
  `moderated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_post` (`post_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_post_comments_approved` (`post_id`,`is_approved`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `post_likes`;
CREATE TABLE `post_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`post_id`,`user_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `content` text,
  `media_urls` text,
  `media_types` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `safety_score` float DEFAULT '0',
  `is_approved` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_posts_approved` (`user_id`,`is_approved`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `reposts`;
CREATE TABLE `reposts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post` (`post_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `scenario_invites`;
CREATE TABLE `scenario_invites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `scenario_data` json DEFAULT NULL,
  `status` enum('pending','accepted','rejected','expired') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_from` (`from_user_id`),
  KEY `idx_to` (`to_user_id`),
  CONSTRAINT `scenario_invites_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scenario_invites_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `scenario_templates`;
CREATE TABLE `scenario_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL COMMENT '劇本標題',
  `description` text COMMENT '劇本簡介',
  `cover_image` varchar(255) DEFAULT NULL COMMENT '封面圖片 URL',
  `location_name` varchar(255) DEFAULT NULL COMMENT '建議地點名稱',
  `location_lat` decimal(10,8) DEFAULT NULL COMMENT '建議地點緯度',
  `location_lng` decimal(11,8) DEFAULT NULL COMMENT '建議地點經度',
  `radius` int DEFAULT '100' COMMENT '打卡半徑(米)',
  `tasks` json DEFAULT NULL COMMENT '任務清單 (JSON)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `scenario_templates` (`id`, `title`, `description`, `cover_image`, `location_name`, `location_lat`, `location_lng`, `radius`, `tasks`, `created_at`) VALUES
(1, '星巴克特務密令', '兩位特務在星巴克交換情報，必須說出暗號「我愛咖啡」才算成功。', NULL, '星巴克 (中環店)', 22.28140000, 114.15850000, 50, '[{\"code\": \"我愛咖啡\", \"desc\": \"說出暗號「我愛咖啡」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"我愛你\", \"你好\", \"再見\", \"謝謝\", \"對不起\", \"請\", \"好\", \"不好\", \"可以\", \"不可以\"]}]', '2026-03-22 14:07:40'),
(2, '摩天輪下的約定', '在維港摩天輪下相遇，必須完成合照任務。', NULL, '香港摩天輪', 22.28540000, 114.15970000, 80, '[{\"code\": \"摩天輪好靚\", \"desc\": \"說出暗號「摩天輪好靚」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"摩天輪\", \"維港\", \"夜景\", \"浪漫\", \"幸福\", \"快樂\", \"約會\", \"甜蜜\", \"笑容\", \"回憶\"]}]', '2026-03-22 14:07:40'),
(3, '文青書店邂逅', '在誠品書店尋找同一本書，然後用「這本書很好看」作為暗號。', NULL, '誠品書店 (銅鑼灣)', 22.28070000, 114.18320000, 60, '[{\"code\": \"這本書很好看\", \"desc\": \"說出暗號「這本書很好看」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"書店\", \"文青\", \"閱讀\", \"文學\", \"故事\", \"作者\", \"扉頁\", \"咖啡\", \"寧靜\", \"靈感\"]}]', '2026-03-22 14:07:40'),
(4, '深夜食堂挑戰', '在日式居酒屋完成暗號「おいしい」，並互拍一張食物照。', NULL, '和民居酒屋 (尖沙咀)', 22.29520000, 114.17230000, 70, '[{\"code\": \"おいしい\", \"desc\": \"說出暗號「おいしい」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"美食\", \"居酒屋\", \"刺身\", \"壽司\", \"清酒\", \"味增\", \"烤物\", \"炸物\", \"和風\", \"新鮮\"]}]', '2026-03-22 14:07:40'),
(5, '海濱長廊漫步', '在觀塘海濱長廊找到對方，並說出「海風好舒服」。', NULL, '觀塘海濱長廊', 22.31110000, 114.22380000, 100, '[{\"code\": \"海風好舒服\", \"desc\": \"說出暗號「海風好舒服」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"海風\", \"海濱\", \"長廊\", \"散步\", \"夕陽\", \"海浪\", \"微風\", \"寧靜\", \"愜意\", \"放鬆\"]}]', '2026-03-22 14:07:40'),
(6, '星巴克特務密令', '兩位特務在星巴克交換情報，必須說出暗號「我愛咖啡」才算成功。', NULL, '星巴克 (中環店)', NULL, NULL, 100, '[{\"code\": \"我愛咖啡\", \"desc\": \"說出暗號「我愛咖啡」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"我愛你\", \"你好\", \"再見\", \"謝謝\", \"對不起\", \"請\", \"好\", \"不好\", \"可以\", \"不可以\"]}]', '2026-03-23 15:05:53'),
(7, '摩天輪下的約定', '在維港摩天輪下相遇，必須完成合照任務。', NULL, '香港摩天輪', NULL, NULL, 100, '[{\"code\": \"摩天輪好靚\", \"desc\": \"說出暗號「摩天輪好靚」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"摩天輪\", \"維港\", \"夜景\", \"浪漫\", \"幸福\", \"快樂\", \"約會\", \"甜蜜\", \"笑容\", \"回憶\"]}]', '2026-03-23 15:05:53'),
(8, '文青書店邂逅', '在誠品書店尋找同一本書，然後用「這本書很好看」作為暗號。', NULL, '誠品書店 (銅鑼灣)', NULL, NULL, 100, '[{\"code\": \"這本書很好看\", \"desc\": \"說出暗號「這本書很好看」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"書店\", \"文青\", \"閱讀\", \"文學\", \"故事\", \"作者\", \"扉頁\", \"咖啡\", \"寧靜\", \"靈感\"]}]', '2026-03-23 15:05:53'),
(9, '深夜食堂挑戰', '在日式居酒屋完成暗號「おいしい」，並互拍一張食物照。', NULL, '和民居酒屋 (尖沙咀)', NULL, NULL, 100, '[{\"code\": \"おいしい\", \"desc\": \"說出暗號「おいしい」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"美食\", \"居酒屋\", \"刺身\", \"壽司\", \"清酒\", \"味增\", \"烤物\", \"炸物\", \"和風\", \"新鮮\"]}]', '2026-03-23 15:05:53'),
(10, '海濱長廊漫步', '在觀塘海濱長廊找到對方，並說出「海風好舒服」。', NULL, '觀塘海濱長廊', NULL, NULL, 100, '[{\"code\": \"海風好舒服\", \"desc\": \"說出暗號「海風好舒服」\", \"type\": \"code\"}, {\"desc\": \"說出關鍵字\", \"type\": \"keywords\", \"words\": [\"海風\", \"海濱\", \"長廊\", \"散步\", \"夕陽\", \"海浪\", \"微風\", \"寧靜\", \"愜意\", \"放鬆\"]}]', '2026-03-23 15:05:53');

DROP TABLE IF EXISTS `shop_items`;
CREATE TABLE `shop_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `points_required` int NOT NULL,
  `stock` int DEFAULT '1',
  `limit_per_user` int DEFAULT '1',
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `shop_items` (`id`, `name`, `description`, `category`, `points_required`, `stock`, `limit_per_user`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES
(1,	'電影優惠券',	'可用於指定影院的電影票優惠',	'coupon',	500,	100,	1,	'/uploads/shop/movie_ticket.jpg',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(2,	'咖啡券',	'星巴克或類似咖啡店優惠券',	'coupon',	300,	200,	1,	'/uploads/shop/coffee_coupon.jpg',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(3,	'$50 現金券',	'$50 現金券',	'virtual',	200,	1000,	1,	'/uploads/shop/100_coupon.png',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(4,	'$100 現金券',	'$100 現金券',	'virtual',	150,	500,	1,	'/uploads/shop/50_coupon.png',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(5,	'超級市場現金券',	'超級市場現金券',	'virtual',	1000,	50,	1,	'/uploads/shop/supermarket.png',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08'),
(6,	'禮品卡',	'購物禮品卡',	'physical',	5000,	10,	1,	'/uploads/shop/gift_card.jpg',	1,	'2026-01-15 17:47:08',	'2026-01-15 17:47:08');

DROP TABLE IF EXISTS `task_confirmations`;
CREATE TABLE `task_confirmations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scenario_id` int NOT NULL,
  `task_index` int NOT NULL,
  `user_id` int NOT NULL,
  `confirmed` tinyint(1) DEFAULT '0',
  `confirmed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_confirmation` (`scenario_id`,`task_index`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `task_confirmations_ibfk_1` FOREIGN KEY (`scenario_id`) REFERENCES `user_scenarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_confirmations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `task_verifications`;
CREATE TABLE `task_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scenario_id` int NOT NULL,
  `task_index` int NOT NULL,
  `user_id` int NOT NULL,
  `type` enum('gps','code_exchange','photo') NOT NULL,
  `data` json DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_task` (`scenario_id`,`task_index`,`user_id`,`type`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `task_verifications_ibfk_1` FOREIGN KEY (`scenario_id`) REFERENCES `user_scenarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_verifications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `task_type` enum('daily','achievement','special') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'daily',
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

DROP TABLE IF EXISTS `temp_chat_invites`;
CREATE TABLE `temp_chat_invites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `status` enum('pending','accepted','rejected','expired') DEFAULT 'pending',
  `room_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `notify_sender` tinyint(1) DEFAULT '0',
  `sender_entered` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `from_user_id` (`from_user_id`),
  KEY `to_user_id` (`to_user_id`),
  CONSTRAINT `temp_chat_invites_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `temp_chat_invites_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `user_coupons`;
CREATE TABLE `user_coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `coupon_code` varchar(50) NOT NULL,
  `qr_code_data` text,
  `status` enum('unused','used','expired') DEFAULT 'unused',
  `expires_at` timestamp NULL DEFAULT NULL,
  `redeemed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupon_code` (`coupon_code`),
  KEY `user_id` (`user_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `user_coupons_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_coupons_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `shop_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `user_insights_cache`;
CREATE TABLE `user_insights_cache` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `report_type` enum('personality_trend','social_report') NOT NULL,
  `report_data` json DEFAULT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_type` (`user_id`,`report_type`),
  CONSTRAINT `user_insights_cache_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `user_interests`;
CREATE TABLE `user_interests` (
  `user_id` int NOT NULL,
  `interest_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`interest_id`),
  KEY `interest_id` (`interest_id`),
  CONSTRAINT `user_interests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_interests_ibfk_2` FOREIGN KEY (`interest_id`) REFERENCES `interests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `user_locations`;
CREATE TABLE `user_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `accuracy` float DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_locations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `user_redemptions`;
CREATE TABLE `user_redemptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `status` enum('pending','redeemed','shipped','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `redeemed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_item` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `user_scenarios`;
CREATE TABLE `user_scenarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `target_user_id` int NOT NULL,
  `scenario_data` json DEFAULT NULL,
  `status` enum('active','completed','expired') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `tasks_status` json DEFAULT NULL COMMENT '記錄每個任務嘅雙方完成狀態',
  PRIMARY KEY (`id`),
  KEY `target_user_id` (`target_user_id`),
  KEY `idx_users` (`user_id`,`target_user_id`),
  CONSTRAINT `user_scenarios_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_scenarios_ibfk_2` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `user_tasks`;
CREATE TABLE `user_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `task_id` int NOT NULL,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `current_progress` int DEFAULT '0',
  `user_status` enum('not_started','in_progress','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'not_started',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_task` (`user_id`,`task_id`),
  KEY `idx_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


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
  `expo_push_token` varchar(255) DEFAULT NULL,
  `character` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 2026-04-08 07:58:42 UTC
