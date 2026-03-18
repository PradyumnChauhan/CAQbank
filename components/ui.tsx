'use client'

import { ReactNode } from 'react'

export function Button({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  className = '',
  ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'gradient'
  disabled?: boolean
  onClick?: () => void
  className?: string
  [key: string]: any
}) {
  const baseClasses = 'px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 active:scale-95'

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50',
    outline: 'border-2 border-primary text-primary hover:bg-primary/5 disabled:opacity-50',
    subtle: 'text-primary hover:bg-primary/10 disabled:opacity-50',
    gradient: 'bg-gradient-to-r from-primary via-rose-300 to-accent text-white hover:shadow-lg disabled:opacity-50',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({
  children,
  className = '',
  variant = 'default',
  hover = false,
}: {
  children: ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'subtle' | 'ghost'
  hover?: boolean
}) {
  const variants = {
    default: 'bg-white rounded-lg border border-rose-100 shadow-sm',
    elevated: 'bg-white rounded-lg border border-rose-200 shadow-md hover:shadow-xl',
    subtle: 'bg-rose-50 rounded-lg border border-rose-100 shadow-none',
    ghost: 'bg-transparent rounded-lg border border-transparent',
  }

  const hoverClass = hover ? 'transition-all duration-300 hover:scale-105 hover:shadow-lg' : ''

  return (
    <div className={`p-6 ${variants[variant]} ${hoverClass} ${className}`}>
      {children}
    </div>
  )
}

export function Input({
  label,
  error,
  icon,
  ...props
}: {
  label?: string
  error?: string
  icon?: ReactNode
  [key: string]: any
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-3 text-primary">{icon}</div>}
        <input
          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-red-500 focus:ring-red-200' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}

export function StatsCard({
  label,
  value,
  icon,
  trend,
  className = '',
}: {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; isPositive: boolean }
  className?: string
}) {
  return (
    <div className={`bg-white rounded-lg border border-rose-100 p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && <div className="text-primary/20 text-4xl">{icon}</div>}
      </div>
    </div>
  )
}

export function GlassmorphicCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white/80 backdrop-blur-md rounded-lg border border-white/30 shadow-lg p-6 ${className}`}>
      {children}
    </div>
  )
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`mb-8 flex items-start justify-between ${className}`}>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-600 text-base mt-2">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function BadgeCard({
  label,
  value,
  color = 'primary',
  className = '',
}: {
  label: string
  value: string | number
  color?: 'primary' | 'accent' | 'green' | 'orange'
  className?: string
}) {
  const colors = {
    primary: 'bg-primary/10 text-primary border border-primary/20',
    accent: 'bg-accent/10 text-accent border border-accent/20',
    green: 'bg-green-100 text-green-700 border border-green-200',
    orange: 'bg-orange-100 text-orange-700 border border-orange-200',
  }

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${colors[color]} ${className}`}>
      {label}
      <span className="font-bold">{value}</span>
    </div>
  )
}
