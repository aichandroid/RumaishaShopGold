// Authentication, Session Vault, and PIN Authorization for Rumaisho Gold
import { openModal, closeModal, closeAllModals } from './ui.js';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit
const AUTH_SESSION_KEY = "rumaisho_authenticated";
const LAST_ACTIVITY_KEY = "rumaisho_last_activity";

let enteredLoginPin = "";
let isLoginPinMasked = true;
let inactivityTimerInterval = null;
let pendingAction = null;

export function isAuthenticated() {
    const isAuthed = sessionStorage.getItem(AUTH_SESSION_KEY) === "true";
    if (!isAuthed) return false;

    const lastActivity = parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10);
    if (!lastActivity || Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);
        return false;
    }
    return true;
}

export function updateLastActivity() {
    if (sessionStorage.getItem(AUTH_SESSION_KEY) === "true") {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
}

export function focusLoginPinInput() {
    const hiddenInp = document.getElementById("login-hidden-input");
    if (hiddenInp) {
        hiddenInp.focus();
    }
}

export function updateLoginPinDisplay() {
    const boxes = document.querySelectorAll(".login-pin-box");
    boxes.forEach((box, index) => {
        if (index < enteredLoginPin.length) {
            box.classList.add("filled");
            box.classList.remove("active");
            box.textContent = isLoginPinMasked ? "●" : enteredLoginPin[index];
        } else {
            box.classList.remove("filled");
            box.textContent = "";
            if (index === enteredLoginPin.length) {
                box.classList.add("active");
            } else {
                box.classList.remove("active");
            }
        }
    });

    const hiddenInp = document.getElementById("login-hidden-input");
    if (hiddenInp && hiddenInp.value !== enteredLoginPin) {
        hiddenInp.value = enteredLoginPin;
    }
}

export function handleLoginPinDigit(digit, onComplete) {
    if (enteredLoginPin.length < 6) {
        enteredLoginPin += digit;
        updateLoginPinDisplay();
        clearLoginStatus();

        if (enteredLoginPin.length === 6 && typeof onComplete === "function") {
            setTimeout(() => {
                onComplete();
            }, 120);
        }
    }
}

export function handleLoginPinBackspace() {
    if (enteredLoginPin.length > 0) {
        enteredLoginPin = enteredLoginPin.slice(0, -1);
        updateLoginPinDisplay();
        clearLoginStatus();
    }
}

export function handleLoginPinClear(keepStatus = false) {
    enteredLoginPin = "";
    updateLoginPinDisplay();
    if (!keepStatus) {
        clearLoginStatus();
    }
    focusLoginPinInput();
}

export function toggleLoginPinMask() {
    isLoginPinMasked = !isLoginPinMasked;
    const icon = document.getElementById("login-pin-peek-icon");
    if (icon) {
        icon.className = isLoginPinMasked ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
    }
    updateLoginPinDisplay();
}

export function showLoginStatus(message, type = "error") {
    const msgEl = document.getElementById("login-status-msg");
    if (!msgEl) return;
    msgEl.textContent = message;
    msgEl.className = `login-status-msg ${type}`;

    if (type === "error") {
        const pinBoxes = document.getElementById("login-pin-boxes");
        if (pinBoxes) {
            pinBoxes.classList.remove("shake");
            void pinBoxes.offsetWidth; // Trigger reflow
            pinBoxes.classList.add("shake");
        }
    }
}

export function clearLoginStatus() {
    const msgEl = document.getElementById("login-status-msg");
    if (msgEl) {
        msgEl.className = "login-status-msg";
        msgEl.textContent = "";
    }
}

export function performAutoLogout() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);

    if (inactivityTimerInterval) {
        clearInterval(inactivityTimerInterval);
        inactivityTimerInterval = null;
    }

    closeAllModals();
    document.body.classList.remove("authenticated");
    handleLoginPinClear();
    showLoginStatus("Sesi Anda telah berakhir otomatis karena tidak ada interaksi selama 10 menit demi keamanan.", "warning");
    focusLoginPinInput();
}

export function performManualLogout() {
    if (confirm("Apakah Anda yakin ingin keluar dari aplikasi Rumaisho Gold?")) {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);

        if (inactivityTimerInterval) {
            clearInterval(inactivityTimerInterval);
            inactivityTimerInterval = null;
        }

        closeAllModals();
        document.body.classList.remove("authenticated");
        handleLoginPinClear();
        showLoginStatus("Anda telah berhasil keluar dari sistem.", "success");
        focusLoginPinInput();
    }
}

export function startInactivityTracker() {
    if (inactivityTimerInterval) {
        clearInterval(inactivityTimerInterval);
    }

    updateLastActivity();

    inactivityTimerInterval = setInterval(() => {
        if (!isAuthenticated()) {
            performAutoLogout();
        }
    }, 5000);
}

export function setupInactivityListeners() {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    let lastThrottledTime = 0;

    events.forEach(eventName => {
        window.addEventListener(eventName, () => {
            const now = Date.now();
            if (now - lastThrottledTime > 1000) {
                lastThrottledTime = now;
                if (sessionStorage.getItem(AUTH_SESSION_KEY) === "true") {
                    updateLastActivity();
                }
            }
        }, { passive: true });
    });
}

