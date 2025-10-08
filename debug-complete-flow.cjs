const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

console.log('🔍 POTPUNA DIJAGNOSTIKA STANARA')
console.log('================================')

async function debugCompleteFlow() {
  try {
    // 1. Kreiranje admin klijenta
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    console.log('\n1️⃣ ADMIN KLIJENT KREIRAN')
    
    // 2. Kreiranje anon klijenta za login
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    console.log('2️⃣ ANON KLIJENT KREIRAN')
    
    // 3. Login kao demo@firma.com
    console.log('\n3️⃣ POKUŠAVAM LOGIN KAO demo@firma.com...')
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: 'demo123'
    })
    
    if (authError) {
      console.error('❌ Greška pri login-u:', authError.message)
      return
    }
    
    const companyUserId = authData.user.id
    console.log('✅ Uspešan login! Company User ID:', companyUserId)
    
    // 4. Proverava buildings za demo@firma.com
    console.log('\n4️⃣ PROVERAVAM ZGRADE ZA demo@firma.com...')
    const { data: buildings, error: buildingsError } = await adminClient
      .from('buildings')
      .select('*')
      .eq('user_id', companyUserId)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    console.log(`📊 Pronađeno ${buildings.length} zgrada:`)
    buildings.forEach((building, index) => {
      console.log(`   ${index + 1}. ${building.name} (ID: ${building.id})`)
      console.log(`      Adresa: ${building.address}`)
    })
    
    if (buildings.length === 0) {
      console.log('⚠️  NEMA ZGRADA ZA demo@firma.com!')
      return
    }
    
    const buildingIds = buildings.map(b => b.id)
    
    // 5. Proverava sve korisnike u sistemu
    console.log('\n5️⃣ PROVERAVAM SVE KORISNIKE U SISTEMU...')
    const { data: allUsers, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    console.log(`👥 Ukupno korisnika u sistemu: ${allUsers.users.length}`)
    
    // Pronalazi demo@stanar.com
    const tenantUser = allUsers.users.find(user => user.email === 'demo@stanar.com')
    if (!tenantUser) {
      console.log('❌ demo@stanar.com NIJE PRONAĐEN U SISTEMU!')
      return
    }
    
    console.log('✅ demo@stanar.com pronađen! User ID:', tenantUser.id)
    console.log('📋 Metadata:', JSON.stringify(tenantUser.user_metadata, null, 2))
    
    // 6. Proverava building_tenants tabelu
    console.log('\n6️⃣ PROVERAVAM BUILDING_TENANTS TABELU...')
    const { data: buildingTenants, error: btError } = await adminClient
      .from('building_tenants')
      .select('*')
    
    if (btError) {
      console.error('❌ Greška pri dohvatanju building_tenants:', btError.message)
      return
    }
    
    console.log(`📊 Ukupno zapisa u building_tenants: ${buildingTenants.length}`)
    buildingTenants.forEach((bt, index) => {
      console.log(`   ${index + 1}. User ID: ${bt.user_id}, Building ID: ${bt.building_id}`)
      console.log(`      Stan: ${bt.apartment_number}, Sprat: ${bt.floor_number}`)
    })
    
    // Proverava da li postoji veza između demo@stanar.com i zgrada od demo@firma.com
    const tenantConnection = buildingTenants.find(bt => 
      bt.user_id === tenantUser.id && buildingIds.includes(bt.building_id)
    )
    
    if (!tenantConnection) {
      console.log('❌ NEMA VEZE IZMEĐU demo@stanar.com I ZGRADA OD demo@firma.com!')
      console.log('🔧 KREIRAM VEZU...')
      
      // Kreiranje veze
      const { data: newConnection, error: connectionError } = await adminClient
        .from('building_tenants')
        .insert({
          user_id: tenantUser.id,
          building_id: buildingIds[0], // Prva zgrada
          apartment_number: '1A',
          floor_number: 1,
          status: 'active'
        })
        .select()
      
      if (connectionError) {
        console.error('❌ Greška pri kreiranju veze:', connectionError.message)
        return
      }
      
      console.log('✅ Veza kreirana uspešno!')
    } else {
      console.log('✅ Veza postoji:', tenantConnection)
    }
    
    // 7. Testira /api/tenants endpoint
    console.log('\n7️⃣ TESTIRAM /api/tenants ENDPOINT...')
    
    const token = authData.session.access_token
    console.log('🔑 Token:', token.substring(0, 50) + '...')
    
    const response = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const apiResult = await response.json()
    console.log('📡 API Response Status:', response.status)
    console.log('📡 API Response:', JSON.stringify(apiResult, null, 2))
    
    if (apiResult.success && apiResult.tenants) {
      console.log(`✅ API vraća ${apiResult.tenants.length} stanara`)
      apiResult.tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.user.name} (${tenant.user.email})`)
        console.log(`      Zgrada: ${tenant.building.name}`)
        console.log(`      Stan: ${tenant.apartment_number}, Sprat: ${tenant.floor_number}`)
      })
    } else {
      console.log('❌ API ne vraća stanare ili ima grešku')
    }
    
    console.log('\n🎯 DIJAGNOSTIKA ZAVRŠENA!')
    
  } catch (error) {
    console.error('💥 Neočekivana greška:', error.message)
  }
}

debugCompleteFlow()