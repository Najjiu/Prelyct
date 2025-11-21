'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { mockAuth } from '@/lib/mockAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      // Check if Supabase is configured
      const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (hasSupabase) {
        // Use real Supabase auth
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/sign-in')
        } else {
          setIsAuthenticated(true)
          setLoading(false)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
          if (!session) {
            router.push('/auth/sign-in')
          } else {
            setIsAuthenticated(true)
            setLoading(false)
          }
        })

        return () => subscription.unsubscribe()
      } else {
        // Use mock auth
        const { data: { session } } = await mockAuth.getSession()

        if (!session) {
          router.push('/auth/sign-in')
        } else {
          setIsAuthenticated(true)
          setLoading(false)
        }
      }
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

