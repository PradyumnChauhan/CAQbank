'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PerformancePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/student')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="rounded-xl border border-rose-100 bg-white p-12 shadow-md text-center">
        <div className="inline-block p-3 bg-primary/10 rounded-lg">
          <div className="mx-auto h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
        <p className="mt-4 text-gray-600 font-medium">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
