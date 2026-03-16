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
  variant?: 'primary' | 'secondary' | 'outline'
  disabled?: boolean
  onClick?: () => void
  className?: string
  [key: string]: any
}) {
  const baseClasses = 'px-6 py-2 rounded-lg font-semibold transition-all'

  const variants = {
    primary:
      'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-lg disabled:opacity-50',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-primary-lighter text-primary hover:bg-primary-lightest',
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
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-lg border border-primary-lighter p-6 ${className}`}>
      {children}
    </div>
  )
}

export function Input({
  label,
  error,
  ...props
}: {
  label?: string
  error?: string
  [key: string]: any
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
