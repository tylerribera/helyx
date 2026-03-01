/* ═══════════════════════════════════════════════════════════════
   HELYX — Auth Client JavaScript
   Handles login, register, forgot/reset password, account mgmt
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = window.location.origin + '/api/auth';

// ── Helpers ───────────────────────────────────────────────────
function getToken() {
    return localStorage.getItem('helyx_auth_token');
}

function setToken(token) {
    localStorage.setItem('helyx_auth_token', token);
}

function clearToken() {
    localStorage.removeItem('helyx_auth_token');
    localStorage.removeItem('helyx_user');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('helyx_user'));
    } catch { return null; }
}

function setUser(user) {
    localStorage.setItem('helyx_user', JSON.stringify(user));
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
}

function showMessage(elementId, text, type = 'error') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.className = `auth-message ${type}`;
    if (el.className.includes('account-message')) {
        el.className = `account-message ${type}`;
    }
}

function clearMessage(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = '';
    el.className = el.className.includes('account') ? 'account-message' : 'auth-message';
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ── Update nav auth link globally ─────────────────────────────
function updateNavAuth() {
    const link = document.getElementById('nav-auth-link');
    if (!link) return;

    const user = getUser();
    if (user) {
        link.textContent = 'Account';
        link.href = 'account.html';
    } else {
        link.textContent = 'Sign In';
        link.href = 'login.html';
    }
}

// ══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════
function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (!loginForm || !registerForm) return;

    // If already logged in, redirect to account
    if (getToken() && getUser()) {
        window.location.href = 'account.html';
        return;
    }

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            document.querySelector(`.auth-form[data-tab="${target}"]`).classList.add('active');
            clearMessage('auth-message');
        });
    });

    // Login submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage('auth-message');

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showMessage('auth-message', 'Please fill in all fields');
            return;
        }

        setLoading('login-submit', true);
        try {
            const data = await apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            setToken(data.token);
            setUser(data.user);
            window.location.href = 'account.html';
        } catch (err) {
            showMessage('auth-message', err.message);
        } finally {
            setLoading('login-submit', false);
        }
    });

    // Register submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage('auth-message');

        const firstName = document.getElementById('reg-first').value.trim();
        const lastName = document.getElementById('reg-last').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;

        if (!email || !password) {
            showMessage('auth-message', 'Email and password are required');
            return;
        }

        if (password !== confirm) {
            showMessage('auth-message', 'Passwords do not match');
            return;
        }

        if (password.length < 8) {
            showMessage('auth-message', 'Password must be at least 8 characters');
            return;
        }

        setLoading('register-submit', true);
        try {
            const data = await apiRequest('/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, firstName, lastName })
            });
            setToken(data.token);
            setUser(data.user);
            window.location.href = 'account.html';
        } catch (err) {
            showMessage('auth-message', err.message);
        } finally {
            setLoading('register-submit', false);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// FORGOT PASSWORD PAGE
// ══════════════════════════════════════════════════════════════
function initForgotPage() {
    const form = document.getElementById('forgot-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage('auth-message');

        const email = document.getElementById('forgot-email').value.trim();
        if (!email) {
            showMessage('auth-message', 'Please enter your email address');
            return;
        }

        setLoading('forgot-submit', true);
        try {
            const data = await apiRequest('/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            showMessage('auth-message', data.message, 'success');
            form.reset();
        } catch (err) {
            showMessage('auth-message', err.message);
        } finally {
            setLoading('forgot-submit', false);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// RESET PASSWORD PAGE
// ══════════════════════════════════════════════════════════════
function initResetPage() {
    const form = document.getElementById('reset-form');
    if (!form) return;

    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');

    if (!resetToken) {
        showMessage('auth-message', 'Invalid reset link. Please request a new one.');
        document.getElementById('reset-submit').disabled = true;
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage('auth-message');

        const newPassword = document.getElementById('reset-password').value;
        const confirm = document.getElementById('reset-confirm').value;

        if (!newPassword || !confirm) {
            showMessage('auth-message', 'Please fill in both fields');
            return;
        }

        if (newPassword !== confirm) {
            showMessage('auth-message', 'Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            showMessage('auth-message', 'Password must be at least 8 characters');
            return;
        }

        setLoading('reset-submit', true);
        try {
            const data = await apiRequest('/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token: resetToken, newPassword })
            });
            showMessage('auth-message', data.message + ' Redirecting...', 'success');
            form.reset();
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } catch (err) {
            showMessage('auth-message', err.message);
        } finally {
            setLoading('reset-submit', false);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// ACCOUNT PAGE
// ══════════════════════════════════════════════════════════════
function initAccountPage() {
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const logoutBtn = document.getElementById('logout-btn');
    if (!profileForm) return;

    // Check if logged in
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    // Load user data
    loadProfile();

    // Profile form submit
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage('profile-message');

        const firstName = document.getElementById('profile-first').value.trim();
        const lastName = document.getElementById('profile-last').value.trim();

        setLoading('profile-save', true);
        try {
            const data = await apiRequest('/me', {
                method: 'PUT',
                body: JSON.stringify({ firstName, lastName })
            });
            setUser(data.user);
            showMessage('profile-message', 'Profile updated successfully', 'success');
            // Update the message element class for account page
            const el = document.getElementById('profile-message');
            el.className = 'account-message success';
            updateGreeting(data.user);
        } catch (err) {
            const el = document.getElementById('profile-message');
            el.textContent = err.message;
            el.className = 'account-message error';
        } finally {
            setLoading('profile-save', false);
        }
    });

    // Password form submit
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage('password-message');

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-password').value;

            if (!currentPassword || !newPassword || !confirm) {
                const el = document.getElementById('password-message');
                el.textContent = 'Please fill in all fields';
                el.className = 'account-message error';
                return;
            }

            if (newPassword !== confirm) {
                const el = document.getElementById('password-message');
                el.textContent = 'New passwords do not match';
                el.className = 'account-message error';
                return;
            }

            setLoading('password-save', true);
            try {
                const data = await apiRequest('/change-password', {
                    method: 'PUT',
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const el = document.getElementById('password-message');
                el.textContent = data.message;
                el.className = 'account-message success';
                passwordForm.reset();
            } catch (err) {
                const el = document.getElementById('password-message');
                el.textContent = err.message;
                el.className = 'account-message error';
            } finally {
                setLoading('password-save', false);
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await apiRequest('/logout', { method: 'POST' });
            } catch { /* ignore logout errors */ }
            clearToken();
            window.location.href = 'index.html';
        });
    }
}

async function loadProfile() {
    try {
        const data = await apiRequest('/me');
        const user = data.user;
        setUser(user);

        document.getElementById('profile-first').value = user.first_name || '';
        document.getElementById('profile-last').value = user.last_name || '';
        document.getElementById('profile-email').value = user.email || '';

        updateGreeting(user);

        // Member since
        const since = document.getElementById('member-since');
        if (since && user.created_at) {
            since.textContent = new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    } catch (err) {
        // Token expired or invalid
        clearToken();
        window.location.href = 'login.html';
    }
}

function updateGreeting(user) {
    const greeting = document.getElementById('account-greeting');
    const emailEl = document.getElementById('account-email');
    if (greeting) {
        const name = user.first_name || user.firstName;
        greeting.textContent = name ? `Welcome, ${name}` : 'My Account';
    }
    if (emailEl) {
        emailEl.textContent = user.email;
    }
}

// ══════════════════════════════════════════════════════════════
// INIT — detect which page and run appropriate setup
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    updateNavAuth();
    initLoginPage();
    initForgotPage();
    initResetPage();
    initAccountPage();
});
