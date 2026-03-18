'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { loadStudentSubjectsAction } from '@/app/student/actions'

type SubjectWithCount = {
  id: string
  name: string
  description: string | null
  questionCount: number
}

export default function StudentSubjectsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const result = await loadStudentSubjectsAction()
        if (result.success) {
          setSubjects(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subjects')
      } finally {
        setIsLoading(false)
      }
    }

    loadSubjects()
  }, [])

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-rose-200 p-8 shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary to-rose-300 rounded-lg shadow-md">
            <Image src="/icon.png" alt="Subjects" width={48} height={48} className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary">Subjects</h1>
            <p className="text-gray-600 mt-2 text-base font-medium">Select a subject to start practicing questions and case studies.</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="rounded-xl border border-rose-100 bg-white p-12 text-center shadow-sm">
          <div className="inline-block p-3 bg-primary/10 rounded-lg">
            <Image src="/icon.png" alt="Loading" width={50} height={50} className="mx-auto animate-pulse" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-12 text-center text-gray-600 font-medium">
          No subjects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/student/subject/${subject.id}`}
              className="group rounded-xl border border-rose-150 bg-white p-6 shadow-md hover:shadow-xl hover:border-primary transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              {/* Top Accent Bar */}
              <div className="h-1.5 rounded-full bg-gradient-to-r from-primary via-rose-300 to-accent mb-6" />
              
              {/* Content */}
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{subject.name}</h2>
              <p className="text-sm text-gray-600 mt-3 min-h-10 font-medium">{subject.description || 'Start solving by selecting this subject.'}</p>
              
              {/* Footer */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-rose-100">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-bold text-sm">
                  {subject.questionCount}
                  <span className="text-xs font-medium">Q's</span>
                </span>
                <span className="text-primary font-bold group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
