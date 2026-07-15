const resources = {
  overview: { title: 'Resumen' },
  alojamientos: { api: '/admin/api/alojamientos', title: 'Alojamientos' },
  gastronomia: { api: '/admin/api/gastronomia', title: 'Gastronomía' },
  eventos: { api: '/admin/api/eventos', title: 'Eventos' },
  'datos-utiles': { api: '/admin/api/datos-utiles', title: 'Datos útiles', isDataUtil: true },
  users: { api: '/admin/api/users', title: 'Usuarios' },
  tickets: { api: '/admin/api/tickets', title: 'Tickets' },
  audit: { api: '/admin/api/audit', title: 'Auditoría', isAudit: true },
  reviews: { api: '/admin/api/reviews', title: 'Reseñas' },
  uploads: { api: '/admin/api/uploads', title: 'Uploads' },
};

let currentEdit = null;
let currentAdminSession = { user: 'anonymous', role: 'guest' };

function getEditorTextarea(resource) {
  return document.getElementById(`new-${resource}-body`);
}

function getUserForm() {
  return {
    username: document.getElementById('user-username'),
    name: document.getElementById('user-name'),
    password: document.getElementById('user-password'),
    role: document.getElementById('user-role'),
    status: document.getElementById('user-status'),
  };
}

function getUserPayload() {
  const form = getUserForm();
  return {
    username: form.username?.value?.trim(),
    name: form.name?.value?.trim(),
    password: form.password?.value || undefined,
    role: form.role?.value?.trim(),
    status: form.status?.value?.trim() || 'active',
  };
}

function setUserForm(item = {}) {
  const form = getUserForm();
  if (!form.username) return;
  form.username.value = item.username || '';
  form.name.value = item.name || '';
  form.role.value = item.role || '';
  form.status.value = item.status || 'active';
  if (form.password) form.password.value = '';
}

function clearUserForm() {
  const form = getUserForm();
  if (!form.username) return;
  form.username.value = '';
  form.name.value = '';
  form.role.value = '';
  form.status.value = 'active';
  if (form.password) form.password.value = '';
}

function getEventForm() {
  return {
    titulo: document.getElementById('event-titulo'),
    descripcion: document.getElementById('event-descripcion'),
    fecha: document.getElementById('event-fecha'),
    hora: document.getElementById('event-hora'),
    lugar: document.getElementById('event-lugar'),
    tipo: document.getElementById('event-tipo'),
    imagen: document.getElementById('event-imagen'),
    status: document.getElementById('event-status'),
    imageFile: document.getElementById('event-image-file'),
  };
}

function getEventPayload() {
  const form = getEventForm();
  return {
    titulo: form.titulo?.value?.trim(),
    descripcion: form.descripcion?.value?.trim(),
    fecha: form.fecha?.value || undefined,
    hora: form.hora?.value || undefined,
    lugar: form.lugar?.value?.trim(),
    tipo: form.tipo?.value?.trim(),
    imagen: form.imagen?.value?.trim(),
    status: form.status?.value?.trim() || 'published',
  };
}

function setEventForm(item = {}) {
  const form = getEventForm();
  if (!form.titulo) return;
  form.titulo.value = item.titulo || '';
  form.descripcion.value = item.descripcion || '';
  form.fecha.value = item.fecha || '';
  form.hora.value = item.hora || '';
  form.lugar.value = item.lugar || '';
  form.tipo.value = item.tipo || '';
  form.imagen.value = item.imagen || '';
  form.status.value = item.status || 'published';
  if (form.imageFile) form.imageFile.value = '';
  updateImagePreview('event-image-file', 'event-image-preview', item.imagen);
}

function clearEventForm() {
  const form = getEventForm();
  if (!form.titulo) return;
  form.titulo.value = '';
  form.descripcion.value = '';
  form.fecha.value = '';
  form.hora.value = '';
  form.lugar.value = '';
  form.tipo.value = '';
  form.imagen.value = '';
  form.status.value = 'published';
  updateImagePreview('event-image-file', 'event-image-preview', '');
}

function getAlojamientoForm() {
  return {
    titulo: document.getElementById('alojamiento-titulo'),
    categoria: document.getElementById('alojamiento-categoria'),
    lat: document.getElementById('alojamiento-lat'),
    lon: document.getElementById('alojamiento-lon'),
    rating: document.getElementById('alojamiento-rating'),
    ubicacion: document.getElementById('alojamiento-ubicacion'),
    mainImg: document.getElementById('alojamiento-mainImg'),
    activo: document.getElementById('alojamiento-activo'),
    status: document.getElementById('alojamiento-status'),
    descripcionLarga: document.getElementById('alojamiento-descripcionLarga'),
    imageFile: document.getElementById('alojamiento-image-file'),
  };
}

function getAlojamientoPayload() {
  const form = getAlojamientoForm();
  return {
    titulo: form.titulo?.value?.trim(),
    categoria: form.categoria?.value?.trim(),
    lat: form.lat?.value ? Number(form.lat.value) : undefined,
    lon: form.lon?.value ? Number(form.lon.value) : undefined,
    rating: form.rating?.value?.trim(),
    ubicacion: form.ubicacion?.value?.trim(),
    mainImg: form.mainImg?.value?.trim(),
    activo: form.activo?.value === '1' ? 1 : 0,
    status: form.status?.value?.trim() || 'published',
    descripcionLarga: form.descripcionLarga?.value?.trim(),
  };
}

function setAlojamientoForm(item = {}) {
  const form = getAlojamientoForm();
  if (!form.titulo) return;
  form.titulo.value = item.titulo || '';
  form.categoria.value = item.categoria || '';
  form.lat.value = item.lat || '';
  form.lon.value = item.lon || '';
  form.rating.value = item.rating || '';
  form.ubicacion.value = item.ubicacion || '';
  form.mainImg.value = item.mainImg || '';
  form.activo.value = item.activo ? '1' : '0';
  form.status.value = item.status || 'published';
  form.descripcionLarga.value = item.descripcionLarga || '';
  if (form.imageFile) form.imageFile.value = '';
  updateImagePreview('alojamiento-image-file', 'alojamiento-image-preview', item.mainImg);
}

