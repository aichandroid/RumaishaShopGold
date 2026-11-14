// Database Module for Rumaisho Gold App
// Supports transparent routing between LocalStorage and Supabase

// Default PIN
const DEFAULT_PIN = "310814";

// UUID Generation & Validation Helper
function generateUUID() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function isUUID(str) {
    if (!str || typeof str !== "string") return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

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
        this.isSelfHosted = false;
        this.initLocalData();
    }

    // Load remote configuration from Vercel Serverless API
    async loadRemoteConfig() {
        try {
            const res = await fetch("/api/config");
            if (res.ok) {
                const data = await res.json();
                if (data.mode === "self-hosted") {
                    this.isSelfHosted = true;
                    return;
                }
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
                    if (p.tahun === undefined) {
                        p.tahun = null;
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
        const savedPin = localStorage.getItem("rumaisho_pin");
        if (!savedPin || savedPin === "1234") {
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

    // Check if using Supabase or LocalStorage or Self-Hosted
    isUsingSupabase() {
        return this.isSelfHosted || this.getSupabase() !== null;
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
                let updatedLocal = false;
                for (const p of localPembelian) {
                    if (!p.id || !isUUID(p.id)) {
                        p.id = generateUUID();
                        updatedLocal = true;
                    }
                    const { data: existing } = await client.from("pembelian").select("id").eq("id", p.id);
                    if (!existing || existing.length === 0) {
                        const { data: duplicate } = await client.from("pembelian").select("id").eq("tanggal", p.tanggal).eq("no_seri", p.no_seri).eq("harga_beli", p.harga_beli);
                        if (!duplicate || duplicate.length === 0) {
                            await client.from("pembelian").insert(p);
                        }
                    } else {
                        await client.from("pembelian").update(p).eq("id", p.id);
                    }
                }
                if (updatedLocal) {
                    localStorage.setItem("rumaisho_pembelian", JSON.stringify(localPembelian));
                }
            }

            // Sync Penjualan
            if (localPenjualan.length > 0) {
                const cleanPenjualan = localPenjualan.map(s => {
                    const obj = { ...s };
                    if (obj.id && !isUUID(obj.id)) delete obj.id;
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
                let updatedLocalSm = false;
                for (const sm of localStokManual) {
                    if (!sm.id || !isUUID(sm.id)) {
                        sm.id = generateUUID();
                        updatedLocalSm = true;
                    }
                    const { data: existing } = await client.from("stok_manual").select("id").eq("id", sm.id);
                    if (!existing || existing.length === 0) {
                        const { data: duplicate } = await client.from("stok_manual").select("id").eq("tanggal_input", sm.tanggal_input).eq("no_seri", sm.no_seri);
                        if (!duplicate || duplicate.length === 0) {
                            await client.from("stok_manual").insert(sm);
                        }
                    } else {
                        await client.from("stok_manual").update(sm).eq("id", sm.id);
                    }
                }
                if (updatedLocalSm) {
                    localStorage.setItem("rumaisho_stok_manual", JSON.stringify(localStokManual));
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.pin) {
                        if (data.pin === "1234") {
                            await this.updatePin(DEFAULT_PIN);
                            return DEFAULT_PIN;
                        }
                        localStorage.setItem("rumaisho_pin", data.pin);
                        return data.pin;
                    }
                }
            } catch (e) {
                console.error("Error fetching PIN from API:", e);
            }
        }
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from("settings").select("value").eq("key", "pin").single();
                if (data && !error && data.value) {
                    if (data.value === "1234") {
                        await this.updatePin(DEFAULT_PIN);
                        return DEFAULT_PIN;
                    }
                    localStorage.setItem("rumaisho_pin", data.value);
                    return data.value;
                }
            } catch (e) {
                console.error("Error fetching PIN from Supabase:", e);
            }
        }
        const localPin = localStorage.getItem("rumaisho_pin");
        if (!localPin || localPin === "1234") {
            localStorage.setItem("rumaisho_pin", DEFAULT_PIN);
            return DEFAULT_PIN;
        }
        return localPin;
    }

    async updatePin(newPin) {
        localStorage.setItem("rumaisho_pin", newPin);
        if (this.isSelfHosted) {
            try {
                await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: "pin", value: newPin })
                });
                return true;
            } catch (e) {
                console.error("Error saving PIN to API:", e);
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.harga_emas_theme_color) {
                        localStorage.setItem("rumaisho_setting_harga_emas_theme_color", data.harga_emas_theme_color);
                        return data.harga_emas_theme_color;
                    }
                }
            } catch (e) {
                console.error("Error fetching theme color from API:", e);
            }
        }
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
        if (this.isSelfHosted) {
            try {
                await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: "harga_emas_theme_color", value: hex })
                });
                return true;
            } catch (e) {
                console.error("Error saving theme color to API:", e);
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch("/api/pembelian");
                if (res.ok) return await res.json();
            } catch (e) {
                console.error("Self-hosted getPembelian error:", e);
            }
        }
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

    async addPembelian(item, allowDuplicateActive = false) {
        const payload = {
            ...item,
            tahun: (item.tahun !== undefined && item.tahun !== null && item.tahun !== "" && item.tahun !== "-") ? parseInt(item.tahun, 10) : null
        };

        if (this.isSelfHosted) {
            const activeStock = await this.getStokAktif();
            const seriUpper = item.no_seri.trim().toUpperCase();
            const isCurrentlyInStock = activeStock.some(s => (s.no_seri || "").trim().toUpperCase() === seriUpper);
            if (isCurrentlyInStock && !allowDuplicateActive) {
                return {
                    success: false,
                    is_active_duplicate: true,
                    message: `No Seri ${item.no_seri} saat ini masih ada di stok (status Tersedia/Belum Terjual). No seri yang sama dapat diinput kembali jika stok sebelumnya sudah terjual.`
                };
            }

            try {
                const res = await fetch("/api/pembelian", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        const client = this.getSupabase();

        if (client) {
            try {
                const { data, error } = await client.from("pembelian").insert([payload]).select();
                if (!error) return { success: true, data: data[0] };
                let msg = error.message;
                if (msg.includes("unique constraint") || msg.includes("duplicate key") || msg.includes("pembelian_no_seri_key")) {
                    msg = `Supabase masih memiliki batasan UNIQUE pada no_seri: ${error.message}.\n\nSolusi: Buka SQL Editor di Supabase Anda dan jalankan:\nALTER TABLE pembelian DROP CONSTRAINT IF EXISTS pembelian_no_seri_key;`;
                } else if (msg.includes("not-null") || msg.includes("null value in column") || msg.includes("tahun")) {
                    msg = `Kolom tahun di Supabase masih memiliki batasan NOT NULL: ${error.message}.\n\nSolusi: Buka SQL Editor di Supabase Anda dan jalankan:\nALTER TABLE pembelian ALTER COLUMN tahun DROP NOT NULL;`;
                } else if (msg.includes("gramasi") || msg.includes("schema cache")) {
                    msg = `Kolom database Supabase belum di-update: ${error.message}.\n\nSolusi: Buka SQL Editor di Supabase Anda dan jalankan:\nALTER TABLE pembelian ADD COLUMN IF NOT EXISTS gramasi NUMERIC NOT NULL DEFAULT 1;\nALTER TABLE pembelian ADD COLUMN IF NOT EXISTS tahun INTEGER DEFAULT NULL;\nALTER TABLE pembelian ALTER COLUMN tahun DROP NOT NULL;\nALTER TABLE pembelian DROP CONSTRAINT IF EXISTS pembelian_no_seri_key;`;
                }
                return { success: false, message: msg };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        const local = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
        // Check if an unsold unit with this serial number is currently active in stock
        const activeStock = await this.getStokAktif();
        const seriUpper = item.no_seri.trim().toUpperCase();
        const isCurrentlyInStock = activeStock.some(s => (s.no_seri || "").trim().toUpperCase() === seriUpper);
        if (isCurrentlyInStock && !allowDuplicateActive) {
            return {
                success: false,
                is_active_duplicate: true,
                message: `No Seri ${item.no_seri} saat ini masih ada di stok (status Tersedia/Belum Terjual). No seri yang sama dapat diinput kembali jika stok sebelumnya sudah terjual.`
            };
        }

        const newItem = { id: generateUUID(), ...payload };
        local.push(newItem);
        localStorage.setItem("rumaisho_pembelian", JSON.stringify(local));
        return { success: true, data: newItem };
    }

    async deletePembelian(id, no_seri) {
        if (this.isSelfHosted) {
            try {
                const targetId = id || no_seri;
                const res = await fetch(`/api/pembelian/${encodeURIComponent(targetId)}`, { method: "DELETE" });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
        const client = this.getSupabase();
        if (client) {
            try {
                let query = client.from("pembelian").delete();
                if (id) {
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

        // Local Storage - delete only the specific record by id
        let local = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
        local = local.filter(p => id ? p.id !== id : p.no_seri !== no_seri);
        localStorage.setItem("rumaisho_pembelian", JSON.stringify(local));
        return { success: true };
    }

    async updatePembelian(id, updatedFields, oldNoSeri = null) {
        const oldSeri = oldNoSeri || updatedFields.no_seri;
        const newSeri = updatedFields.no_seri;
        const fields = { ...updatedFields, old_no_seri: oldSeri };
        if ("tahun" in fields) {
            fields.tahun = (fields.tahun !== undefined && fields.tahun !== null && fields.tahun !== "" && fields.tahun !== "-") ? parseInt(fields.tahun, 10) : null;
        }

        if (this.isSelfHosted) {
            try {
                const res = await fetch(`/api/pembelian/${encodeURIComponent(id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(fields)
                });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        const client = this.getSupabase();

        if (client) {
            try {
                let query = client.from("pembelian").update(fields);
                if (id) {
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

        // Local Storage - update only the specific record by id
        let local = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
        local = local.map(p => {
            if (id ? p.id === id : p.no_seri === oldSeri) {
                return { ...p, ...fields };
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch("/api/penjualan");
                if (res.ok) return await res.json();
            } catch (e) {
                console.error("Self-hosted getPenjualan error:", e);
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch("/api/penjualan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item)
                });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch(`/api/penjualan/${encodeURIComponent(id)}`, { method: "DELETE" });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const url = tanggalFilter ? `/api/harga_emas?tanggal=${encodeURIComponent(tanggalFilter)}` : "/api/harga_emas";
                const res = await fetch(url);
                if (res.ok) return await res.json();
            } catch (e) {
                console.error("Self-hosted getHargaEmas error:", e);
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch("/api/harga_emas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item)
                });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch(`/api/harga_emas/${encodeURIComponent(id)}`, { method: "DELETE" });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch(`/api/harga_emas/${encodeURIComponent(id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ harga: newHarga })
                });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
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
        if (this.isSelfHosted) {
            try {
                const res = await fetch("/api/stok_manual");
                if (res.ok) return await res.json();
            } catch (e) {
                console.error("Self-hosted getStokManual error:", e);
            }
        }
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
        const seriClean = item.no_seri.trim().toUpperCase();

        // Check if an unsold unit with this serial number is currently active in stock
        const activeStock = await this.getStokAktif();
        if (activeStock.some(s => (s.no_seri || "").trim().toUpperCase() === seriClean)) {
            return { success: false, message: `No Seri ${item.no_seri} saat ini masih ada di stok (status Tersedia)! No seri yang sama dapat diinput kembali jika stok sebelumnya sudah terjual.` };
        }

        if (this.isSelfHosted) {
            try {
                const res = await fetch("/api/stok_manual", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item)
                });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        const client = this.getSupabase();

        if (client) {
            try {
                const { data, error } = await client.from("stok_manual").insert([item]).select();
                if (!error) return { success: true, data: data[0] };
                let msg = error.message;
                if (msg.includes("unique constraint") || msg.includes("duplicate key") || msg.includes("stok_manual_no_seri_key")) {
                    msg = `Supabase masih memiliki batasan UNIQUE pada no_seri di tabel stok_manual (${error.message}).\n\nSolusi: Buka SQL Editor di Supabase Anda dan jalankan:\nALTER TABLE stok_manual DROP CONSTRAINT IF EXISTS stok_manual_no_seri_key;`;
                }
                return { success: false, message: msg };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        const local = JSON.parse(localStorage.getItem("rumaisho_stok_manual") || "[]");
        const newItem = { id: generateUUID(), ...item };
        local.push(newItem);
        localStorage.setItem("rumaisho_stok_manual", JSON.stringify(local));
        return { success: true, data: newItem };
    }

    async deleteStokManual(id, no_seri) {
        if (this.isSelfHosted) {
            try {
                const targetId = id || no_seri;
                const res = await fetch(`/api/stok_manual/${encodeURIComponent(targetId)}`, { method: "DELETE" });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
        const client = this.getSupabase();
        if (client) {
            try {
                let query = client.from("stok_manual").delete();
                if (id) {
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

        // Local Storage - only delete specific record by id
        let local = JSON.parse(localStorage.getItem("rumaisho_stok_manual") || "[]");
        local = local.filter(s => id ? s.id !== id : s.no_seri !== no_seri);
        localStorage.setItem("rumaisho_stok_manual", JSON.stringify(local));
        return { success: true };
    }

    async updateStokManual(id, updatedFields, oldNoSeri = null) {
        const oldSeri = oldNoSeri || updatedFields.no_seri;
        const newSeri = updatedFields.no_seri;
        const fields = { ...updatedFields, old_no_seri: oldSeri };
        if ("tahun" in fields) {
            fields.tahun = (fields.tahun !== undefined && fields.tahun !== null && fields.tahun !== "" && fields.tahun !== "-") ? parseInt(fields.tahun, 10) : null;
        }

        if (this.isSelfHosted) {
            try {
                const res = await fetch(`/api/stok_manual/${encodeURIComponent(id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(fields)
                });
                const result = await res.json();
                return result;
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        const client = this.getSupabase();

        if (client) {
            try {
                let query = client.from("stok_manual").update(fields);
                if (id) {
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

        // Local Storage - update only specific record by id
        let local = JSON.parse(localStorage.getItem("rumaisho_stok_manual") || "[]");
        local = local.map(s => {
            if (id ? s.id === id : s.no_seri === oldSeri) {
                return { ...s, ...fields };
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

    // Comprehensive Aggregated Gold Stock (Purchases + Manual Stock - Sales with FIFO Pairing)
    async getStokEmas() {
        const purchases = await this.getPembelian();
        const manualStocks = await this.getStokManual();
        const sales = await this.getPenjualan();

        // 1. Gather all stock items
        const rawStock = [];

        purchases.forEach(p => {
            const yearVal = (p.tahun !== undefined && p.tahun !== null && p.tahun !== "" && p.tahun !== "-") 
                ? p.tahun 
                : "-";
            rawStock.push({
                id: p.id,
                tipe_sumber: "pembelian",
                sumber_label: "Pembelian",
                tanggal_masuk: p.tanggal,
                no_seri: p.no_seri,
                tahun: yearVal,
                gramasi: parseFloat(p.gramasi) || 0,
                harga_modal: parseFloat(p.harga_beli) || 0,
                keterangan_asal: p.nama_penjual || "-",
                created_at: p.created_at || p.tanggal,
                is_sold: false,
                status: "Tersedia",
                sale_info: null
            });
        });

        manualStocks.forEach(sm => {
            const yearVal = (sm.tahun !== undefined && sm.tahun !== null && sm.tahun !== "" && sm.tahun !== "-")
                ? sm.tahun
                : "-";
            rawStock.push({
                id: sm.id,
                tipe_sumber: "manual",
                sumber_label: "Manual",
                tanggal_masuk: sm.tanggal_input || "-",
                no_seri: sm.no_seri,
                tahun: yearVal,
                gramasi: parseFloat(sm.gramasi) || 0,
                harga_modal: parseFloat(sm.harga_modal) || 0,
                keterangan_asal: "Input Manual",
                created_at: sm.created_at || sm.tanggal_input,
                is_sold: false,
                status: "Tersedia",
                sale_info: null
            });
        });

        // 2. Group stock items by normalized serial number
        // Sort chronologically ascending (oldest first: FIFO)
        const stockBySerial = new Map();
        rawStock.forEach(item => {
            const seri = (item.no_seri || "").trim().toUpperCase();
            if (!stockBySerial.has(seri)) {
                stockBySerial.set(seri, []);
            }
            stockBySerial.get(seri).push(item);
        });

        for (const [seri, list] of stockBySerial.entries()) {
            list.sort((a, b) => {
                const dateCompare = String(a.tanggal_masuk || "").localeCompare(String(b.tanggal_masuk || ""));
                if (dateCompare !== 0) return dateCompare;
                return String(a.created_at || a.id || "").localeCompare(String(b.created_at || b.id || ""));
            });
        }

        // 3. Group sales by normalized serial number
        // Sort chronologically ascending (oldest first)
        const salesBySerial = new Map();
        sales.forEach(s => {
            const seri = (s.no_seri || "").trim().toUpperCase();
            if (!salesBySerial.has(seri)) {
                salesBySerial.set(seri, []);
            }
            salesBySerial.get(seri).push({ ...s });
        });

        for (const [seri, list] of salesBySerial.entries()) {
            list.sort((a, b) => {
                const dateCompare = String(a.tanggal || "").localeCompare(String(b.tanggal || ""));
                if (dateCompare !== 0) return dateCompare;
                return String(a.created_at || a.id || "").localeCompare(String(b.created_at || b.id || ""));
            });
        }

        // 4. FIFO Pairing: For each serial number, pair oldest sales to oldest stock items
        for (const [seri, stockList] of stockBySerial.entries()) {
            const salesList = salesBySerial.get(seri) || [];
            
            // Priority 1: Direct link if sale has explicit stok_id
            salesList.forEach(sale => {
                if (sale.stok_id) {
                    const matchedStock = stockList.find(st => st.id === sale.stok_id && !st.is_sold);
                    if (matchedStock) {
                        matchedStock.is_sold = true;
                        matchedStock.status = "Terjual";
                        matchedStock.sale_info = sale;
                        sale._matched = true;
                    }
                }
            });

            // Priority 2: FIFO matching for remaining sales
            // Only match stock received on or before the sale date (stock.tanggal_masuk <= sale.tanggal).
            // A historical sale that occurred before this stock was purchased cannot consume it.
            salesList.forEach(sale => {
                if (sale._matched) return;
                const saleDate = sale.tanggal ? String(sale.tanggal) : "";
                const matchedStock = stockList.find(st => {
                    if (st.is_sold) return false;
                    if (!saleDate || st.tanggal_masuk === "-" || !st.tanggal_masuk) return true;
                    return String(st.tanggal_masuk) <= saleDate;
                });
                if (matchedStock) {
                    matchedStock.is_sold = true;
                    matchedStock.status = "Terjual";
                    matchedStock.sale_info = sale;
                    sale._matched = true;
                }
            });
        }

        // Sort by tanggal_masuk descending for display
        return rawStock.sort((a, b) => {
            const dateCompare = String(b.tanggal_masuk || "").localeCompare(String(a.tanggal_masuk || ""));
            if (dateCompare !== 0) return dateCompare;
            return String(b.created_at || b.id || "").localeCompare(String(a.created_at || a.id || ""));
        });
    }

    // Active stock only (unsold)
    async getStokAktif() {
        const allStock = await this.getStokEmas();
        return allStock.filter(s => !s.is_sold);
    }
}

