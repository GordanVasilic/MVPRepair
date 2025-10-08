const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function debugLoadInherited() {
  console.log('🔍 Debugujem loadInheritedAddresses funkciju...')
  
  try {
    // Kreiraj običan klijent za autentifikaciju
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    // Kreiraj admin klijent
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Autentifikuj se kao demo@stanar.com
    const { data: authData, error: authError } = await supabaseUser.auth.signInWithPassword({
      email: 'demo@stanar.com',
      password: 'demo123'
    })

    if (authError) {
      console.error('❌ Autentifikacija neuspešna:', authError.message)
      return
    }

    console.log('✅ Uspešno autentifikovan kao demo@stanar.com')
    console.log('👤 User ID:', authData.user.id)

    // Simuliraj loadInheritedAddresses funkciju
    console.log('\n🔍 Testiram loadInheritedAddresses logiku...')
    
    // Proverava da li je korisnik stanar dodeljen nekoj zgradi
    const { data: buildingTenants, error: buildingTenantsError } = await supabaseAdmin
      .from('building_tenants')
      .select(`
        id,
        building_id,
        apartment_number,
        floor_number,
        buildings!inner(
          id,
          name,
          address
        )
      `)
      .eq('tenant_id', authData.user.id)
      .eq('status', 'active')

    if (buildingTenantsError) {
      console.error('❌ Greška pri dohvatanju building_tenants:', buildingTenantsError)
      return
    }

    console.log('📋 Building tenants rezultat:')
    console.log('   Broj zapisa:', buildingTenants?.length || 0)
    
    if (buildingTenants && buildingTenants.length > 0) {
      buildingTenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. Zgrada: ${tenant.buildings.name}`)
        console.log(`      Adresa: ${tenant.buildings.address}`)
        console.log(`      Stan: ${tenant.apartment_number}`)
        console.log(`      Sprat: ${tenant.floor_number}`)
      })
      
      // Kreiraj nasleđene adrese
      console.log('\n🏠 Kreiranje nasleđenih adresa...')
      const inheritedAddresses = buildingTenants.map(tenant => ({
        id: `inherited-${tenant.id}`,
        name: `${tenant.buildings.name} - Stan ${tenant.apartment_number}`,
        address: tenant.buildings.address,
        city: 'Nasleđeno od zgrade',
        apartment: tenant.apartment_number,
        floor: tenant.floor_number?.toString() || '',
        entrance: '',
        notes: `Nasleđena adresa od zgrade ${tenant.buildings.name}`,
        isDefault: false,
        isInherited: true,
        buildingId: tenant.building_id
      }))
      
      console.log('✅ Kreiran broj nasleđenih adresa:', inheritedAddresses.length)
      inheritedAddresses.forEach((addr, index) => {
        console.log(`   ${index + 1}. ${addr.name}`)
        console.log(`      Adresa: ${addr.address}`)
        console.log(`      Stan: ${addr.apartment}`)
      })
    } else {
      console.log('❌ Nema building_tenants zapisa za ovog korisnika')
    }

  } catch (error) {
    console.error('❌ Greška:', error.message)
  }
}

debugLoadInherited()