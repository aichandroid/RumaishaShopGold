// Excel & PDF Export/Import Engine for Rumaisho Gold
import { formatDateIndo, formatRupiah, getExportFilename, ExcelDateToJSDate } from './utils.js';
import { showConfirmSubmitModal } from './ui.js';
import { requestPinAuthorization } from './auth.js';

export function setupExportEventListeners(db) {
    // 1. Dashboard Recap Excel
    const recapExcelBtn = document.getElementById("export-excel-recap-btn");
    if (recapExcelBtn) {
        recapExcelBtn.addEventListener("click", async () => {
            const purchases = await db.getPembelian();
            const sales = await db.getPenjualan();

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
                const dummyDate = new Date(year, parseInt(month, 10) - 1, 1);
                return {
                    "Bulan / Tahun": dummyDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
                    "Total Pembelian (IDR)": monthlyRecap[m].beli,
                    "Total Penjualan (IDR)": monthlyRecap[m].jual,
                    "Keuntungan (IDR)": monthlyRecap[m].untung
                };
            });

            exportToExcel(sheetData, "Rekap_Bulanan");
        });
    }

    // 2. Pembelian Excel & PDF
    const beliExcelBtn = document.getElementById("export-excel-beli");
    if (beliExcelBtn) {
        beliExcelBtn.addEventListener("click", async () => {
            const purchases = await db.getPembelian();
            const data = purchases.map(p => ({
                "Tanggal": p.tanggal,
                "No Seri": p.no_seri,
                "Tahun": (p.tahun !== undefined && p.tahun !== null && p.tahun !== "" && p.tahun !== "-") ? p.tahun : "-",
                "Gramasi (g)": p.gramasi !== undefined ? p.gramasi : 0,
                "Harga Beli (IDR)": p.harga_beli,
                "Nama Penjual": p.nama_penjual
            }));
            exportToExcel(data, "Pembelian_Emas");
        });
    }

    const beliPdfBtn = document.getElementById("export-pdf-beli");
    if (beliPdfBtn) {
        beliPdfBtn.addEventListener("click", async () => {
            const purchases = await db.getPembelian();
            const tableRows = purchases.map(p => [
                p.tanggal,
                p.no_seri,
                (p.tahun !== undefined && p.tahun !== null && p.tahun !== "" && p.tahun !== "-") ? p.tahun : "-",
                `${p.gramasi !== undefined ? p.gramasi : 0} g`,
                formatRupiah(p.harga_beli),
                p.nama_penjual
            ]);
            exportToPDF("Riwayat Pembelian Emas", ["Tanggal", "No Seri", "Tahun", "Gramasi", "Harga Beli", "Nama Penjual"], tableRows, "Pembelian_Emas");
        });
    }

    // 3. Stok Emas Excel & PDF
    const stokExcelBtn = document.getElementById("export-excel-stok");
    if (stokExcelBtn) {
        stokExcelBtn.addEventListener("click", async () => {
            const stocks = await db.getStokEmas();
            const data = stocks.map((s, idx) => ({
                "No": idx + 1,
                "Tanggal Masuk": s.tanggal_masuk,
                "No Seri": s.no_seri,
                "Tahun": s.tahun || "-",
                "Gramasi (g)": s.gramasi,
                "Modal/Beli (IDR)": s.harga_modal,
                "Sumber": s.sumber_label,
                "Status": s.status,
                "Keterangan": s.is_sold ? `Terjual ke ${s.sale_info?.nama_pembeli || 'Pembeli'}` : s.keterangan_asal
            }));
            exportToExcel(data, "Stok_Emas");
        });
    }

    const stokPdfBtn = document.getElementById("export-pdf-stok");
    if (stokPdfBtn) {
        stokPdfBtn.addEventListener("click", async () => {
            const stocks = await db.getStokEmas();
            const tableRows = stocks.map((s, idx) => [
                idx + 1,
                s.tanggal_masuk,
                s.no_seri,
                s.tahun || "-",
                `${s.gramasi} g`,
                s.harga_modal > 0 ? formatRupiah(s.harga_modal) : "-",
                s.sumber_label,
                s.status
            ]);
            exportToPDF("Laporan Stok Emas", ["No", "Tgl Masuk", "No Seri", "Tahun", "Gramasi", "Modal", "Sumber", "Status"], tableRows, "Stok_Emas");
        });
    }

    // 4. Penjualan Excel & PDF
    const jualExcelBtn = document.getElementById("export-excel-jual");
    if (jualExcelBtn) {
        jualExcelBtn.addEventListener("click", async () => {
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
    }

    const jualPdfBtn = document.getElementById("export-pdf-jual");
    if (jualPdfBtn) {
        jualPdfBtn.addEventListener("click", async () => {
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
}

export async function exportToExcel(jsonData, filePrefix) {
    if (!jsonData || jsonData.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }
    if (typeof ExcelJS === "undefined") {
        alert("Pustaka ExcelJS belum siap. Harap muat ulang halaman.");
        return;
    }
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Rumaisho Gold";
        workbook.created = new Date();
        const worksheet = workbook.addWorksheet("Data");

        const keys = Object.keys(jsonData[0]);
        worksheet.columns = keys.map(k => ({
            header: k,
            key: k,
            width: Math.max(k.length + 3, 18)
        }));

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };

        jsonData.forEach(item => {
            worksheet.addRow(item);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const fileName = getExportFilename(filePrefix, "xlsx");

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (err) {
        console.error("Export to Excel error:", err);
        alert("Gagal mengekspor file Excel: " + err.message);
    }
}

export function exportToPDF(title, headers, rows, filePrefix) {
    if (rows.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(170, 124, 17);
    doc.text("RUMAISHO GOLD SHOP", 14, 18);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont("Helvetica", "normal");
    doc.text(title, 14, 25);
    
    const exportDateStr = new Date().toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
    doc.setFontSize(9);
    doc.text(`Dicetak pada: ${exportDateStr}`, 14, 30);

    doc.autoTable({
        startY: 35,
        head: [headers],
        body: rows,
        headStyles: { fillColor: [30, 41, 59], textColor: [248, 250, 252] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { font: "Helvetica", fontSize: 9 },
        margin: { top: 35 }
    });

    const fileName = getExportFilename(filePrefix, "pdf");
    doc.save(fileName);
}

export function setupImportEventListeners(db, onMutate) {
    const beliTrigger = document.getElementById("btn-import-beli-trigger");
    if (beliTrigger) {
        beliTrigger.addEventListener("click", () => {
            const inp = document.getElementById("import-excel-beli");
            if (inp) inp.click();
        });
    }

    const jualTrigger = document.getElementById("btn-import-jual-trigger");
    if (jualTrigger) {
        jualTrigger.addEventListener("click", () => {
            const inp = document.getElementById("import-excel-jual");
            if (inp) inp.click();
        });
    }

    const beliInp = document.getElementById("import-excel-beli");
    if (beliInp) {
        beliInp.addEventListener("change", (e) => {
            handleImportExcel(e, "pembelian", db, onMutate);
        });
    }

    const jualInp = document.getElementById("import-excel-jual");
    if (jualInp) {
        jualInp.addEventListener("change", (e) => {
            handleImportExcel(e, "penjualan", db, onMutate);
        });
    }
}

export async function handleImportExcel(e, type, db, onMutate) {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof ExcelJS === "undefined") {
        alert("Pustaka ExcelJS belum siap. Harap muat ulang halaman.");
        e.target.value = "";
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            alert("File Excel kosong atau tidak valid!");
            e.target.value = "";
            return;
        }

        const jsonData = [];
        let headers = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                headers = Array.isArray(row.values) ? row.values.map(v => v ? String(v).trim() : "") : [];
            } else {
                const rowObj = {};
                let hasData = false;
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const header = headers[colNumber];
                    if (header) {
                        let cellVal = cell.value;
                        if (cellVal !== null && typeof cellVal === "object") {
                            if (cellVal instanceof Date) {
                                const y = cellVal.getFullYear();
                                const m = String(cellVal.getMonth() + 1).padStart(2, "0");
                                const d = String(cellVal.getDate()).padStart(2, "0");
                                cellVal = `${y}-${m}-${d}`;
                            } else if (cellVal.text !== undefined) {
                                cellVal = cellVal.text;
                            } else if (cellVal.result !== undefined) {
                                cellVal = cellVal.result;
                            }
                        }
                        if (cellVal !== undefined && cellVal !== null && cellVal !== "") {
                            hasData = true;
                        }
                        rowObj[header] = cellVal;
                    }
                });
                if (hasData) {
                    jsonData.push(rowObj);
                }
            }
        });

        if (jsonData.length === 0) {
            alert("File Excel kosong atau tidak valid!");
            e.target.value = "";
            return;
        }

        processImportData(jsonData, type, e.target, db, onMutate);
    } catch (err) {
        console.error("Excel import parse error:", err);
        alert("Gagal membaca file Excel. Harap pastikan format file benar.");
        e.target.value = "";
    }
}

