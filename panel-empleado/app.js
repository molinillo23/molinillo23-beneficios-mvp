const API_BASE = '/api';

const state = { token: localStorage.getItem('emp_token') || null, employee: null };

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) : `Error ${res.status}`;
    throw new Error(message);
  }
  return data;
}

// ===================== AUTH =====================

const authScreen = document.getElementById('auth-screen');
const appEl = document.getElementById('app');
const authError = document.getElementById('auth-error');

document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('login-form').classList.toggle('hidden', target !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', target !== 'register');
    authError.classList.add('hidden');
  });
});

async function loadCorporatesIntoRegister() {
  try {
    const corporates = await api('/corporates', { auth: false });
    const select = document.getElementById('reg-corporate');
    select.innerHTML = corporates.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  } catch (err) { /* silencioso, el registro igual puede fallar y mostrar error */ }
}
loadCorporatesIntoRegister();

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  try {
    const data = await api('/auth/login', {
      auth: false, method: 'POST',
      body: {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      },
    });
    if (data.user.role !== 'employee') throw new Error('Esta cuenta no es de tipo empleado.');
    setToken(data.token);
    await bootApp();
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  try {
    const data = await api('/auth/register/employee', {
      auth: false, method: 'POST',
      body: {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        corporateId: Number(document.getElementById('reg-corporate').value),
      },
    });
    setToken(data.token);
    await bootApp();
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  setToken(null);
  location.reload();
});

function setToken(token) {
  state.token = token;
  if (token) localStorage.setItem('emp_token', token);
  else localStorage.removeItem('emp_token');
}

// ===================== NAVEGACIÓN =====================

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  if (view === 'descubrir') loadPromotions();
  if (view === 'credencial') renderCredential();
}

// ===================== BOOT =====================

async function bootApp() {
  try {
    state.employee = await api('/corporates/employees/me');
    authScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    await loadPromotions();
  } catch (err) {
    setToken(null);
    authScreen.classList.remove('hidden');
    appEl.classList.add('hidden');
    authError.textContent = 'Tu sesión expiró. Entra de nuevo.';
    authError.classList.remove('hidden');
  }
}

// ===================== 01 DESCUBRIR =====================

async function loadPromotions() {
  const el = document.getElementById('promotions-list');
  el.innerHTML = 'Cargando…';
  try {
    const corporateId = state.employee ? state.employee.corporateId : '';
    const promotions = await api(`/promotions?corporateId=${corporateId}`, { auth: false });
    if (!promotions.length) { el.innerHTML = `<p class="empty-note">Todavía no hay descuentos disponibles para tu empresa.</p>`; return; }

    el.innerHTML = promotions.map((p) => `
      <div class="promo-item">
        <div class="promo-item-main">
          <span class="promo-item-title">${p.Business ? p.Business.name : '—'} — ${p.title}</span>
          <span class="promo-item-sub">${p.Business ? (p.Business.giro || '') : ''} ${p.Business && p.Business.city ? '· ' + p.Business.city : ''}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          ${p.discountPercent ? `<span class="promo-discount">${p.discountPercent}%</span>` : ''}
          <button class="btn-small primary" data-use-promo="${p.id}" data-promo-title="${p.title}">Usar</button>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('[data-use-promo]').forEach((btn) => {
      btn.addEventListener('click', () => generateQr(btn.dataset.usePromo, btn.dataset.promoTitle, btn));
      // registra "impresión" al ver la promoción en pantalla
      api(`/promotions/${btn.dataset.usePromo}/view`, { auth: false, method: 'POST' }).catch(() => {});
    });
  } catch (err) {
    el.innerHTML = `<p class="empty-note">No se pudo cargar: ${err.message}</p>`;
  }
}

// ===================== 02 MI CREDENCIAL =====================

function renderCredential() {
  const el = document.getElementById('credential-card');
  if (!state.employee) { el.innerHTML = `<p class="empty-note">No se pudo cargar tu credencial.</p>`; return; }
  const corp = state.employee.Corporate ? state.employee.Corporate.name : 'Sin corporativo';
  el.innerHTML = `
    <p class="credential-eyebrow">Credencial digital</p>
    <p class="credential-name">${state.employee.User ? (state.employee.User.name || state.employee.User.email) : 'Empleado'}</p>
    <p class="credential-corp">${corp}</p>
    <span class="credential-status ${state.employee.verified ? 'verified' : 'pending'}">
      ${state.employee.verified ? '✓ VERIFICADO' : '○ VERIFICACIÓN PENDIENTE'}
    </span>
  `;
}

// ===================== QR / CANJE =====================

let countdownInterval = null;

async function generateQr(promotionId, promoTitle, btn) {
  btn.disabled = true;
  btn.textContent = 'Generando…';
  try {
    const data = await api('/redemptions/qr-token', { method: 'POST', body: { promotionId: Number(promotionId) } });
    document.getElementById('qr-promo-title').textContent = promoTitle;
    document.getElementById('qr-token-display').textContent = data.token;
    document.getElementById('qr-modal').classList.remove('hidden');
    startCountdown(data.expiresAt);
  } catch (err) {
    alert(`No se pudo generar el código: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Usar';
  }
}

function startCountdown(expiresAt) {
  clearInterval(countdownInterval);
  const el = document.getElementById('qr-countdown');
  function tick() {
    const remaining = Math.max(0, expiresAt - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      el.textContent = 'Expirado';
    }
  }
  tick();
  countdownInterval = setInterval(tick, 1000);
}

document.getElementById('qr-modal-close').addEventListener('click', () => {
  document.getElementById('qr-modal').classList.add('hidden');
  clearInterval(countdownInterval);
});

// ===================== INIT =====================

if (state.token) bootApp();
