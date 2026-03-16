'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { loadStudentQuestionsAction } from '@/app/student/actions'

type Question = {
  id: string
  title: string
  text: string | null
  q_type: string
  options_json: string[] | null
  case_scenario: string | null
}

type Subject = {
  id: string
  name: string
}

function getBookmarkKey(userId: string, questionId: string) {
  return `qbank:bookmarks:${userId}:${questionId}`
}

// Capitalize each word in a string
function capitalizeWords(str: string) {
  return str
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Parse markdown-like text and format it properly
function parseQuestionText(text: string) {
  if (!text) return null
  
  const lines = text.split('\n')
  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return null
        
        // Check for headers (#### or ###)
        if (/^#{3,4}\s/.test(trimmed)) {
          const headerText = trimmed.replace(/^#{3,4}\s/, '')
          return (
            <h3 key={idx} className="text-lg font-bold text-gray-900 mt-6 mb-3 pt-4 border-t border-gray-200">
              {renderInlineMarkdown(headerText)}
            </h3>
          )
        }
        
        // Check if it's a bullet point or numbered list
        if (/^[-•*]\s/.test(trimmed)) {
          return (
            <div key={idx} className="flex gap-3">
              <span className="text-blue-600 font-semibold mt-1">•</span>
              <p className="text-gray-700 leading-relaxed flex-1">{renderInlineMarkdown(trimmed.replace(/^[-•*]\s/, ''))}</p>
            </div>
          )
        }
        
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <div key={idx} className="flex gap-3">
              <span className="text-blue-600 font-semibold min-w-fit">{trimmed.match(/^\d+\./)?.[0]}</span>
              <p className="text-gray-700 leading-relaxed">{renderInlineMarkdown(trimmed.replace(/^\d+\.\s/, ''))}</p>
            </div>
          )
        }
        
        // Regular text
        if (trimmed) {
          return (
            <p key={idx} className="text-gray-700 leading-relaxed">
              {renderInlineMarkdown(trimmed)}
            </p>
          )
        }
        
        return null
      })}
    </div>
  )
}

