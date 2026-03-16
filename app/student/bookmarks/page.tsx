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
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-purple-dark inline-flex items-center gap-2">
          <Image src="/icon.png" alt="Bookmarks" width={50} height={50} />
          Bookmarks
        </h1>
        <p className="text-gray-600 mt-2">Saved questions for quick revision.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-primary-lighter bg-white p-10 text-center">
          <Image src="/icon.png" alt="Loading" width={50} height={50} className="mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading bookmarks...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-primary-lighter bg-white p-10 text-center">
          <p className="text-gray-600">No bookmarks yet.</p>
          <Link href="/student/subjects" className="inline-flex items-center gap-2 mt-4 text-primary font-semibold hover:text-purple-dark">
            <Image src="/icon.png" alt="Browse" width={50} height={50} />
            Browse subjects
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-primary-lighter bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-primary font-semibold">{item.q_type.replaceAll('_', ' ')}</p>
              <h2 className="text-lg font-semibold text-purple-dark mt-1">{item.title}</h2>
              <p className="text-sm text-gray-600 mt-2 line-clamp-3">{item.text || 'No text available.'}</p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Link
                  href={`/student/subject/${item.subject_id}/type/${item.q_type}`}
                  className="text-sm font-semibold text-primary hover:text-purple-dark inline-flex items-center gap-2"
                >
                  <Image src="/icon.png" alt="Open" width={50} height={50} />
                  Open question set
                </Link>
                <button
                  onClick={() => removeBookmark(item.id)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-primary-lighter text-gray-700 hover:border-primary"
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
