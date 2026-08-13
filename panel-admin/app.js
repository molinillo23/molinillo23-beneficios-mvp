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
// ===================== 03 PRODUCCIÓN IA =====================

const STATUS_LABELS = {
  submitted: 'Enviado', in_production: 'En producción', in_review: 'Listo para revisar cliente',
  approved: 'Aprobado por cliente', published: 'Publicado',
};
const CHANNEL_LABELS = {
  instagram_post: 'Instagram — Post', instagram_story: 'Instagram — Historia', facebook: 'Facebook',
  tiktok_script: 'TikTok — Guion', google_business: 'Google Business', whatsapp: 'WhatsApp',
  corporate_offer: 'Oferta corporativa',
};

async function loadContentRequests() {
  const el = document.getElementById('requests-list');
  el.innerHTML = 'Cargando…';
  try {
    const requests = await api('/admin/content-requests');
    if (!requests.length) { el.innerHTML = `<p class="empty-note">No hay briefs mensuales todavía.</p>`; return; }

    el.innerHTML = requests.map((r) => `
      <div class="history-item" style="flex-direction: column; align-items: stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div class="history-item-main">
            <span class="history-item-title">${r.Business ? r.Business.name : '—'} — ${r.monthTag}: ${r.whatToPromote || 'Sin descripción'}</span>
            <span class="history-item-sub">Objetivo: ${r.objective || '—'}</span>
          </div>
          <span class="status-badge ${r.status === 'published' || r.status === 'approved' ? 'published' : ''}">${STATUS_LABELS[r.status] || r.status}</span>
        </div>
        <div class="item-actions" style="margin-top: 10px;">
          <button class="btn-small primary" data-generate="${r.id}">Generar con IA</button>
          <button class="btn-small" data-view-items="${r.id}">Ver contenido</button>
          ${r.status === 'approved' ? `<button class="btn-small" data-publish="${r.id}">Marcar publicado</button>` : ''}
        </div>
        <div class="generated-items hidden" id="gen-items-${r.id}"></div>
      </div>
    `).join('');

    document.querySelectorAll('[data-generate]').forEach((btn) => {
      btn.addEventListener('click', () => generateContent(btn.dataset.generate, btn));
    });
    document.querySelectorAll('[data-view-items]').forEach((btn) => {
      btn.addEventListener('click', () => toggleGeneratedItems(btn.dataset.viewItems));
    });
    document.querySelectorAll('[data-publish]').forEach((btn) => {
      btn.addEventListener('click', () => publishRequest(btn.dataset.publish));
    });
  } catch (err) {
    el.innerHTML = `<p class="empty-note">No se pudo cargar: ${err.message}</p>`;
  }
}

async function generateContent(requestId, btn) {
  btn.disabled = true;
  btn.textContent = 'Generando…';
  try {
    await api(`/admin/content-requests/${requestId}/generate`, { method: 'POST' });
    await loadContentRequests();
    await toggleGeneratedItems(requestId, true);
  } catch (err) {
    alert(`No se pudo generar: ${err.message}`);
    btn.disabled = false;
    btn.textContent = 'Generar con IA';
  }
}

async function toggleGeneratedItems(requestId, forceOpen = false) {
  const panel = document.getElementById(`gen-items-${requestId}`);
  if (!panel) return;
  const isHidden = panel.classList.contains('hidden');
  if (!isHidden && !forceOpen) { panel.classList.add('hidden'); return; }

  panel.classList.remove('hidden');
  panel.innerHTML = 'Cargando…';
  try {
    const items = await api(`/admin/content-requests/${requestId}/items`);
    if (!items.length) { panel.innerHTML = `<p class="empty-note">Aún no se ha generado contenido para este brief.</p>`; return; }

    panel.innerHTML = items.map((item) => `
      <div class="generated-item-card">
        <span class="generated-item-channel">${CHANNEL_LABELS[item.channel] || item.channel}</span>
        <textarea class="generated-item-textarea" data-item-id="${item.id}">${item.text}</textarea>
        <div class="item-actions" style="margin-top: 8px;">
          <button class="btn-small" data-save-item="${item.id}">Guardar cambios</button>
        </div>
      </div>
    `).join('');

    panel.querySelectorAll('[data-save-item]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const textarea = panel.querySelector(`textarea[data-item-id="${btn.dataset.saveItem}"]`);
        btn.disabled = true;
        btn.textContent = 'Guardando…';
        try {
          await api(`/admin/content-items/${btn.dataset.saveItem}`, { method: 'PATCH', body: { text: textarea.value } });
          btn.textContent = 'Guardado ✓';
          setTimeout(() => { btn.disabled = false; btn.textContent = 'Guardar cambios'; }, 1500);
        } catch (err) {
          alert(`No se pudo guardar: ${err.message}`);
          btn.disabled = false;
          btn.textContent = 'Guardar cambios';
