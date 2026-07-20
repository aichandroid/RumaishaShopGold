// Application Logic for Rumaisho Gold App
import { GoldDatabase } from './db.js';

// Instantiate Database
const db = new GoldDatabase();

// Keep track of current action to execute after PIN verification
let pendingAction = null;
let currentRecapMode = "month"; // "month", "year", "item"
let recapChartInstance = null;

// DOMContentLoaded Entrypoint
document.addEventListener("DOMContentLoaded", async () => {
    initApp();
});

// Helper for formatting currency (Rupiah)
function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Format date to local Indonesian readability
function formatDateIndo(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// Generate file name with current date
function getExportFilename(prefix, extension) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}_${prefix}.${extension}`;
}

// App Initialization
async function initApp() {
    // 1. Setup Status DB
    updateDatabaseStatusUI();

    // Set Default Dates to Today's date on Inputs
    const todayStr = new Date().toISOString().split("T")[0];
    document.querySelectorAll('input[type="date"]').forEach(inp => {
        inp.value = todayStr;
    });

    // 2. Navigation Triggers
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.getAttribute("data-tab");
            
            // Toggle active classes on nav
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            // Toggle active classes on pages
            document.querySelectorAll(".page").forEach(page => {
                page.classList.remove("active");
            });
            const activePage = document.getElementById(`page-${tabId}`);
            if (activePage) activePage.classList.add("active");

            // Load relevant data for selected tab
            onTabChange(tabId);
        });
    });

    // 3. Modal close handlers
    document.querySelectorAll(".close-modal-btn, [data-modal]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute("data-modal") || btn.closest(".modal").id;
            closeModal(modalId);
        });
    });

    // 4. Set Event Listeners for Buttons & Forms
    setupFormEventListeners();
    setupDropdownEventListeners();
    setupRecapTabEventListeners();
    setupSettingsEventListeners();
    setupExportEventListeners();
    setupImportEventListeners();

    // 5. Initial Data Load (Dashboard)
    await loadDashboardData();
}

// Update Database Status Panel
function updateDatabaseStatusUI() {
    const dot = document.getElementById("db-status-dot");
    const label = document.getElementById("db-status-text");
    const syncBtn = document.getElementById("sync-db-btn");

    if (db.isUsingSupabase()) {
        dot.className = "status-dot online";
        label.textContent = "Terhubung ke Supabase";
        syncBtn.style.display = "none";
    } else {
        dot.className = "status-dot";
        label.textContent = "Mode Lokal (Offline)";
        syncBtn.style.display = "inline-flex";
    }
}

// Triggered when tabs change
async function onTabChange(tabId) {
    if (tabId === "dashboard") {
        await loadDashboardData();
    } else if (tabId === "pembelian") {
        await renderPembelianTable();
    } else if (tabId === "penjualan") {
        await renderPenjualanTable();
    } else if (tabId === "harga-emas") {
        await renderHargaEmasTable();
    } else if (tabId === "settings") {
        loadSettingsData();
    }
}

// Modals Helpers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        
        // If closing PIN modal, reset inputs
        if (modalId === "modal-pin-auth") {
            document.querySelectorAll(".pin-digit-box").forEach(i => i.value = "");
            document.getElementById("pin-auth-error").textContent = "";
        }
    }
}

// --- Verification & PIN Flow ---
function requestPinAuthorization(actionCallback) {
    pendingAction = actionCallback;
    openModal("modal-pin-auth");
    
    // Focus first input of PIN box
    const firstBox = document.querySelector(".pin-digit-box");
    if (firstBox) firstBox.focus();
}

function setupFormEventListeners() {
    // TAMBAH PEMBELIAN
    document.getElementById("open-add-beli-modal").addEventListener("click", () => {
        document.getElementById("form-add-beli").reset();
        document.getElementById("beli-tanggal").value = new Date().toISOString().split("T")[0];
        openModal("modal-add-beli");
    });

    document.getElementById("btn-submit-beli").addEventListener("click", (e) => {
        e.preventDefault();
        const form = document.getElementById("form-add-beli");
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const date = document.getElementById("beli-tanggal").value;
        const noSeri = document.getElementById("beli-no-seri").value.trim().toUpperCase();
        const harga = parseFloat(document.getElementById("beli-harga").value);
        const penjual = document.getElementById("beli-penjual").value.trim();

        // 1. Show confirmation dialog
        const summary = `
            <strong>Modul:</strong> Pembelian Emas<br>
            <strong>Tanggal:</strong> ${formatDateIndo(date)}<br>
            <strong>No Seri:</strong> ${noSeri}<br>
            <strong>Harga Beli:</strong> ${formatRupiah(harga)}<br>
            <strong>Nama Penjual:</strong> ${penjual}
        `;
        showConfirmSubmitModal(summary, () => {
            // 2. Request PIN auth
            requestPinAuthorization(async () => {
                const res = await db.addPembelian({
                    tanggal: date,
                    no_seri: noSeri,
                    harga_beli: harga,
                    nama_penjual: penjual
                });
                if (res.success) {
                    closeModal("modal-add-beli");
                    await renderPembelianTable();
                    alert("Data pembelian berhasil ditambahkan!");
                } else {
                    alert("Gagal menambahkan data: " + res.message);
                }
            });
        });
    });

    // TAMBAH PENJUALAN
    document.getElementById("open-add-jual-modal").addEventListener("click", async () => {
        document.getElementById("form-add-jual").reset();
        document.getElementById("jual-tanggal").value = new Date().toISOString().split("T")[0];
        
        // Hide manual input, show select input default
        document.getElementById("manual-serial-input-box").style.display = "none";
        document.getElementById("jual-no-seri-select-input").style.display = "block";
        document.getElementById("jual-no-seri-value").value = "";
        document.getElementById("jual-no-seri-select-input").value = "";
        
        // Load eligible serial numbers from pembelian
        await populateSerialDropdown();
        
        openModal("modal-add-jual");
    });

    // Keuntungan Real-time Calculation
    const hargaJualInput = document.getElementById("jual-harga-jual");
    const hargaRestokInput = document.getElementById("jual-harga-restok");
    const keuntunganInput = document.getElementById("jual-keuntungan");

    function calculateProfit() {
        const jual = parseFloat(hargaJualInput.value) || 0;
        const restok = parseFloat(hargaRestokInput.value) || 0;
        const profit = jual - restok;
        keuntunganInput.value = formatRupiah(profit);
    }
    
    hargaJualInput.addEventListener("input", calculateProfit);
    hargaRestokInput.addEventListener("input", calculateProfit);

    document.getElementById("btn-submit-jual").addEventListener("click", (e) => {
        e.preventDefault();
        const form = document.getElementById("form-add-jual");
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const date = document.getElementById("jual-tanggal").value;
        const gramasi = parseFloat(document.getElementById("jual-gramasi").value);
        
        // Extract serial number (manual or dropdown)
        let noSeri = "";
        const manualBox = document.getElementById("manual-serial-input-box");
        if (manualBox.style.display !== "none") {
            noSeri = document.getElementById("jual-no-seri-manual").value.trim().toUpperCase();
        } else {
            noSeri = document.getElementById("jual-no-seri-value").value;
        }

        if (!noSeri) {
            alert("Harap pilih atau isi No Seri terlebih dahulu!");
            return;
        }

        const pembeli = document.getElementById("jual-pembeli").value.trim();
        const hargaJual = parseFloat(hargaJualInput.value);
        const hargaRestok = parseFloat(hargaRestokInput.value);
        const keuntungan = hargaJual - hargaRestok;

        const summary = `
            <strong>Modul:</strong> Penjualan Emas<br>
            <strong>Tanggal:</strong> ${formatDateIndo(date)}<br>
            <strong>Gramasi:</strong> ${gramasi} gram<br>
            <strong>No Seri:</strong> ${noSeri}<br>
            <strong>Nama Pembeli:</strong> ${pembeli}<br>
            <strong>Harga Jual:</strong> ${formatRupiah(hargaJual)}<br>
            <strong>Harga Restok:</strong> ${formatRupiah(hargaRestok)}<br>
            <strong>Keuntungan:</strong> ${formatRupiah(keuntungan)}
        `;

        showConfirmSubmitModal(summary, () => {
            requestPinAuthorization(async () => {
                const res = await db.addPenjualan({
                    tanggal: date,
                    gramasi: gramasi,
                    no_seri: noSeri,
                    nama_pembeli: pembeli,
                    harga_jual: hargaJual,
                    harga_restok: hargaRestok,
                    keuntungan: keuntungan
                });
                if (res.success) {
                    closeModal("modal-add-jual");
                    await renderPenjualanTable();
                    alert("Data penjualan berhasil ditambahkan!");
                } else {
                    alert("Gagal menambahkan data: " + res.message);
                }
            });
        });
    });

    // TAMBAH HARGA EMAS
    document.getElementById("open-add-harga-modal").addEventListener("click", () => {
        document.getElementById("form-add-harga").reset();
        document.getElementById("harga-tanggal").value = new Date().toISOString().split("T")[0];
        document.getElementById("harga-jenis-custom-box").style.display = "none";
        document.getElementById("harga-jenis-custom").removeAttribute("required");
        openModal("modal-add-harga");
    });

    document.getElementById("harga-jenis").addEventListener("change", (e) => {
        const customBox = document.getElementById("harga-jenis-custom-box");
        const customInput = document.getElementById("harga-jenis-custom");
        if (e.target.value === "Lainnya") {
            customBox.style.display = "block";
            customInput.setAttribute("required", "required");
            customInput.focus();
        } else {
            customBox.style.display = "none";
            customInput.removeAttribute("required");
        }
    });

    document.getElementById("btn-submit-harga").addEventListener("click", (e) => {
        e.preventDefault();
        const form = document.getElementById("form-add-harga");
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const date = document.getElementById("harga-tanggal").value;
        const gram = parseFloat(document.getElementById("harga-gram").value);
        const harga = parseFloat(document.getElementById("harga-nilai").value);
        let jenis = document.getElementById("harga-jenis").value;

        if (jenis === "Lainnya") {
            jenis = document.getElementById("harga-jenis-custom").value.trim();
            if (!jenis) {
                alert("Harap isi nama logam mulia kustom!");
                return;
            }
        }

        const summary = `
            <strong>Modul:</strong> Tabel Harga Emas<br>
            <strong>Tanggal:</strong> ${formatDateIndo(date)}<br>
            <strong>Ukuran Gram:</strong> ${gram} g<br>
            <strong>Harga:</strong> ${formatRupiah(harga)}<br>
            <strong>Jenis Logam:</strong> ${jenis}
        `;

        showConfirmSubmitModal(summary, async () => {
            const res = await db.addHargaEmas({
                tanggal: date,
                gram: gram,
                harga: harga,
                jenis_logam: jenis
            });
            if (res.success) {
                closeModal("modal-add-harga");
                await renderHargaEmasTable();
                alert("Data harga emas berhasil ditambahkan!");
            } else {
                alert("Gagal menambahkan data: " + res.message);
            }
        });
    });

    // Setup PIN digits navigation UI
    const pinInputs = document.querySelectorAll(".pin-digit-box");
    pinInputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            // Numbers only
            input.value = input.value.replace(/[^0-9]/g, '');
            if (input.value && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    // PIN Verify Button click
    document.getElementById("btn-pin-auth-verify").addEventListener("click", async () => {
        let enteredPin = "";
        pinInputs.forEach(i => enteredPin += i.value);

        if (enteredPin.length < 4) {
            document.getElementById("pin-auth-error").textContent = "PIN harus 4 digit!";
            return;
        }

        const correctPin = await db.getPin();
        if (enteredPin === correctPin) {
            closeModal("modal-pin-auth");
            // Run action
            if (pendingAction) {
                const action = pendingAction;
                pendingAction = null;
                await action();
            }
        } else {
            document.getElementById("pin-auth-error").textContent = "PIN salah! Coba lagi.";
            // Clear boxes
            pinInputs.forEach(i => i.value = "");
            pinInputs[0].focus();
        }
    });
}

function showConfirmSubmitModal(summaryText, successCallback) {
    document.getElementById("confirm-submit-data-list").innerHTML = summaryText;
    openModal("modal-confirm-submit");
    
    // Set verify button
    const verifyBtn = document.getElementById("btn-confirm-submit-go");
    // Clear old listeners
    const newBtn = verifyBtn.cloneNode(true);
    verifyBtn.parentNode.replaceChild(newBtn, verifyBtn);

    newBtn.addEventListener("click", () => {
        closeModal("modal-confirm-submit");
        successCallback();
    });
}

// --- Serial Number Dropdown Handlers ---
function setupDropdownEventListeners() {
    const selectInput = document.getElementById("jual-no-seri-select-input");
    const dropdownList = document.getElementById("jual-no-seri-dropdown-list");
    const searchInput = document.getElementById("jual-no-seri-search");
    const manualBox = document.getElementById("manual-serial-input-box");
    const cancelManualBtn = document.getElementById("btn-cancel-manual-serial");
    
    // Toggle dropdown
    selectInput.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownList.classList.toggle("active");
        if (dropdownList.classList.contains("active")) {
            searchInput.value = "";
            filterSerialDropdown("");
            searchInput.focus();
        }
    });

    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".custom-dropdown-container")) {
            dropdownList.classList.remove("active");
        }
    });

    // Filter dropdown on search input
    searchInput.addEventListener("input", (e) => {
        filterSerialDropdown(e.target.value);
    });

    // Cancel manual button
    cancelManualBtn.addEventListener("click", () => {
        manualBox.style.display = "none";
        selectInput.style.display = "block";
        document.getElementById("jual-no-seri-value").value = "";
        selectInput.value = "";
    });

    // Trigger custom manual input
    document.getElementById("dropdown-add-custom-trigger").addEventListener("click", () => {
        dropdownList.classList.remove("active");
        selectInput.style.display = "none";
        manualBox.style.display = "flex";
        document.getElementById("jual-no-seri-manual").value = "";
        document.getElementById("jual-no-seri-manual").focus();
    });
}

async function populateSerialDropdown() {
    const listContainer = document.getElementById("jual-no-seri-options");
    listContainer.innerHTML = "";

    const purchases = await db.getPembelian();
    const sales = await db.getPenjualan();

    // Find serial numbers already sold
    const soldSerials = new Set(sales.map(s => s.no_seri));

    // Filter purchases for unsold serial numbers
    const availableItems = purchases.filter(p => !soldSerials.has(p.no_seri));

    if (availableItems.length === 0) {
        const li = document.createElement("li");
        li.className = "dropdown-option-item";
        li.style.color = "var(--text-muted)";
        li.style.cursor = "default";
        li.textContent = "Tidak ada stok seri aktif";
        listContainer.appendChild(li);
        return;
    }

    availableItems.forEach(item => {
        const li = document.createElement("li");
        li.className = "dropdown-option-item";
        li.setAttribute("data-value", item.no_seri);
        li.setAttribute("data-harga-beli", item.harga_beli);
        li.textContent = `${item.no_seri} (Beli: ${formatRupiah(item.harga_beli)})`;
        
        li.addEventListener("click", () => {
            document.getElementById("jual-no-seri-select-input").value = item.no_seri;
            document.getElementById("jual-no-seri-value").value = item.no_seri;
            
            // Set auto price restock defaults to buying price
            document.getElementById("jual-harga-restok").value = item.harga_beli;
            
            // Force recalculate profit
            const jual = parseFloat(document.getElementById("jual-harga-jual").value) || 0;
            document.getElementById("jual-keuntungan").value = formatRupiah(jual - item.harga_beli);

            document.getElementById("jual-no-seri-dropdown-list").classList.remove("active");
        });

        listContainer.appendChild(li);
    });
}

function filterSerialDropdown(query) {
    const items = document.querySelectorAll("#jual-no-seri-options .dropdown-option-item");
    const cleanQuery = query.toLowerCase().trim();

    items.forEach(item => {
        if (item.getAttribute("data-value")) {
            const text = item.textContent.toLowerCase();
            if (text.includes(cleanQuery)) {
                item.style.display = "block";
            } else {
                item.style.display = "none";
            }
        }
    });
}

// --- Render Table Pembelian ---
async function renderPembelianTable() {
    const tbody = document.querySelector("#pembelian-table tbody");
    tbody.innerHTML = "";

    const list = await db.getPembelian();
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Tidak ada data pembelian.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${formatDateIndo(item.tanggal)}</td>
            <td><strong>${item.no_seri}</strong></td>
            <td>${formatRupiah(item.harga_beli)}</td>
            <td>${item.nama_penjual}</td>
            <td class="action-btns">
                <button class="btn btn-danger btn-sm delete-beli-btn" data-id="${item.id}" data-seri="${item.no_seri}">
                    <i class="fa-solid fa-trash-can"></i> Hapus
                </button>
            </td>
        `;

        // Setup delete trigger
        tr.querySelector(".delete-beli-btn").addEventListener("click", () => {
            const id = item.id;
            const seri = item.no_seri;
            
            requestPinAuthorization(async () => {
                if (confirm(`Apakah Anda yakin ingin menghapus data Pembelian No Seri: ${seri}?`)) {
                    const res = await db.deletePembelian(id, seri);
                    if (res.success) {
                        await renderPembelianTable();
                        alert("Data pembelian berhasil dihapus!");
                    } else {
                        alert("Gagal menghapus: " + res.message);
                    }
                }
            });
        });

        tbody.appendChild(tr);
    });
}

