'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { UserRole } from '@/lib/types'

interface AuthContextType {
  user: SupabaseUser | null
  session: Session | null
  userRole: UserRole | null
  isLoading: boolean
  signUp: (email: string, password: string, fullName: string, role?: 'student' | 'admin') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  // Helper function to fetch user role from users table
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        // If user row still doesn't exist (trigger didn't fire yet), wait a moment and retry
        if (error.code === 'PGRST116') {
          console.warn('User row not found on first attempt, waiting for trigger...')
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single()
          
          if (retryError) {
            console.error('User row still not found after retry:', retryError)
            return 'student' // Last resort fallback
          }
          
          return retryData?.role ?? 'student'
        }

        console.error('Error fetching user role:', error)
        return null
      }

      return data?.role ?? null
    } catch (err) {
      console.error('Exception fetching user role:', err)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    const loadingTimeout = window.setTimeout(() => {
      if (mounted) {
        setIsLoading(false)
      }
    }, 8000)

    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const role = await fetchUserRole(session.user.id)
          if (!mounted) return
          setUserRole(role)
        } else {
          setUserRole(null)
        }
      } catch (err) {
        console.error('Error getting session:', err)
      } finally {
        if (mounted) {
          setIsLoading(false)
          window.clearTimeout(loadingTimeout)
        }
      }
    }

    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const role = await fetchUserRole(session.user.id)
        if (!mounted) return
        setUserRole(role)
      } else {
        setUserRole(null)
      }

      setIsLoading(false)
    })

    return () => {
      mounted = false
      window.clearTimeout(loadingTimeout)
      subscription?.unsubscribe()
    }
  }, [supabase])

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'admin' = 'student') => {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })

    if (error) throw error
    if (!authData.user?.id) throw new Error('Failed to create account')

    // Trigger on auth.users will automatically create the user profile
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        isLoading,
        signUp,
        signIn,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
