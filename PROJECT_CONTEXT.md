# TECHNICAL MAP & KNOWLEDGE BASE: PROJECT CONTEXT
**Project Name:** Rumaisho Gold (Rumaisho Shop)  
**Document:** `PROJECT_CONTEXT.md`  
**Generated At:** 2026-10-07  
**Last Updated:** 2026-10-20  
**Current Version:** v2.0 (Design System v2.7)  
**Scope:** Analisis Menyeluruh Arsitektur, Multi-Storage, Deployment Self-Hosted, UI/UX Design System, Database, dan Panduan Operasional  

---

## 1. Analisis Seluruh Project

### 1.1 Ringkasan Eksekutif & Karakteristik Project
Aplikasi **Rumaisho Gold** (Rumaisho Shop) adalah sistem manajemen transaksi dan inventaris toko emas/perhiasan berbasis web. Fitur utamanya mencakup:
1. **Pembelian Kembali (*Buyback*):** Pencatatan emas yang dibeli dari supplier atau pelanggan dengan dukungan nomor seri berulang.
2. **Penjualan Emas:** Penjualan ke pelanggan dengan kalkulasi laba/rugi otomatis dan pengurangan stok berbasis FIFO (*First-In, First-Out*).
3. **Manajemen Stok Emas (Inventory Multi-Unit):** Penggabungan dinamis stok manual dan pembelian, status ketersediaan (*Tersedia* vs *Terjual*), serta riwayat mutasi.
4. **Papan Harga Emas Harian & Snapshot WhatsApp:** Papan harga pecahan gramasi multi-brand (Antam, UBS, Galeri24, Perak Nadir) dan generator gambar PNG status media sosial dengan resolusi tinggi.
5. **Dashboard Analitik & Rekapitulasi:** Visualisasi tren penjualan & laba (Chart.js), tabel rekapitulasi periodik, serta ekspor/impor data Excel & PDF.
6. **Sistem Keamanan Vault:** Layar login PIN 6-digit terproteksi, virtual numpad taktil, auto-logout 10 menit tanpa aktivitas, dan otorisasi PIN untuk seluruh aksi mutasi data.

