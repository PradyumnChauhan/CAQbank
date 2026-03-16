-- CA QBank Database Schema (Updated for Dynamic Subjects & Multiple Question Types)
-- Run this SQL in your Supabase SQL Editor

-- Cleanup old tables if they exist (from old schema)
DROP TABLE IF EXISTS student_answers CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS case_studies CASCADE;

-- Table: Users (Managed by Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'student', 'superadmin')) NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  subscription_status TEXT CHECK(subscription_status IN ('active', 'inactive')) DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Subjects (Dynamic - Admin Creates)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,             -- 'tax', 'accounts', 'auditing', etc.
  name TEXT NOT NULL,                    -- 'Income Tax', 'Advanced Accounting', etc.
  description TEXT,
  icon TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Questions (Supports multiple types: mcq, case_scenario, case_scenario_mcq)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  q_id TEXT NOT NULL,                    -- e.g., Q1, Q2, Q3
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  q_type TEXT NOT NULL CHECK (q_type IN (
    'mcq',
    'descriptive',
    'case_scenario',
    'case_scenario_mcq',
    'independent_mcq',
    'caselet_mcq'
  )),
  paper TEXT,                            -- Paper name from JSON
  part TEXT,                             -- Part/section from JSON
  section TEXT,                          -- Sub-section
  title TEXT NOT NULL,
  text TEXT,                             -- Question text with options inline
  case_scenario TEXT,                    -- Case scenario context (if applicable)
  options_json JSONB NOT NULL,           -- Array of option strings
  sub_questions_json JSONB DEFAULT '[]'::jsonb, -- Array of {label, text, options}
  tables_json JSONB DEFAULT '[]'::jsonb, -- Array of {title, headers, rows}
  source_file TEXT,
  source_num INTEGER,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, q_id)
);

-- Table: Student Attempts (Track individual question attempts)
CREATE TABLE IF NOT EXISTS student_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer TEXT,                  -- Selected option or answer
  is_correct BOOLEAN,
  time_spent INTEGER,                    -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, question_id, created_at)
);

-- Table: Student Progress Summary
CREATE TABLE IF NOT EXISTS student_progress (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_attempted INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_pct DECIMAL(5,2) DEFAULT 0,
  last_attempted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, subject_id)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(q_type);
CREATE INDEX IF NOT EXISTS idx_questions_subject_type_published ON questions(subject_id, q_type, published);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_question ON student_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id);

-- Row Level Security (RLS) Policies

-- Helper functions for role checks (SECURITY DEFINER avoids recursive RLS evaluation)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'superadmin'
  );
$$;

-- Trigger: Auto-create user row when someone signs up
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

-- Create trigger on auth.users to auto-create public.users row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Users Table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Superadmin can manage all users" ON users;

CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (id = auth.uid() OR public.is_admin_user());

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Superadmin can manage all users"
  ON users FOR ALL
  USING (public.is_superadmin_user());

-- User Profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;

CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can create subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can update subjects" ON subjects;

CREATE POLICY "Anyone can read subjects"
  ON subjects FOR SELECT
  USING (true);

CREATE POLICY "Admins can create subjects"
  ON subjects FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update subjects"
  ON subjects FOR UPDATE
  USING (public.is_admin_user());

-- Questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;

CREATE POLICY "Anyone can read published questions"
  ON questions FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Student Attempts
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read their own attempts" ON student_attempts;
DROP POLICY IF EXISTS "Admins can read all attempts" ON student_attempts;
DROP POLICY IF EXISTS "Students can create attempts" ON student_attempts;

CREATE POLICY "Students can read their own attempts"
  ON student_attempts FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can read all attempts"
  ON student_attempts FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Students can create attempts"
  ON student_attempts FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Student Progress
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read their own progress" ON student_progress;
DROP POLICY IF EXISTS "Students can insert their own progress" ON student_progress;
DROP POLICY IF EXISTS "Students can update their own progress" ON student_progress;

CREATE POLICY "Students can read their own progress"
  ON student_progress FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own progress"
  ON student_progress FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own progress"
  ON student_progress FOR UPDATE
  USING (student_id = auth.uid());
