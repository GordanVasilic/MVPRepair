const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta sa service role ključem
const supabase = createClient(
  'https://hszbpaoqoijzkileutnu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2NDE2NSwiZXhwIjoyMDc0ODQwMTY1fQ.Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6Ej6E',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function confirmEmails() {
  console.log('🔐 Potvrđivanje email adresa demo korisnika...')
  
  try {
    // Dobij listu korisnika
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Greška pri dobijanju liste korisnika:', listError.message)
      return
    }

    console.log(`📋 Ukupno korisnika u bazi: ${users.users.length}`)

    // Pronađi demo korisnike
    const demoUsers = users.users.filter(user => 
      user.email === 'demo@stanar.com' || user.email === 'demo@firma.com'
    )

    console.log(`📋 Pronađeno ${demoUsers.length} demo korisnika`)

    if (demoUsers.length === 0) {
      console.log('⚠️ Nema demo korisnika za potvrđivanje')
      return
    }

    // Potvrdi email za svakog demo korisnika
    for (const user of demoUsers) {
      console.log(`📧 Potvrđujem email za: ${user.email}`)
      
      const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      )

      if (error) {
        console.error(`❌ Greška pri potvrđivanju ${user.email}:`, error.message)
      } else {
        console.log(`✅ Email potvrđen za: ${user.email}`)
      }
    }

    console.log('\n🎉 Proces potvrđivanja završen!')
    console.log('📋 Sada možete da se prijavite sa:')
    console.log('   👤 Stanar: demo@stanar.com / 123456')
    console.log('   🏢 Firma: demo@firma.com / 123456')

    // Testiranje prijave
    console.log('\n🔍 Testiranje prijave...')
    
    // Kreiranje običnog klijenta za testiranje
    const testClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )
    
    // Test prijave stanara
    console.log('📝 Testiranje prijave stanara...')
    const { data: tenantLogin, error: tenantLoginError } = await testClient.auth.signInWithPassword({
      email: 'demo@stanar.com',
      password: '123456'
    })
    
    if (tenantLoginError) {
      console.error('❌ Greška pri prijavi stanara:', tenantLoginError.message)
    } else {
      console.log('✅ Stanar se uspešno prijavio:', tenantLogin.user?.email)
      console.log('   Uloga:', tenantLogin.user?.user_metadata?.role)
    }
    
    await testClient.auth.signOut()
    
    // Test prijave firme
    console.log('📝 Testiranje prijave firme...')
    const { data: companyLogin, error: companyLoginError } = await testClient.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (companyLoginError) {
      console.error('❌ Greška pri prijavi firme:', companyLoginError.message)
    } else {
      console.log('✅ Firma se uspešno prijavila:', companyLogin.user?.email)
      console.log('   Uloga:', companyLogin.user?.user_metadata?.role)
    }
    
    await testClient.auth.signOut()

  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

// Pokretanje skripte
confirmEmails()