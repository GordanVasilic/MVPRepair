const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje običnog Supabase klijenta
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function debugApiTenants() {
  console.log('🔍 Debug API /api/tenants endpoint...\n')
  
  try {
    // 1. Prijavi se kao demo@firma.com
    console.log('1. Prijavljivanje kao demo@firma.com...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (authError) {
      console.error('❌ Greška pri prijavljivanju:', authError.message)
      return
    }
    
    console.log('✅ Prijavljen kao demo@firma.com')
    console.log('   User ID:', authData.user.id)
    console.log('   Role:', authData.user.user_metadata?.role || authData.user.app_metadata?.role)
    
    // 2. Dohvati zgrade direktno iz baze
    console.log('\n2. Dohvatanje zgrada iz baze...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', authData.user.id)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    console.log('✅ Broj zgrada:', buildings.length)
    buildings.forEach((building, index) => {
      console.log(`   ${index + 1}. ${building.name} (ID: ${building.id})`)
    })
    
    // 3. Pozovi API endpoint sa detaljnim logovima
    console.log('\n3. Pozivanje API endpoint-a...')
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
    console.log('✅ API odgovor:', JSON.stringify(apiData, null, 2))
    
    // 4. Odjavi se i prijavi kao stanar da proverimo metadata
    console.log('\n4. Provera metadata stanara...')
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
    console.log('   Role:', tenantAuth.user.user_metadata?.role || tenantAuth.user.app_metadata?.role)
    console.log('   Building ID:', tenantAuth.user.user_metadata?.building_id)
    console.log('   Apartment:', tenantAuth.user.user_metadata?.apartment)
    console.log('   Floor:', tenantAuth.user.user_metadata?.floor)
    console.log('   Name:', tenantAuth.user.user_metadata?.name)
    console.log('   Full metadata:', JSON.stringify(tenantAuth.user.user_metadata, null, 2))
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

debugApiTenants()