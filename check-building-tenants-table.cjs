require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkBuildingTenantsTable() {
  console.log('🔍 PROVERAVAM BUILDING_TENANTS TABELU');
  console.log('====================================');

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

    // Proveri da li tabela postoji
    console.log('\n📋 Proveravam da li building_tenants tabela postoji...');
    const { data: tables, error: tablesError } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'building_tenants');

    if (tablesError) {
      console.error('❌ Greška pri proveri tabela:', tablesError.message);
      return;
    }

    if (!tables || tables.length === 0) {
      console.log('❌ building_tenants tabela NE POSTOJI!');
      console.log('📝 Dostupne tabele:');
      
      const { data: allTables } = await adminClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      allTables?.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
      return;
    }

    console.log('✅ building_tenants tabela POSTOJI');

    // Dohvati sve zapise iz building_tenants tabele
    console.log('\n📊 Dohvatam sve zapise iz building_tenants tabele...');
    const { data: buildingTenants, error: buildingTenantsError } = await adminClient
      .from('building_tenants')
      .select('*');

    if (buildingTenantsError) {
      console.error('❌ Greška pri dohvatanju building_tenants:', buildingTenantsError.message);
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
    const { data: demoFirma } = await adminClient.auth.admin.listUsers();
    const firmaUser = demoFirma?.users?.find(u => u.email === 'demo@firma.com');
    const stanarUser = demoFirma?.users?.find(u => u.email === 'demo@stanar.com');

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

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

checkBuildingTenantsTable();