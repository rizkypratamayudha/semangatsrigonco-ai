-- Drop foreign key constraint on widgets.user_id
-- Because user_id stores Supabase Auth UUID, not Prisma cuid

ALTER TABLE widgets DROP CONSTRAINT IF EXISTS widgets_user_id_fkey;

-- Ensure columns have proper defaults
ALTER TABLE widgets ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE widgets ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE widgets ALTER COLUMN updated_at SET DEFAULT now();
