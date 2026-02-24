-- Adminer 5.4.1 MySQL 8.0.45 dump

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

INSERT INTO `ai_chat_history` (`id`, `user_id`, `role`, `content`, `created_at`) VALUES
(1,	1,	'user',	'what is my name?',	'2026-02-19 13:12:54'),
(2,	1,	'assistant',	'哈哈，你問得好！其實你嘅名字係 Sam 呀！有咩其他問題，或者想同新朋友聊天，我都可以幫手喔！😊',	'2026-02-19 13:12:59'),
(3,	1,	'user',	'what is my name',	'2026-02-19 13:14:54'),
(4,	1,	'assistant',	'你好！Sam，你嘅名係 Sam 啦！有咩可以幫到你？😊',	'2026-02-19 13:14:59'),
(5,	1,	'user',	'我想和一位新朋友開始聊天。根據我的個人資料，我應該聊些什麼話題呢？',	'2026-02-19 13:15:31'),
(6,	1,	'assistant',	'嗨，Sam！好開心你想同新朋友開始聊天啊。既然我對你的背景知道得唔多（MBTI未知，無自我介紹），我會根據一般情況建議一些簡單、安全嘅話題，幫你輕鬆打開話匣子。呢啲話題都係易上手嘅，唔會太私人。\n\n你可以試下：\n- **問問對方嘅興趣愛好**：例如，“你最近有冇睇咩好戲或者聽咩音樂呀？”呢個可以帶出共同嘅話題，譬如分享最愛嘅電影或歌手。\n- **談談日常生活**：比方說，“你呢個週末有咩計劃？有冇去咗有趣嘅地方？”呢樣可以從簡單嘅事開始，慢慢深入。\n- **用天氣做冰破器**：香港天氣變化大，問句“今日天氣咁熱/咁凍，你有冇特別嘅應對方法呀？”通常都好易引起共鳴。\n\n試下呢啲話題，應該可以讓對話自然進行。如果你之後有更多關於自己嘅資料分享，我可以給更針對性嘅建議呀！有咩其他問題，隨時問我，加油！😊',	'2026-02-19 13:15:44'),
(7,	5,	'user',	'hello!!請你教我點樣認識新朋友？',	'2026-02-19 13:21:56'),
(8,	5,	'assistant',	'哈囉，hong！你好啊！好開心你同我傾偈呀～至於你問點樣認識新朋友，我呢個AI助手就專門幫手打開話題，畀你一些簡單又實用的建議。記住，認識新朋友最緊要係真誠同輕鬆，放開自己試下就得啦！😊\n\n### 首先，簡單步驟教你：\n1. **打招呼同自我介紹**：呢個係起點！當你見到新朋友時，先講句“Hello”或“哈囉”，然後簡單介紹自己。例如：“你好，我係hong，係呢度見到你，感覺好開心啊！”呢個可以即刻破冰，讓對方覺得你友善。\n\n2. **找共同話題**：問一些開放式問題，畀對方有機會分享。比方講，你可以問：“你最近有無試過咩新野？或者鍾意睇咩戲？”如果對方講到，咁你就接力，例如：“哇，我都好鍾意呢套戲，劇情好吸引啊！”呢個方法可以輕易找出共同興趣。\n\n3. **聽多啲，講少啲**：傾偈時，多聽對方講，然後用簡單回應來接龍。例如，對方話自己鍾意旅行，你可以講：“聽起來好刺激啊！有無推薦一個好地方去？”呢個會讓對方覺得你有興趣，關係自然就進展。\n\n### 我畀你一個例子：\n想像下，你喺派對或網上群組見到新朋友，你可以開口講：“嗨，我係hong，最近好忙於工作/學習，你呢邊最近有無趣事分享啊？”呢個超簡單，90%機會可以延續話題。\n\n記住，每個人都好鍾意被人注意同分享，所以你試下用',	'2026-02-19 13:22:04'),
(9,	8,	'user',	'我想和一位新朋友開始聊天。根據我的個人資料，我應該聊些什麼話題呢？',	'2026-02-21 08:34:29'),
(10,	8,	'assistant',	'當然啦，user1！好開心你想同新朋友開始聊天，呢個係一個好正嘅第一步。既然你嘅個人資料未有太多細節（譬如MBTI未知，無自我介紹），我可以根據一般情況建議一些簡單、安全嘅話題，幫助你打破冰。記住，初次聊天最好保持輕鬆，專注於共同興趣或日常事。\n\n以下係幾個具體嘅話題建議，你可以試下：\n1. **天氣或最近活動**：例如，“你最近天氣好唔好？有無去做咩戶外活動？”呢個好通用，隨時都適用，容易引申到其他話題。\n2. **興趣愛好**：問句像，“你平時鍾意睇咩戲或聽咩音樂？”如果對方分享，你可以簡單講下自己嘅喜好，雖然你未有自我介紹，但呢個可以做為起步點。\n3. **食物或日常瑣事**：試下講，“你鍾意食咩？最近有無試過新餐廳？”呢個通常好親切，人人都愛講食，容易拉近距離。\n\n試下用呢啲話題開始，應該好快就熱鬧起來。如果你有更多關於自己嘅資料分享，我可以幫你更精準地建議！有咩問題，隨時問我呀～ 😊',	'2026-02-21 08:34:49'),
(11,	8,	'user',	'what is my name?',	'2026-02-21 08:35:41'),
(12,	8,	'assistant',	'嗨！你好呀，你嘅名係 user1 喎。如果你有其他問題，或者想用呢個名開始同新朋友聊天，我可以幫你諗吓一些話題建議！😊',	'2026-02-21 08:35:47'),
(13,	8,	'user',	'what is my mbti type?',	'2026-02-23 04:26:51'),
(14,	8,	'assistant',	'你好呀，user1！關於你嘅MBTI類型，我呢度顯示係未知嘅，可能是因為我冇收到相關資訊。如果你想知道更多，我可以推薦一些簡單嘅MBTI測試，或者我們一齊討論吓呢個話題，睇吓你對自己嘅性格有咩想法？😊',	'2026-02-23 04:26:59'),
(15,	6,	'user',	'my name is?',	'2026-02-23 04:32:17'),
(16,	6,	'assistant',	'哈囉！好開心你同我傾偈啊。你問緊你自己嘅名，根據我嘅記錄，你嘅用戶名係「good」喎。如果你有其他問題，或者想同新朋友打開話題，我都可以幫手呀！😊',	'2026-02-23 04:32:25'),
(17,	6,	'user',	'我想和一位新朋友開始聊天。根據我的個人資料，我應該聊些什麼話題呢？',	'2026-02-23 04:32:38'),
(18,	6,	'assistant',	'嗨，good！好開心你想同新朋友開始聊天，我可以幫手建議一下話題。既然你嘅個人資料呢度，MBTI 未知，冇自我介紹，我主要參考你嘅用戶名「good」，感覺好正面積極，所以我建議你從一些輕鬆、正面嘅角度入手，咁樣比較容易拉近距離。\n\n例如：\n- **分享正面經歷**：你可以問吓對方：「最近有冇咩好事發生？或者分享一個你好開心嘅經歷！」呢個話題因為你嘅用戶名「good」，好夾得起，容易引導到積極嘅討論。\n- **興趣愛好**：先問：「你平時鍾意做咩事？例如睇戲、聽歌或者旅行？」呢樣好普遍，大家都容易接上。\n- **基本自我介紹**：如果對方唔熟，可以從簡單嘅開始：「你叫咩名？從邊度來？」或者自我介紹吓：「我呢個用戶名係 good，因為我覺得生活要正面啫，你呢？」\n  \n咁樣一來，就唔會太尷尬，慢慢展開聊天。記住，保持笑容同傾得真心啲，就最重要啦！如果之後有其他問題，或者想更多建議，隨時同我講啊，唔該！',	'2026-02-23 04:32:51'),
(19,	2,	'user',	'我想和一位新朋友開始聊天。根據我的個人資料，我應該聊些什麼話題呢？',	'2026-02-23 05:10:42'),
(20,	2,	'assistant',	'當然，Mary！好開心你想同新朋友開始聊天，我會根據你嘅個人資料幫手建議一些適合嘅話題。既然你嘅MBTI類型係ISTJ（Introverted, Sensing, Thinking, Judging），呢個類型嘅人通常比較務實、注重細節同可靠，所以我建議選擇一些具體、現實嘅話題，這樣可以避免尷尬，輕鬆帶入對話。\n\n以下係幾個根據你MBTI類型嘅具體話題建議：\n- **日常生活經驗**：例如問對方「最近有冇試過新嘅咖啡店或餐廳？」，因為ISTJ喜歡討論實際嘅事，呢個可以分享真實嘅故事同感覺。\n- **工作或學習嘅分享**：你可以問「你工作（或讀書）嘅時候，有冇遇到過有趣嘅挑戰？」，呢個話題有結構，容易從事實出發，展現你嘅可靠一面。\n- **興趣愛好嘅細節**：如果對方提起愛好，你可以問「你鍾意睇邊一套電影？有冇推薦一些經典嘅？」，ISTJ傾向於討論具體嘅細節，而不是太抽象嘅想法。\n- **計劃同目標**：試下問「你有冇計劃今年去做嘅事？例如旅行或學習新技能？」，呢個可以顯示你有組織性，同時帶點前瞻性。\n\n記住，開始時保持簡單，專注於對方嘅回應，這樣可以自然發展出更多話題。如果你想，我可以再幫你腦筋急轉彎，提供更多例子！有咩其他問題或者想分享經驗，都可以同我講吖。😊',	'2026-02-23 05:10:59');

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

