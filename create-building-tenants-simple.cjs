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
        console.error('❌ Greška pri kreiranju zapisa:', insertError.message);
        
        // Možda tabela postoji pod drugim imenom?
        console.log('\n🔍 Proveravam alternativne nazive tabela...');
        
        const alternativeNames = ['tenant_buildings', 'user_buildings', 'building_users', 'tenants'];
        
        for (const tableName of alternativeNames) {
          console.log(`   Proveravam: ${tableName}`);
          const { data: altData, error: altError } = await adminClient
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!altError) {
            console.log(`   ✅ ${tableName} postoji sa ${altData?.length || 0} zapisa`);
          } else {
            console.log(`   ❌ ${tableName}: ${altError.message}`);
          }
        }
        
      } else {
        console.log('✅ Zapis kreiran - tabela sada postoji!');
      }
      
    } else if (error) {
      console.error('❌ Druga greška:', error.message);
    } else {
      console.log('✅ building_tenants tabela već postoji');
    }

    // Sada pokušaj da kreiraš demo konekciju
    console.log('\n🔗 KREIRAM DEMO KONEKCIJU...');
    
    // Dohvati demo korisnike
    const { data: demoUsers } = await adminClient.auth.admin.listUsers();
    const firmaUser = demoUsers?.users?.find(u => u.email === 'demo@firma.com');
    const stanarUser = demoUsers?.users?.find(u => u.email === 'demo@stanar.com');

    if (!firmaUser || !stanarUser) {
      console.error('❌ Demo korisnici ne postoje');
      return;
    }

    console.log(`✅ demo@firma.com ID: ${firmaUser.id}`);
    console.log(`✅ demo@stanar.com ID: ${stanarUser.id}`);

    // Dohvati demo zgradu
    const { data: buildings, error: buildingsError } = await adminClient
      .from('buildings')
      .select('*')
      .eq('user_id', firmaUser.id);

    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message);
      return;
    }

    if (!buildings || buildings.length === 0) {
      console.error('❌ Nema zgrada za demo@firma.com');
      return;
    }

    const demoBuilding = buildings[0];
    console.log(`🏢 Koristim zgradu: ${demoBuilding.name} (ID: ${demoBuilding.id})`);

    // Kreiraj konekciju
    const { data: newConnection, error: connectionError } = await adminClient
      .from('building_tenants')
      .insert({
        building_id: demoBuilding.id,
        tenant_id: stanarUser.id,
        apartment_number: '1A',
        floor_number: 1,
        status: 'active',
        invited_by: firmaUser.id,
        joined_at: new Date().toISOString(),
        invited_at: new Date().toISOString()
      })
      .select();

    if (connectionError) {
      console.error('❌ Greška pri kreiranju konekcije:', connectionError.message);
    } else {
      console.log('✅ DEMO KONEKCIJA KREIRANA!');
      console.log('   Konekcija:', newConnection);
    }

    // Testiraj da li radi
    console.log('\n🧪 TESTIRAM KONEKCIJU...');
    const { data: testTenants, error: testError } = await adminClient
      .from('building_tenants')
      .select('*');

    if (testError) {
      console.error('❌ Greška pri testiranju:', testError.message);
    } else {
      console.log(`✅ Test uspešan - ${testTenants?.length || 0} zapisa u building_tenants`);
      if (testTenants && testTenants.length > 0) {
        testTenants.forEach((tenant, index) => {
          console.log(`   ${index + 1}. Building: ${tenant.building_id}, Tenant: ${tenant.tenant_id}, Apartment: ${tenant.apartment_number}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

createBuildingTenantsSimple();