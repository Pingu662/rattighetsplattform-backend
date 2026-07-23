-- ============================================================
-- COMPLETE DATABASE SCHEMA FOR DIGITAL RÄTTIGHETSPLATTFORM
-- MySQL/MariaDB Compatible - Import directly into phpMyAdmin
-- ============================================================

-- Drop existing tables if they exist (for clean reimports)
DROP TABLE IF EXISTS `petition_signatures`;
DROP TABLE IF EXISTS `petitions`;
DROP TABLE IF EXISTS `forum_replies`;
DROP TABLE IF EXISTS `forum_topics`;
DROP TABLE IF EXISTS `forum_categories`;
DROP TABLE IF EXISTS `jurist_verifications`;
DROP TABLE IF EXISTS `jurist_profiles`;
DROP TABLE IF EXISTS `document_shares`;
DROP TABLE IF EXISTS `document_versions`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `ai_conversations`;
DROP TABLE IF EXISTS `ai_messages`;
DROP TABLE IF EXISTS `appeal_cases`;
DROP TABLE IF EXISTS `case_rulings`;
DROP TABLE IF EXISTS `case_comments`;
DROP TABLE IF EXISTS `legal_cases`;
DROP TABLE IF EXISTS `my_cases`;
DROP TABLE IF EXISTS `saved_rulings`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `ai_logs`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `refresh_tokens`;
DROP TABLE IF EXISTS `bankid_sessions`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `data_retention_policy`;

-- ============================================================
-- ROLES TABLE
-- ============================================================
CREATE TABLE `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` TEXT,
    `permissions` JSON DEFAULT '[]',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`name`, `description`, `permissions`) VALUES
