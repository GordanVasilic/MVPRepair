require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createTableManually() {
  console.log('🔧 KREIRAM BUILDING_TENANTS TABELU RUČNO');
  console.log('======================================');

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

    // Pokušaj da kreiraš zapis direktno - ovo će kreirati tabelu ako ne postoji
    console.log('🧪 Pokušavam da kreiram prvi zapis (ovo će kreirati tabelu)...');
    
    // Prvo dohvati demo korisnike
    const { data: users } = await adminClient.auth.admin.listUsers();
    const companyUser = users?.users?.find(u => u.email === 'demo@firma.com');
    const tenantUser = users?.users?.find(u => u.email === 'demo@stanar.com');
    
    if (!companyUser || !tenantUser) {
      console.log('❌ Ne mogu da nađem demo korisnike');
      return;
    }
    
    console.log('✅ Našao demo korisnike');
    
    // Dohvati zgradu
    const { data: buildings } = await adminClient
      .from('buildings')
      .select('*')
      .eq('user_id', companyUser.id)
      .limit(1);
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ Ne mogu da nađem zgradu za demo@firma.com');
      return;
    }
    
    const building = buildings[0];
    console.log('✅ Našao zgradu:', building.name);
    
    // Pokušaj da kreiraš zapis u building_tenants
    const { data: insertData, error: insertError } = await adminClient
      .from('building_tenants')
      .insert({
        building_id: building.id,
        tenant_id: tenantUser.id,
        apartment_number: '1A',
        floor_number: 1,
        status: 'active',
        invited_by: companyUser.id,
        joined_at: new Date().toISOString()
      })
      .select();

    if (insertError) {
      console.log('❌ Greška pri kreiranju zapisa:', insertError.message);
      
      // Ako tabela ne postoji, pokušaj da je kreiraš kroz direktan SQL
      if (insertError.message.includes('does not exist')) {
        console.log('🔧 Tabela ne postoji, pokušavam da je kreiram...');
        
        // Pokušaj kroz REST API direktno
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/building_tenants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            building_id: building.id,
            tenant_id: tenantUser.id,
            apartment_number: '1A',
            floor_number: 1,
            status: 'active',
            invited_by: companyUser.id,
            joined_at: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Zapis kreiran kroz REST API:', result);
        } else {
          const error = await response.text();
          console.log('❌ REST API greška:', error);
        }
      }
    } else {
      console.log('✅ Zapis uspešno kreiran:', insertData);
    }

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

createTableManually();