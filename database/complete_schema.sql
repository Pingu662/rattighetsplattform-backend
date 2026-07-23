-- ============================================================
-- COMPLETE DATABASE SCHEMA FOR DIGITAL RÄTTIGHETSPLATTFORM
-- PostgreSQL Compatible - Import directly into phpMyAdmin
-- ============================================================

-- Drop existing tables if they exist (for clean reimports)
DROP TABLE IF EXISTS petition_signatures CASCADE;
DROP TABLE IF EXISTS petitions CASCADE;
DROP TABLE IF EXISTS forum_replies CASCADE;
DROP TABLE IF EXISTS forum_topics CASCADE;
DROP TABLE IF EXISTS forum_categories CASCADE;
DROP TABLE IF EXISTS jurist_verifications CASCADE;
DROP TABLE IF EXISTS jurist_profiles CASCADE;
DROP TABLE IF EXISTS document_shares CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS appeal_cases CASCADE;
DROP TABLE IF EXISTS case_rulings CASCADE;
DROP TABLE IF EXISTS case_comments CASCADE;
DROP TABLE IF EXISTS legal_cases CASCADE;
DROP TABLE IF EXISTS my_cases CASCADE;
DROP TABLE IF EXISTS saved_rulings CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS ai_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS bankid_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ============================================================
-- EXTENSIONS (PostgreSQL specific - comment out for MySQL)
-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ROLES TABLE
-- ============================================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed roles
INSERT INTO roles (name, description, permissions) VALUES
('super_admin', 'Full system access', '["all"]'),
('admin', 'Administrative access', '["manage_users","manage_cases","manage_documents","manage_ai","moderate_forum","view_stats"]'),
('jurist', 'Verified legal professional', '["create_forum","answer_questions","access_library","upload_cases"]'),
('moderator', 'Forum and content moderation', '["moderate_forum","manage_categories","hide_content"]'),
('expert', 'Subject matter expert', '["create_forum","access_library","upload_cases","comment_cases"]'),
('user', 'Standard user', '["view_cases","create_appeals","upload_documents","use_ai","forum_participate"]');

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
    personal_number VARCHAR(13) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role_id INTEGER REFERENCES roles(id) DEFAULT 6,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_bankid_verified BOOLEAN DEFAULT FALSE,
    bankid_personal_number VARCHAR(13),
    avatar_url TEXT,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    last_login_at TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    preferred_language VARCHAR(10) DEFAULT 'sv',
    theme_preference VARCHAR(10) DEFAULT 'light',
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_personal_number ON users(personal_number);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_bankid ON users(bankid_personal_number);

-- ============================================================
-- SESSIONS TABLE
-- ============================================================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);

-- ============================================================
-- REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB,
    ip_address VARCHAR(45),
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================================
-- BANKID SESSIONS TABLE
-- ============================================================
CREATE TABLE bankid_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    order_ref VARCHAR(100) NOT NULL UNIQUE,
    auto_start_token VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    personal_number VARCHAR(13),
    given_name VARCHAR(100),
    surname VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    purpose VARCHAR(50) DEFAULT 'login',
    signature_data TEXT,
    ocsp_response TEXT,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bankid_order ON bankid_sessions(order_ref);
CREATE INDEX idx_bankid_status ON bankid_sessions(status);
CREATE INDEX idx_bankid_user ON bankid_sessions(user_id);

