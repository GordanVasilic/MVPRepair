require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function resetDemoPassword() {
  console.log('🔧 RESETOVANJE LOZINKE ZA DEMO KORISNIKE');
  console.log('=======================================');

  try {
    // Kreiraj admin klijent
    const adminClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Admin klijent kreiran');

    // Resetuj lozinku za demo@firma.com
    console.log('\n🔐 Resetujem lozinku za demo@firma.com...');
    const { data: updateData1, error: updateError1 } = await adminClient.auth.admin.updateUserById(
      '28d52d6c-40e1-4c69-bbae-02995dbf9376', // ID za demo@firma.com
      { password: 'demo123' }
    );

    if (updateError1) {
      console.error('❌ Greška pri resetovanju lozinke za demo@firma.com:', updateError1.message);
    } else {
      console.log('✅ Lozinka za demo@firma.com resetovana na "demo123"');
    }

    // Resetuj lozinku za demo@stanar.com
    console.log('\n🔐 Resetujem lozinku za demo@stanar.com...');
    const { data: updateData2, error: updateError2 } = await adminClient.auth.admin.updateUserById(
      '31eb01f9-886a-486c-adf0-48e7263100a8', // ID za demo@stanar.com
      { password: 'demo123' }
    );

    if (updateError2) {
      console.error('❌ Greška pri resetovanju lozinke za demo@stanar.com:', updateError2.message);
    } else {
      console.log('✅ Lozinka za demo@stanar.com resetovana na "demo123"');
    }

    // Testiraj login
    console.log('\n🧪 TESTIRAM LOGIN...');
    const anonClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: 'demo123'
    });

    if (loginError) {
      console.error('❌ Login test neuspešan:', loginError.message);
    } else {
      console.log('✅ Login test uspešan!');
      console.log('   User ID:', loginData.user.id);
      console.log('   Email:', loginData.user.email);
    }

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

resetDemoPassword();