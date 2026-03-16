'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
import { BookmarkCheck, Trash2 } from 'lucide-react'

// Helper to get MCQ options (handles both array and object formats)
const getMCQOptions = (question: any) => {
  // Parse question_data if it's a string
  const qData = typeof question?.question_data === 'string' 
    ? JSON.parse(question?.question_data) 
    : question?.question_data

  const options = qData?.options
  if (Array.isArray(options)) return options
  if (options && typeof options === 'object') {
    // Convert object {A: "...", B: "...", ...} to array ["...", "...", ...]
    return Object.keys(options).sort().map(key => options[key])
  }
  return []
}

// Helper to get the correct answer index from letter answer (A, B, C, D)
const getCorrectAnswerIndex = (question: any) => {
  // Parse question_data if it's a string
  const qData = typeof question?.question_data === 'string' 
    ? JSON.parse(question?.question_data) 
    : question?.question_data

  // New format: answer is a letter (A, B, C, D)
  const answer = qData?.answer
  if (answer) {
    const letterIndex = answer.charCodeAt(0) - 'A'.charCodeAt(0)
    if (letterIndex >= 0 && letterIndex <= 3) return letterIndex
  }
  
  // Old format: correctOption is a number (0, 1, 2, 3)
  const correctOption = qData?.correctOption
  if (correctOption !== undefined && !isNaN(Number(correctOption))) {
    return Number(correctOption)
  }
  
  return -1
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadBookmarks()
  }, [])

  const loadBookmarks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get bookmarked questions with related data
      const { data: bookmarkData } = await supabase
        .from('bookmarks')
        .select(`
          id,
          question_id,
          questions(
            id,
            question_data,
            chapters(
              id,
              chapter_name,
              subject_id,
              subjects(
                id,
                name
              )
            )
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      setBookmarks(bookmarkData || [])
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      await supabase.from('bookmarks').delete().eq('id', bookmarkId)
      await loadBookmarks()
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
      alert('Failed to remove bookmark')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading bookmarks...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Bookmarks</h1>
        <p className="text-muted-foreground mt-2">
          Questions you saved for later review
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="border rounded-lg p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <BookmarkCheck className="h-12 w-12 text-gray-400" />
            <p className="text-gray-600 text-center">
              No bookmarks yet. Save questions while practicing to review them later!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark: any) => {
            const question = bookmark.questions
            const chapter = question?.chapters
            const subject = chapter?.subjects

            return (
              <div key={bookmark.id} className="border rounded-lg hover:shadow-md transition-shadow p-4">
                <div className="flex flex-row items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <h3 className="text-lg font-semibold">
                      {question?.question_data?.text}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {subject?.name} {chapter && `• ${chapter.chapter_name}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveBookmark(bookmark.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {question?.question_data?.type === 'mcq' && (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      {getMCQOptions(question)?.map((option: string, idx: number) => {
                        const correctAnswerIndex = getCorrectAnswerIndex(question)
                        const isCorrect = correctAnswerIndex === idx
                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded border text-sm ${
                              isCorrect
                                ? 'bg-green-50 border-green-300'
                                : ''
                            }`}
                          >
                            {option}
                            {isCorrect && (
                              <span className="ml-2 text-green-600">✓ Correct</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
