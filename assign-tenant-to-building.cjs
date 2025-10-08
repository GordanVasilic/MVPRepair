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

async function assignTenantToBuilding() {
  console.log('🔗 Dodeljivanje demo@stanar.com zgradi demo@firma.com...\n')
  
  try {
    // 1. Dohvati demo korisnike
    console.log('1. Dohvatanje demo korisnika...')
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const demoCompany = users.users.find(u => u.email === 'demo@firma.com')
    const demoTenant = users.users.find(u => u.email === 'demo@stanar.com')
    
    if (!demoCompany || !demoTenant) {
      console.error('❌ Demo korisnici ne postoje!')
      return
    }
    
    console.log('✅ Demo korisnici pronađeni')
    
    // 2. Dohvati zgrade firme
    console.log('\n2. Dohvatanje zgrada firme...')
    const { data: buildings, error: buildingsError } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .eq('user_id', demoCompany.id)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    if (buildings.length === 0) {
      console.error('❌ Firma nema zgrade!')
      return
    }
    
    const targetBuilding = buildings[0]
    console.log('✅ Ciljna zgrada:', targetBuilding.name)
    
    // 3. Ažuriraj metadata stanara da uključi building_id
    console.log('\n3. Ažuriranje metadata stanara...')
    
    const updatedMetadata = {
      ...demoTenant.user_metadata,
      building_id: targetBuilding.id,
      apartment: '1A',
      floor: '1',
      entrance: 'A',
      notes: 'Demo stanar dodeljen demo zgradi'
    }
    
    const { data: updateResult, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      demoTenant.id,
      {
        user_metadata: updatedMetadata
      }
    )
    
    if (updateError) {
      console.error('❌ Greška pri ažuriranju metadata:', updateError.message)
      return
    }
    
    console.log('✅ Metadata stanara ažuriran')
    console.log('   Building ID:', targetBuilding.id)
    console.log('   Stan:', '1A')
    console.log('   Sprat:', '1')
    
    // 4. Testiranje API poziva
    console.log('\n4. Testiranje API poziva...')
    
    // Kreiranje običnog klijenta za testiranje
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )
    
    // Prijavi se kao demo@firma.com
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (authError) {
      console.error('❌ Greška pri prijavljivanju:', authError.message)
      return
    }
    
    console.log('   ✅ Prijavljen kao demo@firma.com')
    
    // Pozovi /api/tenants
    const response = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('❌ API greška:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('   Odgovor:', errorText)
      return
    }
    
    const apiData = await response.json()
    console.log('   ✅ API poziv uspešan!')
    console.log('   Broj stanara:', apiData.tenants?.length || 0)
    
    if (apiData.tenants && apiData.tenants.length > 0) {
      console.log('\n📋 Lista stanara iz API-ja:')
      apiData.tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.user.name} (${tenant.user.email})`)
        console.log(`      Zgrada: ${tenant.building.name}`)
        console.log(`      Stan: ${tenant.apartment_number}, Sprat: ${tenant.floor_number}`)
        console.log(`      Status: ${tenant.status}`)
      })
    } else {
      console.log('\n⚠️  Nema stanara u listi!')
      console.log('   Proverite da li je API endpoint ispravno ažuriran.')
    }
    
    console.log('\n🎉 Demo stanar uspešno dodeljen zgradi!')
    console.log('   Sada možete da se prijavite kao demo@firma.com')
    console.log('   i vidite demo@stanar.com u sekciji "Stanari"')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

assignTenantToBuilding()