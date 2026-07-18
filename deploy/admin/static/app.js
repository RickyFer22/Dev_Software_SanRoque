const ADMIN_SECTIONS = Object.freeze({
  overview: { title: 'Resumen', description: 'Estado general del portal turístico.', icon: 'dashboard', group: 'Contenido' },
  alojamientos: { api: '/admin/api/alojamientos', title: 'Alojamientos', description: 'Hospedajes, servicios, fotografías y publicación.', icon: 'bed', group: 'Contenido' },
  gastronomia: { api: '/admin/api/gastronomia', title: 'Gastronomía', description: 'Restaurantes, comedores y experiencias culinarias.', icon: 'utensils', group: 'Contenido' },
  eventos: { api: '/admin/api/eventos', title: 'Eventos', description: 'Agenda cultural y turística municipal.', icon: 'calendar', group: 'Contenido' },
  actividades: { api: '/admin/api/actividades', title: 'Lugares y experiencias', description: 'Atractivos, recorridos y propuestas para visitar.', icon: 'compass', group: 'Contenido' },
  'datos-utiles': { api: '/admin/api/datos-utiles', title: 'Servicios y datos útiles', description: 'Remises, contactos y asistencia al visitante.', icon: 'info', group: 'Contenido', isDataUtil: true },
  users: { api: '/admin/api/users', title: 'Usuarios', description: 'Accesos y roles del equipo municipal.', icon: 'users', group: 'Sistema' },
  tickets: { api: '/admin/api/tickets', title: 'Tickets', description: 'Solicitudes de atención y seguimiento.', icon: 'info', group: 'Atención' },
  audit: { api: '/admin/api/audit', title: 'Auditoría', description: 'Historial verificable de modificaciones.', icon: 'history', group: 'Sistema', isAudit: true },
  uploads: { api: '/admin/api/media', title: 'Multimedia', description: 'Biblioteca de fotografías optimizadas.', icon: 'image', group: 'Sistema' },
  backup: { title: 'Copias de seguridad', description: 'Respaldo y restauración del contenido.', icon: 'backup', group: 'Sistema' },
  'bot-config': { title: 'Bot y APIs', description: 'Asistente turístico e integraciones.', icon: 'bot', group: 'Sistema' },
  observability: { title: 'Observabilidad', description: 'Salud técnica y registros operativos.', icon: 'activity', group: 'Sistema' },
  seguridad: { title: 'Seguridad', description: 'Sesiones, accesos y alertas.', icon: 'shield', group: 'Sistema' },
  analytics: { title: 'Analítica', description: 'Uso del portal y contenidos destacados.', icon: 'chart', group: 'Sistema' },
});
const resources = ADMIN_SECTIONS;

let currentEdit = null;
let currentAdminSession = { user: 'anonymous', role: 'guest' };
const resourceFilters = new Map();
let mediaLibrary = [];

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
  return `<img class="list-thumb" src="${escapeLog(src)}" alt="" loading="lazy" />`;
}

function bindImageFallbacks(root = document) {
  root.querySelectorAll('img:not([data-image-fallback-bound])').forEach((image) => {
    image.dataset.imageFallbackBound = 'true';
    image.addEventListener('error', () => {
      image.hidden = true;
      image.removeAttribute('src');
    });
  });
}

