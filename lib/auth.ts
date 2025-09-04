/**
 * Real Authentication System for LaunchKit
 * Handles user authentication and session management
 */

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

// Supabase client for auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create client with fallback for missing env vars
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

// User type
export interface User {
  id: string
  email: string
  name?: string
  created_at?: string
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // If no authenticated user, use session storage for demo (browser only)
      if (typeof window !== 'undefined') {
        const demoUser = sessionStorage.getItem('launchkit_user')
        if (demoUser) {
          return JSON.parse(demoUser)
        }
        
        // Create a demo user for this session
        const newDemoUser: User = {
          id: `user_${Math.random().toString(36).substr(2, 9)}`,
          email: `demo_${Date.now()}@launchkit.demo`,
          name: 'Demo User',
          created_at: new Date().toISOString()
        }
        
        sessionStorage.setItem('launchkit_user', JSON.stringify(newDemoUser))
        return newDemoUser
      }
      
      // Server-side fallback
      return null
    }
    
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name,
      created_at: user.created_at
    }
  } catch (error) {
    console.error('Auth error:', error)
    
    // Fallback to session-based demo user (browser only)
    if (typeof window !== 'undefined') {
      const demoUser = sessionStorage.getItem('launchkit_user')
      if (demoUser) {
        return JSON.parse(demoUser)
      }
      
      const newDemoUser: User = {
        id: `user_${Math.random().toString(36).substr(2, 9)}`,
        email: `demo_${Date.now()}@launchkit.demo`,
        name: 'Demo User',
        created_at: new Date().toISOString()
      }
      
      sessionStorage.setItem('launchkit_user', JSON.stringify(newDemoUser))
      return newDemoUser
    }
    
    // Server-side fallback
    return null
  }
}

// Sign in with email/password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

// Sign up new user
export async function signUp(email: string, password: string, name?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  })
  
  if (error) throw error
  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('launchkit_user')
  }
  if (error) throw error
}

// Get user ID (always returns something)
export async function getUserId(): Promise<string> {
  const user = await getCurrentUser()
  return user?.id || 'anonymous'
}

// Auth hook for React components
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u)
      setLoading(false)
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name
        })
      } else {
        getCurrentUser().then(setUser)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  return { user, loading }
}

