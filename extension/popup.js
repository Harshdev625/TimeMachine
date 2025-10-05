import reportScheduler from './report-scheduler.js';
import { resolveBackendUrl as sharedResolveBackendUrl, apiCall as sharedApiCall } from './modules/api.js';
import { formatDuration as sharedFormatDuration } from './modules/utils.js';

const CONFIG = {
  EMAIL_CONFIG: { enabled: false, service: null, settings: {} },
  CHART_COLORS: {
    light: { work: "#3b82f6", social: "#ef4444", entertainment: "#8b5cf6", professional: "#10b981", other: "#6b7280" },
    dark: { work: "#60a5fa", social: "#f87171", entertainment: "#a78bfa", professional: "#34d399", other: "#9ca3af" },
    cyberpunk: { work: "#00ff9f", social: "#ff0080", entertainment: "#00d4ff", professional: "#ffff00", other: "#8000ff" },
    minimal: { work: "#1f2937", social: "#7c3aed", entertainment: "#059669", professional: "#dc2626", other: "#64748b" },
    ocean: { work: "#0ea5e9", social: "#06b6d4", entertainment: "#3b82f6", professional: "#0891b2", other: "#64748b" },
    sunset: { work: "#f59e0b", social: "#ef4444", entertainment: "#f97316", professional: "#eab308", other: "#6b7280" },
    forest: { work: "#059669", social: "#dc2626", entertainment: "#16a34a", professional: "#15803d", other: "#6b7280" }
  },
  CHART_CONFIG: {
    type: "doughnut",
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { font: { family: "inherit" } } },
        tooltip: { callbacks: { label: context => `${context.label}: ${sharedFormatDuration(context.raw)}` } }
      },
      cutout: "65%"
    }
  }
};

const ELEMENTS = {
  emailPrompt: 'emailPrompt', mainApp: 'mainApp', userEmailInput: 'userEmailInput', userPasswordInput: 'userPasswordInput',
  toggleAuthMode: 'toggleAuthMode', saveEmailBtn: 'saveEmailBtn', emailError: 'emailError', errorDisplay: 'errorDisplay',
  toggleThemeBtn: 'toggleThemeBtn', themeDropdown: 'themeDropdown', themeOptions: '.theme-option', updateNotification: 'updateNotification',
  closeNotification: 'closeNotification', updateMessage: 'updateMessage', feedbackToast: 'feedbackToast', emailDisplay: 'emailDisplay',
  userEmailSettings: 'userEmail', updateEmailBtn: 'updateEmailBtn', helpBtn: 'helpBtn', editEmailBtn: 'editEmailBtn',
  testEmailBtn: 'testEmailBtn', feedbackMessage: 'feedbackMessage', sendFeedbackBtn: 'sendFeedbackBtn',
  charCount: 'charCount', tabButtons: '.nav-pill', mainTabButtons: '.main-tab-btn, .main-tab', insightsTabContent: 'analyticsTabContent',
  settingsTabContent: 'settingsTabContent', statsDiv: 'stats', productivityScore: 'productivityScore', dateRangeDisplay: 'dateRangeDisplay',
  siteList: '.site-list', sendReportBtn: 'sendReportBtn', emailServiceSelect: 'emailServiceSelect', emailjsConfig: 'emailjsConfig',
  emailjsServiceId: 'emailjsServiceId', emailjsTemplateId: 'emailjsTemplateId', emailjsPublicKey: 'emailjsPublicKey',
  saveEmailConfig: 'saveEmailConfig', pomodoroToggle: 'pomodoroToggle', pomodoroStatus: 'pomodoroStatus', settingsBtn: 'settingsBtn',
  backToInsightsBtn: 'backToInsightsBtn', dailyFocusTime: 'dailyFocusTime', timerLabel: 'timerLabel', focusProgressBar: 'focusProgressBar',
  focusSettings: 'focusSettingsBtn', focusSessionsList: 'focusSessionsList', stopwatchTabContent: 'stopwatchTabContent',
  activeSessionCard: 'activeSessionCard', newSessionCard: 'newSessionCard', sessionTitle: 'sessionTitle', sessionCategory: 'sessionCategory',
  sessionSite: 'sessionSite', stopwatchTime: 'stopwatchTime', pauseResumeBtn: 'pauseResumeBtn', completeBtn: 'completeBtn',
  abandonBtn: 'abandonBtn', startSessionBtn: 'startSessionBtn', sessionHistory: 'sessionHistory', historyFilter: 'historyFilter',
  quickCategory: 'quickCategory', detectedTitle: 'detectedTitle', detectedUrl: 'detectedUrl', sessionsList: 'sessionsList',
  dailyProblems: 'dailyProblems', dailyTime: 'dailyTime', completedCount: 'completedCount', totalTime: 'totalTime', streakCount: 'streakCount',
  summaryDate: 'summaryDate'
};