const STATUS_LABELS = {
  published: 'Publicado',
  draft: 'Borrador',
  review: 'En revisión',
  hidden: 'Oculto',
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

function setPortalPreviewDevice(device) {
  const normalized = device === 'mobile' ? 'mobile' : 'desktop';
  const stage = document.getElementById('portal-preview-stage');
  if (!stage) return;

  stage.dataset.device = normalized;
  stage.classList.toggle('is-mobile', normalized === 'mobile');
  document.querySelectorAll('[data-preview-device]').forEach((button) => {
    const active = button.dataset.previewDevice === normalized;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function refreshPortalPreview() {
  const frame = document.getElementById('portal-preview-frame');
  const updated = document.getElementById('portal-preview-updated');
  if (!frame) return;

  const previewUrl = new URL('/', window.location.origin);
  previewUrl.searchParams.set('_adminPreview', String(Date.now()));
  frame.src = previewUrl.toString();
  if (updated) {
    const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    updated.textContent = `Actualizada ${time}`;
  }
}

function initPortalPreview() {
  document.querySelectorAll('[data-preview-device]').forEach((button) => {
    button.addEventListener('click', () => setPortalPreviewDevice(button.dataset.previewDevice));
  });
  document.getElementById('portal-preview-refresh')?.addEventListener('click', refreshPortalPreview);
  document.getElementById('portal-preview-frame')?.addEventListener('load', () => {
    const updated = document.getElementById('portal-preview-updated');
    if (updated && updated.textContent === 'Lista para revisar') updated.textContent = 'Portal cargado';
  });
  setPortalPreviewDevice('desktop');
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

function renderAdminIcons() {
  if (!window.AdminIcons) return;
  document.querySelectorAll('[data-icon]').forEach((host) => {
    host.innerHTML = window.AdminIcons.icon(host.dataset.icon);
  });
  document.querySelectorAll('.nav-item[data-section]').forEach((item) => {
    const section = ADMIN_SECTIONS[item.dataset.section];
    if (!section) return;
    item.title = section.title;
    item.setAttribute('aria-label', section.title);
  });
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  const button = document.getElementById('sidebar-collapse');
  if (button) {
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Contraer menú');
  }
  localStorage.setItem('admin_sidebar_collapsed', collapsed ? '1' : '0');
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
    telefono: document.getElementById('alojamiento-telefono'),
    waNumber: document.getElementById('alojamiento-waNumber'),
    checkin: document.getElementById('alojamiento-checkin'),
    checkout: document.getElementById('alojamiento-checkout'),
    cancelacion: document.getElementById('alojamiento-cancelacion'),
    galeria: document.getElementById('alojamiento-galeria'),
    summary: document.getElementById('alojamiento-summary'),
    mapsLink: document.getElementById('alojamiento-mapsLink'),
    website: document.getElementById('alojamiento-website'),
    instagram: document.getElementById('alojamiento-instagram'),
    facebook: document.getElementById('alojamiento-facebook'),
    serviciosText: document.getElementById('alojamiento-serviciosText'),
    tags: document.getElementById('alojamiento-tags'),
    slug: document.getElementById('alojamiento-slug'),
    seoTitle: document.getElementById('alojamiento-seoTitle'),
    seoDescription: document.getElementById('alojamiento-seoDescription'),
    publishAt: document.getElementById('alojamiento-publishAt'),
    featured: document.getElementById('alojamiento-featured'),
  };
}

function getAlojamientoPayload() {
  const form = getAlojamientoForm();
  return {
    titulo: form.titulo?.value?.trim(),
    categoria: form.categoria?.value?.trim(),
    lat: form.lat?.value ? Number(form.lat.value) : undefined,
    lon: form.lon?.value ? Number(form.lon.value) : undefined,
    rating: form.rating?.value?.trim() || '',
    ubicacion: form.ubicacion?.value?.trim(),
    mainImg: form.mainImg?.value?.trim(),
    activo: form.activo?.value === '1' ? 1 : 0,
    status: form.status?.value?.trim() || 'published',
    descripcionLarga: form.descripcionLarga?.value?.trim(),
    telefono: form.telefono?.value?.trim() || '',
    waNumber: form.waNumber?.value?.trim() || '',
    checkin: form.checkin?.value?.trim() || '',
    checkout: form.checkout?.value?.trim() || '',
    cancelacion: form.cancelacion?.value?.trim() || '',
    galeria: form.galeria?.value ? form.galeria.value.split(',').map(g => g.trim()).filter(Boolean) : [],
    summary: form.summary?.value?.trim() || '',
    mapsLink: form.mapsLink?.value?.trim() || '',
    website: form.website?.value?.trim() || '',
    instagram: form.instagram?.value?.trim() || '',
    facebook: form.facebook?.value?.trim() || '',
    servicios: (form.serviciosText?.value || '').split(',').map((value) => value.trim()).filter(Boolean).map((texto) => ({ icono: '', texto })),
    tags: (form.tags?.value || '').split(',').map((value) => value.trim()).filter(Boolean),
    slug: form.slug?.value?.trim() || '',
    seoTitle: form.seoTitle?.value?.trim() || '',
    seoDescription: form.seoDescription?.value?.trim() || '',
    publishAt: form.publishAt?.value || '',
    featured: Boolean(form.featured?.checked),
    mediaGallery: window.MediaManager?.getGallery('alojamientos') || [],
  };
}

function setAlojamientoForm(item = {}) {
  const form = getAlojamientoForm();
  if (!form.titulo) return;
  form.titulo.value = item.titulo || '';
  form.categoria.value = item.categoria || '';
  form.lat.value = item.lat || '';
  form.lon.value = item.lon || '';
  if (form.rating) form.rating.value = item.rating || '';
  form.ubicacion.value = item.ubicacion || '';
  form.mainImg.value = item.mainImg || '';
  form.activo.value = item.activo ? '1' : '0';
  form.status.value = item.status || 'published';
  form.descripcionLarga.value = item.descripcionLarga || '';
  if (form.telefono) form.telefono.value = item.telefono || '';
  if (form.waNumber) form.waNumber.value = item.waNumber || '';
  if (form.checkin) form.checkin.value = item.checkin || '';
  if (form.checkout) form.checkout.value = item.checkout || '';
  if (form.cancelacion) form.cancelacion.value = item.cancelacion || '';
  if (form.galeria) form.galeria.value = Array.isArray(item.galeria) ? item.galeria.join(', ') : '';
  if (form.summary) form.summary.value = item.summary || '';
  if (form.mapsLink) form.mapsLink.value = item.mapsLink || '';
  if (form.website) form.website.value = item.website || '';
  if (form.instagram) form.instagram.value = item.instagram || '';
  if (form.facebook) form.facebook.value = item.facebook || '';
  if (form.serviciosText) form.serviciosText.value = Array.isArray(item.servicios) ? item.servicios.map((service) => typeof service === 'string' ? service : service.texto).filter(Boolean).join(', ') : '';
  if (form.tags) form.tags.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
  if (form.slug) form.slug.value = item.slug || '';
  if (form.seoTitle) form.seoTitle.value = item.seoTitle || '';
  if (form.seoDescription) form.seoDescription.value = item.seoDescription || '';
  if (form.publishAt) form.publishAt.value = item.publishAt ? item.publishAt.slice(0, 16) : '';
  if (form.featured) form.featured.checked = Boolean(item.featured);
  window.MediaManager?.setGallery('alojamientos', item.mediaGallery || []);
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
  if (form.rating) form.rating.value = '';
  form.ubicacion.value = '';
  form.mainImg.value = '';
  form.activo.value = '1';
  form.status.value = 'published';
  form.descripcionLarga.value = '';
  if (form.telefono) form.telefono.value = '';
  if (form.waNumber) form.waNumber.value = '';
  if (form.checkin) form.checkin.value = '';
  if (form.checkout) form.checkout.value = '';
  if (form.cancelacion) form.cancelacion.value = '';
  if (form.galeria) form.galeria.value = '';
  ['summary', 'mapsLink', 'website', 'instagram', 'facebook', 'serviciosText', 'tags', 'slug', 'seoTitle', 'seoDescription', 'publishAt'].forEach((key) => { if (form[key]) form[key].value = ''; });
  if (form.featured) form.featured.checked = false;
  window.MediaManager?.setGallery('alojamientos', []);
  if (form.imageFile) form.imageFile.value = '';
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
    telefono: document.getElementById('gastronomia-telefono'),
    whatsapp: document.getElementById('gastronomia-whatsapp'),
    mapsLink: document.getElementById('gastronomia-mapsLink'),
    servicios: document.getElementById('gastronomia-servicios'),
    galeria: document.getElementById('gastronomia-galeria'),
    summary: document.getElementById('gastronomia-summary'),
    lat: document.getElementById('gastronomia-lat'),
    lon: document.getElementById('gastronomia-lon'),
    website: document.getElementById('gastronomia-website'),
    instagram: document.getElementById('gastronomia-instagram'),
    facebook: document.getElementById('gastronomia-facebook'),
    specialties: document.getElementById('gastronomia-specialties'),
    tags: document.getElementById('gastronomia-tags'),
    slug: document.getElementById('gastronomia-slug'),
    seoTitle: document.getElementById('gastronomia-seoTitle'),
    seoDescription: document.getElementById('gastronomia-seoDescription'),
    publishAt: document.getElementById('gastronomia-publishAt'),
    featured: document.getElementById('gastronomia-featured'),
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
    telefono: form.telefono?.value?.trim() || '',
    whatsapp: form.whatsapp?.value?.trim() || '',
    mapsLink: form.mapsLink?.value?.trim() || '',
    servicios: form.servicios?.value ? form.servicios.value.split(',').map(s => s.trim()).filter(Boolean) : [],
    galeria: form.galeria?.value ? form.galeria.value.split(',').map(g => g.trim()).filter(Boolean) : [],
    summary: form.summary?.value?.trim() || '',
    lat: form.lat?.value ? Number(form.lat.value) : undefined,
    lon: form.lon?.value ? Number(form.lon.value) : undefined,
    website: form.website?.value?.trim() || '',
    instagram: form.instagram?.value?.trim() || '',
    facebook: form.facebook?.value?.trim() || '',
    specialties: (form.specialties?.value || '').split(',').map((value) => value.trim()).filter(Boolean),
    tags: (form.tags?.value || '').split(',').map((value) => value.trim()).filter(Boolean),
    slug: form.slug?.value?.trim() || '',
    seoTitle: form.seoTitle?.value?.trim() || '',
    seoDescription: form.seoDescription?.value?.trim() || '',
    publishAt: form.publishAt?.value || '',
    featured: Boolean(form.featured?.checked),
    mediaGallery: window.MediaManager?.getGallery('gastronomia') || [],
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
  if (form.telefono) form.telefono.value = item.telefono || '';
  if (form.whatsapp) form.whatsapp.value = item.whatsapp || '';
  if (form.mapsLink) form.mapsLink.value = item.mapsLink || '';
  if (form.servicios) form.servicios.value = Array.isArray(item.servicios) ? item.servicios.join(', ') : '';
  if (form.galeria) form.galeria.value = Array.isArray(item.galeria) ? item.galeria.join(', ') : '';
  if (form.summary) form.summary.value = item.summary || '';
  if (form.lat) form.lat.value = item.lat || '';
  if (form.lon) form.lon.value = item.lon || '';
  if (form.website) form.website.value = item.website || '';
  if (form.instagram) form.instagram.value = item.instagram || '';
  if (form.facebook) form.facebook.value = item.facebook || '';
  if (form.specialties) form.specialties.value = Array.isArray(item.specialties) ? item.specialties.join(', ') : '';
  if (form.tags) form.tags.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
  if (form.slug) form.slug.value = item.slug || '';
  if (form.seoTitle) form.seoTitle.value = item.seoTitle || '';
  if (form.seoDescription) form.seoDescription.value = item.seoDescription || '';
  if (form.publishAt) form.publishAt.value = item.publishAt ? item.publishAt.slice(0, 16) : '';
  if (form.featured) form.featured.checked = Boolean(item.featured);
  window.MediaManager?.setGallery('gastronomia', item.mediaGallery || []);
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
  if (form.telefono) form.telefono.value = '';
  if (form.whatsapp) form.whatsapp.value = '';
  if (form.mapsLink) form.mapsLink.value = '';
  if (form.servicios) form.servicios.value = '';
  if (form.galeria) form.galeria.value = '';
  ['summary', 'lat', 'lon', 'website', 'instagram', 'facebook', 'specialties', 'tags', 'slug', 'seoTitle', 'seoDescription', 'publishAt'].forEach((key) => { if (form[key]) form[key].value = ''; });
  if (form.featured) form.featured.checked = false;
  window.MediaManager?.setGallery('gastronomia', []);
  if (form.imageFile) form.imageFile.value = '';
  updateImagePreview('gastronomia-image-file', 'gastronomia-image-preview', '');
}

function updateImagePreview(fileInputId, previewId, imageUrl) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  const resolved = resolvePublicAssetUrl(imageUrl);
  if (resolved) {
    preview.hidden = false;
    preview.style.display = 'block';
    bindImageFallbacks(preview.parentElement || document);
    preview.src = resolved;
  } else {
    preview.removeAttribute('src');
    preview.hidden = true;
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

function setupImageFileInput(fileInputId, imageFieldId, previewId, galleryFieldId = null) {
  const fileInput = document.getElementById(fileInputId);
  const imageField = document.getElementById(imageFieldId);
  const galleryField = galleryFieldId ? document.getElementById(galleryFieldId) : null;
  const spinnerId = fileInputId.split('-')[0] + '-upload-spinner';
  const spinner = document.getElementById(spinnerId);
  if (!fileInput || !imageField) return;

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) {
      imageField.value = '';
      if (galleryField) galleryField.value = '';
      updateImagePreview(fileInputId, previewId, '');
      return;
    }

    if (spinner) spinner.style.display = 'inline-block';
    showToast(`Procesando ${files.length} imágenes…`, 'ok');
    const urls = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!ALLOWED_INPUT_TYPES.includes(file.type)) {
          showToast(`Formato de "${file.name}" no permitido. Usá JPG, PNG o WebP.`, 'error');
          continue;
        }
        if (file.size > IMAGE_MAX_INPUT_BYTES) {
          showToast(`"${file.name}" es demasiado grande (máx. 12 MB).`, 'error');
          continue;
        }

        let webpDataUrl;
        try {
          webpDataUrl = await convertImageToWebp(file);
        } catch (err) {
          showToast(`No se pudo procesar "${file.name}": ${err.message}`, 'error');
          continue;
        }

        // Mostrar previsualización de la primera imagen
        if (i === 0) {
          updateImagePreview(fileInputId, previewId, webpDataUrl);
        }

        try {
          const result = await fetchJson('/admin/api/upload-image', {
            method: 'POST',
            body: JSON.stringify({ dataUrl: webpDataUrl }),
          });
          if (result.error) {
            showToast(`Error al subir "${file.name}": ${result.error}`, 'error');
          } else if (result.url) {
            urls.push(result.url);
          }
        } catch (uploadErr) {
          showToast(`Fallo de conexión al subir "${file.name}"`, 'error');
        }
      }

      if (urls.length) {
        imageField.value = urls[0];
        updateImagePreview(fileInputId, previewId, urls[0]);
        
        if (galleryField) {
          const currentGallery = galleryField.value ? galleryField.value.split(',').map(s => s.trim()).filter(Boolean) : [];
          const combined = Array.from(new Set([...currentGallery, ...urls]));
          galleryField.value = combined.join(', ');
        }
        
        showToast(`Se subieron ${urls.length} imágenes correctamente.`, 'ok');
      }
    } finally {
      if (spinner) spinner.style.display = 'none';
    }
  });
}

