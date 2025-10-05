require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function directSQLTest() {
  console.log('Testing direct SQL operations...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Test direct insert/update using raw SQL
    console.log('\n1. Testing direct SQL insert/update...');
    const insertSQL = `
      INSERT INTO building_models (building_id, floors_count, model_config, created_at, updated_at)
      VALUES (
        '79d95eac-646b-44e6-a00d-ebd999ed6179',
        6,
        '{"floors": [{"number": 1, "height": 3.0, "position": {"x": 0, "y": 0, "z": 0}}, {"number": 2, "height": 3.0, "position": {"x": 0, "y": 3.5, "z": 0}}, {"number": 3, "height": 3.0, "position": {"x": 0, "y": 7.0, "z": 0}}, {"number": 4, "height": 3.0, "position": {"x": 0, "y": 10.5, "z": 0}}, {"number": 5, "height": 3.0, "position": {"x": 0, "y": 14.0, "z": 0}}, {"number": 6, "height": 3.0, "position": {"x": 0, "y": 17.5, "z": 0}}]}',
        NOW(),
        NOW()
      )
      ON CONFLICT (building_id) 
      DO UPDATE SET 
        floors_count = EXCLUDED.floors_count,
        model_config = EXCLUDED.model_config,
        updated_at = EXCLUDED.updated_at;
    `;
    
    // Try using the SQL editor endpoint directly
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql: insertSQL })
    });

    const result = await response.text();
    console.log('Direct SQL result:', { status: response.status, result });

    // Verify the data was inserted
    console.log('\n2. Verifying data...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('building_models')
      .select('*')
      .eq('building_id', '79d95eac-646b-44e6-a00d-ebd999ed6179');
    
    console.log('Verification result:', { verifyData, verifyError });

    // If direct SQL doesn't work, try alternative approach
    if (response.status !== 200) {
      console.log('\n3. Trying alternative approach - direct table operations...');
      
      // Try to update/insert without RLS checks
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
      
      console.log('Alternative upsert result:', { upsertData, upsertError });
    }

  } catch (error) {
    console.error('Error in direct SQL test:', error);
  }
}

directSQLTest().then(() => {
  console.log('\nScript completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});