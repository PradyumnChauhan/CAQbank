'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import Link from 'next/link'
import { getCaseStudiesAction, getCaseStudyProgressAction, type CaseStudy } from '@/app/case-study/actions'
import { loadSubjectsAction } from '@/app/admin/actions'

type SubjectRow = {
  id: string
  code: string
  name: string
  description: string | null
}

export default function StudentCaseStudiesPage() {
  const auth = useAuth()
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>('')

  // Load all subjects on mount
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const result = await loadSubjectsAction()
        if (result.success && result.data) {
          setSubjects(result.data)
          if (result.data.length > 0) {
            setSelectedSubject(result.data[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load subjects:', err)
      }
    }

    loadSubjects()
  }, [])

  // Load case studies when subject changes
  useEffect(() => {
    const loadCaseStudies = async () => {
      try {
        if (!auth?.user || !selectedSubject) return

        setIsLoading(true)
        setError(null)
        setCurrentIndex(0)

        const result = await getCaseStudiesAction(selectedSubject)

        if (result.success && Array.isArray(result.data)) {
          setCaseStudies(result.data)
        } else if (result.success) {
          setCaseStudies(result.data || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load case studies')
      } finally {
        setIsLoading(false)
      }
    }

    loadCaseStudies()
  }, [selectedSubject, auth?.user])

  if (!auth?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view case studies</p>
          <Link href="/auth/student/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  const currentCase = caseStudies[currentIndex]

  const handleNext = () => {
    if (currentIndex < caseStudies.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Case Studies</h1>
        <p className="text-blue-100">Solve real-world case scenarios and track your progress</p>
      </div>

      {/* Subject Selector */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Select Subject:</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className={`px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                  selectedSubject === subject.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-primary-light p-12 shadow-lg text-center">
            <div className="inline-block animate-spin mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-gray-800 font-medium text-lg">Loading case studies...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : caseStudies.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 text-lg font-medium">No case studies available</p>
          <p className="text-gray-500 text-sm mt-2">
            {selectedSubject ? 'No cases found for this subject' : 'Please select a subject'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Slider Card */}
          <div className="relative">
            {/* Main Case Card */}
            <Link href={`/student/case-studies/${currentCase.id}`} className="block">
              <div className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all p-8 cursor-pointer">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                      Case Scenario {currentCase.case_number}
                    </h2>
                    <p className="text-gray-700 leading-relaxed text-lg line-clamp-3">
                      {currentCase.context}
                    </p>
                  </div>
                  <div className={`ml-6 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                    currentCase.difficulty_level === 'easy'
                      ? 'bg-green-100 text-green-700'
                      : currentCase.difficulty_level === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {currentCase.difficulty_level.charAt(0).toUpperCase() + currentCase.difficulty_level.slice(1)}
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-gray-500 text-sm">Estimated Time</p>
                    <p className="text-2xl font-bold text-gray-900">{currentCase.estimated_time_minutes} <span className="text-sm">mins</span></p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Difficulty Level</p>
                    <p className={`text-2xl font-bold ${
                      currentCase.difficulty_level === 'easy'
                        ? 'text-green-600'
                        : currentCase.difficulty_level === 'medium'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {currentCase.difficulty_level.charAt(0).toUpperCase() + currentCase.difficulty_level.slice(1)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-600">
                    Case {currentIndex + 1} of {caseStudies.length}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                        currentIndex === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-md'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <button
                      onClick={handleNext}
                      disabled={currentIndex === caseStudies.length - 1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                        currentIndex === caseStudies.length - 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-md'
                      }`}
                    >
                      Next
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
