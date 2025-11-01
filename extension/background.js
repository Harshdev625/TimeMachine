console.log("Background script loaded");

const POSTED_KEY = 'focusPosted';
const POMODORO_DEFAULTS = { workMinutes: 25, breakMinutes: 5 };
const ALLOWED_CATEGORIES = ["Work", "Social", "Entertainment", "Professional", "Other"];
let pomodoroState = { running: false, mode: "work", endsAt: null };
let pomodoroInterval = null;
let blockedSites = new Map();
let blockedKeywords = new Map();
let _backendCache = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'triggerImmediateSync' || msg.action === 'authSuccess') {
    sendResponse({ ok: true }); // prevents the runtime.lastError warning
  }
  return true;
});

async function resolveBackendUrl() {
  if (_backendCache) return _backendCache;
  try {
    const { TMConfigOverrides, tmBackendUrl } = await chrome.storage.local.get(["TMConfigOverrides", "tmBackendUrl"]);
    const candidate = tmBackendUrl || TMConfigOverrides?.backendBaseUrl;
    if (candidate && typeof candidate === "string") {
      const url = candidate.replace(/\/$/, "");
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${url}/health`, { method: 'GET', cache: 'no-store', signal: controller.signal });
      clearTimeout(t);
      if (res.ok) return (_backendCache = url);
    }
  } catch (e) {
    console.warn("resolveBackendUrl failed:", e);
  }
  const probes = ['http://127.0.0.1:3000', 'http://localhost:3000'];
  for (const base of probes) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${base}/health`, { method: 'GET', cache: 'no-store', signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        await chrome.storage.local.set({ tmBackendUrl: (_backendCache = base) });
        console.log('[TM] Using local backend at', _backendCache);
        return _backendCache;
      }
    } catch (_) {}
  }
  return (_backendCache = 'http://localhost:3000');
}

async function backendFetch(path, options = {}) {
  const base = await resolveBackendUrl();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!options.headers) options.headers = {};
  const { tm_auth_token } = await chrome.storage.local.get(["tm_auth_token"]);
  if (tm_auth_token && !options.headers.Authorization) options.headers.Authorization = `Bearer ${tm_auth_token}`;
  if (options.body && !options.headers["Content-Type"]) options.headers["Content-Type"] = "application/json";
  try {
    const response = await fetch(url, options);
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === "TOKEN_EXPIRED" || errorData.code === "AUTH_REQUIRED") {
        console.warn("Authentication expired, clearing token");
        await chrome.storage.local.remove(["tm_auth_token", "userEmail"]);
      }
    }
    return response;
  } catch (error) {
    console.error("Network error in backendFetch:", error);
    throw error;
  }
}

