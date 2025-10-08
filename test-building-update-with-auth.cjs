const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')

const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjQxNjUsImV4cCI6MjA3NDg0MDE2NX0.240dHMzBAZZU6xEJCDL7NJtVqnz6ZKn3A6_XqkEttd8'

async function testBuildingUpdate() {
  try {
    console.log('Testing building update with authentication...')
    
    // First, let's try to authenticate as a company user
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Try to get a company user
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'company')
      .limit(1)
    
    if (usersError) {
      console.error('Error fetching company users:', usersError)
      return
    }
    
    if (!users || users.length === 0) {
      console.log('No company users found')
      return
    }
    
    const companyUser = users[0]
    console.log('Found company user:', companyUser.email)
    
    // Try to sign in as this user (this won't work without password, but let's see what happens)
    console.log('Attempting to create a session...')
    
    // Let's try a different approach - create a test with service role
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return
    }
    
    const supabaseService = createClient(supabaseUrl, serviceRoleKey)
    
    // Test the building update directly via API call with service role auth
    const buildingId = '6a913846-9f0e-456b-b7e9-4d7384aeb7d0'
    const updateData = {
      name: 'Test Building Update',
      floors_count: 3,
      garage_levels: 1
    }
    
    console.log('Making PUT request to API...')
    const response = await fetch(`http://localhost:3001/api/buildings/${buildingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify(updateData)
    })
    
    console.log('Response status:', response.status)
    const responseText = await response.text()
    console.log('Response body:', responseText)
    
    if (!response.ok) {
      console.error('API request failed')
      return
    }
    
    console.log('Building update successful!')
    
  } catch (error) {
    console.error('Error in test:', error)
  }
}

testBuildingUpdate()