export async function resolveBackendUrl() {
  try {
    if (typeof window !== 'undefined' && window.TMConfig) {
      await window.TMConfig.loadOverrides();
      const url = window.TMConfig.current.backendBaseUrl;
      if (url && /^https?:\/\//.test(url)) return url.replace(/\/$/, '');
    }
  } catch (e) {}

  try {
    const { tmBackendUrl } = (await chrome.storage?.local.get(['tmBackendUrl'])) ?? {};
    if (tmBackendUrl && /^https?:\/\//.test(tmBackendUrl)) {
      const url = tmBackendUrl.replace(/\/$/, '');
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(url + '/health', { method: 'GET', cache: 'no-store', signal: controller.signal });
        clearTimeout(t);
        if (res.ok) return url;
      } catch (_) {}
    }
  } catch (e) {}


  const probes = ['http://127.0.0.1:3000', 'http://localhost:3000'];
  for (const base of probes) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(base + '/health', { method: 'GET', cache: 'no-store', signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        try { await chrome.storage?.local.set({ tmBackendUrl: base }); } catch (_) {}
        return base;
      }
    } catch (_) {}
  }
  return 'http://localhost:3000';
}

export async function apiCall(endpoint, options = {}) {
  const base = await resolveBackendUrl();
  const url = `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let token;
  try {
    if (typeof TokenStorage !== 'undefined' && TokenStorage?.getToken) {
      token = (await TokenStorage.getToken())?.token;
    } else {
      token = localStorage.getItem('tm_auth_token');
    }
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

export default { resolveBackendUrl, apiCall };
