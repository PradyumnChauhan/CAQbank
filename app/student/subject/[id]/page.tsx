'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { loadStudentSubjectDetailAction } from '@/app/student/actions'

type SubjectData = {
  id: string
  name: string
  description: string | null
}

type QuestionTypeCount = {
  q_type: string
  count: number
}

const TYPE_META: Record<string, { label: string; note: string }> = {
  mcq: { label: 'MCQ', note: 'Single-question multiple-choice practice.' },
  case_scenario: { label: 'Case Scenario', note: 'Read scenario-based descriptive questions.' },
  case_scenario_mcq: { label: 'Case Scenario MCQ', note: 'Case-based MCQs with option selection.' },
}

export default function StudentSubjectDetailPage() {
  const params = useParams()
  const subjectId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState<SubjectData | null>(null)
  const [typesCounts, setTypesCounts] = useState<QuestionTypeCount[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null)
        const result = await loadStudentSubjectDetailAction(subjectId)
        
        if (result.success) {
          setSubject(result.data.subject)
          setTypesCounts(result.data.typesCounts)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subject')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [subjectId])

  const availableTypes = useMemo(
    () => typesCounts.filter(({ count }) => count > 0),
    [typesCounts]
  )

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-primary-lighter bg-white p-10 text-center">
        <Image src="/icon.png" alt="Loading" width={50} height={50} className="mx-auto animate-pulse" />
        <p className="mt-4 text-gray-600">Loading subject...</p>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="rounded-2xl border border-primary-lighter bg-white p-10 text-center text-gray-600">
        {error || 'Subject not found.'}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 md:p-10 shadow-sm space-y-4">
        <Link href="/student/subjects" className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 transition-colors">
          ← Back to Subjects
        </Link>
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{subject.name}</h1>
          <p className="text-lg text-gray-700 leading-relaxed">{subject.description || 'Select question type and start solving.'}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary-lighter bg-white p-6 md:p-8">
        <h2 className="text-xl font-semibold text-purple-dark mb-4">Solve Question Type Wise</h2>

        {availableTypes.length === 0 ? (
          <div className="rounded-xl border border-primary-lighter bg-primary-lightest p-6 text-gray-600">
            No published questions available for this subject yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTypes.map(({ q_type, count }) => {
              const meta = TYPE_META[q_type] || { label: q_type, note: 'Solve available questions for this type.' }

              return (
                <Link
                  key={q_type}
                  href={`/student/subject/${subjectId}/type/${q_type}`}
                  className="rounded-xl border border-primary-lighter bg-gradient-to-br from-white to-primary-lightest p-5 hover:border-primary hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-purple-dark">{meta.label}</h3>
                  <p className="text-sm text-gray-600 mt-2">{meta.note}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-primary font-medium">{count} questions</span>
                    <span className="text-purple-dark font-semibold inline-flex items-center gap-2">
                      Start
                      <Image src="/icon.png" alt="Start" width={50} height={50} />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
