import { create } from 'zustand'
import { supabase, type User } from '../lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string, phone?: string, role?: 'tenant' | 'company') => Promise<{ error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        // Use auth.user data directly
        set({ 
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name,
            phone: data.user.user_metadata?.phone,
            role: data.user.user_metadata?.role || 'tenant',
            user_metadata: data.user.user_metadata
          }
        })
      }

      return {}
    } catch (error) {
      return { error: 'Greška pri prijavljivanju' }
    }
  },

  signUp: async (email: string, password: string, name: string, phone?: string, role: 'tenant' | 'company' = 'tenant') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role
          }
        }
      })

      if (error) {
        return { error: error.message }
      }

      // User is created in auth.users table automatically by Supabase
      // All user data is stored in user_metadata

      return {}
    } catch (error) {
      return { error: 'Greška pri registraciji' }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        set({ 
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name,
            phone: session.user.user_metadata?.phone,
            role: session.user.user_metadata?.role || 'tenant',
            user_metadata: session.user.user_metadata
          }
        })
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ loading: false })
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        set({ 
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name,
            phone: session.user.user_metadata?.phone,
            role: session.user.user_metadata?.role || 'tenant',
            user_metadata: session.user.user_metadata
          }
        })
      } else if (event === 'SIGNED_OUT') {
        set({ user: null })
      }
    })
  },
}))