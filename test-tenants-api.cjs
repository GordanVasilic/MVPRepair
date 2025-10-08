const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testTenantsAPI() {
  console.log('🔍 Testiranje /api/tenants endpoint...\n')
  
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
    
    console.log('✅ Uspešno prijavljen kao:', authData.user.email)
    
    // 2. Testiraj /api/tenants endpoint
    console.log('\n2. Pozivanje /api/tenants endpoint...')
    const token = authData.session.access_token
    
    const response = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('❌ HTTP greška:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('   Odgovor:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('✅ Uspešan odgovor od API-ja')
    console.log('   Broj stanara:', data.tenants?.length || 0)
    
    if (data.tenants && data.tenants.length > 0) {
      console.log('\n📋 Lista stanara:')
      data.tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.user.name} (${tenant.user.email})`)
        console.log(`      Zgrada: ${tenant.building.name}`)
        console.log(`      Stan: ${tenant.apartment_number}, Sprat: ${tenant.floor_number}`)
        console.log(`      Status: ${tenant.status}`)
        console.log('')
      })
    } else {
      console.log('\n⚠️  Nema stanara u listi!')
      console.log('   Ovo može značiti:')
      console.log('   - Demo podaci nisu kreirani')
      console.log('   - Nema veze između demo@stanar.com i demo@firma.com')
      console.log('   - Problem sa RLS politikama')
    }
    
    // 3. Proveravamo direktno building_tenants tabelu
    console.log('\n3. Direktna provera building_tenants tabele...')
    const { data: directTenants, error: directError } = await supabase
      .from('building_tenants')
      .select(`
        *,
        buildings(name, address, user_id)
      `)
    
    if (directError) {
      console.error('❌ Greška pri direktnom dohvatanju:', directError.message)
    } else {
      console.log(`   Ukupno zapisa u building_tenants: ${directTenants.length}`)
      
      if (directTenants.length > 0) {
        console.log('\n   Svi zapisi:')
        directTenants.forEach((tenant, index) => {
          console.log(`   ${index + 1}. User ID: ${tenant.user_id}`)
          console.log(`      Building ID: ${tenant.building_id}`)
          console.log(`      Zgrada vlasnik: ${tenant.buildings?.user_id}`)
          console.log(`      Stan: ${tenant.apartment_number}`)
          console.log(`      Status: ${tenant.status}`)
          console.log('')
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

testTenantsAPI()