function clearAlojamientoForm() {
  const form = getAlojamientoForm();
  if (!form.titulo) return;
  form.titulo.value = '';
  form.categoria.value = '';
  form.lat.value = '';
  form.lon.value = '';
  form.rating.value = '';
  form.ubicacion.value = '';
  form.mainImg.value = '';
  form.activo.value = '1';
  form.status.value = 'published';
  form.descripcionLarga.value = '';
  updateImagePreview('alojamiento-image-file', 'alojamiento-image-preview', '');
}

function getGastronomiaForm() {
  return {
    nombre: document.getElementById('gastronomia-nombre'),
    tipo: document.getElementById('gastronomia-tipo'),
    direccion: document.getElementById('gastronomia-direccion'),
    horario: document.getElementById('gastronomia-horario'),
    imagen: document.getElementById('gastronomia-imagen'),
    activo: document.getElementById('gastronomia-activo'),
    status: document.getElementById('gastronomia-status'),
    descripcion: document.getElementById('gastronomia-descripcion'),
    imageFile: document.getElementById('gastronomia-image-file'),
  };
}

function getGastronomiaPayload() {
  const form = getGastronomiaForm();
  return {
    nombre: form.nombre?.value?.trim(),
    tipo: form.tipo?.value?.trim(),
    direccion: form.direccion?.value?.trim(),
    horario: form.horario?.value?.trim(),
    imagen: form.imagen?.value?.trim(),
    activo: form.activo?.value === '1' ? 1 : 0,
    status: form.status?.value?.trim() || 'published',
    descripcion: form.descripcion?.value?.trim(),
  };
}

function setGastronomiaForm(item = {}) {
  const form = getGastronomiaForm();
  if (!form.nombre) return;
  form.nombre.value = item.nombre || '';
  form.tipo.value = item.tipo || '';
  form.direccion.value = item.direccion || '';
  form.horario.value = item.horario || '';
  form.imagen.value = item.imagen || '';
  form.activo.value = item.activo ? '1' : '0';
  form.status.value = item.status || 'published';
  form.descripcion.value = item.descripcion || '';
  if (form.imageFile) form.imageFile.value = '';
  updateImagePreview('gastronomia-image-file', 'gastronomia-image-preview', item.imagen);
}

function clearGastronomiaForm() {
  const form = getGastronomiaForm();
  if (!form.nombre) return;
  form.nombre.value = '';
  form.tipo.value = '';
  form.direccion.value = '';
  form.horario.value = '';
  form.imagen.value = '';
  form.activo.value = '1';
  form.status.value = 'published';
  form.descripcion.value = '';
  if (form.imageFile) form.imageFile.value = '';
  updateImagePreview('gastronomia-image-file', 'gastronomia-image-preview', '');
}

function updateImagePreview(fileInputId, previewId, imageUrl) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  if (imageUrl) {
    preview.src = imageUrl;
    preview.style.display = 'block';
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }
}

