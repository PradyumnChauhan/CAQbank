import { useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CaseStudy, Subject, StudentAttempt } from '@/lib/types'

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('subjects')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setSubjects(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching subjects')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const createSubject = useCallback(
    async (name: string, description: string, createdBy: string, icon?: string) => {
      try {
        const { error: err } = await supabase.from('subjects').insert([
          {
            name,
            description,
            icon,
            created_by: createdBy,
          },
        ])
        if (err) throw err
        await fetchSubjects()
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to create subject')
      }
    },
    [supabase, fetchSubjects]
  )

  const updateSubject = useCallback(
    async (id: string, name: string, description: string, icon?: string) => {
      try {
        const { error: err } = await supabase
          .from('subjects')
          .update({ name, description, icon })
          .eq('id', id)

        if (err) throw err
        await fetchSubjects()
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update subject')
      }
    },
    [supabase, fetchSubjects]
  )

  const deleteSubject = useCallback(
    async (id: string) => {
      try {
        const { error: err } = await supabase
          .from('subjects')
          .delete()
          .eq('id', id)

        if (err) throw err
        await fetchSubjects()
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to delete subject')
      }
    },
    [supabase, fetchSubjects]
  )

  return {
    subjects,
    isLoading,
    error,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  }
}

export function useCaseStudies(subjectId?: string) {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchCaseStudies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      let query = supabase.from('case_studies').select(`
        *,
        tables:tables(*),
        questions:questions(*)
      `)

      if (subjectId) {
        query = query.eq('subject_id', subjectId)
      }

      const { data, error: err } = await query.order('created_at', {
        ascending: false,
      })

      if (err) throw err
      setCaseStudies(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching case studies')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, subjectId])

  useEffect(() => {
    fetchCaseStudies()
  }, [fetchCaseStudies])

  return {
    caseStudies,
    isLoading,
    error,
    fetchCaseStudies,
  }
}

export function useStudentAttempts(studentId?: string) {
  const [attempts, setAttempts] = useState<StudentAttempt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchAttempts = useCallback(async () => {
    if (!studentId) return
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('student_attempts')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setAttempts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching attempts')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, studentId])

  useEffect(() => {
    fetchAttempts()
  }, [fetchAttempts])

  return {
    attempts,
    isLoading,
    error,
    fetchAttempts,
  }
}
