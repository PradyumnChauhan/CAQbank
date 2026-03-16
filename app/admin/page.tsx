'use client'

import { useAuth } from '@/lib/auth/context'

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="admin-page-title text-4xl font-bold mb-2">Dashboard</h1>
        <p className="admin-page-subtitle mb-8">Welcome back, {user?.email}!</p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard label="Total Students" value="0" icon="👥" />
          <MetricCard label="Total Attempts" value="0" icon="📝" />
          <MetricCard label="Avg. Accuracy" value="0%" icon="✓" />
          <MetricCard label="This Week Growth" value="0" icon="📈" />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="admin-card lg:col-span-2 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Recent Attempts</h2>
            <p className="admin-card-muted text-center py-8">No attempts yet</p>
          </div>

          <div className="admin-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <QuickActionBtn label="+ Add Subject" href="/admin/subjects" />
              <QuickActionBtn label="+ Bulk Upload Questions" href="/admin/subjects" />
              <QuickActionBtn label="View Analytics" href="/admin/analytics" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: string
}) {
  return (
    <div className="admin-card rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-600 text-sm mb-2">{label}</p>
          <p className="text-3xl font-bold text-blue-900">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

function QuickActionBtn({
  label,
  href,
}: {
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      className="admin-button-secondary block w-full px-4 py-3 rounded-lg font-medium hover:shadow-md transition-all text-center"
    >
      {label}
    </a>
  )
}
