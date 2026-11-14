// UI, Modals, and Navigation Helpers for Rumaisho Gold

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        
        // If closing PIN modal, reset inputs
        if (modalId === "modal-pin-auth") {
            document.querySelectorAll(".pin-digit-box").forEach(i => i.value = "");
            const errEl = document.getElementById("pin-auth-error");
            if (errEl) errEl.textContent = "";
        }
    }
}

export function closeAllModals() {
    document.querySelectorAll(".modal.active").forEach(m => {
        closeModal(m.id);
    });
}

export function showConfirmSubmitModal(summaryText, successCallback) {
    const listEl = document.getElementById("confirm-submit-data-list");
    if (listEl) listEl.innerHTML = summaryText;
    openModal("modal-confirm-submit");
    
    // Set verify button
    const verifyBtn = document.getElementById("btn-confirm-submit-go");
    if (!verifyBtn) return;
    
    // Clear old listeners via clone
    const newBtn = verifyBtn.cloneNode(true);
    verifyBtn.parentNode.replaceChild(newBtn, verifyBtn);

    newBtn.addEventListener("click", () => {
        closeModal("modal-confirm-submit");
        if (typeof successCallback === "function") {
            successCallback();
        }
    });
}

export function updateDatabaseStatusUI(db) {
    const dot = document.getElementById("db-status-dot");
    const dotMobile = document.getElementById("db-status-dot-mobile");
    const label = document.getElementById("db-status-text");
    const syncBtn = document.getElementById("sync-db-btn");
    const statusBar = document.querySelector(".connection-status-bar");

    const { key } = db.getCredentials();
    const isServiceRole = db.isServiceRoleKey(key);

    if (statusBar) statusBar.style.display = "flex";

    if (isServiceRole) {
        if (dot) {
            dot.className = "status-dot";
            dot.style.backgroundColor = "var(--color-danger)";
        }
        if (dotMobile) {
            dotMobile.className = "status-dot";
            dotMobile.style.backgroundColor = "var(--color-danger)";
        }
        if (label) label.textContent = "Error: Key Tidak Valid";
        if (syncBtn) syncBtn.style.display = "none";
    } else if (db.isUsingSupabase()) {
        if (dot) {
            dot.className = "status-dot online";
            dot.style.backgroundColor = "";
        }
        if (dotMobile) {
            dotMobile.className = "status-dot online";
            dotMobile.style.backgroundColor = "";
        }
        if (label) label.textContent = "Basis Data Terhubung";
        if (syncBtn) syncBtn.style.display = "none";
    } else {
        if (dot) {
            dot.className = "status-dot";
            dot.style.backgroundColor = "";
        }
        if (dotMobile) {
            dotMobile.className = "status-dot";
            dotMobile.style.backgroundColor = "";
        }
        if (label) label.textContent = "Mode Offline (Lokal)";
        if (syncBtn) syncBtn.style.display = "inline-flex";
    }
}

export function updateTopBarDate() {
    const dateEl = document.getElementById("current-date-text");
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('id-ID', options);
    }
}

export function navigateToTab(tabId) {
    const navItems = document.querySelectorAll(".nav-item[data-tab]");
    navItems.forEach(n => {
        if (n.getAttribute("data-tab") === tabId) {
            n.classList.add("active");
        } else {
            n.classList.remove("active");
        }
    });

    const bottomNavItems = document.querySelectorAll(".bottom-nav-item[data-tab]");
    bottomNavItems.forEach(b => {
        if (b.getAttribute("data-tab") === tabId) {
            b.classList.add("active");
            if (typeof b.scrollIntoView === "function") {
                b.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
        } else {
            b.classList.remove("active");
        }
    });

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });
    const targetPage = document.getElementById(`page-${tabId}`);
    if (targetPage) targetPage.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

export function setupMobileDrawerEventListeners(onLogout) {
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const moreBtn = document.getElementById("bottom-nav-more-btn");
    const closeBtn = document.getElementById("mobile-drawer-close");
    const backdrop = document.getElementById("mobile-drawer-backdrop");
    const drawer = document.getElementById("mobile-drawer");
    const drawerLogoutBtn = document.getElementById("drawer-logout-btn");

    function openDrawer() {
        if (drawer) drawer.classList.add("active");
        if (backdrop) backdrop.classList.add("active");
    }

    function closeDrawer() {
        if (drawer) drawer.classList.remove("active");
        if (backdrop) backdrop.classList.remove("active");
    }

    if (toggleBtn) toggleBtn.addEventListener("click", openDrawer);
    if (moreBtn) moreBtn.addEventListener("click", openDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);

    if (drawer) {
        drawer.querySelectorAll(".nav-item[data-tab]").forEach(item => {
            item.addEventListener("click", () => {
                closeDrawer();
            });
        });
    }

    if (drawerLogoutBtn) {
        drawerLogoutBtn.addEventListener("click", () => {
            closeDrawer();
            if (typeof onLogout === "function") {
                onLogout();
            }
        });
    }
}

export function setupDashboardQuickLinks(onNavigate) {
    const btnGotoPenjualan = document.getElementById("btn-goto-penjualan");
    if (btnGotoPenjualan) {
        btnGotoPenjualan.addEventListener("click", () => {
            if (typeof onNavigate === "function") {
                onNavigate("penjualan");
            }
        });
    }
}
