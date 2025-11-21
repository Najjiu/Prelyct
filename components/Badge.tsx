import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'error' | 'info' | 'default'
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const variantStyles = {
    success: 'bg-primary-100 text-primary-700', // Prelyct primary blue
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-primary-100 text-primary-700', // Prelyct primary blue
    default: 'bg-gray-100 text-gray-800',
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}>
      {children}
    </span>
  )
}

