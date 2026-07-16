-- =============================================
-- FIX: Update column types to match Supabase Auth UUID
-- =============================================

-- Drop views that depend on columns being altered
DROP VIEW IF EXISTS widget_conversation_stats CASCADE;
DROP VIEW IF EXISTS daily_conversation_stats CASCADE;
DROP VIEW IF EXISTS user_message_stats CASCADE;

-- Fix conversations table
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_widget_id_fkey;
ALTER TABLE conversations ALTER COLUMN widget_id TYPE TEXT;
ALTER TABLE conversations ALTER COLUMN user_id TYPE TEXT;

-- Fix user_settings table
ALTER TABLE user_settings ALTER COLUMN user_id TYPE TEXT;

-- Recreate views
CREATE OR REPLACE VIEW widget_conversation_stats AS
SELECT
  widget_id,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
  COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations,
  AVG(message_count) as avg_messages_per_conversation,
  MIN(created_at) as first_conversation,
  MAX(created_at) as last_conversation
FROM conversations
GROUP BY widget_id;

CREATE OR REPLACE VIEW daily_conversation_stats AS
SELECT
  user_id,
  DATE(created_at) as date,
  COUNT(*) as total_conversations,
  SUM(message_count) as total_messages
FROM conversations
GROUP BY user_id, DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW user_message_stats AS
SELECT
  c.user_id,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_messages
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.user_id;

-- Fix RLS policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Public can create conversations" ON conversations;
DROP POLICY IF EXISTS "Public can update conversations" ON conversations;

CREATE POLICY "Authenticated users can view conversations" ON conversations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update conversations" ON conversations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete conversations" ON conversations FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Public can insert messages" ON messages;
DROP POLICY IF EXISTS "Public can view messages" ON messages;

CREATE POLICY "Authenticated users can view messages" ON messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert messages" ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

CREATE POLICY "Authenticated users can view settings" ON user_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert settings" ON user_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update settings" ON user_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- Add helper function
CREATE OR REPLACE FUNCTION increment_message_count(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE conversations SET message_count = message_count + 1 WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
