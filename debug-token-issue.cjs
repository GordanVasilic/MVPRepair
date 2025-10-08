const { createClient } = require('@supabase/supabase-js')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function debugTokenIssue() {
  console.log('🔍 DEBUGGING TOKEN ISSUE')
  console.log('========================')
  
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
    console.log('📋 Session data:')
    console.log('   - User ID:', authData.user.id)
    console.log('   - Email:', authData.user.email)
    console.log('   - Access Token length:', authData.session.access_token.length)
    console.log('   - Access Token preview:', authData.session.access_token.substring(0, 50) + '...')
    console.log('   - Token type:', authData.session.token_type)
    console.log('   - Expires at:', new Date(authData.session.expires_at * 1000))
    
    // 2. Testiraj token direktno sa Supabase klijentom
    console.log('\n2. Testiranje token-a sa Supabase klijentom...')
    
    // Kreiraj novi klijent sa access token-om
    const authenticatedClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`
          }
        }
      }
    )
    
    // Testiraj da li token radi sa Supabase
    const { data: userData, error: userError } = await authenticatedClient.auth.getUser()
    
    if (userError) {
      console.error('❌ Token ne radi sa Supabase:', userError.message)
    } else {
      console.log('✅ Token radi sa Supabase')
      console.log('   - User ID:', userData.user.id)
      console.log('   - Email:', userData.user.email)
    }
    
    // 3. Testiraj API endpoint direktno
    console.log('\n3. Testiranje API endpoint-a direktno...')
    
    const response = await fetch('http://localhost:5173/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📡 API Response Status:', response.status)
    console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API poziv uspešan!')
      console.log('📊 Response data:', data)
    } else {
      const errorText = await response.text()
      console.error('❌ API greška:', response.status, errorText)
      
      // Pokušaj da parsiraš error kao JSON
      try {
        const errorJson = JSON.parse(errorText)
        console.log('📋 Error details:', errorJson)
      } catch (e) {
        console.log('📋 Raw error text:', errorText)
      }
    }
    
    // 4. Proverava da li je token valjan
    console.log('\n4. Analiza token-a...')
    
    try {
      // Dekoduj JWT token (bez verifikacije)
      const tokenParts = authData.session.access_token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
        console.log('📋 Token payload:')
        console.log('   - iss (issuer):', payload.iss)
        console.log('   - sub (subject):', payload.sub)
        console.log('   - aud (audience):', payload.aud)
        console.log('   - exp (expires):', new Date(payload.exp * 1000))
        console.log('   - iat (issued at):', new Date(payload.iat * 1000))
        console.log('   - role:', payload.role)
        console.log('   - email:', payload.email)
        
        // Proverava da li je token istekao
        const now = Math.floor(Date.now() / 1000)
        if (payload.exp < now) {
          console.error('❌ Token je istekao!')
        } else {
          console.log('✅ Token je valjan (nije istekao)')
        }
      }
    } catch (e) {
      console.error('❌ Greška pri dekodiranju token-a:', e.message)
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

debugTokenIssue()