-- ============================================================
-- MY CASES (User's personal cases/appeals)
-- ============================================================
CREATE TABLE my_cases (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    case_type VARCHAR(100),
    authority VARCHAR(255),
    authority_department VARCHAR(255),
    case_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    deadline TIMESTAMP,
    assigned_jurist_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_my_cases_user ON my_cases(user_id);
CREATE INDEX idx_my_cases_status ON my_cases(status);
CREATE INDEX idx_my_cases_type ON my_cases(case_type);

-- ============================================================
-- LEGAL CASES / RÄTTSPRAXIS BIBLIOTEK
-- ============================================================
CREATE TABLE legal_cases (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
    title VARCHAR(500) NOT NULL,
    case_number VARCHAR(100) NOT NULL,
    court VARCHAR(100) NOT NULL,
    court_type VARCHAR(50),
    case_type VARCHAR(100),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    year INTEGER,
    ruling_date DATE,
    published_date DATE,
    summary TEXT,
    full_text TEXT,
    keywords JSONB DEFAULT '[]',
    laws_cited JSONB DEFAULT '[]',
    precedents_cited JSONB DEFAULT '[]',
    outcome VARCHAR(50),
    parties JSONB,
    pdf_url TEXT,
    source_url TEXT,
    language VARCHAR(10) DEFAULT 'sv',
    is_featured BOOLEAN DEFAULT FALSE,
    ai_summary TEXT,
    embedding_id VARCHAR(100),
    uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_legal_cases_court ON legal_cases(court);
CREATE INDEX idx_legal_cases_number ON legal_cases(case_number);
CREATE INDEX idx_legal_cases_year ON legal_cases(year);
CREATE INDEX idx_legal_cases_category ON legal_cases(category);
CREATE INDEX idx_legal_cases_keywords ON legal_cases USING gin(keywords);
CREATE INDEX idx_legal_cases_laws ON legal_cases USING gin(laws_cited);
CREATE INDEX idx_legal_cases_approved ON legal_cases(is_approved);

-- ============================================================
-- CASE RULINGS (Multiple rulings per legal case)
-- ============================================================
CREATE TABLE case_rulings (
    id SERIAL PRIMARY KEY,
    legal_case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    instance VARCHAR(50),
    ruling_date DATE,
    decision TEXT,
    reasoning TEXT,
    legal_basis JSONB DEFAULT '[]',
    outcome VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_rulings_case ON case_rulings(legal_case_id);

-- ============================================================
-- CASE COMMENTS (User comments on legal cases)
-- ============================================================
CREATE TABLE case_comments (
    id SERIAL PRIMARY KEY,
    legal_case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_expert_comment BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    parent_id INTEGER REFERENCES case_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_comments_case ON case_comments(legal_case_id);
CREATE INDEX idx_case_comments_user ON case_comments(user_id);

-- ============================================================
-- APPEAL CASES (Överklagande-generator)
-- ============================================================
CREATE TABLE appeal_cases (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    my_case_id INTEGER REFERENCES my_cases(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    authority_name VARCHAR(255),
    authority_decision_date DATE,
    authority_case_number VARCHAR(100),
    original_decision TEXT,
    ai_analysis JSONB,
    identified_errors JSONB DEFAULT '[]',
    identified_law_violations JSONB DEFAULT '[]',
    cited_legal_cases JSONB DEFAULT '[]',
    cited_laws JSONB DEFAULT '[]',
    appeal_text TEXT,
    appeal_simple_text TEXT,
    appeal_status VARCHAR(50) DEFAULT 'draft',
    submission_date TIMESTAMP,
    submitted_to VARCHAR(255),
    response_date TIMESTAMP,
    response_text TEXT,
    outcome VARCHAR(50),
    is_ai_generated BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appeal_cases_user ON appeal_cases(user_id);
CREATE INDEX idx_appeal_cases_status ON appeal_cases(appeal_status);
CREATE INDEX idx_appeal_cases_case ON appeal_cases(my_case_id);

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    my_case_id INTEGER REFERENCES my_cases(id) ON DELETE SET NULL,
    appeal_case_id INTEGER REFERENCES appeal_cases(id) ON DELETE SET NULL,
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_type VARCHAR(50),
    document_category VARCHAR(100),
    description TEXT,
    ai_processed BOOLEAN DEFAULT FALSE,
    ai_analysis JSONB,
    ocr_text TEXT,
    extracted_text TEXT,
    page_count INTEGER,
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_key_hash VARCHAR(255),
    checksum VARCHAR(255),
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_case ON documents(my_case_id);
CREATE INDEX idx_documents_mime ON documents(mime_type);
CREATE INDEX idx_documents_category ON documents(document_category);

-- ============================================================
-- DOCUMENT VERSIONS
-- ============================================================
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    checksum VARCHAR(255),
    change_notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doc_versions_document ON document_versions(document_id);

-- ============================================================
-- DOCUMENT SHARES
-- ============================================================
CREATE TABLE document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with INTEGER REFERENCES users(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE,
    permission_level VARCHAR(20) DEFAULT 'view',
    expires_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doc_shares_document ON document_shares(document_id);
CREATE INDEX idx_doc_shares_token ON document_shares(share_token);

-- ============================================================
-- AI CONVERSATIONS
-- ============================================================
CREATE TABLE ai_conversations (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    my_case_id INTEGER REFERENCES my_cases(id) ON DELETE SET NULL,
    title VARCHAR(255),
    ai_provider VARCHAR(50) DEFAULT 'openai',
    ai_model VARCHAR(100),
    conversation_type VARCHAR(50) DEFAULT 'chat',
    system_prompt TEXT,
    context_documents JSONB DEFAULT '[]',
    token_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_case ON ai_conversations(my_case_id);

-- ============================================================
-- AI MESSAGES
-- ============================================================
CREATE TABLE ai_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    tokens_used INTEGER,
    model_used VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);

-- ============================================================
-- AI LOGS (Audit trail for AI usage)
-- ============================================================
CREATE TABLE ai_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES ai_conversations(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0,
    duration_ms INTEGER,
    endpoint VARCHAR(100),
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_logs_user ON ai_logs(user_id);
CREATE INDEX idx_ai_logs_provider ON ai_logs(provider);
CREATE INDEX idx_ai_logs_created ON ai_logs(created_at);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    favorite_type VARCHAR(50) NOT NULL,
    reference_id INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, favorite_type, reference_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_type ON favorites(favorite_type);

-- ============================================================
-- SAVED RULINGS (User's saved legal cases)
-- ============================================================
CREATE TABLE saved_rulings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legal_case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    notes TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, legal_case_id)
);

CREATE INDEX idx_saved_rulings_user ON saved_rulings(user_id);
CREATE INDEX idx_saved_rulings_case ON saved_rulings(legal_case_id);

-- ============================================================
-- CATEGORIES (For legal cases, documents, forum)
-- ============================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed categories
INSERT INTO categories (name, slug, description, sort_order) VALUES
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
CREATE TABLE forum_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    requires_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO forum_categories (name, slug, description, icon, sort_order) VALUES
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
CREATE TABLE forum_topics (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
    forum_category_id INTEGER NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_solved BOOLEAN DEFAULT FALSE,
    has_expert_answer BOOLEAN DEFAULT FALSE,
    tags JSONB DEFAULT '[]',
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    last_reply_at TIMESTAMP,
    last_reply_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_topics_category ON forum_topics(forum_category_id);
CREATE INDEX idx_forum_topics_user ON forum_topics(user_id);
CREATE INDEX idx_forum_topics_pinned ON forum_topics(is_pinned);

-- ============================================================
-- FORUM REPLIES
-- ============================================================
CREATE TABLE forum_replies (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_expert_answer BOOLEAN DEFAULT FALSE,
    is_best_answer BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    parent_id INTEGER REFERENCES forum_replies(id) ON DELETE CASCADE,
    helpful_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_replies_topic ON forum_replies(topic_id);
CREATE INDEX idx_forum_replies_user ON forum_replies(user_id);
CREATE INDEX idx_forum_replies_best ON forum_replies(is_best_answer);

-- ============================================================
-- JURIST PROFILES (För juristnätverket)
-- ============================================================
CREATE TABLE jurist_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(100),
    specialization JSONB DEFAULT '[]',
    years_of_experience INTEGER,
    law_firm VARCHAR(255),
    office_address TEXT,
    city VARCHAR(100),
    bio TEXT,
    education JSONB DEFAULT '[]',
    languages JSONB DEFAULT '["svenska"]',
    consultation_fee DECIMAL(10,2),
    free_consultation BOOLEAN DEFAULT FALSE,
    available_for_consultation BOOLEAN DEFAULT FALSE,
    average_rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    answer_count INTEGER DEFAULT 0,
    verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jurist_profiles_verified ON jurist_profiles(is_verified);
CREATE INDEX idx_jurist_profiles_specialization ON jurist_profiles USING gin(specialization);

-- ============================================================
-- JURIST VERIFICATIONS (Verification requests & audit)
-- ============================================================
CREATE TABLE jurist_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    license_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    identification_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    submitted_notes TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    expired_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jurist_verifications_user ON jurist_verifications(user_id);
CREATE INDEX idx_jurist_verifications_status ON jurist_verifications(status);

-- ============================================================
-- PETITIONS (Namninsamlingar)
-- ============================================================
CREATE TABLE petitions (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_authority VARCHAR(255),
    category VARCHAR(100),
    signature_goal INTEGER DEFAULT 100,
    signature_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    response_text TEXT,
    response_date TIMESTAMP,
    is_featured BOOLEAN DEFAULT FALSE,
    tags JSONB DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_petitions_user ON petitions(user_id);
CREATE INDEX idx_petitions_status ON petitions(status);
CREATE INDEX idx_petitions_category ON petitions(category);

-- ============================================================
-- PETITION SIGNATURES
-- ============================================================
CREATE TABLE petition_signatures (
    id SERIAL PRIMARY KEY,
    petition_id INTEGER NOT NULL REFERENCES petitions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    signer_name VARCHAR(200),
    signer_personal_number VARCHAR(13),
    signer_city VARCHAR(100),
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_bankid_verified BOOLEAN DEFAULT FALSE,
    bankid_session_id INTEGER REFERENCES bankid_sessions(id) ON DELETE SET NULL,
    signature_data TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(petition_id, user_id),
    UNIQUE(petition_id, signer_personal_number)
);

CREATE INDEX idx_petition_signatures_petition ON petition_signatures(petition_id);
CREATE INDEX idx_petition_signatures_user ON petition_signatures(user_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_my_cases_updated_at BEFORE UPDATE ON my_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_cases_updated_at BEFORE UPDATE ON legal_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appeal_cases_updated_at BEFORE UPDATE ON appeal_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON forum_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_petitions_updated_at BEFORE UPDATE ON petitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update forum reply count
CREATE OR REPLACE FUNCTION update_forum_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_topics
        SET reply_count = reply_count + 1,
            last_reply_at = CURRENT_TIMESTAMP,
            last_reply_user_id = NEW.user_id
        WHERE id = NEW.topic_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum_topics
        SET reply_count = reply_count - 1
        WHERE id = OLD.topic_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reply_count AFTER INSERT OR DELETE ON forum_replies
    FOR EACH ROW EXECUTE FUNCTION update_forum_reply_count();

-- Function to update petition signature count
CREATE OR REPLACE FUNCTION update_petition_signature_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE petitions
        SET signature_count = signature_count + 1
        WHERE id = NEW.petition_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE petitions
        SET signature_count = signature_count - 1
        WHERE id = OLD.petition_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_signature_count AFTER INSERT OR DELETE ON petition_signatures
    FOR EACH ROW EXECUTE FUNCTION update_petition_signature_count();

-- ============================================================
-- INDEXES FOR FULL-TEXT SEARCH
-- ============================================================

-- Full-text search on legal cases
ALTER TABLE legal_cases ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('swedish', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(full_text, ''))
    ) STORED;

CREATE INDEX idx_legal_cases_search ON legal_cases USING gin(search_vector);

-- Full-text search on forum topics
ALTER TABLE forum_topics ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('swedish', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) STORED;

CREATE INDEX idx_forum_topics_search ON forum_topics USING gin(search_vector);

-- Full-text search on documents
ALTER TABLE documents ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('swedish', coalesce(original_filename, '') || ' ' || coalesce(extracted_text, '') || ' ' || coalesce(description, ''))
    ) STORED;

CREATE INDEX idx_documents_search ON documents USING gin(search_vector);

-- ============================================================
-- NOTIFICATIONS TABLE (For future use)
-- ============================================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- ============================================================
-- SETTINGS TABLE (System-wide settings)
-- ============================================================
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
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
CREATE TABLE data_retention_policy (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    retention_days INTEGER NOT NULL,
    action VARCHAR(50) DEFAULT 'delete',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO data_retention_policy (entity_type, retention_days, action) VALUES
('audit_logs', 365, 'archive'),
('ai_logs', 180, 'delete'),
('sessions', 30, 'delete'),
('refresh_tokens', 90, 'delete'),
('notifications', 365, 'delete');

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Export completed: All tables, indexes, triggers, and seed data included.
-- Compatible with PostgreSQL and MySQL (with minor adjustments for MySQL)
-- For MySQL: Replace JSONB with JSON, replace GENERATED ALWAYS AS columns with triggers,
-- replace uuid-default with manual UUID generation
-- ============================================================