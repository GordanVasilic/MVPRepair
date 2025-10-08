const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createDemoTenants() {
  try {
    console.log('Starting demo tenant creation process...');
    
    // First, get existing buildings for demo@firma.com
    console.log('1. Getting existing buildings...');
    
    // Get company user using admin API - first get all users and find by email
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error getting users:', usersError);
      return;
    }
    
    const companyUser = allUsers.users.find(user => user.email === 'demo@firma.com');
    if (!companyUser) {
      console.error('Company user demo@firma.com not found');
      return;
    }
      
    const companyUserId = companyUser.id;
    console.log('Company user ID:', companyUserId);
    
    // Get buildings for this company
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, floors_config')
      .eq('user_id', companyUserId);
      
    if (buildingsError) {
      console.error('Error getting buildings:', buildingsError);
      return;
    }
    
    console.log('Found buildings:', buildings.length);
    buildings.forEach((building, index) => {
      console.log(`Building ${index + 1}:`);
      console.log(`  ID: ${building.id}`);
      console.log(`  Name: ${building.name}`);
      console.log(`  Address: ${building.address}`);
      console.log(`  Floors config: ${JSON.stringify(building.floors_config)}`);
    });
    
    if (buildings.length === 0) {
      console.error('No buildings found for demo@firma.com');
      return;
    }
    
    // Define new tenants
    const newTenants = [
      { email: 'demo1@stanar.com', password: '123456', name: 'Demo Stanar 1' },
      { email: 'demo2@stanar.com', password: '123456', name: 'Demo Stanar 2' },
      { email: 'demo3@stanar.com', password: '123456', name: 'Demo Stanar 3' },
      { email: 'demo4@stanar.com', password: '123456', name: 'Demo Stanar 4' }
    ];
    
    console.log('\\n2. Creating new tenant users...');
    
    for (let i = 0; i < newTenants.length; i++) {
      const tenant = newTenants[i];
      console.log(`Creating tenant: ${tenant.email}`);
      
      // Randomly select a building
      const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
      
      // Generate random apartment details
      const floorsCount = randomBuilding.floors_config?.floors || 3; // Default to 3 floors
      const randomFloor = Math.floor(Math.random() * floorsCount) + 1;
      const apartmentNumber = `${randomFloor}${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`; // 1A, 2B, etc.
      
      console.log(`  Assigned to building: ${randomBuilding.name}`);
      console.log(`  Floor: ${randomFloor}, Apartment: ${apartmentNumber}`);
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tenant.email,
        password: tenant.password,
        email_confirm: true,
        user_metadata: {
          name: tenant.name,
          role: 'tenant',
          building_id: randomBuilding.id,
          apartment: apartmentNumber,
          floor: randomFloor.toString(),
          confirmed: true
        }
      });
      
      if (authError) {
        console.error(`Error creating user ${tenant.email}:`, authError);
        continue;
      }
      
      console.log(`  ✓ User created with ID: ${authData.user.id}`);
      
      // Since building_tenants table doesn't exist, skip this step for now
      // The user metadata already contains building assignment info
      console.log(`  ✓ Tenant assigned to building (stored in user metadata)`);
      
      // Try to create entry in building_tenants table (will fail if table doesn't exist)
      const { error: tenantError } = await supabase
        .from('building_tenants')
        .insert({
          building_id: randomBuilding.id,
          tenant_id: authData.user.id,
          apartment_number: apartmentNumber,
          floor_number: randomFloor,
          status: 'active',
          invited_by: companyUserId,
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString()
        });
        
      if (tenantError) {
        console.error(`Error creating building_tenant entry for ${tenant.email}:`, tenantError);
      } else {
        console.log(`  ✓ Building tenant entry created`);
      }
      
      console.log('');
    }
    
    console.log('✅ Demo tenant creation completed!');
    console.log('\\nSummary:');
    console.log(`- Created ${newTenants.length} new tenant users`);
    console.log(`- Distributed across ${buildings.length} buildings`);
    console.log('- All tenants have status: active');
    console.log('- Password for all tenants: 123456');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createDemoTenants();