> [!IMPORTANT]
> **EVOLUSI ARSITEKTUR KODE (Dual-Deployment & Tri-Storage Architecture):**
> 1. **Aplikasi Aktif (Production):**
>    - **Frontend:** Vanilla JavaScript (ES6+ Modules) + HTML5 + CSS3 (Modern Luxury Deep Forest Green & Champagne Gold Theme) yang disajikan dari [index.html](file:///mnt/data/rumaishogold/RumaishaShopGold/index.html), [app.js](file:///mnt/data/rumaishogold/RumaishaShopGold/app.js), [db.js](file:///mnt/data/rumaishogold/RumaishaShopGold/db.js), dan [styles.css](file:///mnt/data/rumaishogold/RumaishaShopGold/styles.css). Library eksternal dimuat via CDN: `exceljs` (4.4.0), `jspdf` (2.5.1), `jspdf-autotable` (3.5.29), `html2canvas` (1.4.1), `chart.js`, dan `font-awesome` (6.4.0).
>    - **Backend & Server:** Server Node.js produksi [server.js](file:///mnt/data/rumaishogold/RumaishaShopGold/server.js) (Express 5, pg, Helmet, Rate Limiter) yang berjalan di port `3002`, dikelola oleh Systemd (`rumaisho.service`), dan di-reverse-proxy oleh Caddy (`rumaishagold.aismu.my.id`).
>    - **Tri-Storage Routing:** Modul [db.js](file:///mnt/data/rumaishogold/RumaishaShopGold/db.js) secara otomatis dan transparan mendeteksi lingkungan penyimpanan:
>      - **Self-Hosted (Utama):** Terhubung ke REST API lokal [server.js](file:///mnt/data/rumaishogold/RumaishaShopGold/server.js) yang terhubung ke PostgreSQL lokal (`rumaisho_db`).
>      - **Cloud Supabase (Alternatif):** Terhubung via `@supabase/supabase-js` jika dijalankan di Vercel dengan environment variables Supabase.
>      - **LocalStorage (Fallback):** Berjalan mandiri di browser tanpa server atau koneksi internet.
> 2. **Legacy / Inactive Prototype:**
>    - Folder `src/` ([App.tsx](file:///mnt/data/rumaishogold/RumaishaShopGold/src/App.tsx), [main.tsx](file:///mnt/data/rumaishogold/RumaishaShopGold/src/main.tsx)), [vite.config.ts](file:///mnt/data/rumaishogold/RumaishaShopGold/vite.config.ts), dan konfigurasi Vite di [package.json](file:///mnt/data/rumaishogold/RumaishaShopGold/package.json) adalah prototipe React 19 awal saat project diekspor dari Google AI Studio. Seluruh pengembangan aktif berjalan 100% pada Vanilla JS.

### 1.2 Identifikasi Teknis & Metadata
- **Struktur Workspace:**
  - Workspace Root: `/mnt/data/rumaishogold`
  - Git Repository Root: `/mnt/data/rumaishogold/RumaishaShopGold` (Origin: `https://github.com/aichandroid/RumaishaShopGold.git`, branch `main`)
  - Skrip Operasional & Deployment: `/mnt/data/rumaishogold/scripts`
  - Direktori Backup Otomatis: `/mnt/data/rumaishogold/backups`
- **Bahasa Pemrograman:** JavaScript (ES6+ Modules, Node.js), HTML5, CSS3. (TypeScript hanya pada prototype warisan `src/`).
- **Framework & Runtime:**
  - **Runtime Backend:** Node.js `v26.10.0` (npm `11.19.1`) via Express 5.
  - **Runtime Frontend:** Browser Client-Side SPA (Native DOM, Custom Dialogs, Custom Dropdowns, tanpa bundler).
  - **Reverse Proxy & TLS:** Caddy Web Server (HTTP/2, zstd, gzip).
  - **Service Manager:** Linux Systemd (`rumaisho.service`).
- **Penyimpanan Data / Database:**
  - **Self-Hosted (Utama):** PostgreSQL 18.6 lokal (`rumaisho_db` - role: `rumaisho_app`).
  - **Cloud (Alternatif):** Supabase PostgreSQL via PostgREST.
  - **Offline (Fallback):** Browser `localStorage` (keys: `rumaisho_*`).
- **Styling & UI Theme:**
  - Desain Sistem: **UI/UX Pro Max Luxury Gold & Deep Forest Green** ([styles.css](file:///mnt/data/rumaishogold/RumaishaShopGold/styles.css)).
  - Canvas: Warm Ivory / Off-White (`#F7F7F3`), Kartu: Clean White (`#FFFFFF`).
  - Aksen: Deep Forest Green (`#123C35`) dan Champagne Gold (`#C6A15B`).
  - Standar Kontras: WCAG 2.2 AA / AAA compliant (kontras teks > 5.5:1 hingga 14:1).
  - Font: Google Fonts **Outfit** (Heading, branding, angka finansial tabular) & **Inter** (Form, label, tabel).
  - Icon: FontAwesome 6.4.0 (CDN).
- **Keamanan & Otorisasi:**
  - **Layar Login Vault (`#login-screen`):** PIN 6-digit (Default: `"310814"`), virtual numpad, peek toggle, auto-logout setelah 10 menit tanpa aktivitas.
  - **Verifikasi Transaksi:** Modal konfirmasi ringkasan data + modal otorisasi PIN untuk setiap operasi mutasi (Tambah, Edit, Hapus, Impor, Ubah PIN).
  - **Proteksi Server:** Helmet (CSP, HSTS, no-sniff, DENY X-Frame), express-rate-limit (300 req/15 min API umum, 30 req/15 min PIN), pemblokiran akses URL file sensitif (`.env`, `.git`, `backup.sql`, `server.ps1`), penolakan `service_role` key pada client.
- **Backup & Pemeliharaan:**
  - Skrip berkala `scripts/backup_db.sh`: Dump PostgreSQL gzipped otomatis dengan kebijakan retensi 30 hari.

---

## 2. Peta Arsitektur Aplikasi

```mermaid
flowchart TD
    subgraph Client [Browser Client - Responsive SPA]
        LoginUI["Layar Login Vault (#login-screen)"]
        UI["Antarmuka Utama (index.html + styles.css v2.7)"]
        AppCtrl["App Controller (app.js)"]
        DAL["Data Access Layer (db.js - GoldDatabase)"]
        AuthVault["PIN Vault & Auto-Logout Engine (10 Menit)"]
        ExcelMod["Excel Engine: ExcelJS 4.4.0"]
        PDFMod["PDF Engine: jsPDF + AutoTable"]
        SnapMod["Snapshot Engine: html2canvas"]
        ChartMod["Analytics: Chart.js"]
        LocalStore[("Browser LocalStorage (Offline Fallback)")]
    end

    subgraph HostServer [Self-Hosted Linux Server]
        Caddy["Caddy Reverse Proxy (rumaishagold.aismu.my.id)"]
        Systemd["Systemd Service (rumaisho.service)"]
        NodeServer["Node.js Express 5 Backend (server.js :3002)"]
        SecurityMW["Security Middleware (Helmet + Rate Limiter)"]
        RESTAPI["REST API (/api/pembelian, /api/penjualan, /api/stok_manual, /api/harga_emas, /api/settings)"]
        PgPool["pg Connection Pool (20 Clients)"]
        PostgresLocal[("PostgreSQL 18.6 Local (rumaisho_db)")]
        AutoBackup["Backup Script (scripts/backup_db.sh -> backups/*.sql.gz)"]
    end

    subgraph CloudVercel [Cloud Deployment Mode - Opsional]
        VercelAPI["/api/config.js (Serverless)"]
        SupabaseCloud[("Supabase PostgreSQL Cloud")]
    end

    LoginUI -->|PIN 6-Digit Valid| UI
    UI --> AppCtrl
    AppCtrl --> AuthVault
    AppCtrl --> ChartMod
    AppCtrl --> ExcelMod
    AppCtrl --> PDFMod
    AppCtrl --> SnapMod
    AppCtrl --> DAL

    Caddy -->|Proxy :3002| NodeServer
    Systemd -.->|Manages| NodeServer
    NodeServer --> SecurityMW
    SecurityMW --> RESTAPI
    RESTAPI --> PgPool
    PgPool --> PostgresLocal
    AutoBackup -.->|Cron / Manual| PostgresLocal

    DAL -->|1. Deteksi /api/config: Mode Self-Hosted| RESTAPI
    DAL -.->|2. Deteksi Supabase Credentials| SupabaseCloud
    DAL -.->|3. Fallback Offline| LocalStore
```

### 2.1 Alur Inisialisasi & Deteksi Storage (`initApp`)
```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna / Kasir
    participant Browser as Browser Client
    participant App as app.js (initApp)
    participant DB as db.js (GoldDatabase)
    participant API as server.js /api/config
    participant Local as Browser LocalStorage

    User->>Browser: Akses Aplikasi
    Browser->>App: Event DOMContentLoaded
    App->>DB: db.loadRemoteConfig()
    alt Lingkungan Self-Hosted (Lokal / Domain)
        DB->>API: GET /api/config
        API-->>DB: { mode: "self-hosted", database: "postgresql" }
        DB->>DB: Set this.isSelfHosted = true
    else Lingkungan Vercel Cloud
        DB->>API: GET /api/config
        API-->>DB: { url, key }
        DB->>DB: Inisialisasi Supabase Client SDK
    else Offline / Static File
        DB->>Local: Baca konfigurasi cadangan
    end
    App->>App: Cek Status Autentikasi (sessionStorage: rumaisho_auth)
    alt Belum Terotentikasi
        App->>Browser: Tampilkan #login-screen (Sembunyikan Konten Utama)
    else Sudah Terotentikasi & Sesi Aktif
        App->>Browser: Tampilkan Main Dashboard & Mulai Inactivity Timer
        App->>DB: Load Data Transaksi & Stok
    end
```

---

## 3. Peta File dan Folder Penting

| Path File / Folder | Fungsi Utama | Komponen yang Menggunakan | Komponen yang Digunakan | Sifat |
| :--- | :--- | :--- | :--- | :--- |
| `RumaishaShopGold/server.js` | Server backend Node.js + Express (740 baris). Menyediakan static asset hosting, REST API PostgreSQL, sanitasi input, rate limiting, dan Helmet security. | Caddy, Systemd, Browser Client | `pg`, `express`, `helmet`, `express-rate-limit`, `dotenv` | **CRITICAL (Self-Hosted)** |
| `RumaishaShopGold/index.html` | Entry point utama frontend SPA (1.096 baris). Layout desktop & mobile, layar login vault, modal forms, status database bar, dan external CDN scripts. | Browser Client | `styles.css`, `app.js` (ES Module), CDN Libraries | **CRITICAL** |
| `RumaishaShopGold/app.js` | Main Orchestrator frontend (~130 baris). Menginisialisasi event listeners, data refresh, dan menghubungkan seluruh modular sub-komponen. | `index.html` | `modules/*.js`, `db.js` | **CRITICAL** |
| `RumaishaShopGold/modules/utils.js` | Modul helper format Rupiah, format ribuan input, format tanggal ID, hexToRgb, tema warna, generator nama file, dan parser tanggal Excel. | Seluruh modul | - | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/ui.js` | Modul kontrol antarmuka umum: pembukaan/penutupan modal, modal konfirmasi transaksi, status bar sinkronisasi database, tanggal header, tab navigasi, dan mobile drawer. | `app.js`, `auth.js`, modul fitur | `utils.js` | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/auth.js` | Modul autentikasi Vault: layar login, virtual touch numpad, session storage, auto-logout inaktivitas 10 menit, dan dialog otorisasi PIN (`showPinModal`). | `app.js`, modul transaksi | `ui.js`, `db.js` | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/pembelian.js` | Modul transaksi pembelian (buyback): form input, auto-fill tanggal hari ini, peringatan buyback stok baru, otorisasi PIN, konfirmasi modal, dan render tabel riwayat. | `app.js` | `db.js`, `utils.js`, `ui.js`, `auth.js` | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/penjualan.js` | Modul transaksi penjualan: form input, searchable custom dropdown nomor seri stok aktif, kalkulasi laba real-time, otorisasi PIN, dan render tabel riwayat penjualan. | `app.js` | `db.js`, `utils.js`, `ui.js`, `auth.js` | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/stok.js` | Modul manajemen inventaris: tab filter stok aktif vs seluruh stok, pencarian live, modal input stok manual, modal edit stok, otorisasi PIN, dan render tabel stok. | `app.js` | `db.js`, `utils.js`, `ui.js`, `auth.js` | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/harga-emas.js` | Modul papan harga emas harian: render kartu harga, quick inline edit, filter tanggal, salin template teks WA, ganti tema warna, dan export gambar snapshot WhatsApp via html2canvas. | `app.js` | `db.js`, `utils.js`, `ui.js`, `auth.js`, `html2canvas` | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/dashboard.js` | Modul analitik bisnis: kartu metrik KPI, render tabel 5 penjualan terkini, rekap bulanan/tahunan/per-jenis logam, dan visualisasi interaktif Chart.js. | `app.js` | `db.js`, `utils.js`, `Chart.js` | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/export-import.js` | Modul pengolahan data dokumen: ekspor/impor seluruh data via ExcelJS dengan deteksi duplikasi tanda tangan transaksi, serta ekspor laporan PDF via jsPDF & autoTable. | `app.js` | `db.js`, `utils.js`, `ui.js`, `auth.js`, `ExcelJS`, `jsPDF` | **CRITICAL (Modular)** |
| `RumaishaShopGold/modules/settings.js` | Modul pengaturan: pergantian PIN keamanan vault dan tombol pemicu sinkronisasi manual Supabase. | `app.js` | `db.js`, `ui.js`, `auth.js` | **CRITICAL (Modular)** |
| `RumaishaShopGold/db.js` | Data Access Layer (1.050 baris). Mendukung tri-storage routing (Self-Hosted REST API, Supabase SDK, LocalStorage fallback), kalkulasi FIFO stok, otorisasi PIN (default: `"310814"`), migrasi data. | Seluruh modul | `/api/*`, Supabase JS SDK, LocalStorage | **CRITICAL** |
| `RumaishaShopGold/styles.css` | Stylesheet sistem desain lengkap (3.268 baris). Token desain luxury gold & forest green, WCAG AA contrast, density 8/10, layout responsif mobile-drawer & desktop sidebar, animasi modal dan layar login. | `index.html` | CSS Variables, Google Fonts | **CRITICAL** |
| `RumaishaShopGold/design-system/` | Dokumentasi arsitektur token desain dan halaman override UI/UX Pro Max (`MASTER.md`, `TOKENS.md`, `pages/dashboard.md`). | Tim Pengembang / AI | - | **DOCUMENTATION** |
| `RumaishaShopGold/logo.jpg` | Asset logo Rumaisho Gold yang tampil di layar login, sidebar, topbar mobile, dan watermark status WhatsApp. | `index.html`, `app.js`, `styles.css` | - | **CRITICAL** |
| `RumaishaShopGold/.env` | Konfigurasi runtime environment produksi lokal (`DATABASE_URL`, `PORT=3002`, `NODE_ENV=production`). Izin file: `chmod 600`. | `server.js`, `scripts/` | - | **CRITICAL (Confidential)** |
| `RumaishaShopGold/.env.example` | Template variabel lingkungan untuk replikasi server baru. | Developer | - | **CONFIG TEMPLATE** |
| `RumaishaShopGold/vercel.json` | Konfigurasi deployment Vercel dengan header keamanan lengkap (CSP, no-sniff, DENY X-Frame, XSS protection, revalidasi cache) dan rewrites SPA. | Vercel Deployment Runner | - | **CRITICAL (pada Vercel)** |
| `RumaishaShopGold/api/config.js` | Serverless endpoint Vercel untuk mendistribusikan environment variable Supabase ke frontend client. | `db.js` (mode Vercel) | Node.js `process.env` | **CRITICAL (pada Vercel)** |
| `scripts/setup_postgres.sh` | Skrip provisioning database PostgreSQL lokal `rumaisho_db`, pembuatan user `rumaisho_app`, konfigurasi hak akses, dan restore data bersih. | Admin Server | PostgreSQL CLI (`psql`) | **OPERATIONAL** |
| `scripts/caddy_rumaisho.conf` | Konfigurasi Caddy reverse proxy untuk domain `rumaishagold.aismu.my.id` dengan kompresi zstd & gzip. | Caddy Web Server | - | **OPERATIONAL** |
| `scripts/rumaisho.service` | Konfigurasi unit systemd untuk menjaga server Node.js berjalan persisten dengan auto-restart. | Systemd | `npm run start` | **OPERATIONAL** |
| `scripts/deploy_systemd_caddy.sh` | Skrip automasi deployment service systemd dan integrasi konfigurasi Caddy. | Admin Server | `systemctl`, Caddy | **OPERATIONAL** |
| `scripts/backup_db.sh` | Skrip backup berkala otomatis PostgreSQL dengan dump gzipped dan rotasi retensi 30 hari. | Cron / Admin Server | `pg_dump`, `gzip` | **OPERATIONAL** |
| `scripts/restore_rumaisho.sql` | SQL dump bersih skema dan data awal hasil kurasi dari database sebelumnya. | `setup_postgres.sh` | PostgreSQL | **DATA BACKUP** |
| `backups/` | Direktori penyimpanan berkas arsip backup database berkala (`rumaisho_db_*.sql.gz`). | `backup_db.sh` | - | **DATA STORAGE** |
| `RumaishaShopGold/src/` | Folder sisa prototipe awal React 19 + TypeScript (`App.tsx`, `main.tsx`). Tidak aktif pada aplikasi produksi. | - | React, Vite | **INACTIVE / LEGACY** |
| `RumaishaShopGold/package.json` | Konfigurasi package Node.js. Menyediakan perintah `"start": "node server.js"` dan dependencies backend (`express`, `pg`, `helmet`, dll). | Node.js / npm | Express, pg, Helmet, ExcelJS | **CRITICAL** |

---

## 4. Identifikasi Entry Point

### 4.1 Entry Point Server Produksi (Self-Hosted Node.js)
- **Nama:** Self-Hosted Express Application Server
- **Lokasi File:** [RumaishaShopGold/server.js](file:///mnt/data/rumaishogold/RumaishaShopGold/server.js)
- **Perintah Jalankan:**
  - Production (Systemd): `sudo systemctl start rumaisho.service`
  - Manual CLI: `cd /mnt/data/rumaishogold/RumaishaShopGold && npm run start`
- **Port Default:** `3002` (Reverse-proxied oleh Caddy pada port 80/443).

### 4.2 Entry Point Frontend Client (SPA)
- **Nama:** Primary Web Frontend SPA
- **Lokasi File:** [RumaishaShopGold/index.html](file:///mnt/data/rumaishogold/RumaishaShopGold/index.html)
- **Script Modul:** [RumaishaShopGold/app.js](file:///mnt/data/rumaishogold/RumaishaShopGold/app.js) (`<script type="module" src="app.js"></script>`)
- **Fungsi:** Titik awal eksekusi seluruh logika interaksi user, inisialisasi basis data, routing tab/drawer, validasi formulir, dan event listener.

### 4.3 Entry Point Cloud Serverless (Vercel)
- **Nama:** Remote Supabase Config Endpoint
- **Lokasi File:** [RumaishaShopGold/api/config.js](file:///mnt/data/rumaishogold/RumaishaShopGold/api/config.js)
- **Fungsi:** Menyediakan kredensial URL dan Anon Key Supabase secara dinamis ke browser client saat berjalan di Vercel.

---

## 5. Dependency dan Package

### 5.1 External CDN Dependencies (Aplikasi Aktif di `index.html`)
| Library CDN | Versi | Kategori | Fungsi Kritis |
| :--- | :--- | :--- | :--- |
| `exceljs` | `4.4.0` (jsdelivr) | Data Export/Import | Parsing spreadsheet Excel (`.xlsx`) pada fitur Impor Pembelian & Penjualan, serta pembuatan workbook ekspor berformat lengkap. Menggantikan pustaka SheetJS lama. |
| `@supabase/supabase-js` | `v2` (jsdelivr) | Database & Auth | Client SDK untuk operasi query dan sinkronisasi ke Supabase PostgreSQL Cloud. |
| `jspdf` | `2.5.1` (cdnjs) | Document Export | Pembuatan berkas PDF laporan cetak transaksi, riwayat penjualan, dan inventaris stok. |
| `jspdf-autotable` | `3.5.29` (cdnjs) | Document Export | Plugin format tabel otomatis pada dokumen PDF yang dibuat oleh jsPDF. |
| `html2canvas` | `1.4.1` (cdnjs) | Graphic / Image Capture | Merender elemen HTML `#gold-prices-snapshot-area` menjadi canvas bitmap PNG untuk snapshot status WhatsApp. |
| `chart.js` | Latest (jsdelivr) | Visual Analytics | Merender visualisasi grafik garis (*line*) dan batang (*bar*) pada dashboard rekap kinerja keuangan. |
| `font-awesome` | `6.4.0` (cdnjs) | UI Icons | Kumpulan icon antarmuka (brankas, keranjang, koin, gembok, excel, pdf, drawer menu). |
| Google Fonts | Outfit & Inter | Web Fonts | Outfit (Heading, angka finansial tabular) dan Inter (Body text, data tables, label). |

### 5.2 NPM Package Dependencies (Di `package.json` - Server & Utility)
- **Backend Server & Security:**
  - `express` (`^5.3.0`): Web framework minimalis penyedia REST API dan file server.
  - `pg` (`^8.23.1`): PostgreSQL client pool connection untuk Node.js dengan custom type parsers.
  - `helmet` (`^8.3.0`): HTTP security headers (CSP, HSTS, no-sniff, x-frame-options).
  - `express-rate-limit` (`^8.7.1`): Rate limiting proteksi brute-force dan DoS.
  - `dotenv` (`^18.0.7`): Pemuat environment variables dari berkas `.env`.
- **Data & Excel Utility:**
  - `exceljs` (`^4.4.0`): Pustaka parsing dan builder file spreadsheet.
- **Legacy Prototipe React (Folder `src/`):**
  - `react` (`^19.0.1`), `react-dom` (`^19.0.1`), `motion` (`^12.23.24`), `lucide-react` (`^0.546.0`), `tailwind-merge` (`^3.5.0`), `vite` (`^6.2.3`).

---

## 6. Database dan Skema Penyimpanan

Aplikasi menggunakan arsitektur **Tri-Storage Routing**:
1. **Self-Hosted PostgreSQL (`rumaisho_db`):** Basis data sentral produksi pada server lokal, diakses melalui REST API [server.js](file:///mnt/data/rumaishogold/RumaishaShopGold/server.js).
2. **Supabase PostgreSQL Cloud:** Basis data alternatif saat aplikasi di-deploy di Vercel atau terhubung via cloud credentials.
3. **Browser LocalStorage:** Penyimpanan lokal offline jika server backend atau cloud tidak dapat dihubungi.

### 6.1 Database Schema (PostgreSQL DDL)

#### 1. Tabel `pembelian` (Purchases / Buyback)
Mencatat seluruh emas yang dibeli toko dari supplier atau pelanggan luar.
```sql
CREATE TABLE pembelian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE NOT NULL,
    no_seri TEXT NOT NULL,
    tahun INTEGER DEFAULT NULL,
    gramasi NUMERIC NOT NULL DEFAULT 1,
    harga_beli NUMERIC NOT NULL,
    nama_penjual TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```
- **Catatan Relasi:** Kolom `no_seri` **TIDAK memiliki batasan UNIQUE constraint**. Hal ini memungkinkan emas dengan nomor seri yang sama dibeli kembali di masa depan setelah unit sebelumnya terjual (*buyback cycle*).

#### 2. Tabel `stok_manual` (Manual Inventory)
Mencatat modal atau stok emas yang diinput secara manual langsung ke etalase toko (tanpa nota pembelian).
```sql
CREATE TABLE stok_manual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal_input DATE NOT NULL,
    no_seri TEXT NOT NULL,
    gramasi NUMERIC NOT NULL,
    tahun INTEGER NOT NULL,
    harga_modal NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

#### 3. Tabel `penjualan` (Sales)
Mencatat transaksi penjualan emas ke pelanggan pembeli.
```sql
CREATE TABLE penjualan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE NOT NULL,
    gramasi NUMERIC NOT NULL,
    no_seri TEXT NOT NULL,
    nama_pembeli TEXT NOT NULL,
    harga_jual NUMERIC NOT NULL,
    harga_restok NUMERIC NOT NULL,
    keuntungan NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```
- **Kalkulasi Bisnis:** `keuntungan = harga_jual - harga_restok`.

#### 4. Tabel `harga_emas` (Daily Gold Price Board)
Mencatat riwayat papan harga emas harian untuk berbagai pecahan berat dan brand logam mulia.
```sql
CREATE TABLE harga_emas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE NOT NULL,
    gram NUMERIC NOT NULL,
    harga NUMERIC NOT NULL,
    jenis_logam TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```
- **Nilai `jenis_logam`:** `Antam`, `UBS`, `Galeri24`, `Perak Nadir`, atau teks kustom.

#### 5. Tabel `settings` (Application Settings)
Menyimpan pasangan kunci-nilai konfigurasi aplikasi.
```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```
- **Key Penting:**
  - `'pin'`: Menyimpan kode PIN otorisasi (Default produksi: `"310814"`).
  - `'harga_emas_theme_color'`: Menyimpan kode warna heksadesimal tema papan harga emas (Default: `"#0db3a5"`).

### 6.2 Logika Agregasi Inventaris & FIFO Matching (`db.js: getStokEmas`)
Fungsi `getStokEmas()` di [db.js](file:///mnt/data/rumaishogold/RumaishaShopGold/db.js) menggabungkan sumber stok secara dinamis:
1. Mengambil seluruh record dari `pembelian` dan `stok_manual`.
2. Mengelompokkan stok berdasarkan nomor seri yang dinormalisasi (`trim().toUpperCase()`) dan mengurutkannya secara kronologis menaik (tanggal terlama lebih dulu).
3. Mengelompokkan seluruh record `penjualan` berdasarkan nomor seri dan mengurutkannya secara kronologis menaik.
4. Memasangkan setiap penjualan ke unit stok tertua yang belum terjual (**First-In, First-Out**).
5. Unit stok yang terpasang ditandai `is_sold = true`, `status = "Terjual"`, dan menyimpan detail pembeli di `sale_info`.
6. Unit stok yang belum terpasang ditandai `is_sold = false`, `status = "Tersedia"`.
7. Saat kasir menginput penjualan baru, dropdown nomor seri hanya menampilkan nomor seri yang memiliki unit berstatus **Tersedia**.

---

## 7. API dan Komunikasi

### 7.1 Serverless & Self-Hosted API Endpoints (`server.js`)

| Method | Endpoint | Fungsi | Proteksi & Validasi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health check koneksi PostgreSQL. | Rate limit general |
| `GET` | `/api/config` | Mengembalikan status mode server (`mode: "self-hosted"`). | `no-store` cache header |
| `GET` | `/api/pembelian` | Mengambil seluruh riwayat pembelian (urut tanggal desc). | Sanitasi output |
| `POST` | `/api/pembelian` | Menambah data pembelian emas baru. | Validasi tanggal, serial, gramasi > 0, harga >= 0 |
| `PUT` | `/api/pembelian/:id` | Mengupdate data pembelian & cascade update no seri penjualan jika berubah. | Validasi UUID/ID, sanitasi string |
| `DELETE` | `/api/pembelian/:id` | Menghapus record pembelian. | Validasi UUID/ID |
| `GET` | `/api/penjualan` | Mengambil seluruh riwayat transaksi penjualan. | Sanitasi output |
| `POST` | `/api/penjualan` | Menambah transaksi penjualan baru. | Validasi tanggal, harga jual, restok, untung |
| `DELETE` | `/api/penjualan/:id` | Menghapus record penjualan. | Validasi UUID/ID |
| `GET` | `/api/stok_manual` | Mengambil data modal stok manual. | Sanitasi output |
| `POST` | `/api/stok_manual` | Menambah stok manual baru. | Validasi tanggal, serial, gramasi, tahun |
| `PUT` | `/api/stok_manual/:id` | Mengupdate data stok manual & cascade update seri penjualan. | Validasi UUID/ID |
| `DELETE` | `/api/stok_manual/:id` | Menghapus data stok manual. | Validasi UUID/ID |
| `GET` | `/api/harga_emas` | Mengambil daftar harga emas (opsional filter query `?tanggal=YYYY-MM-DD`). | Format YYYY-MM-DD |
| `POST` | `/api/harga_emas` | Menambah baris harga emas pecahan. | Validasi gramasi dan nominal |
| `PUT` | `/api/harga_emas/:id` | Inline update harga emas harian. | Validasi nominal >= 0 |
| `DELETE` | `/api/harga_emas/:id` | Menghapus item harga emas. | Validasi UUID/ID |
| `GET` | `/api/settings` | Mengambil map seluruh setting aplikasi. | Settings rate limit (30 req/15 min) |
| `POST` | `/api/settings` | Menyimpan setting (`pin` 4–8 digit, `harga_emas_theme_color` hex). | Strict key allowlist & regex |

---

## 8. Fitur Aplikasi

### Fitur 1: Layar Login Vault & Sistem Sesi
- **Tujuan:** Mengamankan akses aplikasi dari personil yang tidak berwenang.
- **Komponen:** `#login-screen`, `#login-pin-boxes`, `#login-numpad`.
- **Alur Kerja:**
  1. Pengguna wajib memasukkan 6 digit PIN (Default: `"310814"`).
  2. Input dapat melalui physical keyboard, mobile number keypad, atau virtual numpad taktil.
  3. Tombol peek mata untuk menampilkan/menyembunyikan digit PIN.
  4. Animasi *shake* dan pesan status jika PIN salah.
  5. **Auto-Logout Sesi:** Timer inaktivitas 10 menit tanpa interaksi pengguna otomatis menutup sesi dan mengembalikan tampilan ke layar login vault.
  6. Tombol manual logout tersedia di desktop sidebar dan mobile drawer.

### Fitur 2: Dashboard Ringkasan Bisnis & Analitik
- **Entry Point:** Tab "Dashboard" (`data-tab="dashboard"`).
- **Sub-Fitur:**
  - 4 Kartu KPI Kompak: Total Pembelian, Total Penjualan, Total Keuntungan, Stok Emas Aktif.
  - Tabel Rekapitulasi Finansial: Filter Per Bulan, Per Tahun, atau Per Item Logam (Antam, UBS, Galeri24, Perak Nadir).
  - Grafik Performa Keuangan (Chart.js): Garis Penjualan (Champagne Gold) vs Keuntungan Bersih (Emerald Green).
  - Tabel Transaksi Penjualan Terbaru: Menampilkan 5 transaksi penjualan terkini.
  - Quick action links untuk input transaksi cepat.

### Fitur 3: Riwayat & Input Pembelian Emas (Buyback)
- **Entry Point:** Tab "Pembelian" -> Tombol "Tambah Pembelian".
- **Spesifikasi:**
  - Form input: Tanggal, Nomor Seri, Tahun (opsional), Gramasi, Harga Beli (format ribuan dinamis), Nama Penjual.
  - Otorisasi: Modal konfirmasi ringkasan data + verifikasi PIN sebelum data disimpan.
  - Siklus Buyback: Mendukung pembelian ulang nomor seri yang pernah terjual tanpa menghapus riwayat sebelumnya.
  - Ekspor/Impor: Ekspor Excel via `ExcelJS`, ekspor PDF via `jsPDF`, dan impor massal dari file spreadsheet `.xlsx`.

### Fitur 4: Riwayat & Input Penjualan Emas
- **Entry Point:** Tab "Penjualan" -> Tombol "Tambah Penjualan".
- **Spesifikasi:**
  - Custom Searchable Dropdown No Seri: Hanya menampilkan unit stok yang berstatus **Tersedia**.
  - Kalkulasi Keuntungan Otomatis: Menghitung selisih `harga_jual - harga_restok` secara real-time.
  - Otorisasi: Verifikasi PIN pada saat submit.
  - Ekspor/Impor: Ekspor Excel & PDF, impor Excel penjualan.

### Fitur 5: Manajemen Stok Emas (Inventory Multi-Unit)
- **Entry Point:** Tab "Stok Emas".
- **Spesifikasi:**
  - 4 Ringkasan Metrik: Total Item Aktif, Total Berat Gram, Total Modal Stok (Rp), Total Item Terjual.
  - Filter Status: Tab "Stok Tersedia" vs Tab "Semua Riwayat (Termasuk Terjual)".
  - Live Search: Filter berdasarkan no seri, nama penjual, atau tahun.
  - Edit & Hapus Stok: Dilengkapi proteksi konfirmasi khusus jika item sudah berstatus "Terjual".

### Fitur 6: Papan Harga Emas Harian & Snapshot WhatsApp
- **Entry Point:** Tab "Harga Emas".
- **Spesifikasi:**
  - Tabel harga multi-brand dengan inline quick edit harga rupiah langsung di sel tabel.
  - Fitur "Salin Harga Terakhir": Menggandakan seluruh susunan harga dari hari sebelumnya.
  - Tombol "Snapshot Status WA": Merender kontainer `#gold-prices-snapshot-area` menggunakan `html2canvas` (`scale: 2`) menjadi file gambar PNG berkualitas tinggi dengan watermark resmi toko, memicu native Web Share API atau download file otomatis.
  - Kustomisasi Warna Tema: Pemilihan palet tema warna hijau/emas dengan penyesuaian kontras teks otomatis (gelap/terang).

---

## 9. Konfigurasi dan Environment

### 9.1 Environment Variables (`.env`)
| Variable Key | Nilai / Contoh | Keterangan |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Mengaktifkan HSTS, menyembunyikan detail stack error database. |
| `PORT` | `3002` | Port internal Node.js Express server. |
| `DATABASE_URL` | `postgresql://rumaisho_app:password@127.0.0.1:5432/rumaisho_db` | Connection string PostgreSQL lokal. |
| `SUPABASE_URL` | `https://xxxxxxxx.supabase.co` | Kredensial opsional untuk fallback cloud di Vercel. |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | Kunci anonim publik Supabase untuk Vercel. |

### 9.2 File Konfigurasi Infrastruktur
- **`RumaishaShopGold/server.js`:** Konfigurasi connection pool, rate limiting, dan header Helmet.
- **`RumaishaShopGold/vercel.json`:** Konfigurasi routing serverless Vercel dan header keamanan HTTP.
- **`scripts/caddy_rumaisho.conf`:** Konfigurasi reverse proxy domain `rumaishagold.aismu.my.id`.
- **`scripts/rumaisho.service`:** Unit file systemd untuk daemon Node.js.

---

## 10. Panduan Operasional, Build, dan Deployment

### 10.1 Manajemen Service Produksi (Systemd)
```bash
# Periksa status service aplikasi
sudo systemctl status rumaisho.service

# Restart service setelah perubahan server.js atau file backend
sudo systemctl restart rumaisho.service

# Melihat log aplikasi secara langsung (live output)
journalctl -u rumaisho.service -f

# Uji health check API lokal
curl http://127.0.0.1:3002/api/health
```

### 10.2 Manajemen Backup Database Berkala
```bash
# Menjalankan backup database manual
/mnt/data/rumaishogold/scripts/backup_db.sh

# Memeriksa daftar berkas backup yang tersimpan
ls -lh /mnt/data/rumaishogold/backups/
```

### 10.3 Cara Menjalankan dalam Development Lokal
```bash
cd /mnt/data/rumaishogold/RumaishaShopGold
npm run start
# Buka peramban di http://127.0.0.1:3002
```

---

## 11. Testing Status

- **Unit / Integration / E2E Testing Framework:** UNKNOWN (Belum ada Jest, Vitest, Cypress, atau Playwright terpasang).
- **Verifikasi Saat Ini:**
  - Pengujian manual fungsional form dan validasi numerik.
  - Pengujian manual kalkulasi FIFO stok dan laba penjualan.
  - Health check endpoint `/api/health` mengembalikan status database terkoneksi.

---

## 12. Aspek Keamanan (Security Analysis)

1. **Proteksi Header & Jaringan (`CONFIRMED HARDENED`)**
   - Helmet dikonfigurasi aktif pada `server.js` dengan Content Security Policy (CSP), Referrer-Policy, dan HSTS pada mode produksi.
   - Pemblokiran URL sensitif pada tingkat middleware untuk file `.env`, `.git`, `backup.sql`, `server.ps1`, dll.
2. **Brute Force & DoS Protection (`CONFIRMED HARDENED`)**
   - Rate limiting 300 request / 15 menit per IP pada seluruh rute API.
   - Rate limiting ketat 30 request / 15 menit untuk manipulasi setting dan PIN.
3. **Session Vault & Auto-Logout (`CONFIRMED HARDENED`)**
   - Sesi terisolasi di `sessionStorage` dengan mekanisme auto-logout otomatis setelah 10 menit tanpa aktivitas pengguna.
4. **Validasi File Impor Spreadsheet (`CONFIRMED HARDENED`)**
   - Penggunaan `ExcelJS` menggantikan `SheetJS` lama, parsing berbasis cell-by-cell dengan sanitasi nilai tanggal, teks, dan format angka.
5. **Catatan PIN Storage (`SECURITY_REVIEW_RECOMMENDED`)**
   - Nilai PIN saat ini disimpan sebagai string numerik 6-digit di tabel `settings`. Untuk masa mendatang direkomendasikan penggunaan hashing (seperti Argon2 atau bcrypt).

---

## 13. Masalah dan Technical Debt

### 13.1 Confirmed Technical Debt
- **[RESOLVED] Modularisasi Monolitik Client-Side (Opsi A):** `app.js` yang sebelumnya berupa file monolitik ~2.980 baris telah dipecah menjadi 10 native browser ES modules di dalam direktori `modules/` tanpa dependensi bundler atau npm build step. `app.js` kini berperan sebagai orchestrator ramping (~130 baris).
- **[RESOLVED] Migrasi Pustaka Excel:** Pustaka SheetJS (`xlsx`) telah sepenuhnya digantikan oleh `ExcelJS` (`^4.4.0`) di frontend dan backend.
- **[RESOLVED] Relasi Pembelian & Stok Buyback:** Algoritma FIFO matching di `db.js` kini memastikan penjualan hanya memotong inventaris yang tanggal belinya `<=` tanggal penjualan, mencegah penjualan lama mengonsumsi stok buyback baru secara keliru.
- **[CONFIRMED] Dual-Codebase Discrepancy:** Folder `src/` ([App.tsx](file:///mnt/data/rumaishogold/RumaishaShopGold/src/App.tsx)) adalah prototipe warisan React. Perubahan pada `src/` tidak akan berpengaruh pada aplikasi aktif yang berjalan dari [index.html](file:///mnt/data/rumaishogold/RumaishaShopGold/index.html) dan [app.js](file:///mnt/data/rumaishogold/RumaishaShopGold/app.js).
- **[CONFIRMED] Komputasi FIFO Client-Side:** Fungsi `getStokEmas()` melakukan pencocokan FIFO pada memori browser. Skalabilitas optimal untuk hingga puluhan ribu transaksi; jika transaksi melampaui ratusan ribu, kalkulasi FIFO disarankan dipindahkan ke stored procedure SQL atau endpoint agregasi backend.

---

## 14. Dependency Graph

```
index.html (UI Entry Point v2.8 Modular)
 │
 ├── styles.css (UI/UX Pro Max Luxury Gold & Forest Green)
 │
 └── app.js (Native ES Module Orchestrator ~130 baris)
      │
      ├── modules/utils.js (Format Rupiah, Ribuan, Tanggal, Theme Hex, Excel Date)
      ├── modules/ui.js (Modal Dialogs, Toast/Status Bar, Topbar, Tabs, Mobile Drawer)
      ├── modules/auth.js (Login Screen, Virtual Touch Numpad, Session, Inactivity Timeout, Pin Modal)
      │
      ├── modules/pembelian.js (Form Buyback, Konfirmasi Modal, Tabel Pembelian)
      ├── modules/penjualan.js (Form Penjualan, Searchable Serial Dropdown, Laba Live, Tabel Penjualan)
      ├── modules/stok.js (Filter Stok Aktif/Semua, Search Live, Modal Stok Manual/Edit, Tabel Stok)
      ├── modules/harga-emas.js (Papan Harga Emas, Quick Inline Edit, Template WA, Snapshot html2canvas)
      ├── modules/dashboard.js (Kartu KPI, 5 Penjualan Terkini, Rekap Periode/Logam, Chart.js)
      ├── modules/export-import.js (ExcelJS Export/Import, Signature Duplicate Detection, jsPDF Export)
      └── modules/settings.js (Ubah PIN Vault, Sinkronisasi Manual Supabase)
           │
           └── db.js (Tri-Storage DAL: GoldDatabase)
                │
                ├── /api/* (Node.js Express Server: server.js)
                │    └── PostgreSQL 18.6 Local (rumaisho_db via pg pool)
                │
                ├── window.supabase (Supabase Cloud PostgREST - Mode Vercel)
                │    └── Supabase PostgreSQL Cloud
                │
                └── window.localStorage (Browser Offline Fallback)
```

---

## 15. Safe Change Map

| Komponen / Bagian Kode | Tingkat Resiko | Alasan & Dampak Perubahan |
| :--- | :---: | :--- |
| **Styling CSS (`styles.css`) & Layout HTML** | **LOW IMPACT** | Mengubah warna, padding, font, icon, atau tata letak kartu tidak merusak integritas data transaksi. |
| **Format Cetak PDF & Template Excel (`exportToPDF`, `exportToExcel`)** | **LOW IMPACT** | Mengubah tampilan layout ekspor tidak memengaruhi skema basis data internal. |
| **Inline Form Validation & Format Ribuan (`setupRibuanInput`)** | **MEDIUM IMPACT** | Jika regex atau event handler rusak, user tidak dapat menginput nominal harga dengan benar. |
| **Fitur Impor Excel (`handleImportExcel`)** | **MEDIUM IMPACT** | Perubahan kolom header atau parser tanggal ExcelJS dapat mengakibatkan data Excel gagal diimpor. |
| **Logika Dashboard Rekap & Chart (`loadDashboardData`)** | **MEDIUM IMPACT** | Mengubah rumus rekap bulanan/tahunan memengaruhi ketepatan angka laba dan grafik penjualan. |
| **Sistem Autentikasi Vault (`setupLoginEventListeners`, `isAuthenticated`)** | **HIGH IMPACT** | Kesalahan pada alur token atau validasi PIN dapat mengunci kasir dari sistem atau membuka akses tanpa verifikasi. |
| **Endpoint REST API (`server.js`) & Skema Database** | **HIGH IMPACT** | Perubahan endpoint atau query SQL memengaruhi komunikasi data antara client dan PostgreSQL. |
| **Logika FIFO Stok Emas (`db.js: getStokEmas`)** | **CRITICAL IMPACT** | Menentukan status ketersediaan unit emas. Kesalahan kalkulasi dapat memicu ketidaksesuaian stok fisik dan mutasi penjualan. |

---

## 16. Change Impact Guide

### Skenario A: Mengubah Skema / Kolom pada Tabel Pembelian
1. Periksa DDL SQL script di `index.html` dan `scripts/restore_rumaisho.sql`.
2. Periksa endpoint `GET`, `POST`, `PUT`, `DELETE /api/pembelian` di `server.js`.
3. Periksa fungsi `getPembelian`, `addPembelian`, `updatePembelian`, dan `deletePembelian` di `db.js`.
4. Periksa form modal `#modal-add-beli` dan `#modal-edit-stok` di `index.html`.
5. Periksa handler submit `#btn-submit-beli` dan `#btn-submit-edit-stok` di `app.js`.
6. Periksa fungsi `exportToExcel`, `exportToPDF`, dan `handleImportExcel` di `app.js`.

### Skenario B: Mengubah Logika Penjualan & Kalkulasi Keuntungan
1. Periksa fungsi `calculateProfit` di `app.js`.
2. Periksa pengisian dropdown nomor seri `populateSerialDropdown` di `app.js`.
3. Periksa endpoint `/api/penjualan` di `server.js` serta fungsi `addPenjualan` di `db.js`.
4. Periksa dampak terhadap logika FIFO `getStokEmas` di `db.js` (pastikan pencocokan unit terjual tetap sinkron).
5. Periksa metrik ringkasan di `loadDashboardData` dan grafik `recapChartInstance`.

### Skenario C: Mengubah Sistem PIN Vault & Autentikasi
1. Periksa fungsi `getPin` dan `updatePin` di `db.js` serta endpoint `/api/settings` di `server.js`.
2. Periksa variabel `DEFAULT_PIN` (saat ini `"310814"`).
3. Periksa elemen `#login-screen` di `index.html` dan handler `setupLoginEventListeners` di `app.js`.
4. Periksa fungsi `requestPinAuthorization` untuk aksi mutasi form.
5. Periksa timer inaktivitas `startInactivityTracker` di `app.js`.

---

## 17. Konvensi Kode dan Standar Project (Project Conventions)

- **Bahasa Antarmuka & Penamaan Bisnis:** Menggunakan Bahasa Indonesia untuk UI dan istilah bisnis emas (contoh: `pembelian`, `penjualan`, `stok_emas`, `harga_emas`, `no_seri`, `gramasi`, `harga_restok`, `keuntungan`).
- **Format Penomoran:** 
  - Mata uang diformat menggunakan `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })` (contoh: `Rp 1.450.000`).
  - Input teks nominal menggunakan pemisah ribuan dinamis (`formatRibuanInput`, contoh input: `1.000.000` diparse menjadi angka murni `1000000`).
  - Format gramasi mendukung 3 digit desimal (`step="0.001"`), contoh: `0.5`, `1.0`, `10.255`.
- **Format Tanggal:**
  - Input HTML: Format standar ISO `YYYY-MM-DD`.
  - Tampilan User: Bahasa Indonesia lengkap via `toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })`.
- **Arsitektur Modul:** 
  - `server.js`: Menangani murni rute HTTP REST, koneksi pool PostgreSQL, sanitasi input, dan pengiriman static files.
  - `db.js`: Menangani abstraksi akses data, routing tri-storage, algoritma FIFO, dan sinkronisasi. Tidak memanipulasi DOM.
  - `app.js`: Main orchestrator (~130 baris) yang mengimpor dan mengoordinasikan sub-modul fungsional di folder `modules/`.
  - `modules/*.js`: Modul-modul native browser ES6 (`utils`, `ui`, `auth`, `pembelian`, `penjualan`, `stok`, `harga-emas`, `dashboard`, `export-import`, `settings`) dengan tanggung jawab spesifik dan bebas circular dependency.
- **Konvensi Styling:** Menggunakan variabel CSS di `:root` sesuai Design System UI/UX Pro Max (`--brand-primary: #123C35`, `--brand-gold: #C6A15B`, `--bg-page: #F7F7F3`, `--bg-surface: #FFFFFF`, dll).

---

## 18. Current Project State

- **Tanggal Dokumen:** 2026-10-20.
- **Status Operasional:** **Production-Ready & Active (Self-Hosted on Linux)**.
- **Status Layanan:**
  - Backend `server.js` berjalan via `rumaisho.service` (Systemd) di port `3002`.
  - Reverse Proxy Caddy aktif melayani `rumaishagold.aismu.my.id`.
  - Database PostgreSQL lokal `rumaisho_db` terisi data operasional nyata (pembelian, penjualan, papan harga emas).
  - Skrip backup berkala `scripts/backup_db.sh` siap digunakan.
- **Status Antarmuka:** Versi 2.8 Modular Architecture (Native ES Modules) dengan tema Luxury Gold & Deep Forest Green, navigasi drawer mobile, dan sistem keamanan PIN Vault 6-digit.

---

## 19. Instructions for Future AI Sessions

Ketika AI asisten lainnya diminta melakukan perubahan pada project ini di masa mendatang:

1. **Baca file `PROJECT_CONTEXT.md` ini terlebih dahulu** sebelum menganalisis atau mengubah file apa pun.
2. **Pahami bahwa aplikasi aktif adalah Vanilla JS + Node.js Backend:**
   - Frontend: [index.html](file:///mnt/data/rumaishogold/RumaishaShopGold/index.html), [app.js](file:///mnt/data/rumaishogold/RumaishaShopGold/app.js), [db.js](file:///mnt/data/rumaishogold/RumaishaShopGold/db.js), [styles.css](file:///mnt/data/rumaishogold/RumaishaShopGold/styles.css).
   - Backend: [server.js](file:///mnt/data/rumaishogold/RumaishaShopGold/server.js).
   - Jangan menyentuh folder `src/` kecuali user secara eksplisit meminta migrasi ke React.
3. **Pustaka Spreadsheet adalah `ExcelJS`:** Jangan menggunakan atau mengembalikan `xlsx` (SheetJS) karena pustaka tersebut telah dipensiunkan dari proyek ini demi keamanan dan kebersihan kode.
4. **Pertahankan Sistem Keamanan Vault & PIN:**
   - PIN default sistem saat ini adalah `"310814"`.
   - Pertahankan modal konfirmasi data dan otorisasi PIN sebelum setiap aksi penambahan, perubahan, atau penghapusan data.
   - Pertahankan fitur auto-logout inaktivitas 10 menit.
5. **JANGAN PERNAH** memasukkan credential, password, database connection string, secret token, atau API key nyata ke dalam `PROJECT_CONTEXT.md` maupun commit git.
6. **Perbarui `PROJECT_CONTEXT.md`** setelah melakukan perubahan struktural atau penambahan fitur besar.
