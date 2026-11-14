// Settings Module for Rumaisho Gold
import { updateDatabaseStatusUI } from './ui.js';

export function setupSettingsEventListeners(db, onMutate) {
    // Change PIN
    const savePinBtn = document.getElementById("save-pin-btn");
    if (savePinBtn) {
        savePinBtn.addEventListener("click", async () => {
            const oldPinInp = document.getElementById("settings-old-pin");
            const newPinInp = document.getElementById("settings-new-pin");
            const confirmPinInp = document.getElementById("settings-confirm-pin");

            const oldPin = oldPinInp ? oldPinInp.value : "";
            const newPin = newPinInp ? newPinInp.value : "";
            const confirmPin = confirmPinInp ? confirmPinInp.value : "";

            if (!/^\d{4,8}$/.test(newPin)) {
                alert("PIN baru harus berupa 4 hingga 8 digit angka!");
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
            if (oldPinInp) oldPinInp.value = "";
            if (newPinInp) newPinInp.value = "";
            if (confirmPinInp) confirmPinInp.value = "";
        });
    }

    // Sync button (if present)
    const syncBtn = document.getElementById("sync-db-btn");
    if (syncBtn) {
        syncBtn.addEventListener("click", async () => {
            const { url, key } = db.getCredentials();
            if (!url || !key) {
                alert("Basis data terhubung ke PostgreSQL lokal.");
                return;
            }
            
            if (confirm("Apakah Anda ingin menyinkronkan data lokal ke cloud?")) {
                const res = await db.syncToSupabase();
                alert(res.message);
                updateDatabaseStatusUI(db);
                if (typeof onMutate === "function") {
                    await onMutate();
                }
            }
        });
    }
}

export function loadSettingsData(db) {
    const urlEl = document.getElementById("settings-db-url");
    const keyEl = document.getElementById("settings-db-key");
    if (urlEl && keyEl) {
        const { url, key } = db.getCredentials();
        urlEl.value = url || "";
        keyEl.value = key || "";
    }
}
