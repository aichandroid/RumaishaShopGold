import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { syncToSupabase } from './scripts/sync-to-supabase.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure pg type parsers to ensure dates and numerics format accurately for client
// OID 1082 = DATE -> return as string 'YYYY-MM-DD' without timezone shift
pg.types.setTypeParser(1082, (val) => val);
// OID 1700 = NUMERIC -> return as JavaScript float number
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

const PORT = parseInt(process.env.PORT, 10) || 3002;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rumaisho_app:password@127.0.0.1:5432/rumaisho_db';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ==========================================
// INPUT VALIDATION HELPERS
// ==========================================

function sanitizeString(val, maxLen = 255) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s.slice(0, maxLen);
}

function safeParseFloat(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseFloat(val);
  return isFinite(n) ? n : null;
}

function safeParseInt(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  const n = parseInt(val, 10);
  return isFinite(n) ? n : null;
}

function isUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str.trim());
}

function safeParseId(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  // Allow valid UUID
  if (isUUID(s)) return s;
  // Allow positive integer
  const n = parseInt(s, 10);
  if (isFinite(n) && n > 0 && String(n) === s) return String(n);
  // Allow alphanumeric identifiers / serial numbers (max 100 chars, no SQL injection special chars)
  if (/^[a-zA-Z0-9_\-\.]{1,100}$/.test(s)) return s;
  return null;
}

function safeParseDate(val) {
  if (!val) return null;
  // Strict YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())) return null;
  return String(val).trim();
}

function safeParseYear(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  const n = parseInt(val, 10);
  if (!isFinite(n) || n < 1900 || n > 2200) return null;
  return n;
}

// Sanitize error messages - never expose DB internals in production
function sanitizeError(err) {
  if (IS_PRODUCTION) {
    return 'Terjadi kesalahan server. Silakan coba lagi.';
  }
  return err.message;
}

// ==========================================
// POSTGRESQL CONNECTION POOL
// ==========================================

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool error on idle client:', err.message);
});

// ==========================================
// EXPRESS APP & SECURITY MIDDLEWARE
// ==========================================

const app = express();

// Remove X-Powered-By header
app.disable('x-powered-by');

// Helmet: sets secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",           // required for inline scripts in index.html
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",           // required for inline styles
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
      ],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allows CDN resources
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: IS_PRODUCTION ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

// Rate Limiting: general API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 300,                   // max 300 request per 15 menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak request. Silakan coba lagi dalam beberapa menit.' },
});

// Tighter rate limit for settings (PIN change) endpoint
const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak request ke pengaturan. Silakan tunggu beberapa menit.' },
});

// Block direct access to sensitive files via URL
app.use((req, res, next) => {
  const sensitivePatterns = ['.env', '.git', 'backup.sql', 'db.js.backup', 'package-lock.json', 'server.ps1'];
  const reqPath = req.path.toLowerCase().replace(/\\/g, '/');
  for (const pattern of sensitivePatterns) {
    if (reqPath.includes(pattern)) {
      return res.status(403).json({ success: false, message: 'Akses dilarang.' });
    }
  }
  next();
});

// Body parser middlewares
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Request logger for troubleshooting
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    });
  }
  next();
});

// Cache control headers: Disable caching on API, enable revalidation for static files
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
  next();
});

// Apply general rate limit to all /api routes
app.use('/api', apiLimiter);

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Health Check Endpoint — no DB/user info exposed in production
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API Health Error]:', err.message);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Config Endpoint (Adapts /api/config for Self-Hosted Mode)
app.get('/api/config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.json({
    mode: 'self-hosted',
    database: 'postgresql',
    app: 'Rumaisho Gold'
  });
});

