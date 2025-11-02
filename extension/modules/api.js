const PRODUCTION_BACKEND = '__PRODUCTION_BACKEND_URL__';

async function resolveBackendUrl() {
  const { tmBackendUrl } = await chrome.storage.local.get(['tmBackendUrl']);
  return tmBackendUrl || PRODUCTION_BACKEND;
}

async function apiCall(endpoint, options = {}) {
  const base = await resolveBackendUrl();
  const url = `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  let token;
  try {
    token = (await TokenStorage?.getToken?.())?.token || localStorage.getItem('tm_auth_token');
  } catch (_) {
    token = localStorage.getItem('tm_auth_token');
  }
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const resp = await fetch(url, { ...options, headers });
  let data = null;
  try { data = await resp.json(); } catch (_) {}
  if (resp.status === 401) {
    try { await window?.Auth?.logout?.(); } catch (_) {}
    throw new Error((data && (data.message || data.error)) || 'Unauthorized');
  }
  if (!resp.ok) {
    throw new Error((data && (data.message || data.error)) || `HTTP ${resp.status}`);
  }
  return data;
}

export { resolveBackendUrl, apiCall };