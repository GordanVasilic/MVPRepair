require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createBuildingTenantsSimple() {
  console.log('🔧 KREIRAM BUILDING_TENANTS TABELU (JEDNOSTAVNO)');
  console.log('===============================================');

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

    // Pokušaj direktno da kreiraš tabelu kroz SQL upit
    console.log('📝 Pokušavam da kreiram building_tenants tabelu...');
    
    const { data, error } = await adminClient
      .from('building_tenants')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log('❌ Tabela ne postoji, ali ne mogu je kreirati kroz Supabase klijent');
      console.log('🔍 Proveravam da li postoji neki drugi način...');
      
      // Pokušaj da kreiraš zapis direktno - ovo će možda kreirati tabelu
      console.log('🧪 Pokušavam da kreiram zapis (možda će kreirati tabelu)...');
      
      const { data: insertData, error: insertError } = await adminClient
        .from('building_tenants')
        .insert({
          building_id: '6a913846-9f0e-456b-b7e9-4d7384aeb7d0',
          tenant_id: '31eb01f9-886a-486c-adf0-48e7263100a8',
          apartment_number: '1A',
          floor_number: 1,
          status: 'active'
        });

      if (insertError) {
        console.log('❌ Ne mogu da kreiram zapis:', insertError.message);
        console.log('💡 Možda treba da kreiram tabelu kroz migracije ili SQL editor u Supabase dashboard-u');
      } else {
        console.log('✅ Zapis kreiran - tabela verovatno postoji!');
      }
    } else if (error) {
      console.log('❌ Druga greška:', error.message);
    } else {
      console.log('✅ Tabela već postoji!');
      console.log('📊 Broj postojećih zapisa:', data?.length || 0);
    }

    // Pokušaj da dohvatim sve postojeće zapise
    console.log('\n📋 Pokušavam da dohvatim postojeće zapise...');
    const { data: allData, error: allError } = await adminClient
      .from('building_tenants')
      .select('*');

    if (allError) {
      console.log('❌ Greška pri dohvatanju:', allError.message);
    } else {
      console.log('✅ Uspešno dohvaćeno:', allData?.length || 0, 'zapisa');
      if (allData && allData.length > 0) {
        console.log('📄 Prvi zapis:', JSON.stringify(allData[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

createBuildingTenantsSimple();