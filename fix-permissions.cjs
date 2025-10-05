const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPermissions() {
  console.log('Fixing building_models permissions...');
  
  try {
    // Test connection first
    const { data, error } = await supabase.from('building_models').select('id').limit(1);
    if (error) {
      console.error('Connection test failed:', error);
      return;
    }
    console.log('Connection successful');
    
    // Try to update a building model to test permissions
    const { data: buildings } = await supabase.from('buildings').select('id').limit(1);
    if (buildings && buildings.length > 0) {
      const buildingId = buildings[0].id;
      
      // Try to create or update building model
      const { data: existingModel } = await supabase
        .from('building_models')
        .select('id')
        .eq('building_id', buildingId)
        .single();
      
      if (existingModel) {
        // Update existing model
        const { error: updateError } = await supabase
          .from('building_models')
          .update({
            floors_count: 6,
            model_config: {
              floors: Array.from({ length: 6 }, (_, i) => ({
                number: i + 1,
                height: 3.0,
                position: { x: 0, y: i * 3.5, z: 0 }
              }))
            }
          })
          .eq('building_id', buildingId);
        
        if (updateError) {
          console.error('Error updating building model:', updateError);
        } else {
          console.log('Successfully updated building model with 6 floors');
        }
      } else {
        // Create new model
        const { error: createError } = await supabase
          .from('building_models')
          .insert({
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
        
        if (createError) {
          console.error('Error creating building model:', createError);
        } else {
          console.log('Successfully created building model with 6 floors');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixPermissions().catch(console.error);