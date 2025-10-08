require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkBuildingTenantsSimple() {
  console.log('🔍 PROVERAVAM BUILDING_TENANTS TABELU (JEDNOSTAVNO)');
  console.log('==================================================');

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

    // Pokušaj direktno da dohvatiš building_tenants
    console.log('\n📊 Pokušavam da dohvatim building_tenants...');
    const { data: buildingTenants, error: buildingTenantsError } = await adminClient
      .from('building_tenants')
      .select('*');

    if (buildingTenantsError) {
      console.error('❌ Greška pri dohvatanju building_tenants:', buildingTenantsError.message);
      console.log('🔍 Možda tabela ne postoji. Pokušavam da proverim druge tabele...');
      
      // Pokušaj da dohvatiš buildings
      const { data: buildings, error: buildingsError } = await adminClient
        .from('buildings')
        .select('*');
      
      if (buildingsError) {
        console.error('❌ Greška pri dohvatanju buildings:', buildingsError.message);
      } else {
        console.log(`✅ Buildings tabela postoji sa ${buildings?.length || 0} zapisa`);
      }
      
      return;
    }

    console.log(`📈 Ukupno zapisa u building_tenants: ${buildingTenants?.length || 0}`);

    if (buildingTenants && buildingTenants.length > 0) {
      buildingTenants.forEach((record, index) => {
        console.log(`\n${index + 1}. ZAPIS:`);
        console.log(`   ID: ${record.id}`);
        console.log(`   Building ID: ${record.building_id}`);
        console.log(`   Tenant ID: ${record.tenant_id}`);
        console.log(`   Apartment: ${record.apartment_number || 'N/A'}`);
        console.log(`   Floor: ${record.floor_number || 'N/A'}`);
        console.log(`   Status: ${record.status || 'N/A'}`);
        console.log(`   Joined At: ${record.joined_at || 'N/A'}`);
      });
    } else {
      console.log('❌ NEMA ZAPISA u building_tenants tabeli!');
    }

    // Proveri demo korisnike
    console.log('\n👥 Proveravam demo korisnike...');
    const { data: demoUsers } = await adminClient.auth.admin.listUsers();
    const firmaUser = demoUsers?.users?.find(u => u.email === 'demo@firma.com');
    const stanarUser = demoUsers?.users?.find(u => u.email === 'demo@stanar.com');

    if (firmaUser) {
      console.log(`✅ demo@firma.com ID: ${firmaUser.id}`);
    } else {
      console.log('❌ demo@firma.com NE POSTOJI');
    }

    if (stanarUser) {
      console.log(`✅ demo@stanar.com ID: ${stanarUser.id}`);
    } else {
      console.log('❌ demo@stanar.com NE POSTOJI');
    }

    // Proveri buildings tabelu
    console.log('\n🏢 Proveravam buildings tabelu...');
    const { data: buildings, error: buildingsError } = await adminClient
      .from('buildings')
      .select('*');

    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju buildings:', buildingsError.message);
    } else {
      console.log(`📈 Ukupno zgrada: ${buildings?.length || 0}`);
      if (buildings && buildings.length > 0) {
        buildings.forEach((building, index) => {
          console.log(`   ${index + 1}. ${building.name} (ID: ${building.id}) - Owner: ${building.user_id}`);
        });
      }
    }

    // Ako nema building_tenants zapisa, pokušaj da kreiraš konekciju
    if (!buildingTenants || buildingTenants.length === 0) {
      console.log('\n🔧 NEMA BUILDING_TENANTS ZAPISA - KREIRAM DEMO KONEKCIJU...');
      
      if (firmaUser && stanarUser && buildings && buildings.length > 0) {
        const demoBuilding = buildings.find(b => b.user_id === firmaUser.id);
        
        if (demoBuilding) {
          console.log(`🏢 Koristim zgradu: ${demoBuilding.name} (ID: ${demoBuilding.id})`);
          
          const { data: newConnection, error: connectionError } = await adminClient
            .from('building_tenants')
            .insert({
              building_id: demoBuilding.id,
              tenant_id: stanarUser.id,
              apartment_number: '1A',
              floor_number: 1,
              status: 'active',
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
        } else {
          console.log('❌ Nema zgrada za demo@firma.com');
        }
      } else {
        console.log('❌ Nedostaju demo korisnici ili zgrade');
      }
    }

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

checkBuildingTenantsSimple();