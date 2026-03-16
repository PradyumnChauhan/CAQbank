export type UserRole = 'admin' | 'student' | 'superadmin'

export interface User {
  id: string
  email: string
  role: UserRole
  full_name: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  user_id: string
  subscription_status: 'active' | 'inactive'
  avatar_url?: string
  created_at: string
}

export interface Subject {
  id: string
  code: string
  name: string
  description: string
  icon?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TableData {
  id: string
  case_study_id: string
  title: string
  headers_json: string[] // JSON array as string
  rows_json: string[][] // JSON 2D array as string
  created_at: string
}

export interface Question {
  id: string
  case_study_id: string
  question_no: number
  text: string
  options_json: string // JSON array of options
  correct_answer_letter: string
  reason: string
  created_at: string
}

export interface CaseStudy {
  id: string
  subject_id: string
  case_no: number
  context: string
  tables?: TableData[]
  questions?: Question[]
  created_by: string
  published: boolean
  created_at: string
  updated_at: string
}

export interface StudentAttempt {
  id: string
  student_id: string
  case_study_id: string
  score: number
  total_questions: number
  time_spent: number // in seconds
  created_at: string
}

export interface StudentAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_answer: string
  is_correct: boolean
  time_taken: number // in seconds
  created_at: string
}

export interface StudentProgress {
  student_id: string
  subject_id: string
  total_attempted: number
  correct_count: number
  accuracy_pct: number
  last_attempted_at: string
  created_at: string
  updated_at: string
}