INSERT INTO `chat_room_members` (`id`, `room_id`, `user_id`, `joined_at`) VALUES
(1,	1,	1,	'2026-02-03 04:44:41'),
(2,	1,	4,	'2026-02-03 04:44:41'),
(3,	2,	2,	'2026-02-03 04:47:09'),
(4,	2,	1,	'2026-02-03 04:47:09'),
(5,	3,	2,	'2026-02-03 04:47:14'),
(6,	3,	1,	'2026-02-03 04:47:14'),
(7,	2,	4,	'2026-02-03 04:48:12'),
(9,	4,	5,	'2026-02-21 05:08:22'),
(10,	4,	1,	'2026-02-21 05:08:22'),
(11,	5,	5,	'2026-02-21 05:45:49'),
(12,	5,	3,	'2026-02-21 05:45:49'),
(13,	2,	5,	'2026-02-21 05:57:52'),
(14,	2,	6,	'2026-02-21 06:00:24'),
(15,	6,	7,	'2026-02-21 06:46:46'),
(16,	6,	6,	'2026-02-21 06:46:46'),
(17,	7,	7,	'2026-02-21 06:47:17'),
(18,	7,	6,	'2026-02-21 06:47:17'),
(19,	8,	7,	'2026-02-21 06:59:56'),
(21,	9,	1,	'2026-02-21 07:13:20'),
(22,	9,	5,	'2026-02-21 07:13:20'),
(23,	10,	5,	'2026-02-21 07:30:54'),
(24,	10,	1,	'2026-02-21 07:30:54'),
(25,	10,	3,	'2026-02-21 07:30:54'),
(26,	11,	6,	'2026-02-21 07:39:50'),
(27,	11,	7,	'2026-02-21 07:39:50'),
(28,	12,	7,	'2026-02-21 07:41:38'),
(29,	12,	5,	'2026-02-21 07:41:38'),
(30,	13,	7,	'2026-02-21 07:42:15'),
(31,	13,	5,	'2026-02-21 07:42:15'),
(32,	14,	1,	'2026-02-21 07:51:54'),
(35,	15,	1,	'2026-02-21 08:17:43'),
(37,	16,	5,	'2026-02-21 08:19:07'),
(38,	16,	6,	'2026-02-21 08:19:07'),
(39,	17,	8,	'2026-02-21 08:31:13'),
(40,	17,	5,	'2026-02-21 08:31:13'),
(41,	18,	8,	'2026-02-21 08:32:00'),
(42,	18,	5,	'2026-02-21 08:32:33'),
(43,	19,	10,	'2026-02-23 04:36:17'),
(44,	19,	1,	'2026-02-23 04:36:17'),
(45,	20,	5,	'2026-02-23 05:09:43'),
(46,	20,	2,	'2026-02-23 05:09:43'),
(47,	21,	8,	'2026-02-23 05:26:26'),
(48,	21,	5,	'2026-02-23 05:27:03'),
(49,	22,	5,	'2026-02-23 05:38:20'),
(50,	22,	4,	'2026-02-23 05:38:20');

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

