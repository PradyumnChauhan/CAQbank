'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function QuestionsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/student/subjects')
  }, [router])

  return (
    <div className="rounded-2xl border border-primary-lighter bg-white p-10 text-center">
      <div className="mx-auto h-10 w-10 rounded-full border-4 border-primary-lighter border-t-primary animate-spin" />
      <p className="mt-4 text-gray-600">Redirecting to subjects...</p>
    </div>
  )
}
