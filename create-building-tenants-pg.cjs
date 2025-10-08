const { Client } = require('pg')
require('dotenv').config()

async function createBuildingTenantsTable() {
  console.log('🏗️ KREIRANJE building_tenants TABELE PREKO PostgreSQL')
  console.log('==================================================')
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('✅ Povezan sa PostgreSQL bazom')

    // 1. Kreiranje tabele
    console.log('\n1. Kreiranje building_tenants tabele...')
    const createTableSQL = `
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
    `
    
    await client.query(createTableSQL)
    console.log('✅ building_tenants tabela kreirana')

    // 2. Kreiranje indeksa
    console.log('\n2. Kreiranje indeksa...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_building_tenants_building_id ON building_tenants(building_id);',
      'CREATE INDEX IF NOT EXISTS idx_building_tenants_tenant_id ON building_tenants(tenant_id);',
      'CREATE INDEX IF NOT EXISTS idx_building_tenants_status ON building_tenants(status);'
    ]
    
    for (const indexSQL of indexes) {
      await client.query(indexSQL)
    }
    console.log('✅ Indeksi kreirani')

    // 3. Omogućavanje RLS
    console.log('\n3. Omogućavanje RLS...')
    await client.query('ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;')
    console.log('✅ RLS omogućen')

    // 4. Kreiranje RLS politika
    console.log('\n4. Kreiranje RLS politika...')
    
    // Brisanje postojećih politika
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Company owners can view their building tenants" ON building_tenants;',
      'DROP POLICY IF EXISTS "Company owners can invite tenants to their buildings" ON building_tenants;',
      'DROP POLICY IF EXISTS "Company owners can update their building tenants" ON building_tenants;',
      'DROP POLICY IF EXISTS "Company owners can remove tenants from their buildings" ON building_tenants;',
      'DROP POLICY IF EXISTS "Tenants can view their own records" ON building_tenants;',
      'DROP POLICY IF EXISTS "Tenants can update their own status" ON building_tenants;'
    ]
    
    for (const dropSQL of dropPolicies) {
      await client.query(dropSQL)
    }

    // Kreiranje novih politika
    const policies = [
      `CREATE POLICY "Company owners can view their building tenants" ON building_tenants
        FOR SELECT USING (
          building_id IN (
            SELECT id FROM buildings WHERE user_id = auth.uid()
          )
        );`,
      
      `CREATE POLICY "Company owners can invite tenants to their buildings" ON building_tenants
        FOR INSERT WITH CHECK (
          building_id IN (
            SELECT id FROM buildings WHERE user_id = auth.uid()
          )
        );`,
      
      `CREATE POLICY "Company owners can update their building tenants" ON building_tenants
        FOR UPDATE USING (
          building_id IN (
            SELECT id FROM buildings WHERE user_id = auth.uid()
          )
        );`,
      
      `CREATE POLICY "Company owners can remove tenants from their buildings" ON building_tenants
        FOR DELETE USING (
          building_id IN (
            SELECT id FROM buildings WHERE user_id = auth.uid()
          )
        );`,
      
      `CREATE POLICY "Tenants can view their own records" ON building_tenants
        FOR SELECT USING (tenant_id = auth.uid());`,
      
      `CREATE POLICY "Tenants can update their own status" ON building_tenants
        FOR UPDATE USING (tenant_id = auth.uid())
        WITH CHECK (tenant_id = auth.uid());`
    ]
    
    for (const policySQL of policies) {
      await client.query(policySQL)
    }
    console.log('✅ RLS politike kreirane')

    // 5. Kreiranje trigger funkcije za updated_at
    console.log('\n5. Kreiranje trigger funkcije...')
    const triggerFunction = `
      CREATE OR REPLACE FUNCTION update_building_tenants_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `
    
    await client.query(triggerFunction)
    
    const trigger = `
      DROP TRIGGER IF EXISTS update_building_tenants_updated_at ON building_tenants;
      CREATE TRIGGER update_building_tenants_updated_at
          BEFORE UPDATE ON building_tenants
          FOR EACH ROW
          EXECUTE FUNCTION update_building_tenants_updated_at();
    `
    
    await client.query(trigger)
    console.log('✅ Trigger kreiran')

    // 6. Dodavanje test podataka za demo@firma.com
    console.log('\n6. Dodavanje test podataka...')
    
    // Pronađi demo@firma.com korisnika
    const userResult = await client.query(`
      SELECT id FROM auth.users WHERE email = 'demo@firma.com'
    `)
    
    if (userResult.rows.length === 0) {
      console.log('❌ demo@firma.com korisnik nije pronađen')
      return
    }
    
    const demoUserId = userResult.rows[0].id
    console.log('✅ demo@firma.com ID:', demoUserId)
    
    // Pronađi zgrade za demo@firma.com
    const buildingsResult = await client.query(`
      SELECT id, name FROM buildings WHERE user_id = $1
    `, [demoUserId])
    
    if (buildingsResult.rows.length === 0) {
      console.log('❌ Nema zgrada za demo@firma.com')
      return
    }
    
    console.log(`✅ Pronađeno ${buildingsResult.rows.length} zgrada`)
    
    // Kreiranje test stanara
    const testTenants = [
      { email: 'stanar1@test.com', apartment: '1A', floor: 1 },
      { email: 'stanar2@test.com', apartment: '1B', floor: 1 },
      { email: 'stanar3@test.com', apartment: '2A', floor: 2 },
      { email: 'stanar4@test.com', apartment: '2B', floor: 2 },
      { email: 'stanar5@test.com', apartment: '3A', floor: 3 }
    ]
    
    // Kreiranje test korisnika i dodavanje u building_tenants
    for (let i = 0; i < testTenants.length; i++) {
      const tenant = testTenants[i]
      const buildingId = buildingsResult.rows[i % buildingsResult.rows.length].id
      
      // Kreiranje test korisnika
      const tenantId = `tenant-${i + 1}-uuid-${Date.now()}`
      
      // Dodavanje u building_tenants tabelu
      await client.query(`
        INSERT INTO building_tenants (
          building_id, tenant_id, apartment_number, floor_number, 
          status, invited_by, joined_at
        ) VALUES ($1, $2, $3, $4, 'active', $5, NOW())
        ON CONFLICT (building_id, tenant_id) DO NOTHING
      `, [buildingId, tenantId, tenant.apartment, tenant.floor, demoUserId])
      
      console.log(`✅ Dodat stanar ${tenant.apartment} u zgradu ${buildingsResult.rows[i % buildingsResult.rows.length].name}`)
    }

    console.log('\n🎉 building_tenants tabela uspešno kreirana sa test podacima!')
    console.log('📊 Ukupno stanara:', testTenants.length)

  } catch (error) {
    console.error('❌ Greška:', error.message)
  } finally {
    await client.end()
    console.log('🔌 Veza sa bazom zatvorena')
  }
}

createBuildingTenantsTable()