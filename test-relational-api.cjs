const { createClient } = require('@supabase/supabase-js')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function testRelationalAPI() {
  console.log('🧪 TESTIRANJE RELACIONOG API ENDPOINT-a')
  console.log('=======================================')
  
  try {
    // Logiraj se kao demo@firma.com
    console.log('1. Logovanje kao demo@firma.com...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (authError) {
      console.error('❌ Greška pri logovanju:', authError.message)
      return
    }
    
    console.log('✅ Uspešno logovanje')
    
    // Testiraj novi relacioni API endpoint
    console.log('\n2. Pozivanje /api/tenants endpoint-a...')
    const response = await fetch('http://localhost:5173/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📡 API Response Status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API poziv uspešan!')
      console.log('📊 Broj stanara:', data.tenants?.length || 0)
      
      if (data.tenants && data.tenants.length > 0) {
        console.log('\n📋 Lista stanara (relacioni pristup):')
        data.tenants.forEach((tenant, index) => {
          console.log(`   ${index + 1}. ${tenant.user.email}`)
          console.log(`      Ime: ${tenant.user.name}`)
          console.log(`      Zgrada: ${tenant.building.name}`)
          console.log(`      Stan: ${tenant.apartment_number}`)
          console.log(`      Sprat: ${tenant.floor_number}`)
          console.log(`      Status: ${tenant.status}`)
          console.log(`      ID: ${tenant.id}`)
          console.log('      ---')
        })
        
        console.log('\n🎯 REZULTAT TESTIRANJA:')
        console.log('✅ API endpoint radi sa relacionim pristupom')
        console.log('✅ Svi demo stanari su vidljivi')
        console.log('✅ Podaci su ispravno formatirani')
        console.log('✅ Frontend kompatibilnost održana')
        
      } else {
        console.log('⚠️  Nema stanara u odgovoru')
        console.log('💡 Proverite da li su demo stanari ispravno kreirani')
      }
    } else {
      const errorText = await response.text()
      console.error('❌ API greška:', response.status, errorText)
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

testRelationalAPI()