const { Client } = require('pg');

async function addGarageColumn() {
  const client = new Client({
    connectionString: "postgresql://postgres.hszbpaoqoijzkileutnu:Malioglasi1!@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    console.log('Connected to Supabase database');

    // Check if garage_levels column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'buildings' AND column_name = 'garage_levels';
    `;
    
    const columnExists = await client.query(checkColumnQuery);
    
    if (columnExists.rows.length > 0) {
      console.log('✅ garage_levels column already exists in buildings table');
      return;
    }

    console.log('Adding garage_levels column to buildings table...');

    // Add garage_levels column
    await client.query(`
      ALTER TABLE buildings 
      ADD COLUMN garage_levels INTEGER DEFAULT 0 CHECK (garage_levels >= 0);
    `);

    // Update existing buildings
    await client.query(`
      UPDATE buildings 
      SET garage_levels = 0 
      WHERE garage_levels IS NULL;
    `);

    // Add comment
    await client.query(`
      COMMENT ON COLUMN buildings.garage_levels IS 'Number of garage/basement levels below ground level';
    `);

    console.log('✅ Successfully added garage_levels column to buildings table');

    // Verify the column was added
    const verifyQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'buildings' AND column_name = 'garage_levels';
    `;
    
    const result = await client.query(verifyQuery);
    console.log('Column details:', result.rows[0]);

  } catch (error) {
    console.error('Error applying garage migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addGarageColumn().catch(console.error);