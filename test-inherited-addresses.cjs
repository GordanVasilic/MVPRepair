const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLoadInheritedAddresses() {
  console.log('🔍 Testiram loadInheritedAddresses logiku...');
  
  const tenantId = '31eb01f9-886a-486c-adf0-48e7263100a8';
  
  // Dohvati building_tenants podatke
  const { data: buildingTenants, error: buildingTenantsError } = await supabase
    .from('building_tenants')
    .select(`
      *,
      buildings!inner(
        id,
        name,
        address,
        company_id
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active');
    
  if (buildingTenantsError) {
    console.error('❌ Greška pri dohvatanju building_tenants:', buildingTenantsError);
    return;
  }
  
  console.log('📋 Building tenants sa zgradama:', JSON.stringify(buildingTenants, null, 2));
  
  if (!buildingTenants || buildingTenants.length === 0) {
    console.log('⚠️ Nema building_tenants zapisa');
    return;
  }
  
  // Kreiraj nasleđene adrese
  const inheritedAddresses = buildingTenants.map(bt => {
    const building = bt.buildings;
    const fullAddress = building.address;
    const [streetAddress, city] = fullAddress.split(', ').slice(-2);
    
    return {
      id: `inherited-${bt.id}`,
      name: `${building.name} - Stan ${bt.apartment_number}`,
      streetAddress: streetAddress || building.address,
      city: city || 'Zagreb', // Default city
      apartment: bt.apartment_number,
      floor: bt.floor_number?.toString() || '',
      entrance: bt.entrance || '',
      isDefault: false,
      isInherited: true,
      buildingId: building.id,
      companyId: building.company_id
    };
  });
  
  console.log('🏠 Nasleđene adrese:', JSON.stringify(inheritedAddresses, null, 2));
}

testLoadInheritedAddresses().catch(console.error);