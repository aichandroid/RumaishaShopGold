// Penjualan Module for Rumaisho Gold
import { formatDateIndo, formatRupiah, formatRibuanInput, parseRibuan, setupRibuanInput } from './utils.js';
import { openModal, closeModal, showConfirmSubmitModal } from './ui.js';
import { requestPinAuthorization } from './auth.js';

export function setupPenjualanForm(db, onMutate) {
    const hargaJualInput = document.getElementById("jual-harga-jual");
    const hargaRestokInput = document.getElementById("jual-harga-restok");
    const keuntunganInput = document.getElementById("jual-keuntungan");

    function calculateProfit() {
        if (!hargaJualInput || !hargaRestokInput || !keuntunganInput) return;
        const jual = parseRibuan(hargaJualInput.value);
        const restok = parseRibuan(hargaRestokInput.value);
        const profit = jual - restok;
        keuntunganInput.value = formatRupiah(profit);
    }
    
    if (hargaJualInput) setupRibuanInput(hargaJualInput, () => calculateProfit());
    if (hargaRestokInput) setupRibuanInput(hargaRestokInput, () => calculateProfit());

    const openBtn = document.getElementById("open-add-jual-modal");
    if (openBtn) {
        openBtn.addEventListener("click", async () => {
            const form = document.getElementById("form-add-jual");
            if (form) form.reset();
            const dateInp = document.getElementById("jual-tanggal");
            if (dateInp) dateInp.value = new Date().toISOString().split("T")[0];
            
            const manualBox = document.getElementById("manual-serial-input-box");
            const selectInp = document.getElementById("jual-no-seri-select-input");
            const valInp = document.getElementById("jual-no-seri-value");
            
            if (manualBox) manualBox.style.display = "none";
            if (selectInp) {
                selectInp.style.display = "block";
                selectInp.value = "";
            }
            if (valInp) valInp.value = "";
            
            await populateSerialDropdown(db);
            openModal("modal-add-jual");
        });
    }

    const submitBtn = document.getElementById("btn-submit-jual");
    if (submitBtn) {
        submitBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const form = document.getElementById("form-add-jual");
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const date = document.getElementById("jual-tanggal").value;
            const gramasi = parseFloat(document.getElementById("jual-gramasi").value);
            
            let noSeri = "";
            const manualBox = document.getElementById("manual-serial-input-box");
            if (manualBox && manualBox.style.display !== "none") {
                noSeri = document.getElementById("jual-no-seri-manual").value.trim().toUpperCase();
            } else {
                const valEl = document.getElementById("jual-no-seri-value");
                noSeri = valEl ? valEl.value : "";
            }

            if (!noSeri) {
                alert("Harap pilih atau isi No Seri terlebih dahulu!");
                return;
            }

            const pembeli = document.getElementById("jual-pembeli").value.trim();
            const hargaJual = parseRibuan(hargaJualInput.value);
            const hargaRestok = parseRibuan(hargaRestokInput.value);
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
                        if (typeof onMutate === "function") {
                            await onMutate();
                        }
                        alert("Data penjualan berhasil ditambahkan!");
                    } else {
                        alert("Gagal menambahkan data: " + res.message);
                    }
                });
            });
        });
    }

    setupDropdownEventListeners(db);
}

