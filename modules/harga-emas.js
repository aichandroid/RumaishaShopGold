// Papan Harga Emas Harian & Snapshot WhatsApp for Rumaisho Gold
import { formatDateIndo, formatFullDateIndo, formatRupiah, formatRibuanInput, parseRibuan, setupRibuanInput, hexToRgb, GREEN_THEMES, getExportFilename } from './utils.js';
import { openModal, closeModal, showConfirmSubmitModal } from './ui.js';

export function setupHargaEmasEventListeners(db, onMutate) {
    const openAddBtn = document.getElementById("open-add-harga-modal");
    if (openAddBtn) {
        openAddBtn.addEventListener("click", () => {
            const form = document.getElementById("form-add-harga");
            if (form) form.reset();
            const dateInp = document.getElementById("harga-tanggal");
            if (dateInp) dateInp.value = new Date().toISOString().split("T")[0];
            const customBox = document.getElementById("harga-jenis-custom-box");
            if (customBox) customBox.style.display = "none";
            const customInp = document.getElementById("harga-jenis-custom");
            if (customInp) customInp.removeAttribute("required");
            openModal("modal-add-harga");
        });
    }

    const jenisSelect = document.getElementById("harga-jenis");
    if (jenisSelect) {
        jenisSelect.addEventListener("change", (e) => {
            const customBox = document.getElementById("harga-jenis-custom-box");
            const customInput = document.getElementById("harga-jenis-custom");
            if (e.target.value === "Lainnya") {
                if (customBox) customBox.style.display = "block";
                if (customInput) {
                    customInput.setAttribute("required", "required");
                    customInput.focus();
                }
            } else {
                if (customBox) customBox.style.display = "none";
                if (customInput) customInput.removeAttribute("required");
            }
        });
    }

    const submitBtn = document.getElementById("btn-submit-harga");
    if (submitBtn) {
        submitBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const form = document.getElementById("form-add-harga");
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const date = document.getElementById("harga-tanggal").value;
            const gram = parseFloat(document.getElementById("harga-gram").value);
            const harga = parseRibuan(document.getElementById("harga-nilai").value);
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
                    await renderHargaEmasTable(db);
                    if (typeof onMutate === "function") {
                        await onMutate();
                    }
                    alert("Data harga emas berhasil ditambahkan!");
                } else {
                    alert("Gagal menambahkan data: " + res.message);
                }
            });
        });
    }

    const filterHargaTanggal = document.getElementById("filter-harga-tanggal");
    if (filterHargaTanggal) {
        filterHargaTanggal.addEventListener("change", async () => {
            await renderHargaEmasTable(db);
        });
    }

    const btnSnapshotWa = document.getElementById("btn-snapshot-wa");
    if (btnSnapshotWa) {
        btnSnapshotWa.addEventListener("click", takeGoldPricesSnapshot);
    }

    setupPriceTemplateEventListener(db);
}

