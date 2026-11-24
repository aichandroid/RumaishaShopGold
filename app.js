// Application Main Orchestrator for Rumaisho Gold
import { GoldDatabase } from './db.js?v=3.1';
import {
    openModal,
    closeModal,
    navigateToTab,
    updateDatabaseStatusUI,
    updateTopBarDate,
    setupMobileDrawerEventListeners,
    setupDashboardQuickLinks
} from './modules/ui.js';
import {
    isAuthenticated,
    setupLoginEventListeners,
    setupPinAuthModalListeners,
    performManualLogout,
    focusLoginPinInput,
    handleLoginPinClear,
    startInactivityTracker
} from './modules/auth.js';
import { setupPembelianForm, renderPembelianTable } from './modules/pembelian.js';
import { setupPenjualanForm, renderPenjualanTable } from './modules/penjualan.js';
import { setupStokEventListeners, renderStokEmasTable } from './modules/stok.js';
import { setupHargaEmasEventListeners, renderHargaEmasTable, setupThemeColorPicker, applyGoldPriceTheme } from './modules/harga-emas.js?v=3.1';
import { getDailyThemeForDate } from './modules/utils.js?v=3.1';
import { loadDashboardData, setupRecapTabEventListeners } from './modules/dashboard.js';
import { setupExportEventListeners, setupImportEventListeners } from './modules/export-import.js';
import { setupSettingsEventListeners, loadSettingsData } from './modules/settings.js';

// Instantiate Database Singleton
const db = new GoldDatabase();

let appInitialized = false;

// Global refresh callback when data mutates (insert, edit, delete, import)
async function refreshAllData() {
    await Promise.all([
        renderPembelianTable(db, refreshAllData),
        renderStokEmasTable(db, refreshAllData),
        renderPenjualanTable(db, refreshAllData),
        renderHargaEmasTable(db),
        loadDashboardData(db)
    ]);
}

// Handler for tab navigation
async function onTabChange(tabId) {
    if (tabId === "dashboard") {
        await loadDashboardData(db);
    } else if (tabId === "pembelian") {
        await renderPembelianTable(db, refreshAllData);
    } else if (tabId === "penjualan") {
        await renderPenjualanTable(db, refreshAllData);
    } else if (tabId === "stok-emas") {
        await renderStokEmasTable(db, refreshAllData);
    } else if (tabId === "harga-emas") {
        await renderHargaEmasTable(db);
    } else if (tabId === "settings") {
        loadSettingsData(db);
    }
}

// App Initialization Sequence
async function initApp() {
    await db.loadRemoteConfig();

    // 1. Setup Status DB & Topbar Date
    updateDatabaseStatusUI(db);
    updateTopBarDate();
    try {
        applyGoldPriceTheme(getDailyThemeForDate());
    } catch (err) {
        console.warn("Gold price theme init skipped:", err);
    }

    // Set Default Dates to Today's date on Inputs
    const todayStr = new Date().toISOString().split("T")[0];
    document.querySelectorAll('input[type="date"]').forEach(inp => {
        inp.value = todayStr;
    });

    // 2. Navigation Triggers (Sidebar, Bottom Nav, Drawer)
    const navItems = document.querySelectorAll(".nav-item[data-tab], .bottom-nav-item[data-tab]");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.getAttribute("data-tab");
            if (!tabId) return;
            navigateToTab(tabId);
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

    // 4. Initialize Feature Modules
    setupPembelianForm(db, refreshAllData);
    setupPenjualanForm(db, refreshAllData);
    setupStokEventListeners(db, refreshAllData);
    setupHargaEmasEventListeners(db, refreshAllData);
    setupRecapTabEventListeners(db);
    setupSettingsEventListeners(db, refreshAllData);
    setupExportEventListeners(db);
    setupImportEventListeners(db, refreshAllData);
    setupMobileDrawerEventListeners(() => performManualLogout());
    setupDashboardQuickLinks((tabId) => {
        navigateToTab(tabId);
        onTabChange(tabId);
    });
    setupPinAuthModalListeners(db);
    await setupThemeColorPicker(db);

    // 5. Initial Data Load (Dashboard)
    await loadDashboardData(db);
}

// App Bootstrap Sequence
function bootstrapApp() {
    setupLoginEventListeners(db, async () => {
        if (!appInitialized) {
            await initApp();
            appInitialized = true;
        } else {
            navigateToTab("dashboard");
            await loadDashboardData(db);
        }
    });

    db.loadRemoteConfig().catch(e => console.error("Remote config preload:", e));

    if (isAuthenticated()) {
        document.body.classList.add("authenticated");
        initApp().then(() => {
            appInitialized = true;
            startInactivityTracker();
        }).catch(err => {
            console.error("Failed to initApp:", err);
        });
    } else {
        document.body.classList.remove("authenticated");
        handleLoginPinClear();
        focusLoginPinInput();
    }
}

// Entrypoint: handles both loading and interactive/complete DOM states safely
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
    bootstrapApp();
}