// --- Render Table Penjualan ---
async function renderPenjualanTable() {
    const tbody = document.querySelector("#penjualan-table tbody");
    tbody.innerHTML = "";

    const list = await db.getPenjualan();
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Tidak ada data penjualan.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${formatDateIndo(item.tanggal)}</td>
            <td>${item.gramasi} g</td>
            <td><strong>${item.no_seri}</strong></td>
            <td>${item.nama_pembeli}</td>
            <td>${formatRupiah(item.harga_jual)}</td>
            <td>${formatRupiah(item.harga_restok)}</td>
            <td style="color:var(--success); font-weight:600;">${formatRupiah(item.keuntungan)}</td>
            <td class="action-btns">
                <button class="btn btn-danger btn-sm delete-jual-btn" data-id="${item.id}">
                    <i class="fa-solid fa-trash-can"></i> Hapus
                </button>
            </td>
        `;

        tr.querySelector(".delete-jual-btn").addEventListener("click", () => {
            const id = item.id;
            requestPinAuthorization(async () => {
                if (confirm("Apakah Anda yakin ingin menghapus data Penjualan ini?")) {
                    const res = await db.deletePenjualan(id);
                    if (res.success) {
                        await renderPenjualanTable();
                        alert("Data penjualan berhasil dihapus!");
                    } else {
                        alert("Gagal menghapus: " + res.message);
                    }
                }
            });
        });

        tbody.appendChild(tr);
    });
}

// --- Render Table Harga Emas ---
async function renderHargaEmasTable() {
    const tbody = document.querySelector("#harga-emas-table tbody");
    tbody.innerHTML = "";

    const filterDate = document.getElementById("filter-harga-tanggal").value;
    const list = await db.getHargaEmas(filterDate || null);

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Tidak ada data harga emas untuk tanggal ini.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${item.gram} gram</strong></td>
            <td>
                <span class="price-display">${formatRupiah(item.harga)}</span>
                <input type="number" class="price-edit-input form-input" value="${item.harga}" style="display:none; max-width: 140px; padding: 0.2rem 0.5rem; height: auto;">
            </td>
            <td><span class="badge">${item.jenis_logam}</span></td>
            <td class="action-btns" data-html2canvas-ignore="true">
                <button class="btn btn-primary btn-sm edit-harga-btn">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm delete-harga-btn">
                    <i class="fa-solid fa-trash-can"></i> Hapus
                </button>
                <button class="btn btn-success btn-sm save-harga-btn" style="display:none; background: var(--success-gradient); color: white;">
                    <i class="fa-solid fa-check"></i> Simpan
                </button>
                <button class="btn btn-secondary btn-sm cancel-harga-btn" style="display:none;">
                    <i class="fa-solid fa-xmark"></i> Batal
                </button>
            </td>
        `;

        const priceDisplay = tr.querySelector(".price-display");
        const priceInput = tr.querySelector(".price-edit-input");
        const editBtn = tr.querySelector(".edit-harga-btn");
        const deleteBtn = tr.querySelector(".delete-harga-btn");
        const saveBtn = tr.querySelector(".save-harga-btn");
        const cancelBtn = tr.querySelector(".cancel-harga-btn");

        // Toggle Edit Mode
        editBtn.addEventListener("click", () => {
            priceDisplay.style.display = "none";
            priceInput.style.display = "inline-block";
            editBtn.style.display = "none";
            deleteBtn.style.display = "none";
            saveBtn.style.display = "inline-flex";
            cancelBtn.style.display = "inline-flex";
            priceInput.focus();
        });

        // Cancel Edit Mode
        cancelBtn.addEventListener("click", () => {
            priceInput.value = item.harga;
            priceDisplay.style.display = "inline";
            priceInput.style.display = "none";
            editBtn.style.display = "inline-flex";
            deleteBtn.style.display = "inline-flex";
            saveBtn.style.display = "none";
            cancelBtn.style.display = "none";
        });

        // Save Edited Price (No PIN Verification)
        saveBtn.addEventListener("click", async () => {
            const newPrice = parseFloat(priceInput.value);
            if (isNaN(newPrice) || newPrice < 0) {
                alert("Harga tidak valid!");
                return;
            }

            const res = await db.updateHargaEmas(item.id, newPrice);
            if (res.success) {
                await renderHargaEmasTable();
                alert("Harga emas berhasil diubah!");
            } else {
                alert("Gagal mengubah harga: " + res.message);
            }
        });

        // Delete Price (No PIN Verification)
        deleteBtn.addEventListener("click", async () => {
            if (confirm(`Apakah Anda yakin ingin menghapus data harga emas ${item.gram}g ${item.jenis_logam}?`)) {
                const res = await db.deleteHargaEmas(item.id);
                if (res.success) {
                    await renderHargaEmasTable();
                    alert("Data harga emas berhasil dihapus!");
                } else {
                    alert("Gagal menghapus: " + res.message);
                }
            }
        });

        tbody.appendChild(tr);
    });
}

