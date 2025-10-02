import { create } from 'zustand'
import { supabase, type User } from '../lib/supabase'
import { Address } from '../types/address'

interface AuthState {
  user: User | null
  addresses: Address[]
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string, phone?: string, role?: 'tenant' | 'company') => Promise<{ error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
  addAddress: (address: Omit<Address, 'id'>) => Promise<{ error?: string }>
  updateAddress: (id: string, address: Partial<Address>) => Promise<{ error?: string }>
  deleteAddress: (id: string) => Promise<{ error?: string }>
  setDefaultAddress: (id: string) => Promise<{ error?: string }>
  migrateExistingData: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  addresses: [],
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
    } catch {
      return { error: 'Greška pri prijavljivanju' }
    }
  },

  signUp: async (email: string, password: string, name: string, phone?: string, role: 'tenant' | 'company' = 'tenant') => {
    try {
      const { error } = await supabase.auth.signUp({
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
    } catch {
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
        
        // Migriraj postojeće podatke nakon inicijalizacije
        setTimeout(() => {
          get().migrateExistingData()
        }, 100)
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
        
        // Migriraj postojeće podatke nakon prijave
        setTimeout(() => {
          get().migrateExistingData()
        }, 100)
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, addresses: [] })
      }
    })
  },

  updateUser: (userData: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null
    }))
  },

  addAddress: async (address: Omit<Address, 'id'>) => {
    try {
      const { user, addresses } = get()
      if (!user) return { error: 'Korisnik nije prijavljen' }

      if (addresses.length >= 5) {
        return { error: 'Maksimalno 5 adresa je dozvoljeno' }
      }

      const newAddress: Address = {
        ...address,
        id: crypto.randomUUID(),
        isDefault: addresses.length === 0 // Prva adresa je automatski glavna
      }

      // Ako je nova adresa postavljena kao glavna, ukloni glavnu oznaku sa ostalih
      const updatedAddresses = address.isDefault 
        ? addresses.map(addr => ({ ...addr, isDefault: false }))
        : addresses

      const newAddresses = [...updatedAddresses, newAddress]

      // Sačuvaj u Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: newAddresses
        }
      })

      if (error) return { error: error.message }

      set({ addresses: newAddresses })
      return {}
    } catch {
      return { error: 'Greška pri dodavanju adrese' }
    }
  },

  updateAddress: async (id: string, addressUpdate: Partial<Address>) => {
    try {
      const { user, addresses } = get()
      if (!user) return { error: 'Korisnik nije prijavljen' }

      let updatedAddresses = addresses.map(addr => 
        addr.id === id ? { ...addr, ...addressUpdate } : addr
      )

      // Ako je adresa postavljena kao glavna, ukloni glavnu oznaku sa ostalih
      if (addressUpdate.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => ({
          ...addr,
          isDefault: addr.id === id
        }))
      }

      // Sačuvaj u Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: updatedAddresses
        }
      })

      if (error) return { error: error.message }

      set({ addresses: updatedAddresses })
      return {}
    } catch {
      return { error: 'Greška pri ažuriranju adrese' }
    }
  },

  deleteAddress: async (id: string) => {
    try {
      const { user, addresses } = get()
      if (!user) return { error: 'Korisnik nije prijavljen' }

      if (addresses.length <= 1) {
        return { error: 'Mora postojati najmanje jedna adresa' }
      }

      const addressToDelete = addresses.find(addr => addr.id === id)
      if (!addressToDelete) return { error: 'Adresa nije pronađena' }

      let updatedAddresses = addresses.filter(addr => addr.id !== id)

      // Ako brišemo glavnu adresu, postavi prvu preostalu kao glavnu
      if (addressToDelete.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true
      }

      // Sačuvaj u Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: updatedAddresses
        }
      })

      if (error) return { error: error.message }

      set({ addresses: updatedAddresses })
      return {}
    } catch {
      return { error: 'Greška pri brisanju adrese' }
    }
  },

  setDefaultAddress: async (id: string) => {
    try {
      const { user, addresses } = get()
      if (!user) return { error: 'Korisnik nije prijavljen' }

      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === id
      }))

      // Sačuvaj u Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: updatedAddresses
        }
      })

      if (error) return { error: error.message }

      set({ addresses: updatedAddresses })
      return {}
    } catch {
      return { error: 'Greška pri postavljanju glavne adrese' }
    }
  },

  migrateExistingData: async () => {
    try {
      const { user } = get()
      if (!user || !user.user_metadata) return

      const metadata = user.user_metadata

      // Provjeri da li već postoje adrese
      if (metadata.addresses && Array.isArray(metadata.addresses)) {
        set({ addresses: metadata.addresses })
        return
      }

      // Migriraj postojeće podatke u prvu adresu
      if (metadata.address || metadata.city || metadata.apartment) {
        const migratedAddress: Address = {
          id: crypto.randomUUID(),
          name: 'Adresa 1',
          address: metadata.address || '',
          city: metadata.city || '',
          apartment: metadata.apartment || '',
          floor: metadata.floor || '',
          entrance: metadata.entrance || '',
          notes: metadata.notes || '',
          isDefault: true
        }

        const addresses = [migratedAddress]

        // Sačuvaj migrirane podatke
        const { error } = await supabase.auth.updateUser({
          data: {
            ...metadata,
            addresses,
            // Ukloni stare pojedinačne polja
            address: undefined,
            city: undefined,
            apartment: undefined,
            floor: undefined,
            entrance: undefined,
            notes: undefined
          }
        })

        if (!error) {
          set({ addresses })
        }
      }
    } catch (error) {
      console.error('Greška pri migraciji podataka:', error)
    }
  },
}))