function setupImageFileInputs() {
  setupImageFileInput('event-image-file', 'event-imagen', 'event-image-preview');
  setupImageFileInput('actividades-image-file', 'actividades-imagen', 'actividades-image-preview');
}

function addContactRow(name = '', value = '') {
  const container = document.getElementById('datos-utiles-contacts-container');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'contact-row';
  row.style = 'display: flex; gap: 8px; align-items: center; margin-top: 4px;';
  row.innerHTML = `
    <input class="contact-name" placeholder="Nombre" style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" value="${(name || '').replace(/"/g, '&quot;')}" />
    <input class="contact-value" placeholder="Teléfono / Enlace" style="flex: 2; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" value="${(value || '').replace(/"/g, '&quot;')}" />
    <button type="button" class="btn-remove-contact" style="padding: 6px 10px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">X</button>
  `;
  row.querySelector('.btn-remove-contact').onclick = () => row.remove();
  container.appendChild(row);
}

function getDatosUtilesForm() {
  return {
    categoria: document.getElementById('datos-utiles-categoria'),
    titulo: document.getElementById('datos-utiles-titulo'),
    descripcion: document.getElementById('datos-utiles-descripcion'),
  };
}

function getDatosUtilesPayload() {
  const form = getDatosUtilesForm();
  const categoria = form.categoria?.value?.trim();
  const container = document.getElementById('datos-utiles-contacts-container');
  const rows = container ? container.querySelectorAll('.contact-row') : [];
  const contacts = [];
  rows.forEach((row) => {
    const name = row.querySelector('.contact-name')?.value?.trim();
    const val = row.querySelector('.contact-value')?.value?.trim();
    if (name && val) {
      contacts.push({ name, val });
    }
  });

  const contenido = {};
  if (categoria === 'remises') {
    contenido.contactos = contacts.map((c) => ({ nombre: c.name, tel: c.val }));
  } else {
    contenido.lugares = contacts.map((c) => ({ nombre: c.name, link: c.val }));
  }

  return {
    categoria,
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

  const container = document.getElementById('datos-utiles-contacts-container');
  if (container) container.innerHTML = '';

  const cont = item.contenido || {};
  const list = cont.contactos || cont.lugares || [];
  list.forEach((c) => {
    const val = c.tel || c.link || '';
    addContactRow(c.nombre || '', val);
  });
}

function clearDatosUtilesForm() {
  const form = getDatosUtilesForm();
  if (!form.categoria) return;
  form.categoria.value = '';
  form.titulo.value = '';
  form.descripcion.value = '';
  const container = document.getElementById('datos-utiles-contacts-container');
  if (container) container.innerHTML = '';
}

// Actividades / Qué hacer
function getActividadesForm() {
  return {
    titulo: document.getElementById('actividades-titulo'),
    imagen: document.getElementById('actividades-imagen'),
    descripcion: document.getElementById('actividades-descripcion'),
    preview: document.getElementById('actividades-image-preview'),
    fileInput: document.getElementById('actividades-image-file'),
  };
}

function getActividadesPayload() {
  const form = getActividadesForm();
  return {
    titulo: form.titulo?.value?.trim(),
    imagen: form.imagen?.value?.trim(),
    descripcion: form.descripcion?.value?.trim(),
  };
}

function setActividadesForm(item = {}) {
  const form = getActividadesForm();
  if (!form.titulo) return;
  form.titulo.value = item.titulo || '';
  form.imagen.value = item.imagen || '';
  form.descripcion.value = item.descripcion || '';
  if (form.preview) {
    if (item.imagen) {
      form.preview.src = item.imagen;
      form.preview.style.display = 'block';
    } else {
      form.preview.style.display = 'none';
    }
  }
}

function clearActividadesForm() {
  const form = getActividadesForm();
  if (!form.titulo) return;
  form.titulo.value = '';
  form.imagen.value = '';
  form.descripcion.value = '';
  if (form.preview) form.preview.style.display = 'none';
  if (form.fileInput) form.fileInput.value = '';
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
  window.currentEdit = currentEdit;
  const state = document.getElementById(`edit-state-${resource}`);
  if (resource === 'users') {
    setUserForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    return;
  }
  if (resource === 'eventos') {
    setEventForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    return;
  }
  if (resource === 'actividades') {
    setActividadesForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    return;
  }
  if (resource === 'alojamientos') {
    setAlojamientoForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    return;
  }
  if (resource === 'gastronomia') {
    setGastronomiaForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    return;
  }
  if (resource === 'datos-utiles') {
    setDatosUtilesForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    const form = getDatosUtilesForm();
    if (form.categoria) form.categoria.readOnly = true;
    return;
  }
  if (resource === 'tickets') {
    setTicketForm(item);
    if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
    return;
  }
  const textarea = getEditorTextarea(resource);
  if (!textarea) return;
  textarea.value = JSON.stringify(item, null, 2);
  if (state) state.textContent = `Editando ${resource}: ${currentEdit.id}`;
}

function clearEditState(resource) {
  if (currentEdit && currentEdit.resource !== resource) return;
  currentEdit = null;
  window.currentEdit = null;
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
  if (resource === 'actividades') {
    clearActividadesForm();
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
  window.currentEdit = null;
  const state = document.getElementById(`edit-state-${resource}`);
  if (resource === 'users') {
    clearUserForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    window.AdminUI.openEditor(resource, 'Nuevo usuario');
    return;
  }
  if (resource === 'eventos') {
    clearEventForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    window.AdminUI.openEditor(resource, 'Nuevo evento');
    return;
  }
  if (resource === 'alojamientos') {
    clearAlojamientoForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    window.AdminUI.openEditor(resource, 'Nuevo alojamiento');
    return;
  }
  if (resource === 'gastronomia') {
    clearGastronomiaForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    window.AdminUI.openEditor(resource, 'Nuevo local gastronómico');
    return;
  }
  if (resource === 'datos-utiles') {
    clearDatosUtilesForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    window.AdminUI.openEditor(resource, 'Nuevo dato útil');
    return;
  }
  if (resource === 'tickets') {
    clearTicketForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    window.AdminUI.openEditor(resource, 'Nuevo ticket');
    return;
  }
  if (resource === 'actividades') {
    clearActividadesForm();
    if (state) state.textContent = `Creando nuevo ${resource}`;
    window.AdminUI.openEditor(resource, 'Nueva actividad');
    return;
  }
  const textarea = getEditorTextarea(resource);
  if (textarea) textarea.value = '';
  if (state) state.textContent = `Creando nuevo ${resource}`;
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
  document.querySelectorAll('.subnav [data-goto]').forEach((button) => {
    const active = button.dataset.goto === sectionId;
    button.toggleAttribute('aria-current', active);
  });
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');
  const section = ADMIN_SECTIONS[sectionId] || { title: sectionId, description: '' };
  const title = document.getElementById('page-title');
  if (title) title.textContent = section.title;
  const description = document.getElementById('page-description');
  if (description) description.textContent = section.description;
  const breadcrumb = document.getElementById('admin-breadcrumb');
  if (breadcrumb) breadcrumb.innerHTML = `<span>Panel</span><span aria-hidden="true">/</span><strong>${section.title}</strong>`;
  closeSidebar();
  if (sectionId === 'bot-config') { initBotConfigControls(); loadBotConfig(); }
  if (sectionId === 'observability') loadObservability();
  if (sectionId === 'seguridad') loadSecurity();
  if (['alojamientos', 'gastronomia', 'eventos', 'datos-utiles', 'users', 'tickets', 'audit', 'uploads'].includes(sectionId)) {
    loadResource(sectionId).catch(() => {});
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value == null ? '—' : String(value);
}

let botConfigDefaultPrompt = '';

function botApiRowFrom(api) {
  const tpl = document.getElementById('bot-api-row-template');
  const node = tpl.content.firstElementChild.cloneNode(true);
  const a = api || {};
  node.dataset.apiId = a.id || '';
  node.querySelector('.bot-api-label').value = a.label || '';
  node.querySelector('.bot-api-format').value = a.format || 'openrouter';
  node.querySelector('.bot-api-model').value = a.model || '';
  node.querySelector('.bot-api-url').value = a.url || '';
  node.querySelector('.bot-api-enabled-input').checked = a.enabled !== false;
  const keyState = node.querySelector('.bot-api-keystate');
  keyState.textContent = a.keyConfigured ? `Clave guardada: ${a.keyMask}` : 'Sin clave';
  node.querySelector('.bot-api-remove').addEventListener('click', () => {
    node.remove();
    if (!document.querySelector('#bot-apis-list .bot-api-row')) {
      document.getElementById('bot-apis-list').appendChild(botApiRowFrom(null));
    }
  });
  return node;
}

function renderBotApis(apis, activeApiId) {
  const list = document.getElementById('bot-apis-list');
  if (!list) return;
  list.innerHTML = '';
  const rows = (apis && apis.length) ? apis : [null];
  rows.forEach((api) => list.appendChild(botApiRowFrom(api)));
  // Marcar la activa (radio)
  const radios = list.querySelectorAll('.bot-api-active-input');
  let matched = false;
  list.querySelectorAll('.bot-api-row').forEach((row, idx) => {
    const isActive = row.dataset.apiId && row.dataset.apiId === activeApiId;
    radios[idx].checked = isActive;
    if (isActive) matched = true;
  });
  if (!matched && radios[0]) radios[0].checked = true;
}

function collectBotConfig() {
  const rows = Array.from(document.querySelectorAll('#bot-apis-list .bot-api-row'));
  const apis = rows.map((row, idx) => {
    const val = (sel) => (row.querySelector(sel) ? row.querySelector(sel).value.trim() : '');
    const api = {
      id: row.dataset.apiId || undefined,
      label: val('.bot-api-label'),
      format: val('.bot-api-format'),
      model: val('.bot-api-model'),
      url: val('.bot-api-url'),
      enabled: row.querySelector('.bot-api-enabled-input').checked,
      order: idx,
    };
    const key = val('.bot-api-key');
    if (key) api.apiKey = key;
    return api;
  }).filter((api) => api.url || api.label);
  const activeRow = document.querySelector('#bot-apis-list .bot-api-row .bot-api-active-input:checked');
  let activeApiId = '';
  if (activeRow) {
    const row = activeRow.closest('.bot-api-row');
    activeApiId = row ? row.dataset.apiId || '' : '';
  }
  const timeout = document.getElementById('bot-timeout');
  const prompt = document.getElementById('bot-system-prompt');
  return {
    systemPrompt: prompt ? prompt.value : '',
    timeoutMs: timeout ? Number(timeout.value) : 6000,
    activeApiId,
    apis,
  };
}

function updateBotPromptCount() {
  const prompt = document.getElementById('bot-system-prompt');
  const counter = document.getElementById('bot-prompt-count');
  if (prompt && counter) counter.textContent = `${prompt.value.length} caracteres`;
}

function applyBotConfig(data) {
  setText('bot-endpoint', data.endpoint);
  setText('bot-fallback', data.fallback);
  setText('weather-key-mask', data.weatherKeyMask);
  const active = (data.apis || []).find((a) => a.id === data.activeApiId);
  setText('bot-active-label', active ? active.label : (data.apis && data.apis.length ? data.apis[0].label : 'Conocimiento local'));
  const timeout = document.getElementById('bot-timeout');
  if (timeout) timeout.value = data.timeoutMs || 6000;
  const prompt = document.getElementById('bot-system-prompt');
  if (prompt) prompt.value = data.systemPrompt || '';
  botConfigDefaultPrompt = data.defaultSystemPrompt || botConfigDefaultPrompt;
  renderBotApis(data.apis, data.activeApiId);
  updateBotPromptCount();
  renderCount('count-bot-apis', (data.apis || []).filter((a) => a.enabled).length);
}

async function loadBotConfig() {
  const data = await fetchJson('/admin/api/bot-config');
  if (data.error) {
    setText('bot-active-label', `Error: ${data.error}`);
    return;
  }
  applyBotConfig(data);
}

async function saveBotConfig() {
  const feedback = document.getElementById('bot-config-feedback');
  const btn = document.getElementById('bot-save-config');
  const payload = collectBotConfig();
  if (btn) { btn.disabled = true; }
  if (feedback) { feedback.textContent = 'Guardando…'; feedback.style.color = ''; }
  try {
    const data = await fetchJson('/admin/api/bot-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (data.error) throw new Error(data.error);
    applyBotConfig(data);
    if (feedback) { feedback.textContent = 'Configuración guardada.'; feedback.style.color = 'var(--ok, #2e7d32)'; }
  } catch (err) {
    if (feedback) { feedback.textContent = `No se pudo guardar: ${err.message}`; feedback.style.color = 'var(--danger, #b3261e)'; }
  } finally {
    if (btn) { btn.disabled = false; }
  }
}

function initBotConfigControls() {
  const addBtn = document.getElementById('bot-add-api');
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', () => {
      document.getElementById('bot-apis-list').appendChild(botApiRowFrom(null));
    });
  }
  const saveBtn = document.getElementById('bot-save-config');
  if (saveBtn && !saveBtn.dataset.bound) {
    saveBtn.dataset.bound = '1';
    saveBtn.addEventListener('click', saveBotConfig);
  }
  const resetBtn = document.getElementById('bot-reset-prompt');
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = '1';
    resetBtn.addEventListener('click', () => {
      const prompt = document.getElementById('bot-system-prompt');
      if (prompt && botConfigDefaultPrompt) { prompt.value = botConfigDefaultPrompt; updateBotPromptCount(); }
    });
  }
  const prompt = document.getElementById('bot-system-prompt');
  if (prompt && !prompt.dataset.bound) {
    prompt.dataset.bound = '1';
    prompt.addEventListener('input', updateBotPromptCount);
  }
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
  const cssClass = normalized.replace(/[^a-z0-9_-]/g, '') || 'guest';
  return `<span class="pill role-pill ${cssClass}">${escapeLog(ROLE_LABELS[normalized] || normalized)}</span>`;
}