('super_admin', 'Full system access', '["all"]'),
('admin', 'Administrative access', '["manage_users","manage_cases","manage_documents","manage_ai","moderate_forum","view_stats"]'),
('jurist', 'Verified legal professional', '["create_forum","answer_questions","access_library","upload_cases"]'),
('moderator', 'Forum and content moderation', '["moderate_forum","manage_categories","hide_content"]'),
('expert', 'Subject matter expert', '["create_forum","access_library","upload_cases","comment_cases"]'),
('user', 'Standard user', '["view_cases","create_appeals","upload_documents","use_ai","forum_participate"]');

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `personal_number` VARCHAR(13) UNIQUE,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100),
    `last_name` VARCHAR(100),
    `phone` VARCHAR(20),
    `role_id` INT DEFAULT 6,
    `is_verified` BOOLEAN DEFAULT FALSE,
    `is_active` BOOLEAN DEFAULT TRUE,
    `is_bankid_verified` BOOLEAN DEFAULT FALSE,
    `bankid_personal_number` VARCHAR(13),
    `avatar_url` TEXT,
    `two_factor_enabled` BOOLEAN DEFAULT FALSE,
    `two_factor_secret` VARCHAR(255),
    `last_login_at` TIMESTAMP NULL,
    `login_attempts` INT DEFAULT 0,
    `locked_until` TIMESTAMP NULL,
    `preferred_language` VARCHAR(10) DEFAULT 'sv',
    `theme_preference` VARCHAR(10) DEFAULT 'light',
    `email_notifications` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_users_email` ON `users`(`email`);
CREATE INDEX `idx_users_personal_number` ON `users`(`personal_number`);
CREATE INDEX `idx_users_role` ON `users`(`role_id`);
CREATE INDEX `idx_users_bankid` ON `users`(`bankid_personal_number`);

-- ============================================================
-- SESSIONS TABLE
-- ============================================================
CREATE TABLE `sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `session_token` VARCHAR(255) NOT NULL UNIQUE,
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `device_info` JSON,
    `is_active` BOOLEAN DEFAULT TRUE,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_sessions_user` ON `sessions`(`user_id`);
CREATE INDEX `idx_sessions_token` ON `sessions`(`session_token`);

-- ============================================================
-- REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE `refresh_tokens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL UNIQUE,
    `device_info` JSON,
    `ip_address` VARCHAR(45),
    `is_revoked` BOOLEAN DEFAULT FALSE,
    `revoked_at` TIMESTAMP NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_refresh_tokens_user` ON `refresh_tokens`(`user_id`);
CREATE INDEX `idx_refresh_tokens_hash` ON `refresh_tokens`(`token_hash`);

-- ============================================================
-- BANKID SESSIONS TABLE
-- ============================================================
CREATE TABLE `bankid_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `order_ref` VARCHAR(100) NOT NULL UNIQUE,
    `auto_start_token` VARCHAR(255),
    `status` VARCHAR(50) DEFAULT 'pending',
    `personal_number` VARCHAR(13),
    `given_name` VARCHAR(100),
    `surname` VARCHAR(100),
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `purpose` VARCHAR(50) DEFAULT 'login',
    `signature_data` TEXT,
    `ocsp_response` TEXT,
    `completed_at` TIMESTAMP NULL,
    `error_message` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_bankid_order` ON `bankid_sessions`(`order_ref`);
CREATE INDEX `idx_bankid_status` ON `bankid_sessions`(`status`);
CREATE INDEX `idx_bankid_user` ON `bankid_sessions`(`user_id`);

-- ============================================================
-- MY CASES (User's personal cases/appeals)
-- ============================================================
CREATE TABLE `my_cases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `case_type` VARCHAR(100),
    `authority` VARCHAR(255),
    `authority_department` VARCHAR(255),
    `case_number` VARCHAR(100),
    `status` VARCHAR(50) DEFAULT 'open',
    `priority` VARCHAR(20) DEFAULT 'normal',
    `category` VARCHAR(100),
    `tags` JSON DEFAULT '[]',
    `deadline` TIMESTAMP NULL,
    `assigned_jurist_id` INT NULL,
    `is_archived` BOOLEAN DEFAULT FALSE,
    `metadata` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_jurist_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_my_cases_user` ON `my_cases`(`user_id`);
CREATE INDEX `idx_my_cases_status` ON `my_cases`(`status`);
CREATE INDEX `idx_my_cases_type` ON `my_cases`(`case_type`);

-- ============================================================
-- LEGAL CASES / RÄTTSPRAXIS BIBLIOTEK
-- ============================================================
CREATE TABLE `legal_cases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `title` VARCHAR(500) NOT NULL,
    `case_number` VARCHAR(100) NOT NULL,
    `court` VARCHAR(100) NOT NULL,
    `court_type` VARCHAR(50),
    `case_type` VARCHAR(100),
    `category` VARCHAR(100),
    `subcategory` VARCHAR(100),
    `year` INT,
    `ruling_date` DATE,
    `published_date` DATE,
    `summary` TEXT,
    `full_text` LONGTEXT,
    `keywords` JSON DEFAULT '[]',
    `laws_cited` JSON DEFAULT '[]',
    `precedents_cited` JSON DEFAULT '[]',
    `outcome` VARCHAR(50),
    `parties` JSON,
    `pdf_url` TEXT,
    `source_url` TEXT,
    `language` VARCHAR(10) DEFAULT 'sv',
    `is_featured` BOOLEAN DEFAULT FALSE,
    `ai_summary` TEXT,
    `embedding_id` VARCHAR(100),
    `uploader_id` INT NULL,
    `is_approved` BOOLEAN DEFAULT FALSE,
    `approved_by` INT NULL,
    `approved_at` TIMESTAMP NULL,
    `view_count` INT DEFAULT 0,
    `metadata` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_legal_cases_court` ON `legal_cases`(`court`);
CREATE INDEX `idx_legal_cases_number` ON `legal_cases`(`case_number`);
CREATE INDEX `idx_legal_cases_year` ON `legal_cases`(`year`);
CREATE INDEX `idx_legal_cases_category` ON `legal_cases`(`category`);
CREATE INDEX `idx_legal_cases_approved` ON `legal_cases`(`is_approved`);

-- ============================================================
-- CASE RULINGS (Multiple rulings per legal case)
-- ============================================================
CREATE TABLE `case_rulings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `legal_case_id` INT NOT NULL,
    `instance` VARCHAR(50),
    `ruling_date` DATE,
    `decision` TEXT,
    `reasoning` TEXT,
    `legal_basis` JSON DEFAULT '[]',
    `outcome` VARCHAR(50),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`legal_case_id`) REFERENCES `legal_cases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_case_rulings_case` ON `case_rulings`(`legal_case_id`);