// Render inline markdown elements (bold, code, superscript)
function renderInlineMarkdown(text: string): (string | ReactNode)[] {
  const parts: (string | ReactNode)[] = []
  let lastIndex = 0
  
  // Handle **bold** text
  const boldRegex = /\*\*([^*]+)\*\*/g
  let match
  const boldMatches = []
  while ((match = boldRegex.exec(text)) !== null) {
    boldMatches.push({ start: match.index, end: boldRegex.lastIndex, text: match[1] })
  }
  
  // Handle `code` text
  const codeRegex = /`([^`]+)`/g
  const codeMatches = []
  while ((match = codeRegex.exec(text)) !== null) {
    codeMatches.push({ start: match.index, end: codeRegex.lastIndex, text: match[1] })
  }
  
  // Merge and sort matches
  const allMatches = [...boldMatches.map(m => ({ ...m, type: 'bold' })), ...codeMatches.map(m => ({ ...m, type: 'code' }))]
    .sort((a, b) => a.start - b.start)
  
  if (allMatches.length === 0) {
    return [text]
  }
  
  allMatches.forEach((match) => {
    // Add text before this match
    if (lastIndex < match.start) {
      parts.push(text.substring(lastIndex, match.start))
    }
    
    // Add the formatted match
    if (match.type === 'bold') {
      parts.push(
        <strong key={`bold-${match.start}`} className="font-bold text-gray-900">
          {match.text}
        </strong>
      )
    } else if (match.type === 'code') {
      parts.push(
        <code key={`code-${match.start}`} className="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm text-red-600">
          {match.text}
        </code>
      )
    }
    
    lastIndex = match.end
  })
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  return parts
}

export default function StudentQuestionTypePage() {
  const params = useParams()
  const subjectId = params.id as string
  const qType = params.qType as string

  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null)
        const result = await loadStudentQuestionsAction(subjectId, qType)

        if (result.success) {
          setSubject(result.data.subject)
          setQuestions(result.data.questions)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [subjectId, qType])

  const currentQuestion = questions[currentIndex]

  useEffect(() => {
    if (!user || !currentQuestion) {
      setIsBookmarked(false)
      return
    }

    const key = getBookmarkKey(user.id, currentQuestion.id)
    setIsBookmarked(localStorage.getItem(key) === '1')
    setSelectedAnswer(null)
    setStatus('')
  }, [currentQuestion, user])

  const progressLabel = useMemo(() => {
    if (!questions.length) return '0 / 0'
    return `${currentIndex + 1} / ${questions.length}`
  }, [currentIndex, questions.length])

  const toggleBookmark = () => {
    if (!user || !currentQuestion) return

    const key = getBookmarkKey(user.id, currentQuestion.id)
    if (isBookmarked) {
      localStorage.removeItem(key)
      setIsBookmarked(false)
      return
    }

    localStorage.setItem(key, '1')
    setIsBookmarked(true)
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return
    setStatus('Answer submitted. Continue to next question.')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="animate-pulse mb-4">
          <div className="h-12 w-12 bg-blue-200 rounded-full"></div>
        </div>
        <p className="text-gray-600 font-medium">Loading questions...</p>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
        <p className="text-red-600 font-medium text-lg">{error || 'Subject not found'}</p>
        <Link href="/student/subjects" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
          ← Back to Subjects
        </Link>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="space-y-6">
        <Link href={`/student/subject/${subjectId}`} className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 text-sm font-medium">
          ← Back to {subject.name}
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-600 text-lg font-medium">No questions available for {capitalizeWords(qType)} yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Question Type Badge */}
      <div className="inline-block bg-white border-2 border-blue-600 text-blue-600 px-5 py-3 rounded-lg text-sm font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-shadow">
        {capitalizeWords(qType)}
      </div>

      {/* Header Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 flex items-center justify-between gap-4 flex-wrap">
        <Link href={`/student/subject/${subjectId}`} className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 text-sm font-semibold transition-colors">
          ← Back to {subject.name}
        </Link>
        <div className="flex items-center gap-6">
          <div className="text-sm font-bold text-gray-700">
            Question <span className="text-blue-600 text-base">{currentIndex + 1}</span> of <span className="text-blue-600 text-base">{questions.length}</span>
          </div>
          <button
            onClick={toggleBookmark}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              isBookmarked
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
            }`}
          >
            <span className="text-lg">{isBookmarked ? '★' : '☆'}</span>
            <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden">
        {/* Content Section */}
        <div className="p-8 md:p-10">
          <div className="space-y-8">
            {/* Case Scenario Section */}
            {currentQuestion.case_scenario && currentQuestion.case_scenario.trim() && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-orange-400 p-6 rounded-lg space-y-3">
                <h3 className="text-sm uppercase tracking-wider font-bold text-orange-900">Case Scenario</h3>
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
                  {currentQuestion.case_scenario}
                </div>
              </div>
            )}

            {/* Question Content Section */}
            {currentQuestion.text && currentQuestion.text.trim() && (
              <div className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
                  {currentQuestion.text.split('\n')[0]}
                </h2>
                <div className="mt-4">
                  {parseQuestionText(currentQuestion.text.split('\n').slice(1).join('\n'))}
                </div>
              </div>
            )}

            {/* Options Section */}
            {(currentQuestion.options_json || []).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm uppercase tracking-wider font-bold text-gray-700">Options</h3>
                <div className="space-y-3">
                  {(currentQuestion.options_json || []).map((option, index) => {
                    const optionLabel = String.fromCharCode(65 + index)
                    const optionValue = `${optionLabel}. ${option}`
                    const isSelected = selectedAnswer === optionValue

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedAnswer(optionValue)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all font-medium ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-300 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        <span className="inline-block w-8 font-bold text-blue-600">{optionLabel}.</span>
                        <span>{option}</span>
                      </button>
                    )
                  })}
                </div>

                {status && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded-lg text-green-800 font-medium flex items-center gap-2">
                    <span>✓</span>
                    <span>{status}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 md:px-10 py-6 flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            className="px-6 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>

          {(currentQuestion.options_json || []).length > 0 && (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="px-8 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Submit Answer
            </button>
          )}

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
            disabled={currentIndex === questions.length - 1}
            className="px-6 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
