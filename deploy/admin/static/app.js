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

function redirectToLogin(reason) {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  const params = new URLSearchParams({ next });
  if (reason) params.set('reason', reason);
  window.location.replace(`/admin/login?${params.toString()}`);
}

function resolvePublicAssetUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return '';
  const trimmed = imagePath.trim();
  if (!trimmed || trimmed.startsWith('data:')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\.\//, '')}`;
}

function renderListThumb(imagePath) {
  const src = resolvePublicAssetUrl(imagePath);
  if (!src) return '';
  return `<img class="list-thumb" src="${src}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />`;
}

const STATUS_LABELS = {
  published: 'Publicado',
  draft: 'Borrador',
  archived: 'Archivado',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  pending: 'Pendiente',
  active: 'Activo',
  inactive: 'Inactivo',
  banned: 'Bloqueado',
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
};

const ROLE_LABELS = {
  'super-admin': 'Super admin',
  editor: 'Editor',
  viewer: 'Solo lectura',
  guest: 'Invitado',
};

const SECTION_TITLES = {
  overview: 'Resumen',
  alojamientos: 'Alojamientos',
  gastronomia: 'Gastronomía',
  eventos: 'Eventos',
  'datos-utiles': 'Datos útiles',
  users: 'Usuarios',
  tickets: 'Tickets',
  audit: 'Auditoría',
  reviews: 'Reseñas',
  uploads: 'Uploads',
  backup: 'Backup',
  'bot-config': 'Bot y APIs',
  observability: 'Observabilidad',
  seguridad: 'Seguridad',
  analytics: 'Analytics',
};

function showToast(message, type = 'ok') {
  const host = document.getElementById('toast-host');
  if (!host) {
    window.alert(message);
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4200);
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.hidden = true;
}

function openSidebar() {
  document.body.classList.add('sidebar-open');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.hidden = false;
}

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
  const resolved = resolvePublicAssetUrl(imageUrl);
  if (resolved) {
    preview.src = resolved;
    preview.style.display = 'block';
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }
}

// Límites de imagen en cliente (el servidor revalida de todos modos).
const IMAGE_MAX_INPUT_BYTES = 12 * 1024 * 1024; // 12 MB de entrada antes de convertir
const IMAGE_MAX_DIMENSION = 1600; // px lado mayor
const IMAGE_WEBP_QUALITY = 0.82;
const ALLOWED_INPUT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// Convierte cualquier imagen soportada a WebP (redimensionada) usando canvas.
// Devuelve un data URL image/webp. Rechaza si el navegador no soporta WebP.
function convertImageToWebp(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (Math.max(width, height) > IMAGE_MAX_DIMENSION) {
        const scale = IMAGE_MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas no disponible'));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/webp', IMAGE_WEBP_QUALITY);
      if (!dataUrl.startsWith('data:image/webp')) {
        return reject(new Error('Tu navegador no puede generar WebP. Actualizalo e intentá de nuevo.'));
      }
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

function setupImageFileInput(fileInputId, imageFieldId, previewId) {
  const fileInput = document.getElementById(fileInputId);
  const imageField = document.getElementById(imageFieldId);
  if (!fileInput || !imageField) return;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      imageField.value = '';
      updateImagePreview(fileInputId, previewId, '');
      return;
    }
    if (!ALLOWED_INPUT_TYPES.includes(file.type)) {
      showToast('Formato no permitido. Usá JPG, PNG o WebP.', 'error');
      fileInput.value = '';
      return;
    }
    if (file.size > IMAGE_MAX_INPUT_BYTES) {
      showToast('La imagen es demasiado grande (máx. 12 MB).', 'error');
      fileInput.value = '';
      return;
    }
    let webpDataUrl;
    try {
      showToast('Optimizando imagen a WebP…', 'ok');
      webpDataUrl = await convertImageToWebp(file);
    } catch (err) {
      showToast(err.message || 'No se pudo procesar la imagen.', 'error');
      return;
    }
    updateImagePreview(fileInputId, previewId, webpDataUrl);
    const result = await fetchJson('/admin/api/upload-image', {
      method: 'POST',
      body: JSON.stringify({ dataUrl: webpDataUrl }),
    });
    if (result.error) {
      showToast('Error subiendo imagen: ' + result.error, 'error');
      return;
    }
    imageField.value = result.url || '';
    updateImagePreview(fileInputId, previewId, result.url || webpDataUrl);
    showToast('Imagen subida en WebP.', 'ok');
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
      showToast('Contenido JSON inválido: ' + err.message, 'error');
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
  redirectToLogin();
}

