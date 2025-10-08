const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🏢 KREIRANJE NEDOSTAJUĆIH COMPANY KORISNIKA')
console.log('==========================================')

async function createMissingCompanyUsers() {
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Admin klijent kreiran')
    
    // Lista company korisnika koji treba da postoje
    const companyUsers = [
      {
        email: 'demo@firma.com',
        name: 'Demo Firma',
        password: 'demo123'
      },
      {
        email: 'demo1@firma.com', 
        name: 'Demo Firma 1',
        password: 'demo123'
      },
      {
        email: 'demo2@firma.com',
        name: 'Demo Firma 2', 
        password: 'demo123'
      },
      {
        email: 'demo3@firma.com',
        name: 'Demo Firma 3',
        password: 'demo123'
      },
      {
        email: 'demo4@firma.com',
        name: 'Demo Firma 4',
        password: 'demo123'
      },
      {
        email: 'demo5@firma.com',
        name: 'Demo Firma 5',
        password: 'demo123'
      },
      {
        email: 'demo6@firma.com',
        name: 'Demo Firma 6',
        password: 'demo123'
      }
    ]
    
    // Dohvati postojeće korisnike
    console.log('\n📋 Proveravam postojeće korisnike...')
    const { data: allUsers, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const existingEmails = allUsers.users.map(user => user.email)
    console.log(`👥 Ukupno postojećih korisnika: ${allUsers.users.length}`)
    
    // Kreiraj nedostajuće company korisnike
    let createdCount = 0
    let existingCount = 0
    
    for (const companyUser of companyUsers) {
      if (existingEmails.includes(companyUser.email)) {
        console.log(`ℹ️ ${companyUser.email} već postoji`)
        existingCount++
        continue
      }
      
      console.log(`🔧 Kreiram ${companyUser.email}...`)
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: companyUser.email,
        password: companyUser.password,
        email_confirm: true,
        user_metadata: {
          role: 'company',
          name: companyUser.name
        }
      })
      
      if (createError) {
        console.error(`❌ Greška pri kreiranju ${companyUser.email}:`, createError.message)
      } else {
        console.log(`✅ ${companyUser.email} kreiran uspešno!`)
        console.log(`   User ID: ${newUser.user.id}`)
        createdCount++
      }
      
      // Kratka pauza između kreiranja
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log('\n🎉 ZAVRŠENO!')
    console.log(`📊 Statistike:`)
    console.log(`   ✅ Kreirano: ${createdCount} novih korisnika`)
    console.log(`   ℹ️ Već postojalo: ${existingCount} korisnika`)
    console.log(`   🏢 Ukupno company korisnika: ${createdCount + existingCount}`)
    
    // Verifikacija - ponovo dohvati sve korisnike i prikaži company korisnike
    console.log('\n🔍 VERIFIKACIJA - Company korisnici u sistemu:')
    const { data: updatedUsers, error: verifyError } = await adminClient.auth.admin.listUsers()
    
    if (verifyError) {
      console.error('❌ Greška pri verifikaciji:', verifyError.message)
      return
    }
    
    const companyUsersInSystem = updatedUsers.users.filter(user => 
      user.user_metadata?.role === 'company'
    )
    
    console.log(`📋 Pronađeno ${companyUsersInSystem.length} company korisnika:`)
    companyUsersInSystem.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`)
      console.log(`      ID: ${user.id}`)
      console.log(`      Ime: ${user.user_metadata?.name || 'N/A'}`)
      console.log(`      Kreiran: ${user.created_at}`)
      console.log(`      Email potvrđen: ${user.email_confirmed_at ? 'DA' : 'NE'}`)
    })
    
  } catch (error) {
    console.error('💥 Neočekivana greška:', error.message)
  }
}

createMissingCompanyUsers()