-- ============================================================
-- CASE COMMENTS (User comments on legal cases)
-- ============================================================
CREATE TABLE `case_comments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `legal_case_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `content` TEXT NOT NULL,
    `is_expert_comment` BOOLEAN DEFAULT FALSE,
    `is_hidden` BOOLEAN DEFAULT FALSE,
    `parent_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`legal_case_id`) REFERENCES `legal_cases`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_id`) REFERENCES `case_comments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_case_comments_case` ON `case_comments`(`legal_case_id`);
CREATE INDEX `idx_case_comments_user` ON `case_comments`(`user_id`);

-- ============================================================
-- APPEAL CASES (Överklagande-generator)
-- ============================================================
CREATE TABLE `appeal_cases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `my_case_id` INT NULL,
    `title` VARCHAR(255) NOT NULL,
    `authority_name` VARCHAR(255),
    `authority_decision_date` DATE,
    `authority_case_number` VARCHAR(100),
    `original_decision` TEXT,
    `ai_analysis` JSON,
    `identified_errors` JSON DEFAULT '[]',
    `identified_law_violations` JSON DEFAULT '[]',
    `cited_legal_cases` JSON DEFAULT '[]',
    `cited_laws` JSON DEFAULT '[]',
    `appeal_text` LONGTEXT,
    `appeal_simple_text` LONGTEXT,
    `appeal_status` VARCHAR(50) DEFAULT 'draft',
    `submission_date` TIMESTAMP NULL,
    `submitted_to` VARCHAR(255),
    `response_date` TIMESTAMP NULL,
    `response_text` TEXT,
    `outcome` VARCHAR(50),
    `is_ai_generated` BOOLEAN DEFAULT TRUE,
    `metadata` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`my_case_id`) REFERENCES `my_cases`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_appeal_cases_user` ON `appeal_cases`(`user_id`);
CREATE INDEX `idx_appeal_cases_status` ON `appeal_cases`(`appeal_status`);
CREATE INDEX `idx_appeal_cases_case` ON `appeal_cases`(`my_case_id`);

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================
CREATE TABLE `documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `my_case_id` INT NULL,
    `appeal_case_id` INT NULL,
    `original_filename` VARCHAR(500) NOT NULL,
    `stored_filename` VARCHAR(255) NOT NULL,
    `file_path` TEXT NOT NULL,
    `file_size` BIGINT,
    `mime_type` VARCHAR(100),
    `file_type` VARCHAR(50),
    `document_category` VARCHAR(100),
    `description` TEXT,
    `ai_processed` BOOLEAN DEFAULT FALSE,
    `ai_analysis` JSON,
    `ocr_text` LONGTEXT,
    `extracted_text` LONGTEXT,
    `page_count` INT,
    `is_encrypted` BOOLEAN DEFAULT FALSE,
    `encryption_key_hash` VARCHAR(255),
    `checksum` VARCHAR(255),
    `is_approved` BOOLEAN DEFAULT FALSE,
    `approved_by` INT NULL,
    `metadata` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`my_case_id`) REFERENCES `my_cases`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`appeal_case_id`) REFERENCES `appeal_cases`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_documents_user` ON `documents`(`user_id`);
CREATE INDEX `idx_documents_case` ON `documents`(`my_case_id`);
CREATE INDEX `idx_documents_mime` ON `documents`(`mime_type`);
CREATE INDEX `idx_documents_category` ON `documents`(`document_category`);

