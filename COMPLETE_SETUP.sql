-- ============================================================
-- COMPLETE CA QBank Database Setup for Supabase
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ============================================================

-- Step 1: Create Tables
-- ============================================================

-- Table: Users (Managed by Supabase Auth)
-- NOTE: Email uniqueness is enforced by auth.users, not here
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'student', 'superadmin')) NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_status TEXT CHECK(subscription_status IN ('active', 'inactive')) DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Subjects (Dynamic - Admin Creates)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Questions (Supports multiple types)
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  q_id TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  q_type TEXT NOT NULL CHECK (q_type IN (
    'mcq',
    'descriptive',
    'case_scenario',
    'case_scenario_mcq',
    'independent_mcq',
    'caselet_mcq'
  )),
  paper TEXT,
  part TEXT,
  section TEXT,
  title TEXT NOT NULL,
  text TEXT,
  case_scenario TEXT,
  options_json JSONB NOT NULL,
  sub_questions_json JSONB DEFAULT '[]'::jsonb,
  tables_json JSONB DEFAULT '[]'::jsonb,
  source_file TEXT,
  source_num INTEGER,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, q_id)
);

-- Table: Student Attempts
CREATE TABLE IF NOT EXISTS public.student_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer TEXT,
  is_correct BOOLEAN,
  time_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, question_id, created_at)
);

-- Table: Student Progress
CREATE TABLE IF NOT EXISTS public.student_progress (
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  total_attempted INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_pct DECIMAL(5,2) DEFAULT 0,
  last_attempted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, subject_id)
);

-- Step 2: Create Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(q_type);
CREATE INDEX IF NOT EXISTS idx_questions_subject_type_published ON public.questions(subject_id, q_type, published);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON public.student_attempts(student_id);

-- Step 3: Create Trigger Function (FIXED for Supabase)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Step 4: Create Trigger
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Enable Row Level Security
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies for Users Table
-- ============================================================
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
CREATE POLICY "Users can read their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin' OR role = 'superadmin')
  );

DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
CREATE POLICY "Service role can insert users" ON public.users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Superadmin can manage all users" ON public.users;
CREATE POLICY "Superadmin can manage all users" ON public.users
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin')
  );

-- Step 7: Create RLS Policies for User Profiles
-- ============================================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage profiles" ON public.user_profiles;
CREATE POLICY "Service role can manage profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 8: Questions RLS (Public read, admin/creator write)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read published questions" ON public.questions;
CREATE POLICY "Anyone can read published questions" ON public.questions
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Admins can read all questions" ON public.questions;
CREATE POLICY "Admins can read all questions" ON public.questions
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin' OR role = 'superadmin')
  );

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin' OR role = 'superadmin')
  );

-- Step 9: Student Attempts RLS
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.student_attempts;
CREATE POLICY "Users can insert own attempts" ON public.student_attempts
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can read own attempts" ON public.student_attempts;
CREATE POLICY "Users can read own attempts" ON public.student_attempts
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins can read all attempts" ON public.student_attempts;
CREATE POLICY "Admins can read all attempts" ON public.student_attempts
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin' OR role = 'superadmin')
  );

-- Step 10: Student Progress RLS
-- ============================================================
DROP POLICY IF EXISTS "Users can read own progress" ON public.student_progress;
CREATE POLICY "Users can read own progress" ON public.student_progress
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Service role can insert progress" ON public.student_progress;
CREATE POLICY "Service role can insert progress" ON public.student_progress
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update progress" ON public.student_progress;
CREATE POLICY "Service role can update progress" ON public.student_progress
  FOR UPDATE WITH CHECK (true);

-- ============================================================
-- SETUP COMPLETE
-- ============================================================
-- Tables created: users, user_profiles, subjects, questions, student_attempts, student_progress
-- Trigger fixed to use raw_user_meta_data (Supabase standard)
-- RLS policies configured for all tables
-- Ready for signup!
