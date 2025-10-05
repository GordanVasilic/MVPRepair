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

// Kreiranje običnog klijenta za testiranje
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function confirmDemoUsers() {
  console.log('🔐 Potvrđivanje email adresa demo korisnika...')
  
  try {
    // Dobij listu korisnika
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Greška pri dobijanju liste korisnika:', listError.message)
      return
    }

    // Pronađi demo korisnike
    const demoUsers = users.users.filter(user => 
      user.email === 'demo@stanar.com' || user.email === 'demo@firma.com'
    )

    console.log(`📋 Pronađeno ${demoUsers.length} demo korisnika`)

    // Potvrdi email za svakog demo korisnika
    for (const user of demoUsers) {
      console.log(`📧 Potvrđujem email za: ${user.email}`)
      
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      )

      if (error) {
        console.error(`❌ Greška pri potvrđivanju ${user.email}:`, error.message)
      } else {
        console.log(`✅ Email potvrđen za: ${user.email}`)
      }
    }

    console.log('\n🔍 Testiranje prijave nakon potvrde...')
    
    // Test prijave stanara
    console.log('📝 Testiranje prijave stanara...')
    const { data: tenantLogin, error: tenantLoginError } = await supabase.auth.signInWithPassword({
      email: 'demo@stanar.com',
      password: '123456'
    })
    
    if (tenantLoginError) {
      console.error('❌ Greška pri prijavi stanara:', tenantLoginError.message)
    } else {
      console.log('✅ Stanar se uspešno prijavio:', tenantLogin.user?.email)
      console.log('   Uloga:', tenantLogin.user?.user_metadata?.role)
      console.log('   Email potvrđen:', tenantLogin.user?.email_confirmed_at ? 'DA' : 'NE')
    }
    
    await supabase.auth.signOut()
    
    // Test prijave firme
    console.log('📝 Testiranje prijave firme...')
    const { data: companyLogin, error: companyLoginError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (companyLoginError) {
      console.error('❌ Greška pri prijavi firme:', companyLoginError.message)
    } else {
      console.log('✅ Firma se uspešno prijavila:', companyLogin.user?.email)
      console.log('   Uloga:', companyLogin.user?.user_metadata?.role)
      console.log('   Email potvrđen:', companyLogin.user?.email_confirmed_at ? 'DA' : 'NE')
    }
    
    await supabase.auth.signOut()

    console.log('\n🎉 Demo korisnici su spremni za korišćenje!')
    console.log('📋 Možete se prijaviti sa:')
    console.log('   👤 Stanar: demo@stanar.com / 123456')
    console.log('   🏢 Firma: demo@firma.com / 123456')

  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

// Pokretanje skripte
confirmDemoUsers()