// Dashboard, Metrics, and Chart.js Analytics for Rumaisho Gold
import { formatDateIndo, formatRupiah } from './utils.js';

let currentRecapMode = "month"; // "month", "year", "item"
let recapChartInstance = null;

export async function loadDashboardData(db) {
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

    const activeItems = await db.getStokAktif();
    const activeStock = activeItems.length;

    // Render Metrics
    const beliEl = document.getElementById("dashboard-total-beli");
    const jualEl = document.getElementById("dashboard-total-jual");
    const untungEl = document.getElementById("dashboard-total-untung");
    const stockEl = document.getElementById("dashboard-active-stock");

    if (beliEl) beliEl.textContent = formatRupiah(totalBeli);
    if (jualEl) jualEl.textContent = formatRupiah(totalJual);
    if (untungEl) untungEl.textContent = formatRupiah(totalUntung);
    if (stockEl) stockEl.textContent = `${activeStock} Item`;

    // 2. Render Recap Table & Chart
    await renderRecapTable(purchases, sales);

    // 3. Render Recent Sales Table
    renderRecentSalesDashboard(sales);
}

export function renderRecentSalesDashboard(sales) {
    const tbody = document.querySelector("#dashboard-recent-sales-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const sortedSales = [...sales].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).slice(0, 5);

    if (sortedSales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding: 1.5rem;">Belum ada transaksi penjualan tercatat.</td></tr>`;
        return;
    }

    sortedSales.forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${formatDateIndo(s.tanggal)}</strong></td>
            <td><span class="badge badge-serial">${s.no_seri || "-"}</span></td>
            <td><strong>${s.gramasi} g</strong></td>
            <td>${s.nama_pembeli || "-"}</td>
            <td class="text-right font-semibold">${formatRupiah(s.harga_jual)}</td>
            <td class="text-right font-semibold text-profit">${formatRupiah(s.keuntungan)}</td>
        `;
        tbody.appendChild(tr);
    });
}

export function setupRecapTabEventListeners(db) {
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

export async function renderRecapTable(purchases, sales) {
    const thead = document.querySelector("#recap-table thead");
    const tbody = document.querySelector("#recap-table tbody");
    if (!thead || !tbody) return;
    
    thead.innerHTML = "";
    tbody.innerHTML = "";

    let chartLabels = [];
    let chartSalesData = [];
    let chartProfitData = [];

    if (currentRecapMode === "month") {
        thead.innerHTML = `
            <tr>
                <th>Bulan / Tahun</th>
                <th class="text-right">Total Pembelian</th>
                <th class="text-right">Total Penjualan</th>
                <th class="text-right">Keuntungan</th>
            </tr>
        `;

        const monthlyRecap = {};
        purchases.forEach(p => {
            const monthKey = p.tanggal.substring(0, 7);
            if (!monthlyRecap[monthKey]) monthlyRecap[monthKey] = { beli: 0, jual: 0, untung: 0 };
            monthlyRecap[monthKey].beli += parseFloat(p.harga_beli) || 0;
        });

        sales.forEach(s => {
            const monthKey = s.tanggal.substring(0, 7);
            if (!monthlyRecap[monthKey]) monthlyRecap[monthKey] = { beli: 0, jual: 0, untung: 0 };
            monthlyRecap[monthKey].jual += parseFloat(s.harga_jual) || 0;
            monthlyRecap[monthKey].untung += parseFloat(s.keuntungan) || 0;
        });

        const sortedMonths = Object.keys(monthlyRecap).sort().reverse();
        
        if (sortedMonths.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding: 1.5rem;">Tidak ada transaksi.</td></tr>`;
        } else {
            sortedMonths.forEach(mKey => {
                const data = monthlyRecap[mKey];
                const tr = document.createElement("tr");
                
                const [year, month] = mKey.split("-");
                const dummyDate = new Date(year, parseInt(month, 10) - 1, 1);
                const monthLabel = dummyDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

                tr.innerHTML = `
                    <td><strong>${monthLabel}</strong></td>
                    <td class="text-right font-semibold">${formatRupiah(data.beli)}</td>
                    <td class="text-right font-semibold">${formatRupiah(data.jual)}</td>
                    <td class="text-right font-semibold text-profit">${formatRupiah(data.untung)}</td>
                `;
                tbody.appendChild(tr);
            });

            const chronologicalMonths = [...sortedMonths].reverse();
            chartLabels = chronologicalMonths.map(m => {
                const [year, month] = m.split("-");
                const dummyDate = new Date(year, parseInt(month, 10) - 1, 1);
                return dummyDate.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
            });
            chartSalesData = chronologicalMonths.map(m => monthlyRecap[m].jual);
            chartProfitData = chronologicalMonths.map(m => monthlyRecap[m].untung);
        }

    } else if (currentRecapMode === "year") {
        thead.innerHTML = `
            <tr>
                <th>Tahun</th>
                <th class="text-right">Total Pembelian</th>
                <th class="text-right">Total Penjualan</th>
                <th class="text-right">Keuntungan</th>
            </tr>
        `;

        const yearlyRecap = {};
        purchases.forEach(p => {
            const yearKey = p.tanggal.substring(0, 4);
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
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding: 1.5rem;">Tidak ada transaksi.</td></tr>`;
        } else {
            sortedYears.forEach(yKey => {
                const data = yearlyRecap[yKey];
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>Tahun ${yKey}</strong></td>
                    <td class="text-right font-semibold">${formatRupiah(data.beli)}</td>
                    <td class="text-right font-semibold">${formatRupiah(data.jual)}</td>
                    <td class="text-right font-semibold text-profit">${formatRupiah(data.untung)}</td>
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
                <th class="text-right">Item Dibeli</th>
                <th class="text-right">Item Terjual</th>
                <th class="text-right">Stok Aktif</th>
                <th class="text-right">Total Keuntungan</th>
            </tr>
        `;

        const itemRecap = {
            "Antam": { beli: 0, jual: 0, untung: 0 },
            "UBS": { beli: 0, jual: 0, untung: 0 },
            "Galeri24": { beli: 0, jual: 0, untung: 0 },
            "Perak Nadir": { beli: 0, jual: 0, untung: 0 },
            "Lain-lain": { beli: 0, jual: 0, untung: 0 }
        };

        function parseMetalType(noSeri) {
            const serial = (noSeri || "").toUpperCase();
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

        Object.keys(itemRecap).forEach(type => {
            const data = itemRecap[type];
            const activeStock = Math.max(0, data.beli - data.jual);
            
            if (data.beli === 0 && data.jual === 0) return;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${type}</strong></td>
                <td class="text-right">${data.beli} pcs</td>
                <td class="text-right">${data.jual} pcs</td>
                <td class="text-right font-semibold" style="color:var(--brand-gold);">${activeStock} pcs</td>
                <td class="text-right font-semibold text-profit">${formatRupiah(data.untung)}</td>
            `;
            tbody.appendChild(tr);

            chartLabels.push(type);
            chartSalesData.push(data.jual);
            chartProfitData.push(data.untung);
        });

        if (tbody.children.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary); padding: 1.5rem;">Tidak ada transaksi per item.</td></tr>`;
        }
    }

    renderRecapChart(chartLabels, chartSalesData, chartProfitData);
}

