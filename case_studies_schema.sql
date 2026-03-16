-- Case Studies Schema Extension
-- Run this SQL in your Supabase SQL Editor to add case study support

-- Table: Case Studies
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  case_number INTEGER NOT NULL,                    -- Case scenario number (1, 2, 3, etc.)
  title TEXT NOT NULL,                             -- Auto-generated or custom title
  context TEXT NOT NULL,                           -- Case scenario context/story
  context_tables JSONB DEFAULT '[]'::jsonb,        -- Array of {title, headers, rows}
  difficulty_level TEXT CHECK(difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  estimated_time_minutes INTEGER DEFAULT 30,
  published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  imported_from TEXT,                              -- Source file name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, case_number)
);

-- Table: Case Study Questions
CREATE TABLE IF NOT EXISTS case_study_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_study_id UUID NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,                -- Q1, Q2, Q3, etc.
  question_text TEXT NOT NULL,
  options_json JSONB NOT NULL,                     -- Array of {letter, text}
  correct_answer TEXT NOT NULL,                    -- The correct option letter (a, b, c, d)
  correct_answer_text TEXT,                        -- Full text of correct answer
  reason TEXT,                                      -- Explanation for answer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(case_study_id, question_number)
);

-- Table: Case Study Attempts (Student solving)
CREATE TABLE IF NOT EXISTS case_study_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_study_id UUID NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES case_study_questions(id) ON DELETE CASCADE,
  selected_answer TEXT,                            -- Selected option letter (a, b, c, d)
  is_correct BOOLEAN,
  time_spent_seconds INTEGER DEFAULT 0,          -- Time spent on this question
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, case_study_id, question_id, created_at)
);

-- Table: Case Study Progress (Summary)
CREATE TABLE IF NOT EXISTS case_study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_study_id UUID NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  total_questions INTEGER,
  attempted_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_pct DECIMAL(5,2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, case_study_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_case_studies_subject ON case_studies(subject_id);
CREATE INDEX IF NOT EXISTS idx_case_studies_published ON case_studies(published);
CREATE INDEX IF NOT EXISTS idx_case_study_questions_case ON case_study_questions(case_study_id);
CREATE INDEX IF NOT EXISTS idx_case_study_attempts_student ON case_study_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_case_study_attempts_case ON case_study_attempts(case_study_id);
CREATE INDEX IF NOT EXISTS idx_case_study_progress_student ON case_study_progress(student_id);

-- Enable RLS (Row Level Security)
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_study_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_study_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_study_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow admins to manage case studies
CREATE POLICY "Admins can manage case studies" ON case_studies
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'superadmin')
    )
  );

-- Allow students to view published case studies
CREATE POLICY "Students can view published case studies" ON case_studies
  FOR SELECT USING (published = true OR created_by = auth.uid());

-- Allow students to view case study questions
CREATE POLICY "Students can view case study questions" ON case_study_questions
  FOR SELECT USING (
    case_study_id IN (
      SELECT id FROM case_studies WHERE published = true
    )
  );

-- Allow students to create their own attempts
CREATE POLICY "Students can create own attempts" ON case_study_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Allow students to view own attempts
CREATE POLICY "Students can view own attempts" ON case_study_attempts
  FOR SELECT USING (student_id = auth.uid());

-- Allow students to view and create own progress
CREATE POLICY "Students can manage own progress" ON case_study_progress
  FOR ALL USING (student_id = auth.uid());
