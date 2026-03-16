'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import Link from 'next/link'
import { getCaseStudyDetailAction, submitCaseAnswerAction, getCaseStudyProgressAction, getNextCaseStudyAction, type CaseStudyDetail } from '@/app/case-study/actions'

export default function CaseStudySolvePage() {
  const params = useParams()
  const auth = useAuth()
  const caseId = params.id as string

  const [caseDetail, setCaseDetail] = useState<CaseStudyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set())
  const [nextCaseStudyId, setNextCaseStudyId] = useState<string | null>(null)

  useEffect(() => {
    const loadCaseDetail = async () => {
      try {
        if (!auth?.user) return

        const result = await getCaseStudyDetailAction(caseId)
        if (result.success) {
          setCaseDetail(result.data)
          // Initialize answers from previous attempts
          const progressResult = await getCaseStudyProgressAction(caseId, auth.user.id)
          if (progressResult.success && progressResult.data?.answers) {
            const prevAnswers: Record<string, string> = {}
            const completed = new Set<string>()
            progressResult.data.answers.forEach((ans) => {
              prevAnswers[ans.case_study_question_id] = ans.selected_option
              completed.add(ans.case_study_question_id)
            })
            setAnswers(prevAnswers)
            setCompletedQuestions(completed)
          }

          // Fetch next case study for the same subject
          const nextResult = await getNextCaseStudyAction(caseId)
          if (nextResult.success && nextResult.data) {
            setNextCaseStudyId(nextResult.data.id)
          }
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load case study')
      } finally {
        setIsLoading(false)
      }
    }

    loadCaseDetail()
  }, [caseId, auth?.user])

  const handleAnswerChange = (questionId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option
    }))
  }

  const handleSubmitAnswer = async (questionId: string) => {
    if (!answers[questionId]) {
      alert('Please select an answer')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await submitCaseAnswerAction(caseId, questionId, answers[questionId], auth?.user?.id)
      if (result.success) {
        setCompletedQuestions((prev) => new Set([...prev, questionId]))
      } else {
        setSubmitError(result.error)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!auth?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to solve case studies</p>
          <Link href="/auth/student/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-primary-light p-12 shadow-lg text-center">
          <p className="text-gray-800 text-lg font-medium">Loading case study...</p>
        </div>
      </div>
    )
  }

  if (error || !caseDetail) {
    return (
      <div className="space-y-6 pb-20">
        <Link href="/student/case-studies" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-2">
          ← Back to Case Studies
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error || 'Case study not found'}
        </div>
      </div>
    )
  }

  const totalQuestions = caseDetail.questions?.length || 0
  const answeredQuestions = completedQuestions.size

  return (
    <div className="space-y-6 pb-20">
      <Link href="/student/case-studies" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 font-medium">
        ← Back to Case Studies
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-md">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Case Scenario {caseDetail.case_number}
            </h1>
            <div className="flex gap-4 text-sm text-gray-600">
              <span className={`px-3 py-1 rounded-full font-semibold ${
                caseDetail.difficulty_level === 'easy'
                  ? 'bg-green-100 text-green-700'
                  : caseDetail.difficulty_level === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {caseDetail.difficulty_level.charAt(0).toUpperCase() + caseDetail.difficulty_level.slice(1)}
              </span>
              <span>📚 {caseDetail.estimated_time_minutes} minutes</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">
              {answeredQuestions}/{totalQuestions}
            </div>
            <p className="text-sm text-gray-600">Questions answered</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all rounded-full"
            style={{
              width: `${totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* Case Context */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-md space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Context</h2>
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
            {caseDetail.context}
          </div>
        </div>

        {/* Case tables if any */}
        {caseDetail.tables && caseDetail.tables.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Reference Data</h3>
            <div className="space-y-6 overflow-x-auto">
              {caseDetail.tables.map((table, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">{table.table_name}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-blue-600">
                          {table.headers.map((header, i) => (
                            <th key={i} className="border border-gray-300 px-4 py-3 text-left font-semibold text-white">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, i) => (
                          <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} hover:bg-blue-50 transition-colors`}>
                            {row.map((cell, j) => (
                              <td key={j} className="border border-gray-300 px-4 py-3 text-gray-800">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 px-2">Questions</h2>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {submitError}
          </div>
        )}

        {caseDetail.questions?.map((question, idx) => (
          <div
            key={question.id}
            className={`bg-white rounded-2xl border-2 transition-all p-8 shadow-md ${
              completedQuestions.has(question.id)
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex-1">
                <span className="text-blue-600 font-bold mr-2">Q{idx + 1}.</span>
                {question.question_text}
              </h3>
              {completedQuestions.has(question.id) && (
                <span className="text-green-600 font-bold text-sm ml-4">✓ Answered</span>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {question.options.map((option) => (
                <label
                  key={option.option_id}
                  className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50"
                  style={{
                    borderColor: answers[question.id] === option.option_id ? '#2563eb' : '#e5e7eb',
                    backgroundColor: answers[question.id] === option.option_id ? '#eff6ff' : 'transparent'
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.option_id}
                    checked={answers[question.id] === option.option_id}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    disabled={isSubmitting}
                    className="w-4 h-4 mr-3 cursor-pointer"
                  />
                  <span className="text-gray-800 flex-1">{option.option_text}</span>
                </label>
              ))}
            </div>

            {/* Submit button */}
            <button
              onClick={() => handleSubmitAnswer(question.id)}
              disabled={!answers[question.id] || isSubmitting || completedQuestions.has(question.id)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {completedQuestions.has(question.id) ? '✓ Answered' : 'Submit Answer'}
            </button>

            {/* Reasoning (shown after submission) */}
            {completedQuestions.has(question.id) && question.reasoning && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900 mb-2">💡 Explanation:</p>
                <p className="text-sm text-yellow-800 whitespace-pre-wrap">{question.reasoning}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Completion message */}
      {answeredQuestions === totalQuestions && totalQuestions > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-900 font-semibold">🎉 Great job! You&apos;ve completed all questions in this case study.</p>
          <div className="flex gap-4 justify-center mt-6">
            <Link href="/student/case-studies" className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors inline-block">
              Back to Case Studies
            </Link>
            {nextCaseStudyId ? (
              <Link href={`/student/case-studies/${nextCaseStudyId}`} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block">
                Next Case →
              </Link>
            ) : (
              <div className="px-6 py-3 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed inline-block">
                No More Cases
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
