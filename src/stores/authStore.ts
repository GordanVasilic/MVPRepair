import { create } from 'zustand'
import { createClient } from '@supabase/supabase-js'
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
  autoLoginDev: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
  addAddress: (address: Omit<Address, 'id'>) => Promise<{ error?: string }>
  updateAddress: (id: string, address: Partial<Address>) => Promise<{ error?: string }>
  deleteAddress: (id: string) => Promise<{ error?: string }>
  setDefaultAddress: (id: string) => Promise<{ error?: string }>
  migrateExistingData: () => Promise<void>
  loadInheritedAddresses: () => Promise<void>
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

      if (data.user && data.session) {
        // Use auth.user data directly and include access_token from session
        set({ 
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name,
            phone: data.user.user_metadata?.phone,
            role: data.user.user_metadata?.role || 'tenant',
            user_metadata: data.user.user_metadata,
            access_token: data.session.access_token
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
    console.log('🔄 AuthStore: Inicijalizacija počinje...')
    
    // Dodaj timeout od 10 sekundi za inicijalizaciju
    const initTimeout = setTimeout(() => {
      console.warn('⏰ AuthStore: Timeout - forsiranje završetka inicijalizacije')
      set({ loading: false })
    }, 10000)
    
    try {
      console.log('🔍 AuthStore: Dobijanje sesije...')
      
      // Dodaj timeout za getSession poziv
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout')), 8000)
      )
      
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
      console.log('📋 AuthStore: Sesija dobljena:', session ? 'postoji' : 'ne postoji')
      
      if (session?.user) {
        console.log('👤 AuthStore: Korisnik pronađen:', session.user.email)
        set({ 
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name,
            phone: session.user.user_metadata?.phone,
            role: session.user.user_metadata?.role || 'tenant',
            user_metadata: session.user.user_metadata,
            access_token: session.access_token
          }
        })
        
        // Migriraj postojeće podatke nakon inicijalizacije (bez čekanja)
        console.log('🔄 AuthStore: Pokretanje migracije podataka...')
        get().migrateExistingData().catch(err => 
          console.warn('⚠️ AuthStore: Migracija neuspešna:', err)
        )
      } else {
        console.log('❌ AuthStore: Nema aktivne sesije')
        
        // Auto-login u development modu
        if (import.meta.env.DEV && import.meta.env.VITE_AUTO_LOGIN === 'true') {
          console.log('🔧 AuthStore: Development mod - pokušavam auto-login...')
          try {
            await get().autoLoginDev()
          } catch (autoLoginError) {
            console.warn('⚠️ AuthStore: Auto-login neuspešan:', autoLoginError)
          }
        }
      }
    } catch (error) {
      console.error('❌ AuthStore: Greška pri inicijalizaciji:', error)
      // Ne blokiraj aplikaciju zbog greške u autentifikaciji
    } finally {
      clearTimeout(initTimeout)
      console.log('✅ AuthStore: Inicijalizacija završena, loading = false')
      set({ loading: false })
    }

    // Listen for auth changes (bez await)
    console.log('👂 AuthStore: Postavljanje listener-a za auth promene...')
    try {
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 AuthStore: Auth state promena:', event, session ? 'sa sesijom' : 'bez sesije')
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ AuthStore: Korisnik se prijavio:', session.user.email)
          set({ 
            user: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name,
              phone: session.user.user_metadata?.phone,
              role: session.user.user_metadata?.role || 'tenant',
              user_metadata: session.user.user_metadata,
              access_token: session.access_token
            }
          })
          
          // Migriraj postojeće podatke nakon prijave (bez čekanja)
          get().migrateExistingData().catch(err => 
            console.warn('⚠️ AuthStore: Migracija neuspešna:', err)
          )
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 AuthStore: Korisnik se odjavio')
          set({ user: null, addresses: [] })
        }
      })
    } catch (error) {
      console.error('❌ AuthStore: Greška pri postavljanju listener-a:', error)
    }
  },

  autoLoginDev: async () => {
    console.log('🔧 AuthStore: Pokušavam auto-login sa demo kredencijalima...')
    try {
      const result = await get().signIn('demo@firma.com', 'demo123')
      if (result.error) {
        console.error('❌ AuthStore: Auto-login neuspešan:', result.error)
      } else {
        console.log('✅ AuthStore: Auto-login uspešan!')
      }
    } catch (error) {
      console.error('❌ AuthStore: Greška pri auto-login:', error)
    }
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

      // Filtriraj samo lične adrese za proveru limita
      const personalAddresses = addresses.filter(addr => !addr.isInherited)
      
      if (personalAddresses.length >= 5) {
        return { error: 'Maksimalno 5 ličnih adresa je dozvoljeno' }
      }

      const newAddress: Address = {
        ...address,
        id: crypto.randomUUID(),
        isDefault: personalAddresses.length === 0 && !addresses.some(addr => addr.isDefault), // Prva lična adresa je glavna ako nema glavne
        isInherited: false
      }

      // Ako je nova adresa postavljena kao glavna, ukloni glavnu oznaku sa ostalih ličnih adresa
      const updatedPersonalAddresses = address.isDefault 
        ? personalAddresses.map(addr => ({ ...addr, isDefault: false }))
        : personalAddresses

      const newPersonalAddresses = [...updatedPersonalAddresses, newAddress]

      // Sačuvaj u Supabase samo lične adrese
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: newPersonalAddresses
        }
      })

      if (error) return { error: error.message }

      // Kombinuj nove lične adrese sa nasleđenima
      const inheritedAddresses = addresses.filter(addr => addr.isInherited)
      const combinedAddresses = [...newPersonalAddresses, ...inheritedAddresses]
      
      set({ addresses: combinedAddresses })
      return {}
    } catch {
      return { error: 'Greška pri dodavanju adrese' }
    }
  },

  updateAddress: async (id: string, addressUpdate: Partial<Address>) => {
    try {
      const { user, addresses } = get()
      if (!user) return { error: 'Korisnik nije prijavljen' }

      // Proveri da li je adresa nasleđena
      const addressToUpdate = addresses.find(addr => addr.id === id)
      if (addressToUpdate?.isInherited) {
        return { error: 'Ne možete menjati adresu dodeljenu od strane firme' }
      }

      // Ažuriraj samo lične adrese
      const personalAddresses = addresses.filter(addr => !addr.isInherited)
      const updatedPersonalAddresses = personalAddresses.map(addr => 
        addr.id === id ? { ...addr, ...addressUpdate } : addr
      )

      // Ako je nova adresa postavljena kao glavna, ukloni glavnu oznaku sa ostalih ličnih adresa
      if (addressUpdate.isDefault) {
        updatedPersonalAddresses.forEach(addr => {
          if (addr.id !== id) addr.isDefault = false
        })
      }

      // Sačuvaj u Supabase samo lične adrese
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: updatedPersonalAddresses
        }
      })

      if (error) return { error: error.message }

      // Kombinuj ažurirane lične adrese sa nasleđenima
      const inheritedAddresses = addresses.filter(addr => addr.isInherited)
      const combinedAddresses = [...updatedPersonalAddresses, ...inheritedAddresses]
      
      set({ addresses: combinedAddresses })
      return {}
    } catch {
      return { error: 'Greška pri ažuriranju adrese' }
    }
  },

  deleteAddress: async (id: string) => {
    try {
      const { user, addresses } = get()
      if (!user) return { error: 'Korisnik nije prijavljen' }

      // Proveri da li je adresa nasleđena
      const addressToDelete = addresses.find(addr => addr.id === id)
      if (addressToDelete?.isInherited) {
        return { error: 'Ne možete obrisati adresu dodeljenu od strane firme' }
      }

      // Filtriraj samo lične adrese (ne nasleđene)
      const personalAddresses = addresses.filter(addr => !addr.isInherited)
      
      if (personalAddresses.length <= 1) {
        return { error: 'Mora postojati najmanje jedna lična adresa' }
      }

      if (!addressToDelete) return { error: 'Adresa nije pronađena' }

      const updatedPersonalAddresses = personalAddresses.filter(addr => addr.id !== id)

      // Ako je obrisana glavna adresa, postavi prvu kao glavnu
      if (addressToDelete.isDefault && updatedPersonalAddresses.length > 0) {
        updatedPersonalAddresses[0].isDefault = true
      }

      // Sačuvaj u Supabase samo lične adrese
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          addresses: updatedPersonalAddresses
        }
      })

      if (error) return { error: error.message }

      // Kombinuj ažurirane lične adrese sa nasleđenima
      const inheritedAddresses = addresses.filter(addr => addr.isInherited)
      const combinedAddresses = [...updatedPersonalAddresses, ...inheritedAddresses]
      
      set({ addresses: combinedAddresses })
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

      // Za stanare, prvo učitaj nasleđene adrese
      if (user.role === 'tenant') {
        console.log('🏠 AuthStore: Pozivam loadInheritedAddresses za stanara')
        await get().loadInheritedAddresses()
        
        // Ako već postoje lične adrese, kombinuj ih sa nasleđenima
        if (metadata.addresses && Array.isArray(metadata.addresses)) {
          console.log('📋 AuthStore: Kombinujem postojeće lične adrese sa nasleđenima')
          const personalAddresses = metadata.addresses.filter(addr => !addr.isInherited)
          const { addresses: currentAddresses } = get()
          const inheritedAddresses = currentAddresses.filter(addr => addr.isInherited)
          const combinedAddresses = [...personalAddresses, ...inheritedAddresses]
          set({ addresses: combinedAddresses })
          return
        }

        // Ako nema ličnih adresa, samo koristi nasleđene
        console.log('📋 AuthStore: Nema ličnih adresa, koristim samo nasleđene')
        return
      }

      // Za firme, koristi postojeću logiku
      if (metadata.addresses && Array.isArray(metadata.addresses)) {
        set({ addresses: metadata.addresses })
        return
      }

      // Migriraj postojeće podatke u prvu adresu (samo za firme)
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

  loadInheritedAddresses: async () => {
    console.log('🏠 AuthStore: loadInheritedAddresses pozvan')
    try {
      const { user, addresses } = get()
      if (!user) {
        console.log('❌ AuthStore: Nema korisnika, prekidam loadInheritedAddresses')
        return
      }
      
      console.log('👤 AuthStore: Korisnik:', user.email, 'Role:', user.role)

      // Kreiraj service role klijent za admin operacije
      const supabaseAdmin = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      // Proverava da li je korisnik stanar dodeljen nekom stanu
      const { data: apartmentTenants, error: apartmentTenantsError } = await supabaseAdmin
        .from('apartment_tenants_with_details')
        .select(`
          id,
          apartment_id,
          apartment_number,
          floor,
          building_id,
          building_name,
          building_address,
          tenant_id
        `)
        .eq('tenant_id', user.id)
        .eq('status', 'active')

      if (apartmentTenantsError) {
        console.error('❌ AuthStore: Greška pri dohvatanju apartment_tenants:', apartmentTenantsError)
        return
      }

      console.log('📋 AuthStore: Apartment tenants rezultat:', apartmentTenants?.length || 0, 'zapisa')

      if (!apartmentTenants || apartmentTenants.length === 0) {
        console.log('❌ AuthStore: Nema apartment_tenants zapisa za korisnika')
        return
      }

      // Dohvati podatke o vlasnicima zgrada (firmama) - potrebno je da dohvatimo building owner_id
      const buildingIds = [...new Set(apartmentTenants.map((at: any) => at.building_id))]
      
      // Dohvati podatke o zgradama da dobijemo user_id vlasnika
      const { data: buildings, error: buildingsError } = await supabaseAdmin
        .from('buildings')
        .select('id, user_id')
        .in('id', buildingIds)

      if (buildingsError) {
        console.error('❌ AuthStore: Greška pri dohvatanju zgrada:', buildingsError)
      }

      // Kreiraj mapu building_id -> user_id
      const buildingOwnerMap = new Map()
      if (buildings) {
        buildings.forEach(building => {
          buildingOwnerMap.set(building.id, building.user_id)
        })
      }

      // Dohvati podatke o vlasnicima zgrada (firmama)
      const ownerIds = [...new Set(buildings?.map((b: any) => b.user_id) || [])]
      const { data: owners, error: ownersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (ownersError) {
        console.error('❌ AuthStore: Greška pri dohvatanju vlasnika:', ownersError)
      }

      // Kreiraj mapu vlasnika za brže pretraživanje
      const ownersMap = new Map()
      if (owners?.users) {
        owners.users.forEach((owner: any) => {
          if (ownerIds.includes(owner.id)) {
            ownersMap.set(owner.id, owner.user_metadata?.name || owner.email)
          }
        })
      }

      // Kreiraj nasleđene adrese za svaki stan u kome je stanar
      const inheritedAddresses: Address[] = apartmentTenants.map((at: any) => {
        // Parsiranje adrese objekta da se izdvoji ulica i grad
        const fullAddress = at.building_address || ''
        let streetAddress = fullAddress
        let city = ''
        
        // Pokušaj da parsiraš adresu (format: "Ulica broj, Grad")
        const addressParts = fullAddress.split(',')
        if (addressParts.length >= 2) {
          streetAddress = addressParts[0].trim()
          city = addressParts.slice(1).join(',').trim()
        }
        
        // Dohvati naziv firme/vlasnika
        const ownerId = buildingOwnerMap.get(at.building_id)
        const ownerName = ownersMap.get(ownerId) || 'Nepoznata firma'
        
        return {
          id: `inherited-${at.id}`,
          name: `${at.building_name} - Stan ${at.apartment_number}`,
          address: streetAddress,
          city: city,
          apartment: at.apartment_number,
          floor: at.floor?.toString() || '1',
          entrance: '', // Možda dodati entrance u apartments tabelu kasnije
          notes: `Adresa dodeljena od strane firme ${ownerName}`,
          isDefault: addresses.length === 0, // Prva adresa je glavna ako nema drugih
          isInherited: true,
          buildingId: at.building_id,
          apartmentId: at.apartment_id
        }
      })

      // Kombinuj postojeće adrese sa nasleđenima
      const combinedAddresses = [...addresses, ...inheritedAddresses]
      
      // Ako nema drugih adresa, prva nasleđena je glavna
      if (addresses.length === 0 && inheritedAddresses.length > 0) {
        combinedAddresses[0].isDefault = true
      }

      console.log('✅ AuthStore: Kreiran broj nasleđenih adresa:', inheritedAddresses.length)
      console.log('📋 AuthStore: Ukupno adresa nakon kombinovanja:', combinedAddresses.length)

      set({ addresses: combinedAddresses })
    } catch (error) {
      console.error('❌ AuthStore: Greška pri učitavanju nasleđenih adresa:', error)
    }
  },
}))