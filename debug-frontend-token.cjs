const { createClient } = require('@supabase/supabase-js');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔧 Environment check:');
console.log('SUPABASE_URL:', supabaseUrl ? 'exists' : 'missing');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'exists' : 'missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'exists' : 'missing');

// Create clients like in the API
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to test token validation like in the API
async function testTokenValidation(token) {
  console.log('\n🔍 Testing token validation...');
  console.log('Token length:', token ? token.length : 'undefined');
  console.log('Token starts with:', token ? token.substring(0, 20) + '...' : 'undefined');
  
  try {
    // Test with anon client (like in the API)
    console.log('\n📡 Testing with anon client (like in API)...');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
      console.log('Error details:', authError);
      return null;
    }
    
    if (!user) {
      console.log('❌ No user returned');
      return null;
    }
    
    console.log('✅ User authenticated successfully:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Role:', user.user_metadata?.role);
    console.log('- Created at:', user.created_at);
    
    return user;
  } catch (error) {
    console.log('❌ Exception during token validation:', error.message);
    return null;
  }
}

// Test with a placeholder token first
const placeholderToken = 'PASTE_ACTUAL_TOKEN_HERE';

if (placeholderToken === 'PASTE_ACTUAL_TOKEN_HERE') {
  console.log('\n⚠️  Please replace PASTE_ACTUAL_TOKEN_HERE with the actual token from the browser console');
  console.log('Look for the access_token in the frontend logs and paste it here');
} else {
  testTokenValidation(placeholderToken);
}