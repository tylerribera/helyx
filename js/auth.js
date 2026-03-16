/* ═══════════════════════════════════════════════════════════════
   HELYX — Auth Client JavaScript
   Handles login, register, forgot/reset password, account mgmt
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = window.location.hostname === 'localhost'
    ? window.location.origin + '/api/auth'
    : 'https://api.helyx.us/api/auth';

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
    } catch {
        return null;
    }
}

function setUser(user) {
    localStorage.setItem('helyx_user', JSON.stringify(user));
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
}

function isAccountMessageId(id) {
    return id === 'profile-message' || id === 'password-message' || id === 'preferences-message' || id === 'saved-message';
}

function showMessage(elementId, text, type = 'error') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.className = `${isAccountMessageId(elementId) ? 'account-message' : 'auth-message'} ${type}`;
}

function clearMessage(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = '';
    el.className = isAccountMessageId(elementId) ? 'account-message' : 'auth-message';
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
}

function toSlug(input) {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

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

function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (!loginForm || !registerForm) return;

    if (getToken() && getUser()) {
        window.location.href = 'account.html';
        return;
    }

    document.querySelectorAll('.auth-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach((form) => form.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            document.querySelector(`.auth-form[data-tab="${target}"]`).classList.add('active');
            clearMessage('auth-message');
        });
    });

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

function initResetPage() {
    const form = document.getElementById('reset-form');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    if (!resetToken) {
        showMessage('auth-message', 'Invalid reset link. Please request a new one.');
        const submit = document.getElementById('reset-submit');
        if (submit) submit.disabled = true;
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
            showMessage('auth-message', `${data.message} Redirecting...`, 'success');
            form.reset();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (err) {
            showMessage('auth-message', err.message);
        } finally {
            setLoading('reset-submit', false);
        }
    });
}

async function loadProfile() {
    try {
        const data = await apiRequest('/me');
        const user = data.user;
        setUser(user);

        const first = document.getElementById('profile-first');
        const last = document.getElementById('profile-last');
        const email = document.getElementById('profile-email');
        if (first) first.value = user.first_name || '';
        if (last) last.value = user.last_name || '';
        if (email) email.value = user.email || '';

        updateGreeting(user);

        const since = document.getElementById('member-since');
        if (since && user.created_at) {
            since.textContent = new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    } catch {
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

async function loadPreferences() {
    const form = document.getElementById('preferences-form');
    if (!form) return;

    try {
        const data = await apiRequest('/preferences');
        const preferences = data.preferences || {};

        const newsletter = document.getElementById('pref-newsletter');
        const alerts = document.getElementById('pref-alerts');
        const digest = document.getElementById('pref-digest');
        const category = document.getElementById('pref-category');

        if (newsletter) newsletter.checked = !!preferences.newsletter_opt_in;
        if (alerts) alerts.checked = !!preferences.product_alerts_opt_in;
        if (digest) digest.checked = !!preferences.research_digest_opt_in;
        if (category) category.value = preferences.preferred_research_category || 'general';
    } catch {
        // optional section
    }
}

async function loadSavedCompounds() {
    const list = document.getElementById('saved-list');
    const empty = document.getElementById('saved-empty');
    if (!list || !empty) return;

    try {
        const data = await apiRequest('/saved-compounds');
        const compounds = data.compounds || [];

        list.innerHTML = '';
        if (!compounds.length) {
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        compounds.forEach((compound) => {
            const item = document.createElement('li');
            item.className = 'saved-item';
            item.innerHTML = `
                <span class="saved-item__name">${compound.compound_name}</span>
                <button type="button" class="btn-secondary" data-remove-saved-id="${compound.id}">Remove</button>
            `;
            list.appendChild(item);
        });
    } catch {
        list.innerHTML = '';
        empty.style.display = 'block';
    }
}

async function loadActivity() {
    const list = document.getElementById('activity-list');
    const empty = document.getElementById('activity-empty');
    if (!list || !empty) return;

    try {
        const data = await apiRequest('/activity');
        const items = data.activity || [];

        list.innerHTML = '';
        if (!items.length) {
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        items.forEach((entry) => {
            const item = document.createElement('li');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-item__desc">${entry.description}</div>
                <div class="activity-item__time">${new Date(entry.created_at).toLocaleString()}</div>
            `;
            list.appendChild(item);
        });
    } catch {
        list.innerHTML = '';
        empty.style.display = 'block';
    }
}

function initAccountPage() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    const passwordForm = document.getElementById('password-form');
    const preferencesForm = document.getElementById('preferences-form');
    const savedForm = document.getElementById('saved-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    loadProfile();
    loadPreferences();
    loadSavedCompounds();
    loadActivity();

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
            updateGreeting(data.user);
            loadActivity();
        } catch (err) {
            showMessage('profile-message', err.message);
        } finally {
            setLoading('profile-save', false);
        }
    });

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage('password-message');

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-password').value;

            if (!currentPassword || !newPassword || !confirm) {
                showMessage('password-message', 'Please fill in all fields');
                return;
            }

            if (newPassword !== confirm) {
                showMessage('password-message', 'New passwords do not match');
                return;
            }

            setLoading('password-save', true);
            try {
                const data = await apiRequest('/change-password', {
                    method: 'PUT',
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                showMessage('password-message', data.message, 'success');
                passwordForm.reset();
                loadActivity();
            } catch (err) {
                showMessage('password-message', err.message);
            } finally {
                setLoading('password-save', false);
            }
        });
    }

    if (preferencesForm) {
        preferencesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage('preferences-message');

            const payload = {
                newsletterOptIn: !!document.getElementById('pref-newsletter')?.checked,
                productAlertsOptIn: !!document.getElementById('pref-alerts')?.checked,
                researchDigestOptIn: !!document.getElementById('pref-digest')?.checked,
                preferredResearchCategory: document.getElementById('pref-category')?.value || 'general'
            };

            setLoading('preferences-save', true);
            try {
                await apiRequest('/preferences', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                showMessage('preferences-message', 'Preferences updated successfully', 'success');
                loadActivity();
            } catch (err) {
                showMessage('preferences-message', err.message);
            } finally {
                setLoading('preferences-save', false);
            }
        });
    }

    if (savedForm) {
        savedForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage('saved-message');

            const nameInput = document.getElementById('saved-name');
            const compoundName = nameInput ? nameInput.value.trim() : '';
            if (!compoundName) {
                showMessage('saved-message', 'Enter a compound name to save');
                return;
            }

            setLoading('saved-add', true);
            try {
                await apiRequest('/saved-compounds', {
                    method: 'POST',
                    body: JSON.stringify({
                        compoundName,
                        compoundSlug: toSlug(compoundName)
                    })
                });
                showMessage('saved-message', 'Compound saved', 'success');
                if (nameInput) nameInput.value = '';
                loadSavedCompounds();
                loadActivity();
            } catch (err) {
                showMessage('saved-message', err.message);
            } finally {
                setLoading('saved-add', false);
            }
        });
    }

    document.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const removeId = target.getAttribute('data-remove-saved-id');
        if (!removeId) return;

        clearMessage('saved-message');
        try {
            await apiRequest(`/saved-compounds/${removeId}`, { method: 'DELETE' });
            showMessage('saved-message', 'Compound removed', 'success');
            loadSavedCompounds();
            loadActivity();
        } catch (err) {
            showMessage('saved-message', err.message);
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await apiRequest('/logout', { method: 'POST' });
            } catch {
                // ignore
            }
            clearToken();
            window.location.href = 'index.html';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavAuth();
    initLoginPage();
    initForgotPage();
    initResetPage();
    initAccountPage();
});
