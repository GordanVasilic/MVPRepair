const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testAuthToken() {
  try {
    console.log('Testing auth token generation...')
    
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Try to sign in with a test user
    console.log('\nTrying to sign in...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    })
    
    if (signInError) {
      console.log('Sign in failed (expected):', signInError.message)
      
      // Try to sign up instead
      console.log('\nTrying to sign up...')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
        options: {
          data: {
            role: 'admin'
          }
        }
      })
      
      if (signUpError) {
        console.log('Sign up failed:', signUpError.message)
      } else {
        console.log('Sign up successful:', signUpData.user?.email)
        console.log('Access token:', signUpData.session?.access_token ? 'Generated' : 'Not generated')
      }
    } else {
      console.log('Sign in successful:', signInData.user?.email)
      console.log('Access token:', signInData.session?.access_token ? 'Generated' : 'Not generated')
    }
    
    // Get current session
    console.log('\nChecking current session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('Session error:', sessionError.message)
    } else if (session) {
      console.log('Session exists:', !!session.access_token)
      console.log('User role:', session.user?.user_metadata?.role || session.user?.app_metadata?.role || 'No role')
    } else {
      console.log('No active session')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testAuthToken()