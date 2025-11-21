import React from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export default function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

