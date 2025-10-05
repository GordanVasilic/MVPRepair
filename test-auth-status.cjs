const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testAuthStatus() {
  try {
    console.log('Testing authentication status...')
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
    
    console.log('Supabase URL:', supabaseUrl)
    console.log('Anon Key exists:', !!supabaseAnonKey)
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Check current session
    console.log('\nChecking current session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('Session error:', sessionError.message)
    } else if (session) {
      console.log('Session exists:', !!session.access_token)
      console.log('User email:', session.user?.email)
      console.log('User role:', session.user?.user_metadata?.role || session.user?.app_metadata?.role || 'No role')
      console.log('Access token preview:', session.access_token?.substring(0, 20) + '...')
    } else {
      console.log('No active session - user is not logged in')
    }
    
    // Check user
    console.log('\nChecking current user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('User error:', userError.message)
    } else if (user) {
      console.log('User exists:', user.email)
      console.log('User role:', user.user_metadata?.role || user.app_metadata?.role || 'No role')
    } else {
      console.log('No authenticated user')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testAuthStatus()