function setupImageFileInput(fileInputId, imageFieldId, previewId) {
  const fileInput = document.getElementById(fileInputId);
  const imageField = document.getElementById(imageFieldId);
  if (!fileInput || !imageField) return;
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      imageField.value = '';
      updateImagePreview(fileInputId, previewId, '');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      updateImagePreview(fileInputId, previewId, dataUrl);
      const result = await fetchJson('/admin/api/upload-image', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, dataUrl }),
      });
      if (result.error) {
        alert('Error subiendo imagen: ' + result.error);
        imageField.value = dataUrl;
        return;
      }
      imageField.value = result.url || dataUrl;
      updateImagePreview(fileInputId, previewId, result.url || dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

function setupImageFileInputs() {
  setupImageFileInput('event-image-file', 'event-imagen', 'event-image-preview');
  setupImageFileInput('alojamiento-image-file', 'alojamiento-mainImg', 'alojamiento-image-preview');
  setupImageFileInput('gastronomia-image-file', 'gastronomia-imagen', 'gastronomia-image-preview');
}

function getDatosUtilesForm() {
  return {
    categoria: document.getElementById('datos-utiles-categoria'),
    titulo: document.getElementById('datos-utiles-titulo'),
    descripcion: document.getElementById('datos-utiles-descripcion'),
    contenido: document.getElementById('datos-utiles-contenido'),
  };
}

function getDatosUtilesPayload() {
  const form = getDatosUtilesForm();
  let contenidoValue = form.contenido?.value?.trim() || '';
  let contenido = {};
  if (contenidoValue) {
    try {
      contenido = JSON.parse(contenidoValue);
    } catch (err) {
      alert('Contenido JSON inválido: ' + err.message);
      return null;
    }
  }
  return {
    categoria: form.categoria?.value?.trim(),
    titulo: form.titulo?.value?.trim(),
    descripcion: form.descripcion?.value?.trim(),
    contenido,
  };
}

function setDatosUtilesForm(item = {}) {
  const form = getDatosUtilesForm();
  if (!form.categoria) return;
  form.categoria.value = item.categoria || '';
  form.titulo.value = item.titulo || '';
  form.descripcion.value = item.descripcion || '';
  form.contenido.value = item.contenido ? JSON.stringify(item.contenido, null, 2) : '';
}

function clearDatosUtilesForm() {
  const form = getDatosUtilesForm();
  if (!form.categoria) return;
  form.categoria.value = '';
  form.titulo.value = '';
  form.descripcion.value = '';
  form.contenido.value = '';
}

function getTicketForm() {
  return {
    title: document.getElementById('ticket-title'),
    message: document.getElementById('ticket-message'),
    severity: document.getElementById('ticket-severity'),
    email: document.getElementById('ticket-email'),
  };
}

function getTicketPayload() {
  const form = getTicketForm();
  return {
    title: form.title?.value?.trim(),
    message: form.message?.value?.trim(),
    severity: form.severity?.value || 'normal',
    email: form.email?.value?.trim() || undefined,
  };
}

function setTicketForm(item = {}) {
  const form = getTicketForm();
  if (!form.title) return;
  form.title.value = item.title || item.titulo || '';
  form.message.value = item.message || '';
  form.severity.value = item.severity || 'normal';
  form.email.value = item.email || '';
}

function clearTicketForm() {
  const form = getTicketForm();
  if (!form.title) return;
  form.title.value = '';
  form.message.value = '';
  form.severity.value = 'normal';
  form.email.value = '';
}

function setEditState(resource, item) {
  const identifier = resource === 'datos-utiles' ? item.categoria : item.id || item.categoria;
  currentEdit = { resource, id: identifier };
  const state = document.getElementById(`edit-state-${resource}`);
  if (resource === 'users') {
    setUserForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    const form = getUserForm();
    if (form.username) {
      form.username.focus();
      form.username.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'eventos') {
    setEventForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    const form = getEventForm();
    if (form.titulo) {
      form.titulo.focus();
      form.titulo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'alojamientos') {
    setAlojamientoForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    const form = getAlojamientoForm();
    if (form.titulo) {
      form.titulo.focus();
      form.titulo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'gastronomia') {
    setGastronomiaForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    const form = getGastronomiaForm();
    if (form.nombre) {
      form.nombre.focus();
      form.nombre.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'datos-utiles') {
    setDatosUtilesForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    const form = getDatosUtilesForm();
    if (form.categoria) {
      form.categoria.readOnly = true;
      form.categoria.focus();
      form.categoria.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'tickets') {
    setTicketForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    const form = getTicketForm();
    if (form.title) {
      form.title.focus();
      form.title.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  const textarea = getEditorTextarea(resource);
  if (!textarea) return;
  textarea.value = JSON.stringify(item, null, 2);
  textarea.focus();
  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
}

function clearEditState(resource) {
  if (currentEdit && currentEdit.resource !== resource) return;
  currentEdit = null;
  if (resource === 'users') {
    clearUserForm();
    const state = document.getElementById(`edit-state-${resource}`);
    if (state) state.textContent = '';
    return;
  }
  if (resource === 'eventos') {
    clearEventForm();
    const state = document.getElementById(`edit-state-${resource}`);
    if (state) state.textContent = '';
    return;
  }
  if (resource === 'alojamientos') {
    clearAlojamientoForm();
    const state = document.getElementById(`edit-state-${resource}`);
    if (state) state.textContent = '';
    return;
  }
  if (resource === 'gastronomia') {
    clearGastronomiaForm();
    const state = document.getElementById(`edit-state-${resource}`);
    if (state) state.textContent = '';
    return;
  }
  if (resource === 'datos-utiles') {
    clearDatosUtilesForm();
    const form = getDatosUtilesForm();
    if (form.categoria) form.categoria.readOnly = false;
    const state = document.getElementById(`edit-state-${resource}`);
    if (state) state.textContent = '';
    return;
  }
  if (resource === 'tickets') {
    clearTicketForm();
    const state = document.getElementById(`edit-state-${resource}`);
    if (state) state.textContent = '';
    return;
  }
  const textarea = getEditorTextarea(resource);
  if (textarea) textarea.value = '';
  const state = document.getElementById(`edit-state-${resource}`);
  if (state) state.textContent = '';
}

function setCreateState(resource) {
  currentEdit = null;
  const state = document.getElementById(`edit-state-${resource}`);
  if (resource === 'users') {
    clearUserForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    const form = getUserForm();
    if (form.username) {
      form.username.focus();
      form.username.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'eventos') {
    clearEventForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    const form = getEventForm();
    if (form.titulo) {
      form.titulo.focus();
      form.titulo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'alojamientos') {
    clearAlojamientoForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    const form = getAlojamientoForm();
    if (form.titulo) {
      form.titulo.focus();
      form.titulo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'gastronomia') {
    clearGastronomiaForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    const form = getGastronomiaForm();
    if (form.nombre) {
      form.nombre.focus();
      form.nombre.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'datos-utiles') {
    clearDatosUtilesForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    const form = getDatosUtilesForm();
    if (form.categoria) {
      form.categoria.readOnly = false;
      form.categoria.focus();
      form.categoria.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (resource === 'tickets') {
    clearTicketForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    const form = getTicketForm();
    if (form.title) {
      form.title.focus();
      form.title.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  const textarea = getEditorTextarea(resource);
  if (textarea) textarea.value = '';
  if (state) state.textContent = `Creando nuevo ${resource}`;
  if (textarea) {
    textarea.focus();
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function getAdminSessionHeaders() {
  return {};
}

function notifyPublicDataRefresh() {
  try {
    localStorage.setItem('sanroque-admin-sync', String(Date.now()));
  } catch (e) {}
}

async function logoutAdmin() {
  try {
    await fetchJson('/admin/logout', { method: 'POST' });
  } catch (e) {}
  currentAdminSession = { user: 'anonymous', role: 'guest' };
  document.body.classList.add('logged-out');
  const loginView = document.getElementById('login-view');
  if (loginView) loginView.style.display = 'flex';
  await refreshAll();
}

async function serverLogin() {
  // accept credentials from the login overlay only
  const user = (document.getElementById('login-user')?.value?.trim());
  const pass = (document.getElementById('login-pass')?.value) || '';
  if (!user || !pass) { alert('Usuario y contraseña requeridos'); return; }
  const result = await fetchJson('/admin/login', { method: 'POST', body: JSON.stringify({ username: user, password: pass }) });
  if (result.error) { alert('Login falló: ' + result.error); return; }
  const overlayPwd = document.getElementById('login-pass');
  if (overlayPwd) overlayPwd.value = '';
  document.body.classList.remove('logged-out');
  const loginView = document.getElementById('login-view');
  if (loginView) loginView.style.display = 'none';
  await loadSessionInfo();
  await refreshAll();
}

function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : '');
  try { localStorage.setItem('admin_theme', t); } catch (e) {}
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? 'Modo claro' : 'Modo noche';
}

function toggleTheme() {
  const cur = (localStorage.getItem('admin_theme') || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'));
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

async function fetchJson(path, opts = {}) {
  try {
    const defaultHeaders = Object.assign({
      'Content-Type': 'application/json',
    }, getAdminSessionHeaders());
    const r = await fetch(path, Object.assign({
      headers: defaultHeaders,
      credentials: 'include',
    }, opts));

    // Read text body safely and try to parse JSON when possible
    const text = await r.text().catch(() => '');
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        parsed = text;
      }
    }

    if (!r.ok) {
      if (r.status === 401) {
        try {
          document.body.classList.add('logged-out');
          const loginView = document.getElementById('login-view');
          if (loginView) loginView.style.display = 'flex';
        } catch (e) {}
      }
      return { error: `${r.status} ${r.statusText} ${text}`, status: r.status, body: parsed };
    }

    // Return parsed JSON when available, otherwise raw text or empty object
    if (parsed === null) return {};
    return parsed;
  } catch (e) {
    return { error: e.message };
  }
}

function toggleSection(sectionId) {
  document.querySelectorAll('.section').forEach((sec) => sec.classList.remove('active'));
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.section === sectionId));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');
}

function renderHealth(text) {
  document.getElementById('health').textContent = text;
}

function renderCount(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderRolePill(role) {
  const normalized = (role || 'guest').toString().toLowerCase();
  return `<span class="pill role-pill ${normalized}">${normalized}</span>`;
}

function renderStatusPill(status) {
  const normalized = (status || 'pending').toString().toLowerCase();
  return `<span class="pill status-pill ${normalized}">${normalized}</span>`;
}

function normalizeAdminRole(role) {
  const normalized = String(role || 'guest').toLowerCase();
  return ['super-admin', 'editor', 'viewer', 'guest'].includes(normalized) ? normalized : 'guest';
}

function getSearchQuery(resource) {
  const input = document.querySelector(`input[data-search-resource="${resource}"]`);
  return (input?.value || '').trim().toLowerCase();
}

function filterItems(items, query) {
  if (!query) return items;
  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
}

function updatePagination(resource, visible, total, query) {
  const el = document.getElementById(`${resource}-pagination`);
  if (!el) return;
  if (!query) {
    el.textContent = `Total: ${visible}`;
    return;
  }
  el.textContent = `Mostrando ${visible} de ${total} registros.`;
}

function getCurrentAdminSession() {
  return currentAdminSession;
}

function mapResourceToPermissionName(resource) {
  if (resource === 'datos-utiles') return 'datos_utiles';
  return resource;
}

function canReadResource(resource, role) {
  const name = mapResourceToPermissionName(resource);
  if (name === 'users') return role === 'super-admin';
  if (name === 'reviews') return ['super-admin', 'editor', 'viewer'].includes(role);
  if (name === 'audit') return ['super-admin', 'editor'].includes(role);
  if (name === 'uploads') return ['super-admin', 'editor'].includes(role);
  if (name === 'backup') return role === 'super-admin';
  return ['super-admin', 'editor', 'viewer', 'guest'].includes(role);
}

function canWriteResource(resource, role) {
  const name = mapResourceToPermissionName(resource);
  if (name === 'users') return role === 'super-admin';
  if (name === 'reviews') return ['super-admin', 'editor'].includes(role);
  return ['super-admin', 'editor'].includes(role);
}

function canDeleteResource(resource, role) {
  const name = mapResourceToPermissionName(resource);
  if (name === 'users') return role === 'super-admin';
  if (name === 'reviews') return role === 'super-admin';
  if (name === 'uploads') return role === 'super-admin';
  return ['super-admin', 'editor'].includes(role);
}

function renderSessionOverview() {
  const session = getCurrentAdminSession();
  renderCount('overview-session-user', session.user || 'anonymous');
  renderCount('overview-session-role', session.role || 'guest');
}

function updateRoleUI() {
  const session = getCurrentAdminSession();
  const role = session.role;
  renderSessionOverview();

  // If guest (logged out) show only the login controls: hide tabs, sections and header actions.
  const isGuest = role === 'guest';
  const tabsContainer = document.querySelector('.tabs');
  if (tabsContainer) tabsContainer.style.display = isGuest ? 'none' : '';
  // header action buttons
  const headerRefresh = document.getElementById('refreshAll');
  const headerLogout = document.getElementById('logout');
  const headerTheme = document.getElementById('theme-toggle');
  if (headerRefresh) headerRefresh.style.display = isGuest ? 'none' : '';
  if (headerLogout) headerLogout.style.display = isGuest ? 'none' : '';
  if (headerTheme) headerTheme.style.display = isGuest ? 'none' : '';

  // top header and main toolbar
  const headerEl = document.querySelector('.header');
  const mainToolbar = document.getElementById('main-toolbar');
  if (headerEl) headerEl.style.display = isGuest ? 'none' : '';
  if (mainToolbar) mainToolbar.style.display = isGuest ? 'none' : '';
  // hide footer or other peripheral elements when guest
  document.querySelectorAll('.footer, #footer, .site-footer').forEach((el) => { el.style.display = isGuest ? 'none' : ''; });

  document.querySelectorAll('.tab').forEach((tab) => {
    const section = tab.dataset.section;
    if (isGuest) {
      tab.style.display = 'none';
      return;
    }
    if (section && section !== 'overview' && !canReadResource(section, role)) {
      tab.style.display = 'none';
    } else {
      tab.style.display = '';
    }
  });

  document.querySelectorAll('.section').forEach((section) => {
    if (isGuest) {
      section.style.display = 'none';
      return;
    }
    if (section.id && section.id !== 'overview' && !canReadResource(section.id, role)) {
      section.style.display = 'none';
    } else {
      section.style.display = '';
    }
  });

  document.querySelectorAll('button[data-action="create"]').forEach((button) => {
    const resource = button.dataset.resource;
    button.disabled = !canWriteResource(resource, role);
  });

  document.querySelectorAll('button[data-action="submit"]').forEach((button) => {
    const resource = button.dataset.resource;
    if (!resource) return;
    button.disabled = !canWriteResource(resource, role);
  });

  document.querySelectorAll('button[data-action="edit"]').forEach((button) => {
    const resource = button.dataset.resource;
    button.disabled = !canWriteResource(resource, role);
  });

  document.querySelectorAll('button[data-action="delete"]').forEach((button) => {
    const resource = button.dataset.resource;
    button.disabled = !canDeleteResource(resource, role);
  });

  document.querySelectorAll('.resource-readonly-notice').forEach((notice) => {
    const resource = notice.dataset.resource;
    if (resource && !canWriteResource(resource, role)) {
      notice.style.display = '';
    } else {
      notice.style.display = 'none';
    }
  });
}

async function loadSessionInfo() {
  // show checking placeholder
  document.body.classList.add('checking-session');
  const loginSpinner = document.getElementById('login-spinner');
  if (loginSpinner) loginSpinner.style.display = 'block';
  const result = await fetchJson('/admin/api/session');
  if (!result.error && result.admin) {
    currentAdminSession = {
      user: result.admin.user || 'anonymous',
      role: normalizeAdminRole(result.admin.role),
    };
    document.body.classList.remove('logged-out');
    const loginView = document.getElementById('login-view');
    if (loginView) loginView.style.display = 'none';
  } else {
    currentAdminSession = { user: 'anonymous', role: 'guest' };
    document.body.classList.add('logged-out');
    const loginView = document.getElementById('login-view');
    if (loginView) loginView.style.display = 'flex';
  }
  updateRoleUI();
  document.body.classList.remove('checking-session');
  if (loginSpinner) loginSpinner.style.display = 'none';
  return result;
}

function renderList(containerId, items, renderItem) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!Array.isArray(items) || !items.length) {
    container.innerHTML = '<div class="card"><p>No hay elementos disponibles.</p></div>';
    return;
  }
  container.innerHTML = items.map(renderItem).join('');
}

function renderUsers(item) {
  if (!item || typeof item !== 'object') return '';
  const role = getCurrentAdminSession().role;
  const canEdit = canWriteResource('users', role);
  const canDelete = canDeleteResource('users', role);
  return `
      <div class="list-row">
        <div>
          <strong>${item.username || item.id}</strong>
          <div class="meta-row"><span class="row-label">Rol</span>${renderRolePill(item.role)}</div>
          <div class="meta-row"><span class="row-label">Estado</span>${renderStatusPill(item.status)}</div>
          <div class="small">${item.name || 'Sin nombre'}</div>
        </div>
        <div class="list-actions">
          ${canEdit ? `<button data-action="edit" data-resource="users" data-id="${item.id}">Editar</button>` : ''}
          ${canDelete ? `<button data-action="delete" data-resource="users" data-id="${item.id}">Eliminar</button>` : ''}
        </div>
      </div>
    `;
}

function renderReviews(item) {
  if (!item || typeof item !== 'object') return '';
  const role = getCurrentAdminSession().role;
  const canModerate = canWriteResource('reviews', role);
  const canDelete = canDeleteResource('reviews', role);
  return `
    <div class="list-row">
      <div>
        <strong>${item.id}</strong><br>
        <div class="small">${item.comment || item.text || 'Sin comentario'}</div>
        ${renderStatusPill(item.status)}
      </div>
      <div class="list-actions">
        ${canModerate ? `<button data-action="approve" data-resource="reviews" data-id="${item.id}">Aprobar</button><button data-action="reject" data-resource="reviews" data-id="${item.id}">Rechazar</button>` : ''}
        ${canDelete ? `<button data-action="delete" data-resource="reviews" data-id="${item.id}">Eliminar</button>` : ''}
      </div>
    </div>
  `;
}

function renderTickets(item) {
  if (!item || typeof item !== 'object') return '';
  const role = getCurrentAdminSession().role;
  const canEdit = canWriteResource('tickets', role);
  const canDelete = canDeleteResource('tickets', role);
  const status = item.status || 'open';
  return `
    <div class="list-row">
      <div>
        <strong>${item.title || item.id}</strong>
        <div class="small">${item.message ? (item.message.length > 160 ? item.message.slice(0, 160) + '…' : item.message) : 'Sin descripción'}</div>
        <div class="meta-row"><span class="pill">${status}</span><span class="pill">${item.severity || 'normal'}</span></div>
        <div class="small">${item.email ? item.email : ''}</div>
      </div>
      <div class="list-actions">
        ${canEdit ? `<button data-action="edit" data-resource="tickets" data-id="${item.id}">Editar</button>` : ''}
        ${canDelete ? `<button data-action="delete" data-resource="tickets" data-id="${item.id}">Eliminar</button>` : ''}
      </div>
    </div>
  `;
}

function renderAudit(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return `
    <div class="list-row">
      <div>
        <strong>${entry.action}</strong>
        <div class="small">${entry.resource} / ${entry.resourceId}</div>
        <div class="small">${entry.adminUser || 'anon'} · ${entry.adminRole || 'guest'} · ${new Date(entry.createdAt).toLocaleString()}</div>
        <details>
          <summary class="small">Ver cambios</summary>
          <pre>${JSON.stringify(entry.changes || {}, null, 2)}</pre>
        </details>
      </div>
      <div class="list-actions">
        <button data-action="view-audit" data-resource="audit" data-id="${entry.id}">Ver alerta</button>
      </div>
    </div>
  `;
}

function renderUploads(item) {
  if (!item || typeof item !== 'object') return '';
  return `
    <div class="list-row">
      <div>
        <strong>${item.name}</strong><br>
        <a href="${item.url}" target="_blank" rel="noreferrer">Abrir archivo</a>
      </div>
      <div class="list-actions">
        <button data-action="delete" data-resource="uploads" data-id="${encodeURIComponent(item.name)}">Eliminar</button>
      </div>
    </div>
  `;
}

function renderGenericItems(items, textKey) {
  const resource = textKey === 'nombre' ? 'gastronomia' : textKey === 'titulo' ? 'alojamientos' : textKey === 'descripcion' ? 'eventos' : '';
  const role = getCurrentAdminSession().role;
  const canEdit = canWriteResource(resource, role);
  const canDelete = canDeleteResource(resource, role);
  return items.map((item) => `
    <div class="list-row">
      <div><strong>${item.id}</strong><br><span class="small">${item[textKey] || JSON.stringify(item).slice(0, 80)}</span></div>
      <div class="list-actions">
        ${canEdit ? `<button data-action="edit" data-resource="${resource}" data-id="${item.id}">Editar</button>` : ''}
        ${canDelete ? `<button data-action="delete" data-resource="${resource}" data-id="${item.id}">Eliminar</button>` : ''}
      </div>
    </div>
  `).join('');
}

function renderDataUtiles(items) {
  if (!items || !items.length) {
    return '<div class="card"><p>No hay datos útiles disponibles.</p></div>';
  }
  const role = getCurrentAdminSession().role;
  const canWrite = canWriteResource('datos-utiles', role);
  const canDelete = canDeleteResource('datos-utiles', role);
  return items.map((item) => {
    const visible = item.activo !== 0;
    return `
      <div class="list-row">
        <div>
          <strong>${item.categoria}</strong> · ${item.titulo || ''}<br>
          <span class="small">${item.descripcion || JSON.stringify(item.contenido || {}).slice(0, 80)}</span>
          <div class="meta-row"><span class="pill">${visible ? 'Visible' : 'Oculto'}</span></div>
        </div>
        <div class="list-actions">
          ${canWrite ? `<button data-action="edit" data-resource="datos-utiles" data-id="${item.categoria}">Editar</button>` : ''}
          ${canWrite ? `<button data-action="hide" data-resource="datos-utiles" data-id="${item.categoria}">${visible ? 'Ocultar' : 'Mostrar'}</button>` : ''}
          ${canDelete ? `<button data-action="delete" data-resource="datos-utiles" data-id="${item.categoria}">Eliminar</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function loadCounts() {
  renderSessionOverview();
  const role = getCurrentAdminSession().role;
  const usersRequest = role === 'super-admin' ? fetchJson('/admin/api/users') : Promise.resolve({ users: [], skipped: true });
  const [data, users, reviews, audit, alojamientos, gastronomia, eventos, tickets] = await Promise.all([
    fetchJson('/api/data'),
    usersRequest,
    fetchJson('/admin/api/reviews'),
    fetchJson('/admin/api/audit'),
    fetchJson('/admin/api/alojamientos'),
    fetchJson('/admin/api/gastronomia'),
    fetchJson('/admin/api/eventos'),
    fetchJson('/admin/api/tickets'),
  ]);

  if (data.error) {
    renderHealth(`Error cargando /api/data: ${data.error}`);
    return;
  }
  renderCount('count-aloj', (data.alojamientos || []).length);
  renderCount('count-gast', (data.gastronomia || []).length);
  renderCount('count-ev', (data.eventos || []).length);
  renderCount('count-du', Object.keys(data.datosUtiles || {}).length);

  if (users.error || users.skipped) {
    renderCount('count-users', 'sin permiso');
  } else {
    renderCount('count-users', (users.users || []).length);
  }

  if (reviews.error) {
    renderCount('count-reviews', 'sin permiso');
  } else {
    renderCount('count-reviews', (reviews.reviews || []).length);
  }

  if (audit.error) {
    renderCount('count-audit', 'sin permiso');
  } else {
    renderCount('count-audit', (audit.audit || []).length);
  }
  if (!tickets.error) renderCount('count-tickets', (Array.isArray(tickets) ? tickets.length : (tickets.length || (tickets.tickets || []).length)));
  else renderCount('count-tickets', 'sin permiso');

  const contentItems = [alojamientos, gastronomia, eventos].reduce((acc, items) => acc.concat(Array.isArray(items) ? items : []), []);
  const published = contentItems.filter((item) => item.status === 'published').length;
  const draft = contentItems.filter((item) => item.status === 'draft').length;
  const archived = contentItems.filter((item) => item.status === 'archived').length;
  const pendingReviews = Array.isArray(reviews.reviews) ? reviews.reviews.filter((item) => item.status !== 'approved').length : 0;

  renderCount('count-status-published', published);
  renderCount('count-status-draft', draft);
  renderCount('count-status-archived', archived);
  renderCount('count-review-pending', pendingReviews);
  // Try to render analytics panel if admin analytics are available
  try {
    const storeResp = await fetchJson('/admin/api/store');
    if (!storeResp.error && storeResp.store) {
      await loadAndRenderAnalytics(storeResp.store);
    }
  } catch (e) {}
}

// Load analytics renderer dynamically
async function loadAndRenderAnalytics(store) {
  try {
    if (!window.renderAnalyticsPanel) {
      const mod = await import('./analytics.js');
      window.renderAnalyticsPanel = mod.renderAnalyticsPanel;
    }
    const analytics = store.analytics || {};
    window.renderAnalyticsPanel('analytics-panel', analytics);
  } catch (e) {
    const el = document.getElementById('analytics-panel');
    if (el) el.innerHTML = `<div class="card"><p>Error cargando analytics: ${e.message}</p></div>`;
  }
}

async function loadResource(resource) {
  const info = resources[resource];
  if (!info) return;
  const result = await fetchJson(info.api);
  const listContainer = document.getElementById(`${resource}-list`);
  if (result.error) {
    if (listContainer) listContainer.innerHTML = `<div class="card"><strong>Error:</strong> ${result.error}</div>`;
    if (resource === 'uploads') updatePagination(resource, 0, 0, '');
    return;
  }
  const query = getSearchQuery(resource);
  if (resource === 'users') {
    const items = filterItems(result.users || [], query);
    renderList(`${resource}-list`, items, renderUsers);
    renderCount('count-users', items.length);
    updatePagination(resource, items.length, (result.users || []).length, query);
    return;
  }
  if (resource === 'audit') {
    const items = filterItems(result.audit || [], query);
    renderList(`${resource}-list`, items, renderAudit);
    renderCount('count-audit', items.length);
    updatePagination(resource, items.length, (result.audit || []).length, query);
    return;
  }
  if (resource === 'reviews') {
    const items = filterItems(result.reviews || [], query);
    renderList(`${resource}-list`, items, renderReviews);
    renderCount('count-reviews', items.length);
    updatePagination(resource, items.length, (result.reviews || []).length, query);
    return;
  }
  if (resource === 'tickets') {
    const items = filterItems(Array.isArray(result) ? result : (result.tickets || []), query);
    renderList(`${resource}-list`, items, renderTickets);
    renderCount('count-tickets', items.length);
    updatePagination(resource, items.length, (Array.isArray(result) ? result.length : (result.tickets || []).length), query);
    return;
  }
  if (resource === 'uploads') {
    const items = filterItems(result.uploads || [], query);
    renderList(`${resource}-list`, items, renderUploads);
    updatePagination(resource, items.length, (result.uploads || []).length, query);
    return;
  }
  if (resource === 'datos-utiles') {
    const items = filterItems(Array.isArray(result) ? result : [], query);
    document.getElementById(`${resource}-list`).innerHTML = renderDataUtiles(items);
    renderCount('count-du', items.length);
    updatePagination(resource, items.length, items.length, query);
    return;
  }
  const items = filterItems(Array.isArray(result) ? result : [], query);
  const role = getCurrentAdminSession().role;
  const canWrite = canWriteResource(resource, role);
  const key = resource === 'gastronomia' ? 'nombre' : resource === 'eventos' ? 'titulo' : 'titulo';
  document.getElementById(`${resource}-list`).innerHTML = items.map((item) => {
    const statusHtml = item.status ? renderStatusPill(item.status) : '';
    const active = item.activo !== undefined ? item.activo : 1;
    const activeHtml = item.activo !== undefined ? `<span class="pill">${active ? 'Activo' : 'Inactivo'}</span>` : '';
    const hideLabel = active ? 'Ocultar' : 'Mostrar';
    const details = resource === 'gastronomia'
      ? [item.tipo, item.direccion, item.horario].filter(Boolean).join(' · ')
      : resource === 'alojamientos'
        ? [item.categoria, item.ubicacion, item.rating].filter(Boolean).join(' · ')
        : resource === 'eventos'
          ? [item.tipo, item.lugar, item.fecha].filter(Boolean).join(' · ')
          : item[key] || '';
    return `
      <div class="list-row">
        <div>
          <strong>${item.id}</strong><br>
          <span class="small">${item[key] || JSON.stringify(item).slice(0, 80)}</span>
          ${details ? `<div class="small" style="margin-top:4px;">${details}</div>` : ''}
          <div class="meta-row">${statusHtml}${activeHtml}</div>
        </div>
        <div class="list-actions">
          ${canWrite ? `<button data-action="edit" data-resource="${resource}" data-id="${item.id}">Editar</button>` : ''}
          ${canWrite ? `<button data-action="hide" data-resource="${resource}" data-id="${item.id}">${hideLabel}</button>` : ''}
          ${canDeleteResource(resource, role) ? `<button data-action="delete" data-resource="${resource}" data-id="${item.id}">Eliminar</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
  updatePagination(resource, items.length, items.length, query);
}

async function loadHealth() {
  const data = await fetchJson('/admin/api/health');
  if (data && data.ok) {
    renderHealth('Servidor: OK');
  } else if (data && data.error) {
    renderHealth(`Error: ${data.error}`);
  } else {
    try { renderHealth(JSON.stringify(data, null, 2)); } catch (e) { renderHealth(String(data)); }
  }
}

async function refreshAll() {
  await loadSessionInfo();
  await loadCounts();
  const role = getCurrentAdminSession().role;
  const permitted = Object.keys(resources).filter((key) => key !== 'overview' && canReadResource(key, role));
  await Promise.all(permitted.map(loadResource));
  await loadHealth();
}

function handleAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const resource = button.dataset.resource;
  const id = button.dataset.id;
  if (action === 'load') {
    loadResource(resource);
    return;
  }
  if (action === 'create') {
    setCreateState(resource);
    return;
  }
  if (action === 'submit') {
    sendCreate(resource);
    return;
  }
  if (action === 'hide') {
    return toggleResourceVisibility(resource, id);
  }
  if (action === 'delete') {
    return sendDelete(resource, id);
  }
  if (action === 'edit') {
    return loadItemForEdit(resource, id);
  }
  if (action === 'cancel-edit') {
    clearEditState(resource);
    return;
  }
  if (action === 'approve' || action === 'reject') {
    return updateReviewStatus(id, action === 'approve' ? 'approved' : 'rejected');
  }
  if (action === 'view-audit') {
    return viewAudit(id);
  }
  if (action === 'download-backup') {
    return downloadBackup();
  }
  if (action === 'restore-backup') {
    return restoreBackup();
  }
  if (action === 'delete' && resource === 'uploads') {
    return sendDelete(resource, decodeURIComponent(id));
  }
}

async function downloadBackup() {
  const result = await fetchJson('/admin/api/backup');
  if (result.error) {
    alert(`Error descargando backup: ${result.error}`);
    return;
  }
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  renderCount('backup-status', 'Backup descargado localmente.');
}

async function restoreBackup() {
  const textarea = document.getElementById('backup-restore-body');
  if (!textarea) return;
  let payload;
  try {
    payload = JSON.parse(textarea.value);
  } catch (err) {
    alert('JSON inválido: ' + err.message);
    return;
  }
  const result = await fetchJson('/admin/api/restore', { method: 'POST', body: JSON.stringify(payload) });
  if (result.error) {
    alert(`Error restaurando backup: ${result.error}`);
    return;
  }
  alert('Backup restaurado correctamente.');
  await refreshAll();
}

async function viewAudit(id) {
  if (!id) return;
  const result = await fetchJson('/admin/api/audit');
  if (result.error) {
    alert(`Error cargando auditoría: ${result.error}`);
    return;
  }
  const entry = (result.audit || []).find((item) => String(item.id) === String(id));
  if (!entry) {
    alert('Entrada de auditoría no encontrada.');
    return;
  }
  alert(`Auditoría ${entry.id}\nAcción: ${entry.action}\nRecurso: ${entry.resource}\nID: ${entry.resourceId}\nUsuario: ${entry.adminUser} (${entry.adminRole})\nFecha: ${new Date(entry.createdAt).toLocaleString()}\nCambios: ${JSON.stringify(entry.changes, null, 2)}`);
}

async function loadItemForEdit(resource, id) {
  const info = resources[resource];
  if (!info || !id) return;
  const item = await fetchJson(`${info.api}/${encodeURIComponent(id)}`);
  if (item.error) {
    alert(`Error cargando item: ${item.error}`);
    return;
  }
  if (resource === 'users') {
    setUserForm(item);
  }
  if (resource === 'eventos') {
    setEventForm(item);
  }
  if (resource === 'alojamientos') {
    setAlojamientoForm(item);
  }
  if (resource === 'gastronomia') {
    setGastronomiaForm(item);
  }
  if (resource === 'datos-utiles') {
    setDatosUtilesForm(item);
  }
  setEditState(resource, item);
}

async function sendCreate(resource) {
  const textarea = document.getElementById(`new-${resource}-body`);
  let payload;
  if (resource === 'users') {
    payload = getUserPayload();
    if (!payload.username) {
      alert('El usuario necesita un username.');
      return;
    }
  } else if (resource === 'eventos') {
    payload = getEventPayload();
    if (!payload.titulo) {
      alert('El evento necesita un título.');
      return;
    }
  } else if (resource === 'alojamientos') {
    payload = getAlojamientoPayload();
    if (!payload.titulo || !payload.categoria) {
      alert('El alojamiento necesita título y categoría.');
      return;
    }
  } else if (resource === 'gastronomia') {
    payload = getGastronomiaPayload();
    if (!payload.nombre || !payload.tipo) {
      alert('La gastronomía necesita nombre y tipo.');
      return;
    }
  } else if (resource === 'tickets') {
    payload = getTicketPayload();
    if (!payload.title || !payload.message) {
      alert('El ticket necesita título y mensaje.');
      return;
    }
  } else if (resource === 'datos-utiles') {
    payload = getDatosUtilesPayload();
    if (!payload) return;
    if (!payload.categoria) {
      alert('El dato útil necesita una categoría.');
      return;
    }
  } else {
    if (!textarea) return;
    try {
      payload = JSON.parse(textarea.value);
    } catch (err) {
      alert('JSON inválido: ' + err.message);
      return;
    }
  }
  const info = resources[resource];
  if (!info) return;
  let path = info.api;
  let method = 'POST';
  if (resource === 'datos-utiles') {
    if (!payload.categoria) {
      alert('El dato útil necesita una propiedad "categoria".');
      return;
    }
    if (currentEdit && currentEdit.resource === resource) {
      path = `${info.api}/${encodeURIComponent(currentEdit.id)}`;
    } else {
      path = `${info.api}/${encodeURIComponent(payload.categoria)}`;
    }
    method = 'PUT';
  } else if (resource === 'users') {
    if (currentEdit && currentEdit.resource === resource) {
      method = 'PUT';
      path = `${info.api}/${encodeURIComponent(currentEdit.id)}`;
    }
  } else if (currentEdit && currentEdit.resource === resource) {
    method = 'PUT';
    path = `${info.api}/${encodeURIComponent(currentEdit.id)}`;
  }
  const result = await fetchJson(path, { method, body: JSON.stringify(payload) });
  if (result.error) {
    alert(`Error al crear ${resource}: ${result.error}`);
    return;
  }
  alert('Elemento creado / actualizado correctamente.');
  clearEditState(resource);
  notifyPublicDataRefresh();
  await loadResource(resource);
  await loadCounts();
}

async function sendDelete(resource, id) {
  if (!confirm('Confirmar eliminar este elemento?')) return;
  const info = resources[resource];
  if (!info || !id) return;
  let path = `${info.api}/${encodeURIComponent(id)}`;
  if (resource === 'datos-utiles') {
    path = `${info.api}/${encodeURIComponent(id)}`;
  }
  const result = await fetchJson(path, { method: 'DELETE' });
  if (result.error) {
    alert(`Error al eliminar ${resource}: ${result.error}`);
    return;
  }
  alert('Elemento eliminado.');
  notifyPublicDataRefresh();
  await loadResource(resource);
  await loadCounts();
}

async function toggleResourceVisibility(resource, id) {
  const info = resources[resource];
  if (!info || !id) return;
  const item = await fetchJson(`${info.api}/${encodeURIComponent(id)}`);
  if (item.error) {
    alert(`Error cargando elemento: ${item.error}`);
    return;
  }
  const currentActivo = item.activo !== undefined ? item.activo : 1;
  const updated = Object.assign({}, item, { activo: currentActivo ? 0 : 1 });
  const result = await fetchJson(`${info.api}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updated),
  });
  if (result.error) {
    alert(`Error actualizando visibilidad: ${result.error}`);
    return;
  }
  alert(`Elemento ${updated.activo ? 'mostrado' : 'ocultado'} correctamente.`);
  notifyPublicDataRefresh();
  await loadResource(resource);
  await loadCounts();
}

async function updateReviewStatus(id, status) {
  if (!id) return;
  const result = await fetchJson(`/admin/api/reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (result.error) {
    alert(`Error al actualizar reseña: ${result.error}`);
    return;
  }
  alert('Reseña actualizada.');
  await loadResource('reviews');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => toggleSection(tab.dataset.section)));
  document.body.addEventListener('click', handleAction);
  document.getElementById('refreshAll').addEventListener('click', refreshAll);
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logoutAdmin);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
    const saved = localStorage.getItem('admin_theme') || 'light';
    applyTheme(saved);
  }
  const loginBtnOverlay = document.getElementById('loginBtnOverlay');
  if (loginBtnOverlay) loginBtnOverlay.addEventListener('click', serverLogin);
  const loginPassInput = document.getElementById('login-pass');
  if (loginPassInput) loginPassInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') serverLogin(); });
  setupImageFileInputs();
  refreshAll();
});