// --- Settings Module Handlers ---
function setupSettingsEventListeners() {
    // Test Connection
    document.getElementById("test-db-connection").addEventListener("click", async () => {
        const url = document.getElementById("settings-db-url").value.trim();
        const key = document.getElementById("settings-db-key").value.trim();

        if (!url || !key) {
            alert("Harap isi URL dan Anon Key terlebih dahulu!");
            return;
        }

        const loader = alert("Sedang menguji koneksi Supabase...");
        const res = await db.testConnection(url, key);
        alert(res.message);
    });

    // Save Credentials
    document.getElementById("save-db-btn").addEventListener("click", async () => {
        const url = document.getElementById("settings-db-url").value.trim();
        const key = document.getElementById("settings-db-key").value.trim();

        db.setCredentials(url, key);
        updateDatabaseStatusUI();
        alert("Konfigurasi database berhasil disimpan! Aplikasi akan mencoba memuat data dari Supabase.");
        await loadDashboardData();
    });

    // Change PIN
    document.getElementById("save-pin-btn").addEventListener("click", async () => {
        const oldPin = document.getElementById("settings-old-pin").value;
        const newPin = document.getElementById("settings-new-pin").value;
        const confirmPin = document.getElementById("settings-confirm-pin").value;

        if (newPin.length !== 4 || isNaN(newPin)) {
            alert("PIN baru harus berupa 4 digit angka!");
            return;
        }

        if (newPin !== confirmPin) {
            alert("Konfirmasi PIN baru tidak sesuai!");
            return;
        }

        const currentPin = await db.getPin();
        if (oldPin !== currentPin) {
            alert("PIN lama Anda salah!");
            return;
        }

        await db.updatePin(newPin);
        alert("PIN berhasil diubah!");
        document.getElementById("settings-old-pin").value = "";
        document.getElementById("settings-new-pin").value = "";
        document.getElementById("settings-confirm-pin").value = "";
    });

    // Sync button
    document.getElementById("sync-db-btn").addEventListener("click", async () => {
        const { url, key } = db.getCredentials();
        if (!url || !key) {
            alert("Silakan hubungkan Supabase terlebih dahulu di tab Pengaturan!");
            return;
        }
        
        if (confirm("Apakah Anda ingin menyinkronkan data lokal ke Supabase? Ini akan mengunggah semua transaksi lokal Anda.")) {
            const res = await db.syncToSupabase();
            alert(res.message);
            updateDatabaseStatusUI();
            await loadDashboardData();
        }
    });

    // Date price filter
    document.getElementById("filter-harga-tanggal").addEventListener("change", async () => {
        await renderHargaEmasTable();
    });

    // Snapshot board
    document.getElementById("btn-snapshot-wa").addEventListener("click", takeGoldPricesSnapshot);
}