const THEMES = ["light", "dark", "cyberpunk", "minimal", "ocean", "sunset", "forest"];
const BACKEND_URL_TTL = 5 * 60 * 1000;
let backendUrlCache = { value: null, ts: 0 };
let currentTheme = localStorage.getItem("theme") || "light";
let currentSubTab = "daily";
let currentMainTab = "analytics";

function getElement(id) {
  if (!id || typeof id !== 'string') return null;
  const el = document.getElementById(id);
  if (el) return el;
  try { return document.querySelector(id); } catch { return null; }
}

function getElements(selector) {
  if (!selector || typeof selector !== 'string') return [];
  try { return document.querySelectorAll(selector); } catch { return []; }
}

async function signInWithGoogle() {
  try {
    const redirectUri = chrome.identity.getRedirectURL('oauth2');
    console.log(redirectUri);
    const clientId = '367987706093-b1h91vfj98bej9t67n0l3jrg6h9psegj.apps.googleusercontent.com';
    const scope = encodeURIComponent('openid email profile');
    const nonce = Math.random().toString(36).slice(2);
    const state = Math.random().toString(36).slice(2);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&response_type=id_token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&nonce=${encodeURIComponent(nonce)}&state=${encodeURIComponent(state)}&prompt=select_account`;
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, redirectUrl => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!redirectUrl) return reject(new Error('No redirect URL returned'));
        resolve(redirectUrl);
      });
    });
    const url = new URL(responseUrl);
    const idToken = url.hash.match(/id_token=([^&]+)/)?.[1];
    if (!idToken) throw new Error('Google sign-in failed: no id_token');
    const success = await Auth.loginWithGoogle(decodeURIComponent(idToken));
    if (!success) throw new Error('Google sign-in failed');
    const { email } = await TokenStorage.getToken();
    await chrome.storage.local.set({ userEmail: email });
    getElement(ELEMENTS.emailPrompt).classList.add('hidden');
    getElement(ELEMENTS.mainApp).classList.remove('hidden');
    showToast('Signed in with Google!');
    updateEmailUI(email);
    switchMainTab('analytics');
    document.dispatchEvent(new CustomEvent('tm-auth-success', { detail: { email } }));
  } catch (error) {
    console.error('Google sign-in error:', error);
    showError(error.message || 'Google sign-in failed', ELEMENTS.emailError);
  }
}

async function resolveBackendUrl() {
  const now = Date.now();
  if (backendUrlCache.value && (now - backendUrlCache.ts) < BACKEND_URL_TTL) return backendUrlCache.value;
  const url = await sharedResolveBackendUrl();
  backendUrlCache = { value: url, ts: now };
  return url;
}

window.resolveBackendUrl = resolveBackendUrl;
window.sendDailyReport = sendDailyReport;

document.addEventListener("DOMContentLoaded", () => {
  if (!CONFIG.CHART_COLORS[currentTheme]) {
    currentTheme = "light";
    localStorage.setItem("theme", currentTheme);
  }

  initTheme();
  initEmailPrompt();
  initializeModalEvents();
  window.GuardTab?.init?.();
  initializeEnhancedFeatures();
  initializeApp();

  // Ensure auth button has deterministic mode state
  const authBtn = getElement(ELEMENTS.saveEmailBtn);
  if (authBtn) {
    if (!authBtn.dataset.mode) authBtn.dataset.mode = 'signin';
    // Normalize innerHTML to avoid textContent detection issues caused by icon
    if (/Sign In/.test(authBtn.textContent)) {
      authBtn.innerHTML = 'Sign In <span class="btn-icon">→</span>';
      authBtn.dataset.mode = 'signin';
    }
  }
  const toggleLink = getElement(ELEMENTS.toggleAuthMode);
  if (toggleLink && !toggleLink.textContent.trim()) {
    toggleLink.textContent = "Don't have an account? Sign up";
  }
});

function initTheme() {
  document.body.className = `theme-${currentTheme}`;
  window.AnalyticsTab?.updateChartTheme?.();
  FocusSessionsManager?.forceSync().catch(console.error);
  updateThemeDropdown();
}

function setupEventListeners() {
  const events = [
    { el: ELEMENTS.saveEmailBtn, event: 'click', handler: saveEmail },
    { el: 'googleSignInBtn', event: 'click', handler: signInWithGoogle },
    { el: ELEMENTS.toggleAuthMode, event: 'click', handler: toggleAuthMode },
    { el: ELEMENTS.toggleThemeBtn, event: 'click', handler: () => getElement(ELEMENTS.themeDropdown).classList.toggle("hidden") },
    { el: ELEMENTS.closeNotification, event: 'click', handler: () => getElement(ELEMENTS.updateNotification).classList.add("hidden") },
    { el: ELEMENTS.updateEmailBtn, event: 'click', handler: updateEmail },
    { el: ELEMENTS.editEmailBtn, event: 'click', handler: () => {
      getElement(ELEMENTS.emailDisplay).classList.add("hidden");
      getElement(ELEMENTS.userEmailSettings).classList.remove("hidden");
      getElement(ELEMENTS.updateEmailBtn).classList.remove("hidden");
      getElement(ELEMENTS.editEmailBtn).classList.add("hidden");
      getElement(ELEMENTS.userEmailSettings).focus();
    }},
  { el: 'downloadSummaryBtn', event: 'click', handler: downloadSummary },
    { el: ELEMENTS.testEmailBtn, event: 'click', handler: sendTestEmail },
    { el: ELEMENTS.sendReportBtn, event: 'click', handler: sendDailyReport },
    { el: ELEMENTS.feedbackMessage, event: 'input', handler: updateCharCount },
    { el: ELEMENTS.sendFeedbackBtn, event: 'click', handler: sendFeedback },
    { el: ELEMENTS.emailServiceSelect, event: 'change', handler: () => getElement(ELEMENTS.emailjsConfig).classList.toggle("hidden", getElement(ELEMENTS.emailServiceSelect).value !== "emailjs") },
    { el: ELEMENTS.saveEmailConfig, event: 'click', handler: saveEmailConfiguration },
    { el: ELEMENTS.settingsBtn, event: 'click', handler: () => switchMainTab(currentMainTab === "settings" ? "analytics" : "settings") },
    { el: ELEMENTS.helpBtn, event: 'click', handler: () => chrome.tabs.create({ url: chrome.runtime.getURL('guide.html') }) },
    { el: ELEMENTS.backToInsightsBtn, event: 'click', handler: () => switchMainTab("analytics") },
    { el: ELEMENTS.quickBlock, event: 'click', handler: async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          const url = new URL(tab.url);
          const domain = url.hostname.replace(/^www\./, '');
          await window.GuardTab?.addSite?.(domain);
          showToast(`Blocked ${domain}`);
          await window.GuardTab?.loadItems?.();
          await window.GuardTab?.updateStats?.();
        }
      } catch (error) {
        console.error('Error quick blocking site:', error);
        showToast('Error blocking site', 'error');
      }
    }},
    { el: ELEMENTS.closeAddSiteModal, event: 'click', handler: () => hideModal('addSiteModal') },
    { el: ELEMENTS.cancelAddSiteModal, event: 'click', handler: () => hideModal('addSiteModal') },
    { el: ELEMENTS.cancelConfirmModal, event: 'click', handler: () => hideModal('confirmModal') },
    { el: ELEMENTS.blockedItemsList, event: 'click', handler: e => {
      const btn = e.target.closest('.action-btn.delete');
      if (btn) window.GuardTab?.[btn.dataset.type === 'site' ? 'removeSite' : 'removeKeyword']?.(btn.dataset[btn.dataset.type]);
    }}
  ];

  events.forEach(({ el, event, handler }) => {
    const element = getElement(el);
    if (element) element.addEventListener(event, handler);
  });

  getElements(ELEMENTS.themeOptions).forEach(option => option.addEventListener("click", () => selectTheme(option.dataset.theme)));
  getElements(ELEMENTS.tabButtons).forEach(pill => pill.addEventListener('click', () => switchSubTab(pill.dataset.tab)));
  getElements(ELEMENTS.mainTabButtons).forEach(btn => btn.addEventListener("click", () => switchMainTab(btn.dataset.mainTab || btn.dataset.maintab)));
  document.addEventListener("click", e => {
    if (!e.target.closest(".theme-selector")) getElement(ELEMENTS.themeDropdown).classList.add("hidden");
  });
}

function selectTheme(themeName) {
  if (!THEMES.includes(themeName)) return;
  currentTheme = themeName;
  localStorage.setItem("theme", currentTheme);
  initTheme();
  if (currentMainTab === "analytics") window.AnalyticsTab?.load(currentSubTab).catch(console.error);
}

function updateThemeDropdown() {
  getElements(ELEMENTS.themeOptions).forEach(option => option.classList.toggle("active", option.dataset.theme === currentTheme));
}

async function saveEmail() {
  const email = getElement(ELEMENTS.userEmailInput).value.trim();
  const password = getElement(ELEMENTS.userPasswordInput).value;
  const btn = getElement(ELEMENTS.saveEmailBtn);
  const toggle = getElement(ELEMENTS.toggleAuthMode);
  const isSignupMode = btn?.dataset.mode === 'signup';

  if (!validateEmail(email)) return showError("Invalid email", ELEMENTS.emailError);
  if (!password) return showError("Enter password", ELEMENTS.emailError);

  try {
    btn.disabled = true;
    if (toggle) toggle.disabled = true;
    btn.textContent = isSignupMode ? "Creating Account..." : "Signing In...";
    const success = isSignupMode ? await Auth.signup(email, password) : await Auth.login(email, password);
    if (!success) throw new Error(isSignupMode ? "Could not create account" : "Invalid email or password");

    await chrome.storage.local.set({ userEmail: email });
    getElement(ELEMENTS.emailPrompt).classList.add("hidden");
    getElement(ELEMENTS.mainApp).classList.remove("hidden");
    showToast(isSignupMode ? "Account created!" : "Signed in!");
    updateEmailUI(email);
    switchMainTab("analytics");
    // Notify any listeners (e.g., authenticateUser waiting) that auth succeeded
    document.dispatchEvent(new CustomEvent('tm-auth-success', { detail: { email } }));
  } catch (error) {
    console.error("Authentication error:", error);
    showError(error.message, ELEMENTS.emailError);
  } finally {
  btn.disabled = false;
  if (toggle) toggle.disabled = false;
  btn.innerHTML = (isSignupMode ? 'Create Account' : 'Sign In') + ' <span class="btn-icon">→</span>';
  }
}

async function updateEmail() {
  const email = getElement(ELEMENTS.userEmailSettings).value.trim();
  if (!validateEmail(email)) return showError("Invalid email");

  try {
    const isAuthenticated = await Auth.isAuthenticated();
    if (!isAuthenticated && !(await Auth.authenticateUser())) return showError("Authentication required");
    await chrome.storage.local.set({ userEmail: email });
    showToast("Email updated!");
    updateEmailUI(email);
  } catch (error) {
    console.error("Error updating email:", error);
    showError(error.message);
  }
}

async function sendTestEmail() {
  try {
    const { userEmail, emailConfig } = await chrome.storage.local.get(["userEmail", "emailConfig"]);
    if (!userEmail) {
      showError("Set email first");
      getElement(ELEMENTS.emailPrompt).classList.remove("hidden");
      getElement(ELEMENTS.mainApp).classList.add("hidden");
      return;
    }
    if (!emailConfig?.enabled) return showToast("Configure EmailJS in settings", "error");

    showToast("Sending test email...", "info");
    const html = `
      <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.5">
        <h2 style="margin:0 0 6px">TimeMachine Email Test</h2>
        <p>Your EmailJS configuration works.</p>
        <p style="margin:14px 0 0;font-size:12px;color:#666">Use triple braces in EmailJS template: <code>{{{message}}}</code>.</p>
      </div>`;
    await sendEmailViaEmailJS({
      to_email: userEmail,
      subject: "TimeMachine Test Email",
      message: html,
      message_text: "TimeMachine test: Your EmailJS configuration works."
    }, emailConfig.settings);
    showToast("Test email sent!");
  } catch (error) {
    console.error("Error sending test email:", error);
    showError("Error sending test email: " + error.message);
  }
}

async function sendDailyReport() {
  try {
    const { userEmail, emailConfig } = await chrome.storage.local.get(['userEmail', 'emailConfig']);
    if (!userEmail) return showToast("Set email first", "error");
    if (!emailConfig?.enabled || emailConfig.service !== 'emailjs') return showToast("Configure EmailJS in settings", "error");

    const today = new Date().toISOString().split('T')[0];
    const timezone = -330; // IST offset
    const backend = await resolveBackendUrl();
  const { token } = await TokenStorage.getToken();

    const resp = await fetch(
      `${backend}/api/time-data/report/${encodeURIComponent(userEmail)}?date=${today}&endDate=${today}&timezone=${timezone}&useUserTimezone=true`,
  { headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } }
    );
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Failed to fetch data');

    const timeData = await resp.json();
    const dataArray = Array.isArray(timeData) ? timeData : [];
    const html = generateEmailHtmlReport(dataArray, today, currentSubTab);
    const text = generateEmailReport(dataArray, today, currentSubTab);

    await sendEmailViaEmailJS({
      to_email: userEmail,
      subject: `TimeMachine Daily Report - ${new Date(today).toLocaleDateString()}`,
      message: html,
      message_text: text
    }, emailConfig.settings);
    showToast('Daily report emailed!');
    return true;
  } catch (error) {
    console.error('sendDailyReport error:', error);
    showToast('Failed to email report: ' + error.message, 'error');
  }
}

async function sendEmailViaEmailJS(params, settings) {
  if (!settings?.serviceId || !settings?.templateId || !settings?.publicKey) throw new Error("EmailJS not configured");
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: settings.serviceId, template_id: settings.templateId, user_id: settings.publicKey, template_params: params })
  });
  if (!response.ok) throw new Error(`EmailJS failed: ${await response.text()}`);
  return response;
}

function generateEmailReport(timeData, date, timeframe = 'daily') {
  const reportTitle = timeframe.charAt(0).toUpperCase() + timeframe.slice(1) + ' Report';
  const dateText = timeframe === 'daily' ? new Date(date).toLocaleDateString() : window.AnalyticsTab?.getDateRangeDisplayText?.(timeframe) || date;

  if (!Array.isArray(timeData) || !timeData.length) {
    return `TimeMachine ${reportTitle} - ${dateText}\n\nNo activity tracked.\n\nStay productive!\nTimeMachine Extension`;
  }

  const categoryData = { Work: 0, Social: 0, Entertainment: 0, Professional: 0, Other: 0 };
  let totalTime = 0;
  const domainTimes = timeData.map(entry => {
    const time = entry?.totalTime || 0;
    totalTime += time;
    const category = entry?.category || "Other";
    categoryData[category] += time;
    return { domain: entry.domain, time, category };
  }).sort((a, b) => b.time - a.time);

  const productiveTime = categoryData.Work + categoryData.Professional + categoryData.Other * 0.5;
  const productivityScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

  let report = `TimeMachine ${reportTitle} - ${dateText}\n\n📊 ${reportTitle.toUpperCase()} SUMMARY:\nTotal Time Online: ${sharedFormatDuration(totalTime)}\nProductivity Score: ${productivityScore}%\nUnique Sites: ${domainTimes.length}\n\n🏆 TOP SITES:`;
  domainTimes.slice(0, 5).forEach((site, index) => {
    const percentage = totalTime > 0 ? ((site.time / totalTime) * 100).toFixed(1) : 0;
    report += `\n${index + 1}. ${site.domain}: ${sharedFormatDuration(site.time)} (${percentage}%)`;
  });
  report += `\n\n📈 BY CATEGORY:`;
  Object.entries(categoryData).forEach(([category, time]) => {
    if (time > 0) report += `\n${category}: ${sharedFormatDuration(time)} (${((time / totalTime) * 100).toFixed(1)}%)`;
  });
  report += `\n\n💡 INSIGHT: ${productivityScore >= 70 ? 'Great job! Highly productive.' : productivityScore >= 40 ? 'Good work! Room for improvement.' : 'Focus time! Try more productive activities.'}\n\nSent via TimeMachine Extension`;
  return report;
}

function generateEmailHtmlReport(timeData, date, timeframe = 'daily') {
  const reportTitle = timeframe.charAt(0).toUpperCase() + timeframe.slice(1) + ' Report';
  const displayDate = timeframe === 'daily' ? new Date(date).toLocaleDateString() : window.AnalyticsTab?.getDateRangeDisplayText?.(timeframe) || date;

  if (!Array.isArray(timeData) || !timeData.length) {
    return `<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.5"><h2>TimeMachine ${reportTitle}</h2><div style="color:#666;font-size:12px;margin:0 0 12px">${displayDate}</div><p>No activity tracked.</p><p style="margin-top:16px;color:#666;font-size:12px">Sent via TimeMachine</p></div>`;
  }

  const categoryData = { Work: 0, Social: 0, Entertainment: 0, Professional: 0, Other: 0 };
  let totalTime = 0, totalSessions = 0, longestSession = 0;
  let firstStart = null, lastEnd = null;
  const domains = timeData.map(entry => {
    const time = entry?.totalTime || 0;
    totalTime += time;
    const category = entry?.category || 'Other';
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
  }).sort((a, b) => b.time - a.time).slice(0, 10);

  const productiveTime = categoryData.Work + categoryData.Professional + categoryData.Other * 0.5;
  const productivityScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
  const spanText = firstStart && lastEnd ? `${firstStart.toLocaleTimeString()} – ${lastEnd.toLocaleTimeString()}` : '—';

  const palette = CONFIG.CHART_COLORS.light;
  const doughnutCfg = {
    type: 'doughnut',
    data: { labels: Object.keys(categoryData), datasets: [{ data: Object.values(categoryData), backgroundColor: [palette.work, palette.social, palette.entertainment, palette.professional, palette.other], borderWidth: 0 }] },
    options: { plugins: { legend: { display: true, position: 'right' } }, cutout: '60%' }
  };
  const barCfg = {
    type: 'bar',
    data: { labels: domains.map(d => d.domain), datasets: [{ label: 'Time (min)', data: domains.map(d => Math.round((d.time || 0) / 60000)), backgroundColor: '#3b82f6', borderWidth: 0 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }
  };

  const doughnutUrl = `https://quickchart.io/chart?w=640&h=320&bkg=white&devicePixelRatio=2&c=${encodeURIComponent(JSON.stringify(doughnutCfg))}`;
  const barUrl = `https://quickchart.io/chart?w=700&h=400&bkg=white&devicePixelRatio=2&c=${encodeURIComponent(JSON.stringify(barCfg))}`;
  const catRows = Object.entries(categoryData).filter(([_, v]) => v > 0).map(([k, v]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${k}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${sharedFormatDuration(v)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${totalTime ? ((v / totalTime) * 100).toFixed(1) : 0}%</td></tr>`).join('');
  const domainRows = domains.map((d, i) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${i + 1}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${d.domain}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${sharedFormatDuration(d.time)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${d.category}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#111">${totalTime ? ((d.time / totalTime) * 100).toFixed(1) : 0}%</td></tr>`).join('');
  const insight = productivityScore >= 70 ? 'Great job! Highly productive.' : productivityScore >= 40 ? 'Good work! Room for improvement.' : 'Focus time! Try more productive activities.';

  return `
    <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.5">
      <h2>TimeMachine ${reportTitle}</h2><div style="color:#666;font-size:12px;margin:0 0 12px">${displayDate}</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 12px">
        <tr><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Total Time</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${sharedFormatDuration(totalTime)}</td><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Productivity</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${productivityScore}%</td></tr>
        <tr><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Unique Domains</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${domains.length}</td><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Sessions</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${totalSessions}</td></tr>
        <tr><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Longest Session</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${sharedFormatDuration(longestSession)}</td><td style="padding:6px 8px;background:#f8fafc;border:1px solid #e5e7eb">Active Span</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${spanText}</td></tr>
      </table>
      <div style="margin:12px 0 8px;font-weight:600">Category Distribution</div><img src="${doughnutUrl}" alt="Category Chart" width="640" height="320" style="display:block;border:1px solid #eee;border-radius:6px" />
      <div style="margin:16px 0 8px;font-weight:600">Top Domains</div><img src="${barUrl}" alt="Top Domains Chart" width="700" height="400" style="display:block;border:1px solid #eee;border-radius:6px" />
      <div style="margin:18px 0 6px;font-weight:600">Top Domains Table</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse">
        <thead><tr><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">#</th><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">Domain</th><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">Time</th><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">Category</th><th align="left" style="padding:6px 8px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;color:#111;font-size:12px">Share</th></tr></thead>
        <tbody>${domainRows}</tbody>
      </table>
      <div style="margin-top:14px;padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;color:#0f172a"><strong>Insight:</strong> ${insight}</div>
      <p style="margin-top:16px;color:#666;font-size:12px">Sent via TimeMachine</p>
    </div>`;
}

async function downloadSummary() {
  try {
    const { userEmail } = await chrome.storage.local.get(['userEmail']);
    if (!userEmail) return showToast("Set email first", "error");
    const backend = await resolveBackendUrl();
    const dateInput = document.getElementById('summaryDate');
    const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
    const { token } = await TokenStorage.getToken();
    const res = await fetch(`${backend}/api/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({ date: selectedDate, userEmail, useUserTimezone: true })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate summary');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary_${selectedDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Summary downloaded!');
  } catch (error) {
    console.error('Error downloading summary:', error);
    showToast('Error downloading summary: ' + error.message, 'error');
  }
}

function updateCharCount() {
  const count = getElement(ELEMENTS.feedbackMessage).value.length;
  getElement(ELEMENTS.charCount).textContent = `${count}/500`;
  getElement(ELEMENTS.charCount).classList.toggle("text-red-500", count > 500);
  getElement(ELEMENTS.sendFeedbackBtn).disabled = count === 0 || count > 500;
}

async function sendFeedback() {
  try {
    const message = getElement(ELEMENTS.feedbackMessage).value.trim();
    if (!message) return showToast("Enter feedback", "error");
    if (!await Auth.isAuthenticated()) return showToast("Please log in", "error");
    await sharedApiCall('/api/feedback/submit', { method: 'POST', body: JSON.stringify({ message }) });
    getElement(ELEMENTS.feedbackMessage).value = "";
    updateCharCount();
    showToast("Feedback sent!");
  } catch (error) {
    console.error("Error sending feedback:", error);
    showToast("Error sending feedback: " + error.message, "error");
  }
}

function switchSubTab(tab) {
  currentSubTab = tab;
  getElements(ELEMENTS.tabButtons).forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  getElement(ELEMENTS.siteList).innerHTML = '<div class="loading-text"><span class="loader"></span>Loading data...</div>';
  window.AnalyticsTab?.load(currentSubTab).catch(console.error);
}

function switchMainTab(mainTab) {
  currentMainTab = mainTab;
  getElements('.main-tab-content').forEach(content => content.classList.remove('active'));
  getElement(ELEMENTS.settingsTabContent).classList.add("hidden");
  const tabActions = {
    analytics: () => { getElement(ELEMENTS.insightsTabContent).classList.add('active'); window.AnalyticsTab?.load(currentSubTab).catch(console.error); },
    stopwatch: () => window.SolverTab?.show?.().catch?.(console.error),
    summary: () => window.SummaryTab?.show?.().catch?.(console.error),
    focus: () => window.FocusTab?.show?.().catch?.(console.error),
    guard: () => window.GuardTab?.show?.().catch?.(console.error),
    settings: () => getElement(ELEMENTS.settingsTabContent).classList.remove("hidden")
  };
  tabActions[mainTab]?.();
  getElements(ELEMENTS.mainTabButtons).forEach(btn => btn.classList.toggle("active", btn.dataset.mainTab === mainTab || btn.dataset.maintab === mainTab));
}

function initializeApp() {
  switchMainTab("analytics");
  FocusSessionsManager?.init();
  checkForUpdates();
}

function checkForUpdates() {
  const lastVersion = localStorage.getItem("lastKnownVersion") || "1.0.0";
  const currentVersion = "1.3.0";
  if (lastVersion !== currentVersion) {
    showToast("New: HTML email reports with charts + improved scheduler");
    localStorage.setItem("lastKnownVersion", currentVersion);
  }
}

async function initEmailPrompt() {
  try {
    const { userEmail, emailConfig, tm_auth_token } = await chrome.storage.local.get(["userEmail", "emailConfig", "tm_auth_token"]);
    const isAuthenticated = Auth?.isAuthenticated ? await Auth.isAuthenticated() : !!tm_auth_token;
    if (isAuthenticated && userEmail && validateEmail(userEmail)) {
      getElement(ELEMENTS.emailPrompt).classList.add("hidden");
      getElement(ELEMENTS.mainApp).classList.remove("hidden");
      updateEmailUI(userEmail);
      loadEmailConfiguration(emailConfig);
      switchMainTab("analytics");
      FocusSessionsManager?.handleAuthChanged(true);
    } else {
      getElement(ELEMENTS.emailPrompt).classList.remove("hidden");
      getElement(ELEMENTS.mainApp).classList.add("hidden");
      FocusSessionsManager?.handleAuthChanged(false);
    }
  } catch (error) {
    console.error("Error initializing email prompt:", error);
    getElement(ELEMENTS.emailPrompt).classList.remove("hidden");
    getElement(ELEMENTS.mainApp).classList.add("hidden");
  }
}

async function saveEmailConfiguration() {
  const service = getElement(ELEMENTS.emailServiceSelect).value;
  if (service === "emailjs") {
    const settings = {
      serviceId: getElement(ELEMENTS.emailjsServiceId).value.trim(),
      templateId: getElement(ELEMENTS.emailjsTemplateId).value.trim(),
      publicKey: getElement(ELEMENTS.emailjsPublicKey).value.trim()
    };
    if (!settings.serviceId || !settings.templateId || !settings.publicKey) return showToast("Fill all EmailJS fields", "error");
    await chrome.storage.local.set({ emailConfig: { enabled: true, service: "emailjs", settings } });
    showToast("EmailJS configuration saved!");
  } else {
    await chrome.storage.local.set({ emailConfig: { enabled: false } });
    showToast("Email service disabled.");
  }
}

function loadEmailConfiguration(emailConfig) {
  if (emailConfig?.enabled && emailConfig.service === "emailjs" && emailConfig.settings) {
    getElement(ELEMENTS.emailServiceSelect).value = emailConfig.service;
    getElement(ELEMENTS.emailjsServiceId).value = emailConfig.settings.serviceId || "";
    getElement(ELEMENTS.emailjsTemplateId).value = emailConfig.settings.templateId || "";
    getElement(ELEMENTS.emailjsPublicKey).value = emailConfig.settings.publicKey || "";
    getElement(ELEMENTS.emailjsConfig).classList.remove("hidden");
  }
}

function toggleAuthMode() {
  const btn = getElement(ELEMENTS.saveEmailBtn);
  const toggle = getElement(ELEMENTS.toggleAuthMode);
  const tagline = document.getElementById('authTagline');
  if (!btn || !toggle) return;
  const currentMode = btn.dataset.mode || 'signin';
  const nextMode = currentMode === 'signin' ? 'signup' : 'signin';
  btn.dataset.mode = nextMode;
  if (nextMode === 'signup') {
    btn.innerHTML = 'Create Account <span class="btn-icon">→</span>';
    toggle.textContent = 'Already have an account? Sign in';
    if (tagline) tagline.textContent = 'Create an account to get started';
  } else {
    btn.innerHTML = 'Sign In <span class="btn-icon">→</span>';
    toggle.textContent = "Don't have an account? Sign up";
    if (tagline) tagline.textContent = 'Sign in to track your productivity';
  }
  // Clear error & password
  getElement(ELEMENTS.emailError).classList.add('hidden');
  getElement(ELEMENTS.userPasswordInput).value = '';
}

function updateEmailUI(email) {
  getElement(ELEMENTS.emailDisplay).textContent = email;
  getElement(ELEMENTS.userEmailSettings).value = email;
  getElement(ELEMENTS.emailDisplay).classList.remove("hidden");
  getElement(ELEMENTS.userEmailSettings).classList.add("hidden");
  getElement(ELEMENTS.updateEmailBtn).classList.add("hidden");
  getElement(ELEMENTS.editEmailBtn).classList.remove("hidden");
}

function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function showError(message, elId) {
  if (elId) {
    const el = getElement(elId);
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
  }
  showToast(message, 'error');
}

function showModal(modalId) {
  const modal = getElement(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    const firstInput = modal.querySelector('.form-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }
}

function hideModal(modalId) {
  const modal = getElement(modalId);
  if (modal) modal.classList.add('hidden');
}

window.hideModal = hideModal;
window.closeModal = hideModal;

function showConfirmModal(title, message, onConfirm) {
  const modal = getElement('confirmModal');
  if (!modal) return console.error('Confirm modal not found');
  getElement('confirmTitle').textContent = title;
  getElement('confirmMessage').textContent = message;
  const confirmBtn = getElement('confirmButton');
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  newConfirmBtn.addEventListener('click', () => { hideModal('confirmModal'); onConfirm?.(); });
  showModal('confirmModal');
}

async function initReportScheduler() {
  const settings = await reportScheduler.initialize();
  const scheduleToggle = getElement('scheduleToggle');
  const scheduleOptions = getElement('scheduleOptions');
  const scheduleFrequency = getElement('scheduleFrequency');
  const daySelector = getElement('daySelector');
  const scheduleDay = getElement('scheduleDay');
  const scheduleTime = getElement('scheduleTime');
  const scheduleInactiveToggle = getElement('scheduleInactiveToggle');
  if (!scheduleToggle) return;

  scheduleToggle.classList.toggle('active', settings.enabled);
  scheduleOptions.classList.toggle('hidden', !settings.enabled);
  scheduleFrequency.value = settings.frequency;
  scheduleTime.value = settings.time;
  scheduleInactiveToggle.classList.toggle('active', settings.includeInactive);
  updateDaySelector(settings.frequency, settings.day);
  updateNextScheduledDisplay();

  scheduleToggle.addEventListener('click', async () => {
    const isEnabled = scheduleToggle.classList.toggle('active');
    scheduleOptions.classList.toggle('hidden', !isEnabled);
    await reportScheduler.saveSettings({ enabled: isEnabled });
    updateNextScheduledDisplay();
  });
  scheduleFrequency.addEventListener('change', async () => {
    const frequency = scheduleFrequency.value;
    updateDaySelector(frequency, 1);
    await reportScheduler.saveSettings({ frequency });
    updateNextScheduledDisplay();
  });
  scheduleDay.addEventListener('change', async () => {
    await reportScheduler.saveSettings({ day: parseInt(scheduleDay.value, 10) });
    updateNextScheduledDisplay();
  });
  scheduleTime.addEventListener('change', async () => {
    await reportScheduler.saveSettings({ time: scheduleTime.value });
    updateNextScheduledDisplay();
  });
  scheduleInactiveToggle.addEventListener('click', async () => {
    await reportScheduler.saveSettings({ includeInactive: scheduleInactiveToggle.classList.toggle('active') });
  });
}

function updateDaySelector(frequency, selectedDay) {
  const scheduleDay = getElement('scheduleDay');
  const daySelector = getElement('daySelector');
  if (!scheduleDay || !daySelector) return;
  scheduleDay.innerHTML = '';
  if (frequency === 'daily') return daySelector.classList.add('hidden');
  daySelector.classList.remove('hidden');
  const options = frequency === 'weekly' ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => ({ value: i, text: day })) : Array.from({ length: 28 }, (_, i) => ({ value: i + 1, text: `Day ${i + 1}` }));
  options.forEach(({ value, text }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    scheduleDay.appendChild(option);
  });
  scheduleDay.value = selectedDay || 1;
}

function updateNextScheduledDisplay() {
  const nextScheduled = getElement('nextScheduled');
  if (!nextScheduled) return;
  const nextTime = reportScheduler.getNextScheduledTime();
  if (!nextTime) {
    nextScheduled.textContent = '';
    nextScheduled.classList.add('hidden');
    return;
  }
  nextScheduled.textContent = `Next report: ${nextTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  nextScheduled.classList.remove('hidden');
}

function initializeModalEvents() {
  getElements('.modal-overlay').forEach(modal => modal.addEventListener('click', e => { if (e.target === modal) hideAllModals(); }));
  getElements('.modal-close, .btn-cancel').forEach(btn => btn.addEventListener('click', hideAllModals));
  const addSiteBtn = getElement('addSiteBtn');
  if (addSiteBtn) addSiteBtn.addEventListener('click', () => window.GuardTab?.handleAddSite?.());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideAllModals(); });
  getElements('.form-input').forEach(input => input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const modal = input.closest('.modal-overlay');
      if (modal) modal.querySelector('.btn-primary')?.click();
    }
  }));
}

function initializeEnhancedFeatures() {
  Auth?.isAuthenticated().then(authed => { if (authed) GuardTab.loadSitesFromDatabase?.(); });
  GuardTab.loadItems?.();
}

function hideAllModals() {
  getElements('.modal-overlay').forEach(modal => modal.classList.add('hidden'));
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

window.showToast = showToast;
window.showError = showError;
window.showModal = showModal;
window.hideModal = hideModal;
window.showConfirmModal = showConfirmModal;

setupEventListeners();
updateCharCount();