const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('👥 PROVERAVAM DA LI DEMO KORISNICI POSTOJE')
console.log('==========================================')

async function checkDemoUsers() {
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Admin klijent kreiran')
    
    // Dohvata sve korisnike
    console.log('\n📋 Dohvatam sve korisnike...')
    const { data: allUsers, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    console.log(`👥 Ukupno korisnika: ${allUsers.users.length}`)
    
    // Proverava demo@firma.com
    const companyUser = allUsers.users.find(user => user.email === 'demo@firma.com')
    if (companyUser) {
      console.log('\n✅ demo@firma.com POSTOJI!')
      console.log('   User ID:', companyUser.id)
      console.log('   Email potvrđen:', companyUser.email_confirmed_at ? 'DA' : 'NE')
      console.log('   Kreiran:', companyUser.created_at)
      console.log('   Metadata:', JSON.stringify(companyUser.user_metadata, null, 2))
    } else {
      console.log('\n❌ demo@firma.com NE POSTOJI!')
    }
    
    // Proverava demo@stanar.com
    const tenantUser = allUsers.users.find(user => user.email === 'demo@stanar.com')
    if (tenantUser) {
      console.log('\n✅ demo@stanar.com POSTOJI!')
      console.log('   User ID:', tenantUser.id)
      console.log('   Email potvrđen:', tenantUser.email_confirmed_at ? 'DA' : 'NE')
      console.log('   Kreiran:', tenantUser.created_at)
      console.log('   Metadata:', JSON.stringify(tenantUser.user_metadata, null, 2))
    } else {
      console.log('\n❌ demo@stanar.com NE POSTOJI!')
    }
    
    // Lista svih korisnika
    console.log('\n📋 SVI KORISNICI U SISTEMU:')
    allUsers.users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`)
      console.log(`      Potvrđen: ${user.email_confirmed_at ? 'DA' : 'NE'}`)
      console.log(`      Role: ${user.user_metadata?.role || 'N/A'}`)
    })
    
    // Ako demo@firma.com ne postoji, kreiraj ga
    if (!companyUser) {
      console.log('\n🔧 KREIRAM demo@firma.com...')
      const { data: newCompanyUser, error: createError } = await adminClient.auth.admin.createUser({
        email: 'demo@firma.com',
        password: 'demo123',
        email_confirm: true,
        user_metadata: {
          role: 'company',
          name: 'Demo Firma'
        }
      })
      
      if (createError) {
        console.error('❌ Greška pri kreiranju demo@firma.com:', createError.message)
      } else {
        console.log('✅ demo@firma.com kreiran uspešno!')
        console.log('   User ID:', newCompanyUser.user.id)
      }
    }
    
    // Ako demo@stanar.com ne postoji, kreiraj ga
    if (!tenantUser) {
      console.log('\n🔧 KREIRAM demo@stanar.com...')
      const { data: newTenantUser, error: createError } = await adminClient.auth.admin.createUser({
        email: 'demo@stanar.com',
        password: 'demo123',
        email_confirm: true,
        user_metadata: {
          role: 'tenant',
          name: 'Demo Stanar',
          building_id: null, // Biće postavljen kasnije
          apartment_number: '1A',
          floor_number: 1
        }
      })
      
      if (createError) {
        console.error('❌ Greška pri kreiranju demo@stanar.com:', createError.message)
      } else {
        console.log('✅ demo@stanar.com kreiran uspešno!')
        console.log('   User ID:', newTenantUser.user.id)
      }
    }
    
  } catch (error) {
    console.error('💥 Neočekivana greška:', error.message)
  }
}

checkDemoUsers()