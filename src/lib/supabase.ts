import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Supabase: URL:', supabaseUrl ? 'postoji' : 'ne postoji')
console.log('🔧 Supabase: Anon Key:', supabaseAnonKey ? 'postoji' : 'ne postoji')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase: Nedostaju environment varijable!')
  throw new Error('Missing Supabase environment variables')
}

console.log('✅ Supabase: Kreiranje klijenta...')
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email?: string
  phone?: string
  name?: string
  role?: 'tenant' | 'company'
  user_metadata?: {
    name?: string
    phone?: string
    role?: 'tenant' | 'company'
    addresses?: any[]
    address?: string
    city?: string
    apartment?: string
    floor?: string
    entrance?: string
    notes?: string
  }
  app_metadata?: {
    role?: 'tenant' | 'company' | 'admin'
  }
}

export interface Building {
  id: string
  name: string
  address: string
  floors_config: {
    floors: number
    apartments_per_floor: number
  }
  model_url?: string
  created_at: string
}

export interface Apartment {
  id: string
  building_id: string
  apartment_number: string
  floor: number
  rooms_config: {
    rooms: string[]
  }
  created_at: string
}

export interface Issue {
  id: string
  user_id: string
  apartment_id: string
  title: string
  description: string
  category?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'assigned_to_master' | 'in_progress' | 'closed'
  assigned_to?: string
  location_details?: Record<string, unknown>
  created_at: string
  updated_at: string
  resolved_at?: string
  apartment?: {
    apartment_number: string
    floor: number
  }
}

export interface IssueImage {
  id: string
  issue_id: string
  image_url: string
  image_name?: string
  uploaded_at: string
}

export interface Notification {
  id: string
  user_id: string
  issue_id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}