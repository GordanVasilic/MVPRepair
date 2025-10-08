const { createClient } = require('@supabase/supabase-js')

// Supabase konfiguracija
const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjQxNjUsImV4cCI6MjA3NDg0MDE2NX0.240dHMzBAZZU6xEJCDL7NJtVqnz6ZKn3A6_XqkEttd8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAutoLogin() {
  console.log('🔧 Testiranje auto-login funkcionalnosti...')
  
  try {
    // Pokušaj prijave
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@firma.com',
      password: 'demo123'
    })

    if (error) {
      console.error('❌ Greška pri prijavi:', error.message)
      return
    }

    if (data.user && data.session) {
      console.log('✅ Uspešna prijava!')
      console.log('👤 Korisnik:', data.user.email)
      console.log('🔑 Session token:', data.session.access_token.substring(0, 20) + '...')
      
      // Sačuvaj session u localStorage format za browser
      const sessionData = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user
      }
      
      console.log('\n📋 Session podaci za localStorage:')
      console.log('Key: sb-hszbpaoqoijzkileutnu-auth-token')
      console.log('Value:', JSON.stringify(sessionData, null, 2))
      
      // Test odjave
      console.log('\n👋 Testiram odjavu...')
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.error('❌ Greška pri odjavi:', signOutError.message)
      } else {
        console.log('✅ Uspešna odjava!')
      }
      
    } else {
      console.log('❌ Nema korisnika ili sesije')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

// Pokreni test
testAutoLogin()