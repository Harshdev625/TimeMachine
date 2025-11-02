const STORAGE_KEYS = {
  USER_EMAIL: 'userEmail',
  AUTH_TOKEN: 'tm_auth_token',
  USER_ID: 'userId'
};

const PRODUCTION_BACKEND = '__PRODUCTION_BACKEND_URL__';

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

const login = async (email, password) => authRequest('login', email, password);
const signup = async (email, password) => authRequest('signup', email, password);

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

const authenticateUser = async callback => {
  if (await isAuthenticated()) {
    const { email } = await TokenStorage.getToken();
    callback?.(true, email);
    return true;
  }
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

async function resolveBackendUrl() {
  const { tmBackendUrl } = await chrome.storage.local.get(['tmBackendUrl']);
  return tmBackendUrl || PRODUCTION_BACKEND;
}

window.resolveBackendUrl = resolveBackendUrl;
window.Auth = { authenticateUser, login, signup, logout, isAuthenticated };
window.TokenStorage = TokenStorage;