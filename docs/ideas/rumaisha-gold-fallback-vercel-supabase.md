# Arsitektur Fallback Website Rumaisha Gold (On-Premise Master + Vercel & Supabase Free Tier)

## Problem Statement
Bagaimana menjaga operasional kasir toko fisik tetap berjalan 100% mandiri tanpa ketergantungan internet, sembari menyediakan website cadangan publik di Vercel dengan database Supabase yang terbarui secara berkala tanpa biaya hosting.

## Recommended Direction
- **Server utama**: Berjalan di komputer fisik toko (on-premise) dengan PostgreSQL lokal sebagai Master Database. Operasional kasir dan pencatatan stok berlangsung lokal (latensi < 5ms, kebal gangguan internet).
- **Server cadangan publik**: Frontend React 19 di Vercel dengan backend serverless, membaca database cadangan di Supabase (PostgreSQL free tier).
- **Mekanisme Sinkronisasi**: One-way push dari komputer lokal ke Supabase melalui skrip otomatis terjadwal (setiap tutup toko) atau tombol on-demand di panel admin lokal.

## Key Assumptions to Validate
- [ ] Komputer toko memiliki akses koneksi internet keluar (outbound) ke port pooler Supabase (6543) saat proses pengiriman data.
- [ ] Skrip `pg_dump` dan restore lokal ke Supabase berjalan di bawah 2 menit tanpa mengganggu komputer toko.
- [ ] Vercel Serverless Function dapat membaca data Supabase dengan lancar.

## MVP Scope
### In Scope
- PostgreSQL lokal di komputer toko tetap menjadi database primer.
- Proyek Supabase disiapkan dengan skema dari `backup.sql`.
- Skrip sinkronisasi berkala (Node.js atau skrip Bash) di komputer toko untuk mengunggah snapshot data terbaru ke Supabase.
- Deployment Vercel terhubung ke repositori GitHub dengan `DATABASE_URL` mengarah ke Supabase.

### Out of Scope
- Migrasi total database toko ke cloud (dibatalkan demi keamanan kasir fisik).
- Replikasi dua arah waktu nyata (two-way real-time replication).

## Not Doing (and Why)
- **Moving master database to cloud**: Ditolak karena membuat toko fisik lumpuh total saat internet mati.
- **Realtime bi-directional sync**: Terlalu rumit dan rawan konflik data stok emas.
- **Paid hosting/database**: Seluruh komponen tetap berada di batas gratis (Vercel Free Tier + Supabase Free Tier).

## Open Questions
- Apakah skrip sinkronisasi cukup dijalankan sekali sehari (saat tutup toko) atau perlu otomatis tiap beberapa jam?