export function renderRecapChart(labels, sales, profit) {
    const canvas = document.getElementById("recap-chart");
    if (!canvas || typeof Chart === "undefined") return;
    const ctx = canvas.getContext("2d");

    if (recapChartInstance) {
        recapChartInstance.destroy();
    }

    recapChartInstance = new Chart(ctx, {
        type: currentRecapMode === "item" ? "bar" : "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Penjualan (Rp)",
                    data: sales,
                    borderColor: "#C6A15B",
                    backgroundColor: "rgba(198, 161, 91, 0.15)",
                    borderWidth: 2.5,
                    pointBackgroundColor: "#C6A15B",
                    pointBorderColor: "#FFFFFF",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderRadius: 6,
                    tension: 0.35,
                    fill: currentRecapMode !== "item"
                },
                {
                    label: "Keuntungan (Rp)",
                    data: profit,
                    borderColor: "#0D7A5F",
                    backgroundColor: "rgba(13, 122, 95, 0.15)",
                    borderWidth: 2.5,
                    pointBackgroundColor: "#0D7A5F",
                    pointBorderColor: "#FFFFFF",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderRadius: 6,
                    tension: 0.35,
                    fill: currentRecapMode !== "item"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: "#1A2421",
                        font: { family: "Outfit", size: 12, weight: "600" },
                        usePointStyle: true,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: "#123C35",
                    titleColor: "#F4EBD9",
                    bodyColor: "#FFFFFF",
                    titleFont: { family: "Outfit", size: 13, weight: "700" },
                    bodyFont: { family: "Inter", size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || "";
                            if (label) label += ": ";
                            if (context.parsed.y !== null) {
                                label += formatRupiah(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(18, 60, 53, 0.05)" },
                    ticks: {
                        color: "#52605A",
                        font: { family: "Outfit", size: 11, weight: "500" }
                    }
                },
                y: {
                    grid: { color: "rgba(18, 60, 53, 0.05)" },
                    ticks: {
                        color: "#52605A",
                        font: { family: "Outfit", size: 11, weight: "500" },
                        callback: function(value) {
                            if (value >= 1e9) return (value / 1e9).toFixed(1) + " M";
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