-- ============================================================
-- DOCUMENT VERSIONS
-- ============================================================
CREATE TABLE `document_versions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `document_id` INT NOT NULL,
    `version_number` INT NOT NULL,
    `stored_filename` VARCHAR(255) NOT NULL,
    `file_size` BIGINT,
    `checksum` VARCHAR(255),
    `change_notes` TEXT,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_doc_versions_document` ON `document_versions`(`document_id`);

-- ============================================================
-- DOCUMENT SHARES
-- ============================================================
CREATE TABLE `document_shares` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `document_id` INT NOT NULL,
    `shared_by` INT NOT NULL,
    `shared_with` INT NULL,
    `share_token` VARCHAR(255) UNIQUE,
    `permission_level` VARCHAR(20) DEFAULT 'view',
    `expires_at` TIMESTAMP NULL,
    `access_count` INT DEFAULT 0,
    `is_revoked` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`shared_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`shared_with`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_doc_shares_document` ON `document_shares`(`document_id`);
CREATE INDEX `idx_doc_shares_token` ON `document_shares`(`share_token`);

-- ============================================================
-- AI CONVERSATIONS
-- ============================================================
CREATE TABLE `ai_conversations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `my_case_id` INT NULL,
    `title` VARCHAR(255),
    `ai_provider` VARCHAR(50) DEFAULT 'openai',
    `ai_model` VARCHAR(100),
    `conversation_type` VARCHAR(50) DEFAULT 'chat',
    `system_prompt` TEXT,
    `context_documents` JSON DEFAULT '[]',
    `token_count` INT DEFAULT 0,
    `message_count` INT DEFAULT 0,
    `is_archived` BOOLEAN DEFAULT FALSE,
    `metadata` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`my_case_id`) REFERENCES `my_cases`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_ai_conversations_user` ON `ai_conversations`(`user_id`);
CREATE INDEX `idx_ai_conversations_case` ON `ai_conversations`(`my_case_id`);

-- ============================================================
-- AI MESSAGES
-- ============================================================
CREATE TABLE `ai_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `conversation_id` INT NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `message_type` VARCHAR(50) DEFAULT 'text',
    `tokens_used` INT,
    `model_used` VARCHAR(100),
    `metadata` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_ai_messages_conversation` ON `ai_messages`(`conversation_id`);

-- ============================================================
-- AI LOGS (Audit trail for AI usage)
-- ============================================================
CREATE TABLE `ai_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `conversation_id` INT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `prompt_tokens` INT DEFAULT 0,
    `completion_tokens` INT DEFAULT 0,
    `total_tokens` INT DEFAULT 0,
    `cost` DECIMAL(10,6) DEFAULT 0,
    `duration_ms` INT,
    `endpoint` VARCHAR(100),
    `status` VARCHAR(20) DEFAULT 'success',
    `error_message` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_ai_logs_user` ON `ai_logs`(`user_id`);
CREATE INDEX `idx_ai_logs_provider` ON `ai_logs`(`provider`);
CREATE INDEX `idx_ai_logs_created` ON `ai_logs`(`created_at`);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE `favorites` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `favorite_type` VARCHAR(50) NOT NULL,
    `reference_id` INT NOT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_favorites` (`user_id`, `favorite_type`, `reference_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_favorites_user` ON `favorites`(`user_id`);
CREATE INDEX `idx_favorites_type` ON `favorites`(`favorite_type`);

-- ============================================================
-- SAVED RULINGS (User's saved legal cases)
-- ============================================================
CREATE TABLE `saved_rulings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `legal_case_id` INT NOT NULL,
    `notes` TEXT,
    `tags` JSON DEFAULT '[]',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_saved_rulings` (`user_id`, `legal_case_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`legal_case_id`) REFERENCES `legal_cases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_saved_rulings_user` ON `saved_rulings`(`user_id`);
CREATE INDEX `idx_saved_rulings_case` ON `saved_rulings`(`legal_case_id`);

