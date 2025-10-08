require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createInvitationsTableManual() {
  console.log('🔧 MANUELNO KREIRANJE TENANT_INVITATIONS TABELE');
  console.log('===============================================');

  try {
    // Kreiraj service klijent
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Service klijent kreiran');

    // Pokušaj da vidiš da li tabela postoji
    console.log('1. Proveravam da li tabela postoji...');
    
    try {
      const { data, error } = await serviceClient
        .from('tenant_invitations')
        .select('id')
        .limit(1);
        
      if (!error) {
        console.log('✅ tenant_invitations tabela već postoji');
        console.log('Podaci:', data);
        return;
      }
      
      console.log('Tabela ne postoji, greška:', error.message);
    } catch (e) {
      console.log('Tabela definitivno ne postoji');
    }

    // Pokušaj da kreiram tabelu preko INSERT-a sa dummy podacima
    console.log('2. Pokušavam da kreiram tabelu preko INSERT-a...');
    
    try {
      const { data, error } = await serviceClient
        .from('tenant_invitations')
        .insert({
          email: 'dummy@test.com',
          building_id: '00000000-0000-0000-0000-000000000000',
          invite_token: 'dummy-token-' + Date.now(),
          invited_by: '00000000-0000-0000-0000-000000000000'
        })
        .select();

      if (!error) {
        console.log('✅ Tabela postoji i funkcioniše!');
        
        // Obriši dummy podatke
        await serviceClient
          .from('tenant_invitations')
          .delete()
          .eq('email', 'dummy@test.com');
          
        console.log('✅ Dummy podaci obrisani');
        return;
      }
      
      console.log('INSERT greška:', error.message);
    } catch (insertError) {
      console.log('INSERT neuspešan:', insertError.message);
    }

    // Ako ništa ne radi, možda tabela jednostavno ne postoji u bazi
    console.log('\n❌ TABELA tenant_invitations NE POSTOJI U BAZI!');
    console.log('');
    console.log('REŠENJE:');
    console.log('1. Idite u Supabase Dashboard');
    console.log('2. Otvorite SQL Editor');
    console.log('3. Izvršite sledeći SQL kod:');
    console.log('');
    console.log('-- Kreiranje tenant_invitations tabele');
    console.log('CREATE TABLE IF NOT EXISTS tenant_invitations (');
    console.log('    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
    console.log('    email VARCHAR(255) NOT NULL,');
    console.log('    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,');
    console.log('    apartment_number VARCHAR(10),');
    console.log('    floor_number INTEGER,');
    console.log('    invite_token VARCHAR(255) UNIQUE NOT NULL,');
    console.log('    invited_by UUID REFERENCES auth.users(id),');
    console.log('    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL \'7 days\'),');
    console.log('    used_at TIMESTAMP WITH TIME ZONE,');
    console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    console.log(');');
    console.log('');
    console.log('-- Kreiranje indeksa');
    console.log('CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invite_token);');
    console.log('CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);');
    console.log('CREATE INDEX IF NOT EXISTS idx_tenant_invitations_expires_at ON tenant_invitations(expires_at);');
    console.log('');
    console.log('-- Omogućavanje RLS');
    console.log('ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- Kreiranje politika');
    console.log('CREATE POLICY "Companies can manage their invitations" ON tenant_invitations');
    console.log('    FOR ALL USING (invited_by = auth.uid());');
    console.log('');
    console.log('CREATE POLICY "Public can read invitations by token" ON tenant_invitations');
    console.log('    FOR SELECT USING (true);');
    console.log('');
    console.log('-- Dodavanje dozvola');
    console.log('GRANT ALL PRIVILEGES ON tenant_invitations TO authenticated;');
    console.log('GRANT SELECT ON tenant_invitations TO anon;');
    console.log('');

  } catch (error) {
    console.error('❌ Neočekivana greška:', error);
  }
}

createInvitationsTableManual();