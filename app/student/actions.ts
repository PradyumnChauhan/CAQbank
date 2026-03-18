'use server'

import { getServiceSupabase } from '@/lib/server-utils'

export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }

type SubjectWithCount = {
  id: string
  name: string
  description: string | null
  questionCount: number
}

/**
 * Load all subjects with count of published questions (server-side)
 * No auth required - public data
 */
export async function loadStudentSubjectsAction(): Promise<ActionResult<SubjectWithCount[]>> {
  try {
    const supabase = getServiceSupabase()

    // Fetch all subjects
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, description')
      .order('name', { ascending: true })

    if (subjectsError) {
      console.error('[loadStudentSubjects] Error fetching subjects:', subjectsError)
      return { success: false, error: 'Failed to load subjects' }
    }

    if (!subjects || subjects.length === 0) {
      return { success: true, data: [] }
    }

    // For each subject, get count of published questions
    const enriched = await Promise.all(
      subjects.map(async (subject) => {
        const { count, error: countError } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('subject_id', subject.id)
          .eq('published', true)

        if (countError) {
          console.error(`[loadStudentSubjects] Error counting questions for ${subject.id}:`, countError)
        }

        return {
          ...subject,
          questionCount: count || 0,
        }
      })
    )

    return { success: true, data: enriched }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[loadStudentSubjects] Exception:', err)
    return { success: false, error: message }
  }
}

type SubjectDetail = {
  id: string
  name: string
  description: string | null
}

type QuestionTypeCount = {
  q_type: string
  count: number
}

type SubjectDetailData = {
  subject: SubjectDetail
  typesCounts: QuestionTypeCount[]
}

/**
 * Load subject detail with question type counts (server-side)
 */
export async function loadStudentSubjectDetailAction(
  subjectId: string
): Promise<ActionResult<SubjectDetailData>> {
  try {
    const supabase = getServiceSupabase()

    // Fetch subject
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, description')
      .eq('id', subjectId)
      .single()

    if (subjectError || !subject) {
      console.error('[loadStudentSubjectDetail] Subject not found:', subjectError)
      return { success: false, error: 'Subject not found' }
    }

    // Fetch all published questions for this subject
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('q_type')
      .eq('subject_id', subjectId)
      .eq('published', true)

    if (questionsError) {
      console.error('[loadStudentSubjectDetail] Error fetching questions:', questionsError)
      return { success: false, error: 'Failed to load questions' }
    }

    // Count questions by type
    const typeCounts = (questions || []).reduce<Record<string, number>>((acc, q) => {
      acc[q.q_type] = (acc[q.q_type] || 0) + 1
      return acc
    }, {})

    const typesCounts = Object.entries(typeCounts).map(([q_type, count]) => ({
      q_type,
      count,
    }))

    return {
      success: true,
      data: {
        subject,
        typesCounts,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[loadStudentSubjectDetail] Exception:', err)
    return { success: false, error: message }
  }
}

type Question = {
  id: string
  title: string
  text: string | null
  q_type: string
  options_json: (string | { label: string; text: string })[] | null
  case_scenario: string | null
  sub_questions_json: Array<{ label: string; text: string; options: string[] }> | null
  tables_json: Array<{ title: string; headers: string[]; rows: string[][] }> | null
}

type QuestionsData = {
  subject: {
    id: string
    name: string
  }
  questions: Question[]
}

function normalizeOptions(options: unknown): string[] {
  console.log('[normalizeOptions] Input:', JSON.stringify(options))
  
  if (Array.isArray(options)) {
    const result = options
      .map((item, idx) => {
        console.log(`[normalizeOptions] Item ${idx}:`, JSON.stringify(item), 'Type:', typeof item)
        
        // Handle string format
        if (typeof item === 'string') {
          const trimmed = item.trim()
          console.log(`[normalizeOptions] String item ${idx}: "${trimmed}"`)
          return trimmed
        }
        
        // Handle object format { label: string; text: string }
        if (typeof item === 'object' && item !== null && 'text' in item) {
          const itemObj = item as Record<string, unknown>
          const text = String(itemObj.text).trim()
          console.log(`[normalizeOptions] Object item ${idx}: "${text}"`)
          return text
        }
        
        console.log(`[normalizeOptions] Item ${idx} skipped - no match`)
        return null
      })
      .filter((item) => item !== null) as string[]
    
    console.log('[normalizeOptions] Final result:', JSON.stringify(result))
    return result
  }
  
  console.log('[normalizeOptions] Input is not an array, returning []')
  return []
}

/**
 * Load questions for a specific subject and question type (server-side)
 */
export async function loadStudentQuestionsAction(
  subjectId: string,
  qType: string
): Promise<ActionResult<QuestionsData>> {
  try {
    const supabase = getServiceSupabase()

    // Fetch subject
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('id', subjectId)
      .single()

    if (subjectError || !subject) {
      console.error('[loadStudentQuestions] Subject not found:', subjectError)
      return { success: false, error: 'Subject not found' }
    }

    // Fetch published questions for this subject and type
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, title, text, q_type, options_json, case_scenario, sub_questions_json, tables_json')
      .eq('subject_id', subjectId)
      .eq('q_type', qType)
      .eq('published', true)
      .order('created_at', { ascending: true })

    if (questionsError) {
      console.error('[loadStudentQuestions] Error fetching questions:', questionsError)
      return { success: false, error: 'Failed to load questions' }
    }

    // Normalize options
    const normalized = (questions || []).map((item, idx) => {
      console.log(`[loadStudentQuestions] Question ${idx}:`, {
        id: item.id,
        title: item.title,
        q_type: item.q_type,
        options_json_raw: JSON.stringify(item.options_json),
        options_json_type: typeof item.options_json,
        options_json_isArray: Array.isArray(item.options_json),
      })
      
      const normalized_opts = normalizeOptions(item.options_json)
      
      console.log(`[loadStudentQuestions] Question ${idx} normalized:`, {
        id: item.id,
        optionsCount: normalized_opts.length,
        options: JSON.stringify(normalized_opts),
      })
      
      return {
        ...item,
        options_json: normalized_opts,
      }
    })

    console.log('[loadStudentQuestions] Success:', {
      subjectId,
      qType,
      questionsCount: normalized.length,
    })

    return {
      success: true,
      data: {
        subject,
        questions: normalized,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[loadStudentQuestions] Exception:', err)
    return { success: false, error: message }
  }
}

type BookmarkedQuestion = {
  id: string
  title: string
  text: string | null
  q_type: string
  subject_id: string
}

/**
 * Load bookmarked questions by ID (server-side)
 */
export async function loadBookmarkedQuestionsAction(
  questionIds: string[]
): Promise<ActionResult<BookmarkedQuestion[]>> {
  try {
    if (!questionIds || questionIds.length === 0) {
      return { success: true, data: [] }
    }

    const supabase = getServiceSupabase()

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, title, text, q_type, subject_id')
      .in('id', questionIds)

    if (questionsError) {
      console.error('[loadBookmarkedQuestions] Error fetching questions:', questionsError)
      return { success: false, error: 'Failed to load bookmarks' }
    }

    return { success: true, data: questions || [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[loadBookmarkedQuestions] Exception:', err)
    return { success: false, error: message }
  }
}
