'use client'

import { useAuth } from '@/lib/auth/context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userRole, isLoading, user, signOut, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/student/login')
    }

    if (!isLoading && (userRole === 'admin' || userRole === 'superadmin')) {
      router.push('/admin')
    }
  }, [userRole, isLoading, isAuthenticated, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/student/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const navItems = [
    {
      href: '/student/subjects',
      label: 'Subjects',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 3 9.864 3 14.07m0 0a8.997 8.997 0 0016 0m0 0V6.253m0 13C18.5 14.07 21 10.459 21 6.253" />
        </svg>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <svg className="w-12 h-12 text-primary mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div
      className="flex flex-col min-h-screen bg-white"
    >
      {/* Desktop Header */}
      <header className="sticky top-0 bg-white/70 backdrop-blur-xl border-b border-white/30 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/student/subjects" className="flex items-center gap-3 group flex-shrink-0">
            <div className="p-2.5 bg-gradient-to-br from-primary via-accent to-primary-light rounded-lg group-hover:shadow-lg transition-all duration-300">
              <img
                src="/icon.png"
                alt="CA QBank"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg text-primary leading-tight">CA QBank</h1>
              <p className="text-xs text-gray-600">Student Portal</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-gray-700 hover:text-primary hover:bg-primary/5'
                }`}
              >
                <span className={`transition-colors duration-300 ${isActive(item.href) ? 'text-primary' : 'text-gray-500'}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0 pl-4 border-l border-gray-200">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || 'S'}
              </div>
              <span className="text-sm text-gray-700 font-medium max-w-32 truncate">{user?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/30 bg-white/50 backdrop-blur px-4 py-3 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className={isActive(item.href) ? 'text-primary' : 'text-gray-500'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                handleSignOut()
                setMobileMenuOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 md:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur border-t border-white/30 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center text-sm text-gray-600">
          <p className="font-medium">CA QBank © 2026</p>
          <p className="text-xs">Your Ultimate Study Partner for CA Exams</p>
        </div>
      </footer>
    </div>
  )
}
