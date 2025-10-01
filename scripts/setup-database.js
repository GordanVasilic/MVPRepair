import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function setupDatabase() {
  console.log('🚀 Pokretanje setup-a Supabase baze podataka...');
  
  // Kreiranje konekcije na bazu podataka
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Povezivanje na bazu
    console.log('📡 Povezivanje na Supabase bazu...');
    await client.connect();
    console.log('✅ Uspešno povezano na bazu podataka!');

    // Čitanje SQL fajla
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    console.log('📄 Čitanje SQL fajla:', sqlFilePath);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL fajl ne postoji: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📋 SQL sadržaj učitan, dužina:', sqlContent.length, 'karaktera');

    // Izvršavanje SQL koda
    console.log('⚡ Izvršavanje SQL migracije...');
    await client.query(sqlContent);
    console.log('✅ SQL migracija uspešno izvršena!');

    // Provera da li su tabele kreirane
    console.log('🔍 Provera kreiraanih tabela...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await client.query(tablesQuery);
    console.log('📊 Kreirane tabele:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Provera početnih podataka
    console.log('🏢 Provera početnih podataka...');
    
    const buildingsCount = await client.query('SELECT COUNT(*) FROM buildings');
    console.log(`  📍 Zgrade: ${buildingsCount.rows[0].count}`);
    
    const apartmentsCount = await client.query('SELECT COUNT(*) FROM apartments');
    console.log(`  🏠 Stanovi: ${apartmentsCount.rows[0].count}`);

    console.log('🎉 Supabase baza podataka je uspešno postavljena!');
    console.log('');
    console.log('📋 Sledeći koraci:');
    console.log('  1. Možete se registrovati u aplikaciji');
    console.log('  2. Kreirati korisnike i prijaviti kvarove');
    console.log('  3. Testirati funkcionalnosti aplikacije');

  } catch (error) {
    console.error('❌ Greška pri setup-u baze podataka:', error.message);
    console.error('📝 Detalji greške:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Konekcija na bazu zatvorena');
  }
}

// Pokretanje setup-a
setupDatabase();