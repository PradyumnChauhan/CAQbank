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
  descriptive: { label: 'Descriptive', note: 'Solve detailed descriptive questions with sub-questions.' },
  case_scenario: { label: 'Case Scenario', note: 'Read scenario-based descriptive questions.' },
  case_scenario_mcq: { label: 'Case Scenario MCQ', note: 'Case-based MCQs with option selection.' },
  independent_mcq: { label: 'Independent MCQ', note: 'Independent multiple-choice questions.' },
  caselet_mcq: { label: 'Caselet MCQ', note: 'Caselet-based MCQs.' },
}

// Capitalize first word only
function capitalizeFirstWord(str: string): string {
  if (!str) return ''
  const words = str.replace(/_/g, ' ').split(' ')
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase()
  return words.slice(0, 1).join(' ')
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
      <div className="rounded-xl border border-rose-100 bg-white p-12 text-center shadow-sm">
        <div className="inline-block p-3 bg-primary/10 rounded-lg">
          <Image src="/icon.png" alt="Loading" width={50} height={50} className="mx-auto animate-pulse" />
        </div>
        <p className="mt-4 text-gray-600 font-medium">Loading subject...</p>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 p-12 text-center text-gray-600 font-medium">
        {error || 'Subject not found.'}
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header Section */}
      <div className="rounded-xl border border-rose-200 bg-white p-8 md:p-10 shadow-md space-y-4">
        <Link href="/student/subjects" className="text-sm font-bold text-primary hover:text-primary-dark inline-flex items-center gap-2 transition-colors">
          ← Back to Subjects
        </Link>
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{subject.name}</h1>
          <p className="text-base text-gray-600 leading-relaxed">{subject.description || 'Select question type and start solving.'}</p>
        </div>
      </div>

      {/* Question Types Section */}
      <div className="rounded-xl border border-rose-200 bg-white p-8 md:p-10 shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
          Solve Question Type Wise
        </h2>

        {availableTypes.length === 0 ? (
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-8 text-center text-gray-600 font-medium">
            No published questions available for this subject yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableTypes.map(({ q_type, count }) => {
              const meta = TYPE_META[q_type] || { 
                label: capitalizeFirstWord(q_type), 
                note: 'Solve available questions for this type.' 
              }

              return (
                <Link
                  key={q_type}
                  href={`/student/subject/${subjectId}/type/${q_type}`}
                  className="group rounded-lg border border-rose-100 bg-white p-6 hover:border-primary hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  {/* Top Accent */}
                  <div className="h-1 w-12 bg-gradient-to-r from-primary to-accent rounded-full mb-4" />
                  
                  {/* Content */}
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">{meta.label}</h3>
                  <p className="text-sm text-gray-600 mt-3">{meta.note}</p>
                  
                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-rose-100">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg font-bold text-sm">
                      {count}
                      <span className="text-xs font-medium">Q's</span>
                    </span>
                    <span className="text-primary font-bold group-hover:translate-x-1 transition-transform duration-300">
                      →
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
