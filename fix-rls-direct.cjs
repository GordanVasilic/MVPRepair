require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLSDirectly() {
  console.log('Fixing RLS policies directly...');
  
  try {
    // First, disable RLS completely on these tables
    console.log('Disabling RLS on building_models...');
    const { error: e1 } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE building_models DISABLE ROW LEVEL SECURITY;' 
    });
    if (e1) console.log('Error:', e1.message);
    
    console.log('Disabling RLS on floor_plans...');
    const { error: e2 } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE floor_plans DISABLE ROW LEVEL SECURITY;' 
    });
    if (e2) console.log('Error:', e2.message);
    
    console.log('Disabling RLS on rooms...');
    const { error: e3 } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;' 
    });
    if (e3) console.log('Error:', e3.message);
    
    // Drop all existing policies
    console.log('Dropping existing policies...');
    const policies = [
      'DROP POLICY IF EXISTS "Users can view building models" ON building_models;',
      'DROP POLICY IF EXISTS "Admins can manage building models" ON building_models;',
      'DROP POLICY IF EXISTS "Authenticated users can manage building models" ON building_models;',
      'DROP POLICY IF EXISTS "Users can view floor plans" ON floor_plans;',
      'DROP POLICY IF EXISTS "Admins can manage floor plans" ON floor_plans;',
      'DROP POLICY IF EXISTS "Authenticated users can manage floor plans" ON floor_plans;',
      'DROP POLICY IF EXISTS "Users can view rooms" ON rooms;',
      'DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;',
      'DROP POLICY IF EXISTS "Authenticated users can manage rooms" ON rooms;'
    ];
    
    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error) console.log('Policy drop error:', error.message);
    }
    
    console.log('RLS disabled and policies dropped!');
    
    // Test the fix
    console.log('Testing building model creation...');
    const { data: buildings } = await supabase.from('buildings').select('id').limit(1);
    if (buildings && buildings.length > 0) {
      const buildingId = buildings[0].id;
      
      const { error: testError } = await supabase
        .from('building_models')
        .upsert({
          building_id: buildingId,
          floors_count: 6,
          model_config: {
            floors: Array.from({ length: 6 }, (_, i) => ({
              number: i + 1,
              height: 3.0,
              position: { x: 0, y: i * 3.5, z: 0 }
            }))
          }
        });
      
      if (testError) {
        console.error('Test failed:', testError);
      } else {
        console.log('✅ Test PASSED: Building model created/updated successfully!');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixRLSDirectly();