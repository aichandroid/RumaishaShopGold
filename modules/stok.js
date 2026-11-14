// Stok Emas (Inventory Multi-Unit) Module for Rumaisho Gold
import { formatDateIndo, formatRupiah, formatRibuanInput, parseRibuan, setupRibuanInput } from './utils.js';
import { openModal, closeModal, showConfirmSubmitModal } from './ui.js';
import { requestPinAuthorization } from './auth.js';

let currentStokFilter = "active"; // "active" or "all"
let currentStokSearch = "";

export function setupStokEventListeners(db, onMutate) {
    const filterBtnActive = document.getElementById("filter-stok-btn-active");
    const filterBtnAll = document.getElementById("filter-stok-btn-all");
    const searchInput = document.getElementById("filter-stok-search");

    if (filterBtnActive && filterBtnAll) {
        filterBtnActive.addEventListener("click", () => {
            filterBtnActive.classList.add("active");
            filterBtnAll.classList.remove("active");
            currentStokFilter = "active";
            renderStokEmasTable(db, onMutate);
        });

        filterBtnAll.addEventListener("click", () => {
            filterBtnAll.classList.add("active");
            filterBtnActive.classList.remove("active");
            currentStokFilter = "all";
            renderStokEmasTable(db, onMutate);
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentStokSearch = e.target.value.toLowerCase().trim();
            renderStokEmasTable(db, onMutate);
        });
    }

    // Modal Add Manual Stock
    const openAddStokBtn = document.getElementById("open-add-stok-modal");
    if (openAddStokBtn) {
        openAddStokBtn.addEventListener("click", () => {
            const form = document.getElementById("form-add-stok");
            if (form) form.reset();
            const dateInp = document.getElementById("stok-tanggal");
            if (dateInp) dateInp.value = new Date().toISOString().split("T")[0];
            const yearInp = document.getElementById("stok-tahun");
            if (yearInp) yearInp.value = new Date().getFullYear();
            openModal("modal-add-stok");
        });
    }

    const submitStokBtn = document.getElementById("btn-submit-stok");
    if (submitStokBtn) {
        submitStokBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const form = document.getElementById("form-add-stok");
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const date = document.getElementById("stok-tanggal").value;
            const noSeri = document.getElementById("stok-no-seri").value.trim().toUpperCase();
            const gramasi = parseFloat(document.getElementById("stok-gramasi").value) || 0;
            const tahun = parseInt(document.getElementById("stok-tahun").value) || new Date().getFullYear();
            const modal = parseRibuan(document.getElementById("stok-harga-modal").value);

            const summary = `
                <strong>Modul:</strong> Tambah Stok Emas Manual<br>
                <strong>Tanggal Input:</strong> ${formatDateIndo(date)}<br>
                <strong>No Seri:</strong> ${noSeri}<br>
                <strong>Gramasi:</strong> ${gramasi} gram<br>
                <strong>Tahun:</strong> ${tahun}<br>
                <strong>Modal/Harga Beli:</strong> ${modal > 0 ? formatRupiah(modal) : 'Tidak ditentukan'}
            `;

            showConfirmSubmitModal(summary, () => {
                requestPinAuthorization(async () => {
                    const res = await db.addStokManual({
                        tanggal_input: date,
                        no_seri: noSeri,
                        gramasi: gramasi,
                        tahun: tahun,
                        harga_modal: modal
                    });
                    if (res.success) {
                        closeModal("modal-add-stok");
                        if (typeof onMutate === "function") {
                            await onMutate();
                        }
                        alert("Data stok emas manual berhasil ditambahkan!");
                    } else {
                        alert("Gagal menambahkan stok: " + res.message);
                    }
                });
            });
        });
    }

    // Modal Edit Stock
    const submitEditStokBtn = document.getElementById("btn-submit-edit-stok");
    if (submitEditStokBtn) {
        submitEditStokBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const form = document.getElementById("form-edit-stok");
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const id = document.getElementById("edit-stok-id").value;
            const tipe = document.getElementById("edit-stok-tipe").value;
            const oldSeri = document.getElementById("edit-stok-old-seri").value;
            const date = document.getElementById("edit-stok-tanggal").value;
            const noSeri = document.getElementById("edit-stok-no-seri").value.trim().toUpperCase();
            const tahunVal = document.getElementById("edit-stok-tahun").value.trim();
            const tahun = tahunVal ? parseInt(tahunVal, 10) : null;
            const gramasi = parseFloat(document.getElementById("edit-stok-gramasi").value) || 0;
            const modal = parseRibuan(document.getElementById("edit-stok-harga-modal").value);
            const asal = document.getElementById("edit-stok-asal").value.trim();

            if (oldSeri !== noSeri) {
                const allStock = await db.getStokEmas();
                const exists = allStock.some(s => (s.no_seri || "").trim().toUpperCase() === noSeri && s.id !== id && !s.is_sold);
                if (exists) {
                    alert(`No Seri "${noSeri}" saat ini masih aktif pada stok lain yang belum terjual! Silakan gunakan nomor seri yang berbeda.`);
                    return;
                }
            }

            const summary = `
                <strong>Modul:</strong> Edit Data Stok Emas<br>
                <strong>Sumber:</strong> ${tipe === "pembelian" ? "Pembelian" : "Manual"}<br>
                <strong>Tanggal:</strong> ${formatDateIndo(date)}<br>
                <strong>No Seri:</strong> ${noSeri}${oldSeri !== noSeri ? ` <em>(Lama: ${oldSeri})</em>` : ''}<br>
                <strong>Tahun:</strong> ${tahun ? tahun : '-'}<br>
                <strong>Gramasi:</strong> ${gramasi} gram<br>
                <strong>Modal/Harga Beli:</strong> ${modal > 0 ? formatRupiah(modal) : 'Rp 0'}<br>
                ${tipe === "pembelian" ? `<strong>Nama Penjual:</strong> ${asal}<br>` : ''}
            `;

            showConfirmSubmitModal(summary, () => {
                requestPinAuthorization(async () => {
                    let res;
                    if (tipe === "manual") {
                        res = await db.updateStokManual(id, {
                            tanggal_input: date,
                            no_seri: noSeri,
                            tahun: tahun,
                            gramasi: gramasi,
                            harga_modal: modal
                        }, oldSeri);
                    } else {
                        res = await db.updatePembelian(id, {
                            tanggal: date,
                            no_seri: noSeri,
                            tahun: tahun,
                            gramasi: gramasi,
                            harga_beli: modal,
                            nama_penjual: asal || "Pemasok Emas"
                        }, oldSeri);
                    }

                    if (res.success) {
                        closeModal("modal-edit-stok");
                        if (typeof onMutate === "function") {
                            await onMutate();
                        }
                        alert("Data stok emas berhasil diperbarui!");
                    } else {
                        alert("Gagal memperbarui stok: " + (res.message || "Terjadi kesalahan"));
                    }
                });
            });
        });
    }

    const editModalPriceInp = document.getElementById("edit-stok-harga-modal");
    if (editModalPriceInp) setupRibuanInput(editModalPriceInp);
}

