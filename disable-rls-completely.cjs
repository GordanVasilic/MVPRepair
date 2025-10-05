require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function disableRLSCompletely() {
  console.log('Attempting to disable RLS completely...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Test if we can insert/update directly
    console.log('Testing direct database operations...');
    
    // Test 1: Try to select existing building models
    console.log('Test 1: Selecting existing building models...');
    const { data: existingModels, error: selectError } = await supabase
      .from('building_models')
      .select('*')
      .eq('building_id', '79d95eac-646b-44e6-a00d-ebd999ed6179');
    
    console.log('Select result:', { existingModels, selectError });

    // Test 2: Try to upsert
    console.log('Test 2: Attempting upsert...');
    const { data: upsertData, error: upsertError } = await supabase
      .from('building_models')
      .upsert({
        building_id: '79d95eac-646b-44e6-a00d-ebd999ed6179',
        floors_count: 6,
        model_config: {
          floors: Array.from({ length: 6 }, (_, i) => ({
            number: i + 1,
            height: 3.0,
            position: { x: 0, y: i * 3.5, z: 0 }
          }))
        },
        updated_at: new Date().toISOString()
      })
      .select();
    
    console.log('Upsert result:', { upsertData, upsertError });

    if (upsertError) {
      console.error('❌ Upsert still failing:', upsertError);
      
      // Try alternative approach - direct insert/update
      if (existingModels && existingModels.length > 0) {
        console.log('Trying direct update...');
        const { data: updateData, error: updateError } = await supabase
          .from('building_models')
          .update({
            floors_count: 6,
            model_config: {
              floors: Array.from({ length: 6 }, (_, i) => ({
                number: i + 1,
                height: 3.0,
                position: { x: 0, y: i * 3.5, z: 0 }
              }))
            },
            updated_at: new Date().toISOString()
          })
          .eq('building_id', '79d95eac-646b-44e6-a00d-ebd999ed6179')
          .select();
        
        console.log('Direct update result:', { updateData, updateError });
      } else {
        console.log('Trying direct insert...');
        const { data: insertData, error: insertError } = await supabase
          .from('building_models')
          .insert({
            building_id: '79d95eac-646b-44e6-a00d-ebd999ed6179',
            floors_count: 6,
            model_config: {
              floors: Array.from({ length: 6 }, (_, i) => ({
                number: i + 1,
                height: 3.0,
                position: { x: 0, y: i * 3.5, z: 0 }
              }))
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
        
        console.log('Direct insert result:', { insertData, insertError });
      }
    } else {
      console.log('✅ Upsert successful!');
    }

  } catch (error) {
    console.error('Error in RLS disable process:', error);
  }
}

disableRLSCompletely().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});