async function pingHealth() {
  try {
    const base = await resolveBackendUrl();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${base}/health`, {
      method: 'GET', cache: 'no-store', signal: controller.signal,
      headers: { 'User-Agent': 'TimeMachineExt-keepalive/1.0' }
    });
    clearTimeout(t);
    console.debug('[keepalive-ext]', res.ok ? 'ok' : `non-ok ${res.status}`);
  } catch (e) {
    console.debug('[keepalive-ext] error', e?.message || String(e));
  }
}

function notify(id, title, message) {
  try {
    chrome.notifications?.create(id, { type: "basic", iconUrl: "icon48.png", title, message, priority: 1 }, () => {});
  } catch (e) {
    console.error('Notification failed:', e);
  }
}

(function setupFocusCompletionWatcher() {
  async function getPostedSet() {
    return new Set((await chrome.storage.local.get([POSTED_KEY]))[POSTED_KEY] || []);
  }
  async function addPosted(startTime) {
    if (!Number.isFinite(Number(startTime))) return;
    const set = await getPostedSet();
    set.add(Number(startTime));
    await chrome.storage.local.set({ [POSTED_KEY]: Array.from(set).sort((a, b) => b - a).slice(0, 200) });
  }
  async function saveFocusCompletion(session) {
    try {
      const { tm_auth_token, userId } = await chrome.storage.local.get(['tm_auth_token', 'userId']);
      const durationMin = Math.max(1, Math.round(session.duration || 25));
      const startIso = new Date(session.startTime).toISOString();
      const endIso = new Date(session.endTime).toISOString();
      if (tm_auth_token && userId) {
        const res = await backendFetch('/api/focus-sessions', {
          method: 'POST',
          body: JSON.stringify({ userId, duration: durationMin, startTime: startIso, endTime: endIso, status: 'completed', sessionType: 'focus' })
        });
        if (res.ok) {
          await addPosted(session.startTime);
          return true;
        }
      }
    } catch (e) {
      console.debug('saveFocusCompletion backend failed:', e?.message || String(e));
    }
    try {
      const { focusPending = [], focusHistory = [] } = await chrome.storage.local.get(['focusPending', 'focusHistory']);
      const record = {
        duration: Math.max(1, Math.round(session.duration || 25)),
        startTime: Number(session.startTime),
        endTime: Number(session.endTime),
        status: 'completed',
        date: new Date(session.startTime).toDateString(),
        sessionType: 'focus'
      };
      const uniq = focusHistory.filter(s => Number(s.startTime) !== Number(record.startTime));
      uniq.unshift(record);
      if (uniq.length > 50) uniq.length = 50;
      await chrome.storage.local.set({ focusHistory: uniq, focusPending: [...focusPending, record] });
    } catch (e) {
      console.debug('local fallback for focus completion failed:', e?.message || String(e));
    }
    return false;
  }
  async function focusTimerCheckTick() {
    try {
      const { focusSession } = await chrome.storage.local.get(['focusSession']);
      if (!focusSession || (!focusSession.isActive && !focusSession.isPaused)) return;
      const totalMs = (focusSession.duration || 25) * 60000;
      const start = Number(focusSession.startTime) || Date.now();
      const nowMark = focusSession.isPaused ? (Number(focusSession.pausedAt) || Date.now()) : Date.now();
      const elapsed = Math.max(0, nowMark - start);
      if (elapsed >= totalMs) {
        const posted = await getPostedSet();
        if (posted.has(Number(start))) {
          await chrome.storage.local.remove('focusSession');
          return;
        }
        const session = { duration: focusSession.duration, startTime: start, endTime: Date.now() };
        await saveFocusCompletion(session);
        notify('tm_focus_done', 'Focus Complete', 'Great job! Your focus session finished.');
        await chrome.storage.local.remove('focusSession');
      }
    } catch (e) {
      console.debug('focusTimerCheckTick error:', e?.message || String(e));
    }
  }
  try {
    chrome.alarms.clear('focusTimerCheck');
    chrome.alarms.create('focusTimerCheck', { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === 'focusTimerCheck') focusTimerCheckTick(); });
  } catch (e) {
    console.warn('focusTimerCheck alarm setup failed:', e);
  }
  try { focusTimerCheckTick(); } catch (_) {}
})();

function startPomodoroCycle() {
  if (pomodoroState.running) return;
  pomodoroState = { running: true, mode: "work", endsAt: Date.now() + POMODORO_DEFAULTS.workMinutes * 60000 };
  schedulePomodoroTick();
  notify("tm_pomo_start", "Focus Started", `Focus for ${POMODORO_DEFAULTS.workMinutes} minutes.`);
}

function stopPomodoroCycle() {
  pomodoroState = { running: false, mode: "work", endsAt: null };
  if (pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval = null;
  notify("tm_pomo_stop", "Pomodoro Stopped", "Timer stopped.");
}

function schedulePomodoroTick() {
  if (pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval = setInterval(() => {
    if (!pomodoroState.running) return;
    const remaining = pomodoroState.endsAt - Date.now();
    if (remaining <= 0) {
      pomodoroState = {
        running: true,
        mode: pomodoroState.mode === "work" ? "break" : "work",
        endsAt: Date.now() + (pomodoroState.mode === "work" ? POMODORO_DEFAULTS.breakMinutes : POMODORO_DEFAULTS.workMinutes) * 60000
      };
      notify(
        pomodoroState.mode === "break" ? "tm_pomo_break" : "tm_pomo_focus",
        pomodoroState.mode === "break" ? "Break Time" : "Focus Time",
        pomodoroState.mode === "break" ? "Great job! Take a short break." : "Break over! Back to focus."
      );
    }
  }, 1000);
}

chrome.commands?.onCommand.addListener((cmd) => {
  if (cmd === "tm_toggle_pomodoro") {
    pomodoroState.running ? stopPomodoroCycle() : startPomodoroCycle();
  }
});

class TimeTracker {
  constructor() {
    this.defaultSiteCategories = {
      "github.com": "Work", "stackoverflow.com": "Work", "leetcode.com": "Work",
      "youtube.com": "Entertainment", "instagram.com": "Social", "chatgpt.com": "Work",
      "reddit.com": "Social", "twitter.com": "Social", "linkedin.com": "Professional",
      "netflix.com": "Entertainment", "codechef.com": "Work"
    };
    this.siteCategories = { ...this.defaultSiteCategories };
    this.activeSessions = {};
    this.lastActiveTs = Date.now();
    this.initialize();
  }

  // Merge overlapping/contiguous session intervals and sum their durations
  sumMergedSessions(sessions) {
    try {
      const items = (Array.isArray(sessions) ? sessions : [])
        .filter(s => s && Number.isFinite(s.startTime) && Number.isFinite(s.endTime) && s.endTime > s.startTime)
        .map(s => ({ start: Number(s.startTime), end: Number(s.endTime) }))
        .sort((a, b) => a.start - b.start);
      if (!items.length) return 0;
      let total = 0;
      let curStart = items[0].start;
      let curEnd = items[0].end;
      for (let i = 1; i < items.length; i++) {
        const it = items[i];
        if (it.start <= curEnd) {
          if (it.end > curEnd) curEnd = it.end;
        } else {
          total += (curEnd - curStart);
          curStart = it.start;
          curEnd = it.end;
        }
      }
      total += (curEnd - curStart);
      return Math.max(0, total);
    } catch (_) {
      return 0;
    }
  }

  // Compute safe duration with 30-minute gap detection and per-session cap
  calculateDurationWithGapCheck(startTime, lastSavedAt, nowTs) {
    const GAP_MS = 30 * 60 * 1000;
    const MAX_SESSION = 12 * 60 * 60 * 1000;
    const safeStart = Number(startTime) || Date.now();
    const safeLast = Number.isFinite(lastSavedAt) ? Number(lastSavedAt) : safeStart;
    const now = Number.isFinite(nowTs) ? Number(nowTs) : Date.now();
    if (now - safeLast > GAP_MS) {
      // Inactive gap: close at lastSavedAt
      const dur = Math.max(0, Math.min(MAX_SESSION, safeLast - safeStart));
      return { duration: dur, endAt: safeLast, gap: true };
    }
    const dur = Math.max(0, Math.min(MAX_SESSION, now - safeStart));
    return { duration: dur, endAt: now, gap: false };
  }

  async initialize() {
    const data = await chrome.storage.local.get(["siteCategories", "activeSessions", "tm_auth_token", "lastActiveTs"]);
    this.siteCategories = { ...this.defaultSiteCategories, ...(data.siteCategories || {}) };
    this.activeSessions = data.activeSessions || {};
    if (Number.isFinite(data.lastActiveTs)) this.lastActiveTs = data.lastActiveTs;
    await chrome.storage.local.set({ siteCategories: this.siteCategories });
    if (!data.tm_auth_token && chrome.action) {
      try {
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
      } catch (_) {}
    }
    this.startPeriodicSync();
  }

  async handleTabChange(tab) {
    if (!tab?.url || !tab.active) return;
    const domain = getDomainFromUrl(tab.url);
    const tabId = tab.id.toString();
    const now = Date.now();
    this.lastActiveTs = now;
    await chrome.storage.local.set({ lastActiveTs: now });
    const others = Object.entries(this.activeSessions).filter(([id]) => id !== tabId);
    if (others.length) {
      for (const [otherId, sess] of others) {
        const { domain: d, startTime: st, lastSavedAt: lsa } = sess || {};
        if (d && Number.isFinite(st)) {
          const { duration, endAt } = this.calculateDurationWithGapCheck(st, lsa, now);
          if (duration > 0) await this.saveSession(d, st, endAt, duration);
        }
        delete this.activeSessions[otherId];
      }
      await chrome.storage.local.set({ activeSessions: this.activeSessions });
    }
    if (!domain) {
      if (this.activeSessions[tabId]) {
        const { domain: prevDomain, startTime: prevStart, lastSavedAt: lsa } = this.activeSessions[tabId];
        if (prevDomain) {
          const { duration, endAt } = this.calculateDurationWithGapCheck(prevStart, lsa, now);
          if (duration > 0) await this.saveSession(prevDomain, prevStart, endAt, duration);
        }
        delete this.activeSessions[tabId];
        await chrome.storage.local.set({ activeSessions: this.activeSessions });
      }
      return;
    }
    if (this.activeSessions[tabId]?.domain === domain) return;
    if (this.activeSessions[tabId]) {
      const { domain: prevDomain, startTime: prevStart, lastSavedAt: lsa } = this.activeSessions[tabId];
      if (prevDomain) {
        const { duration, endAt } = this.calculateDurationWithGapCheck(prevStart, lsa, now);
        if (duration > 0) await this.saveSession(prevDomain, prevStart, endAt, duration);
      }
    }
    this.activeSessions[tabId] = { domain, startTime: now, lastSavedAt: now };
    await chrome.storage.local.set({ activeSessions: this.activeSessions });
  }

  async saveSession(domain, startTime, endTime, duration, category = null) {
    if (!domain || typeof duration !== 'number' || duration <= 0) return;
    const MAX_SESSION = 12 * 60 * 60 * 1000;
    if (duration > MAX_SESSION) duration = MAX_SESSION;
    const timezoneOffsetMinutes = new Date().getTimezoneOffset();
    const localDate = new Date(startTime - timezoneOffsetMinutes * 60000).toISOString().split("T")[0];

    // Abrupt duration guard: cap added duration to remaining time in the user's local day
    try {
      const { timeData = {} } = await chrome.storage.local.get(["timeData"]);
      const existing = timeData?.[localDate]?.[domain]?.sessions || [];
      const existingTotal = this.sumMergedSessions(existing);
      const dayStartLocalMs = new Date(`${localDate}T00:00:00.000Z`).getTime();
      const endLocalCoord = (Math.min(endTime, Date.now()) - (timezoneOffsetMinutes * 60000));
      const elapsedInDay = Math.max(0, endLocalCoord - dayStartLocalMs);
      const MAX_DAILY = 24 * 60 * 60 * 1000;
      const dayCap = Math.min(MAX_DAILY, elapsedInDay + 60 * 1000); // +60s grace
      const remaining = Math.max(0, dayCap - existingTotal);
      if (duration > remaining) duration = remaining;
      if (duration <= 0) return; // nothing reasonable to add
      if ((endTime - startTime) > duration) endTime = startTime + duration;
    } catch (_) { /* best-effort */ }
    const { userEmail, tm_auth_token } = await chrome.storage.local.get(["userEmail", "tm_auth_token"]);
    if (!userEmail || !tm_auth_token) {
      await this.storeSessionLocally(domain, startTime, endTime, duration, category, timezoneOffsetMinutes);
      return;
    }
    const payload = {
      userEmail, date: localDate, domain,
      sessions: [{ startTime, endTime, duration }],
      category: category || this.siteCategories[domain] || "Other",
      timezone: timezoneOffsetMinutes
    };
    const res = await backendFetch("/api/time-data/sync", { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) await this.storeSessionLocally(domain, startTime, endTime, duration, category, timezoneOffsetMinutes);
    // Update lastSavedAt for any active session of this domain/tab if present
    try {
      for (const [id, sess] of Object.entries(this.activeSessions)) {
        if (sess?.domain === domain && sess?.startTime === startTime) {
          this.activeSessions[id].lastSavedAt = endTime;
        }
      }
    } catch (_) {}
  }

  async storeSessionLocally(domain, start, end, duration, category = null, timezone = new Date().getTimezoneOffset()) {
    if (!domain || typeof duration !== 'number' || duration <= 0) return;
    const MAX = 12 * 60 * 60 * 1000;
    if (duration > MAX) duration = MAX;
    const currentDate = new Date(start - timezone * 60000).toISOString().split("T")[0];
    const { timeData = {} } = await chrome.storage.local.get(["timeData"]);
    if (!timeData[currentDate]) timeData[currentDate] = {};
    if (!timeData[currentDate][domain]) timeData[currentDate][domain] = { sessions: [], category: category || this.siteCategories[domain] || "Other" };
    timeData[currentDate][domain].sessions.push({ startTime: start, endTime: end, duration });
    await chrome.storage.local.set({ timeData });
  }

  async endAllSessions(endTs = Date.now()) {
    for (const [tabId, { domain, startTime, lastSavedAt }] of Object.entries(this.activeSessions)) {
      if (domain && Number.isFinite(startTime)) {
        const { duration, endAt } = this.calculateDurationWithGapCheck(startTime, lastSavedAt, endTs);
        if (duration > 0) await this.saveSession(domain, startTime, endAt, duration);
      }
      delete this.activeSessions[tabId];
    }
    await chrome.storage.local.set({ activeSessions: this.activeSessions });
  }

  async syncPendingData() {
    const { timeData = {}, userEmail, tm_auth_token } = await chrome.storage.local.get(["timeData", "userEmail", "tm_auth_token"]);
    if (!userEmail || !tm_auth_token || !Object.keys(timeData).length) return;
    const dataToSync = { ...timeData };
    for (const date in dataToSync) {
      for (const domain in dataToSync[date]) {
        const entry = dataToSync[date][domain];
        if (!domain || !entry || !Array.isArray(entry.sessions)) {
          delete dataToSync[date][domain];
          continue;
        }
        const payload = { userEmail, date, domain, sessions: entry.sessions, category: entry.category || this.siteCategories[domain] || 'Other' };
        const res = await backendFetch('/api/time-data/sync', { method: 'POST', body: JSON.stringify(payload) });
        if (res.ok) delete dataToSync[date][domain];
      }
      if (!Object.keys(dataToSync[date]).length) delete dataToSync[date];
    }
    await chrome.storage.local.set({ timeData: dataToSync });
  }

  startPeriodicSync() {
    const alarms = [
      { name: "periodicSync", period: 5 },
      { name: "endAllSessions", period: 15 },
      { name: "activeFlush", period: 1 },
      { name: "keepAlivePing", period: 2 }
    ];
    for (const { name, period } of alarms) {
      chrome.alarms.clear(name);
      chrome.alarms.create(name, { periodInMinutes: period });
    }
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "periodicSync") this.syncPendingData();
      else if (alarm.name === "endAllSessions") this.endAllSessions();
      else if (alarm.name === "activeFlush") this.flushActiveLongSessions();
      else if (alarm.name === "keepAlivePing") pingHealth();
    });
  }

  async flushActiveLongSessions() {
    const FLUSH_MS = 60 * 1000;
    const now = Date.now();
    this.lastActiveTs = now;
    await chrome.storage.local.set({ lastActiveTs: now });
    for (const [tabId, sess] of Object.entries(this.activeSessions)) {
      const { domain, startTime, lastSavedAt } = sess || {};
      if (!domain || !Number.isFinite(startTime)) continue;
      const elapsed = now - startTime;
      const { duration, endAt, gap } = this.calculateDurationWithGapCheck(startTime, lastSavedAt, now);
      if (gap || elapsed >= FLUSH_MS) {
        if (duration > 0) await this.saveSession(domain, startTime, endAt, duration);
        this.activeSessions[tabId].startTime = now;
        this.activeSessions[tabId].lastSavedAt = now;
      }
    }
    await chrome.storage.local.set({ activeSessions: this.activeSessions });
  }

  async saveSiteCategories() {
    await chrome.storage.local.set({ siteCategories: this.siteCategories });
  }
}

const tracker = new TimeTracker();

async function initializeStorage() {
  try {
    const { blockedSites: sites = [], blockedKeywords: keywords = [] } = await chrome.storage.local.get(['blockedSites', 'blockedKeywords']);
    blockedSites = new Map(Array.isArray(sites) ? sites : []);
    blockedKeywords = new Map(Array.isArray(keywords) ? keywords : []);
  } catch (e) {
    console.error('initializeStorage error:', e);
    blockedSites = new Map();
    blockedKeywords = new Map();
  }
}

function getDomainFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) return null;
    return url.hostname.replace(/^www\./, "");
  } catch (_) {
    return null;
  }
}

async function checkBlockedSite(url) {
  if (!url) return { blocked: false };
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '').toLowerCase();
    const fullUrl = url.toLowerCase();
    let decodedUrl = fullUrl;
    try { decodedUrl = decodeURIComponent(fullUrl); } catch (_) { /* ignore decode errors */ }
    for (const [blockedDomain, config] of blockedSites) {
      if (!config?.enabled) continue;
      const b = blockedDomain.toLowerCase();
      if (domain === b || domain.endsWith('.' + b)) return { blocked: true, type: 'site', item: blockedDomain };
    }
    for (const [keyword, config] of blockedKeywords) {
      if (!config?.enabled || !keyword) continue;
      const kw = keyword.toLowerCase();
      // Match keyword as token in domain OR anywhere in encoded/decoded URL
      if (
        domain.split('.').some(part => part === kw) ||
        fullUrl.includes(kw) ||
        decodedUrl.includes(kw)
      ) {
        return { blocked: true, type: 'keyword', item: keyword };
      }
    }
    return { blocked: false };
  } catch (_) {
    return { blocked: false };
  }
}

async function blockWebsite(tab, blockInfo) {
  if (!tab?.id) return;
  try {
    const domain = getDomainFromUrl(tab.url) || 'unknown';
    const blockedPageUrl = `${chrome.runtime.getURL('blocked.html')}?domain=${encodeURIComponent(domain)}&type=${encodeURIComponent(blockInfo.type)}&item=${encodeURIComponent(blockInfo.item)}`;
    await chrome.tabs.update(tab.id, { url: blockedPageUrl });
  } catch (e) {
    try { await chrome.tabs.update(tab.id, { url: 'chrome://newtab/' }); } catch (_) {}
  }
}

chrome.runtime.onStartup.addListener(async () => {
  await initializeStorage();
  const { lastActiveTs } = await chrome.storage.local.get(['lastActiveTs']);
  if (Number.isFinite(lastActiveTs)) await tracker.endAllSessions(lastActiveTs);
  await tracker.syncPendingData();
});

chrome.runtime.onSuspend.addListener(async () => {
  const now = Date.now();
  tracker.lastActiveTs = now;
  await chrome.storage.local.set({ lastActiveTs: now });
  await tracker.endAllSessions(now);
  await tracker.syncPendingData();
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (!tab) return;
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      const blockInfo = await checkBlockedSite(tab.url);
      if (blockInfo.blocked) return blockWebsite(tab, blockInfo);
    }
    tracker.handleTabChange(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || (changeInfo.status === "complete" && tab.active)) {
    (async () => {
      if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        const blockInfo = await checkBlockedSite(changeInfo.url || tab.url);
        if (blockInfo.blocked) return blockWebsite(tab, blockInfo);
      }
      tracker.handleTabChange(tab);
    })();
  }
});


chrome.tabs.onCreated.addListener((tab) => {
  if (tab.active) tracker.handleTabChange(tab);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const tabIdStr = tabId.toString();
  if (tracker.activeSessions[tabIdStr]) {
    const { domain, startTime, lastSavedAt } = tracker.activeSessions[tabIdStr];
    if (domain && Number.isFinite(startTime)) {
      const now = Date.now();
      const { duration, endAt } = tracker.calculateDurationWithGapCheck(startTime, lastSavedAt, now);
      if (duration > 0) await tracker.saveSession(domain, startTime, endAt, duration);
    }
    delete tracker.activeSessions[tabIdStr];
    await chrome.storage.local.set({ activeSessions: tracker.activeSessions });
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await tracker.endAllSessions();
    await tracker.syncPendingData();
    return;
  }
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    const tab = tabs[0];
    if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      const blockInfo = await checkBlockedSite(tab.url);
      if (blockInfo.blocked) return blockWebsite(tab, blockInfo);
    }
    if (tab) tracker.handleTabChange(tab);
  } catch (e) {
    console.debug('onFocusChanged error:', e?.message || String(e));
  }
});

chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "idle" || state === "locked") {
    await tracker.endAllSessions();
  } else if (state === "active") {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) tracker.handleTabChange(tabs[0]);
  }
});

function formatDurationBg(ms) {
  if (isNaN(ms) || ms < 0) return '0m';
  const MAX = 24 * 60 * 60 * 1000;
  if (ms > MAX) ms = MAX;
  const s = Math.floor(ms / 1000);
  if (s === 0) return '0m';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function buildQuickChartUrlBg(config, { w = 700, h = 360, bkg = 'white', devicePixelRatio = 2 } = {}) {
  const c = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?w=${w}&h=${h}&bkg=${encodeURIComponent(bkg)}&devicePixelRatio=${devicePixelRatio}&c=${c}`;
}

function generateEmailReportBg(timeData, date) {
  if (!Array.isArray(timeData) || !timeData.length) {
    return `TimeMachine Daily Report - ${new Date(date).toLocaleDateString()}\n\nNo activity tracked for today.\n\nStay productive!\nTimeMachine Extension`;
  }
  const categoryData = { Work: 0, Social: 0, Entertainment: 0, Professional: 0, Other: 0 };
  let totalTime = 0;
  const domainTimes = timeData.map(entry => {
    const time = entry.totalTime || 0;
    totalTime += time;
    const category = entry.category || 'Other';
    categoryData[category] += time;
    return { domain: entry.domain, time, category };
  }).sort((a, b) => b.time - a.time);
  const productiveTime = categoryData.Work + categoryData.Professional + categoryData.Other * 0.5;
  const productivityScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
  let report = `TimeMachine Daily Report - ${new Date(date).toLocaleDateString()}\n\n📊 DAILY SUMMARY:\nTotal Time Online: ${formatDurationBg(totalTime)}\nProductivity Score: ${productivityScore}%\nUnique Sites: ${domainTimes.length}\n\n🏆 TOP SITES:`;
  domainTimes.slice(0, 5).forEach((site, i) => {
    const percentage = totalTime > 0 ? ((site.time / totalTime) * 100).toFixed(1) : 0;
    report += `\n${i + 1}. ${site.domain}: ${formatDurationBg(site.time)} (${percentage}%)`;
  });
  report += `\n\n📈 BY CATEGORY:`;
  for (const [category, time] of Object.entries(categoryData)) {
    if (time > 0) report += `\n${category}: ${formatDurationBg(time)} (${((time / totalTime) * 100).toFixed(1)}%)`;
  }
  const insight = productivityScore >= 70 ? '🎉 Great job! Highly productive day.' : productivityScore >= 40 ? '💪 Good work! Room for improvement.' : '🎯 Focus time! Try productive activities.';
  return `${report}\n\n💡 INSIGHT: ${insight}\n\nKeep tracking your time!\nTimeMachine Extension`;
}

function generateEmailHtmlReportBg(timeData, date) {
  const hasData = Array.isArray(timeData) && timeData.length > 0;
  const displayDate = new Date(date).toLocaleDateString();
  if (!hasData) {
    return `<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.5"><h2 style="margin:0 0 6px">TimeMachine Daily Report</h2><div style="color:#666;font-size:12px;margin:0 0 12px">${displayDate}</div><p>No activity tracked for today.</p><p style="margin-top:16px;color:#666;font-size:12px">Sent via TimeMachine</p></div>`;
  }
  const categoryData = { Work: 0, Social: 0, Entertainment: 0, Professional: 0, Other: 0 };
  let totalTime = 0, totalSessions = 0, longestSession = 0, firstStart = null, lastEnd = null;
  const domains = timeData.map(entry => {
    const time = entry.totalTime || 0;
    totalTime += time;
    const category = entry.category || 'Other';
    categoryData[category] += time;
    const sessions = Array.isArray(entry.sessions) ? entry.sessions : [];
    totalSessions += sessions.length;
    sessions.forEach(s => {
      const dur = s?.duration || 0;
      if (dur > longestSession) longestSession = dur;
      const st = s?.startTime ? new Date(s.startTime) : null;
      const en = s?.endTime ? new Date(s.endTime) : null;
      if (st && (!firstStart || st < firstStart)) firstStart = st;
      if (en && (!lastEnd || en > lastEnd)) lastEnd = en;
    });
    return { domain: entry.domain, time, category, sessions };
  }).sort((a, b) => b.time - a.time);
  const productiveTime = categoryData.Work + categoryData.Professional + categoryData.Other * 0.5;
  const productivityScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
  const uniqueDomains = domains.length;
  const spanText = firstStart && lastEnd ? `${firstStart.toLocaleTimeString()} – ${lastEnd.toLocaleTimeString()}` : '—';
  const palette = { work: "#3b82f6", social: "#ef4444", entertainment: "#8b5cf6", professional: "#10b981", other: "#6b7280" };
  const doughnutCfg = {
    type: 'doughnut',
    data: { labels: Object.keys(categoryData), datasets: [{ data: Object.values(categoryData), backgroundColor: Object.values(palette), borderWidth: 0 }] },
    options: { plugins: { legend: { display: true, position: 'right' } }, cutout: '60%' }
  };
  const barCfg = {
    type: 'bar',
    data: { labels: domains.slice(0, 10).map(d => d.domain), datasets: [{ label: 'Time (min)', data: domains.slice(0, 10).map(d => Math.round((d.time || 0) / 60000)), backgroundColor: '#3b82f6', borderWidth: 0 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }
  };
  const doughnutUrl = buildQuickChartUrlBg(doughnutCfg, { w: 640, h: 320 });
  const barUrl = buildQuickChartUrlBg(barCfg, { w: 700, h: 400 });
  const domainRows = domains.slice(0, 10).map((d, i) => {
    const pct = totalTime ? ((d.time / totalTime) * 100).toFixed(1) : '0.0';
    return `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${i + 1}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${d.domain}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${formatDurationBg(d.time)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${d.category}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${pct}%</td></tr>`;
  }).join('');
  const insight = productivityScore >= 70 ? 'Great job! Highly productive day.' : productivityScore >= 40 ? 'Good work! Room for improvement.' : 'Focus time! Try productive activities.';
  return `<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.5"><h2 style="margin:0 0 6px">TimeMachine Daily Report</h2><div style="color:#666;font-size:12px;margin:0 0 12px">${displayDate}</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 12px"><tr><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Total Time</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${formatDurationBg(totalTime)}</td><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Productivity</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${productivityScore}%</td></tr><tr><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Unique Domains</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${uniqueDomains}</td><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Sessions</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${totalSessions}</td></tr><tr><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Longest Session</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${formatDurationBg(longestSession)}</td><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Active Span</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${spanText}</td></tr></table><div style="margin:12px 0 8px;font-weight:600">Category Distribution</div><img src="${doughnutUrl}" alt="Category Chart" width="640" height="320" style="display:block;border:1px solid #eee;border-radius:6px" /><div style="margin:16px 0 8px;font-weight:600">Top Domains</div><img src="${barUrl}" alt="Top Domains Chart" width="700" height="400" style="display:block;border:1px solid #eee;border-radius:6px" /><div style="margin:18px 0 6px;font-weight:600">Top Domains Table</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse"><thead><tr><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">#</th><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">Domain</th><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">Time</th><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">Category</th><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">Share</th></tr></thead><tbody>${domainRows}</tbody></table><p style="margin-top:16px;color:#666;font-size:12px">Charts by QuickChart.</p><p style="margin-top:6px;color:#666;font-size:12px">Sent via TimeMachine</p></div>`;
}

async function emailJsSendBg(templateParams, settings) {
  if (!settings?.serviceId || !settings?.templateId || !settings?.publicKey) throw new Error('EmailJS not configured');
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: settings.serviceId, template_id: settings.templateId, user_id: settings.publicKey, template_params: templateParams })
  });
  if (!res.ok) throw new Error(`EmailJS ${res.status}: ${await res.text()}`);
}