-- ============================================================
-- CATEGORIES (For legal cases, documents, forum)
-- ============================================================
CREATE TABLE `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT,
    `parent_id` INT NULL,
    `icon` VARCHAR(50),
    `sort_order` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`name`, `slug`, `description`, `sort_order`) VALUES
('Försäkringskassan', 'forsakringskassan', 'Ärenden relaterade till Försäkringskassan', 1),
('Socialtjänsten', 'socialtjansten', 'Ekonomiskt bistånd och socialtjänstfrågor', 2),
('Sjukpenning', 'sjukpenning', 'Sjukpenning och sjukersättning', 3),
('Aktivitetsersättning', 'aktivitetsersattning', 'Aktivitetsersättning', 4),
('LSS', 'lss', 'Lagen om stöd och service till vissa funktionshindrade', 5),
('Assistansersättning', 'assistansersattning', 'Assistansersättning', 6),
('Bostadsbidrag', 'bostadsbidrag', 'Bostadsbidrag och bostadstillägg', 7),
('Arbetsförmedlingen', 'arbetsformedlingen', 'Ärenden relaterade till Arbetsförmedlingen', 8),
('Förvaltningsrätten', 'forvaltningsratten', 'Förvaltningsrättsliga frågor', 9),
('Kammarrätten', 'kammarratten', 'Kammarrättsliga frågor', 10),
('HFD', 'hfd', 'Högsta förvaltningsdomstolen', 11),
('EU-rätt', 'eu-ratt', 'EU-rätt och Europadomstolen', 12);

-- ============================================================
-- FORUM CATEGORIES
-- ============================================================
CREATE TABLE `forum_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT,
    `icon` VARCHAR(50),
    `sort_order` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT TRUE,
    `requires_verified` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `forum_categories` (`name`, `slug`, `description`, `icon`, `sort_order`) VALUES
('Allmänna frågor', 'allmanna-fragor', 'Allmänna frågor om rättigheter', 'general', 1),
('Försäkringskassan', 'forsakringskassan-forum', 'Frågor om Försäkringskassan', 'insurance', 2),
('Socialtjänsten', 'socialtjansten-forum', 'Frågor om socialtjänst och bistånd', 'social', 3),
('Sjukpenning & ersättning', 'sjukpenning-forum', 'Frågor om sjukpenning och ersättningar', 'health', 4),
('LSS & Assistans', 'lss-forum', 'Frågor om LSS och assistansersättning', 'care', 5),
('Arbetsrätt', 'arbetsratt', 'Frågor om arbetsrätt och Arbetsförmedlingen', 'work', 6),
('Juristhjälp', 'juristhjalp', 'Frågor besvarade av verifierade jurister', 'legal', 7),
('Överklaganden', 'overklaganden', 'Diskussion om överklagandeprocesser', 'appeal', 8);

-- ============================================================
-- FORUM TOPICS
-- ============================================================
CREATE TABLE `forum_topics` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `forum_category_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `is_pinned` BOOLEAN DEFAULT FALSE,
    `is_locked` BOOLEAN DEFAULT FALSE,
    `is_hidden` BOOLEAN DEFAULT FALSE,
    `is_solved` BOOLEAN DEFAULT FALSE,
    `has_expert_answer` BOOLEAN DEFAULT FALSE,
    `tags` JSON DEFAULT '[]',
    `view_count` INT DEFAULT 0,
    `reply_count` INT DEFAULT 0,
    `last_reply_at` TIMESTAMP NULL,
    `last_reply_user_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`forum_category_id`) REFERENCES `forum_categories`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`last_reply_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_forum_topics_category` ON `forum_topics`(`forum_category_id`);
CREATE INDEX `idx_forum_topics_user` ON `forum_topics`(`user_id`);
CREATE INDEX `idx_forum_topics_pinned` ON `forum_topics`(`is_pinned`);

