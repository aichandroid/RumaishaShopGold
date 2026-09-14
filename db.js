// Database Module for Rumaisho Gold App
// Supports transparent routing between LocalStorage and Supabase

// Default PIN
const DEFAULT_PIN = "1234";

// Initial Mock Data
const MOCK_GOLD_PRICES = [
    { tanggal: "2026-07-20", gram: 1, harga: 1450000, jenis_logam: "Antam" },
    { tanggal: "2026-07-20", gram: 5, harga: 7050000, jenis_logam: "Antam" },
    { tanggal: "2026-07-20", gram: 10, harga: 14000000, jenis_logam: "Antam" },
    { tanggal: "2026-07-20", gram: 1, harga: 1420000, jenis_logam: "UBS" },
    { tanggal: "2026-07-20", gram: 5, harga: 6900000, jenis_logam: "UBS" },
    { tanggal: "2026-07-20", gram: 1, harga: 1430000, jenis_logam: "Galeri24" },
    { tanggal: "2026-07-20", gram: 10, harga: 250000, jenis_logam: "Perak Nadir" },
    
    { tanggal: "2026-07-19", gram: 1, harga: 1445000, jenis_logam: "Antam" },
    { tanggal: "2026-07-19", gram: 5, harga: 7025000, jenis_logam: "Antam" },
    { tanggal: "2026-07-19", gram: 1, harga: 1415000, jenis_logam: "UBS" },
    { tanggal: "2026-07-19", gram: 1, harga: 1425000, jenis_logam: "Galeri24" },
    { tanggal: "2026-07-19", gram: 10, harga: 248000, jenis_logam: "Perak Nadir" }
];

const MOCK_PEMBELIAN = [
    { id: "p1", tanggal: "2026-07-10", no_seri: "ANTAM-99120", tahun: 2024, gramasi: 1, harga_beli: 1350000, nama_penjual: "Budi Santoso" },
    { id: "p2", tanggal: "2026-07-12", no_seri: "UBS-77123", tahun: 2025, gramasi: 1, harga_beli: 1320000, nama_penjual: "Siti Rahma" },
    { id: "p3", tanggal: "2026-07-15", no_seri: "G24-55412", tahun: 2025, gramasi: 1, harga_beli: 1330000, nama_penjual: "Andi Wijaya" },
    { id: "p4", tanggal: "2026-07-16", no_seri: "PRK-11029", tahun: 2026, gramasi: 10, harga_beli: 220000, nama_penjual: "Eko Prasetyo" }
];

const MOCK_STOK_MANUAL = [
    { id: "sm1", tanggal_input: "2026-07-14", no_seri: "ANTAM-2024-5501", gramasi: 5, tahun: 2024, harga_modal: 6900000 }
];

const MOCK_PENJUALAN = [
    { id: "s1", tanggal: "2026-07-18", gramasi: 1, no_seri: "ANTAM-99120", nama_pembeli: "Dewi Lestari", harga_jual: 1480000, harga_restok: 1350000, keuntungan: 130000 },
    { id: "s2", tanggal: "2026-07-19", gramasi: 1, no_seri: "UBS-77123", nama_pembeli: "Hendra", harga_jual: 1450000, harga_restok: 1320000, keuntungan: 130000 }
];

export class GoldDatabase {
    constructor() {
        this.supabaseClient = null;
        this.supabaseUrl = "";
        this.supabaseKey = "";
        this.initLocalData();
    }

    // Load remote configuration from Vercel Serverless API
    async loadRemoteConfig() {
        try {
            const res = await fetch("/api/config");
            if (res.ok) {
                const data = await res.json();
                if (data.url && data.key) {
                    this.supabaseUrl = data.url;
                    this.supabaseKey = data.key;
                    this.supabaseClient = null; // force reload client
                    this.getSupabase();
                }
            }
        } catch (e) {
            console.log("Remote config fetch failed (running locally):", e);
        }
    }

