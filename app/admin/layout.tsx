'use client'

import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userRole, isLoading, user, signOut, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect if we're done loading AND user is not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/admin/login')
    }
    
    // Redirect students away from admin area
    if (!isLoading && userRole === 'student') {
      router.push('/student')
    }
  }, [userRole, isLoading, isAuthenticated, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/admin/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="admin-shell flex min-h-screen">
      {/* Sidebar */}
      <aside className="admin-sidebar w-64 border-r border-blue-800">
        <div className="sticky top-0 flex flex-col h-screen">
          {/* Logo */}
          <div className="p-6 border-b border-blue-700">
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg group-hover:shadow-lg transition-all">
                <img
                  src="/icon.png"
                  alt="QBank Admin"
                  className="w-5 h-5"
                />
              </div>
              <div>
                <h1 className="admin-sidebar-title font-bold">QBank</h1>
                <p className="admin-sidebar-subtitle text-xs">Admin</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto space-y-2">
            <NavLink href="/admin" label="Dashboard" icon="📊" isActive={pathname === '/admin'} />
            <NavLink href="/admin/subjects" label="Subjects" icon="📚" isActive={pathname.startsWith('/admin/subjects')} />
            <NavLink href="/admin/case-studies" label="Case Studies" icon="📝" isActive={pathname.startsWith('/admin/case-studies')} />
            <NavLink href="/admin/analytics" label="Analytics" icon="📈" isActive={pathname.startsWith('/admin/analytics')} />
            <NavLink href="/admin/students" label="Students" icon="👥" isActive={pathname.startsWith('/admin/students')} />
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-blue-700 space-y-2">
            <p className="text-xs text-blue-100 px-3 truncate">{user?.email}</p>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm bg-blue-800 text-blue-50 hover:bg-red-600 hover:text-white transition-colors font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({
  href,
  label,
  icon,
  isActive,
}: {
  href: string
  label: string
  icon: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={`admin-nav-link flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
        isActive ? 'admin-nav-link-active' : ''
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}
