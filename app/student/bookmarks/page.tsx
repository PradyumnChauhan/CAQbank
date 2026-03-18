'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import Image from 'next/image'
import { loadBookmarkedQuestionsAction } from '@/app/student/actions'

type BookmarkedQuestion = {
  id: string
  title: string
  text: string | null
  q_type: string
  subject_id: string
}

function getBookmarkPrefix(userId: string) {
  return `qbank:bookmarks:${userId}:`
}

export default function StudentBookmarksPage() {
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<BookmarkedQuestion[]>([])

  useEffect(() => {
    const loadBookmarks = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        setError(null)
        const prefix = getBookmarkPrefix(user.id)
        const questionIds: string[] = []

        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index)
          if (!key || !key.startsWith(prefix)) continue

          const questionId = key.replace(prefix, '')
          if (questionId) questionIds.push(questionId)
        }

        if (questionIds.length === 0) {
          setItems([])
          return
        }

        const result = await loadBookmarkedQuestionsAction(questionIds)
        if (result.success) {
          setItems(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
      } finally {
        setIsLoading(false)
      }
    }

    loadBookmarks()
  }, [user])

  const removeBookmark = (questionId: string) => {
    if (!user) return

    localStorage.removeItem(`${getBookmarkPrefix(user.id)}${questionId}`)
    setItems((prev) => prev.filter((item) => item.id !== questionId))
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-primary to-rose-300 rounded-lg shadow-md">
          <Image src="/icon.png" alt="Bookmarks" width={48} height={48} className="w-12 h-12" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary">Bookmarks</h1>
          <p className="text-gray-600 mt-1 font-medium">Saved questions for quick revision.</p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="rounded-xl border border-rose-100 bg-white p-12 text-center shadow-sm">
          <div className="inline-block p-3 bg-primary/10 rounded-lg">
            <Image src="/icon.png" alt="Loading" width={50} height={50} className="mx-auto animate-pulse" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading bookmarks...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-12 text-center">
          <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
            <Image src="/icon.png" alt="Empty" width={40} height={40} className="w-10 h-10 opacity-50" />
          </div>
          <p className="text-gray-600 font-bold">No bookmarks yet.</p>
          <p className="text-gray-500 text-sm mt-2 font-medium">Start saving questions to see them here!</p>
          <Link href="/student/subjects" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:shadow-lg transition-all">
            Browse Subjects
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map((item) => (
            <div key={item.id} className="group rounded-lg border border-rose-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary transition-all duration-300">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wide mb-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                {item.q_type.replaceAll('_', ' ')}
              </div>
              
              {/* Title */}
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2">{item.title}</h2>
              
              {/* Preview */}
              <p className="text-sm text-gray-600 mt-3 line-clamp-3">{item.text || 'No text available.'}</p>

              {/* Actions */}
              <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-rose-100">
                <Link
                  href={`/student/subject/${item.subject_id}/type/${item.q_type}`}
                  className="text-sm font-bold text-primary hover:text-primary-dark inline-flex items-center gap-1 transition-colors"
                >
                  Open
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <button
                  onClick={() => removeBookmark(item.id)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