INSERT INTO `chat_room_reads` (`id`, `user_id`, `room_id`, `message_id`, `read_at`) VALUES
(1,	1,	1,	2,	'2026-02-03 04:45:32'),
(4,	4,	1,	2,	'2026-02-03 04:45:17'),
(11,	1,	4,	4,	'2026-02-21 05:43:34'),
(19,	5,	4,	5,	'2026-02-21 05:44:30'),
(22,	3,	5,	6,	'2026-02-21 05:45:56'),
(24,	5,	5,	6,	'2026-02-21 05:46:12'),
(25,	5,	2,	32,	'2026-02-23 05:37:16'),
(27,	1,	2,	32,	'2026-02-23 05:17:24'),
(31,	6,	2,	8,	'2026-02-21 06:00:56'),
(32,	6,	6,	9,	'2026-02-21 07:03:04'),
(34,	7,	7,	10,	'2026-02-21 06:48:22'),
(36,	6,	7,	10,	'2026-02-21 07:39:29'),
(37,	7,	8,	11,	'2026-02-21 07:00:06'),
(39,	6,	8,	11,	'2026-02-21 07:00:24'),
(41,	1,	9,	12,	'2026-02-21 07:13:44'),
(43,	5,	9,	12,	'2026-02-21 07:31:12'),
(46,	5,	10,	13,	'2026-02-21 07:31:17'),
(50,	1,	10,	13,	'2026-02-21 07:32:44'),
(53,	7,	6,	9,	'2026-02-21 07:41:13'),
(54,	5,	12,	14,	'2026-02-21 07:41:43'),
(56,	7,	12,	14,	'2026-02-21 07:41:57'),
(57,	5,	14,	16,	'2026-02-21 08:21:54'),
(59,	7,	14,	16,	'2026-02-21 07:58:03'),
(64,	5,	15,	17,	'2026-02-21 08:21:48'),
(67,	6,	16,	18,	'2026-02-21 08:19:11'),
(69,	5,	16,	18,	'2026-02-21 08:22:26'),
(77,	1,	15,	17,	'2026-02-21 08:28:58'),
(81,	1,	14,	16,	'2026-02-21 08:29:16'),
(82,	5,	17,	20,	'2026-02-21 08:32:27'),
(84,	8,	17,	20,	'2026-02-21 08:31:43'),
(88,	5,	18,	21,	'2026-02-21 08:32:41'),
(90,	8,	18,	21,	'2026-02-21 08:32:56'),
(91,	1,	19,	22,	'2026-02-23 04:36:20'),
(93,	10,	19,	22,	'2026-02-23 04:36:36'),
(94,	2,	20,	23,	'2026-02-23 05:11:23'),
(97,	2,	2,	32,	'2026-02-23 05:17:28'),
(98,	1,	3,	30,	'2026-02-23 05:16:53'),
(100,	2,	3,	30,	'2026-02-23 05:16:56'),
(128,	4,	22,	35,	'2026-02-23 05:42:23'),
(130,	5,	22,	35,	'2026-02-23 05:42:27');

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
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `chat_rooms` (`id`, `name`, `type`, `description`, `avatar`, `created_by`, `created_at`, `last_activity`) VALUES
(1,	'Ben',	'private',	NULL,	'http://192.168.1.11:3000/uploads/avatars/1770093813166-972135021.jpg',	NULL,	'2026-02-03 04:44:41',	'2026-02-03 04:45:16'),
(2,	'吹水 Group',	'group',	'',	NULL,	NULL,	'2026-02-03 04:47:09',	'2026-02-23 05:17:23'),
(3,	'Sam',	'private',	NULL,	'http://192.168.1.11:3000/uploads/avatars/1770093565758-79996471.jpg',	NULL,	'2026-02-03 04:47:14',	'2026-02-23 05:16:53'),
(4,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-21 05:08:22',	'2026-02-21 05:44:30'),
(5,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-21 05:45:49',	'2026-02-21 05:45:56'),
(6,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-21 06:46:46',	'2026-02-21 06:46:55'),
(7,	'test',	'group',	'test',	NULL,	NULL,	'2026-02-21 06:47:17',	'2026-02-21 06:48:22'),
(8,	'yo',	'group',	'yoyoyoy',	NULL,	NULL,	'2026-02-21 06:59:56',	'2026-02-21 07:00:06'),
(9,	'test',	'group',	'test',	NULL,	NULL,	'2026-02-21 07:13:20',	'2026-02-21 07:13:44'),
(10,	'try',	'group',	'',	NULL,	NULL,	'2026-02-21 07:30:54',	'2026-02-21 07:31:10'),
(11,	'school',	'group',	'for school',	NULL,	NULL,	'2026-02-21 07:39:50',	'2026-02-21 07:39:50'),
(12,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-21 07:41:38',	'2026-02-21 07:41:43'),
(13,	'game',	'group',	'game',	NULL,	NULL,	'2026-02-21 07:42:15',	'2026-02-21 07:42:15'),
(14,	'for hong',	'group',	'fuck',	NULL,	NULL,	'2026-02-21 07:51:54',	'2026-02-21 07:57:31'),
(15,	'tryyyyy',	'group',	'tryyy',	NULL,	NULL,	'2026-02-21 08:17:43',	'2026-02-21 08:18:07'),
(16,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-21 08:19:07',	'2026-02-21 08:19:11'),
(17,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-21 08:31:13',	'2026-02-21 08:31:43'),
(18,	'school',	'group',	'for school',	NULL,	NULL,	'2026-02-21 08:32:00',	'2026-02-21 08:32:41'),
(19,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-23 04:36:17',	'2026-02-23 04:36:20'),
(20,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-23 05:09:43',	'2026-02-23 05:09:47'),
(21,	'School',	'group',	'',	NULL,	NULL,	'2026-02-23 05:26:26',	'2026-02-23 05:26:26'),
(22,	NULL,	'private',	NULL,	NULL,	NULL,	'2026-02-23 05:38:20',	'2026-02-23 05:42:13');

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

INSERT INTO `daily_journals` (`id`, `user_id`, `content`, `mood`, `created_at`) VALUES
(1,	5,	'eat good food',	'happy',	'2026-02-21 15:00:59'),
(2,	5,	'today lost my money',	'sad',	'2026-02-21 15:05:55'),
(3,	5,	'my exam failed!',	'sad ',	'2026-02-21 15:07:13'),
(4,	1,	'pass eaxm',	'happy ',	'2026-02-23 04:29:51'),
(5,	2,	'Pass eaxm',	'Good',	'2026-02-23 05:12:00'),
(6,	8,	'Failed eaxm',	'Bad',	'2026-02-23 05:23:44');

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

INSERT INTO `friend_requests` (`id`, `from_user_id`, `to_user_id`, `status`, `created_at`) VALUES
(1,	4,	1,	'accepted',	'2026-02-03 04:44:16'),
(2,	1,	2,	'accepted',	'2026-02-03 04:45:51'),
(3,	5,	6,	'rejected',	'2026-02-19 14:10:16'),
(4,	5,	1,	'rejected',	'2026-02-19 14:59:18'),
(5,	5,	2,	'accepted',	'2026-02-19 15:43:19'),
(6,	2,	5,	'rejected',	'2026-02-19 15:44:24'),
(7,	1,	5,	'rejected',	'2026-02-19 16:52:15'),
(8,	1,	5,	'rejected',	'2026-02-19 16:54:23'),
(9,	1,	5,	'rejected',	'2026-02-19 17:04:50'),
(10,	5,	1,	'rejected',	'2026-02-19 17:06:05'),
(11,	5,	1,	'rejected',	'2026-02-19 17:30:10'),
(12,	5,	1,	'rejected',	'2026-02-19 17:30:19'),
(13,	5,	1,	'rejected',	'2026-02-19 17:31:21'),
(14,	5,	1,	'rejected',	'2026-02-19 17:31:22'),
(15,	5,	1,	'rejected',	'2026-02-19 17:35:20'),
(16,	5,	1,	'rejected',	'2026-02-19 17:35:22'),
(17,	5,	1,	'rejected',	'2026-02-19 17:35:41'),
(18,	5,	1,	'rejected',	'2026-02-19 17:35:41'),
(19,	5,	1,	'rejected',	'2026-02-19 17:35:42'),
(20,	5,	1,	'rejected',	'2026-02-19 17:36:09'),
(21,	5,	1,	'rejected',	'2026-02-19 17:36:09'),
(22,	5,	1,	'rejected',	'2026-02-19 17:36:11'),
(23,	5,	1,	'rejected',	'2026-02-19 17:36:20'),
(24,	5,	1,	'rejected',	'2026-02-19 17:37:54'),
(25,	1,	5,	'rejected',	'2026-02-19 17:51:56'),
(26,	1,	5,	'rejected',	'2026-02-19 17:57:46'),
(27,	1,	5,	'rejected',	'2026-02-19 18:15:20'),
(28,	5,	1,	'rejected',	'2026-02-19 18:16:36'),
(29,	5,	1,	'rejected',	'2026-02-19 18:16:39'),
(30,	5,	1,	'rejected',	'2026-02-19 18:16:42'),
(31,	1,	5,	'rejected',	'2026-02-19 18:26:26'),
(32,	1,	5,	'rejected',	'2026-02-19 18:28:32'),
(33,	1,	3,	'pending',	'2026-02-19 18:42:40'),
(34,	1,	5,	'rejected',	'2026-02-19 18:42:42'),
(35,	1,	5,	'rejected',	'2026-02-19 18:56:59'),
(36,	5,	1,	'rejected',	'2026-02-19 19:03:14'),
(37,	1,	5,	'rejected',	'2026-02-20 08:16:29'),
(38,	5,	1,	'rejected',	'2026-02-20 08:25:49'),
(39,	1,	5,	'rejected',	'2026-02-21 04:13:12'),
(40,	1,	5,	'rejected',	'2026-02-21 04:13:58'),
(41,	5,	1,	'accepted',	'2026-02-21 04:14:51'),
(42,	1,	5,	'rejected',	'2026-02-21 04:29:13'),
(43,	1,	5,	'rejected',	'2026-02-21 04:35:49'),
(44,	5,	3,	'accepted',	'2026-02-21 05:45:31'),
(45,	7,	6,	'accepted',	'2026-02-21 06:46:27'),
(46,	7,	5,	'accepted',	'2026-02-21 07:41:03'),
(47,	5,	6,	'accepted',	'2026-02-21 08:18:44'),
(48,	8,	5,	'accepted',	'2026-02-21 08:30:53'),
(49,	10,	1,	'accepted',	'2026-02-23 04:36:00'),
(50,	5,	4,	'accepted',	'2026-02-23 05:37:59');

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

INSERT INTO `friendships` (`id`, `user1_id`, `user2_id`, `status`, `created_at`) VALUES
(1,	4,	1,	'accepted',	'2026-02-03 04:44:34'),
(2,	1,	2,	'accepted',	'2026-02-03 04:46:05'),
(3,	5,	1,	'accepted',	'2026-02-21 05:08:22'),
(4,	5,	3,	'accepted',	'2026-02-21 05:45:49'),
(5,	7,	6,	'accepted',	'2026-02-21 06:46:46'),
(6,	7,	5,	'accepted',	'2026-02-21 07:41:38'),
(7,	5,	6,	'accepted',	'2026-02-21 08:19:07'),
(8,	8,	5,	'accepted',	'2026-02-21 08:31:13'),
(9,	10,	1,	'accepted',	'2026-02-23 04:36:17'),
(10,	5,	2,	'accepted',	'2026-02-23 05:09:43'),
(11,	5,	4,	'accepted',	'2026-02-23 05:38:20');

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

INSERT INTO `group_invites` (`id`, `group_id`, `from_user_id`, `to_user_id`, `status`, `created_at`) VALUES
(1,	9,	5,	6,	'pending',	'2026-02-21 07:15:00'),
(2,	10,	1,	6,	'pending',	'2026-02-21 07:32:57'),
(3,	14,	1,	5,	'accepted',	'2026-02-21 07:51:54'),
(4,	14,	5,	7,	'accepted',	'2026-02-21 07:56:53'),
(5,	15,	1,	5,	'accepted',	'2026-02-21 08:17:43'),
(9,	18,	8,	5,	'accepted',	'2026-02-21 08:32:00'),
(10,	21,	8,	5,	'accepted',	'2026-02-23 05:26:26');

DROP TABLE IF EXISTS `interests`;
CREATE TABLE `interests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_interest` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `interests` (`id`, `name`, `category`) VALUES
(1,	'科技',	'興趣'),
(2,	'藝術',	'興趣'),
(3,	'音樂',	'興趣'),
(4,	'運動',	'興趣'),
(5,	'閱讀',	'興趣'),
(6,	'旅行',	'興趣'),
(7,	'美食',	'興趣'),
(8,	'電影',	'興趣'),
(9,	'攝影',	'興趣'),
(10,	'遊戲',	'興趣');

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

INSERT INTO `mbti_history` (`id`, `user_id`, `mbti_type`, `test_mode`, `created_at`) VALUES
(1,	2,	'ISTJ',	'app',	'2026-02-03 04:41:19');

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

INSERT INTO `messages` (`id`, `room_id`, `sender_id`, `content`, `created_at`, `message_type`, `file_size`, `file_name`) VALUES
(1,	1,	1,	'Hello!',	'2026-02-03 04:44:47',	'text',	NULL,	NULL),
(2,	1,	4,	'Hi! Nice to meet you',	'2026-02-03 04:45:16',	'text',	NULL,	NULL),
(3,	4,	1,	'hiiiii',	'2026-02-21 05:21:46',	'text',	NULL,	NULL),
(4,	4,	1,	'yo',	'2026-02-21 05:43:34',	'text',	NULL,	NULL),
(5,	4,	5,	'hihihihhihihihih',	'2026-02-21 05:44:30',	'text',	NULL,	NULL),
(6,	5,	3,	'fuck you',	'2026-02-21 05:45:56',	'text',	NULL,	NULL),
(7,	2,	5,	'hi',	'2026-02-21 05:58:28',	'text',	NULL,	NULL),
(8,	2,	1,	'hiiiiii',	'2026-02-21 06:00:34',	'text',	NULL,	NULL),
(9,	6,	6,	'hi',	'2026-02-21 06:46:55',	'text',	NULL,	NULL),
(10,	7,	7,	'yo',	'2026-02-21 06:48:22',	'text',	NULL,	NULL),
(11,	8,	7,	'yooo',	'2026-02-21 07:00:06',	'text',	NULL,	NULL),
(12,	9,	1,	'hoiiiii',	'2026-02-21 07:13:44',	'text',	NULL,	NULL),
(13,	10,	5,	'hi',	'2026-02-21 07:31:10',	'text',	NULL,	NULL),
(14,	12,	5,	'yo',	'2026-02-21 07:41:43',	'text',	NULL,	NULL),
(15,	14,	5,	'nice',	'2026-02-21 07:57:06',	'text',	NULL,	NULL),
(16,	14,	7,	'yo',	'2026-02-21 07:57:31',	'text',	NULL,	NULL),
(17,	15,	5,	'hihihiihh',	'2026-02-21 08:18:07',	'text',	NULL,	NULL),
(18,	16,	6,	'yoooooo',	'2026-02-21 08:19:11',	'text',	NULL,	NULL),
(19,	17,	5,	'yoooooo',	'2026-02-21 08:31:17',	'text',	NULL,	NULL),
(20,	17,	8,	'yoo',	'2026-02-21 08:31:43',	'text',	NULL,	NULL),
(21,	18,	5,	'hiiiiii',	'2026-02-21 08:32:41',	'text',	NULL,	NULL),
(22,	19,	1,	'hiiii',	'2026-02-23 04:36:20',	'text',	NULL,	NULL),
(23,	20,	2,	'Yo',	'2026-02-23 05:09:47',	'text',	NULL,	NULL),
(24,	3,	1,	'yo',	'2026-02-23 05:14:47',	'text',	NULL,	NULL),
(25,	3,	1,	'hiii',	'2026-02-23 05:15:34',	'text',	NULL,	NULL),
(26,	2,	1,	'yo',	'2026-02-23 05:15:57',	'text',	NULL,	NULL),
(27,	2,	2,	'Yo',	'2026-02-23 05:16:00',	'text',	NULL,	NULL),
(28,	3,	2,	'Hihihihi',	'2026-02-23 05:16:40',	'text',	NULL,	NULL),
(29,	3,	2,	'Hihihihihih',	'2026-02-23 05:16:47',	'text',	NULL,	NULL),
(30,	3,	1,	'yoooo',	'2026-02-23 05:16:53',	'text',	NULL,	NULL),
(31,	2,	2,	'Test',	'2026-02-23 05:17:14',	'text',	NULL,	NULL),
(32,	2,	1,	'test1',	'2026-02-23 05:17:23',	'text',	NULL,	NULL),
(33,	22,	4,	'Hihi',	'2026-02-23 05:38:28',	'text',	NULL,	NULL),
(34,	22,	5,	'Yo',	'2026-02-23 05:42:04',	'text',	NULL,	NULL),
(35,	22,	4,	'sdfgsdfg',	'2026-02-23 05:42:13',	'text',	NULL,	NULL);

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
  `type` enum('task_reward','daily_checkin','item_redeem','system_bonus','referral') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'task_reward',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
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
(43,	5,	-200,	'item_redeem',	'兌換商品: 的士/共享單車優惠碼',	'2026-02-23 05:37:00');

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

INSERT INTO `post_comments` (`id`, `post_id`, `user_id`, `content`, `created_at`, `safety_score`, `is_approved`, `moderation_reason`, `moderated_at`) VALUES
(1,	2,	1,	'Hi!',	'2026-02-03 05:22:14',	0,	1,	NULL,	NULL),
(2,	3,	4,	'Welcome!',	'2026-02-03 05:22:37',	0,	1,	NULL,	NULL),
(3,	1,	4,	'good view!',	'2026-02-03 05:22:50',	0,	1,	NULL,	NULL),
(4,	4,	5,	'很棒的評論！',	'2026-02-24 05:04:58',	0,	1,	NULL,	'2026-02-24 05:04:58');

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

INSERT INTO `post_likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES
(1,	2,	1,	'2026-02-03 05:22:03'),
(2,	3,	1,	'2026-02-03 05:22:19'),
(3,	3,	4,	'2026-02-03 05:22:32'),
(4,	1,	4,	'2026-02-03 05:22:43'),
(5,	3,	5,	'2026-02-21 05:48:48'),
(6,	4,	5,	'2026-02-21 05:48:56');

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

INSERT INTO `posts` (`id`, `user_id`, `content`, `media_urls`, `media_types`, `created_at`, `safety_score`, `is_approved`) VALUES
(1,	1,	'Beautiful view\n\n#tokyo',	'[\"/uploads/post_media/images/1770094235808-538395763.jpg\"]',	'[\"image\"]',	'2026-02-03 04:50:36',	0,	1),
(2,	2,	'Hi guys!\n\n#FirstPost',	'[\"/uploads/post_media/images/1770094371766-816857412.jpg\"]',	'[\"image\"]',	'2026-02-03 04:52:52',	0,	1),
(3,	3,	'Hi all!',	'[]',	'[]',	'2026-02-03 05:21:35',	0,	1),
(4,	1,	'good',	'[]',	'[]',	'2026-02-13 03:24:07',	0,	1),
(5,	5,	'這是一個很棒的評論！',	'[]',	'[]',	'2026-02-24 05:04:28',	0,	1);

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
(10,	'連鎖咖啡/飲品買一送一券',	'適用於大家樂、Starbucks、走杯等指定品牌，買一送一優惠',	'coupon',	300,	100,	1,	'/uploads/shop/coffee_coupon.jpg',	1,	'2026-02-21 17:12:20',	'2026-02-21 17:12:20'),
(11,	'電影現金券',	'$30 電影票折扣，適用於各大影院',	'coupon',	400,	50,	1,	'/uploads/shop/movie_coupon.jpg',	1,	'2026-02-21 17:12:20',	'2026-02-21 17:12:20'),
(12,	'的士/共享單車優惠碼',	'HKTaxi 或 Lalamove 即減 $10 優惠碼',	'coupon',	200,	200,	1,	'/uploads/shop/taxi_coupon.jpg',	1,	'2026-02-21 17:12:20',	'2026-02-21 17:12:20'),
(13,	'連鎖咖啡/飲品買一送一券',	'適用於大家樂、Starbucks、走杯等指定品牌，買一送一優惠',	'coupon',	300,	100,	1,	'/uploads/shop/coffee_coupon.jpg',	1,	'2026-02-21 17:15:49',	'2026-02-21 17:15:49'),
(14,	'電影現金券',	'$30 電影票折扣，適用於各大影院',	'coupon',	400,	50,	1,	'/uploads/shop/movie_coupon.jpg',	1,	'2026-02-21 17:15:49',	'2026-02-21 17:15:49'),
(15,	'的士/共享單車優惠碼',	'HKTaxi 或 Lalamove 即減 $10 優惠碼',	'coupon',	200,	200,	1,	'/uploads/shop/taxi_coupon.jpg',	1,	'2026-02-21 17:15:49',	'2026-02-21 17:15:49');

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
(1,	'完成MBTI測驗',	'完成一次完整的MBTI性格測試',	'achievement',	1,	500,	1,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(2,	'發送第一條消息',	'在好友或群組聊天中發送第一條消息',	'achievement',	1,	100,	2,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(3,	'添加第一位好友',	'成功添加一位好友',	'achievement',	1,	500,	3,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(4,	'在討論區張貼首個貼文',	'在討論區發佈第一篇貼文',	'achievement',	1,	200,	4,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(5,	'點讚一個貼文',	'對任何貼文點讚一次',	'achievement',	1,	100,	5,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(6,	'轉發一個貼文',	'轉發任何一篇貼文',	'achievement',	1,	50,	6,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(7,	'上傳頭像',	'設置個人頭像（非預設）',	'achievement',	1,	200,	7,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(8,	'連續7天簽到',	'連續簽到7天',	'achievement',	7,	500,	8,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(9,	'連續14天簽到',	'連續簽到14天',	'achievement',	14,	600,	9,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(10,	'連續30天簽到',	'連續簽到30天',	'achievement',	30,	800,	10,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(11,	'連續60天簽到',	'連續簽到60天',	'achievement',	60,	1000,	11,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(12,	'連續90天簽到',	'連續簽到90天',	'achievement',	90,	1500,	12,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(13,	'連續180天簽到',	'連續簽到180天',	'achievement',	180,	2500,	13,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(14,	'連續365天簽到',	'連續簽到365天',	'achievement',	365,	5000,	14,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(15,	'每日發送5條訊息',	'在任何聊天室發送5條訊息',	'daily',	5,	50,	15,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45'),
(16,	'每日完成MBTI測驗一次',	'當天完成一次MBTI測驗',	'daily',	1,	100,	16,	1,	'2026-01-26 17:36:45',	'2026-01-26 17:36:45');

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

INSERT INTO `user_coupons` (`id`, `user_id`, `item_id`, `coupon_code`, `qr_code_data`, `status`, `expires_at`, `redeemed_at`, `used_at`) VALUES
(1,	7,	12,	'COUPON-A5AA708D',	'COUPON-A5AA708D',	'unused',	NULL,	'2026-02-21 17:35:13',	NULL),
(2,	6,	12,	'COUPON-B3CE7800',	'COUPON-B3CE7800',	'unused',	NULL,	'2026-02-21 17:41:46',	NULL),
(3,	2,	12,	'COUPON-4DB14650',	'COUPON-4DB14650',	'unused',	NULL,	'2026-02-23 05:20:35',	NULL),
(4,	2,	10,	'COUPON-8D6011C9',	'COUPON-8D6011C9',	'unused',	NULL,	'2026-02-23 05:20:47',	NULL),
(5,	8,	12,	'COUPON-12830E24',	'COUPON-12830E24',	'unused',	NULL,	'2026-02-23 05:21:59',	NULL),
(6,	5,	12,	'COUPON-18C6C834',	'COUPON-18C6C834',	'unused',	NULL,	'2026-02-23 05:37:00',	NULL);

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

INSERT INTO `user_redemptions` (`id`, `user_id`, `item_id`, `status`, `redeemed_at`, `created_at`) VALUES
(1,	1,	3,	'redeemed',	'2026-02-21 17:05:36',	'2026-02-21 17:05:36');

DROP TABLE IF EXISTS `user_scenarios`;
CREATE TABLE `user_scenarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `target_user_id` int NOT NULL,
  `scenario_data` json DEFAULT NULL,
  `status` enum('active','completed','expired') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
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

INSERT INTO `user_tasks` (`id`, `user_id`, `task_id`, `started_at`, `completed_at`, `current_progress`, `user_status`) VALUES
(1,	1,	1,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(2,	1,	2,	'2026-02-03 04:36:38',	'2026-02-03 04:44:51',	1,	'completed'),
(3,	1,	3,	'2026-02-03 04:36:38',	'2026-02-03 04:44:37',	1,	'completed'),
(4,	1,	4,	'2026-02-03 04:36:38',	'2026-02-03 04:51:33',	1,	'completed'),
(5,	1,	5,	'2026-02-03 04:36:38',	'2026-02-03 05:22:23',	1,	'completed'),
(6,	1,	6,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(7,	1,	7,	'2026-02-03 04:36:38',	'2026-02-03 04:39:27',	1,	'completed'),
(8,	1,	8,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(9,	1,	9,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(10,	1,	10,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(11,	1,	11,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(12,	1,	12,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(13,	1,	13,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(14,	1,	14,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(15,	1,	15,	'2026-02-03 04:36:38',	NULL,	6,	'completed'),
(16,	1,	16,	'2026-02-03 04:36:38',	NULL,	0,	'in_progress'),
(17,	2,	1,	'2026-02-03 04:40:36',	'2026-02-03 04:41:20',	1,	'completed'),
(18,	2,	2,	'2026-02-03 04:40:36',	'2026-02-23 13:09:51',	1,	'completed'),
(19,	2,	3,	'2026-02-03 04:40:36',	'2026-02-03 04:47:22',	1,	'completed'),
(20,	2,	4,	'2026-02-03 04:40:36',	'2026-02-03 04:53:09',	1,	'completed'),
(21,	2,	5,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(22,	2,	6,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(23,	2,	7,	'2026-02-03 04:40:36',	'2026-02-03 04:40:57',	1,	'completed'),
(24,	2,	8,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(25,	2,	9,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(26,	2,	10,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(27,	2,	11,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(28,	2,	12,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(29,	2,	13,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(30,	2,	14,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(31,	2,	15,	'2026-02-03 04:40:36',	NULL,	5,	'completed'),
(32,	2,	16,	'2026-02-03 04:40:36',	NULL,	0,	'in_progress'),
(33,	3,	1,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(34,	3,	2,	'2026-02-03 04:41:59',	'2026-02-21 13:46:01',	1,	'completed'),
(35,	3,	3,	'2026-02-03 04:41:59',	'2026-02-21 13:46:01',	1,	'completed'),
(36,	3,	4,	'2026-02-03 04:41:59',	'2026-02-03 05:21:42',	1,	'completed'),
(37,	3,	5,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(38,	3,	6,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(39,	3,	7,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(40,	3,	8,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(41,	3,	9,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(42,	3,	10,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(43,	3,	11,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(44,	3,	12,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(45,	3,	13,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(46,	3,	14,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(47,	3,	15,	'2026-02-03 04:41:59',	NULL,	1,	'in_progress'),
(48,	3,	16,	'2026-02-03 04:41:59',	NULL,	0,	'in_progress'),
(49,	4,	1,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(50,	4,	2,	'2026-02-03 04:43:06',	'2026-02-03 04:45:19',	1,	'completed'),
(51,	4,	3,	'2026-02-03 04:43:06',	'2026-02-03 04:44:58',	1,	'completed'),
(52,	4,	4,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(53,	4,	5,	'2026-02-03 04:43:06',	'2026-02-03 05:22:58',	1,	'completed'),
(54,	4,	6,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(55,	4,	7,	'2026-02-03 04:43:06',	'2026-02-03 04:43:35',	1,	'completed'),
(56,	4,	8,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(57,	4,	9,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(58,	4,	10,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(59,	4,	11,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(60,	4,	12,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(61,	4,	13,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(62,	4,	14,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(63,	4,	15,	'2026-02-03 04:43:06',	NULL,	1,	'in_progress'),
(64,	4,	16,	'2026-02-03 04:43:06',	NULL,	0,	'in_progress'),
(65,	5,	1,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(66,	5,	2,	'2026-02-19 13:21:37',	'2026-02-21 13:44:37',	1,	'completed'),
(67,	5,	3,	'2026-02-19 13:21:37',	'2026-02-21 13:44:22',	1,	'completed'),
(68,	5,	4,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(69,	5,	5,	'2026-02-19 13:21:37',	'2026-02-21 13:49:09',	1,	'completed'),
(70,	5,	6,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(71,	5,	7,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(72,	5,	8,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(73,	5,	9,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(74,	5,	10,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(75,	5,	11,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(76,	5,	12,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(77,	5,	13,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(78,	5,	14,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(79,	5,	15,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(80,	5,	16,	'2026-02-19 13:21:37',	NULL,	0,	'in_progress'),
(81,	6,	1,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(82,	6,	2,	'2026-02-21 05:59:05',	'2026-02-21 14:46:57',	1,	'completed'),
(83,	6,	3,	'2026-02-21 05:59:05',	'2026-02-21 14:46:57',	1,	'completed'),
(84,	6,	4,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(85,	6,	5,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(86,	6,	6,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(87,	6,	7,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(88,	6,	8,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(89,	6,	9,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(90,	6,	10,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(91,	6,	11,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(92,	6,	12,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(93,	6,	13,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(94,	6,	14,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(95,	6,	15,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(96,	6,	16,	'2026-02-21 05:59:05',	NULL,	0,	'in_progress'),
(97,	7,	1,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(98,	7,	2,	'2026-02-21 06:44:37',	'2026-02-21 14:48:24',	1,	'completed'),
(99,	7,	3,	'2026-02-21 06:44:37',	'2026-02-21 14:47:06',	1,	'completed'),
(100,	7,	4,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(101,	7,	5,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(102,	7,	6,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(103,	7,	7,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(104,	7,	8,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(105,	7,	9,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(106,	7,	10,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(107,	7,	11,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(108,	7,	12,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(109,	7,	13,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(110,	7,	14,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(111,	7,	15,	'2026-02-21 06:44:37',	NULL,	3,	'in_progress'),
(112,	7,	16,	'2026-02-21 06:44:37',	NULL,	0,	'in_progress'),
(113,	8,	1,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(114,	8,	2,	'2026-02-21 08:25:09',	'2026-02-21 16:32:12',	1,	'completed'),
(115,	8,	3,	'2026-02-21 08:25:09',	'2026-02-21 16:31:36',	1,	'completed'),
(116,	8,	4,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(117,	8,	5,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(118,	8,	6,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(119,	8,	7,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(120,	8,	8,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(121,	8,	9,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(122,	8,	10,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(123,	8,	11,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(124,	8,	12,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(125,	8,	13,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(126,	8,	14,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(127,	8,	15,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(128,	8,	16,	'2026-02-21 08:25:09',	NULL,	0,	'in_progress'),
(129,	9,	1,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(130,	9,	2,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(131,	9,	3,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(132,	9,	4,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(133,	9,	5,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(134,	9,	6,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(135,	9,	7,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(136,	9,	8,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(137,	9,	9,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(138,	9,	10,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(139,	9,	11,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(140,	9,	12,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(141,	9,	13,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(142,	9,	14,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(143,	9,	15,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(144,	9,	16,	'2026-02-21 08:25:27',	NULL,	0,	'in_progress'),
(145,	10,	1,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(146,	10,	2,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(147,	10,	3,	'2026-02-23 04:34:37',	'2026-02-23 12:36:33',	1,	'completed'),
(148,	10,	4,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(149,	10,	5,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(150,	10,	6,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(151,	10,	7,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(152,	10,	8,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(153,	10,	9,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(154,	10,	10,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(155,	10,	11,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(156,	10,	12,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(157,	10,	13,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(158,	10,	14,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(159,	10,	15,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress'),
(160,	10,	16,	'2026-02-23 04:34:37',	NULL,	0,	'in_progress');

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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `users` (`id`, `points`, `username`, `password`, `email`, `avatar`, `mbti`, `status`, `last_active`, `bio`, `expo_push_token`) VALUES
(1,	1150,	'Sam',	'$2b$10$DTZDqblK.FEcpEo2C6d52ukSw.Z.wIUMQ.m9kma6S9ZOMKPcbIoUK',	'sam@gmail.com',	'/uploads/avatars/1770093565758-79996471.jpg',	NULL,	NULL,	'2026-02-23 05:17:23',	NULL,	NULL),
(2,	1650,	'Mary',	'$2b$10$4TwqQwZSkFrxJ8lkvegnqu1fzoIqsQ81.w6BkLy19M2N487yB.CeK',	'mary@gmail.com',	'/uploads/avatars/1770093656449-439741123.jpg',	'ISTJ',	NULL,	'2026-02-23 05:17:14',	NULL,	NULL),
(3,	800,	'Tom',	'$2b$10$kw/UEj.3pY.z.7p7ZVJ0befkpstffE1YZlTjL9h/a.yBspI1bKF2C',	'tom@gmail.com',	'/uploads/avatars/default.png',	NULL,	NULL,	'2026-02-21 05:45:56',	NULL,	NULL),
(4,	900,	'Ben',	'$2b$10$UXdiXg.9WklPpuXkmQ8AqeoIOCN8SU.FPRsp54WyTVQrHhiMn6JRq',	'ben@gmail.com',	'/uploads/avatars/1770093813166-972135021.jpg',	NULL,	NULL,	'2026-02-23 05:42:13',	NULL,	NULL),
(5,	7500,	'hong',	'$2b$10$D3FCQaTE7Lt6wfJ/sAR53Og3QVWD4kw/W3fYnGD3P2A4KUk/RyH9i',	'hong@gmail.com	',	'/uploads/avatars/default.png',	NULL,	NULL,	'2026-02-23 05:42:04',	NULL,	NULL),
(6,	600,	'good',	'$2b$10$7b1Po.fmuae9rK9MR3LfL.GyvNFjkyOCbqTi9aqiEmN.aG4ixHXgC',	'good@gmail.com',	'/uploads/avatars/default.png',	NULL,	NULL,	'2026-02-21 08:19:11',	NULL,	NULL),
(7,	600,	'bad',	'$2b$10$v.7H8CA.McUpDTSmOt5iGeDBlthV1x4I3s.nlIb4DRW8Ex9O8N07i',	'bad@gmail.com',	'/uploads/avatars/default.png',	NULL,	NULL,	'2026-02-21 07:57:31',	NULL,	NULL),
(8,	600,	'user1',	'$2b$10$7GUYmDoGvnJExiwqUnyo1OMCZf5MAwBAEFbnMsIQElHk1MWnSK9n2',	'asdf@gmail.com',	'/uploads/avatars/default.png',	NULL,	NULL,	'2026-02-23 05:26:26',	NULL,	NULL),
(9,	0,	'user2',	'$2b$10$OqmJMHsDL0wMO.YeC6s26OS/KOSBAtzVzN.vxZiR7NlI2pLy1Fgq2',	'asdfasdf@gmail.com',	'/uploads/avatars/default.png',	NULL,	NULL,	NULL,	NULL,	NULL),
(10,	500,	'asdfasdf',	'$2b$10$WfBtPiYIKBmZiOEF2y6VV.ah3e0LNdaSo2euBIjocfyXH35rn8opC',	'asdf1@gmail.com',	'/uploads/avatars/default.png',	NULL,	NULL,	'2026-02-23 04:36:00',	NULL,	NULL);

-- 2026-02-24 05:27:53 UTC
