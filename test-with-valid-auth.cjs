const { createClient } = require('@supabase/supabase-js')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjQxNjUsImV4cCI6MjA3NDg0MDE2NX0.240dHMzBAZZU6xEJCDL7NJtVqnz6ZKn3A6_XqkEttd8'

async function testWithValidAuth() {
  try {
    console.log('Testing building update with valid authentication...')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // First, let's try to sign in with a test user
    // We need to create a test user or use an existing one
    console.log('Attempting to sign in with test credentials...')
    
    // Let's try to sign in with demo company account
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: 'demo123'
    })
    
    if (authError) {
      console.log('Auth error:', authError.message)
      
      // Let's try with alternative password
      console.log('Trying with password 123456...')
      const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
        email: 'demo@firma.com',
        password: '123456'
      })
      
      if (authError2) {
        console.error('Both passwords failed:', authError2.message)
        return
      }
      
      console.log('Successfully signed in with alternative password!')
      
      // Use the new auth data
      authData = authData2
    }
    
    if (!authData?.session?.access_token) {
      console.error('No access token available')
      return
    }
    
    console.log('Got access token, testing API call...')
    
    const buildingId = '6a913846-9f0e-456b-b7e9-4d7384aeb7d0'
    const updateData = {
      name: 'Test Building Update',
      address: 'Test Address 123, Belgrade',
      floors_count: 3,
      garage_levels: 1
    }
    
    console.log('Making PUT request to API with auth token...')
    const response = await fetch(`http://localhost:3001/api/buildings/${buildingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      },
      body: JSON.stringify(updateData)
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Response body:', responseText)
    
    if (response.status === 500) {
      console.log('Got 500 error - this is the issue we need to debug!')
    } else if (response.ok) {
      console.log('Success! Building updated successfully.')
    }
    
  } catch (error) {
    console.error('Error in test:', error)
  }
}

testWithValidAuth()