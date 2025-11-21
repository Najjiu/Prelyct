import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prelyct Votes',
  description: 'Voting platform by Prelyct',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

