const STORAGE_KEYS = {
  USER_EMAIL: 'userEmail',
  AUTH_TOKEN: 'tm_auth_token',
  USER_ID: 'userId'
};

// Token storage for auth token, email, and userId
const TokenStorage = {
  _decode(token) {
    try {
      const [, payload] = token.split('.');
      return payload ? JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) : {};
    } catch {
      return {};
    }
  },
  async setToken(token, email) {
    const decoded = this._decode(token);
    const userId = decoded.userId || decoded.id || decoded.sub || decoded._id || null;
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
      if (userId) localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token, [STORAGE_KEYS.USER_EMAIL]: email, [STORAGE_KEYS.USER_ID]: userId });
    } catch {}
    return { token, email, userId };
  },
  async getToken() {
    let token, email, userId;
    try {
      token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      email = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
      userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    } catch {}
    if (!token || !email) {
      try {
        const stored = await chrome.storage.local.get([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_EMAIL, STORAGE_KEYS.USER_ID]);
        token = token || stored[STORAGE_KEYS.AUTH_TOKEN];
        email = email || stored[STORAGE_KEYS.USER_EMAIL];
        userId = userId || stored[STORAGE_KEYS.USER_ID];
      } catch {}
    }
    if (token && !userId) {
      const decoded = this._decode(token);
      userId = decoded.userId || decoded.id || decoded.sub || decoded._id || null;
      if (userId) try { localStorage.setItem(STORAGE_KEYS.USER_ID, userId); } catch {}
    }
    return { token, email, userId };
  },
  async clearToken() {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
      localStorage.removeItem(STORAGE_KEYS.USER_ID);
      await chrome.storage.local.remove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_EMAIL, STORAGE_KEYS.USER_ID]);
    } catch {}
    if (window.__TM_AUTH_CACHE__) window.__TM_AUTH_CACHE__ = { last: 0, ok: false };
  }
};

// Removed modal-based auth UI. Auth now relies solely on the inline form (#emailPrompt) present in popup.html.
// authenticateUser will reveal the inline prompt and wait for a "tm-auth-success" event fired after successful login.

const login = async (email, password) => authRequest('login', email, password);
const signup = async (email, password) => authRequest('signup', email, password);

// Shared auth request handler
const authRequest = async (type, email, password) => {
  try {
    const backendUrl = await resolveBackendUrl();
    const res = await fetch(`${backendUrl}/api/auth/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `${type === 'login' ? 'Login' : 'Signup'} failed`);
    if (!data.token) throw new Error('No token received');
    await TokenStorage.setToken(data.token, email);
    window.__TM_AUTH_CACHE__ = { last: Date.now(), ok: true };
    try { chrome.runtime.sendMessage({ action: 'triggerImmediateSync' }); } catch {}
    if (type === 'signup') try { chrome.runtime.sendMessage({ action: 'authSuccess' }); } catch {}
    return true;
  } catch (e) {
    console.error(`${type} error:`, e);
    throw e;
  }
};

// Check authentication status
const isAuthenticated = async () => {
  window.__TM_AUTH_CACHE__ = window.__TM_AUTH_CACHE__ || { last: 0, ok: false };
  const CACHE_TTL = 5 * 60 * 1000;
  const { token, email } = await TokenStorage.getToken();
  if (!token || !email) return false;
  if (window.__TM_AUTH_CACHE__.ok && Date.now() - window.__TM_AUTH_CACHE__.last < CACHE_TTL) return true;
  try {
    const backendUrl = await resolveBackendUrl();
    const res = await fetch(`${backendUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      window.__TM_AUTH_CACHE__ = { last: Date.now(), ok: true };
      return true;
    }
    if (res.status === 429) {
      console.warn('Token verification rate-limited');
      window.__TM_AUTH_CACHE__ = { last: Date.now(), ok: true };
      return true;
    }
    const data = res.headers.get('content-type')?.includes('application/json') ? await res.json().catch(() => ({})) : { message: await res.text().catch(() => '') };
    console.warn('Token verification failed:', data || { status: res.status });
    if (data?.code === 'TOKEN_EXPIRED' || data?.code === 'INVALID_TOKEN') await TokenStorage.clearToken();
    window.__TM_AUTH_CACHE__ = { last: Date.now(), ok: false };
    return false;
  } catch (e) {
    console.error('Token verification error:', e);
    window.__TM_AUTH_CACHE__ = { last: Date.now(), ok: false };
    return false;
  }
};

// Main auth function
const authenticateUser = async callback => {
  if (await isAuthenticated()) {
    const { email } = await TokenStorage.getToken();
    callback?.(true, email);
    return true;
  }
  // Show inline auth form
  try {
    document.getElementById('emailPrompt')?.classList.remove('hidden');
    document.getElementById('mainApp')?.classList.add('hidden');
  } catch {}
  return new Promise(resolve => {
    const handler = e => {
      const email = e.detail?.email;
      document.removeEventListener('tm-auth-success', handler);
      callback?.(true, email);
      resolve(true);
    };
    document.addEventListener('tm-auth-success', handler);
  });
};

const logout = async () => await TokenStorage.clearToken();

// Resolve backend URL with fallback
const resolveBackendUrl = async () => {
  try {
    if (window.TMConfig) {
      await window.TMConfig.loadOverrides();
      return window.TMConfig.current.backendBaseUrl;
    }
  } catch {}
  try {
    const { tmBackendUrl } = await chrome.storage.local.get(['tmBackendUrl']);
    if (tmBackendUrl && /^https?:\/\//.test(tmBackendUrl)) {
      const url = tmBackendUrl.replace(/\/$/, '');
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${url}/health`, { method: 'GET', cache: 'no-store', signal: controller.signal });
        if (res.ok) return url;
      } catch {}
    }
  } catch {}
  const renderBase = 'https://timemachine-1.onrender.com';
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${renderBase}/health`, { method: 'GET', cache: 'no-store', signal: controller.signal });
    if (res.ok) {
      try { await chrome.storage.local.set({ tmBackendUrl: renderBase }); } catch {}
      return renderBase;
    }
  } catch {}
  for (const base of ['http://127.0.0.1:3000', 'http://localhost:3000']) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${base}/health`, { method: 'GET', cache: 'no-store', signal: controller.signal });
      if (res.ok) {
        try { await chrome.storage.local.set({ tmBackendUrl: base }); } catch {}
        return base;
      }
    } catch {}
  }
  return renderBase;
};

window.Auth = { authenticateUser, login, signup, logout, isAuthenticated };
try { window.TokenStorage = TokenStorage; } catch {}