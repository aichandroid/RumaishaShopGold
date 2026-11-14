// Utility & Formatting Helpers for Rumaisho Gold

export function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

export function formatRibuanInput(value) {
    if (value === null || value === undefined || value === "") return "";
    const clean = String(value).replace(/[^0-9]/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(clean, 10));
}

export function parseRibuan(value) {
    if (typeof value === "number") return isNaN(value) ? 0 : value;
    if (!value) return 0;
    const clean = String(value).replace(/[^0-9]/g, "");
    return clean ? parseInt(clean, 10) : 0;
}

export function setupRibuanInput(inputEl, onChangeCallback = null) {
    if (!inputEl) return;

    inputEl.addEventListener("input", () => {
        const raw = inputEl.value;
        const cursor = inputEl.selectionStart;
        const lenBefore = raw.length;

        const formatted = formatRibuanInput(raw);
        inputEl.value = formatted;

        if (cursor !== null) {
            const diff = formatted.length - lenBefore;
            const newCursor = Math.max(0, cursor + diff);
            inputEl.setSelectionRange(newCursor, newCursor);
        }

        if (typeof onChangeCallback === "function") {
            onChangeCallback(parseRibuan(formatted));
        }
    });

    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Backspace") {
            const start = inputEl.selectionStart;
            const end = inputEl.selectionEnd;
            if (start === end && start > 0) {
                const charBefore = inputEl.value[start - 1];
                if (charBefore === ".") {
                    e.preventDefault();
                    const val = inputEl.value;
                    const newVal = val.slice(0, start - 2) + val.slice(start);
                    inputEl.value = formatRibuanInput(newVal);
                    const newPos = Math.max(0, start - 2);
                    inputEl.setSelectionRange(newPos, newPos);
                    if (typeof onChangeCallback === "function") {
                        onChangeCallback(parseRibuan(inputEl.value));
                    }
                }
            }
        }
    });
}

export function formatDateIndo(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

export function getDayNameIndo(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        return days[date.getDay()];
    }
    const date = new Date(dateStr);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[date.getDay()];
}

export function formatFullDateIndo(dateStr) {
    if (!dateStr) return "";
    const dayName = getDayNameIndo(dateStr);
    const dateFormatted = formatDateIndo(dateStr);
    return `${dayName}, ${dateFormatted}`;
}

export function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 13, g: 179, b: 165 };
}

export function getExportFilename(prefix, extension) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}_${prefix}.${extension}`;
}

export function ExcelDateToJSDate(serial) {
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

export const GREEN_THEMES = [
    { name: "Hijau Muda", label: "Light Green", hex: "#90ee90" },
    { name: "Hijau Neon", label: "Neon Green", hex: "#39ff14" },
    { name: "Hijau Lemon", label: "Lemon Green", hex: "#adff2f" },
    { name: "Hijau Lime", label: "Lime Green", hex: "#00ff00" },
    { name: "Hijau Chartreuse", label: "Chartreuse", hex: "#7fff00" },
    { name: "Hijau Mint", label: "Mint Green", hex: "#98ff98" },
    { name: "Hijau Sage", label: "Sage Green", hex: "#87a96b" },
    { name: "Hijau Pistachio", label: "Pistachio Green", hex: "#93c572" },
    { name: "Hijau Apel", label: "Apple Green", hex: "#8db600" },
    { name: "Hijau Celadon", label: "Celadon", hex: "#ace1af" },
    { name: "Hijau Seafoam", label: "Seafoam Green", hex: "#93e9be" },
    { name: "Hijau Pastel", label: "Pastel Green", hex: "#77dd77" },
    { name: "Hijau Zaitun / Olive", label: "Olive Green", hex: "#808000" },
    { name: "Hijau Matcha", label: "Matcha Green", hex: "#8f9779" },
    { name: "Hijau Lumut", label: "Moss Green", hex: "#8a9a5b" },
    { name: "Hijau Rumput", label: "Grass Green", hex: "#567d46" },
    { name: "Hijau Zamrud / Emerald", label: "Emerald Green", hex: "#50c878" },
    { name: "Hijau Giok / Jade", label: "Jade Green", hex: "#00a86b" },
    { name: "Hijau Kelly", label: "Kelly Green", hex: "#4cbb17" },
    { name: "Hijau Forest / Hutan", label: "Forest Green", hex: "#228b22" },
    { name: "Hijau Pinus", label: "Pine Green", hex: "#01796f" },
    { name: "Hijau Botol", label: "Bottle Green", hex: "#006a4e" },
    { name: "Hijau Tentara / Army", label: "Army Green", hex: "#4b5320" },
    { name: "Hijau Khaki / Camo", label: "Camouflage Green", hex: "#78866b" },
    { name: "Hijau Malakit", label: "Malachite", hex: "#0bda51" },
    { name: "Hijau Viridian", label: "Viridian", hex: "#40826d" },
    { name: "Hijau Sea / Laut", label: "Sea Green", hex: "#2e8b57" },
    { name: "Hijau Teal", label: "Teal Green", hex: "#00827f" },
    { name: "Hijau Muted", label: "Muted Green", hex: "#5c715e" },
    { name: "Hijau Hunter", label: "Hunter Green", hex: "#355e3b" },
    { name: "Hijau Brunswick", label: "Brunswick Green", hex: "#1b4d3e" },
    { name: "Hijau Gelap", label: "Dark Green", hex: "#006400" }
];
