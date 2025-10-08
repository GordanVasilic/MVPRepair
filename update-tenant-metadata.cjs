const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje običnog Supabase klijenta
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function updateTenantMetadata() {
  console.log('🔗 Ažuriranje metadata za demo@stanar.com...\n')
  
  try {
    // 1. Prijavi se kao demo@firma.com da dohvatiš zgrade
    console.log('1. Prijavljivanje kao demo@firma.com...')
    const { data: companyAuth, error: companyAuthError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (companyAuthError) {
      console.error('❌ Greška pri prijavljivanju firme:', companyAuthError.message)
      return
    }
    
    console.log('✅ Prijavljen kao demo@firma.com')
    
    // 2. Dohvati zgrade firme
    console.log('\n2. Dohvatanje zgrada firme...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', companyAuth.user.id)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    if (buildings.length === 0) {
      console.error('❌ Firma nema zgrade!')
      return
    }
    
    const targetBuilding = buildings[0]
    console.log('✅ Ciljna zgrada:', targetBuilding.name, '(ID:', targetBuilding.id + ')')
    
    // 3. Odjavi se i prijavi kao stanar
    console.log('\n3. Prijavljivanje kao demo@stanar.com...')
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
    
    // 4. Ažuriraj metadata stanara
    console.log('\n4. Ažuriranje metadata stanara...')
    
    const updatedMetadata = {
      role: 'tenant',
      name: 'Demo Stanar',
      building_id: targetBuilding.id,
      apartment: '1A',
      floor: '1',
      entrance: 'A',
      notes: 'Demo stanar dodeljen demo zgradi'
    }
    
    const { data: updateResult, error: updateError } = await supabase.auth.updateUser({
      data: updatedMetadata
    })
    
    if (updateError) {
      console.error('❌ Greška pri ažuriranju metadata:', updateError.message)
      return
    }
    
    console.log('✅ Metadata stanara ažuriran')
    console.log('   Building ID:', targetBuilding.id)
    console.log('   Stan:', '1A')
    console.log('   Sprat:', '1')
    console.log('   Ime:', 'Demo Stanar')
    
    // 5. Odjavi se i prijavi kao firma za testiranje
    console.log('\n5. Testiranje API poziva...')
    await supabase.auth.signOut()
    
    const { data: testAuth, error: testAuthError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (testAuthError) {
      console.error('❌ Greška pri test prijavljivanju:', testAuthError.message)
      return
    }
    
    console.log('   ✅ Prijavljen kao demo@firma.com za test')
    
    // Pozovi /api/tenants
    const response = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testAuth.session.access_token}`,
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
      console.log('   Možda je potrebno da restartujete server ili proverite API endpoint.')
    }
    
    console.log('\n🎉 Demo stanar uspešno dodeljen zgradi!')
    console.log('   Sada možete da se prijavite kao demo@firma.com')
    console.log('   i vidite demo@stanar.com u sekciji "Stanari"')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

updateTenantMetadata()