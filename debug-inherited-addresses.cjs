const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta sa service role ključem za admin operacije
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

async function debugInheritedAddresses() {
  console.log('🔍 Debugujem loadInheritedAddresses funkciju za demo@stanar.com...')
  
  try {
    const demoTenantId = '31eb01f9-886a-486c-adf0-48e7263100a8' // demo@stanar.com
    
    console.log(`\n👤 Debugujem za korisnika: ${demoTenantId}`)
    
    // Simuliraj loadInheritedAddresses funkciju
    console.log('\n🏠 Dohvatam building_tenants podatke...')
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
      .eq('tenant_id', demoTenantId)
      .eq('status', 'active')

    if (buildingTenantsError) {
      console.error('❌ Greška pri dohvatanju building_tenants:', buildingTenantsError)
      return
    }

    if (!buildingTenants || buildingTenants.length === 0) {
      console.log('❌ Nema aktivnih building_tenants veza za ovog korisnika')
      return
    }

    console.log(`✅ Pronađeno ${buildingTenants.length} building_tenants veza:`)
    buildingTenants.forEach((bt, index) => {
      console.log(`\n   ${index + 1}. Building Tenant:`)
      console.log(`      ID: ${bt.id}`)
      console.log(`      Building ID: ${bt.building_id}`)
      console.log(`      Apartment: ${bt.apartment_number}`)
      console.log(`      Floor: ${bt.floor_number}`)
      console.log(`      Building Name: ${bt.buildings.name}`)
      console.log(`      Building Address: "${bt.buildings.address}"`)
    })

    // Simuliraj kreiranje nasleđenih adresa
    console.log('\n🏗️ Kreiram nasleđene adrese...')
    const inheritedAddresses = buildingTenants.map((bt) => {
      // Parsiranje adrese objekta da se izdvoji ulica i grad
      const fullAddress = bt.buildings.address || ''
      let streetAddress = fullAddress
      let city = ''
      
      // Pokušaj da parsiraš adresu (format: "Ulica broj, Grad")
      const addressParts = fullAddress.split(',')
      if (addressParts.length >= 2) {
        streetAddress = addressParts[0].trim()
        city = addressParts.slice(1).join(',').trim()
      }
      
      return {
        id: `inherited-${bt.id}`,
        name: `${bt.buildings.name} - Stan ${bt.apartment_number}`,
        address: streetAddress,
        city: city,
        apartment: bt.apartment_number,
        floor: bt.floor_number.toString(),
        entrance: '', 
        notes: 'Adresa dodeljena od strane firme',
        isDefault: false, // Simuliramo da već postoje adrese
        isInherited: true,
        buildingId: bt.building_id
      }
    })

    console.log(`✅ Kreiran ${inheritedAddresses.length} nasleđenih adresa:`)
    inheritedAddresses.forEach((addr, index) => {
      console.log(`\n   ${index + 1}. Nasleđena adresa:`)
      console.log(`      ID: ${addr.id}`)
      console.log(`      Name: ${addr.name}`)
      console.log(`      Address: "${addr.address}"`)
      console.log(`      City: "${addr.city}"`)
      console.log(`      Apartment: ${addr.apartment}`)
      console.log(`      Floor: ${addr.floor}`)
      console.log(`      Notes: ${addr.notes}`)
      console.log(`      Is Inherited: ${addr.isInherited}`)
      console.log(`      Building ID: ${addr.buildingId}`)
    })

    // Proverava RLS politike
    console.log('\n🔒 Testiram RLS politike sa običnim klijentom...')
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    // Simuliraj autentifikaciju kao demo@stanar.com
    const { data: authData, error: authError } = await supabaseUser.auth.signInWithPassword({
      email: 'demo@stanar.com',
      password: 'demo123'
    })

    if (authError) {
      console.error('❌ Greška pri autentifikaciji:', authError.message)
      return
    }

    console.log('✅ Uspešno autentifikovan kao demo@stanar.com')

    // Testiraj dohvatanje building_tenants sa RLS
    const { data: userBuildingTenants, error: userError } = await supabaseUser
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
      .eq('tenant_id', demoTenantId)
      .eq('status', 'active')

    if (userError) {
      console.error('❌ Greška pri dohvatanju sa RLS:', userError.message)
    } else {
      console.log(`✅ RLS test uspešan - pronađeno ${userBuildingTenants?.length || 0} zapisa`)
    }

    // Odjavi korisnika
    await supabaseUser.auth.signOut()

  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

debugInheritedAddresses()