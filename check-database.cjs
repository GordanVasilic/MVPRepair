const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hszbpaoqoijzkileutnu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjQxNjUsImV4cCI6MjA3NDg0MDE2NX0.240dHMzBAZZU6xEJCDL7NJtVqnz6ZKn3A6_XqkEttd8'
);

async function checkData() {
  console.log('=== CHECKING BUILDINGS ===');
  const { data: buildings, error: buildingsError } = await supabase
    .from('buildings')
    .select('*')
    .limit(5);
  
  if (buildingsError) {
    console.error('Buildings error:', buildingsError);
  } else {
    console.log('Buildings found:', buildings?.length || 0);
    buildings?.forEach(b => {
      console.log('- Building:', b.name, 'ID:', b.id);
      console.log('  Floors:', b.floors_count, 'Garage levels:', b.garage_levels);
    });
  }

  console.log('\n=== CHECKING BUILDING_MODELS ===');
  const { data: models, error: modelsError } = await supabase
    .from('building_models')
    .select('*')
    .limit(5);
  
  if (modelsError) {
    console.error('Building models error:', modelsError);
  } else {
    console.log('Building models found:', models?.length || 0);
    models?.forEach(m => console.log('- Model for building:', m.building_id, 'Floors:', m.floors_count));
  }

  console.log('\n=== CHECKING BUILDINGS WITH MODELS ===');
  const { data: buildingsWithModels, error: joinError } = await supabase
    .from('buildings')
    .select(`
      *,
      building_models (
        id,
        floors_count,
        model_config
      )
    `)
    .limit(3);
  
  if (joinError) {
    console.error('Join error:', joinError);
  } else {
    console.log('Buildings with models:', buildingsWithModels?.length || 0);
    buildingsWithModels?.forEach(b => {
      console.log('- Building:', b.name);
      console.log('  Models:', b.building_models?.length || 0);
      b.building_models?.forEach(m => console.log('    Floors:', m.floors_count));
    });
  }
}

checkData().catch(console.error);