async function serverLogin() {
  redirectToLogin();
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
        redirectToLogin('expired');
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
  document.querySelectorAll('.nav-item, .tab').forEach((tab) => {
    const active = tab.dataset.section === sectionId;
    tab.classList.toggle('active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');
  const title = document.getElementById('page-title');
  if (title) title.textContent = SECTION_TITLES[sectionId] || resources[sectionId]?.title || sectionId;
  closeSidebar();
  if (sectionId === 'bot-config') loadBotConfig();
  if (sectionId === 'observability') loadObservability();
  if (sectionId === 'seguridad') loadSecurity();
  if (['alojamientos', 'gastronomia', 'eventos', 'datos-utiles', 'users', 'reviews', 'tickets', 'audit', 'uploads'].includes(sectionId)) {
    loadResource(sectionId).catch(() => {});
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value == null ? '—' : String(value);
}

async function loadBotConfig() {
  const data = await fetchJson('/admin/api/bot-config');
  if (data.error) {
    setText('bot-provider', `Error: ${data.error}`);
    return;
  }
  setText('bot-provider', data.provider);
  setText('bot-endpoint', data.endpoint);
  setText('bot-upstream', data.upstreamEndpoint);
  setText('bot-timeout', `${data.timeoutMs} ms`);
  setText('bot-fallback', data.fallback);
  setText('bot-provider-key-mask', data.providerKeyMask);
  setText('weather-key-mask', data.weatherKeyMask);
  const prompt = document.getElementById('bot-system-prompt');
  if (prompt) prompt.value = data.systemPrompt || '';
}

let observabilitySnapshot = { metrics: {}, botLogs: [], systemLogs: [] };

function escapeLog(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderLogList(id, entries, type) {
  const container = document.getElementById(id);
  if (!container) return;
  const query = (document.getElementById('observability-search')?.value || '').trim().toLowerCase();
  const filtered = entries.filter((entry) => !query || JSON.stringify(entry).toLowerCase().includes(query));
  container.innerHTML = filtered.length ? filtered.map((entry) => `
    <article class="log-entry">
      <div><strong>${escapeLog(type === 'bot' ? (entry.category || 'general') : (entry.event || 'sistema'))}</strong> <span class="pill">${escapeLog(entry.status || entry.level || 'info')}</span></div>
      <div class="small">${escapeLog(new Date(entry.createdAt).toLocaleString())} · ${escapeLog(entry.id || entry.requestId || 'sin-id')} ${entry.latencyMs != null ? `· ${escapeLog(entry.latencyMs)} ms` : ''}</div>
      <div class="small">${escapeLog(type === 'bot' ? `${entry.source || 'local'}${entry.fallback ? ' · fallback' : ''} · ${entry.message || ''}` : JSON.stringify(entry.details || {}))}</div>
    </article>`).join('') : '<p class="small">No hay registros para este filtro.</p>';
}

function renderObservability() {
  const metrics = observabilitySnapshot.metrics || {};
  setText('bot-metric-requests', metrics.requests || 0);
  setText('bot-metric-errors', metrics.errors || 0);
  setText('bot-metric-fallbacks', metrics.fallbacks || 0);
  setText('bot-metric-latency', `${metrics.averageLatencyMs || 0} ms`);
  renderLogList('bot-logs', observabilitySnapshot.botLogs || [], 'bot');
  renderLogList('system-logs', observabilitySnapshot.systemLogs || [], 'system');
}

async function loadObservability() {
  const data = await fetchJson('/admin/api/observability');
  if (data.error) {
    const target = document.getElementById('bot-logs');
    if (target) target.innerHTML = `<p class="small">Error: ${escapeLog(data.error)}</p>`;
    return;
  }
  observabilitySnapshot = data;
  renderObservability();
}

async function loadSecurity() {
  const data = await fetchJson('/admin/api/security/overview');
  const grid = document.getElementById('security-kpis');
  const events = document.getElementById('security-events');
  if (!grid) return;
  if (data.error) {
    grid.innerHTML = `<p class="small">Error: ${escapeLog(data.error)}</p>`;
    if (events) events.innerHTML = '';
    return;
  }
  const k = data.kpis || {};
  const card = (label, value, hint) =>
    `<div class="kpi-card" style="cursor:default"><span class="kpi-label">${escapeLog(label)}</span><span class="kpi-value">${escapeLog(value)}</span><span class="kpi-hint">${escapeLog(hint || '')}</span></div>`;
  grid.innerHTML = [
    card('Logins fallidos (24 h)', k.failedLogins24h ?? 0, 'Intentos rechazados'),
    card('Intentos bloqueados (24 h)', k.blockedLogins24h ?? 0, 'Rate limiting'),
    card('Cuentas bloqueadas', k.lockedAccounts ?? 0, 'Bloqueo temporal activo'),
    card('IPs bloqueadas', k.lockedIps ?? 0, 'Bloqueo temporal activo'),
    card('Logins exitosos (24 h)', k.successfulLogins24h ?? 0, 'Accesos válidos'),
    card('Super-admins', k.superAdmins ?? 0, `de ${k.totalUsers ?? 0} usuarios`),
    card('Usuarios sin MFA', k.usersWithoutMfa ?? 0, 'MFA pendiente (roadmap)'),
  ].join('');
  if (events) {
    const rows = (data.recentSecurityEvents || []).map((e) => {
      const when = escapeLog(new Date(e.createdAt).toLocaleString('es-AR'));
      const evt = escapeLog(e.event);
      const who = escapeLog((e.details && e.details.username) || e.adminUser || '—');
      const ip = escapeLog(e.details && e.details.ip ? e.details.ip : '');
      return `<tr><td>${when}</td><td>${evt}</td><td>${who}</td><td>${ip}</td></tr>`;
    }).join('');
    events.innerHTML = rows
      ? `<table class="data-table"><thead><tr><th>Fecha</th><th>Evento</th><th>Usuario</th><th>IP</th></tr></thead><tbody>${rows}</tbody></table>`
      : '<p class="small">Sin eventos de seguridad recientes.</p>';
  }
}

function exportObservability() {
  const blob = new Blob([JSON.stringify(observabilitySnapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `observabilidad-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
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
  return `<span class="pill role-pill ${normalized}">${ROLE_LABELS[normalized] || normalized}</span>`;
}

function renderStatusPill(status) {
  const normalized = (status || 'pending').toString().toLowerCase();
  return `<span class="pill status-pill ${normalized}">${STATUS_LABELS[normalized] || normalized}</span>`;
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
  if (['bot-config', 'observability'].includes(name)) return ['super-admin', 'editor'].includes(role);
  if (name === 'seguridad') return role === 'super-admin';
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
  renderCount('header-session-user', session.user || 'anonymous');
  renderCount('header-session-role', ROLE_LABELS[session.role] || session.role || 'guest');
}

function updateRoleUI() {
  const session = getCurrentAdminSession();
  const role = session.role;
  renderSessionOverview();

  const isGuest = role === 'guest';
  const headerRefresh = document.getElementById('refreshAll');
  const headerLogout = document.getElementById('logout');
  const headerTheme = document.getElementById('theme-toggle');
  if (headerRefresh) headerRefresh.style.display = isGuest ? 'none' : '';
  if (headerLogout) headerLogout.style.display = isGuest ? 'none' : '';
  if (headerTheme) headerTheme.style.display = isGuest ? 'none' : '';

  document.querySelectorAll('.nav-item, .tab').forEach((tab) => {
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
      section.classList.remove('active');
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
  const result = await fetchJson('/admin/api/session');
  if (!result.error && result.admin) {
    currentAdminSession = {
      user: result.admin.user || 'anonymous',
      role: normalizeAdminRole(result.admin.role),
    };
    document.body.classList.remove('logged-out');
  } else {
    currentAdminSession = { user: 'anonymous', role: 'guest' };
    document.body.classList.add('logged-out');
    redirectToLogin(result.status === 401 ? 'expired' : undefined);
    return result;
  }
  updateRoleUI();
  return result;
}

function renderList(containerId, items, renderItem) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!Array.isArray(items) || !items.length) {
    const resource = containerId.replace(/-list$/, '');
    container.innerHTML = `
      <div class="empty-state card">
        <p>No hay elementos cargados.</p>
        ${resource && resources[resource] ? `<button type="button" data-action="create" data-resource="${resource}">Agregar el primero</button>` : ''}
      </div>`;
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
  const url = resolvePublicAssetUrl(item.url || item.name);
  return `
    <div class="upload-card">
      <img src="${url}" alt="" loading="lazy" onerror="this.style.opacity='0.3'" />
      <div class="upload-meta">
        <strong>${item.name}</strong>
        <code>${url}</code>
        <div class="list-actions">
          <button type="button" data-action="copy-url" data-url="${url}">Copiar URL</button>
          <button type="button" data-action="delete" data-resource="uploads" data-id="${encodeURIComponent(item.name)}">Eliminar</button>
        </div>
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
  const badge = document.getElementById('nav-badge-reviews');
  if (badge) {
    badge.dataset.count = String(pendingReviews);
    badge.textContent = pendingReviews > 0 ? String(pendingReviews) : '';
  }
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
    const imagePath = resource === 'gastronomia' ? item.imagen : (item.mainImg || item.imagen);
    const thumb = ['alojamientos', 'gastronomia', 'eventos'].includes(resource)
      ? renderListThumb(imagePath)
      : '';
    return `
      <div class="list-row list-row-with-thumb">
        ${thumb}
        <div style="flex:1">
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
  if (['super-admin', 'editor'].includes(role)) await Promise.all([loadBotConfig(), loadObservability()]);
}

function handleAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const resource = button.dataset.resource;
  const id = button.dataset.id;
  if (action === 'refresh-observability') { loadObservability(); return; }
  if (action === 'refresh-security') { loadSecurity(); return; }
  if (action === 'export-observability') { exportObservability(); return; }
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
  if (action === 'copy-url') {
    return copyUploadUrl(button.dataset.url);
  }
}

async function downloadBackup() {
  const result = await fetchJson('/admin/api/backup');
  if (result.error) {
    showToast(`Error descargando backup: ${result.error}`, 'error');
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
  showToast('Backup descargado', 'ok');
}

async function restoreBackup() {
  const textarea = document.getElementById('backup-restore-body');
  if (!textarea) return;
  let payload;
  try {
    payload = JSON.parse(textarea.value);
  } catch (err) {
    showToast('JSON inválido: ' + err.message, 'error');
    return;
  }
  const result = await fetchJson('/admin/api/restore', { method: 'POST', body: JSON.stringify(payload) });
  if (result.error) {
    showToast(`Error restaurando backup: ${result.error}`, 'error');
    return;
  }
  showToast('Backup restaurado correctamente.', 'ok');
  await refreshAll();
}

async function viewAudit(id) {
  if (!id) return;
  const result = await fetchJson('/admin/api/audit');
  if (result.error) {
    showToast(`Error cargando auditoría: ${result.error}`, 'error');
    return;
  }
  const entry = (result.audit || []).find((item) => String(item.id) === String(id));
  if (!entry) {
    showToast('Entrada de auditoría no encontrada.', 'error');
    return;
  }
  showToast(`${entry.action} · ${entry.resource}/${entry.resourceId} · ${entry.adminUser}`, 'ok');
  const detail = document.createElement('pre');
  detail.textContent = JSON.stringify(entry, null, 2);
  const host = document.getElementById('audit-list');
  if (host) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h2>Detalle de auditoría</h2>';
    card.appendChild(detail);
    host.prepend(card);
  }
}

async function loadItemForEdit(resource, id) {
  const info = resources[resource];
  if (!info || !id) return;
  const item = await fetchJson(`${info.api}/${encodeURIComponent(id)}`);
  if (item.error) {
    showToast(`Error cargando item: ${item.error}`, 'error');
    return;
  }
  if (resource === 'users') setUserForm(item);
  if (resource === 'eventos') setEventForm(item);
  if (resource === 'alojamientos') setAlojamientoForm(item);
  if (resource === 'gastronomia') setGastronomiaForm(item);
  if (resource === 'datos-utiles') setDatosUtilesForm(item);
  setEditState(resource, item);
  toggleSection(resource);
}

async function sendCreate(resource) {
  const textarea = document.getElementById(`new-${resource}-body`);
  let payload;
  if (resource === 'users') {
    payload = getUserPayload();
    if (!payload.username) {
      showToast('El usuario necesita un username.', 'error');
      return;
    }
  } else if (resource === 'eventos') {
    payload = getEventPayload();
    if (!payload.titulo) {
      showToast('El evento necesita un título.', 'error');
      return;
    }
  } else if (resource === 'alojamientos') {
    payload = getAlojamientoPayload();
    if (!payload.titulo || !payload.categoria) {
      showToast('El alojamiento necesita título y categoría.', 'error');
      return;
    }
  } else if (resource === 'gastronomia') {
    payload = getGastronomiaPayload();
    if (!payload.nombre || !payload.tipo) {
      showToast('La gastronomía necesita nombre y tipo.', 'error');
      return;
    }
  } else if (resource === 'tickets') {
    payload = getTicketPayload();
    if (!payload.title || !payload.message) {
      showToast('El ticket necesita título y mensaje.', 'error');
      return;
    }
  } else if (resource === 'datos-utiles') {
    payload = getDatosUtilesPayload();
    if (!payload) return;
    if (!payload.categoria) {
      showToast('El dato útil necesita una categoría.', 'error');
      return;
    }
  } else {
    if (!textarea) return;
    try {
      payload = JSON.parse(textarea.value);
    } catch (err) {
      showToast('JSON inválido: ' + err.message, 'error');
      return;
    }
  }
  const info = resources[resource];
  if (!info) return;
  let path = info.api;
  let method = 'POST';
  if (resource === 'datos-utiles') {
    if (!payload.categoria) {
      showToast('El dato útil necesita una propiedad "categoria".', 'error');
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
    showToast(`Error al guardar: ${result.error}`, 'error');
    return;
  }
  showToast('Guardado correctamente.', 'ok');
  clearEditState(resource);
  notifyPublicDataRefresh();
  await loadResource(resource);
  await loadCounts();
}

async function sendDelete(resource, id) {
  if (!confirm('¿Confirmar eliminar este elemento?')) return;
  const info = resources[resource];
  if (!info || !id) return;
  let path = `${info.api}/${encodeURIComponent(id)}`;
  if (resource === 'datos-utiles') {
    path = `${info.api}/${encodeURIComponent(id)}`;
  }
  const result = await fetchJson(path, { method: 'DELETE' });
  if (result.error) {
    showToast(`Error al eliminar: ${result.error}`, 'error');
    return;
  }
  showToast('Elemento eliminado.', 'ok');
  notifyPublicDataRefresh();
  await loadResource(resource);
  await loadCounts();
}

async function toggleResourceVisibility(resource, id) {
  const info = resources[resource];
  if (!info || !id) return;
  const item = await fetchJson(`${info.api}/${encodeURIComponent(id)}`);
  if (item.error) {
    showToast(`Error cargando elemento: ${item.error}`, 'error');
    return;
  }
  const currentActivo = item.activo !== undefined ? item.activo : 1;
  const updated = Object.assign({}, item, { activo: currentActivo ? 0 : 1 });
  const result = await fetchJson(`${info.api}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updated),
  });
  if (result.error) {
    showToast(`Error actualizando visibilidad: ${result.error}`, 'error');
    return;
  }
  showToast(`Elemento ${updated.activo ? 'mostrado' : 'ocultado'} correctamente.`, 'ok');
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
    showToast(`Error al actualizar reseña: ${result.error}`, 'error');
    return;
  }
  showToast('Reseña actualizada.', 'ok');
  await loadResource('reviews');
  await loadCounts();
}

async function copyUploadUrl(url) {
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    showToast('URL copiada al portapapeles', 'ok');
  } catch (e) {
    showToast('No se pudo copiar la URL', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item, .tab').forEach((tab) => {
    tab.addEventListener('click', () => toggleSection(tab.dataset.section));
  });

  document.body.addEventListener('click', (event) => {
    const goto = event.target.closest('[data-goto]');
    if (goto) {
      const section = goto.dataset.goto;
      const createResource = goto.dataset.create;
      toggleSection(section);
      if (createResource) {
        setTimeout(() => {
          const btn = document.querySelector(`button[data-action="create"][data-resource="${createResource}"]`);
          if (btn) btn.click();
        }, 50);
      }
      return;
    }
    handleAction(event);
  });

  const refreshBtn = document.getElementById('refreshAll');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshAll);
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logoutAdmin);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
    const saved = localStorage.getItem('admin_theme') || 'light';
    applyTheme(saved);
  }

  const menuToggle = document.getElementById('menu-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (menuToggle) menuToggle.addEventListener('click', () => {
    if (document.body.classList.contains('sidebar-open')) closeSidebar();
    else openSidebar();
  });
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  setupImageFileInputs();
  const observabilitySearch = document.getElementById('observability-search');
  if (observabilitySearch) observabilitySearch.addEventListener('input', renderObservability);
  refreshAll();
});