export async function renderHargaEmasTable(db) {
    const tbody = document.querySelector("#harga-emas-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const filterDate = document.getElementById("filter-harga-tanggal")?.value;
    const list = await db.getHargaEmas(filterDate || null);

    const activeColor = await db.getHargaEmasThemeColor();
    applyGoldPriceTheme(activeColor);

    const badge = document.getElementById("gold-prices-date-badge");
    if (badge) {
        const todayStr = new Date().toISOString().split("T")[0];
        badge.textContent = `Update Harga Emas: ${formatFullDateIndo(filterDate || todayStr)}`;
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding: 2rem;">Tidak ada data harga emas untuk tanggal ini.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="col-gram"><strong>${item.gram} gram</strong></td>
            <td class="col-harga text-right">
                <span class="price-display">${formatRupiah(item.harga)}</span>
                <input type="text" inputmode="numeric" class="price-edit-input form-input currency-input" value="${formatRibuanInput(item.harga)}" placeholder="0" style="display:none;" autocomplete="off">
            </td>
            <td class="col-logam text-center"><span class="badge badge-gold-item">${item.jenis_logam}</span></td>
            <td class="col-aksi text-center" data-html2canvas-ignore="true">
                <div class="table-actions-group">
                    <button type="button" class="btn btn-primary btn-icon-action edit-harga-btn" title="Edit" aria-label="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" class="btn btn-danger btn-icon-action delete-harga-btn" title="Hapus" aria-label="Hapus">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    <button type="button" class="btn btn-success btn-icon-action save-harga-btn d-none" style="display:none; background: var(--success-gradient); color: white;" title="Simpan" aria-label="Simpan">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button type="button" class="btn btn-secondary btn-icon-action cancel-harga-btn d-none" style="display:none;" title="Batal" aria-label="Batal">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </td>
        `;

        const priceDisplay = tr.querySelector(".price-display");
        const priceInput = tr.querySelector(".price-edit-input");
        const editBtn = tr.querySelector(".edit-harga-btn");
        const deleteBtn = tr.querySelector(".delete-harga-btn");
        const saveBtn = tr.querySelector(".save-harga-btn");
        const cancelBtn = tr.querySelector(".cancel-harga-btn");

        setupRibuanInput(priceInput);

        editBtn.addEventListener("click", () => {
            priceDisplay.style.display = "none";
            priceInput.value = formatRibuanInput(item.harga);
            priceInput.style.display = "inline-block";
            editBtn.classList.add("d-none");
            deleteBtn.classList.add("d-none");
            editBtn.style.display = "none";
            deleteBtn.style.display = "none";
            saveBtn.classList.remove("d-none");
            cancelBtn.classList.remove("d-none");
            saveBtn.style.display = "inline-flex";
            cancelBtn.style.display = "inline-flex";
            priceInput.focus();
            priceInput.select();
        });

        priceInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                saveBtn.click();
            } else if (e.key === "Escape") {
                e.preventDefault();
                cancelBtn.click();
            }
        });

        cancelBtn.addEventListener("click", () => {
            priceInput.value = formatRibuanInput(item.harga);
            priceDisplay.style.display = "inline";
            priceInput.style.display = "none";
            editBtn.classList.remove("d-none");
            deleteBtn.classList.remove("d-none");
            editBtn.style.display = "inline-flex";
            deleteBtn.style.display = "inline-flex";
            saveBtn.classList.add("d-none");
            cancelBtn.classList.add("d-none");
            saveBtn.style.display = "none";
            cancelBtn.style.display = "none";
        });

        saveBtn.addEventListener("click", async () => {
            const newPrice = parseRibuan(priceInput.value);
            if (isNaN(newPrice) || newPrice <= 0) {
                alert("Harga tidak valid! Masukkan nominal harga yang benar.");
                priceInput.focus();
                return;
            }

            const res = await db.updateHargaEmas(item.id, newPrice);
            if (res.success) {
                await renderHargaEmasTable(db);
                alert("Harga emas berhasil diubah!");
            } else {
                alert("Gagal mengubah harga: " + res.message);
            }
        });

        deleteBtn.addEventListener("click", async () => {
            if (confirm(`Apakah Anda yakin ingin menghapus data harga emas ${item.gram}g ${item.jenis_logam}?`)) {
                const res = await db.deleteHargaEmas(item.id);
                if (res.success) {
                    await renderHargaEmasTable(db);
                    alert("Data harga emas berhasil dihapus!");
                } else {
                    alert("Gagal menghapus: " + res.message);
                }
            }
        });

        tbody.appendChild(tr);
    });
}

export function setupPriceTemplateEventListener(db) {
    const btn = document.getElementById("btn-copy-template-harga");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const activeDate = document.getElementById("filter-harga-tanggal")?.value || new Date().toISOString().split("T")[0];
        
        const allPrices = await db.getHargaEmas(null);
        if (allPrices.length === 0) {
            alert("Tidak ada data harga emas sebelumnya untuk dijadikan template!");
            return;
        }

        const dates = [...new Set(allPrices.map(p => p.tanggal))].sort((a,b) => b.localeCompare(a));
        const templateDate = dates.find(d => d !== activeDate) || dates[0];
        
        if (!templateDate) {
            alert("Tidak ditemukan tanggal alternatif untuk dijadikan template!");
            return;
        }

        const templateRecords = allPrices.filter(p => p.tanggal === templateDate);
        if (templateRecords.length === 0) {
            alert("Tidak ada data pada tanggal template!");
            return;
        }

        const activeDateFormatted = formatDateIndo(activeDate);
        const templateDateFormatted = formatDateIndo(templateDate);
        
        const activeDateRecords = allPrices.filter(p => p.tanggal === activeDate);
        let confirmMsg = `Salin semua harga emas (${templateRecords.length} item) dari tanggal ${templateDateFormatted} ke tanggal ${activeDateFormatted}?`;
        if (activeDateRecords.length > 0) {
            confirmMsg = `Tanggal ${activeDateFormatted} sudah memiliki ${activeDateRecords.length} data harga emas. \n\nMenyalin template akan MENGHAPUS data yang ada pada tanggal tersebut dan menggantinya dengan data dari tanggal ${templateDateFormatted}.\n\nLanjutkan?`;
        }

        if (!confirm(confirmMsg)) return;

        if (activeDateRecords.length > 0) {
            for (const r of activeDateRecords) {
                await db.deleteHargaEmas(r.id);
            }
        }

        let successCount = 0;
        for (const r of templateRecords) {
            const res = await db.addHargaEmas({
                tanggal: activeDate,
                gram: r.gram,
                harga: r.harga,
                jenis_logam: r.jenis_logam
            });
            if (res.success) successCount++;
        }

        await renderHargaEmasTable(db);
        alert(`Berhasil menyalin ${successCount} template harga emas ke tanggal ${activeDateFormatted}!`);
    });
}

export function applyGoldPriceTheme(hex) {
    const pageEl = document.getElementById("page-harga-emas");
    if (!pageEl) return;

    pageEl.style.setProperty("--harga-emas-theme", hex);
    
    const rgb = hexToRgb(hex);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    const isLight = brightness >= 140;

    if (isLight) {
        pageEl.style.setProperty("--harga-emas-bg", hex);
        pageEl.style.setProperty("--harga-emas-text", "#0c1d1a");
        pageEl.style.setProperty("--harga-emas-border", "rgba(12, 29, 26, 0.15)");
        pageEl.style.setProperty("--harga-emas-accent", "#755600");
        pageEl.style.setProperty("--harga-emas-badge-bg", "rgba(0, 0, 0, 0.05)");
        pageEl.style.setProperty("--harga-emas-header-bg", "rgba(12, 29, 26, 0.85)");
        pageEl.style.setProperty("--harga-emas-header-text", "#ffffff");
        pageEl.style.setProperty("--harga-emas-td-bg", "rgba(255, 255, 255, 0.25)");
        pageEl.style.setProperty("--harga-emas-shadow", "none");
        pageEl.style.setProperty("--harga-emas-watermark", "rgba(12, 29, 26, 0.35)");
    } else {
        pageEl.style.setProperty("--harga-emas-bg", hex);
        pageEl.style.setProperty("--harga-emas-text", "#f0fbf9");
        pageEl.style.setProperty("--harga-emas-border", "rgba(240, 251, 249, 0.15)");
        pageEl.style.setProperty("--harga-emas-accent", "#d4af37");
        pageEl.style.setProperty("--harga-emas-badge-bg", "rgba(255, 255, 255, 0.05)");
        pageEl.style.setProperty("--harga-emas-header-bg", "rgba(0, 0, 0, 0.45)");
        pageEl.style.setProperty("--harga-emas-header-text", "#d4af37");
        pageEl.style.setProperty("--harga-emas-td-bg", "rgba(0, 0, 0, 0.15)");
        pageEl.style.setProperty("--harga-emas-shadow", "0 0 10px rgba(212, 175, 55, 0.3)");
        pageEl.style.setProperty("--harga-emas-watermark", "rgba(212, 175, 55, 0.3)");
    }
}

export async function setupThemeColorPicker(db) {
    const grid = document.getElementById("theme-color-picker-grid");
    if (!grid) return;

    grid.innerHTML = "";
    const activeColor = await db.getHargaEmasThemeColor();

    GREEN_THEMES.forEach(t => {
        const item = document.createElement("div");
        item.className = "color-picker-item" + (t.hex.toLowerCase() === activeColor.toLowerCase() ? " active" : "");
        item.innerHTML = `
            <div class="color-picker-circle" style="background-color: ${t.hex};"></div>
            <div class="color-picker-text">
                ${t.name}
                <small>${t.label}</small>
            </div>
        `;

        item.addEventListener("click", async () => {
            document.querySelectorAll(".color-picker-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
            
            await db.updateHargaEmasThemeColor(t.hex);
            applyGoldPriceTheme(t.hex);
        });

        grid.appendChild(item);
    });
}

export async function takeGoldPricesSnapshot() {
    const area = document.getElementById("gold-prices-snapshot-area");
    if (!area) return;
    
    document.body.classList.add("html2canvas-container");
    await new Promise(r => setTimeout(r, 120));

    try {
        const canvas = await html2canvas(area, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#062621",
            scale: 2,
            logging: false
        });

        document.body.classList.remove("html2canvas-container");
        const dataUrl = canvas.toDataURL("image/png");
        
        const filterInput = document.getElementById("filter-harga-tanggal");
        const activeDate = (filterInput && filterInput.value) ? filterInput.value : new Date().toISOString().split("T")[0];
        const formattedDate = formatDateIndo(activeDate);
        const shareText = `Update Harga Emas tanggal ${formattedDate}`;

        if (navigator.canShare && navigator.share) {
            canvas.toBlob((blob) => {
                if (!blob) {
                    triggerDownload(dataUrl, activeDate);
                    return;
                }
                const file = new File([blob], getExportFilename("harga_emas_" + activeDate, "png"), { type: "image/png" });
                navigator.share({
                    files: [file],
                    title: "Papan Harga Emas Rumaisho Gold",
                    text: shareText
                }).catch(() => {
                    triggerDownload(dataUrl, activeDate);
                });
            }, "image/png");
        } else {
            triggerDownload(dataUrl, activeDate);
        }
    } catch (err) {
        document.body.classList.remove("html2canvas-container");
        console.error("Snapshot error:", err);
        alert("Gagal mengambil snapshot. Harap coba lagi.");
    }
}

export function triggerDownload(dataUrl, activeDate = null) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = getExportFilename(activeDate ? `harga_emas_${activeDate}` : "harga_emas_snapshot", "png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