-- ============================================================
-- FORUM REPLIES
-- ============================================================
CREATE TABLE `forum_replies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `topic_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `content` LONGTEXT NOT NULL,
    `is_expert_answer` BOOLEAN DEFAULT FALSE,
    `is_best_answer` BOOLEAN DEFAULT FALSE,
    `is_hidden` BOOLEAN DEFAULT FALSE,
    `parent_id` INT NULL,
    `helpful_count` INT DEFAULT 0,
    `is_edited` BOOLEAN DEFAULT FALSE,
    `edited_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`topic_id`) REFERENCES `forum_topics`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_id`) REFERENCES `forum_replies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_forum_replies_topic` ON `forum_replies`(`topic_id`);
CREATE INDEX `idx_forum_replies_user` ON `forum_replies`(`user_id`);
CREATE INDEX `idx_forum_replies_best` ON `forum_replies`(`is_best_answer`);

-- ============================================================
-- JURIST PROFILES (För juristnätverket)
-- ============================================================
CREATE TABLE `jurist_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `license_number` VARCHAR(100),
    `specialization` JSON DEFAULT '[]',
    `years_of_experience` INT,
    `law_firm` VARCHAR(255),
    `office_address` TEXT,
    `city` VARCHAR(100),
    `bio` TEXT,
    `education` JSON DEFAULT '[]',
    `languages` JSON DEFAULT '["svenska"]',
    `consultation_fee` DECIMAL(10,2),
    `free_consultation` BOOLEAN DEFAULT FALSE,
    `available_for_consultation` BOOLEAN DEFAULT FALSE,
    `average_rating` DECIMAL(3,2) DEFAULT 0,
    `review_count` INT DEFAULT 0,
    `answer_count` INT DEFAULT 0,
    `verified_at` TIMESTAMP NULL,
    `verified_by` INT NULL,
    `is_verified` BOOLEAN DEFAULT FALSE,
    `is_featured` BOOLEAN DEFAULT FALSE,
    `metadata` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_jurist_profiles_verified` ON `jurist_profiles`(`is_verified`);

-- ============================================================
-- JURIST VERIFICATIONS (Verification requests & audit)
-- ============================================================
CREATE TABLE `jurist_verifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `status` VARCHAR(50) DEFAULT 'pending',
    `license_document_id` INT NULL,
    `identification_document_id` INT NULL,
    `submitted_notes` TEXT,
    `reviewed_by` INT NULL,
    `review_notes` TEXT,
    `reviewed_at` TIMESTAMP NULL,
    `expired_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`license_document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`identification_document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_jurist_verifications_user` ON `jurist_verifications`(`user_id`);
CREATE INDEX `idx_jurist_verifications_status` ON `jurist_verifications`(`status`);

-- ============================================================
-- PETITIONS (Namninsamlingar)
-- ============================================================
CREATE TABLE `petitions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `target_authority` VARCHAR(255),
    `category` VARCHAR(100),
    `signature_goal` INT DEFAULT 100,
    `signature_count` INT DEFAULT 0,
    `status` VARCHAR(50) DEFAULT 'active',
    `start_date` DATE DEFAULT (CURRENT_DATE),
    `end_date` DATE,
    `response_text` TEXT,
    `response_date` TIMESTAMP NULL,
    `is_featured` BOOLEAN DEFAULT FALSE,
    `tags` JSON DEFAULT '[]',
    `metadata` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_petitions_user` ON `petitions`(`user_id`);
CREATE INDEX `idx_petitions_status` ON `petitions`(`status`);
CREATE INDEX `idx_petitions_category` ON `petitions`(`category`);

-- ============================================================
-- PETITION SIGNATURES
-- ============================================================
CREATE TABLE `petition_signatures` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `petition_id` INT NOT NULL,
    `user_id` INT NULL,
    `signer_name` VARCHAR(200),
    `signer_personal_number` VARCHAR(13),
    `signer_city` VARCHAR(100),
    `is_anonymous` BOOLEAN DEFAULT FALSE,
    `is_bankid_verified` BOOLEAN DEFAULT FALSE,
    `bankid_session_id` INT NULL,
    `signature_data` TEXT,
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_petition_user` (`petition_id`, `user_id`),
    UNIQUE KEY `uq_petition_personal` (`petition_id`, `signer_personal_number`),
    FOREIGN KEY (`petition_id`) REFERENCES `petitions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`bankid_session_id`) REFERENCES `bankid_sessions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_petition_signatures_petition` ON `petition_signatures`(`petition_id`);
CREATE INDEX `idx_petition_signatures_user` ON `petition_signatures`(`user_id`);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE `audit_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50),
    `entity_id` INT,
    `changes` JSON,
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `session_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_audit_logs_user` ON `audit_logs`(`user_id`);
CREATE INDEX `idx_audit_logs_action` ON `audit_logs`(`action`);
CREATE INDEX `idx_audit_logs_entity` ON `audit_logs`(`entity_type`, `entity_id`);
CREATE INDEX `idx_audit_logs_created` ON `audit_logs`(`created_at`);