function renderStatusPill(status) {
  const normalized = (status || 'pending').toString().toLowerCase();
  const cssClass = normalized.replace(/[^a-z0-9_-]/g, '') || 'pending';
  return `<span class="pill status-pill ${cssClass}">${escapeLog(STATUS_LABELS[normalized] || normalized)}</span>`;
}

function normalizeAdminRole(role) {
  const normalized = String(role || 'guest').toLowerCase();
  return ['super-admin', 'editor', 'viewer', 'guest'].includes(normalized) ? normalized : 'guest';
}

function getSearchQuery(resource) {
  const input = document.querySelector(`input[data-search-resource="${resource}"]`);
  return (input?.value || '').trim().toLowerCase();
}

function getStatusFilter(resource) {
  return resourceFilters.get(resource) || 'all';
}

function filterResourceItems(resource, items) {
  const query = getSearchQuery(resource).toLocaleLowerCase('es');
  const status = getStatusFilter(resource);
  return items.filter((item) => {
    const text = JSON.stringify(item).toLocaleLowerCase('es');
    const matchesText = !query || text.includes(query);
    const matchesStatus = status === 'all' || item.status === status || (status === 'active' && item.activo !== 0) || (status === 'inactive' && item.activo === 0);
    return matchesText && matchesStatus;
  });
}