export function setupDropdownEventListeners(db) {
    const selectInput = document.getElementById("jual-no-seri-select-input");
    const dropdownList = document.getElementById("jual-no-seri-dropdown-list");
    const searchInput = document.getElementById("jual-no-seri-search");
    const manualBox = document.getElementById("manual-serial-input-box");
    const cancelManualBtn = document.getElementById("btn-cancel-manual-serial");
    
    if (selectInput && dropdownList) {
        selectInput.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownList.classList.toggle("active");
            if (dropdownList.classList.contains("active") && searchInput) {
                searchInput.value = "";
                filterSerialDropdown("");
                searchInput.focus();
            }
        });
    }

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".custom-dropdown-container") && dropdownList) {
            dropdownList.classList.remove("active");
        }
    });

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            filterSerialDropdown(e.target.value);
        });
    }

    if (cancelManualBtn && manualBox && selectInput) {
        cancelManualBtn.addEventListener("click", () => {
            manualBox.style.display = "none";
            selectInput.style.display = "block";
            const valEl = document.getElementById("jual-no-seri-value");
            if (valEl) valEl.value = "";
            selectInput.value = "";
        });
    }

    const customTrigger = document.getElementById("dropdown-add-custom-trigger");
    if (customTrigger && dropdownList && selectInput && manualBox) {
        customTrigger.addEventListener("click", () => {
            dropdownList.classList.remove("active");
            selectInput.style.display = "none";
            manualBox.style.display = "flex";
            const manualInp = document.getElementById("jual-no-seri-manual");
            if (manualInp) {
                manualInp.value = "";
                manualInp.focus();
            }
        });
    }

    const manualSerialInp = document.getElementById("jual-no-seri-manual");
    if (manualSerialInp) {
        manualSerialInp.addEventListener("input", async (e) => {
            const val = e.target.value.trim().toUpperCase();
            if (val) {
                const available = await db.getStokAktif();
                const match = available.find(s => s.no_seri.trim().toUpperCase() === val);
                if (match) {
                    if (match.gramasi) document.getElementById("jual-gramasi").value = match.gramasi;
                    if (match.harga_modal) {
                        document.getElementById("jual-harga-restok").value = formatRibuanInput(match.harga_modal);
                        const jual = parseRibuan(document.getElementById("jual-harga-jual").value);
                        const modalVal = parseRibuan(match.harga_modal);
                        document.getElementById("jual-keuntungan").value = formatRupiah(jual - modalVal);
                    }
                }
            }
        });
    }
}

export async function populateSerialDropdown(db) {
    const listContainer = document.getElementById("jual-no-seri-options");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const availableItems = await db.getStokAktif();

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
        li.setAttribute("data-harga-beli", item.harga_modal || 0);
        li.setAttribute("data-gramasi", item.gramasi || 0);

        const details = [];
        if (item.gramasi) details.push(`${item.gramasi}g`);
        if (item.tahun && item.tahun !== "-") details.push(`Thn ${item.tahun}`);
        if (item.harga_modal > 0) details.push(`Modal: ${formatRupiah(item.harga_modal)}`);
        const detailStr = details.length > 0 ? ` (${details.join(" | ")})` : "";

        li.textContent = `${item.no_seri}${detailStr}`;
        
        li.addEventListener("click", () => {
            document.getElementById("jual-no-seri-select-input").value = item.no_seri;
            document.getElementById("jual-no-seri-value").value = item.no_seri;
            
            if (item.gramasi !== undefined && item.gramasi !== null && item.gramasi !== "") {
                document.getElementById("jual-gramasi").value = item.gramasi;
            }

            if (item.harga_modal !== undefined && item.harga_modal !== null) {
                document.getElementById("jual-harga-restok").value = formatRibuanInput(item.harga_modal);
            }
            
            const jual = parseRibuan(document.getElementById("jual-harga-jual").value);
            const restok = parseRibuan(item.harga_modal);
            document.getElementById("jual-keuntungan").value = formatRupiah(jual - restok);

            const dropdownList = document.getElementById("jual-no-seri-dropdown-list");
            if (dropdownList) dropdownList.classList.remove("active");
        });

        listContainer.appendChild(li);
    });
}

export function filterSerialDropdown(query) {
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

export async function renderPenjualanTable(db, onMutate) {
    const tbody = document.querySelector("#penjualan-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const list = await db.getPenjualan();
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary); padding: 2rem;">Tidak ada data penjualan.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${formatDateIndo(item.tanggal)}</td>
            <td class="text-right"><strong>${item.gramasi} g</strong></td>
            <td><span class="badge badge-serial">${item.no_seri}</span></td>
            <td>${item.nama_pembeli}</td>
            <td class="text-right font-semibold">${formatRupiah(item.harga_jual)}</td>
            <td class="text-right font-semibold">${formatRupiah(item.harga_restok)}</td>
            <td class="text-right font-semibold text-profit">${formatRupiah(item.keuntungan)}</td>
            <td class="action-btns text-center">
                <button class="btn btn-danger btn-sm delete-jual-btn" data-id="${item.id}" title="Hapus Data">
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
                        if (typeof onMutate === "function") {
                            await onMutate();
                        }
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
