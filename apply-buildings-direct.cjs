const { Client } = require('pg')
require('dotenv').config()

async function applyBuildingsMigration() {
  console.log('🚀 Primenjujem migraciju za buildings tabelu direktno preko PostgreSQL...')
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('✅ Povezan sa bazom podataka')

    // Step 1: Add user_id column to buildings table
    console.log('📝 Dodajem user_id kolonu u buildings tabelu...')
    await client.query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    `)

    // Step 2: Create index
    console.log('📝 Kreiram indeks...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON buildings(user_id);
    `)

    // Step 3: Enable RLS
    console.log('📝 Omogućavam RLS...')
    await client.query(`
      ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
    `)

    // Step 4: Drop existing policies
    console.log('📝 Brišem postojeće politike...')
    await client.query(`
      DROP POLICY IF EXISTS "Users can view all buildings" ON buildings;
    `)
    await client.query(`
      DROP POLICY IF EXISTS "Users can manage all buildings" ON buildings;
    `)
    await client.query(`
      DROP POLICY IF EXISTS "Authenticated users can view buildings" ON buildings;
    `)
    await client.query(`
      DROP POLICY IF EXISTS "Authenticated users can manage buildings" ON buildings;
    `)

    // Step 5: Create new RLS policies
    console.log('📝 Kreiram nove RLS politike...')
    
    // Policy for SELECT
    await client.query(`
      CREATE POLICY "Users can view own buildings" ON buildings
          FOR SELECT USING (auth.uid() = user_id);
    `)

    // Policy for INSERT
    await client.query(`
      CREATE POLICY "Users can create buildings" ON buildings
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    `)

    // Policy for UPDATE
    await client.query(`
      CREATE POLICY "Users can update own buildings" ON buildings
          FOR UPDATE USING (auth.uid() = user_id);
    `)

    // Policy for DELETE
    await client.query(`
      CREATE POLICY "Users can delete own buildings" ON buildings
          FOR DELETE USING (auth.uid() = user_id);
    `)

    // Step 6: Create function and trigger
    console.log('📝 Kreiram funkciju i trigger...')
    
    // Create function
    await client.query(`
      CREATE OR REPLACE FUNCTION set_user_id_on_buildings()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.user_id = auth.uid();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)

    // Drop existing trigger if exists
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_set_user_id_buildings ON buildings;
    `)

    // Create trigger
    await client.query(`
      CREATE TRIGGER trigger_set_user_id_buildings
          BEFORE INSERT ON buildings
          FOR EACH ROW
          EXECUTE FUNCTION set_user_id_on_buildings();
    `)

    console.log('✅ Migracija uspešno primenjena!')
    console.log('📋 Sada svaki korisnik može da vidi samo svoje objekte.')
    console.log('⚠️ Postojeći objekti imaju user_id = NULL, tako da ih niko neće videti.')
    console.log('💡 Možete ih ručno dodeliti korisnicima ili ih obrisati i kreirati nove.')

  } catch (error) {
    console.error('❌ Greška pri primeni migracije:', error.message)
  } finally {
    await client.end()
  }
}

// Pokretanje skripte
applyBuildingsMigration()