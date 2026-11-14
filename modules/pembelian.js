// Pembelian Module for Rumaisho Gold
import { formatDateIndo, formatRupiah, parseRibuan, setupRibuanInput } from './utils.js';
import { openModal, closeModal, showConfirmSubmitModal } from './ui.js';
import { requestPinAuthorization } from './auth.js';

export function setupPembelianForm(db, onMutate) {
    const inputHarga = document.getElementById("beli-harga");
    if (inputHarga) setupRibuanInput(inputHarga);

    const openBtn = document.getElementById("open-add-beli-modal");
    if (openBtn) {
        openBtn.addEventListener("click", () => {
            const form = document.getElementById("form-add-beli");
            if (form) form.reset();
            const dateInp = document.getElementById("beli-tanggal");
            if (dateInp) dateInp.value = new Date().toISOString().split("T")[0];
            const tahunInp = document.getElementById("beli-tahun");
            if (tahunInp) tahunInp.value = "";
            openModal("modal-add-beli");
        });
    }

    const submitBtn = document.getElementById("btn-submit-beli");
    if (submitBtn) {
        submitBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const form = document.getElementById("form-add-beli");
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const date = document.getElementById("beli-tanggal").value;
            const noSeri = document.getElementById("beli-no-seri").value.trim().toUpperCase();
            const tahunVal = document.getElementById("beli-tahun").value.trim();
            const tahun = tahunVal ? parseInt(tahunVal, 10) : null;
            const gramasi = parseFloat(document.getElementById("beli-gramasi").value) || 0;
            const harga = parseRibuan(document.getElementById("beli-harga").value);
            const penjual = document.getElementById("beli-penjual").value.trim();

            const allStock = await db.getStokEmas();
            const activeUnsold = allStock.find(s => (s.no_seri || "").trim().toUpperCase() === noSeri && !s.is_sold);
            const previouslySold = allStock.filter(s => (s.no_seri || "").trim().toUpperCase() === noSeri && s.is_sold);

            let noteHtml = "";
            if (activeUnsold) {
                noteHtml = `<div style="margin-top:0.75rem; padding:0.5rem 0.75rem; background-color:rgba(239, 68, 68, 0.15); border:1px solid var(--danger); border-radius:6px; color:#fca5a5; font-size:0.85rem;">
                    ⚠️ <strong>Peringatan:</strong> No Seri ini saat ini masih tercatat aktif di stok (status Tersedia). Apakah Anda yakin ingin tetap menambahkannya sebagai unit baru?
                </div>`;
            } else if (previouslySold.length > 0) {
                noteHtml = `<div style="margin-top:0.75rem; padding:0.5rem 0.75rem; background-color:rgba(16, 185, 129, 0.15); border:1px solid var(--success); border-radius:6px; color:#6ee7b7; font-size:0.85rem;">
                    ℹ️ <strong>Beli Kembali (Buyback):</strong> Emas dengan No Seri ini sebelumnya sudah pernah terjual (${previouslySold.length}x). Data pembelian baru ini akan dicatat sebagai unit stok aktif baru tanpa menimpa riwayat lama.
                </div>`;
            }

            const summary = `
                <strong>Modul:</strong> Pembelian Emas<br>
                <strong>Tanggal:</strong> ${formatDateIndo(date)}<br>
                <strong>No Seri:</strong> ${noSeri}<br>
                <strong>Tahun:</strong> ${tahun ? tahun : '-'}<br>
                <strong>Gramasi:</strong> ${gramasi} gram<br>
                <strong>Harga Beli:</strong> ${formatRupiah(harga)}<br>
                <strong>Nama Penjual:</strong> ${penjual}
                ${noteHtml}
            `;

            showConfirmSubmitModal(summary, () => {
                requestPinAuthorization(async () => {
                    const res = await db.addPembelian({
                        tanggal: date,
                        no_seri: noSeri,
                        tahun: tahun,
                        gramasi: gramasi,
                        harga_beli: harga,
                        nama_penjual: penjual
                    }, !!activeUnsold);

                    if (res.success) {
                        closeModal("modal-add-beli");
                        if (typeof onMutate === "function") {
                            await onMutate();
                        }
                        alert("Data pembelian berhasil ditambahkan!");
                    } else {
                        alert("Gagal menambahkan data: " + res.message);
                    }
                });
            });
        });
    }
}

export async function renderPembelianTable(db, onMutate) {
    const tbody = document.querySelector("#pembelian-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const list = await db.getPembelian();
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary); padding: 2rem;">Tidak ada data pembelian.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement("tr");
        const itemYear = (item.tahun !== undefined && item.tahun !== null && item.tahun !== "" && item.tahun !== "-") ? item.tahun : "-";
        tr.innerHTML = `
            <td>${formatDateIndo(item.tanggal)}</td>
            <td><span class="badge badge-serial">${item.no_seri}</span></td>
            <td>${itemYear}</td>
            <td class="text-right"><strong>${item.gramasi !== undefined && item.gramasi !== null ? item.gramasi : '-'} g</strong></td>
            <td class="text-right font-semibold">${formatRupiah(item.harga_beli)}</td>
            <td>${item.nama_penjual}</td>
            <td class="action-btns text-center">
                <button class="btn btn-danger btn-sm delete-beli-btn" data-id="${item.id}" data-seri="${item.no_seri}" title="Hapus Data">
                    <i class="fa-solid fa-trash-can"></i> Hapus
                </button>
            </td>
        `;

        tr.querySelector(".delete-beli-btn").addEventListener("click", () => {
            const id = item.id;
            const seri = item.no_seri;
            
            requestPinAuthorization(async () => {
                if (confirm(`Apakah Anda yakin ingin menghapus data Pembelian No Seri: ${seri}?`)) {
                    const res = await db.deletePembelian(id, seri);
                    if (res.success) {
                        if (typeof onMutate === "function") {
                            await onMutate();
                        }
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