-- ============================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================
ALTER TABLE `legal_cases` ADD FULLTEXT INDEX `ft_legal_cases_search` (`title`, `summary`, `full_text`);
ALTER TABLE `forum_topics` ADD FULLTEXT INDEX `ft_forum_topics_search` (`title`, `content`);
ALTER TABLE `documents` ADD FULLTEXT INDEX `ft_documents_search` (`original_filename`, `extracted_text`, `description`);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT,
    `data` JSON,
    `is_read` BOOLEAN DEFAULT FALSE,
    `read_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_notifications_user` ON `notifications`(`user_id`);
CREATE INDEX `idx_notifications_unread` ON `notifications`(`user_id`, `is_read`);

-- ============================================================
-- SETTINGS TABLE (System-wide settings)
-- ============================================================
CREATE TABLE `system_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` JSON NOT NULL,
    `description` TEXT,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('ai_providers', '[
    {"name":"openai","display":"OpenAI","enabled":true,"models":["gpt-4","gpt-4-turbo","gpt-3.5-turbo"]},
    {"name":"claude","display":"Claude","enabled":true,"models":["claude-3-opus","claude-3-sonnet","claude-3-haiku"]},
    {"name":"deepseek","display":"DeepSeek","enabled":true,"models":["deepseek-chat","deepseek-coder"]},
    {"name":"gemini","display":"Gemini","enabled":true,"models":["gemini-pro","gemini-ultra"]},
    {"name":"mistral","display":"Mistral","enabled":true,"models":["mistral-large","mistral-medium","mistral-small"]}
]', 'Configured AI providers and models'),
('system_name', '"Digital Rättighetsplattform"', 'System display name'),
('system_email', '"info@rattighetsplattform.se"', 'System email address'),
('maintenance_mode', 'false', 'System maintenance mode'),
('registration_open', 'true', 'Allow user registration'),
('bankid_enabled', 'true', 'BankID integration enabled'),
('max_document_size', '10485760', 'Maximum document upload size (10MB)'),
('allowed_document_types', '["pdf","doc","docx","txt","jpg","jpeg","png","tiff"]', 'Allowed document MIME types');

-- ============================================================
-- DATA RETENTION POLICY (For GDPR compliance)
-- ============================================================
CREATE TABLE `data_retention_policy` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `entity_type` VARCHAR(50) NOT NULL,
    `retention_days` INT NOT NULL,
    `action` VARCHAR(50) DEFAULT 'delete',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `data_retention_policy` (`entity_type`, `retention_days`, `action`) VALUES
('audit_logs', 365, 'archive'),
('ai_logs', 180, 'delete'),
('sessions', 30, 'delete'),
('refresh_tokens', 90, 'delete'),
('notifications', 365, 'delete');

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- This MySQL schema is ready to import directly into phpMyAdmin.
-- All tables, indexes, seed data included. No triggers (not supported on all hosts).
-- Reply counts and signature counts are handled by the application code.
-- ============================================================