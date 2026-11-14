-- ==============================================================================
-- Rumaisho Gold - Supabase Database Schema & RLS Setup
-- ==============================================================================
-- Skema DDL untuk inisialisasi tabel di Supabase SQL Editor.
-- Meliputi: harga_emas, pembelian, penjualan, stok_manual, dan settings.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PEMBERSIHAN TABEL (CLEANUP)
-- ------------------------------------------------------------------------------
-- Peringatan: Perintah DROP TABLE CASCADE akan menghapus seluruh data tabel.
-- Jalankan bagian ini jika ingin me-reset skema secara bersih dari awal.

DROP TABLE IF EXISTS public.penjualan CASCADE;
DROP TABLE IF EXISTS public.pembelian CASCADE;
DROP TABLE IF EXISTS public.stok_manual CASCADE;
DROP TABLE IF EXISTS public.harga_emas CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- Catatan: Jika hanya ingin mengosongkan data tanpa menghapus tabel:
-- TRUNCATE TABLE public.penjualan, public.pembelian, public.stok_manual, public.harga_emas, public.settings RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------------------------
-- 2. EKSTENSI (EXTENSIONS)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 3. STRUKTUR TABEL (DDL)
-- ------------------------------------------------------------------------------

-- Tabel 1: public.harga_emas
CREATE TABLE IF NOT EXISTS public.harga_emas (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  gram NUMERIC NOT NULL,
  harga NUMERIC NOT NULL,
  jenis_logam TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT harga_emas_pkey PRIMARY KEY (id)
);

-- Tabel 2: public.pembelian
CREATE TABLE IF NOT EXISTS public.pembelian (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  no_seri TEXT NOT NULL,
  harga_beli NUMERIC NOT NULL,
  nama_penjual TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  gramasi NUMERIC NOT NULL DEFAULT 1,
  tahun INTEGER DEFAULT 2024,
  CONSTRAINT pembelian_pkey PRIMARY KEY (id)
);

-- Tabel 3: public.penjualan
CREATE TABLE IF NOT EXISTS public.penjualan (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  gramasi NUMERIC NOT NULL,
  no_seri TEXT NOT NULL,
  nama_pembeli TEXT NOT NULL,
  harga_jual NUMERIC NOT NULL,
  harga_restok NUMERIC NOT NULL,
  keuntungan NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT penjualan_pkey PRIMARY KEY (id)
);

-- Tabel 4: public.stok_manual
CREATE TABLE IF NOT EXISTS public.stok_manual (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tanggal_input DATE NOT NULL,
  no_seri TEXT NOT NULL,
  gramasi NUMERIC NOT NULL,
  tahun INTEGER NOT NULL DEFAULT 2024,
  harga_modal NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT stok_manual_pkey PRIMARY KEY (id)
);

-- Tabel 5: public.settings
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  CONSTRAINT settings_pkey PRIMARY KEY (key)
);

-- ------------------------------------------------------------------------------
-- 4. INDEKS PENCARIAN
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_harga_emas_tanggal ON public.harga_emas(tanggal);
CREATE INDEX IF NOT EXISTS idx_pembelian_tanggal ON public.pembelian(tanggal);
CREATE INDEX IF NOT EXISTS idx_pembelian_no_seri ON public.pembelian(no_seri);
CREATE INDEX IF NOT EXISTS idx_penjualan_tanggal ON public.penjualan(tanggal);
CREATE INDEX IF NOT EXISTS idx_penjualan_no_seri ON public.penjualan(no_seri);
CREATE INDEX IF NOT EXISTS idx_stok_manual_tanggal ON public.stok_manual(tanggal_input);
CREATE INDEX IF NOT EXISTS idx_stok_manual_no_seri ON public.stok_manual(no_seri);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & POLICIES
-- ------------------------------------------------------------------------------
-- Mengaktifkan RLS pada seluruh tabel
ALTER TABLE public.harga_emas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_manual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses penuh untuk anon dan authenticated
CREATE POLICY "Anon Full Access harga_emas" ON public.harga_emas
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon Full Access pembelian" ON public.pembelian
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon Full Access penjualan" ON public.penjualan
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon Full Access stok_manual" ON public.stok_manual
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon Full Access settings" ON public.settings
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