function renderWorkQueue({ content, tickets, botConfig }) {
  const host = document.getElementById('work-queue');
  if (!host) return;
  const drafts = content.filter((item) => item.status === 'draft').length;
  const archived = content.filter((item) => item.status === 'archived').length;
  const openTickets = (tickets || []).filter((item) => !['closed', 'resolved'].includes(item.status)).length;
  const activeApis = (botConfig?.apis || []).filter((item) => item.enabled).length;
  const items = [
    { label: 'Borradores para publicar', value: drafts, section: 'alojamientos' },
    { label: 'Tickets abiertos', value: openTickets, section: 'tickets' },
    { label: 'Contenido archivado', value: archived, section: 'alojamientos' },
    { label: 'APIs activas del asistente', value: activeApis, section: 'bot-config' },
  ];
  host.innerHTML = items.map((item) => `
    <button type="button" class="queue-item" data-goto="${item.section}">
      <span>${item.label}</span><strong>${item.value}</strong>
    </button>`).join('') || '<div class="empty-state"><p>No hay pendientes.</p></div>';
}

function renderRecentActivity(entries) {
  const host = document.getElementById('recent-activity');
  if (!host) return;
  host.innerHTML = entries.slice(0, 5).map((entry) => `
    <div class="activity-item">
      <span class="activity-dot" aria-hidden="true"></span>
      <div><strong>${escapeLog(entry.action || 'Cambio')}</strong><span>${escapeLog(entry.adminUser || 'Sistema')} · ${new Date(entry.createdAt).toLocaleString('es-AR')}</span></div>
    </div>`).join('') || '<div class="empty-state"><p>Todavía no hay actividad registrada.</p></div>';
}

