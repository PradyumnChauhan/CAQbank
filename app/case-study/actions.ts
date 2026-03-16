'use server'

import { getServiceSupabase } from '@/lib/server-utils'
import { cookies } from 'next/headers'

export type TableData = {
  table_name: string
  headers: string[]
  rows: string[][]
}

export type CaseStudy = {
  id: string
  subject_id: string
  case_number: number
  title: string
  context: string
  context_tables?: TableData[]
  difficulty_level: 'easy' | 'medium' | 'hard'
  estimated_time_minutes: number
  published: boolean
}

export type QuestionOption = {
  option_id: string
  option_text: string
}

export type CaseStudyQuestion = {
  id: string
  case_study_id: string
  question_number: number
  question_text: string
  options: QuestionOption[]
  correct_answer: string
  reasoning: string
}

export type CaseStudyDetail = CaseStudy & {
  questions?: CaseStudyQuestion[]
  tables?: Array<{
    table_name: string
    headers: string[]
    rows: string[][]
  }>
}

export type CaseAnswer = {
  case_study_question_id: string
  selected_option: string
  is_correct: boolean
}

export type CaseStudyProgress = {
  completedQuestion: number
  totalQuestions: number
  accuracy: number
  lastAttempt: string | null
  answers?: CaseAnswer[]
}

export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }

export type CaseDataInput = {
  case_scenario_number: number
  context: string
  tables?: TableData[]
  questions?: Array<{
    number: number
    text: string
    options: Array<{ letter: string; text: string }>
    correct_answer: string
    reason?: string
  }>
}

/**
 * Import case studies from JSON file data
 */
