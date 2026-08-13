const API_BASE = '/api';

const state = {
  token: localStorage.getItem('pn_token') || null,
  business: null,
};

// ===================== HELPERS DE API =====================

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error
      ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      : `Error ${res.status}`;
    throw new Error(message);
  }
  return data;
}

// ===================== AUTH =====================

const authScreen = document.getElementById('auth-screen');
const appEl = document.getElementById('app');
const authError = document.getElementById('auth-error');

function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove('hidden');
}

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

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  try {
    const data = await api('/auth/login', {
      auth: false,
      method: 'POST',
      body: {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      },
    });
    if (data.user.role !== 'business') {
      throw new Error('Esta cuenta no es de tipo negocio.');
    }
    setToken(data.token);
    await bootApp();
  } catch (err) {
    showAuthError(err.message);
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  try {
    const data = await api('/auth/register/business', {
      auth: false,
      method: 'POST',
      body: {
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        name: document.getElementById('reg-name').value,
        businessName: document.getElementById('reg-business-name').value,
        giro: document.getElementById('reg-giro').value,
        city: document.getElementById('reg-city').value,
      },
    });
    setToken(data.token);
    await bootApp();
  } catch (err) {
    showAuthError(err.message);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  setToken(null);
  location.reload();
});

function setToken(token) {
  state.token = token;
  if (token) localStorage.setItem('pn_token', token);
  else localStorage.removeItem('pn_token');
}

// ===================== NAVEGACIÓN =====================

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  if (view === 'material') loadMaterialHistory();
  if (view === 'promociones') loadPromotions();
}

// ===================== BOOT =====================

async function bootApp() {
  try {
    const dashboard = await api('/businesses/me/dashboard');
    state.business = dashboard.business;

    authScreen.classList.add('hidden');
    appEl.classList.remove('hidden');

    document.getElementById('inicio-name').textContent = state.business.name;
    document.getElementById('sidebar-biz-name').textContent = state.business.name;

    renderReceipts(dashboard.metrics || {});
    renderCurrentPlan(dashboard.subscription);
    renderActivePromos(dashboard.promotions || []);
    fillProfileForm(state.business);

    await loadPlans(dashboard.subscription);
    await loadCorporatesIntoSelect();
  } catch (err) {
    // token inválido/expirado: regresar a login
    setToken(null);
    authScreen.classList.remove('hidden');
    appEl.classList.add('hidden');
    showAuthError('Tu sesión expiró. Entra de nuevo.');
  }
}

// ===================== INICIO: RECIBO DE MÉTRICAS =====================

function renderReceipts(metrics) {
  const items = [
    { label: 'Impresiones', value: metrics.impression || 0 },
    { label: 'Visitas al perfil', value: metrics.profile_view || 0 },
    { label: 'QR abiertos', value: metrics.qr_open || 0 },
    { label: 'Compras registradas', value: metrics.purchase || 0, cls: 'stamp' },
  ];
  const el = document.getElementById('metric-receipts');
  el.innerHTML = items.map((i) => `
    <div class="receipt">
      <span class="receipt-label">${i.label}</span>
      <span class="receipt-value ${i.cls || ''}">${i.value}</span>
    </div>
  `).join('');
}

function renderCurrentPlan(subscription) {
  const el = document.getElementById('inicio-plan');
  if (!subscription) {
    el.innerHTML = `<p class="empty-note">Aún no tienes un plan activo. Ve a "Mi plan" para elegir uno.</p>`;
    return;
  }
  el.innerHTML = `
    <strong>${subscription.Plan.name}</strong> — $${Number(subscription.Plan.priceMxn).toLocaleString('es-MX')}/mes<br>
    ${subscription.Plan.description}
  `;
}

function renderActivePromos(promos) {
  const el = document.getElementById('inicio-promos');
  if (!promos.length) {
    el.innerHTML = `<p class="empty-note">Todavía no has creado promociones.</p>`;
    return;
  }
  el.innerHTML = promos.map((p) => `
    <div>• <strong>${p.title}</strong>${p.discountPercent ? ` — ${p.discountPercent}%` : ''}</div>
  `).join('');
}

// ===================== PERFIL =====================

function fillProfileForm(business) {
  document.getElementById('p-name').value = business.name || '';
  document.getElementById('p-giro').value = business.giro || '';
  document.getElementById('p-city').value = business.city || '';
  document.getElementById('p-website').value = business.currentWebsite || '';
  document.getElementById('p-sells').value = business.whatItSells || '';
  document.getElementById('p-audience').value = business.targetAudience || '';
  if (business.mainObjective) document.getElementById('p-objective').value = business.mainObjective;

  if (business.requestedServices) {
    try {
      const services = JSON.parse(business.requestedServices);
      document.querySelectorAll('.checkbox-grid input[type="checkbox"]').forEach((cb) => {
        cb.checked = services.includes(cb.value);
      });
    } catch (e) { /* ignorar */ }
  }
}

