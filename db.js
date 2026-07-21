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
    { id: "p1", tanggal: "2026-07-10", no_seri: "ANTAM-99120", harga_beli: 1350000, nama_penjual: "Budi Santoso" },
    { id: "p2", tanggal: "2026-07-12", no_seri: "UBS-77123", harga_beli: 1320000, nama_penjual: "Siti Rahma" },
    { id: "p3", tanggal: "2026-07-15", no_seri: "G24-55412", harga_beli: 1330000, nama_penjual: "Andi Wijaya" },
    { id: "p4", tanggal: "2026-07-16", no_seri: "PRK-11029", harga_beli: 220000, nama_penjual: "Eko Prasetyo" }
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
                return { success: false, message: error.message };
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
                const { error } = await client.from("pembelian").delete().eq("no_seri", no_seri);
                if (!error) return { success: true };
                return { success: false, message: error.message };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        // Local Storage
        let local = JSON.parse(localStorage.getItem("rumaisho_pembelian") || "[]");
        local = local.filter(p => p.id !== id && p.no_seri !== no_seri);
        localStorage.setItem("rumaisho_pembelian", JSON.stringify(local));
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
}