function loadSettingsData() {
    const { url, key } = db.getCredentials();
    document.getElementById("settings-db-url").value = url;
    document.getElementById("settings-db-key").value = key;
}

// --- Dashboard Recap and Chart Processing ---
async function loadDashboardData() {
    const purchases = await db.getPembelian();
    const sales = await db.getPenjualan();

    // 1. Calculate Metrics
    let totalBeli = 0;
    let totalJual = 0;
    let totalUntung = 0;

    purchases.forEach(p => totalBeli += parseFloat(p.harga_beli) || 0);
    sales.forEach(s => {
        totalJual += parseFloat(s.harga_jual) || 0;
        totalUntung += parseFloat(s.keuntungan) || 0;
    });

    // Calculate Active Stock (Items purchased but not yet sold)
    const soldSerials = new Set(sales.map(s => s.no_seri));
    const activeStock = purchases.filter(p => !soldSerials.has(p.no_seri)).length;

    // Render Metrics
    document.getElementById("dashboard-total-beli").textContent = formatRupiah(totalBeli);
    document.getElementById("dashboard-total-jual").textContent = formatRupiah(totalJual);
    document.getElementById("dashboard-total-untung").textContent = formatRupiah(totalUntung);
    document.getElementById("dashboard-active-stock").textContent = `${activeStock} Item`;

    // 2. Render Recap Table
    await renderRecapTable(purchases, sales);
}