function renderMediaPicker(items) {
  const grid = document.getElementById('media-picker-grid');
  if (!grid) return;
  grid.innerHTML = items.length ? items.map((item) => {
    const url = resolvePublicAssetUrl(item.variants?.thumb?.url || item.url || item.path);
    const name = item.filename || item.name || url.split('/').pop();
    return `<button type="button" class="media-choice" data-media-url="${escapeLog(url)}">
      <img src="${escapeLog(url)}" alt="" loading="lazy">
      <span>${escapeLog(name)}</span>
    </button>`;
  }).join('') : '<div class="empty-state"><p>No hay imágenes cargadas.</p></div>';
}

async function ensureMediaLibrary() {
  const data = await fetchJson('/admin/api/media');
  mediaLibrary = data.media || data.items || data.uploads || [];
  renderMediaPicker(mediaLibrary);
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
  if (name === 'audit') return ['super-admin', 'editor'].includes(role);
  if (name === 'uploads') return ['super-admin', 'editor'].includes(role);
  if (name === 'backup') return role === 'super-admin';
  return ['super-admin', 'editor', 'viewer', 'guest'].includes(role);
}

function canWriteResource(resource, role) {
  const name = mapResourceToPermissionName(resource);
  if (name === 'users') return role === 'super-admin';
  return ['super-admin', 'editor'].includes(role);
}

