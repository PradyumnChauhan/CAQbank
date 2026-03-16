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
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-primary-light p-8 shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold text-purple-dark inline-flex items-center gap-3">
          <Image src="/icon.png" alt="Subjects" width={50} height={50} />
          Subjects
        </h1>
        <p className="text-gray-800 mt-4 text-lg font-medium">Select a subject to start practicing questions and case studies.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-primary-lighter bg-white p-10 text-center">
          <Image src="/icon.png" alt="Loading" width={50} height={50} className="mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-2xl border border-primary-lighter bg-white p-10 text-center text-gray-600">
          No subjects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/student/subject/${subject.id}`}
              className="rounded-2xl border-2 border-primary-light bg-white/95 backdrop-blur-sm p-6 shadow-lg hover:border-primary hover:shadow-xl hover:scale-105 transition-all"
            >
              <div className="h-1 rounded-full bg-gradient-to-r from-primary to-primary-light mb-5" />
              <h2 className="text-xl font-semibold text-purple-dark">{subject.name}</h2>
              <p className="text-sm text-gray-700 mt-2 min-h-10 font-medium">{subject.description || 'Start solving by selecting this subject.'}</p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-primary font-bold">{subject.questionCount} questions</span>
                <span className="text-purple-dark font-semibold inline-flex items-center gap-2">
                  Open
                  <Image src="/icon.png" alt="Open" width={50} height={50} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