export async function importCaseStudiesAction(
  subjectId: string,
  casesData: CaseDataInput[]
): Promise<ActionResult<{ imported: number; total: number }>> {
  try {
    const supabase = getServiceSupabase()

    let importedCount = 0

    for (const caseData of casesData) {
      // Check if case study already exists
      const { data: existingCases, error: checkError } = await supabase
        .from('case_studies')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('case_number', caseData.case_scenario_number)
        .limit(1)

      let caseId: string

      if (existingCases && existingCases.length > 0) {
        // Case study already exists, use its ID
        caseId = existingCases[0].id
        // Delete existing questions for this case study to avoid conflicts
        await supabase
          .from('case_study_questions')
          .delete()
          .eq('case_study_id', caseId)
      } else {
        // Insert new case study
        const { data: caseStudy, error: caseError } = await supabase
          .from('case_studies')
          .insert({
            subject_id: subjectId,
            case_number: caseData.case_scenario_number,
            title: `Case Scenario ${caseData.case_scenario_number}`,
            context: caseData.context,
            context_tables: caseData.tables || [],
            difficulty_level: 'medium',
            estimated_time_minutes: 30,
            published: true,
          })
          .select('id')
          .single()

        if (caseError) {
          console.error(`[importCaseStudies] Error inserting case study:`, caseError)
          continue
        }

        caseId = caseStudy.id
      }

      // Insert questions
      const questions = caseData.questions || []

      for (const question of questions) {
        const { error: qError } = await supabase
          .from('case_study_questions')
          .insert({
            case_study_id: caseId,
            question_number: question.number,
            question_text: question.text,
            options_json: question.options.map((opt: { letter: string; text: string }) => ({
              id: opt.letter || opt.letter,
              text: opt.text,
            })),
            correct_answer: question.correct_answer,
            reason: question.reason || '',
          })

        if (qError) {
          console.error(`[importCaseStudies] Error inserting question:`, qError)
        }
      }

      importedCount++
    }

    return {
      success: true,
      data: {
        imported: importedCount,
        total: casesData.length,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[importCaseStudies] Exception:', err)
    return { success: false, error: message }
  }
}

/**
 * Get all case studies for a subject (or all if subjectId is 'all')
 */
export async function getCaseStudiesAction(
  subjectId: string
): Promise<ActionResult<CaseStudy[]>> {
  try {
    const supabase = getServiceSupabase()

    let query = supabase
      .from('case_studies')
      .select('*')
      .eq('published', true)
      .order('case_number', { ascending: true })

    if (subjectId !== 'all') {
      query = query.eq('subject_id', subjectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getCaseStudies] Error:', error)
      return { success: false, error: 'Failed to load case studies' }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[getCaseStudies] Exception:', err)
    return { success: false, error: message }
  }
}

/**
 * Get a specific case study with all its questions
 */
export async function getCaseStudyDetailAction(
  caseStudyId: string
): Promise<ActionResult<CaseStudyDetail>> {
  try {
    const supabase = getServiceSupabase()

    const { data: caseData, error: caseError } = await supabase
      .from('case_studies')
      .select('*')
      .eq('id', caseStudyId)
      .single()

    if (caseError || !caseData) {
      console.error('[getCaseStudyDetail] Case not found:', caseError)
      return { success: false, error: 'Case study not found' }
    }

    const { data: questionsData, error: questionsError } = await supabase
      .from('case_study_questions')
      .select('*')
      .eq('case_study_id', caseStudyId)
      .order('question_number', { ascending: true })

    if (questionsError) {
      console.error('[getCaseStudyDetail] Error loading questions:', questionsError)
      return { success: false, error: 'Failed to load questions' }
    }

    // Transform questions to match frontend expectations
    interface DBQuestion {
      id: string
      case_study_id: string
      question_number: number
      question_text: string
      options_json: Array<{ id?: string; letter?: string; text: string }>
      correct_answer: string
      reason: string
    }
    const questions: CaseStudyQuestion[] = (questionsData as DBQuestion[] || []).map(q => ({
      id: q.id,
      case_study_id: q.case_study_id,
      question_number: q.question_number,
      question_text: q.question_text,
      options: (q.options_json || []).map((opt: { id?: string; letter?: string; text: string }) => ({
        option_id: opt.id || opt.letter || '',
        option_text: opt.text,
      })),
      correct_answer: q.correct_answer,
      reasoning: q.reason,
    }))

    // Transform tables to match frontend expectations
    const tables = Array.isArray(caseData.context_tables) 
      ? caseData.context_tables.map((t: TableData) => ({
          table_name: t.table_name || '',
          headers: t.headers || [],
          rows: t.rows || [],
        }))
      : []

    return {
      success: true,
      data: {
        ...caseData,
        questions,
        tables,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[getCaseStudyDetail] Exception:', err)
    return { success: false, error: message }
  }
}

/**
 * Get the next case study for the same subject
 */
export async function getNextCaseStudyAction(
  currentCaseStudyId: string
): Promise<ActionResult<{ id: string } | null>> {
  try {
    const supabase = getServiceSupabase()

    // Get the current case study
    const { data: currentCase, error: currentError } = await supabase
      .from('case_studies')
      .select('subject_id, case_number')
      .eq('id', currentCaseStudyId)
      .single()

    if (currentError || !currentCase) {
      return { success: false, error: 'Current case study not found' }
    }

    // Get the next case study in the same subject
    const { data: nextCase, error: nextError } = await supabase
      .from('case_studies')
      .select('id')
      .eq('subject_id', currentCase.subject_id)
      .gt('case_number', currentCase.case_number)
      .order('case_number', { ascending: true })
      .limit(1)
      .single()

    if (nextError && nextError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('[getNextCaseStudy] Error:', nextError)
      return { success: false, error: 'Failed to load next case study' }
    }

    // Return null if no next case study (this is the last one)
    return { success: true, data: nextCase || null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[getNextCaseStudy] Exception:', err)
    return { success: false, error: message }
  }
}

/**
 * Submit answer for a case study question
 * Note: userId should be passed from the client (already authenticated there)
 */
export async function submitCaseAnswerAction(
  caseStudyId: string,
  questionId: string,
  selectedAnswer: string,
  userId?: string
): Promise<ActionResult<{ isCorrect: boolean; reasoning: string }>> {
  try {
    const supabase = getServiceSupabase()
    
    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get the question to check answer
    const { data: question, error: qError } = await supabase
      .from('case_study_questions')
      .select('correct_answer, reason')
      .eq('id', questionId)
      .single()

    if (qError || !question) {
      return { success: false, error: 'Question not found' }
    }

    const isCorrect = selectedAnswer.toLowerCase() === question.correct_answer.toLowerCase()

    // Record the attempt
    const { error: attemptError } = await supabase
      .from('case_study_attempts')
      .insert({
        student_id: userId,
        case_study_id: caseStudyId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
      })

    if (attemptError) {
      console.error('[submitCaseAnswer] Error recording attempt:', attemptError)
    }

    return {
      success: true,
      data: {
        isCorrect,
        reasoning: question.reason || '',
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[submitCaseAnswer] Exception:', err)
    return { success: false, error: message }
  }
}

/**
 * Get student progress on a case study
 * Note: userId should be passed from the client (already authenticated there)
 */
export async function getCaseStudyProgressAction(
  caseStudyId: string,
  userId?: string
): Promise<ActionResult<CaseStudyProgress>> {
  try {
    const supabase = getServiceSupabase()
    
    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get all attempts for this student on this case
    const { data: attempts, error } = await supabase
      .from('case_study_attempts')
      .select('*')
      .eq('student_id', userId)
      .eq('case_study_id', caseStudyId)

    if (error) {
      console.error('[getCaseStudyProgress] Error:', error)
      return { success: false, error: 'Failed to load progress' }
    }

    const attemptsList = attempts || []
    const correctCount = attemptsList.filter(a => a.is_correct).length
    const accuracy = attemptsList.length > 0 ? Math.round((correctCount / attemptsList.length) * 100) : 0
    
    // Get total questions in this case
    const { data: caseStudy, error: csError } = await supabase
      .from('case_studies')
      .select('id')
      .eq('id', caseStudyId)
      .single()

    if (csError) {
      return { success: false, error: 'Case not found' }
    }

    const { data: questions, error: qError } = await supabase
      .from('case_study_questions')
      .select('id')
      .eq('case_study_id', caseStudyId)

    if (qError) {
      console.error('[getCaseStudyProgress] Error getting questions:', qError)
      return { success: false, error: 'Failed to load questions' }
    }

    const totalQuestions = questions?.length || 0
    const completedQuestions = new Set(attemptsList.map(a => a.question_id)).size

    // Transform attempts for client
    const answers: CaseAnswer[] = attemptsList
      .reduce((acc: CaseAnswer[], attempt) => {
        const existing = acc.find(a => a.case_study_question_id === attempt.question_id)
        if (!existing) {
          acc.push({
            case_study_question_id: attempt.question_id,
            selected_option: attempt.selected_answer,
            is_correct: attempt.is_correct,
          })
        }
        return acc
      }, [])

    return {
      success: true,
      data: {
        completedQuestion: completedQuestions,
        totalQuestions,
        accuracy,
        lastAttempt: attemptsList.length > 0 ? attemptsList[attemptsList.length - 1].created_at : null,
        answers,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[getCaseStudyProgress] Exception:', err)
    return { success: false, error: message }
  }
}

/**
 * Delete case study (admin only)
 */
export async function deleteCaseStudyAction(caseStudyId: string): Promise<ActionResult<null>> {
  try {
    const supabase = getServiceSupabase()

    const { error } = await supabase
      .from('case_studies')
      .delete()
      .eq('id', caseStudyId)

    if (error) {
      console.error('[deleteCaseStudy] Error:', error)
      return { success: false, error: 'Failed to delete case study' }
    }

    return { success: true, data: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[deleteCaseStudy] Exception:', err)
    return { success: false, error: message }
  }
}
