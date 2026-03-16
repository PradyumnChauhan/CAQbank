-- Fix public.users table - manually insert entries for existing auth.users

-- Delete the empty/malformed entry if it exists
DELETE FROM public.users WHERE full_name IS NULL OR full_name = '';

-- Insert proper entries for your 2 auth users with CORRECT UUIDs from auth.users table
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
VALUES 
  ('563aad50-50e4-4f74-ab74-776b991bb71a', 'pradyumnch12@gmail.com', 'Pradyumn', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9207cfb1-eea5-4228-9c15-59b7660e8ef3', 'sarojaniparmar64@gmail.com', 'Sarojani', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = 'admin',
  updated_at = CURRENT_TIMESTAMP;

-- Verify the fix
SELECT id, email, full_name, role FROM public.users;
