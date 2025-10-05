const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta sa anon ključem (kao frontend)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function createDemoUsers() {
  console.log('🚀 Kreiranje demo korisnika kroz frontend API...')
  
  try {
    // 1. Kreiranje stanara (tenant)
    console.log('📝 Kreiranje stanara: demo@stanar.com')
    const { data: tenantData, error: tenantError } = await supabase.auth.signUp({
      email: 'demo@stanar.com',
      password: '123456',
      options: {
        data: {
          name: 'Demo Stanar',
          role: 'tenant'
        }
      }
    })

    if (tenantError) {
      if (tenantError.message.includes('already registered')) {
        console.log('ℹ️ Stanar već postoji: demo@stanar.com')
      } else {
        console.error('❌ Greška pri kreiranju stanara:', tenantError.message)
      }
    } else {
      console.log('✅ Stanar kreiran uspešno:', tenantData.user?.email)
    }

    // Odjavi se pre kreiranja sledećeg korisnika
    await supabase.auth.signOut()

    // 2. Kreiranje firme (company)
    console.log('📝 Kreiranje firme: demo@firma.com')
    const { data: companyData, error: companyError } = await supabase.auth.signUp({
      email: 'demo@firma.com',
      password: '123456',
      options: {
        data: {
          name: 'Demo Firma',
          role: 'company'
        }
      }
    })

    if (companyError) {
      if (companyError.message.includes('already registered')) {
        console.log('ℹ️ Firma već postoji: demo@firma.com')
      } else {
        console.error('❌ Greška pri kreiranju firme:', companyError.message)
      }
    } else {
      console.log('✅ Firma kreirana uspešno:', companyData.user?.email)
    }

    // Odjavi se
    await supabase.auth.signOut()

    console.log('\n🎉 Proces kreiranja demo korisnika završen!')
    console.log('📋 Možete se prijaviti sa:')
    console.log('   👤 Stanar: demo@stanar.com / 123456')
    console.log('   🏢 Firma: demo@firma.com / 123456')
    
    console.log('\n🔍 Testiranje prijave...')
    
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
    }
    
    await supabase.auth.signOut()

  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

// Pokretanje skripte
createDemoUsers()