-- Add missing notification_sent_at column to user_interests table
ALTER TABLE user_interests ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP;

-- Add missing columns that might be referenced
ALTER TABLE user_interests ADD COLUMN IF NOT EXISTS expired_notification_sent BOOLEAN DEFAULT false;
ALTER TABLE user_interests ADD COLUMN IF NOT EXISTS payment_transaction_id INTEGER REFERENCES payment_transactions(id);

-- Update existing records to have notification_sent_at when notification_sent is true
UPDATE user_interests 
SET notification_sent_at = created_at 
WHERE notification_sent = true AND notification_sent_at IS NULL;