function canDeleteResource(resource, role) {
  const name = mapResourceToPermissionName(resource);
  if (name === 'users') return role === 'super-admin';
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
  const url = resolvePublicAssetUrl(item.variants?.card?.url || item.variants?.thumb?.url || item.url || item.name);
  return `
    <div class="upload-card">
      ${url ? `<img src="${escapeLog(url)}" alt="${escapeLog(item.alt || '')}" loading="lazy" />` : ''}
      <div class="upload-meta">
        <strong>${escapeLog(item.filename || item.name || 'Imagen')}</strong>
        <span class="small">${item.width || '—'} × ${item.height || '—'} px · ${item.usage?.length || 0} usos</span>
        <label>Texto alternativo<input data-media-meta-alt="${escapeLog(item.id || '')}" value="${escapeLog(item.alt || '')}" /></label>
        <label>Epígrafe<input data-media-meta-caption="${escapeLog(item.id || '')}" value="${escapeLog(item.caption || '')}" /></label>
        <div class="list-actions">
          <button type="button" data-action="copy-url" data-url="${url}">Copiar URL</button>
          <button type="button" data-action="save-media" data-id="${escapeLog(item.id || '')}">Guardar datos</button>
          <button type="button" class="danger-button" data-action="delete" data-resource="uploads" data-id="${escapeLog(item.id || '')}">Eliminar</button>
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
  const [data, users, audit, alojamientos, gastronomia, eventos, tickets, botConfig] = await Promise.all([
    fetchJson('/api/data'),
    usersRequest,
    fetchJson('/admin/api/audit'),
    fetchJson('/admin/api/alojamientos'),
    fetchJson('/admin/api/gastronomia'),
    fetchJson('/admin/api/eventos'),
    fetchJson('/admin/api/tickets'),
    ['super-admin', 'editor'].includes(role) ? fetchJson('/admin/api/bot-config') : Promise.resolve({ skipped: true }),
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

  if (botConfig && !botConfig.error && !botConfig.skipped) {
    renderCount('count-bot-apis', (botConfig.apis || []).filter((a) => a.enabled).length);
  } else {
    renderCount('count-bot-apis', botConfig && botConfig.skipped ? 'sin permiso' : '—');
  }

  if (audit.error) {
    renderCount('count-audit', 'sin permiso');
  } else {
    renderCount('count-audit', (audit.audit || []).length);
  }
  if (!tickets.error) renderCount('count-tickets', (Array.isArray(tickets) ? tickets.length : (tickets.length || (tickets.tickets || []).length)));
  else renderCount('count-tickets', 'sin permiso');

  const contentItems = [
    ...(alojamientos.items || alojamientos.alojamientos || alojamientos || []),
    ...(gastronomia.items || gastronomia.gastronomia || gastronomia || []),
    ...(eventos.items || eventos.eventos || eventos || []),
  ];
  renderWorkQueue({
    content: contentItems,
    tickets: tickets.items || tickets.tickets || tickets || [],
    botConfig: botConfig || { apis: [] },
  });
  renderRecentActivity(audit.items || audit.audit || []);

  const published = contentItems.filter((item) => item.status === 'published').length;
  const draft = contentItems.filter((item) => item.status === 'draft').length;
  const archived = contentItems.filter((item) => item.status === 'archived').length;

  renderCount('count-status-published', published);
  renderCount('count-status-draft', draft);
  renderCount('count-status-archived', archived);
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
  if (resource === 'users') {
    const items = filterResourceItems(resource, result.users || []);
    renderList(`${resource}-list`, items, renderUsers);
    renderCount('count-users', items.length);
    updatePagination(resource, items.length, (result.users || []).length, getSearchQuery(resource));
    return;
  }
  if (resource === 'audit') {
    const items = filterResourceItems(resource, result.audit || []);
    renderList(`${resource}-list`, items, renderAudit);
    renderCount('count-audit', items.length);
    updatePagination(resource, items.length, (result.audit || []).length, getSearchQuery(resource));
    return;
  }
  if (resource === 'tickets') {
    const items = filterResourceItems(resource, Array.isArray(result) ? result : (result.tickets || []));
    renderList(`${resource}-list`, items, renderTickets);
    renderCount('count-tickets', items.length);
    updatePagination(resource, items.length, (Array.isArray(result) ? result.length : (result.tickets || []).length), getSearchQuery(resource));
    return;
  }
  if (resource === 'uploads') {
    const source = result.media || result.uploads || [];
    const items = filterItems(source, getSearchQuery(resource));
    renderList(`${resource}-list`, items, renderUploads);
    updatePagination(resource, items.length, source.length, getSearchQuery(resource));
    return;
  }
  if (resource === 'datos-utiles') {
    const items = filterResourceItems(resource, Array.isArray(result) ? result : []);
    document.getElementById(`${resource}-list`).innerHTML = renderDataUtiles(items);
    renderCount('count-du', items.length);
    updatePagination(resource, items.length, items.length, getSearchQuery(resource));
    return;
  }
  const items = filterResourceItems(resource, Array.isArray(result) ? result : []);
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
          : resource === 'actividades'
            ? (item.descripcion || '').slice(0, 100) + '...'
            : item[key] || '';
    const imagePath = resource === 'gastronomia' ? item.imagen : (item.mainImg || item.imagen);
    const thumb = ['alojamientos', 'gastronomia', 'eventos', 'actividades'].includes(resource)
      ? renderListThumb(imagePath)
      : '';
    const rowActions = canWrite ? `
      <div class="row-actions">
        <button type="button" data-action="edit" data-resource="${escapeLog(resource)}" data-id="${escapeLog(item.id)}">Editar</button>
        <details class="more-actions">
          <summary aria-label="Más acciones">•••</summary>
          <div class="action-menu">
            <button type="button" data-action="preview-item" data-resource="${escapeLog(resource)}" data-id="${escapeLog(item.id)}">Vista previa</button>
            <button type="button" data-action="duplicate" data-resource="${escapeLog(resource)}" data-id="${escapeLog(item.id)}">Duplicar</button>
            <button type="button" data-action="hide" data-resource="${escapeLog(resource)}" data-id="${escapeLog(item.id)}">${hideLabel}</button>
            <button type="button" class="danger-text" data-action="delete" data-resource="${escapeLog(resource)}" data-id="${escapeLog(item.id)}">Eliminar</button>
          </div>
        </details>
      </div>` : '';
    return `
      <div class="list-row list-row-with-thumb">
        ${thumb}
        <div style="flex:1">
          <strong>${escapeLog(item[key] || item.id || 'Sin nombre')}</strong>
          <span class="small">ID: ${escapeLog(item.id || '—')}</span>
          ${details ? `<div class="small" style="margin-top:4px;">${escapeLog(details)}</div>` : ''}
          <div class="meta-row">${statusHtml}${activeHtml}</div>
        </div>
        ${rowActions}
      </div>
    `;
  }).join('');
  updatePagination(resource, items.length, items.length, getSearchQuery(resource));
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
  if (action === 'save-media') {
    saveMediaMetadata(id);
    return;
  }
  if (action === 'preview-item') {
    previewItem(resource, id);
    return;
  }
  if (action === 'duplicate') {
    duplicateItem(resource, id);
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
    window.AdminUI.closeEditor();
    return;
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
  if (resource === 'actividades') setActividadesForm(item);
  setEditState(resource, item);
  const titles = {
    alojamientos: 'Editar alojamiento',
    gastronomia: 'Editar local gastronómico',
    eventos: 'Editar evento',
    'datos-utiles': 'Editar dato útil',
    users: 'Editar usuario',
    tickets: 'Editar ticket',
    actividades: 'Editar actividad',
  };
  window.AdminUI.openEditor(resource, titles[resource] || 'Editar registro');
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
  } else if (resource === 'actividades') {
    payload = getActividadesPayload();
    if (!payload.titulo) {
      showToast('La actividad necesita un título.', 'error');
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
  document.dispatchEvent(new CustomEvent('editor:saved', { detail: { resource, item: result } }));
  window.AdminUI.closeEditor(true);
  notifyPublicDataRefresh();
  await loadResource(resource);
  await loadCounts();
}

function previewItem(resource, id) {
  const url = resource === 'gastronomia'
    ? `/gastronomia.html?g=${encodeURIComponent(id)}`
    : resource === 'alojamientos'
      ? `/index.html?h=${encodeURIComponent(id)}`
      : resource === 'eventos'
        ? `/evento.html?id=${encodeURIComponent(id)}` : '/';
  window.open(url, '_blank', 'noopener');
}

async function duplicateItem(resource, id) {
  const info = resources[resource];
  if (!info?.api) return;
  const source = await fetchJson(`${info.api}/${encodeURIComponent(id)}`);
  if (source.error) return showToast(`No se pudo duplicar: ${source.error}`, 'error');
  const copy = { ...source, status: 'draft', activo: 0, slug: '', featured: false };
  delete copy.id; delete copy.createdAt; delete copy.updatedAt; delete copy.history; delete copy.revision; delete copy.publishedAt;
  if (copy.titulo) copy.titulo = `${copy.titulo} (copia)`;
  if (copy.nombre) copy.nombre = `${copy.nombre} (copia)`;
  const result = await fetchJson(info.api, { method: 'POST', body: JSON.stringify(copy) });
  if (result.error) return showToast(`No se pudo duplicar: ${result.error}`, 'error');
  showToast('Copia creada como borrador.', 'ok');
  await loadResource(resource);
}

async function sendDelete(resource, id) {
  const confirmed = await window.AdminUI.confirmAction({
    title: 'Eliminar registro',
    message: 'Esta acción quita el registro del panel y no se puede deshacer.',
    confirmLabel: 'Eliminar',
    danger: true,
  });
  if (!confirmed) return;
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

async function copyUploadUrl(url) {
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    showToast('URL copiada al portapapeles', 'ok');
  } catch (e) {
    showToast('No se pudo copiar la URL', 'error');
  }
}

async function saveMediaMetadata(id) {
  const escapedId = window.CSS && CSS.escape ? CSS.escape(id) : id.replace(/[^a-zA-Z0-9_-]/g, '');
  const alt = document.querySelector(`[data-media-meta-alt="${escapedId}"]`)?.value || '';
  const caption = document.querySelector(`[data-media-meta-caption="${escapedId}"]`)?.value || '';
  const result = await fetchJson(`/admin/api/media/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ alt, caption }) });
  if (result.error) {
    showToast(`No se pudieron guardar los datos: ${result.error}`, 'error');
    return;
  }
  showToast('Datos de la fotografía actualizados.', 'ok');
  await loadResource('uploads');
}

