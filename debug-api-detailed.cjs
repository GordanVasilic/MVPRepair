const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta sa service role ključem
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Kreiranje običnog Supabase klijenta
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function debugApiDetailed() {
  console.log('🔍 Detaljno debug API /api/tenants endpoint...\n')
  
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
    
    // 2. Dohvati zgrade firme
    console.log('\n2. Dohvatanje zgrada firme...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', authData.user.id)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    console.log('✅ Broj zgrada:', buildings.length)
    const buildingIds = buildings.map(b => b.id)
    console.log('   Building IDs:', buildingIds)
    
    // 3. Dohvati sve korisnike sa admin klijentom
    console.log('\n3. Dohvatanje svih korisnika sa admin klijentom...')
    const { data: allUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    console.log('✅ Ukupno korisnika:', allUsers.users.length)
    
    // 4. Filtriraj stanare
    console.log('\n4. Filtriranje stanara...')
    const tenantUsers = allUsers.users.filter(user => {
      const role = user.user_metadata?.role || user.app_metadata?.role;
      return role === 'tenant';
    })
    
    console.log('✅ Ukupno stanara:', tenantUsers.length)
    tenantUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`)
      console.log(`      Role: ${user.user_metadata?.role || user.app_metadata?.role}`)
      console.log(`      Building ID: ${user.user_metadata?.building_id}`)
      console.log(`      Apartment: ${user.user_metadata?.apartment}`)
      console.log(`      Name: ${user.user_metadata?.name}`)
    })
    
    // 5. Filtriraj stanare koji su dodeljeni zgradama firme
    console.log('\n5. Filtriranje stanara dodeljenih zgradama firme...')
    const assignedTenants = tenantUsers.filter(user => {
      const buildingId = user.user_metadata?.building_id;
      const isAssigned = buildingId && buildingIds.includes(buildingId);
      console.log(`   Checking ${user.email}: building_id=${buildingId}, isAssigned=${isAssigned}`)
      return isAssigned;
    })
    
    console.log('✅ Stanari dodeljeni zgradama firme:', assignedTenants.length)
    assignedTenants.forEach((user, index) => {
      const building = buildings.find(b => b.id === user.user_metadata?.building_id);
      console.log(`   ${index + 1}. ${user.email}`)
      console.log(`      Building: ${building?.name} (${user.user_metadata?.building_id})`)
      console.log(`      Apartment: ${user.user_metadata?.apartment}`)
    })
    
    // 6. Pozovi API endpoint
    console.log('\n6. Pozivanje API endpoint-a...')
    const response = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API greška:', response.status, errorText)
      return
    }
    
    const apiData = await response.json()
    console.log('✅ API odgovor:', JSON.stringify(apiData, null, 2))
    
    console.log('\n🎯 Zaključak:')
    console.log(`   - Firma ima ${buildings.length} zgrada`)
    console.log(`   - Ukupno stanara u sistemu: ${tenantUsers.length}`)
    console.log(`   - Stanara dodeljenih firminom zgradi: ${assignedTenants.length}`)
    console.log(`   - API vraća: ${apiData.tenants?.length || 0} stanara`)
    
    if (assignedTenants.length > 0 && (apiData.tenants?.length || 0) === 0) {
      console.log('\n⚠️  Problem: Postoje dodeljeni stanari ali API ih ne vraća!')
      console.log('   Možda je problem u API logici ili server konfiguraciji.')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

debugApiDetailed()