import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Konfigurasi parser tipe PostgreSQL
pg.types.setTypeParser(1082, (val) => val); // DATE as YYYY-MM-DD
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val))); // NUMERIC as float

const DEFAULT_TABLES = ['settings', 'harga_emas', 'stok_manual', 'pembelian', 'penjualan'];

/**
 * Sinkronisasi data dari PostgreSQL lokal ke Supabase via REST API (PostgREST upsert)
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {object} [options] - Opsi konfigurasi sinkronisasi
 * @returns {Promise<object>} Ringkasan hasil sinkronisasi
 */
export async function syncToSupabase(pool, options = {}) {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).replace(/\/+$/, '');

  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !apiKey) {
    throw new Error(
      'Kredensial Supabase belum lengkap. Tentukan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY atau SUPABASE_ANON_KEY pada environment.'
    );
  }

  const tables = options.tables || DEFAULT_TABLES;
  const batchSize = options.batchSize || 200;
  const summary = {};
  const details = [];

  for (const table of tables) {
    const { rows } = await pool.query(`SELECT * FROM ${table}`);
    const rowCount = rows.length;

    if (rowCount === 0) {
      summary[table] = 0;
      details.push({ table, count: 0, status: 'skipped (empty)' });
      continue;
    }

    let syncedForTable = 0;
    for (let i = 0; i < rowCount; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const endpoint = `${supabaseUrl}/rest/v1/${table}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gagal sinkronisasi tabel ${table} (HTTP ${res.status}): ${errorText}`);
      }

      syncedForTable += chunk.length;
    }

    summary[table] = syncedForTable;
    details.push({ table, count: syncedForTable, status: 'success' });
  }

  const total = Object.values(summary).reduce((acc, curr) => acc + curr, 0);

  return {
    success: true,
    total,
    summary,
    details,
    syncedAt: new Date().toISOString(),
  };
}

// Eksekusi mandiri via terminal (node scripts/sync-to-supabase.js)
const isDirectExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://rumaisho_app:Rum41sh0Mu4dz@127.0.0.1:5432/rumaisho_db';

  console.log('🚀 Memulai proses sinkronisasi PostgreSQL lokal ke Supabase...');
  console.log(`📡 Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

  const standalonePool = new pg.Pool({ connectionString: databaseUrl });

  syncToSupabase(standalonePool)
    .then((result) => {
      console.log('✅ Sinkronisasi berhasil selesai!');
      console.log('📊 Ringkasan per tabel:', JSON.stringify(result.summary, null, 2));
      console.log(`📈 Total baris tersinkron: ${result.total}`);
      return standalonePool.end();
    })
    .catch(async (err) => {
      console.error('❌ Gagal sinkronisasi:', err.message);
      await standalonePool.end();
      process.exit(1);
    });
}
