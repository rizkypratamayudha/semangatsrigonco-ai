-- Enable Row Level Security untuk semua tabel
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Policies untuk tabel USERS
-- =============================================

-- User hanya bisa melihat profil sendiri
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::uuid = id::uuid);

-- User bisa update profil sendiri
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::uuid = id::uuid);

-- User bisa insert profil sendiri (saat register)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::uuid = id::uuid);

-- =============================================
-- Policies untuk tabel WIDGETS
-- =============================================

-- User bisa melihat widget sendiri
CREATE POLICY "Users can view own widgets" ON widgets
  FOR SELECT USING (auth.uid()::uuid = user_id::uuid);

-- User bisa membuat widget baru
CREATE POLICY "Users can create own widgets" ON widgets
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id::uuid);

-- User bisa update widget sendiri
CREATE POLICY "Users can update own widgets" ON widgets
  FOR UPDATE USING (auth.uid()::uuid = user_id::uuid);

-- User bisa hapus widget sendiri
CREATE POLICY "Users can delete own widgets" ON widgets
  FOR DELETE USING (auth.uid()::uuid = user_id::uuid);

-- Public bisa membaca semua widget (untuk embed)
CREATE POLICY "Public can read widgets" ON widgets
  FOR SELECT USING (true);
