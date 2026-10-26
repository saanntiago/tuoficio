/**
 * TuOficioCol — constantes y utilidades compartidas.
 * Se carga en todas las páginas (públicas y privadas).
 */

const CHAMBAYA = {
  ZONES: [
    { id: 'chapinero', name: 'Chapinero', lat: 4.6486, lng: -74.0628, barrios: ['Chicó', 'Chapinero Alto', 'El Lago'] },
    { id: 'suba', name: 'Suba', lat: 4.7411, lng: -74.0839, barrios: ['Niza', 'Alhambra', 'Suba Centro'] },
    { id: 'kennedy', name: 'Kennedy', lat: 4.6268, lng: -74.1537, barrios: ['Castilla', 'Américas', 'Timiza'] },
    { id: 'usaquen', name: 'Usaquén', lat: 4.7485, lng: -74.0308, barrios: ['Cedritos', 'Santa Bárbara', 'Usaquén Centro'] },
    { id: 'bosa', name: 'Bosa', lat: 4.6180, lng: -74.1900, barrios: ['Bosa Centro', 'El Porvenir'] },
    { id: 'engativa', name: 'Engativá', lat: 4.7015, lng: -74.1090, barrios: ['Álamos', 'Minuto de Dios', 'Engativá Centro'] },
    { id: 'fontibon', name: 'Fontibón', lat: 4.6780, lng: -74.1410, barrios: ['Modelia', 'Salitre', 'Fontibón Centro'] },
    { id: 'teusaquillo', name: 'Teusaquillo', lat: 4.6400, lng: -74.0900, barrios: ['Galerías', 'Palermo', 'La Soledad'] },
    { id: 'puente-aranda', name: 'Puente Aranda', lat: 4.6120, lng: -74.1170, barrios: ['Ciudad Montes', 'Puente Aranda'] },
    { id: 'ciudad-bolivar', name: 'Ciudad Bolívar', lat: 4.5410, lng: -74.1540, barrios: ['Lucero', 'Perdomo'] },
    { id: 'san-cristobal', name: 'San Cristóbal', lat: 4.5700, lng: -74.0830, barrios: ['20 de Julio', 'La Victoria'] },
    { id: 'barrios-unidos', name: 'Barrios Unidos', lat: 4.6690, lng: -74.0730, barrios: ['Rionegro', 'Doce de Octubre'] },
  ],
  TRADES: [
    'Plomería', 'Electricidad', 'Carpintería', 'Pintura',
    'Jardinería', 'Cerrajería', 'Albañilería', 'Limpieza',
    'Soldadura', 'Mecánica', 'Costura', 'Aire acondicionado',
  ],
  /** Icono de Font Awesome por oficio. */
  TRADE_ICONS: {
    'Plomería': 'fa-wrench',
    'Electricidad': 'fa-bolt',
    'Carpintería': 'fa-hammer',
    'Pintura': 'fa-paint-roller',
    'Jardinería': 'fa-leaf',
    'Cerrajería': 'fa-key',
    'Albañilería': 'fa-trowel-bricks',
    'Limpieza': 'fa-broom',
    'Soldadura': 'fa-fire',
    'Mecánica': 'fa-gear',
    'Costura': 'fa-scissors',
    'Aire acondicionado': 'fa-wind',
  },
  ADMINS: [
    { email: 'admin1@chambaya.com', password: 'AdminChamba1!', name: 'Admin Central' },
    { email: 'admin2@chambaya.com', password: 'AdminChamba2!', name: 'Admin Operaciones' },
    { email: 'admin3@chambaya.com', password: 'AdminChamba3!', name: 'Admin Soporte' },
  ],
  COLLECTIONS: {
    USERS: 'usuarios',
    WORKERS: 'trabajadores',
    QUOTES: 'cotizaciones',
    OFFERS: 'postulaciones',
    SUGGESTIONS: 'sugerencias',
    JOBS: 'trabajos',
    CVS: 'hojasDeVida',
    MESSAGES: 'mensajes',
    CONVERSATIONS: 'conversaciones',
    REVIEWS: 'resenas',
    REPORTS: 'reportes',
    VERIFICATIONS: 'verificaciones',
    NOTIFICATIONS: 'notificaciones',
    FAVORITES: 'favoritos',
  },
  AVAILABILITY: ['Disponible', 'Ocupado', 'Medio tiempo'],
  JOB_STATUS: { ACTIVE: 'Activo', DONE: 'Finalizado', CANCELLED: 'Cancelado' },
  QUOTE_STATUS: { OPEN: 'Activa', ASSIGNED: 'Asignada', CLOSED: 'Cerrada' },
  VERIFICATION_STATUS: {
    NONE: 'sin_solicitar',
    PENDING: 'en_revision',
    APPROVED: 'aprobado',
    REJECTED: 'rechazado',
  },
  REPORT_REASONS: [
    'Conducta inapropiada',
    'Perfil falso o suplantación',
    'Incumplimiento del servicio',
    'Cobro indebido',
    'Lenguaje ofensivo',
    'Otro motivo',
  ],
  LIMITS: {
    IMAGE_MB: 5,
    VIDEO_MB: 50,
    REPORT_WINDOW_HOURS: 24,
  },
};