function setupRecapTabEventListeners() {
    const recapBtns = document.querySelectorAll(".recap-tab-btn");
    recapBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            recapBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentRecapMode = btn.getAttribute("data-recap");
            
            const purchases = await db.getPembelian();
            const sales = await db.getPenjualan();
            await renderRecapTable(purchases, sales);
        });
    });
}

// Render Recap Table & Generate Chart
async function renderRecapTable(purchases, sales) {
    const thead = document.querySelector("#recap-table thead");
    const tbody = document.querySelector("#recap-table tbody");
    
    thead.innerHTML = "";
    tbody.innerHTML = "";

    // Data containers for charts
    let chartLabels = [];
    let chartSalesData = [];
    let chartProfitData = [];

    if (currentRecapMode === "month") {
        thead.innerHTML = `
            <tr>
                <th>Bulan / Tahun</th>
                <th>Total Pembelian</th>
                <th>Total Penjualan</th>
                <th>Keuntungan</th>
            </tr>
        `;

        // Grouping data by YYYY-MM
        const monthlyRecap = {};
        
        purchases.forEach(p => {
            const monthKey = p.tanggal.substring(0, 7); // YYYY-MM
            if (!monthlyRecap[monthKey]) monthlyRecap[monthKey] = { beli: 0, jual: 0, untung: 0 };
            monthlyRecap[monthKey].beli += parseFloat(p.harga_beli) || 0;
        });

        sales.forEach(s => {
            const monthKey = s.tanggal.substring(0, 7);
            if (!monthlyRecap[monthKey]) monthlyRecap[monthKey] = { beli: 0, jual: 0, untung: 0 };
            monthlyRecap[monthKey].jual += parseFloat(s.harga_jual) || 0;
            monthlyRecap[monthKey].untung += parseFloat(s.keuntungan) || 0;
        });

        // Sort monthly keys descending for presentation
        const sortedMonths = Object.keys(monthlyRecap).sort().reverse();
        
        if (sortedMonths.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Tidak ada transaksi.</td></tr>`;
        } else {
            sortedMonths.forEach(mKey => {
                const data = monthlyRecap[mKey];
                const tr = document.createElement("tr");
                
                // Format Month String e.g. "Juli 2026"
                const [year, month] = mKey.split("-");
                const dummyDate = new Date(year, parseInt(month) - 1, 1);
                const monthLabel = dummyDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

                tr.innerHTML = `
                    <td><strong>${monthLabel}</strong></td>
                    <td>${formatRupiah(data.beli)}</td>
                    <td>${formatRupiah(data.jual)}</td>
                    <td style="color:var(--success); font-weight:600;">${formatRupiah(data.untung)}</td>
                `;
                tbody.appendChild(tr);
            });

            // Map data for charts ascending chronologically
            const chronologicalMonths = [...sortedMonths].reverse();
            chartLabels = chronologicalMonths.map(m => {
                const [year, month] = m.split("-");
                const dummyDate = new Date(year, parseInt(month) - 1, 1);
                return dummyDate.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
            });
            chartSalesData = chronologicalMonths.map(m => monthlyRecap[m].jual);
            chartProfitData = chronologicalMonths.map(m => monthlyRecap[m].untung);
        }

    } else if (currentRecapMode === "year") {
        thead.innerHTML = `
            <tr>
                <th>Tahun</th>
                <th>Total Pembelian</th>
                <th>Total Penjualan</th>
                <th>Keuntungan</th>
            </tr>
        `;

        const yearlyRecap = {};

        purchases.forEach(p => {
            const yearKey = p.tanggal.substring(0, 4); // YYYY
            if (!yearlyRecap[yearKey]) yearlyRecap[yearKey] = { beli: 0, jual: 0, untung: 0 };
            yearlyRecap[yearKey].beli += parseFloat(p.harga_beli) || 0;
        });

        sales.forEach(s => {
            const yearKey = s.tanggal.substring(0, 4);
            if (!yearlyRecap[yearKey]) yearlyRecap[yearKey] = { beli: 0, jual: 0, untung: 0 };
            yearlyRecap[yearKey].jual += parseFloat(s.harga_jual) || 0;
            yearlyRecap[yearKey].untung += parseFloat(s.keuntungan) || 0;
        });

        const sortedYears = Object.keys(yearlyRecap).sort().reverse();

        if (sortedYears.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Tidak ada transaksi.</td></tr>`;
        } else {
            sortedYears.forEach(yKey => {
                const data = yearlyRecap[yKey];
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>Tahun ${yKey}</strong></td>
                    <td>${formatRupiah(data.beli)}</td>
                    <td>${formatRupiah(data.jual)}</td>
                    <td style="color:var(--success); font-weight:600;">${formatRupiah(data.untung)}</td>
                `;
                tbody.appendChild(tr);
            });

            const chronologicalYears = [...sortedYears].reverse();
            chartLabels = chronologicalYears;
            chartSalesData = chronologicalYears.map(y => yearlyRecap[y].jual);
            chartProfitData = chronologicalYears.map(y => yearlyRecap[y].untung);
        }

    } else if (currentRecapMode === "item") {
        thead.innerHTML = `
            <tr>
                <th>Jenis Logam Mulia</th>
                <th>Item Dibeli</th>
                <th>Item Terjual</th>
                <th>Stok Aktif</th>
                <th>Total Keuntungan</th>
            </tr>
        `;

        // Grouping by Metal Type
        // Antam, UBS, Galeri24, Perak Nadir, Custom
        const itemRecap = {
            "Antam": { beli: 0, jual: 0, untung: 0 },
            "UBS": { beli: 0, jual: 0, untung: 0 },
            "Galeri24": { beli: 0, jual: 0, untung: 0 },
            "Perak Nadir": { beli: 0, jual: 0, untung: 0 },
            "Lain-lain": { beli: 0, jual: 0, untung: 0 }
        };

        function parseMetalType(noSeri) {
            const serial = noSeri.toUpperCase();
            if (serial.includes("ANTAM")) return "Antam";
            if (serial.includes("UBS")) return "UBS";
            if (serial.includes("G24") || serial.includes("GALERI")) return "Galeri24";
            if (serial.includes("PRK") || serial.includes("PERAK") || serial.includes("NADIR")) return "Perak Nadir";
            return "Lain-lain";
        }

        purchases.forEach(p => {
            const type = parseMetalType(p.no_seri);
            itemRecap[type].beli += 1;
        });

        sales.forEach(s => {
            const type = parseMetalType(s.no_seri);
            itemRecap[type].jual += 1;
            itemRecap[type].untung += parseFloat(s.keuntungan) || 0;
        });

        // Render rows
        Object.keys(itemRecap).forEach(type => {
            const data = itemRecap[type];
            const activeStock = Math.max(0, data.beli - data.jual);
            
            // Skip rendering if no transactions for this metal type
            if (data.beli === 0 && data.jual === 0) return;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${type}</strong></td>
                <td>${data.beli} pcs</td>
                <td>${data.jual} pcs</td>
                <td style="color:var(--gold);">${activeStock} pcs</td>
                <td style="color:var(--success); font-weight:600;">${formatRupiah(data.untung)}</td>
            `;
            tbody.appendChild(tr);

            chartLabels.push(type);
            chartSalesData.push(data.jual);
            chartProfitData.push(data.untung);
        });

        if (tbody.children.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Tidak ada transaksi per item.</td></tr>`;
        }
    }

    // Render/Refresh Chart.js Visuals
    renderRecapChart(chartLabels, chartSalesData, chartProfitData);
}

function renderRecapChart(labels, sales, profit) {
    const ctx = document.getElementById("recap-chart").getContext("2d");

    // Destroy old instance if exists
    if (recapChartInstance) {
        recapChartInstance.destroy();
    }

    // Chart Configuration
    recapChartInstance = new Chart(ctx, {
        type: currentRecapMode === "item" ? "bar" : "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Penjualan (Rp)",
                    data: sales,
                    borderColor: "#d4af37",
                    backgroundColor: "rgba(212, 175, 55, 0.2)",
                    borderWidth: 2,
                    borderRadius: 4,
                    tension: 0.3,
                    fill: currentRecapMode !== "item"
                },
                {
                    label: "Keuntungan (Rp)",
                    data: profit,
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    borderWidth: 2,
                    borderRadius: 4,
                    tension: 0.3,
                    fill: currentRecapMode !== "item"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#f8fafc",
                        font: { family: "Outfit" }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#94a3b8", font: { family: "Outfit" } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: {
                        color: "#94a3b8",
                        font: { family: "Outfit" },
                        callback: function(value) {
                            if (value >= 1e6) return (value / 1e6) + " Jt";
                            if (value >= 1e3) return (value / 1e3) + " Rb";
                            return value;
                        }
                    }
                }
            }
        }
    });
}

// --- Data Export & PDF Module ---
function setupExportEventListeners() {
    // Dashboard Recap Excel
    document.getElementById("export-excel-recap-btn").addEventListener("click", async () => {
        const purchases = await db.getPembelian();
        const sales = await db.getPenjualan();

        // Process monthly recap list
        const monthlyRecap = {};
        purchases.forEach(p => {
            const m = p.tanggal.substring(0, 7);
            if (!monthlyRecap[m]) monthlyRecap[m] = { beli: 0, jual: 0, untung: 0 };
            monthlyRecap[m].beli += parseFloat(p.harga_beli) || 0;
        });
        sales.forEach(s => {
            const m = s.tanggal.substring(0, 7);
            if (!monthlyRecap[m]) monthlyRecap[m] = { beli: 0, jual: 0, untung: 0 };
            monthlyRecap[m].jual += parseFloat(s.harga_jual) || 0;
            monthlyRecap[m].untung += parseFloat(s.keuntungan) || 0;
        });

        const sheetData = Object.keys(monthlyRecap).sort().reverse().map(m => {
            const [year, month] = m.split("-");
            const dummyDate = new Date(year, parseInt(month) - 1, 1);
            return {
                "Bulan / Tahun": dummyDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
                "Total Pembelian (IDR)": monthlyRecap[m].beli,
                "Total Penjualan (IDR)": monthlyRecap[m].jual,
                "Keuntungan (IDR)": monthlyRecap[m].untung
            };
        });

        exportToExcel(sheetData, "Rekap_Bulanan");
    });

    // Pembelian Excel & PDF
    document.getElementById("export-excel-beli").addEventListener("click", async () => {
        const purchases = await db.getPembelian();
        const data = purchases.map(p => ({
            "Tanggal": p.tanggal,
            "No Seri": p.no_seri,
            "Harga Beli (IDR)": p.harga_beli,
            "Nama Penjual": p.nama_penjual
        }));
        exportToExcel(data, "Pembelian_Emas");
    });

    document.getElementById("export-pdf-beli").addEventListener("click", async () => {
        const purchases = await db.getPembelian();
        const tableRows = purchases.map(p => [
            p.tanggal,
            p.no_seri,
            formatRupiah(p.harga_beli),
            p.nama_penjual
        ]);
        exportToPDF("Riwayat Pembelian Emas", ["Tanggal", "No Seri", "Harga Beli", "Nama Penjual"], tableRows, "Pembelian_Emas");
    });

    // Penjualan Excel & PDF
    document.getElementById("export-excel-jual").addEventListener("click", async () => {
        const sales = await db.getPenjualan();
        const data = sales.map(s => ({
            "Tanggal": s.tanggal,
            "Gramasi (g)": s.gramasi,
            "No Seri": s.no_seri,
            "Nama Pembeli": s.nama_pembeli,
            "Harga Jual (IDR)": s.harga_jual,
            "Harga Restok (IDR)": s.harga_restok,
            "Keuntungan (IDR)": s.keuntungan
        }));
        exportToExcel(data, "Penjualan_Emas");
    });

    document.getElementById("export-pdf-jual").addEventListener("click", async () => {
        const sales = await db.getPenjualan();
        const tableRows = sales.map(s => [
            s.tanggal,
            `${s.gramasi} g`,
            s.no_seri,
            s.nama_pembeli,
            formatRupiah(s.harga_jual),
            formatRupiah(s.harga_restok),
            formatRupiah(s.keuntungan)
        ]);
        exportToPDF(
            "Riwayat Penjualan Emas", 
            ["Tanggal", "Gramasi", "No Seri", "Nama Pembeli", "Harga Jual", "Harga Restok", "Keuntungan"], 
            tableRows, 
            "Penjualan_Emas"
        );
    });
}

function exportToExcel(jsonData, filePrefix) {
    if (jsonData.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    // Auto-fit column widths
    const maxKeys = Object.keys(jsonData[0]);
    worksheet["!cols"] = maxKeys.map(k => ({ wch: Math.max(k.length + 3, 18) }));

    const fileName = getExportFilename(filePrefix, "xlsx");
    XLSX.writeFile(workbook, fileName);
}

function exportToPDF(title, headers, rows, filePrefix) {
    if (rows.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Set title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(170, 124, 17); // Golden Brass primary color
    doc.text("RUMAISHO GOLD SHOP", 14, 18);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont("Helvetica", "normal");
    doc.text(title, 14, 25);
    
    // Export Date
    const exportDateStr = new Date().toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
    doc.setFontSize(9);
    doc.text(`Dicetak pada: ${exportDateStr}`, 14, 30);

    // Render table
    doc.autoTable({
        startY: 35,
        head: [headers],
        body: rows,
        headStyles: { fillColor: [30, 41, 59], textColor: [248, 250, 252] }, // deep slate headers
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { font: "Helvetica", fontSize: 9 },
        margin: { top: 35 }
    });

    const fileName = getExportFilename(filePrefix, "pdf");
    doc.save(fileName);
}

// --- html2canvas Gold Price Snapshot ---
function takeGoldPricesSnapshot() {
    const area = document.getElementById("gold-prices-snapshot-area");
    
    // Temporarily add capturing class to DOM body to adjust styling (show watermark, hide action panel)
    document.body.classList.add("html2canvas-container");
    
    alert("Mengambil snapshot... Gambar akan diunduh secara otomatis.");

    html2canvas(area, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0b0f19",
        scale: 2 // Make it double density for high quality images
    }).then(canvas => {
        document.body.classList.remove("html2canvas-container");

        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/png");
        
        // Try sharing using navigator.share if available
        if (navigator.canShare && navigator.share) {
            canvas.toBlob((blob) => {
                const file = new File([blob], getExportFilename("harga_emas", "png"), { type: "image/png" });
                navigator.share({
                    files: [file],
                    title: "Harga Emas Rumaisho Shop",
                    text: "Update Harga Emas terbaru dari Rumaisho Shop!"
                }).catch(err => {
                    // Fallback to manual download if share gets cancelled/fails
                    triggerDownload(dataUrl);
                });
            }, "image/png");
        } else {
            // Fallback direct download
            triggerDownload(dataUrl);
        }
    }).catch(err => {
        document.body.classList.remove("html2canvas-container");
        console.error("Snapshot error:", err);
        alert("Gagal mengambil snapshot. Harap coba lagi.");
    });
}

function triggerDownload(dataUrl) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = getExportFilename("harga_emas_snapshot", "png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Import Excel Module ---
function setupImportEventListeners() {
    // TRIGGER BUTTONS
    document.getElementById("btn-import-beli-trigger").addEventListener("click", () => {
        document.getElementById("import-excel-beli").click();
    });

    document.getElementById("btn-import-jual-trigger").addEventListener("click", () => {
        document.getElementById("import-excel-jual").click();
    });

    // FILE INPUT HANDLERS
    document.getElementById("import-excel-beli").addEventListener("change", (e) => {
        handleImportExcel(e, "pembelian");
    });

    document.getElementById("import-excel-jual").addEventListener("change", (e) => {
        handleImportExcel(e, "penjualan");
    });
}

function handleImportExcel(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert("File Excel kosong atau tidak valid!");
                e.target.value = "";
                return;
            }

            processImportData(jsonData, type, e.target);
        } catch (err) {
            console.error("Excel import parse error:", err);
            alert("Gagal membaca file Excel. Harap pastikan format file benar.");
            e.target.value = "";
        }
    };
    reader.readAsArrayBuffer(file);
}

function processImportData(data, type, fileInput) {
    let validRecords = [];
    let errorMsg = "";

    if (type === "pembelian") {
        // Expected columns: Tanggal, No Seri, Harga Beli (IDR), Nama Penjual
        data.forEach((row, i) => {
            const dateVal = row["Tanggal"];
            const serialVal = row["No Seri"] || row["No. Seri"];
            const hargaVal = row["Harga Beli (IDR)"] || row["Harga Beli"];
            const penjualVal = row["Nama Penjual"] || row["Penjual"];

            if (!dateVal || !serialVal || hargaVal === undefined || !penjualVal) {
                errorMsg += `Baris ${i + 2}: Kolom wajib tidak lengkap.\n`;
                return;
            }

            let dateStr = String(dateVal).trim();
            if (!isNaN(dateVal) && Number(dateVal) > 40000) {
                dateStr = ExcelDateToJSDate(Number(dateVal));
            }

            validRecords.push({
                tanggal: dateStr,
                no_seri: String(serialVal).trim().toUpperCase(),
                harga_beli: parseFloat(hargaVal),
                nama_penjual: String(penjualVal).trim()
            });
        });

    } else if (type === "penjualan") {
        // Expected columns: Tanggal, Gramasi (g), No Seri, Nama Pembeli, Harga Jual (IDR), Harga Restok (IDR), Keuntungan (IDR)
        data.forEach((row, i) => {
            const dateVal = row["Tanggal"];
            const gramVal = row["Gramasi (g)"] || row["Gramasi"];
            const serialVal = row["No Seri"] || row["No. Seri"];
            const pembeliVal = row["Nama Pembeli"] || row["Pembeli"];
            const jualVal = row["Harga Jual (IDR)"] || row["Harga Jual"];
            const restokVal = row["Harga Restok (IDR)"] || row["Harga Restok"];
            const untungVal = row["Keuntungan (IDR)"] || row["Keuntungan"];

            if (!dateVal || gramVal === undefined || !serialVal || !pembeliVal || jualVal === undefined || restokVal === undefined) {
                errorMsg += `Baris ${i + 2}: Kolom wajib tidak lengkap.\n`;
                return;
            }

            let dateStr = String(dateVal).trim();
            if (!isNaN(dateVal) && Number(dateVal) > 40000) {
                dateStr = ExcelDateToJSDate(Number(dateVal));
            }

            const hargaJual = parseFloat(jualVal);
            const hargaRestok = parseFloat(restokVal);
            const keuntungan = untungVal !== undefined ? parseFloat(untungVal) : (hargaJual - hargaRestok);

            validRecords.push({
                tanggal: dateStr,
                gramasi: parseFloat(gramVal),
                no_seri: String(serialVal).trim().toUpperCase(),
                nama_pembeli: String(pembeliVal).trim(),
                harga_jual: hargaJual,
                harga_restok: hargaRestok,
                keuntungan: keuntungan
            });
        });
    }

    if (errorMsg) {
        alert("Validasi Gagal:\n" + errorMsg);
        fileInput.value = "";
        return;
    }

    if (validRecords.length === 0) {
        alert("Tidak ada data valid yang bisa diimpor.");
        fileInput.value = "";
        return;
    }

    const recordTypeLabel = type === "pembelian" ? "Pembelian" : "Penjualan";
    const confirmationText = `
        <strong>Konfirmasi Impor Data Excel</strong><br>
        Apakah Anda yakin ingin mengimpor <strong>${validRecords.length} data ${recordTypeLabel}</strong> dari file Excel ini?<br><br>
        <em>Tindakan ini memerlukan verifikasi PIN.</em>
    `;

    showConfirmSubmitModal(confirmationText, () => {
        requestPinAuthorization(async () => {
            let successCount = 0;
            let skipCount = 0;
            let errors = [];

            if (type === "pembelian") {
                const currentPurchases = await db.getPembelian();
                const currentSerials = new Set(currentPurchases.map(p => p.no_seri));

                for (const item of validRecords) {
                    if (currentSerials.has(item.no_seri)) {
                        skipCount++;
                        continue;
                    }
                    const res = await db.addPembelian(item);
                    if (res.success) {
                        successCount++;
                        currentSerials.add(item.no_seri);
                    } else {
                        errors.push(`${item.no_seri}: ${res.message}`);
                    }
                }
            } else if (type === "penjualan") {
                for (const item of validRecords) {
                    const res = await db.addPenjualan(item);
                    if (res.success) {
                        successCount++;
                    } else {
                        errors.push(`${item.no_seri}: ${res.message}`);
                    }
                }
            }

            fileInput.value = "";

            let report = `Impor selesai!\n- Berhasil: ${successCount} data\n- Dilewati (Duplikat Seri): ${skipCount} data`;
            if (errors.length > 0) {
                report += `\n- Gagal: ${errors.length} data (Detail di konsol)`;
                console.error("Import errors detail:", errors);
            }
            alert(report);

            // Reload UI
            if (type === "pembelian") {
                await renderPembelianTable();
            } else {
                await renderPenjualanTable();
            }
            await loadDashboardData();
        });
    });
}

function ExcelDateToJSDate(serial) {
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;  
    const date_info = new Date(utc_value * 1000);

    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);

    const date = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), 0, 0, total_seconds);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

