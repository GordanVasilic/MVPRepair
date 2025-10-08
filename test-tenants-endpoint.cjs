require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testTenantsEndpoint() {
  console.log('🔍 TESTIRANJE /api/tenants ENDPOINT-a');
  console.log('=====================================');

  try {
    // Kreiraj Supabase klijent
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Logiraj se kao demo@firma.com
    console.log('🔐 Logovanje kao demo@firma.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: 'demo123'
    });

    if (authError) {
      console.error('❌ Greška pri logovanju:', authError.message);
      return;
    }

    console.log('✅ Uspešno logovanje!');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    console.log('   Access Token:', authData.session.access_token.substring(0, 50) + '...');

    // Testiraj /api/tenants endpoint
    console.log('\n📡 Pozivam /api/tenants endpoint...');
    const response = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    });

    console.log('   Status:', response.status);
    console.log('   Status Text:', response.statusText);

    const responseText = await response.text();
    console.log('   Response:', responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ USPEŠAN ODGOVOR:');
        console.log('   Broj stanara:', data.length || 0);
        if (data.length > 0) {
          data.forEach((tenant, index) => {
            console.log(`   ${index + 1}. ${tenant.name || tenant.email} (${tenant.email})`);
            console.log(`      Zgrada: ${tenant.building_name || 'N/A'}`);
            console.log(`      Stan: ${tenant.apartment || 'N/A'}`);
          });
        }
      } catch (parseError) {
        console.log('✅ Odgovor je uspešan ali nije JSON:', responseText);
      }
    } else {
      console.log('❌ NEUSPEŠAN ODGOVOR:', responseText);
    }

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

testTenantsEndpoint();