const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje običnog Supabase klijenta
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function debugFrontendTenants() {
  console.log('🔍 Debug frontend Tenants komponente...\n')
  
  try {
    // 1. Prijavi se kao demo@firma.com
    console.log('1. Prijavljivanje kao demo@firma.com...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: 'demo123'
    })
    
    if (authError) {
      console.error('❌ Greška pri prijavljivanju:', authError.message)
      return
    }
    
    console.log('✅ Prijavljen kao demo@firma.com')
    console.log('   User ID:', authData.user.id)
    console.log('   Role:', authData.user.user_metadata?.role || authData.user.app_metadata?.role)
    
    // 2. Proverava da li je korisnik admin ili company (kao u Tenants.tsx)
    const userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role;
    const isAdminOrCompany = userRole === 'admin' || userRole === 'company';
    
    console.log('\n2. Provera dozvola...')
    console.log('   User role:', userRole)
    console.log('   Is admin or company:', isAdminOrCompany)
    
    if (!isAdminOrCompany) {
      console.log('❌ Korisnik nema dozvole za pristup stanarima!')
      return
    }
    
    // 3. Pozovi API endpoint kao što to radi frontend
    console.log('\n3. Pozivanje /api/tenants endpoint-a...')
    const response = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('   Status:', response.status)
    console.log('   Status Text:', response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API greška:', errorText)
      return
    }
    
    const apiData = await response.json()
    console.log('✅ API odgovor uspešan!')
    console.log('   Success:', apiData.success)
    console.log('   Broj stanara:', apiData.tenants?.length || 0)
    
    if (apiData.tenants && apiData.tenants.length > 0) {
      console.log('\n📋 Lista stanara:')
      apiData.tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.user.name} (${tenant.user.email})`)
        console.log(`      Zgrada: ${tenant.building.name}`)
        console.log(`      Stan: ${tenant.apartment_number}, Sprat: ${tenant.floor_number}`)
        console.log(`      Status: ${tenant.status}`)
        console.log(`      ID: ${tenant.id}`)
      })
    } else {
      console.log('\n⚠️  Nema stanara u API odgovoru!')
    }
    
    // 4. Pozovi i /api/buildings endpoint da vidimo zgrade
    console.log('\n4. Pozivanje /api/buildings endpoint-a...')
    const buildingsResponse = await fetch('http://localhost:3001/api/buildings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (buildingsResponse.ok) {
      const buildingsData = await buildingsResponse.json()
      console.log('✅ Buildings API odgovor uspešan!')
      console.log('   Broj zgrada:', buildingsData.buildings?.length || 0)
      
      if (buildingsData.buildings && buildingsData.buildings.length > 0) {
        console.log('\n🏢 Lista zgrada:')
        buildingsData.buildings.forEach((building, index) => {
          console.log(`   ${index + 1}. ${building.name} (ID: ${building.id})`)
          console.log(`      Adresa: ${building.address}`)
        })
      }
    } else {
      console.log('❌ Buildings API greška:', buildingsResponse.status)
    }
    
    // 5. Proverava metadata stanara direktno
    console.log('\n5. Provera metadata demo@stanar.com...')
    await supabase.auth.signOut()
    
    const { data: tenantAuth, error: tenantAuthError } = await supabase.auth.signInWithPassword({
      email: 'demo@stanar.com',
      password: '123456'
    })
    
    if (tenantAuthError) {
      console.error('❌ Greška pri prijavljivanju stanara:', tenantAuthError.message)
      return
    }
    
    console.log('✅ Prijavljen kao demo@stanar.com')
    console.log('   User ID:', tenantAuth.user.id)
    console.log('   Role:', tenantAuth.user.user_metadata?.role)
    console.log('   Building ID:', tenantAuth.user.user_metadata?.building_id)
    console.log('   Apartment:', tenantAuth.user.user_metadata?.apartment)
    console.log('   Name:', tenantAuth.user.user_metadata?.name)
    
    // 6. Zaključak
    console.log('\n🎯 Zaključak:')
    if (apiData.tenants && apiData.tenants.length > 0) {
      console.log('   ✅ API endpoint radi i vraća stanare')
      console.log('   ⚠️  Problem je verovatno u frontend komponenti ili rutingu')
      console.log('   💡 Proverite da li se poziva ispravna ruta u Tenants.tsx')
    } else {
      console.log('   ❌ API endpoint ne vraća stanare')
      console.log('   💡 Problem je u backend logici ili konfiguraciji baze')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

debugFrontendTenants()