const API_BASE = '/api';

const state = { token: localStorage.getItem('pa_token') || null };

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
    if (data.user.role !== 'admin') throw new Error('Esta cuenta no tiene permisos de administrador.');
    state.token = data.token;
    localStorage.setItem('pa_token', data.token);
    bootApp();
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('pa_token');
  location.reload();
});

function bootApp() {
  authScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  loadOverview();
}

// ===================== NAVEGACIÓN =====================

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  if (view === 'resumen') loadOverview();
  if (view === 'negocios') loadBusinesses();
  if (view === 'produccion') loadContentRequests();
  if (view === 'corporativos') loadCorporates();
  if (view === 'empleados') loadEmployees();
  if (view === 'canjes') loadRedemptions();
}

// ===================== 01 RESUMEN =====================

async function loadOverview() {
  const el = document.getElementById('overview-receipts');
  try {
    const o = await api('/admin/overview');
    const items = [
      { label: 'Negocios', value: o.businessCount },
      { label: 'Suscripciones activas', value: o.activeSubscriptions, cls: 'stamp' },
      { label: 'Corporativos', value: o.corporateCount },
      { label: 'Empleados', value: o.employeeCount },
      { label: 'Empleados verificados', value: o.verifiedEmployeeCount, cls: 'verified' },
      { label: 'Promociones activas', value: o.promotionCount },
      { label: 'Canjes totales', value: o.redemptionCount, cls: 'stamp' },
    ];
    el.innerHTML = items.map((i) => `
      <div class="receipt">
        <span class="receipt-label">${i.label}</span>
        <span class="receipt-value ${i.cls || ''}">${i.value}</span>
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = `<p class="empty-note">No se pudo cargar: ${err.message}</p>`;
  }
}

// ===================== 02 NEGOCIOS =====================

async function loadBusinesses() {
  const el = document.getElementById('businesses-list');
  el.innerHTML = 'Cargando…';
  try {
    const businesses = await api('/admin/businesses');
    if (!businesses.length) { el.innerHTML = `<p class="empty-note">Todavía no hay negocios registrados.</p>`; return; }
    el.innerHTML = businesses.map((b) => {
      const sub = b.Subscriptions && b.Subscriptions[0];
      return `
        <div class="history-item">
          <div class="history-item-main">
            <span class="history-item-title">${b.name}</span>
            <span class="history-item-sub">${b.giro || 'Sin giro'} · ${b.city || 'Sin ciudad'} · ${sub ? `Plan ${sub.Plan.name}` : 'Sin plan'}</span>
          </div>
          <span class="status-badge ${b.status === 'active' ? 'published' : ''}">${b.status}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    el.innerHTML = `<p class="empty-note">No se pudo cargar: ${err.message}</p>`;
  }
}