/* ── Utilidades generales ─────────────────────────────────── */

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initialsOf(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const a = parts[0][0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] || '');
  return (a + b).toUpperCase();
}

function formatCop(n) {
  return Number(n || 0).toLocaleString('es-CO');
}

function formatMoney(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return 'A convenir';
  return '$' + formatCop(n) + ' COP';
}

function adminByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return CHAMBAYA.ADMINS.find(a => a.email === e) || null;
}

function isUserActive(u) {
  return Boolean(u) && u.activo !== false;
}

function isUserBanned(u) {
  if (!u) return false;
  if (u.sancion?.tipo === 'baneo') return true;
  if (u.sancion?.tipo === 'suspension' && u.sancion.hasta) {
    return new Date(u.sancion.hasta).getTime() > Date.now();
  }
  return false;
}

function zoneByName(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().trim();
  return CHAMBAYA.ZONES.find(z => z.name.toLowerCase() === n || z.id === n || n.includes(z.name.toLowerCase()));
}

function zoneById(id) {
  return CHAMBAYA.ZONES.find(z => z.id === id) || null;
}

function tradeIcon(trade) {
  return CHAMBAYA.TRADE_ICONS[trade] || 'fa-screwdriver-wrench';
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'object' && typeof value._seconds === 'number') return new Date(value._seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('es-CO', opts) : '—';
}

function formatDateTime(value) {
  const d = toDate(value);
  return d ? d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
}

function timeAgo(value) {
  const d = toDate(value);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(d);
}

function hoursSince(value) {
  const d = toDate(value);
  if (!d) return Infinity;
  return (Date.now() - d.getTime()) / 3600000;
}

function starsHtml(rating, size = 12) {
  const filled = Math.round(Number(rating) || 0);
  return Array.from({ length: 5 }, (_, i) =>
    `<i class="fas fa-star" style="font-size:${size}px;color:${i < filled ? 'var(--gold, #B8914A)' : 'var(--border, #D8D4CB)'}"></i>`
  ).join('');
}

/** Genera una URL de perfil público compartible. */
function publicProfileUrl(workerId) {
  const base = location.href.replace(/[^/]*$/, '');
  return `${base}perfil.html?id=${encodeURIComponent(workerId)}`;
}

function whatsappLink(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  const intl = digits.startsWith('57') ? digits : '57' + digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message || '')}`;
}

function availabilityClass(availability) {
  return { Disponible: 'available', Ocupado: 'busy', 'Medio tiempo': 'partial' }[availability] || 'busy';
}

/** Hash sencillo para el modo demo (no usar en producción). */
function demoHash(str) {
  let h = 5381;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Lee un archivo como Data URL. */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime una imagen en el navegador para poder guardarla sin exceder
 * el límite de 1 MB por documento de Firestore.
 */
function compressImage(file, maxSide = 1000, quality = 0.72) {
  return new Promise(async (resolve, reject) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('La imagen no se pudo procesar.'));
      img.src = dataUrl;
    } catch (e) {
      reject(e);
    }
  });
}

/** Placeholder SVG (funciona sin conexión) para fotos de portafolio. */
function placeholderImage(label, color = '#4E7A5C') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".95"/>
      <stop offset="1" stop-color="#21201C" stop-opacity=".85"/>
    </linearGradient></defs>
    <rect width="640" height="420" fill="url(#g)"/>
    <text x="50%" y="50%" fill="#F7F6F2" font-family="Manrope, sans-serif" font-size="34"
      font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeHtml(label)}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