// --- PEMBELIAN (Purchases) ---
app.get('/api/pembelian', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tanggal, no_seri, gramasi, harga_beli, nama_penjual, tahun, created_at
       FROM pembelian
       ORDER BY tanggal DESC, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/pembelian]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.post('/api/pembelian', async (req, res) => {
  try {
    const { tanggal, no_seri, tahun, gramasi, harga_beli, nama_penjual } = req.body;

    const tanggalVal = safeParseDate(tanggal);
    const seriVal = sanitizeString(no_seri, 100);
    const yearVal = safeParseYear(tahun);
    const gramasiVal = safeParseFloat(gramasi) ?? 1;
    const hargaVal = safeParseFloat(harga_beli) ?? 0;
    const penjualVal = sanitizeString(nama_penjual, 200);

    if (!tanggalVal) return res.status(400).json({ success: false, message: 'Tanggal tidak valid.' });
    if (!seriVal) return res.status(400).json({ success: false, message: 'Nomor seri tidak valid.' });
    if (gramasiVal <= 0) return res.status(400).json({ success: false, message: 'Gramasi harus lebih dari 0.' });
    if (hargaVal < 0) return res.status(400).json({ success: false, message: 'Harga beli tidak valid.' });
    if (!penjualVal) return res.status(400).json({ success: false, message: 'Nama penjual wajib diisi.' });

    const result = await pool.query(
      `INSERT INTO pembelian (tanggal, no_seri, tahun, gramasi, harga_beli, nama_penjual)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tanggalVal, seriVal, yearVal, gramasiVal, hargaVal, penjualVal]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/pembelian]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.put('/api/pembelian/:id', async (req, res) => {
  try {
    const id = safeParseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const { tanggal, no_seri, tahun, gramasi, harga_beli, nama_penjual, old_no_seri } = req.body;
    const yearVal = safeParseYear(tahun);
    const queryCol = isUUID(id) ? 'id' : 'no_seri';

    const result = await pool.query(
      `UPDATE pembelian
       SET tanggal = COALESCE($1, tanggal),
           no_seri = COALESCE($2, no_seri),
           tahun = $3,
           gramasi = COALESCE($4, gramasi),
           harga_beli = COALESCE($5, harga_beli),
           nama_penjual = COALESCE($6, nama_penjual)
       WHERE ${queryCol} = $7
       RETURNING *`,
      [
        safeParseDate(tanggal),
        sanitizeString(no_seri, 100),
        yearVal,
        safeParseFloat(gramasi),
        safeParseFloat(harga_beli),
        sanitizeString(nama_penjual, 200),
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record pembelian tidak ditemukan' });
    }

    // Cascade update to penjualan if serial changed
    const updatedRow = result.rows[0];
    const oldSeri = sanitizeString(old_no_seri, 100) || '';
    const newSeri = updatedRow.no_seri;
    if (oldSeri && newSeri && oldSeri.toUpperCase() !== newSeri.toUpperCase()) {
      await pool.query('UPDATE penjualan SET no_seri = $1 WHERE no_seri = $2', [newSeri, oldSeri]);
    }

    res.json({ success: true, data: updatedRow });
  } catch (err) {
    console.error('[PUT /api/pembelian/:id]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.delete('/api/pembelian/:id', async (req, res) => {
  try {
    const id = safeParseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const queryCol = isUUID(id) ? 'id' : 'no_seri';
    const result = await pool.query(`DELETE FROM pembelian WHERE ${queryCol} = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record pembelian tidak ditemukan.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/pembelian/:id]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// --- PENJUALAN (Sales) ---
app.get('/api/penjualan', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tanggal, gramasi, no_seri, nama_pembeli, harga_jual, harga_restok, keuntungan, created_at
       FROM penjualan
       ORDER BY tanggal DESC, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/penjualan]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.post('/api/penjualan', async (req, res) => {
  try {
    const { tanggal, gramasi, no_seri, nama_pembeli, harga_jual, harga_restok, keuntungan } = req.body;

    const tanggalVal = safeParseDate(tanggal);
    const gramasiVal = safeParseFloat(gramasi) ?? 0;
    const seriVal = sanitizeString(no_seri, 100) || '';
    const pembeliVal = sanitizeString(nama_pembeli, 200) || '';
    const hargaJualVal = safeParseFloat(harga_jual) ?? 0;
    const hargaRestokVal = safeParseFloat(harga_restok) ?? 0;
    const keuntunganVal = safeParseFloat(keuntungan) ?? 0;

    if (!tanggalVal) return res.status(400).json({ success: false, message: 'Tanggal tidak valid.' });

    const result = await pool.query(
      `INSERT INTO penjualan (tanggal, gramasi, no_seri, nama_pembeli, harga_jual, harga_restok, keuntungan)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tanggalVal, gramasiVal, seriVal, pembeliVal, hargaJualVal, hargaRestokVal, keuntunganVal]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/penjualan]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.delete('/api/penjualan/:id', async (req, res) => {
  try {
    const id = safeParseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const queryCol = isUUID(id) ? 'id' : 'no_seri';
    const result = await pool.query(`DELETE FROM penjualan WHERE ${queryCol} = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record penjualan tidak ditemukan.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/penjualan/:id]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// --- STOK MANUAL ---
app.get('/api/stok_manual', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tanggal_input, no_seri, gramasi, tahun, harga_modal, created_at
       FROM stok_manual
       ORDER BY tanggal_input DESC, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/stok_manual]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.post('/api/stok_manual', async (req, res) => {
  try {
    const { tanggal_input, no_seri, gramasi, tahun, harga_modal } = req.body;

    const tanggalVal = safeParseDate(tanggal_input);
    const seriVal = sanitizeString(no_seri, 100);
    const gramasiVal = safeParseFloat(gramasi) ?? 0;
    const yearVal = safeParseYear(tahun) ?? 2024;
    const modalVal = safeParseFloat(harga_modal) ?? 0;

    if (!tanggalVal) return res.status(400).json({ success: false, message: 'Tanggal tidak valid.' });
    if (!seriVal) return res.status(400).json({ success: false, message: 'Nomor seri tidak valid.' });

    const result = await pool.query(
      `INSERT INTO stok_manual (tanggal_input, no_seri, gramasi, tahun, harga_modal)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tanggalVal, seriVal, gramasiVal, yearVal, modalVal]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/stok_manual]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.put('/api/stok_manual/:id', async (req, res) => {
  try {
    const id = safeParseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const { tanggal_input, no_seri, gramasi, tahun, harga_modal, old_no_seri } = req.body;
    const yearVal = safeParseYear(tahun);
    const queryCol = isUUID(id) ? 'id' : 'no_seri';

    const result = await pool.query(
      `UPDATE stok_manual
       SET tanggal_input = COALESCE($1, tanggal_input),
           no_seri = COALESCE($2, no_seri),
           gramasi = COALESCE($3, gramasi),
           tahun = COALESCE($4, tahun),
           harga_modal = COALESCE($5, harga_modal)
       WHERE ${queryCol} = $6
       RETURNING *`,
      [
        safeParseDate(tanggal_input),
        sanitizeString(no_seri, 100),
        safeParseFloat(gramasi),
        yearVal,
        safeParseFloat(harga_modal),
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record stok manual tidak ditemukan' });
    }

    const updatedRow = result.rows[0];
    const oldSeri = sanitizeString(old_no_seri, 100) || '';
    const newSeri = updatedRow.no_seri;
    if (oldSeri && newSeri && oldSeri.toUpperCase() !== newSeri.toUpperCase()) {
      await pool.query('UPDATE penjualan SET no_seri = $1 WHERE no_seri = $2', [newSeri, oldSeri]);
    }

    res.json({ success: true, data: updatedRow });
  } catch (err) {
    console.error('[PUT /api/stok_manual/:id]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.delete('/api/stok_manual/:id', async (req, res) => {
  try {
    const id = safeParseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const queryCol = isUUID(id) ? 'id' : 'no_seri';
    const result = await pool.query(`DELETE FROM stok_manual WHERE ${queryCol} = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record stok manual tidak ditemukan.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/stok_manual/:id]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// --- HARGA EMAS (Gold Price Board) ---
app.get('/api/harga_emas', async (req, res) => {
  try {
    const tanggal = safeParseDate(req.query.tanggal);
    let query = 'SELECT id, tanggal, gram, harga, jenis_logam, created_at FROM harga_emas';
    const params = [];
    if (tanggal) {
      query += ' WHERE tanggal = $1';
      params.push(tanggal);
    }
    query += ' ORDER BY tanggal DESC, gram ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/harga_emas]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.post('/api/harga_emas', async (req, res) => {
  try {
    const { tanggal, gram, harga, jenis_logam } = req.body;

    const tanggalVal = safeParseDate(tanggal);
    const gramVal = safeParseFloat(gram) ?? 0;
    const hargaVal = safeParseFloat(harga) ?? 0;
    const jenisVal = sanitizeString(jenis_logam, 100) || '';

    if (!tanggalVal) return res.status(400).json({ success: false, message: 'Tanggal tidak valid.' });

    const result = await pool.query(
      `INSERT INTO harga_emas (tanggal, gram, harga, jenis_logam)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tanggalVal, gramVal, hargaVal, jenisVal]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/harga_emas]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.put('/api/harga_emas/:id', async (req, res) => {
  try {
    const id = safeParseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const hargaVal = safeParseFloat(req.body.harga);
    if (hargaVal === null || hargaVal < 0) return res.status(400).json({ success: false, message: 'Harga tidak valid.' });

    const result = await pool.query(
      `UPDATE harga_emas SET harga = $1 WHERE id = $2 RETURNING *`,
      [hargaVal, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harga emas tidak ditemukan' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[PUT /api/harga_emas/:id]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.delete('/api/harga_emas/:id', async (req, res) => {
  try {
    const id = safeParseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid.' });
    const result = await pool.query('DELETE FROM harga_emas WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record harga emas tidak ditemukan.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/harga_emas/:id]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// --- SETTINGS (PIN, Themes, Config) ---
app.get('/api/settings', settingsLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settingsMap = {};
    result.rows.forEach(r => {
      settingsMap[r.key] = r.value;
    });
    res.json(settingsMap);
  } catch (err) {
    console.error('[GET /api/settings]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

app.post('/api/settings', settingsLimiter, async (req, res) => {
  try {
    const key = sanitizeString(req.body.key, 100);
    const value = sanitizeString(req.body.value, 500);

    if (!key) {
      return res.status(400).json({ success: false, message: 'Key setting wajib diisi' });
    }

    // Allowlist of permitted settings keys
    const ALLOWED_KEYS = ['pin', 'harga_emas_theme_color'];
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Key setting tidak diizinkan.' });
    }

    // Validate PIN: only 4–8 digits
    if (key === 'pin') {
      if (!value || !/^\d{4,8}$/.test(value)) {
        return res.status(400).json({ success: false, message: 'PIN harus berupa 4–8 digit angka.' });
      }
    }

    // Validate color: only valid hex color
    if (key === 'harga_emas_theme_color') {
      if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) {
        return res.status(400).json({ success: false, message: 'Format warna tidak valid (gunakan hex, contoh: #0db3a5).' });
      }
    }

    const result = await pool.query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING *`,
      [key, String(value)]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/settings]:', err.message);
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// --- SINKRONISASI KE SUPABASE ---
app.post('/api/sync-to-supabase', async (req, res) => {
  try {
    const result = await syncToSupabase(pool);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Gagal sinkronisasi Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// STATIC ASSETS & CLIENT SERVING
// ==========================================

// Serve static files but exclude sensitive paths
app.use(express.static(__dirname, {
  maxAge: 0,
  etag: true,
  lastModified: true,
  // Do NOT serve dotfiles (.env, .git, etc.)
  dotfiles: 'deny',
}));

// Fallback to index.html for root or SPA navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]:', err.message);
  res.status(500).json({ success: false, message: sanitizeError(err) });
});

// Start Server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`=================================================`);
  console.log(`🚀 Rumaisho Gold Server running on http://127.0.0.1:${PORT}`);
  console.log(`📦 Node.js Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🛡️  Security: Helmet + Rate Limiting enabled`);
  console.log(`🗄️  Database: PostgreSQL (Local)`);
  console.log(`=================================================`);
});
