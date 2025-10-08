const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDemoUsers() {
  console.log('🔍 PROVERA DEMO KORISNIKA')
  console.log('========================')
  
  try {
    // Proverava postojanje korisnika preko admin API-ja
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.log('❌ Ne mogu da dohvatim korisnike:', listError.message)
      return
    }
    
    console.log(`📊 Ukupno korisnika u bazi: ${users.users.length}`)
    
    const demoFirma = users.users.find(u => u.email === 'demo@firma.com')
    if (demoFirma) {
      console.log('✅ demo@firma.com postoji u bazi')
      console.log('   Role:', demoFirma.user_metadata?.role)
      console.log('   Created:', demoFirma.created_at)
      console.log('   ID:', demoFirma.id)
      
      // Pokušaj logovanje sa service role ključem
      console.log('\n🔐 Pokušavam logovanje...')
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'demo@firma.com',
        password: '123456'
      })
      
      if (authError) {
        console.log('❌ Logovanje neuspešno:', authError.message)
        
        // Pokušaj reset password-a
        console.log('\n🔄 Pokušavam reset password-a...')
        const { error: resetError } = await supabase.auth.admin.updateUserById(
          demoFirma.id,
          { password: '123456' }
        )
        
        if (resetError) {
          console.log('❌ Reset password neuspešan:', resetError.message)
        } else {
          console.log('✅ Password resetovan na "123456"')
          
          // Pokušaj ponovo logovanje
          const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
            email: 'demo@firma.com',
            password: '123456'
          })
          
          if (newAuthError) {
            console.log('❌ Logovanje i dalje neuspešno:', newAuthError.message)
          } else {
            console.log('✅ Uspešno logovanje nakon reset-a!')
            return newAuthData
          }
        }
      } else {
        console.log('✅ Uspešno logovanje!')
        return authData
      }
    } else {
      console.log('❌ demo@firma.com ne postoji u bazi')
    }
    
  } catch (error) {
    console.error('❌ Greška:', error.message)
  }
}

checkDemoUsers()