export async function submitLoginPin(db, onLoginSuccess) {
    if (enteredLoginPin.length < 6) {
        showLoginStatus("Masukkan 6 digit PIN secara lengkap!", "error");
        focusLoginPinInput();
        return;
    }

    const submitBtn = document.getElementById("login-submit-btn");
    const originalBtnContent = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa...';
    }

    try {
        const correctPin = await db.getPin();
        if (enteredLoginPin === correctPin) {
            document.querySelectorAll(".login-pin-box").forEach(b => b.classList.add("success"));
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> PIN Terverifikasi!';
            }
            showLoginStatus("Login berhasil! Membuka dashboard...", "success");

            sessionStorage.setItem(AUTH_SESSION_KEY, "true");
            updateLastActivity();

            fetch('/api/sync-to-supabase', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        console.log('🔄 [Sync] Sinkronisasi data ke Supabase berhasil:', data.summary);
                    }
                })
                .catch(err => console.warn('⚠️ [Sync] Gagal memicu sinkronisasi latar belakang:', err.message));

            setTimeout(async () => {
                document.body.classList.add("authenticated");
                enteredLoginPin = "";
                updateLoginPinDisplay();
                clearLoginStatus();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnContent;
                }

                if (typeof onLoginSuccess === "function") {
                    try {
                        await onLoginSuccess();
                    } catch (err) {
                        console.error("Error during onLoginSuccess:", err);
                    }
                }

                startInactivityTracker();
            }, 350);
        } else {
            showLoginStatus("PIN salah! Silakan coba lagi.", "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
            handleLoginPinClear(true);
        }
    } catch (err) {
        console.error("Login verification error:", err);
        showLoginStatus("Terjadi kesalahan saat verifikasi PIN.", "error");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
        }
    }
}

export function setupLoginEventListeners(db, onLoginSuccess) {
    const doSubmit = () => submitLoginPin(db, onLoginSuccess);

    const numpad = document.getElementById("login-numpad");
    if (numpad) {
        numpad.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            e.preventDefault();

            const key = btn.getAttribute("data-key");
            const action = btn.getAttribute("data-action");

            if (key !== null && key !== undefined) {
                handleLoginPinDigit(key, doSubmit);
            } else if (action === "clear") {
                handleLoginPinClear();
            } else if (action === "backspace") {
                handleLoginPinBackspace();
            }
        });
    }

    const pinBoxesContainer = document.getElementById("login-pin-boxes");
    if (pinBoxesContainer) {
        pinBoxesContainer.addEventListener("click", () => {
            focusLoginPinInput();
        });
    }

    const peekBtn = document.getElementById("login-pin-peek-btn");
    if (peekBtn) {
        peekBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleLoginPinMask();
        });
    }

    const submitBtn = document.getElementById("login-submit-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", (e) => {
            e.preventDefault();
            doSubmit();
        });
    }

    const hiddenInp = document.getElementById("login-hidden-input");
    if (hiddenInp) {
        hiddenInp.addEventListener("input", () => {
            const clean = hiddenInp.value.replace(/[^0-9]/g, "").slice(0, 6);
            if (clean !== enteredLoginPin) {
                enteredLoginPin = clean;
                updateLoginPinDisplay();
                clearLoginStatus();

                if (enteredLoginPin.length === 6) {
                    setTimeout(doSubmit, 120);
                }
            }
        });

        hiddenInp.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.code === "NumpadEnter") {
                e.preventDefault();
                doSubmit();
            }
        });
    }

    window.addEventListener("keydown", (e) => {
        if (document.body.classList.contains("authenticated")) return;

        // Support digits from both main keyboard row (0-9) and physical numpad (Numpad0-Numpad9)
        let digit = null;
        if (/^[0-9]$/.test(e.key)) {
            digit = e.key;
        } else if (/^Numpad[0-9]$/.test(e.code)) {
            digit = e.code.replace("Numpad", "");
        }

        if (digit !== null) {
            e.preventDefault();
            handleLoginPinDigit(digit, doSubmit);
        } else if (e.key === "Backspace" || e.key === "Delete" || (e.code === "NumpadDecimal" && e.key === "Delete")) {
            e.preventDefault();
            handleLoginPinBackspace();
        } else if (e.key === "Enter" || e.code === "NumpadEnter") {
            e.preventDefault();
            doSubmit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            handleLoginPinClear();
        }
    });

    const logoutBtn = document.getElementById("nav-logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            performManualLogout();
        });
    }

    setupInactivityListeners();
}

// Verification & PIN Flow for Mutations
export function requestPinAuthorization(actionCallback) {
    pendingAction = actionCallback;
    openModal("modal-pin-auth");
    
    const firstBox = document.querySelector(".pin-digit-box");
    if (firstBox) firstBox.focus();
}

export function setupPinAuthModalListeners(db) {
    const pinInputs = document.querySelectorAll(".pin-digit-box");
    pinInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, '');
            if (input.value && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                pinInputs[index - 1].focus();
            } else if (e.key === "Enter") {
                e.preventDefault();
                const verifyBtn = document.getElementById("btn-pin-auth-verify");
                if (verifyBtn) verifyBtn.click();
            }
        });
    });

    const verifyBtn = document.getElementById("btn-pin-auth-verify");
    if (verifyBtn) {
        verifyBtn.addEventListener("click", async () => {
            let enteredPin = "";
            pinInputs.forEach(i => enteredPin += i.value);

            const correctPin = await db.getPin();
            const minLen = correctPin ? correctPin.length : 6;
            if (enteredPin.length < minLen) {
                document.getElementById("pin-auth-error").textContent = `PIN harus ${minLen} digit!`;
                return;
            }
            if (enteredPin === correctPin) {
                closeModal("modal-pin-auth");
                if (pendingAction) {
                    const action = pendingAction;
                    pendingAction = null;
                    await action();
                }
            } else {
                document.getElementById("pin-auth-error").textContent = "PIN salah! Coba lagi.";
                pinInputs.forEach(i => i.value = "");
                pinInputs[0].focus();
            }
        });
    }
}
