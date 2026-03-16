'use server'

import { createClient } from '@supabase/supabase-js'
import {
  getServiceSupabase,
  validateAdminRole,
  normalizeAndValidateJSON,
  getUserRole,
} from '@/lib/server-utils'

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Load all subjects with question counts
 */
export async function loadSubjectsAction(): Promise<
  ActionResult<
    Array<{
      id: string
      code: string
      name: string
      description: string | null
      questionCount: number
    }>
  >
> {
  try {
    const supabase = getServiceSupabase()

    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, code, name, description')
      .order('name', { ascending: true })

    if (subjectsError) throw subjectsError

    if (!subjects || subjects.length === 0) {
      return { success: true, data: [] }
    }

    // Get question counts for each subject
    const withCounts = await Promise.all(
      subjects.map(async (subject) => {
        const { count, error: countError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subject.id)

        if (countError) {
          console.warn(`[loadSubjects] Count error for ${subject.id}:`, countError)
          return { ...subject, questionCount: 0 }
        }

        return { ...subject, questionCount: count || 0 }
      })
    )

    return { success: true, data: withCounts }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load subjects'
    console.error('[loadSubjectsAction] Error:', err)
    return { success: false, error: message }
  }
}

/**
 * Create a new subject
 */
export async function createSubjectAction(
  userId: string,
  name: string,
  code: string,
  description?: string
): Promise<ActionResult<{ id: string; name: string; code: string; description: string | null }>> {
  try {
    // Validate admin role
    const isAdmin = await validateAdminRole(userId)
    if (!isAdmin) {
      return { success: false, error: 'Only admins can create subjects' }
    }

    // Validate inputs
    if (!name.trim() || !code.trim()) {
      return { success: false, error: 'Name and code are required' }
    }

    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('subjects')
      .insert([
        {
          name: name.trim(),
          code: code.trim().toLowerCase().replaceAll(' ', '_'),
          description: description?.trim() || null,
          created_by: userId,
        },
      ])
      .select('id, name, code, description')
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create subject'
    console.error('[createSubjectAction] Error:', err)
    return { success: false, error: message }
  }
}

/**
 * Delete a subject
 */
export async function deleteSubjectAction(
  userId: string,
  subjectId: string
): Promise<ActionResult<null>> {
  try {
    const isAdmin = await validateAdminRole(userId)
    if (!isAdmin) {
      return { success: false, error: 'Only admins can delete subjects' }
    }

    const supabase = getServiceSupabase()

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)

    if (error) throw error

    return { success: true, data: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete subject'
    console.error('[deleteSubjectAction] Error:', err)
    return { success: false, error: message }
  }
}

/**
 * Bulk upload questions from JSON
 */
export async function bulkUploadQuestionsAction(
  userId: string,
  subjectId: string,
  jsonString: string,
  replaceExisting: boolean = true
): Promise<ActionResult<{ uploadedCount: number; invalidCount: number }>> {
  try {
    const isAdmin = await validateAdminRole(userId)
    if (!isAdmin) {
      return { success: false, error: 'Only admins can upload questions' }
    }

    if (!subjectId) {
      return { success: false, error: 'Subject ID required' }
    }

    // Parse and normalize JSON
    const { valid, invalidCount } = await normalizeAndValidateJSON(jsonString)

    if (valid.length === 0) {
      return { success: false, error: 'No valid questions found in JSON' }
    }

    const supabase = getServiceSupabase()

    // Optionally delete existing questions
    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('subject_id', subjectId)

      if (deleteError) throw deleteError
    }

    // Insert questions in chunks
    const rows = valid.map((item) => ({
      ...item,
      subject_id: subjectId,
      created_by: userId,
    }))

    const chunkSize = 200
    for (let start = 0; start < rows.length; start += chunkSize) {
      const chunk = rows.slice(start, start + chunkSize)
      const { error: insertError } = await supabase.from('questions').insert(chunk)

      if (insertError) {
        console.error('[bulkUploadQuestionsAction] Chunk insert error:', insertError)
        throw insertError
      }
    }

    return {
      success: true,
      data: { uploadedCount: valid.length, invalidCount },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload questions'
    console.error('[bulkUploadQuestionsAction] Error:', err)
    return { success: false, error: message }
  }
}

/**
 * Export subject questions as JSON
 */
export async function exportSubjectAction(
  userId: string,
  subjectId: string
): Promise<ActionResult<Array<Record<string, unknown>>>> {
  try {
    const isAdmin = await validateAdminRole(userId)
    if (!isAdmin) {
      return { success: false, error: 'Only admins can export' }
    }

    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', subjectId)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export subject'
    console.error('[exportSubjectAction] Error:', err)
    return { success: false, error: message }
  }
}

/**
 * Get current user info for admin panel
 */
export async function getUserInfoAction(userId: string): Promise<
  ActionResult<{ email?: string; role: string | null }>
> {
  try {
    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('users')
      .select('email, role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return { success: true, data: { role: null } }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[getUserInfoAction] Error:', err)
    return { success: true, data: { role: null } }
  }
}
