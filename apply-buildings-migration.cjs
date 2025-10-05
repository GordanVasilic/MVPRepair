const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta sa service role ključem
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function applyBuildingsMigration() {
  console.log('🚀 Primenjujem migraciju za buildings tabelu...')
  
  try {
    // Step 1: Add user_id column to buildings table
    console.log('📝 Dodajem user_id kolonu u buildings tabelu...')
    const { error: addColumnError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE buildings 
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      `
    })

    if (addColumnError) {
      console.error('❌ Greška pri dodavanju kolone:', addColumnError.message)
      return
    }

    // Step 2: Create index
    console.log('📝 Kreiram indeks...')
    const { error: indexError } = await supabase.rpc('sql', {
      query: `
        CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON buildings(user_id);
      `
    })

    if (indexError) {
      console.error('❌ Greška pri kreiranju indeksa:', indexError.message)
      return
    }

    // Step 3: Enable RLS
    console.log('📝 Omogućavam RLS...')
    const { error: rlsError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
      `
    })

    if (rlsError) {
      console.error('❌ Greška pri omogućavanju RLS:', rlsError.message)
      return
    }

    // Step 4: Drop existing policies
    console.log('📝 Brišem postojeće politike...')
    const { error: dropPoliciesError } = await supabase.rpc('sql', {
      query: `
        DROP POLICY IF EXISTS "Users can view all buildings" ON buildings;
        DROP POLICY IF EXISTS "Users can manage all buildings" ON buildings;
        DROP POLICY IF EXISTS "Authenticated users can view buildings" ON buildings;
        DROP POLICY IF EXISTS "Authenticated users can manage buildings" ON buildings;
      `
    })

    if (dropPoliciesError) {
      console.error('❌ Greška pri brisanju politika:', dropPoliciesError.message)
      return
    }

    // Step 5: Create new RLS policies
    console.log('📝 Kreiram nove RLS politike...')
    const { error: policiesError } = await supabase.rpc('sql', {
      query: `
        -- Policy for SELECT: Users can only see their own buildings
        CREATE POLICY "Users can view own buildings" ON buildings
            FOR SELECT USING (auth.uid() = user_id);

        -- Policy for INSERT: Users can create buildings (user_id will be set automatically)
        CREATE POLICY "Users can create buildings" ON buildings
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Policy for UPDATE: Users can only update their own buildings
        CREATE POLICY "Users can update own buildings" ON buildings
            FOR UPDATE USING (auth.uid() = user_id);

        -- Policy for DELETE: Users can only delete their own buildings
        CREATE POLICY "Users can delete own buildings" ON buildings
            FOR DELETE USING (auth.uid() = user_id);
      `
    })

    if (policiesError) {
      console.error('❌ Greška pri kreiranju politika:', policiesError.message)
      return
    }

    // Step 6: Create function and trigger
    console.log('📝 Kreiram funkciju i trigger...')
    const { error: functionError } = await supabase.rpc('sql', {
      query: `
        -- Create a function to automatically set user_id on insert
        CREATE OR REPLACE FUNCTION set_user_id_on_buildings()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.user_id = auth.uid();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Create trigger to automatically set user_id
        DROP TRIGGER IF EXISTS trigger_set_user_id_buildings ON buildings;
        CREATE TRIGGER trigger_set_user_id_buildings
            BEFORE INSERT ON buildings
            FOR EACH ROW
            EXECUTE FUNCTION set_user_id_on_buildings();
      `
    })

    if (functionError) {
      console.error('❌ Greška pri kreiranju funkcije:', functionError.message)
      return
    }

    console.log('✅ Migracija uspešno primenjena!')
    console.log('📋 Sada svaki korisnik može da vidi samo svoje objekte.')
    console.log('⚠️ Postojeći objekti imaju user_id = NULL, tako da ih niko neće videti.')
    console.log('💡 Možete ih ručno dodeliti korisnicima ili ih obrisati i kreirati nove.')

  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

// Pokretanje skripte
applyBuildingsMigration()