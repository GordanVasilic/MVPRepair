const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testInviteRegisterFlow() {
  console.log('🔍 Testiranje invite i register funkcionalnosti...\n')
  
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
    const token = authData.session.access_token
    
    // 2. Dohvati zgrade
    console.log('\n2. Dohvatanje zgrada...')
    const buildingsResponse = await fetch('http://localhost:3001/api/buildings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!buildingsResponse.ok) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsResponse.status)
      return
    }
    
    const buildingsData = await buildingsResponse.json()
    console.log('✅ Pronađeno zgrada:', buildingsData.buildings?.length || 0)
    
    if (!buildingsData.buildings || buildingsData.buildings.length === 0) {
      console.error('❌ Nema zgrada za testiranje')
      return
    }
    
    const testBuilding = buildingsData.buildings[0]
    console.log('   Koristim zgradu:', testBuilding.name, '(ID:', testBuilding.id + ')')
    
    // 3. Get apartments for the building
    console.log('\n3. Dohvatanje stanova za zgradu...')
    const apartmentsResponse = await fetch(`http://localhost:3001/api/buildings/${testBuilding.id}/apartments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!apartmentsResponse.ok) {
      const errorText = await apartmentsResponse.text()
      console.error('❌ Greška pri dohvatanju stanova:', apartmentsResponse.status, errorText)
      return
    }
    
    const apartmentsData = await apartmentsResponse.json()
    console.log('✅ Pronađeno stanova:', apartmentsData.apartments?.length || 0)
    
    if (!apartmentsData.apartments || apartmentsData.apartments.length === 0) {
      console.error('❌ Nema stanova u zgradi za testiranje')
      return
    }
    
    const testApartment = apartmentsData.apartments[0]
    console.log('   Koristim stan:', testApartment.apartment_number, '(ID:', testApartment.id + ')')

    // 4. Testiraj invite endpoint
    console.log('\n4. Testiranje invite endpoint...')
    const testEmail = `test-${Date.now()}@example.com`
    
    const inviteResponse = await fetch('http://localhost:3001/api/tenants/invite', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        apartment_id: testApartment.id
      })
    })
    
    if (!inviteResponse.ok) {
      const errorText = await inviteResponse.text()
      console.error('❌ Greška pri slanju pozivnice:', inviteResponse.status, errorText)
      return
    }
    
    const inviteData = await inviteResponse.json()
    console.log('✅ Pozivnica uspešno poslana!')
    console.log('   Email:', inviteData.invitation.email)
    console.log('   Token:', inviteData.invitation.invite_token)
    console.log('   Zgrada:', inviteData.invitation.building.name)
    console.log('   Stan:', inviteData.invitation.apartment.apartment_number)
    
    // 5. Testiraj register endpoint
    console.log('\n5. Testiranje register endpoint...')
    const registerResponse = await fetch(`http://localhost:3001/api/tenants/register/${inviteData.invitation.invite_token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Stanar',
        password: 'test123456'
      })
    })
    
    if (!registerResponse.ok) {
      const errorText = await registerResponse.text()
      console.error('❌ Greška pri registraciji:', registerResponse.status, errorText)
      return
    }
    
    const registerData = await registerResponse.json()
    console.log('✅ Registracija uspešna!')
    console.log('   User ID:', registerData.user.id)
    console.log('   Name:', registerData.user.name)
    console.log('   Email:', registerData.user.email)
    console.log('   Zgrada:', registerData.tenant.building_name)
    console.log('   Stan:', registerData.tenant.apartment?.apartment_number || 'N/A')
    
    // 6. Proveri da li je kreiran zapis u apartment_tenants
    console.log('\n6. Proverava apartment_tenants tabelu...')
    const tenantsResponse = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (tenantsResponse.ok) {
      const tenantsData = await tenantsResponse.json()
      const newTenant = tenantsData.tenants.find(t => t.user.email === testEmail)
      
      if (newTenant) {
        console.log('✅ Novi stanar pronađen u apartment_tenants tabeli!')
        console.log('   ID:', newTenant.id)
        console.log('   Name:', newTenant.user.name)
        console.log('   Email:', newTenant.user.email)
        console.log('   Status:', newTenant.status)
        console.log('   Stan:', newTenant.apartment?.apartment_number || 'N/A')
      } else {
        console.log('❌ Novi stanar NIJE pronađen u apartment_tenants tabeli')
      }
    }
    
    console.log('\n✅ Test invite/register funkcionalnosti završen!')
    
  } catch (error) {
    console.error('❌ Greška tokom testiranja:', error)
  }
}

testInviteRegisterFlow()