    // Initialize LocalStorage with mock data if empty
    initLocalData() {
        if (!localStorage.getItem("rumaisho_pembelian")) {
            localStorage.setItem("rumaisho_pembelian", JSON.stringify(MOCK_PEMBELIAN));
        } else {
            // Ensure existing cached data has gramasi & tahun property
            try {
                const existing = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
                let changed = false;
                existing.forEach(p => {
                    if (p.gramasi === undefined || p.gramasi === null) {
                        p.gramasi = 1;
                        changed = true;
                    }
                    if (p.tahun === undefined || p.tahun === null) {
                        p.tahun = p.tanggal ? new Date(p.tanggal).getFullYear() : 2024;
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem("rumaisho_pembelian", JSON.stringify(existing));
                }
            } catch (e) {}
        }
        if (!localStorage.getItem("rumaisho_stok_manual")) {
            localStorage.setItem("rumaisho_stok_manual", JSON.stringify(MOCK_STOK_MANUAL));
        }
        if (!localStorage.getItem("rumaisho_penjualan")) {
            localStorage.setItem("rumaisho_penjualan", JSON.stringify(MOCK_PENJUALAN));
        }
        if (!localStorage.getItem("rumaisho_harga_emas")) {
            localStorage.setItem("rumaisho_harga_emas", JSON.stringify(MOCK_GOLD_PRICES));
        }
        if (!localStorage.getItem("rumaisho_pin")) {
            localStorage.setItem("rumaisho_pin", DEFAULT_PIN);
        }
    }

    // Get settings
    getCredentials() {
        const url = this.supabaseUrl || localStorage.getItem("rumaisho_supabase_url") || "";
        const key = this.supabaseKey || localStorage.getItem("rumaisho_supabase_key") || "";
        return { url, key };
    }

    // Set settings
    setCredentials(url, key) {
        localStorage.setItem("rumaisho_supabase_url", url);
        localStorage.setItem("rumaisho_supabase_key", key);
        this.supabaseClient = null; // reset client
    }

    // Helper to check if a key is a service_role key (secret key)
    isServiceRoleKey(key) {
        if (!key) return false;
        try {
            const parts = key.split('.');
            if (parts.length === 3) {
                const base64Url = parts[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                return payload.role === 'service_role';
            }
        } catch (e) {
            if (key.includes("service_role") || key.includes("secret")) return true;
        }
        return false;
    }

    // Initialize Supabase Client
    getSupabase() {
        if (this.supabaseClient) return this.supabaseClient;

        const { url, key } = this.getCredentials();
        if (this.isServiceRoleKey(key)) {
            console.error("Initialization rejected: service_role key cannot be used in browser.");
            return null; // Force fallback to Local Storage
        }

        if (url && key && window.supabase) {
            try {
                this.supabaseClient = window.supabase.createClient(url, key);
                return this.supabaseClient;
            } catch (e) {
                console.error("Failed to init Supabase client:", e);
                return null;
            }
        }
        return null;
    }

    // Check if using Supabase or LocalStorage
    isUsingSupabase() {
        return this.getSupabase() !== null;
    }

    // Test connection with input credentials
    async testConnection(url, key) {
        if (!window.supabase) return { success: false, message: "Supabase library not loaded yet." };
        if (this.isServiceRoleKey(key)) {
            return { success: false, message: "Koneksi Ditolak: Anda memasukkan 'service_role' (Secret Key) yang sangat rahasia. Supabase melarang penggunaan key ini di browser demi keamanan. Silakan gunakan Anon Key (Public Key) yang aman." };
        }
        try {
            const client = window.supabase.createClient(url, key);
            // Try querying settings or a simple select
            const { data, error } = await client.from("settings").select("*").limit(1);
            if (error) {
                // If table doesn't exist, but we reached database, it means credentials are correct, but schema is missing
                if (error.code === "P0001" || error.message.includes("does not exist")) {
                    return { success: true, warning: true, message: "Koneksi berhasil, namun tabel database belum dibuat. Silakan jalankan DDL script." };
                }
                return { success: false, message: error.message };
            }
            return { success: true, message: "Koneksi berhasil terhubung!" };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // Synchronize LocalStorage data to Supabase
    async syncToSupabase() {
        const client = this.getSupabase();
        if (!client) return { success: false, message: "Supabase not connected." };

        try {
            // Get local data
            const localPembelian = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
            const localPenjualan = JSON.parse(localStorage.getItem("rumaisho_penjualan") || "[]");
            const localHargaEmas = JSON.parse(localStorage.getItem("rumaisho_harga_emas") || "[]");
            const localPin = localStorage.getItem("rumaisho_pin") || DEFAULT_PIN;

            // Sync PIN
            await client.from("settings").upsert({ key: "pin", value: localPin });

            // Sync Pembelian
            if (localPembelian.length > 0) {
                // Strip local mock IDs that aren't UUIDs or leave UUIDs if they exist
                const cleanPembelian = localPembelian.map(p => {
                    const obj = { ...p };
                    if (obj.id && obj.id.startsWith("p")) delete obj.id; // Let supabase generate uuid
                    return obj;
                });
                // In a real sync we should match duplicates, but here we can clean and upsert based on no_seri
                for (const p of cleanPembelian) {
                    await client.from("pembelian").upsert(p, { onConflict: "no_seri" });
                }
            }

            // Sync Penjualan
            if (localPenjualan.length > 0) {
                const cleanPenjualan = localPenjualan.map(s => {
                    const obj = { ...s };
                    if (obj.id && obj.id.startsWith("s")) delete obj.id;
                    return obj;
                });
                for (const s of cleanPenjualan) {
                    // Try to avoid duplicate by matching on date, no_seri, nama_pembeli
                    const { data } = await client.from("penjualan").select("id").eq("no_seri", s.no_seri).eq("tanggal", s.tanggal);
                    if (!data || data.length === 0) {
                        await client.from("penjualan").insert(s);
                    }
                }
            }

            // Sync Harga Emas
            if (localHargaEmas.length > 0) {
                for (const h of localHargaEmas) {
                    const { data } = await client.from("harga_emas").select("id").eq("tanggal", h.tanggal).eq("gram", h.gram).eq("jenis_logam", h.jenis_logam);
                    if (!data || data.length === 0) {
                        await client.from("harga_emas").insert(h);
                    }
                }
            }

            // Sync Stok Manual
            const localStokManual = JSON.parse(localStorage.getItem("rumaisho_stok_manual") || "[]");
            if (localStokManual.length > 0) {
                const cleanStokManual = localStokManual.map(sm => {
                    const obj = { ...sm };
                    if (obj.id && obj.id.startsWith("sm")) delete obj.id;
                    return obj;
                });
                for (const sm of cleanStokManual) {
                    await client.from("stok_manual").upsert(sm, { onConflict: "no_seri" });
                }
            }

            return { success: true, message: "Sinkronisasi data ke Supabase berhasil dilakukan!" };
        } catch (e) {
            console.error("Sync error:", e);
            return { success: false, message: e.message };
        }
    }

    // --- PIN Management ---
    async getPin() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("settings").select("value").eq("key", "pin").single();
                if (data && !error) {
                    localStorage.setItem("rumaisho_pin", data.value);
                    return data.value;
                }
            } catch (e) {
                console.error("Error fetching PIN from Supabase:", e);
            }
        }
        return localStorage.getItem("rumaisho_pin") || DEFAULT_PIN;
    }

    async updatePin(newPin) {
        localStorage.setItem("rumaisho_pin", newPin);
        const client = this.getSupabase();
        if (client) {
            try {
                await client.from("settings").upsert({ key: "pin", value: newPin });
            } catch (e) {
                console.error("Error saving PIN to Supabase:", e);
            }
        }
        return true;
    }

    // --- Theme Settings ---
    async getHargaEmasThemeColor() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("settings").select("value").eq("key", "harga_emas_theme_color").single();
                if (data && !error) {
                    localStorage.setItem("rumaisho_setting_harga_emas_theme_color", data.value);
                    return data.value;
                }
            } catch (e) {
                console.error("Error fetching theme color from Supabase:", e);
            }
        }
        return localStorage.getItem("rumaisho_setting_harga_emas_theme_color") || "#0db3a5"; // default tosca
    }

    async updateHargaEmasThemeColor(hex) {
        localStorage.setItem("rumaisho_setting_harga_emas_theme_color", hex);
        const client = this.getSupabase();
        if (client) {
            try {
                await client.from("settings").upsert({ key: "harga_emas_theme_color", value: hex });
            } catch (e) {
                console.error("Error saving theme color to Supabase:", e);
            }
        }
        return true;
    }

    // --- Pembelian (Purchases) ---
    async getPembelian() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("pembelian").select("*").order("tanggal", { ascending: false });
                if (!error) return data;
                console.error("Supabase getPembelian error:", error);
            } catch (e) {
                console.error("Supabase getPembelian exception:", e);
            }
        }
        // Fallback to local storage
        return JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]").sort((a,b) => b.tanggal.localeCompare(a.tanggal));
    }

    async addPembelian(item) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("pembelian").insert([item]).select();
                if (!error) return { success: true, data: data[0] };
                let msg = error.message;
                if (msg.includes("gramasi") || msg.includes("tahun") || msg.includes("schema cache")) {
                    msg = `Kolom database Supabase belum di-update: ${error.message}.\n\nSolusi: Buka SQL Editor di Supabase Anda dan jalankan:\nALTER TABLE pembelian ADD COLUMN IF NOT EXISTS gramasi NUMERIC NOT NULL DEFAULT 1;\nALTER TABLE pembelian ADD COLUMN IF NOT EXISTS tahun INTEGER NOT NULL DEFAULT 2024;`;
                }
                return { success: false, message: msg };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        const local = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
        // Check for unique serial number
        if (local.some(p => p.no_seri.trim().toLowerCase() === item.no_seri.trim().toLowerCase())) {
            return { success: false, message: `No Seri ${item.no_seri} sudah terdaftar!` };
        }
        const newItem = { id: "p_" + Date.now(), ...item };
        local.push(newItem);
        localStorage.setItem("rumaisho_pembelian", JSON.stringify(local));
        return { success: true, data: newItem };
    }

    async deletePembelian(id, no_seri) {
        const client = this.getSupabase();
        if (client) {
            try {
                let query = client.from("pembelian").delete();
                if (id && !id.startsWith("p_") && id.length > 20) {
                    query = query.eq("id", id);
                } else {
                    query = query.eq("no_seri", no_seri);
                }
                const { error } = await query;
                if (!error) return { success: true };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        let local = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
        local = local.filter(p => !((id && p.id === id) || (no_seri && p.no_seri === no_seri)));
        localStorage.setItem("rumaisho_pembelian", JSON.stringify(local));
        return { success: true };
    }

    async updatePembelian(id, updatedFields, oldNoSeri = null) {
        const client = this.getSupabase();
        const oldSeri = oldNoSeri || updatedFields.no_seri;
        const newSeri = updatedFields.no_seri;

        if (client) {
            try {
                let query = client.from("pembelian").update(updatedFields);
                if (id && !id.startsWith("p_") && id.length > 20) {
                    query = query.eq("id", id);
                } else {
                    query = query.eq("no_seri", oldSeri);
                }
                const { data, error } = await query.select();
                if (!error) {
                    // Cascade serial change to sales if serial was updated
                    if (oldSeri && newSeri && oldSeri !== newSeri) {
                        await client.from("penjualan").update({ no_seri: newSeri }).eq("no_seri", oldSeri);
                    }
                    return { success: true, data: data ? data[0] : null };
                }
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        let local = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
        local = local.map(p => {
            if ((id && p.id === id) || (oldSeri && p.no_seri === oldSeri)) {
                return { ...p, ...updatedFields };
            }
            return p;
        });
        localStorage.setItem("rumaisho_pembelian", JSON.stringify(local));

        // Cascade update to sales if serial changed
        if (oldSeri && newSeri && oldSeri !== newSeri) {
            let localSales = JSON.parse(localStorage.getItem("rumaisho_penjualan") || "[]");
            let salesChanged = false;
            localSales = localSales.map(s => {
                if (s.no_seri === oldSeri) {
                    salesChanged = true;
                    return { ...s, no_seri: newSeri };
                }
                return s;
            });
            if (salesChanged) {
                localStorage.setItem("rumaisho_penjualan", JSON.stringify(localSales));
            }
        }

        return { success: true };
    }

    // --- Penjualan (Sales) ---
    async getPenjualan() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("penjualan").select("*").order("tanggal", { ascending: false });
                if (!error) return data;
                console.error("Supabase getPenjualan error:", error);
            } catch (e) {
                console.error("Supabase getPenjualan exception:", e);
            }
        }
        return JSON.parse(localStorage.getItem("rumaisho_penjualan") || "[]").sort((a,b) => b.tanggal.localeCompare(a.tanggal));
    }

    async addPenjualan(item) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("penjualan").insert([item]).select();
                if (!error) return { success: true, data: data[0] };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        const local = JSON.parse(localStorage.getItem("rumaisho_penjualan") || "[]");
        const newItem = { id: "s_" + Date.now(), ...item };
        local.push(newItem);
        localStorage.setItem("rumaisho_penjualan", JSON.stringify(local));
        return { success: true, data: newItem };
    }

    async deletePenjualan(id) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { error } = await client.from("penjualan").delete().eq("id", id);
                if (!error) return { success: true };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        let local = JSON.parse(localStorage.getItem("rumaisho_penjualan") || "[]");
        local = local.filter(s => s.id !== id);
        localStorage.setItem("rumaisho_penjualan", JSON.stringify(local));
        return { success: true };
    }

    // --- Harga Emas (Gold Prices) ---
    async getHargaEmas(tanggalFilter = null) {
        const client = this.getSupabase();
        if (client) {
            try {
                let query = client.from("harga_emas").select("*").order("tanggal", { ascending: false }).order("gram", { ascending: true });
                if (tanggalFilter) {
                    query = query.eq("tanggal", tanggalFilter);
                }
                const { data, error } = await query;
                if (!error) return data;
                console.error("Supabase getHargaEmas error:", error);
            } catch (e) {
                console.error("Supabase getHargaEmas exception:", e);
            }
        }

        // Local Storage fallback
        let data = JSON.parse(localStorage.getItem("rumaisho_harga_emas") || "[]");
        if (tanggalFilter) {
            data = data.filter(h => h.tanggal === tanggalFilter);
        }
        return data.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.gram - b.gram);
    }

    async addHargaEmas(item) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("harga_emas").insert([item]).select();
                if (!error) return { success: true, data: data[0] };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        const local = JSON.parse(localStorage.getItem("rumaisho_harga_emas") || "[]");
        const newItem = { id: "h_" + Date.now(), ...item };
        local.push(newItem);
        localStorage.setItem("rumaisho_harga_emas", JSON.stringify(local));
        return { success: true, data: newItem };
    }

    async deleteHargaEmas(id) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { error } = await client.from("harga_emas").delete().eq("id", id);
                if (!error) return { success: true };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        let local = JSON.parse(localStorage.getItem("rumaisho_harga_emas") || "[]");
        local = local.filter(h => h.id !== id);
        localStorage.setItem("rumaisho_harga_emas", JSON.stringify(local));
        return { success: true };
    }

    async updateHargaEmas(id, newHarga) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("harga_emas").update({ harga: newHarga }).eq("id", id).select();
                if (!error) return { success: true, data: data[0] };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        let local = JSON.parse(localStorage.getItem("rumaisho_harga_emas") || "[]");
        local = local.map(h => h.id === id ? { ...h, harga: newHarga } : h);
        localStorage.setItem("rumaisho_harga_emas", JSON.stringify(local));
        return { success: true };
    }

    // --- Stok Emas (Manual & Aggregated) ---
    async getStokManual() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("stok_manual").select("*").order("tanggal_input", { ascending: false });
                if (!error) return data;
                console.error("Supabase getStokManual error:", error);
            } catch (e) {
                console.error("Supabase getStokManual exception:", e);
            }
        }
        return JSON.parse(localStorage.getItem("rumaisho_stok_manual") || "[]").sort((a,b) => (b.tanggal_input || "").localeCompare(a.tanggal_input || ""));
    }

    async addStokManual(item) {
        const client = this.getSupabase();
        const seriClean = item.no_seri.trim().toUpperCase();

        // Check uniqueness across pembelian & manual stock
        const allStock = await this.getStokEmas();
        if (allStock.some(s => s.no_seri.trim().toUpperCase() === seriClean)) {
            return { success: false, message: `No Seri ${item.no_seri} sudah terdaftar di sistem!` };
        }

        if (client) {
            try {
                const { data, error } = await client.from("stok_manual").insert([item]).select();
                if (!error) return { success: true, data: data[0] };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        const local = JSON.parse(localStorage.getItem("rumaisho_stok_manual") || "[]");
        const newItem = { id: "sm_" + Date.now(), ...item };
        local.push(newItem);
        localStorage.setItem("rumaisho_stok_manual", JSON.stringify(local));
        return { success: true, data: newItem };
    }

    async deleteStokManual(id, no_seri) {
        const client = this.getSupabase();
        if (client) {
            try {
                let query = client.from("stok_manual").delete();
                if (id && !id.startsWith("sm_") && id.length > 20) {
                    query = query.eq("id", id);
                } else {
                    query = query.eq("no_seri", no_seri);
                }
                const { error } = await query;
                if (!error) return { success: true };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        let local = JSON.parse(localStorage.getItem("rumaisho_stok_manual") || "[]");
        local = local.filter(s => !((id && s.id === id) || (no_seri && s.no_seri === no_seri)));
        localStorage.setItem("rumaisho_stok_manual", JSON.stringify(local));
        return { success: true };
    }

    async updateStokManual(id, updatedFields, oldNoSeri = null) {
        const client = this.getSupabase();
        const oldSeri = oldNoSeri || updatedFields.no_seri;
        const newSeri = updatedFields.no_seri;

        if (client) {
            try {
                let query = client.from("stok_manual").update(updatedFields);
                if (id && !id.startsWith("sm_") && id.length > 20) {
                    query = query.eq("id", id);
                } else {
                    query = query.eq("no_seri", oldSeri);
                }
                const { data, error } = await query.select();
                if (!error) {
                    if (oldSeri && newSeri && oldSeri !== newSeri) {
                        await client.from("penjualan").update({ no_seri: newSeri }).eq("no_seri", oldSeri);
                    }
                    return { success: true, data: data ? data[0] : null };
                }
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        let local = JSON.parse(localStorage.getItem("rumaisho_stok_manual") || "[]");
        local = local.map(s => {
            if ((id && s.id === id) || (oldSeri && s.no_seri === oldSeri)) {
                return { ...s, ...updatedFields };
            }
            return s;
        });
        localStorage.setItem("rumaisho_stok_manual", JSON.stringify(local));

        // Cascade update to sales if serial changed
        if (oldSeri && newSeri && oldSeri !== newSeri) {
            let localSales = JSON.parse(localStorage.getItem("rumaisho_penjualan") || "[]");
            let salesChanged = false;
            localSales = localSales.map(s => {
                if (s.no_seri === oldSeri) {
                    salesChanged = true;
                    return { ...s, no_seri: newSeri };
                }
                return s;
            });
            if (salesChanged) {
                localStorage.setItem("rumaisho_penjualan", JSON.stringify(localSales));
            }
        }

        return { success: true };
    }

    // Comprehensive Aggregated Gold Stock (Purchases + Manual Stock - Sales)
    async getStokEmas() {
        const purchases = await this.getPembelian();
        const manualStocks = await this.getStokManual();
        const sales = await this.getPenjualan();

        // Map sales by no_seri for fast O(1) status check
        const salesMap = new Map();
        sales.forEach(s => {
            if (s.no_seri) {
                salesMap.set(s.no_seri.trim().toUpperCase(), s);
            }
        });

        const unifiedList = [];

        // 1. Stock items from purchases
        purchases.forEach(p => {
            const seri = (p.no_seri || "").trim().toUpperCase();
            const sale = salesMap.get(seri);
            const yearVal = (p.tahun !== undefined && p.tahun !== null && p.tahun !== "") 
                ? p.tahun 
                : (p.tanggal ? new Date(p.tanggal).getFullYear() : "-");
            unifiedList.push({
                id: p.id,
                tipe_sumber: "pembelian",
                sumber_label: "Pembelian",
                tanggal_masuk: p.tanggal,
                no_seri: p.no_seri,
                tahun: yearVal,
                gramasi: parseFloat(p.gramasi) || 0,
                harga_modal: parseFloat(p.harga_beli) || 0,
                keterangan_asal: p.nama_penjual || "-",
                is_sold: !!sale,
                status: sale ? "Terjual" : "Tersedia",
                sale_info: sale || null
            });
        });

        // 2. Stock items from manual entry
        manualStocks.forEach(sm => {
            const seri = (sm.no_seri || "").trim().toUpperCase();
            const sale = salesMap.get(seri);
            unifiedList.push({
                id: sm.id,
                tipe_sumber: "manual",
                sumber_label: "Manual",
                tanggal_masuk: sm.tanggal_input || "-",
                no_seri: sm.no_seri,
                tahun: sm.tahun || "-",
                gramasi: parseFloat(sm.gramasi) || 0,
                harga_modal: parseFloat(sm.harga_modal) || 0,
                keterangan_asal: "Input Manual",
                is_sold: !!sale,
                status: sale ? "Terjual" : "Tersedia",
                sale_info: sale || null
            });
        });

        // Sort by tanggal_masuk descending
        return unifiedList.sort((a, b) => String(b.tanggal_masuk).localeCompare(String(a.tanggal_masuk)));
    }

    // Active stock only (unsold)
    async getStokAktif() {
        const allStock = await this.getStokEmas();
        return allStock.filter(s => !s.is_sold);
    }
}

