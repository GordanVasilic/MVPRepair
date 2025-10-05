const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixExistingBuildings() {
  console.log('=== FIXING EXISTING BUILDINGS ===');
  
  // Get all buildings without building_models
  const { data: buildings, error: buildingsError } = await supabase
    .from('buildings')
    .select(`
      *,
      building_models (id)
    `);
  
  if (buildingsError) {
    console.error('Error fetching buildings:', buildingsError);
    return;
  }

  console.log('Total buildings found:', buildings?.length || 0);
  
  const buildingsWithoutModels = buildings?.filter(b => !b.building_models || b.building_models.length === 0) || [];
  console.log('Buildings without models:', buildingsWithoutModels.length);

  for (const building of buildingsWithoutModels) {
    console.log(`\nCreating model for building: ${building.name} (ID: ${building.id})`);
    
    const floors_count = 3; // Default to 3 floors
    
    const { data: buildingModel, error: modelError } = await supabase
      .from('building_models')
      .insert([{
        building_id: building.id,
        floors_count,
        model_config: {
          floors: Array.from({ length: floors_count }, (_, i) => ({
            number: i + 1,
            height: 3.0,
            position: { x: 0, y: i * 3.5, z: 0 }
          }))
        }
      }])
      .select()
      .single();

    if (modelError) {
      console.error(`Error creating model for ${building.name}:`, modelError);
    } else {
      console.log(`✓ Created model with ${floors_count} floors for ${building.name}`);
    }

    // Also create floor plans
    const floorPlans = Array.from({ length: floors_count }, (_, i) => ({
      building_id: building.id,
      floor_number: i + 1,
      plan_config: {
        width: 100,
        height: 100,
        grid_size: 1
      },
      rooms: []
    }));

    const { error: floorPlansError } = await supabase
      .from('floor_plans')
      .insert(floorPlans);

    if (floorPlansError) {
      console.error(`Error creating floor plans for ${building.name}:`, floorPlansError);
    } else {
      console.log(`✓ Created ${floors_count} floor plans for ${building.name}`);
    }
  }

  console.log('\n=== VERIFICATION ===');
  // Verify the fix
  const { data: verifyBuildings, error: verifyError } = await supabase
    .from('buildings')
    .select(`
      *,
      building_models (
        id,
        floors_count,
        model_config
      )
    `);
  
  if (verifyError) {
    console.error('Verification error:', verifyError);
  } else {
    console.log('Buildings with models after fix:', verifyBuildings?.length || 0);
    verifyBuildings?.forEach(b => {
      console.log(`- ${b.name}: ${b.building_models?.length || 0} models`);
      b.building_models?.forEach(m => console.log(`  └─ ${m.floors_count} floors`));
    });
  }
}

fixExistingBuildings().catch(console.error);