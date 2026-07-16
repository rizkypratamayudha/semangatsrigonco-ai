-- =============================================
-- ANALYTICS & CONVERSATIONS SCHEMA
-- =============================================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_id UUID NOT NULL,
  user_id UUID NOT NULL,
  visitor_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  chat_notifications BOOLEAN DEFAULT true,
  weekly_report BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'id',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_widget_id ON conversations(widget_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Public can create conversations (for widget visitors)
CREATE POLICY "Public can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update conversations"
  ON conversations FOR UPDATE
  USING (true);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Public can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view messages"
  ON messages FOR SELECT
  USING (true);

-- User settings policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- =============================================
-- ANALYTICS VIEWS (for dashboard)
-- =============================================

-- View: Total conversations per widget
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

-- View: Daily conversation stats
CREATE OR REPLACE VIEW daily_conversation_stats AS
SELECT
  user_id,
  DATE(created_at) as date,
  COUNT(*) as total_conversations,
  SUM(message_count) as total_messages
FROM conversations
GROUP BY user_id, DATE(created_at)
ORDER BY date DESC;

-- View: Total messages per user
CREATE OR REPLACE VIEW user_message_stats AS
SELECT
  c.user_id,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_messages
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.user_id;