export function processImportData(data, type, fileInput, db, onMutate) {
    let validRecords = [];
    let errorMsg = "";

    const cleanPrice = (val) => {
        if (val === undefined || val === null || val === "") return 0;
        if (typeof val === 'number') return val;
        let clean = String(val).replace(/Rp/gi, '').replace(/\s/g, '');
        clean = clean.replace(/[,.]00$/, '');
        clean = clean.replace(/[^0-9-]/g, '');
        return parseFloat(clean) || 0;
    };

    const cleanGram = (val) => {
        if (val === undefined || val === null || val === "") return 0;
        if (typeof val === 'number') return val;
        let clean = String(val).replace(/\s/g, '').replace(',', '.');
        clean = clean.replace(/[^0-9.]/g, '');
        return parseFloat(clean) || 0;
    };

    if (type === "pembelian") {
        data.forEach((row, i) => {
            const dateVal = row["Tanggal"];
            const serialVal = row["No Seri"] || row["No. Seri"];
            const tahunVal = row["Tahun"] || row["Year"];
            const gramVal = row["Gramasi (g)"] || row["Gramasi"] || row["Gram"];
            const hargaVal = row["Harga Beli (IDR)"] || row["Harga Beli"];
            const penjualVal = row["Nama Penjual"] || row["Penjual"];

            const dateStrRaw = dateVal ? String(dateVal).trim() : "";
            const serialStrRaw = serialVal ? String(serialVal).trim() : "";
            const gramasi = cleanGram(gramVal) || 1;
            const hargaBeli = cleanPrice(hargaVal);

            if (!dateStrRaw || !serialStrRaw || hargaBeli === 0) {
                return;
            }

            if (!penjualVal) {
                errorMsg += `Baris ${i + 2}: Kolom wajib tidak lengkap (Nama Penjual kosong).\n`;
                return;
            }

            let dateStr = dateStrRaw;
            if (dateVal instanceof Date) {
                const y = dateVal.getFullYear();
                const m = String(dateVal.getMonth() + 1).padStart(2, "0");
                const d = String(dateVal.getDate()).padStart(2, "0");
                dateStr = `${y}-${m}-${d}`;
            } else if (!isNaN(dateVal) && Number(dateVal) > 40000) {
                dateStr = ExcelDateToJSDate(Number(dateVal));
            }

            const parsedYear = (tahunVal !== undefined && tahunVal !== null && String(tahunVal).trim() !== "" && !isNaN(parseInt(tahunVal, 10))) ? parseInt(tahunVal, 10) : null;

            validRecords.push({
                tanggal: dateStr,
                no_seri: serialStrRaw.toUpperCase(),
                tahun: parsedYear,
                gramasi: gramasi,
                harga_beli: hargaBeli,
                nama_penjual: String(penjualVal).trim()
            });
        });

    } else if (type === "penjualan") {
        data.forEach((row, i) => {
            const dateVal = row["Tanggal"];
            const gramVal = row["Gramasi (g)"] || row["Gramasi"];
            const serialVal = row["No Seri"] || row["No. Seri"];
            const pembeliVal = row["Nama Pembeli"] || row["Pembeli"];
            const jualVal = row["Harga Jual (IDR)"] || row["Harga Jual"];
            const restokVal = row["Harga Restok (IDR)"] || row["Harga Restok"];
            const untungVal = row["Keuntungan (IDR)"] || row["Keuntungan"];

            const dateStrRaw = dateVal ? String(dateVal).trim() : "";
            const serialStrRaw = serialVal ? String(serialVal).trim() : "";
            const cleanGramVal = cleanGram(gramVal);

            const hargaJual = cleanPrice(jualVal);
            const hargaRestok = cleanPrice(restokVal);
            const keuntungan = untungVal !== undefined ? cleanPrice(untungVal) : (hargaJual - hargaRestok);

            if (!dateStrRaw || !serialStrRaw || cleanGramVal === 0 || (hargaJual === 0 && hargaRestok === 0 && keuntungan === 0)) {
                return;
            }

            if (!pembeliVal || jualVal === undefined || restokVal === undefined) {
                errorMsg += `Baris ${i + 2}: Kolom wajib tidak lengkap (Nama Pembeli, Harga Jual, atau Harga Restok kosong).\n`;
                return;
            }

            let dateStr = dateStrRaw;
            if (dateVal instanceof Date) {
                const y = dateVal.getFullYear();
                const m = String(dateVal.getMonth() + 1).padStart(2, "0");
                const d = String(dateVal.getDate()).padStart(2, "0");
                dateStr = `${y}-${m}-${d}`;
            } else if (!isNaN(dateVal) && Number(dateVal) > 40000) {
                dateStr = ExcelDateToJSDate(Number(dateVal));
            }

            validRecords.push({
                tanggal: dateStr,
                gramasi: cleanGramVal,
                no_seri: serialStrRaw.toUpperCase(),
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
                const existingSignatures = new Set(currentPurchases.map(p => `${(p.no_seri || "").trim().toUpperCase()}_${p.tanggal}_${p.harga_beli}`));

                for (const item of validRecords) {
                    const sig = `${(item.no_seri || "").trim().toUpperCase()}_${item.tanggal}_${item.harga_beli}`;
                    if (existingSignatures.has(sig)) {
                        skipCount++;
                        continue;
                    }
                    const res = await db.addPembelian(item, true);
                    if (res.success) {
                        successCount++;
                        existingSignatures.add(sig);
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

            let report = `Impor selesai!\n- Berhasil: ${successCount} data\n- Dilewati (Duplikat Identik): ${skipCount} data`;
            if (errors.length > 0) {
                report += `\n- Gagal: ${errors.length} data (Detail di konsol)`;
                console.error("Import errors detail:", errors);
            }
            alert(report);

            if (typeof onMutate === "function") {
                await onMutate();
            }
        });
    });
}