window.showToast = showToast;
window.loadResource = loadResource;

document.addEventListener('DOMContentLoaded', () => {
  renderAdminIcons();
  bindImageFallbacks();
  const imageObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      bindImageFallbacks(node.matches?.('img') ? (node.parentElement || document) : node);
    }));
  });
  imageObserver.observe(document.body, { childList: true, subtree: true });
  setSidebarCollapsed(localStorage.getItem('admin_sidebar_collapsed') === '1');
  initPortalPreview();
  document.querySelectorAll('.nav-item, .tab').forEach((tab) => {
    tab.addEventListener('click', () => toggleSection(tab.dataset.section));
  });

  document.querySelectorAll('[data-editor-close]').forEach((button) => {
    button.addEventListener('click', () => window.AdminUI.closeEditor());
  });
  document.getElementById('editor-backdrop')?.addEventListener('click', () => window.AdminUI.closeEditor());

  document.querySelectorAll('[data-status-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const resource = button.dataset.filterResource;
      resourceFilters.set(resource, button.dataset.statusFilter);
      button.parentElement.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      loadResource(resource);
    });
  });

  document.querySelectorAll('[data-media-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      await ensureMediaLibrary();
      window.AdminUI.openMediaPicker({
        onSelect(url) {
          const input = document.getElementById(button.dataset.mediaTarget);
          const preview = document.getElementById(button.dataset.previewTarget);
          if (input) input.value = url;
          if (preview) {
            preview.src = resolvePublicAssetUrl(url);
            preview.hidden = false;
          }
          input?.dispatchEvent(new Event('input', { bubbles: true }));
        },
      });
    });
  });

  document.getElementById('media-picker-grid')?.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-media-url]');
    if (choice) window.AdminUI.chooseMedia(choice.dataset.mediaUrl);
  });

  document.querySelectorAll('[data-close-media]').forEach((button) => {
    button.addEventListener('click', () => window.AdminUI.closeMediaPicker());
  });

  document.querySelectorAll('.subnav [data-goto]').forEach((button) => {
    button.addEventListener('click', () => toggleSection(button.dataset.goto));
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
  document.getElementById('sidebar-collapse')?.addEventListener('click', () => {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeSidebar();
  });

  setupImageFileInputs();
  const btnAddContact = document.getElementById('btn-add-contact');
  if (btnAddContact) {
    btnAddContact.addEventListener('click', () => addContactRow('', ''));
  }
  const observabilitySearch = document.getElementById('observability-search');
  if (observabilitySearch) observabilitySearch.addEventListener('input', renderObservability);
  refreshAll();
});