document.getElementById('perfil-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const requestedServices = Array.from(document.querySelectorAll('.checkbox-grid input:checked')).map((cb) => cb.value);

  try {
    const updated = await api('/businesses/me', {
      method: 'PATCH',
      body: {
        name: document.getElementById('p-name').value,
        giro: document.getElementById('p-giro').value,
        city: document.getElementById('p-city').value,
        currentWebsite: document.getElementById('p-website').value,
        whatItSells: document.getElementById('p-sells').value,
        targetAudience: document.getElementById('p-audience').value,
        mainObjective: document.getElementById('p-objective').value,
        requestedServices,
      },
    });
    state.business = updated;
    document.getElementById('inicio-name').textContent = updated.name;
    document.getElementById('sidebar-biz-name').textContent = updated.name;
    const confirm = document.getElementById('perfil-saved');
    confirm.classList.remove('hidden');
    setTimeout(() => confirm.classList.add('hidden'), 2500);
  } catch (err) {
    alert(`No se pudo guardar: ${err.message}`);
  }
});

// ===================== PLANES =====================

async function loadPlans(currentSubscription) {
  const plans = await api('/plans', { auth: false });
  const currentPlanId = currentSubscription ? currentSubscription.planId : null;

  document.getElementById('plans-grid').innerHTML = plans.map((plan) => {
    const isCurrent = plan.id === currentPlanId;
    const features = JSON.parse(plan.features || '[]');
    return `
      <div class="plan-card ${isCurrent ? 'current' : ''}">
        <h3>${plan.name}</h3>
        <div class="plan-price">$${Number(plan.priceMxn).toLocaleString('es-MX')}/mes</div>
        <ul class="plan-features">${features.map((f) => `<li>${f}</li>`).join('')}</ul>
        <button class="plan-btn ${isCurrent ? 'is-current' : ''}" data-plan-id="${plan.id}" ${isCurrent ? 'disabled' : ''}>
          ${isCurrent ? 'Plan actual' : 'Elegir este plan'}
        </button>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.plan-btn:not(.is-current)').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api('/plans/subscribe', { method: 'POST', body: { planId: Number(btn.dataset.planId) } });
        await bootApp();
        switchView('inicio');
        document.querySelector('[data-view="inicio"]').click();
      } catch (err) {
        alert(`No se pudo cambiar de plan: ${err.message}`);
      }
    });
  });
}

// ===================== MATERIAL DEL MES =====================

document.getElementById('material-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mediaUrls = document.getElementById('m-media').value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await api('/businesses/me/content-requests', {
      method: 'POST',
      body: {
        monthTag: document.getElementById('m-month').value,
        whatToPromote: document.getElementById('m-promote').value,
        promotionDetails: document.getElementById('m-promo-details').value,
        whatsNew: document.getElementById('m-new').value,
        mediaUrls,
        objective: document.getElementById('m-objective').value,
      },
    });
    e.target.reset();
    await loadMaterialHistory();
  } catch (err) {
    alert(`No se pudo enviar: ${err.message}`);
  }
});

const STATUS_LABELS = {
  submitted: 'Enviado', in_production: 'En producción', in_review: 'Contenido listo para revisar',
  approved: 'Aprobado', published: 'Publicado',
};

const CHANNEL_LABELS = {
  instagram_post: 'Instagram — Post',
  instagram_story: 'Instagram — Historia',
  facebook: 'Facebook',
  tiktok_script: 'TikTok — Guion',
  google_business: 'Google Business',
  whatsapp: 'WhatsApp',
  employee_offer: 'Oferta para empleados',
};

async function loadMaterialHistory() {
  const el = document.getElementById('material-history');
  el.innerHTML = 'Cargando…';
  const requests = await api('/businesses/me/content-requests');
  if (!requests.length) {
    el.innerHTML = `<p class="empty-note">Todavía no has enviado material. Usa el formulario de arriba.</p>`;
    return;
  }

  el.innerHTML = requests.map((r) => `
    <div class="content-request-block">
      <div class="history-item" data-toggle-request="${r.id}">
        <div class="history-item-main">
          <span class="history-item-title">${r.monthTag} — ${r.whatToPromote || 'Sin descripción'}</span>
          <span class="history-item-sub">Objetivo: ${r.objective || '—'}</span>
        </div>
        <span class="status-badge ${r.status === 'published' || r.status === 'approved' ? 'published' : ''}">${STATUS_LABELS[r.status] || r.status}</span>
      </div>
      <div class="content-items-panel hidden" id="items-panel-${r.id}"></div>
    </div>
  `).join('');

  document.querySelectorAll('[data-toggle-request]').forEach((row) => {
    row.addEventListener('click', () => toggleContentItems(row.dataset.toggleRequest));
  });
}

async function toggleContentItems(requestId) {
  const panel = document.getElementById(`items-panel-${requestId}`);
  const isHidden = panel.classList.contains('hidden');

  if (!isHidden) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  panel.innerHTML = 'Cargando contenido…';

  try {
    const { request, items } = await api(`/businesses/me/content-requests/${requestId}/items`);

    if (!items.length) {
      panel.innerHTML = `<p class="empty-note">Aún no hay contenido generado para este brief. Tu equipo lo está preparando.</p>`;
      return;
    }

    const itemsHtml = items.map((item) => `
      <div class="content-item-card">
        <span class="content-item-channel">${CHANNEL_LABELS[item.channel] || item.channel}</span>
        <p class="content-item-text">${escapeHtml(item.text)}</p>
      </div>
    `).join('');

    const approveButton = request.status === 'in_review'
      ? `<button class="btn-primary approve-btn" data-request-id="${requestId}">Aprobar todo el contenido</button>`
      : request.status === 'approved' || request.status === 'published'
        ? `<p class="save-confirm">Ya aprobaste este contenido. Listo para publicar.</p>`
        : '';

    panel.innerHTML = `<div class="content-items-grid">${itemsHtml}</div>${approveButton}`;

    const btn = panel.querySelector('.approve-btn');
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Aprobando…';
        try {
          await api(`/businesses/me/content-requests/${requestId}/approve`, { method: 'POST' });
          await loadMaterialHistory();
        } catch (err) {
          alert(`No se pudo aprobar: ${err.message}`);
          btn.disabled = false;
          btn.textContent = 'Aprobar todo el contenido';
        }
      });
    }
  } catch (err) {
    panel.innerHTML = `<p class="empty-note">No se pudo cargar el contenido: ${err.message}</p>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===================== PROMOCIONES =====================

async function loadCorporatesIntoSelect() {
  const select = document.getElementById('promo-corporate');
  const corporates = await api('/corporates', { auth: false });
  select.innerHTML = '<option value="">Todos los corporativos</option>' +
    corporates.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
}

document.getElementById('promo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const corporateId = document.getElementById('promo-corporate').value;
  try {
    await api('/promotions', {
      method: 'POST',
      body: {
        title: document.getElementById('promo-title').value,
        discountPercent: document.getElementById('promo-discount').value
          ? Number(document.getElementById('promo-discount').value) : undefined,
        corporateId: corporateId ? Number(corporateId) : undefined,
      },
    });
    e.target.reset();
    await loadPromotions();
  } catch (err) {
    alert(`No se pudo crear la promoción: ${err.message}`);
  }
});

async function loadPromotions() {
  const el = document.getElementById('promo-list');
  el.innerHTML = 'Cargando…';
  const promos = await api(`/promotions?businessId=${state.business.id}`, { auth: false });
  if (!promos.length) {
    el.innerHTML = `<p class="empty-note">No tienes promociones todavía.</p>`;
    return;
  }
  el.innerHTML = promos.map((p) => `
    <div class="history-item">
      <div class="history-item-main">
        <span class="history-item-title">${p.title}${p.discountPercent ? ` — ${p.discountPercent}%` : ''}</span>
        <span class="history-item-sub">ID de promoción: ${p.id} · ${p.Corporate ? p.Corporate.name : 'Todos los corporativos'}</span>
      </div>
      <span class="status-badge ${p.active ? 'published' : ''}">${p.active ? 'Activa' : 'Inactiva'}</span>
    </div>
  `).join('');
}

// ===================== CANJEAR QR =====================

document.getElementById('redeem-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const resultEl = document.getElementById('redeem-result');
  resultEl.classList.remove('hidden', 'error');
  resultEl.textContent = 'Procesando…';

  try {
    const redemption = await api('/redemptions', {
      method: 'POST',
      body: {
        token: document.getElementById('r-token').value,
        promotionId: Number(document.getElementById('r-promotion').value),
        employeeId: Number(document.getElementById('r-employee').value),
        purchaseAmountMxn: document.getElementById('r-amount').value
          ? Number(document.getElementById('r-amount').value) : undefined,
      },
    });
    resultEl.innerHTML = `
      CANJE #${redemption.id} CONFIRMADO<br>
      VENTA: $${redemption.purchaseAmountMxn || '—'} MXN<br>
      DESCUENTO APLICADO: $${redemption.discountAppliedMxn || '—'} MXN
    `;
    e.target.reset();
  } catch (err) {
    resultEl.classList.add('error');
    resultEl.textContent = `Error: ${err.message}`;
  }
});

// ===================== INIT =====================

if (state.token) {
  bootApp();
}
