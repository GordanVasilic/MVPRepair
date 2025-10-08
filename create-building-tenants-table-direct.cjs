require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createBuildingTenantsTable() {
  console.log('🔧 KREIRAM BUILDING_TENANTS TABELU DIREKTNO');
  console.log('==========================================');

  try {
    // Kreiraj admin klijent
    const adminClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Admin klijent kreiran');

    // SQL za kreiranje tabele
    const createTableSQL = `
      -- Create building_tenants table for managing tenant-building relationships
      CREATE TABLE IF NOT EXISTS building_tenants (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          apartment_number VARCHAR(10) NOT NULL,
          floor_number INTEGER NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
          invited_by UUID REFERENCES auth.users(id),
          invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          joined_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Ensure unique tenant per apartment in building
          UNIQUE(building_id, apartment_number),
          -- Ensure tenant can only be in one apartment per building
          UNIQUE(building_id, tenant_id)
      );
    `;

    console.log('📝 Kreiram building_tenants tabelu...');
    const { data: createResult, error: createError } = await adminClient.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (createError) {
      console.error('❌ Greška pri kreiranju tabele:', createError.message);
      return;
    }

    console.log('✅ building_tenants tabela kreirana');

    // Kreiraj indekse
    const createIndexesSQL = `
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_building_tenants_building_id ON building_tenants(building_id);
      CREATE INDEX IF NOT EXISTS idx_building_tenants_tenant_id ON building_tenants(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_building_tenants_status ON building_tenants(status);
    `;

    console.log('📝 Kreiram indekse...');
    const { data: indexResult, error: indexError } = await adminClient.rpc('exec_sql', {
      sql: createIndexesSQL
    });

    if (indexError) {
      console.error('❌ Greška pri kreiranju indeksa:', indexError.message);
    } else {
      console.log('✅ Indeksi kreirani');
    }

    // Omogući RLS
    const enableRLSSQL = `
      -- Enable RLS
      ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;
    `;

    console.log('🔒 Omogućavam RLS...');
    const { data: rlsResult, error: rlsError } = await adminClient.rpc('exec_sql', {
      sql: enableRLSSQL
    });

    if (rlsError) {
      console.error('❌ Greška pri omogućavanju RLS:', rlsError.message);
    } else {
      console.log('✅ RLS omogućen');
    }

    // Kreiraj RLS politike
    const createPoliciesSQL = `
      -- Company owners can see all tenants in their buildings
      CREATE POLICY IF NOT EXISTS "Company owners can view their building tenants" ON building_tenants
          FOR SELECT USING (
              building_id IN (
                  SELECT id FROM buildings WHERE user_id = auth.uid()
              )
          );

      -- Company owners can insert tenants to their buildings
      CREATE POLICY IF NOT EXISTS "Company owners can invite tenants to their buildings" ON building_tenants
          FOR INSERT WITH CHECK (
              building_id IN (
                  SELECT id FROM buildings WHERE user_id = auth.uid()
              )
          );

      -- Company owners can update tenants in their buildings
      CREATE POLICY IF NOT EXISTS "Company owners can update their building tenants" ON building_tenants
          FOR UPDATE USING (
              building_id IN (
                  SELECT id FROM buildings WHERE user_id = auth.uid()
              )
          );

      -- Company owners can delete tenants from their buildings
      CREATE POLICY IF NOT EXISTS "Company owners can remove tenants from their buildings" ON building_tenants
          FOR DELETE USING (
              building_id IN (
                  SELECT id FROM buildings WHERE user_id = auth.uid()
              )
          );

      -- Tenants can view their own records
      CREATE POLICY IF NOT EXISTS "Tenants can view their own records" ON building_tenants
          FOR SELECT USING (tenant_id = auth.uid());

      -- Tenants can update their own status (e.g., accept invitation)
      CREATE POLICY IF NOT EXISTS "Tenants can update their own status" ON building_tenants
          FOR UPDATE USING (tenant_id = auth.uid())
          WITH CHECK (tenant_id = auth.uid());
    `;

    console.log('🔒 Kreiram RLS politike...');
    const { data: policiesResult, error: policiesError } = await adminClient.rpc('exec_sql', {
      sql: createPoliciesSQL
    });

    if (policiesError) {
      console.error('❌ Greška pri kreiranju politika:', policiesError.message);
    } else {
      console.log('✅ RLS politike kreirane');
    }

    // Sada kreiraj demo konekciju
    console.log('\n🔗 KREIRAM DEMO KONEKCIJU...');
    
    // Dohvati demo korisnike
    const { data: demoUsers } = await adminClient.auth.admin.listUsers();
    const firmaUser = demoUsers?.users?.find(u => u.email === 'demo@firma.com');
    const stanarUser = demoUsers?.users?.find(u => u.email === 'demo@stanar.com');

    if (!firmaUser || !stanarUser) {
      console.error('❌ Demo korisnici ne postoje');
      return;
    }

    // Dohvati demo zgradu
    const { data: buildings, error: buildingsError } = await adminClient
      .from('buildings')
      .select('*')
      .eq('user_id', firmaUser.id);

    if (buildingsError || !buildings || buildings.length === 0) {
      console.error('❌ Nema zgrada za demo@firma.com');
      return;
    }

    const demoBuilding = buildings[0];
    console.log(`🏢 Koristim zgradu: ${demoBuilding.name} (ID: ${demoBuilding.id})`);

    // Kreiraj konekciju
    const { data: newConnection, error: connectionError } = await adminClient
      .from('building_tenants')
      .insert({
        building_id: demoBuilding.id,
        tenant_id: stanarUser.id,
        apartment_number: '1A',
        floor_number: 1,
        status: 'active',
        invited_by: firmaUser.id,
        joined_at: new Date().toISOString(),
        invited_at: new Date().toISOString()
      })
      .select();

    if (connectionError) {
      console.error('❌ Greška pri kreiranju konekcije:', connectionError.message);
    } else {
      console.log('✅ DEMO KONEKCIJA KREIRANA!');
      console.log('   Konekcija:', newConnection);
    }

    // Testiraj da li radi
    console.log('\n🧪 TESTIRAM KONEKCIJU...');
    const { data: testTenants, error: testError } = await adminClient
      .from('building_tenants')
      .select('*');

    if (testError) {
      console.error('❌ Greška pri testiranju:', testError.message);
    } else {
      console.log(`✅ Test uspešan - ${testTenants?.length || 0} zapisa u building_tenants`);
    }

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

createBuildingTenantsTable();