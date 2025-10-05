import { createClient } from '@supabase/supabase-js';

async function applyMigration() {
  // Use anon key first to test connection
  const supabase = createClient(
    'https://hszbpaoqoijzkileutnu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjQxNjUsImV4cCI6MjA3NDg0MDE2NX0.240dHMzBAZZU6xEJCDL7NJtVqnz6ZKn3A6_XqkEttd8'
  );

  try {
    console.log('Applying migration: Add garage_levels column...');
    
    // Execute the migration SQL directly
    const { data, error } = await supabase
      .from('buildings')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Connection test failed:', error);
      return;
    }

    console.log('Connection successful, attempting to add column...');
    
    // Try to add the column using a simple query
    const { data: result, error: alterError } = await supabase
      .rpc('sql', {
        query: 'ALTER TABLE buildings ADD COLUMN IF NOT EXISTS garage_levels INTEGER DEFAULT 0 CHECK (garage_levels >= 0);'
      });

    if (alterError) {
      console.error('Migration failed:', alterError);
    } else {
      console.log('Migration applied successfully!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

applyMigration();