async function checkForTodayActivityBg(userEmail) {
  if (!userEmail) return false;
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const timezone = new Date().getTimezoneOffset();
    const resp = await backendFetch(`/api/time-data/report/${encodeURIComponent(userEmail)}?date=${dateStr}&endDate=${dateStr}&timezone=${timezone}`);
    if (!resp.ok) return false;
    const arr = await resp.json();
    return Array.isArray(arr) ? arr.length > 0 : Array.isArray(arr?.data) && arr.data.length > 0;
  } catch (_) {
    return false;
  }
}

async function sendScheduledReportFromBackground(force = false) {
  const { reportSending } = await chrome.storage.local.get(["reportSending"]);
  if (reportSending) return false;
  await chrome.storage.local.set({ reportSending: true });
  try {
    const { userEmail, emailConfig, lastReportSent, reportScheduleSettings } = await chrome.storage.local.get(['userEmail', 'emailConfig', 'lastReportSent', 'reportScheduleSettings']);
    if (!userEmail || !emailConfig?.enabled || emailConfig.service !== 'emailjs') return false;
    if (!force && lastReportSent && new Date(lastReportSent).toDateString() === new Date().toDateString()) return false;
    if (!reportScheduleSettings?.includeInactive && !(await checkForTodayActivityBg(userEmail))) return false;
    const dateStr = new Date().toISOString().split('T')[0];
    const timezone = new Date().getTimezoneOffset();
    const resp = await backendFetch(`/api/time-data/report/${encodeURIComponent(userEmail)}?date=${dateStr}&endDate=${dateStr}&timezone=${timezone}`);
    if (!resp.ok) throw new Error(`Failed to fetch report data: ${resp.status}`);
    const timeData = await resp.json();
    const arr = Array.isArray(timeData) ? timeData : (Array.isArray(timeData?.data) ? timeData.data : []);
    const html = generateEmailHtmlReportBg(arr, dateStr);
    const text = generateEmailReportBg(arr, dateStr);
    await emailJsSendBg({ to_email: userEmail, subject: `TimeMachine Daily Report - ${new Date(dateStr).toLocaleDateString()}`, message: html, message_text: text }, emailConfig.settings);
    notify('tm_report_sent', 'TimeMachine', 'Daily report sent to your email.');
    await chrome.storage.local.set({ lastReportSent: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error('sendScheduledReportFromBackground error:', e);
    return false;
  } finally {
    await chrome.storage.local.set({ reportSending: false });
  }
}

function withinScheduledWindow(now, scheduledTime, windowMinutes = 60) {
  const [hh, mm] = (scheduledTime || '18:00').split(':').map(Number);
  const sched = new Date(now);
  sched.setHours(hh || 18, mm || 0, 0, 0);
  const diffMs = now - sched;
  return diffMs >= 0 && diffMs <= windowMinutes * 60000;
}

async function reportScheduleTick() {
  try {
    const { reportScheduleSettings, lastReportSent } = await chrome.storage.local.get(['reportScheduleSettings', 'lastReportSent']);
    if (!reportScheduleSettings?.enabled) return;
    const now = new Date();
    if (!withinScheduledWindow(now, reportScheduleSettings.time || '18:00')) return;
    if (reportScheduleSettings.frequency === 'weekly' && now.getDay() !== Number(reportScheduleSettings.day || 1)) return;
    if (reportScheduleSettings.frequency === 'monthly' && now.getDate() !== Number(reportScheduleSettings.day || 1)) return;
    if (lastReportSent && new Date(lastReportSent).toDateString() === now.toDateString()) return;
    await sendScheduledReportFromBackground();
  } catch (e) {
    console.error('reportScheduleTick error:', e);
  }
}

try {
  chrome.alarms.clear('reportScheduleCheck');
  chrome.alarms.create('reportScheduleCheck', { periodInMinutes: 5 });
  chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === 'reportScheduleCheck') reportScheduleTick(); });
  console.log('Report schedule check alarm scheduled.');
} catch (e) {
  console.warn('Failed to set report schedule alarm:', e);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case "recheckBlockActiveTab":
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const tab = tabs[0];
          if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            const blockInfo = await checkBlockedSite(tab.url);
            if (blockInfo.blocked) await blockWebsite(tab, blockInfo);
          }
          sendResponse({ status: 'ok' });
          break;
        case "getPomodoroState":
          sendResponse({ state: pomodoroState, defaults: POMODORO_DEFAULTS });
          break;
        case "togglePomodoro":
          pomodoroState.running ? stopPomodoroCycle() : startPomodoroCycle();
          sendResponse({ state: pomodoroState });
          break;
        case "updateCategory":
          try {
            const { domain, category, userEmail, date } = request;
            if (!domain || !category || !userEmail || !date || !ALLOWED_CATEGORIES.includes(category)) {
              sendResponse({ status: 'error', error: 'Invalid request parameters' });
              break;
            }
            
            // Update local tracker
            tracker.siteCategories[domain] = category;
            await tracker.saveSiteCategories();
            
            // Try to sync with backend
            const payload = { userEmail, date, domain, category };
            const res = await backendFetch('/api/time-data/category', { method: 'PATCH', body: JSON.stringify(payload) });
            
            if (!res.ok) {
              console.warn('Backend sync failed, storing locally:', res.status);
              await tracker.storeSessionLocally(domain, Date.now(), Date.now(), 1, category);
            }
            
            sendResponse({ status: 'success', message: 'Category updated successfully' });
          } catch (error) {
            console.error('updateCategory error:', error);
            sendResponse({ status: 'error', error: error.message || 'Failed to update category' });
          }
          break;
        case "addBlockedSite":
          if (!request.domain) return sendResponse({ success: false, error: 'No domain provided' });
          blockedSites.set(request.domain, { enabled: true, ...(request.config || {}) });
          await chrome.storage.local.set({ blockedSites: Array.from(blockedSites.entries()) });
          sendResponse({ success: true });
          break;
        case "addBlockedKeyword":
          if (!request.keyword) return sendResponse({ success: false, error: 'No keyword provided' });
          blockedKeywords.set(request.keyword, { enabled: true, ...(request.config || {}) });
          await chrome.storage.local.set({ blockedKeywords: Array.from(blockedKeywords.entries()) });
          sendResponse({ success: true });
          break;
        case "getBlockedSites":
          sendResponse({ sites: Array.from(blockedSites.entries()) });
          break;
        case "getBlockedKeywords":
          sendResponse({ keywords: Array.from(blockedKeywords.entries()) });
          break;
        case "removeBlockedSite":
          if (!request.domain) return sendResponse({ success: false, error: 'No domain provided' });
          blockedSites.delete(request.domain);
          await chrome.storage.local.set({ blockedSites: Array.from(blockedSites.entries()) });
          sendResponse({ success: true });
          break;
        case "removeBlockedKeyword":
          if (!request.keyword) return sendResponse({ success: false, error: 'No keyword provided' });
          blockedKeywords.delete(request.keyword);
          await chrome.storage.local.set({ blockedKeywords: Array.from(blockedKeywords.entries()) });
          sendResponse({ success: true });
          break;
        case "toggleBlockedSite":
          const cfgSite = blockedSites.get(request.domain);
          if (!cfgSite) return sendResponse({ success: false, error: 'Site not found' });
          cfgSite.enabled = !cfgSite.enabled;
          await chrome.storage.local.set({ blockedSites: Array.from(blockedSites.entries()) });
          sendResponse({ success: true, enabled: cfgSite.enabled });
          break;
        case "toggleBlockedKeyword":
          const cfgKeyword = blockedKeywords.get(request.keyword);
          if (!cfgKeyword) return sendResponse({ success: false, error: 'Keyword not found' });
          cfgKeyword.enabled = !cfgKeyword.enabled;
          await chrome.storage.local.set({ blockedKeywords: Array.from(blockedKeywords.entries()) });
          sendResponse({ success: true, enabled: cfgKeyword.enabled });
          break;
        case "syncBlockedSites":
          if (!Array.isArray(request.sites)) return sendResponse({ success: false, error: 'Invalid sites payload' });
          blockedSites = new Map(request.sites);
          await chrome.storage.local.set({ blockedSites: Array.from(blockedSites.entries()) });
          sendResponse({ success: true, sites: Array.from(blockedSites.entries()) });
          break;
        case "syncBlockedKeywords":
          if (!Array.isArray(request.keywords)) return sendResponse({ success: false, error: 'Invalid keywords payload' });
          blockedKeywords = new Map(request.keywords);
          await chrome.storage.local.set({ blockedKeywords: Array.from(blockedKeywords.entries()) });
          sendResponse({ success: true, keywords: Array.from(blockedKeywords.entries()) });
          break;
        case "contentKeywordDetected":
          // Content script detected keyword within page content; re-check including page URL and block.
          if (!request.keyword) return sendResponse({ status: 'ignored' });
          try {
            const candidateUrl = request.url || sender?.tab?.url;
            const info = candidateUrl ? await checkBlockedSite(candidateUrl) : { blocked: false };
            const tabToBlock = sender?.tab || (await (async () => {
              try {
                const tabsMatch = await chrome.tabs.query({ active: true, currentWindow: true });
                return tabsMatch[0];
              } catch { return null; }
            })());
            if (tabToBlock) {
              await blockWebsite(tabToBlock, { type: 'keyword', item: request.keyword });
              sendResponse({ status: 'blocked', preMatched: info.blocked });
            } else {
              sendResponse({ status: 'no-active-tab' });
            }
          } catch (e) {
            console.warn('contentKeywordDetected handling failed:', e);
            sendResponse({ status: 'error', error: e?.message || String(e) });
          }
          break;
        case "stopFocusSession":
        case "completeFocusSession":
          sendResponse({ status: 'ok' });
          break;
        case "forceFlushSessions":
        case "triggerImmediateSync":
          await tracker.endAllSessions();
          await tracker.syncPendingData();
          sendResponse({ status: request.action === 'forceFlushSessions' ? 'flushed' : 'synced' });
          break;
        case "authSuccess":
          if (chrome.action) chrome.action.setBadgeText({ text: "" });
          await tracker.endAllSessions();
          await tracker.syncPendingData();
          sendResponse({ status: 'ok' });
          break;
        case "sendDailyReport":
          const ok = await sendScheduledReportFromBackground(true);
          sendResponse({ status: ok ? 'sent' : 'skipped' });
          break;
        case "setBackendUrl":
          if (typeof request.url !== 'string') return sendResponse({ status: 'error', error: 'Invalid URL' });
          _backendCache = request.url.replace(/\/$/, '');
          await chrome.storage.local.set({ tmBackendUrl: _backendCache });
          sendResponse({ status: 'ok', url: _backendCache });
          break;
        default:
          sendResponse({ status: 'error', error: 'Unknown action' });
      }
    } catch (e) {
      sendResponse({ status: 'error', error: e?.message || String(e) });
    }
  })();
  return true;
});

initializeStorage().then(() => console.log('Guard storage initialized'));