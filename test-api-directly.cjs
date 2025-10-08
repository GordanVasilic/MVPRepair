const { createClient } = require('@supabase/supabase-js')

async function testApiDirectly() {
  console.log('🔍 Testing API directly with proper auth...')
  
  const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjQxNjUsImV4cCI6MjA3NDg0MDE2NX0.240dHMzBAZZU6xEJCDL7NJtVqnz6ZKn3A6_XqkEttd8'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2NDE2NSwiZXhwIjoyMDc0ODQwMTY1fQ.VWKTgCeK4TfWZEm6n3elmEBlz-X1ieumPk0QXN-uN5E'
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Find a company user and get their auth token
    console.log('\n1. Finding company user...')
    
    const { data: companies, error: companiesError } = await supabaseService
      .from('companies')
      .select('user_id, name')
      .limit(1)
    
    if (companiesError || !companies || companies.length === 0) {
      console.error('❌ No companies found:', companiesError)
      return
    }
    
    const companyUserId = companies[0].user_id
    console.log('✅ Found company user ID:', companyUserId)
    
    // Get user details
    const { data: userData, error: userError } = await supabaseService.auth.admin.getUserById(companyUserId)
    
    if (userError || !userData.user) {
      console.error('❌ Error getting user details:', userError)
      return
    }
    
    console.log('✅ User details:', userData.user.email, userData.user.user_metadata?.role)
    
    // Generate access token for this user
    const { data: tokenData, error: tokenError } = await supabaseService.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
      options: {
        redirectTo: 'http://localhost:5173'
      }
    })
    
    if (tokenError) {
      console.error('❌ Error generating token:', tokenError)
      return
    }
    
    console.log('✅ Generated auth link')
    
    // 2. Find a building to test with
    console.log('\n2. Finding building...')
    
    const { data: buildings, error: buildingsError } = await supabaseService
      .from('buildings')
      .select('id, name, address, description, garage_levels')
      .limit(1)
    
    if (buildingsError || !buildings || buildings.length === 0) {
      console.error('❌ No buildings found:', buildingsError)
      return
    }
    
    const testBuilding = buildings[0]
    console.log('✅ Found building:', testBuilding.name, testBuilding.id)
    
    // 3. Test API call with different auth methods
    console.log('\n3. Testing API calls...')
    
    const updateData = {
      name: testBuilding.name,
      address: testBuilding.address,
      description: (testBuilding.description || '') + ' - API Test ' + new Date().toISOString(),
      floors_count: 3,
      garage_levels: testBuilding.garage_levels || 0
    }
    
    console.log('Update data:', updateData)
    
    // Test 1: With service role key as Bearer token (should fail - wrong usage)
    console.log('\n3a. Testing with service role key as Bearer...')
    try {
      const response1 = await fetch(`http://localhost:3001/api/buildings/${testBuilding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('Service role response status:', response1.status)
      const responseText1 = await response1.text()
      console.log('Service role response:', responseText1)
      
    } catch (error1) {
      console.error('Service role test error:', error1.message)
    }
    
    // Test 2: Create a proper user session
    console.log('\n3b. Creating proper user session...')
    
    // Sign in as the company user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email!,
      password: 'temp-password' // This won't work, but let's try
    })
    
    if (signInError) {
      console.log('Password sign-in failed (expected):', signInError.message)
      
      // Try with OTP
      const { data: otpData, error: otpError } = await supabase.auth.signInWithOtp({
        email: userData.user.email!,
        options: {
          shouldCreateUser: false
        }
      })
      
      if (otpError) {
        console.log('OTP sign-in failed:', otpError.message)
      } else {
        console.log('OTP sent successfully')
      }
    }
    
    // Test 3: Use admin to create session token
    console.log('\n3c. Using admin to create session...')
    
    const { data: sessionData, error: sessionError } = await supabaseService.auth.admin.createUser({
      email: userData.user.email!,
      email_confirm: true,
      user_metadata: userData.user.user_metadata
    })
    
    if (sessionError && sessionError.message !== 'User already registered') {
      console.error('Session creation error:', sessionError)
    } else {
      console.log('User session ready')
    }
    
    // Test 4: Direct API call without auth to see the exact error
    console.log('\n3d. Testing without auth to see error...')
    try {
      const response4 = await fetch(`http://localhost:3001/api/buildings/${testBuilding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('No auth response status:', response4.status)
      const responseText4 = await response4.text()
      console.log('No auth response:', responseText4)
      
    } catch (error4) {
      console.error('No auth test error:', error4.message)
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testApiDirectly()