export async function renderStokEmasTable(db, onMutate) {
    const tbody = document.querySelector("#stok-emas-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const allStocks = await db.getStokEmas();

    // 1. Calculate Summary Metrics
    const activeItems = allStocks.filter(s => !s.is_sold);
    const soldItems = allStocks.filter(s => s.is_sold);

    const totalActiveCount = activeItems.length;
    const totalActiveGram = activeItems.reduce((sum, item) => sum + (parseFloat(item.gramasi) || 0), 0);
    const totalActiveModal = activeItems.reduce((sum, item) => sum + (parseFloat(item.harga_modal) || 0), 0);
    const totalSoldCount = soldItems.length;

    // Update Dashboard & Stock Cards
    const stokItemEl = document.getElementById("stok-total-item");
    const stokGramEl = document.getElementById("stok-total-gram");
    const stokModalEl = document.getElementById("stok-total-modal");
    const stokTerjualEl = document.getElementById("stok-total-terjual");

    if (stokItemEl) stokItemEl.textContent = `${totalActiveCount} Item`;
    if (stokGramEl) stokGramEl.textContent = `${Number(totalActiveGram.toFixed(3))} g`;
    if (stokModalEl) stokModalEl.textContent = formatRupiah(totalActiveModal);
    if (stokTerjualEl) stokTerjualEl.textContent = `${totalSoldCount} Item`;

    // 2. Filter & Search
    let displayList = allStocks;
    if (currentStokFilter === "active") {
        displayList = displayList.filter(s => !s.is_sold);
    }

    if (currentStokSearch) {
        displayList = displayList.filter(s => {
            const seri = (s.no_seri || "").toLowerCase();
            const asal = (s.keterangan_asal || "").toLowerCase();
            const sumber = (s.sumber_label || "").toLowerCase();
            const thn = String(s.tahun || "").toLowerCase();
            return seri.includes(currentStokSearch) || asal.includes(currentStokSearch) || sumber.includes(currentStokSearch) || thn.includes(currentStokSearch);
        });
    }

    if (displayList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding: 2rem;">Tidak ada data stok emas yang sesuai filter.</td></tr>`;
        return;
    }

    displayList.forEach((item, index) => {
        const tr = document.createElement("tr");

        const statusBadge = item.is_sold
            ? `<span class="badge badge-danger"><i class="fa-solid fa-hand-holding-dollar" aria-hidden="true"></i> Terjual</span>`
            : `<span class="badge badge-success"><i class="fa-solid fa-check" aria-hidden="true"></i> Tersedia</span>`;

        const modalText = item.harga_modal > 0 ? formatRupiah(item.harga_modal) : "-";

        const aksiHtml = `
            <div class="action-btns">
                <button class="btn btn-secondary btn-sm edit-stok-btn" title="Edit Stok Emas">
                    <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm delete-stok-btn" title="Hapus Stok Emas">
                    <i class="fa-solid fa-trash-can" aria-hidden="true"></i> Hapus
                </button>
            </div>
        `;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatDateIndo(item.tanggal_masuk)}</td>
            <td><span class="badge badge-serial">${item.no_seri}</span></td>
            <td>${item.tahun || '-'}</td>
            <td class="text-right"><strong>${item.gramasi} g</strong></td>
            <td class="text-right font-semibold">${modalText}</td>
            <td><span class="badge badge-neutral">${item.sumber_label}</span></td>
            <td>${statusBadge}</td>
            <td class="text-center">${aksiHtml}</td>
        `;

        const editBtn = tr.querySelector(".edit-stok-btn");
        if (editBtn) {
            editBtn.addEventListener("click", () => {
                const form = document.getElementById("form-edit-stok");
                if (form) form.reset();
                document.getElementById("edit-stok-id").value = item.id || "";
                document.getElementById("edit-stok-tipe").value = item.tipe_sumber;
                document.getElementById("edit-stok-old-seri").value = item.no_seri || "";
                document.getElementById("edit-stok-tanggal").value = (item.tanggal_masuk && item.tanggal_masuk !== "-") ? item.tanggal_masuk : new Date().toISOString().split("T")[0];
                document.getElementById("edit-stok-no-seri").value = item.no_seri || "";
                document.getElementById("edit-stok-tahun").value = (item.tahun && item.tahun !== "-") ? item.tahun : "";
                document.getElementById("edit-stok-gramasi").value = item.gramasi || "";
                document.getElementById("edit-stok-harga-modal").value = item.harga_modal ? formatRibuanInput(item.harga_modal) : "";
                document.getElementById("edit-stok-asal").value = (item.keterangan_asal && item.keterangan_asal !== "-" && item.keterangan_asal !== "Input Manual") ? item.keterangan_asal : "";

                const asalGroup = document.getElementById("edit-stok-asal-group");
                if (asalGroup) {
                    if (item.tipe_sumber === "pembelian") {
                        asalGroup.querySelector("label").textContent = "Nama Penjual";
                        document.getElementById("edit-stok-asal").placeholder = "Nama penjual asal";
                    } else {
                        asalGroup.querySelector("label").textContent = "Keterangan Asal (Opsional)";
                        document.getElementById("edit-stok-asal").placeholder = "Keterangan asal stok";
                    }
                }

                openModal("modal-edit-stok");
            });
        }

        const deleteBtn = tr.querySelector(".delete-stok-btn");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {
                const id = item.id;
                const seri = item.no_seri;
                const isSold = item.is_sold;
                const tipe = item.tipe_sumber;

                let confirmMsg = `Apakah Anda yakin ingin menghapus data stok emas No Seri: ${seri}?`;
                if (isSold) {
                    confirmMsg = `PERINGATAN: Emas No Seri ${seri} berstatus TERJUAL ke "${item.sale_info?.nama_pembeli || 'Pembeli'}".\n\nMenghapus stok ini dari inventaris dapat mempengaruhi sinkronisasi data transaksi penjualan.\nApakah Anda tetap yakin ingin menghapusnya?`;
                }

                if (confirm(confirmMsg)) {
                    requestPinAuthorization(async () => {
                        let res;
                        if (tipe === "manual") {
                            res = await db.deleteStokManual(id, seri);
                        } else {
                            res = await db.deletePembelian(id, seri);
                        }

                        if (res && res.success) {
                            if (typeof onMutate === "function") {
                                await onMutate();
                            }
                            alert("Data stok emas berhasil dihapus!");
                        } else {
                            alert("Gagal menghapus stok: " + (res?.message || "Terjadi kesalahan"));
                        }
                    });
                }
            });
        }

        tbody.appendChild(tr);
    });
}
