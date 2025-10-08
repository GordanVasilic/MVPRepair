const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function debugBrowserSession() {
  console.log('🔍 DEBUGGING BROWSER SESSION ISSUE')
  console.log('==================================')
  
  try {
    // 1. Logiraj se kao demo@firma.com
    console.log('1. Logovanje kao demo@firma.com...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (authError) {
      console.error('❌ Greška pri logovanju:', authError.message)
      return
    }
    
    console.log('✅ Uspešno logovanje')
    
    // 2. Proverava session storage
    console.log('\n2. Analiza session podataka...')
    console.log('📋 Session info:')
    console.log('   - Access Token:', authData.session.access_token.substring(0, 50) + '...')
    console.log('   - Refresh Token:', authData.session.refresh_token.substring(0, 50) + '...')
    console.log('   - Token Type:', authData.session.token_type)
    console.log('   - Expires At:', new Date(authData.session.expires_at * 1000))
    
    // 3. Proverava user metadata
    console.log('\n3. User metadata analiza...')
    console.log('📋 User info:')
    console.log('   - ID:', authData.user.id)
    console.log('   - Email:', authData.user.email)
    console.log('   - Email Confirmed:', authData.user.email_confirmed_at ? 'DA' : 'NE')
    console.log('   - User Metadata:', JSON.stringify(authData.user.user_metadata, null, 2))
    console.log('   - App Metadata:', JSON.stringify(authData.user.app_metadata, null, 2))
    
    // 4. Simuliraj browser session storage
    console.log('\n4. Simulacija browser session storage...')
    
    // Ovo je ono što browser čuva u localStorage/sessionStorage
    const sessionData = {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at,
      token_type: authData.session.token_type,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        user_metadata: authData.user.user_metadata,
        app_metadata: authData.user.app_metadata
      }
    }
    
    console.log('📋 Session data za browser:')
    console.log(JSON.stringify(sessionData, null, 2))
    
    // 5. Testiraj refresh token
    console.log('\n5. Testiranje refresh token-a...')
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: authData.session.refresh_token
    })
    
    if (refreshError) {
      console.error('❌ Refresh token ne radi:', refreshError.message)
    } else {
      console.log('✅ Refresh token radi')
      console.log('   - Novi access token:', refreshData.session.access_token.substring(0, 50) + '...')
      console.log('   - Isti kao stari?', refreshData.session.access_token === authData.session.access_token ? 'DA' : 'NE')
    }
    
    // 6. Proverava RLS policies
    console.log('\n6. Testiranje RLS policies...')
    
    // Testiraj direktan pristup buildings tabeli
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .limit(1)
    
    if (buildingsError) {
      console.error('❌ RLS greška za buildings:', buildingsError.message)
    } else {
      console.log('✅ RLS radi za buildings:', buildings.length, 'rezultata')
    }
    
    // 7. Proverava auth.users pristup
    console.log('\n7. Testiranje auth.users pristupa...')
    
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(1)
    
    if (usersError) {
      console.error('❌ Nema pristupa auth.users:', usersError.message)
      console.log('   - Ovo je očekivano, auth.users nije dostupna preko RLS')
    } else {
      console.log('✅ Ima pristup auth.users (neočekivano):', users.length, 'rezultata')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

debugBrowserSession()