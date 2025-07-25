-- Database schema for penzi
-- Users table 
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    county VARCHAR(100) NOT NULL,
    town VARCHAR(100) NOT NULL,
    -- Additional details 
    level_of_education VARCHAR(100),
    profession VARCHAR(100),
    marital_status VARCHAR(50),
    religion VARCHAR(100),
    ethnicity VARCHAR(100),
    self_description TEXT,
    -- Registration tracking
    registration_stage VARCHAR(30) DEFAULT 'initial' CHECK (
        registration_stage IN ('initial', 'details_pending', 'description_pending', 'completed')
    ),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match search requests
CREATE TABLE match_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    age_min INTEGER NOT NULL,
    age_max INTEGER NOT NULL,
    preferred_town VARCHAR(100) NOT NULL,
    total_matches_found INTEGER DEFAULT 0,
    current_position INTEGER DEFAULT 0, -- For NEXT command
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual match results
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES match_requests(id) ON DELETE CASCADE,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    matched_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, -- For pagination (1st, 2nd, 3rd match)
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track when users request details about each other
CREATE TABLE user_interests (
    id SERIAL PRIMARY KEY,
    interested_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interest_type VARCHAR(20) DEFAULT 'details' CHECK (interest_type IN ('details', 'describe')),
    -- Target user notification and response
    notification_sent BOOLEAN DEFAULT false, -- "Hi Maria, Jamal is interested..."
    response_received BOOLEAN DEFAULT false,
    response VARCHAR(10) CHECK (response IN ('YES', 'NO', NULL)),
    response_at TIMESTAMP,
    -- Feedback to requester
    feedback_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- All SMS messages in the system
CREATE TABLE sms_messages (
    id SERIAL PRIMARY KEY,
    from_phone VARCHAR(15),
    to_phone VARCHAR(15) NOT NULL,
    message_body TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    message_type VARCHAR(50), -- 'activation', 'registration', 'match_request', 'interest', etc.
    status VARCHAR(20) DEFAULT 'processed' CHECK (status IN ('pending', 'processed', 'sent', 'failed')),
    related_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User photos table
CREATE TABLE user_photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    upload_order INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin settings table
CREATE TABLE admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Chat messages table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Payment transactions table
CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    checkout_request_id VARCHAR(100),
    mpesa_receipt_number VARCHAR(100),
    phone_number VARCHAR(15) NOT NULL,
    amount FLOAT NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('MATCH_FEE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'SUPER_LIKE', 'BOOST')),
    payment_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED')),
    description VARCHAR(255),
    target_user_id INTEGER REFERENCES users(id),
    match_id INTEGER REFERENCES matches(id),
    mpesa_response TEXT,
    callback_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- INDEXES for performance optimization
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_location ON users(county, town, gender);
CREATE INDEX idx_users_age_gender ON users(age, gender, is_active);
CREATE INDEX idx_match_requests_user ON match_requests(user_id, status);
CREATE INDEX idx_matches_request ON matches(request_id, position);
CREATE INDEX idx_user_interests_target ON user_interests(target_user_id, notification_sent);
CREATE INDEX idx_sms_messages_phone ON sms_messages(to_phone, from_phone);

-- Additional indexes for new tables
CREATE INDEX idx_user_photos_user ON user_photos(user_id, is_deleted);
CREATE INDEX idx_user_photos_primary ON user_photos(user_id, is_primary);
CREATE INDEX idx_chat_messages_match ON chat_messages(match_id, created_at);
CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id, payment_status);