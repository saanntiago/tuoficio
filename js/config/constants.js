const CHAMBAYA = {
  ZONES: [
    { id: 'chapinero', name: 'Chapinero', lat: 4.6486, lng: -74.0628 },
    { id: 'suba', name: 'Suba', lat: 4.7411, lng: -74.0839 },
    { id: 'kennedy', name: 'Kennedy', lat: 4.6268, lng: -74.1537 },
    { id: 'usaquen', name: 'Usaquén', lat: 4.7485, lng: -74.0308 },
    { id: 'bosa', name: 'Bosa', lat: 4.6180, lng: -74.1900 },
    { id: 'engativa', name: 'Engativá', lat: 4.7015, lng: -74.1090 },
    { id: 'fontibon', name: 'Fontibón', lat: 4.6780, lng: -74.1410 },
    { id: 'teusaquillo', name: 'Teusaquillo', lat: 4.6400, lng: -74.0900 },
    { id: 'puente-aranda', name: 'Puente Aranda', lat: 4.6120, lng: -74.1170 },
    { id: 'ciudad-bolivar', name: 'Ciudad Bolívar', lat: 4.5410, lng: -74.1540 },
    { id: 'san-cristobal', name: 'San Cristóbal', lat: 4.5700, lng: -74.0830 },
    { id: 'barrios-unidos', name: 'Barrios Unidos', lat: 4.6690, lng: -74.0730 },
  ],
  TRADES: [
    'Plomería', 'Electricidad', 'Carpintería', 'Pintura',
    'Jardinería', 'Cerrajería', 'Albañilería', 'Limpieza',
    'Soldadura', 'Mecánica', 'Costura', 'Aire acondicionado',
  ],
  ADMINS: [
    { email: 'admin1@chambaya.com', password: 'AdminChamba1!', name: 'Admin Central' },
    { email: 'admin2@chambaya.com', password: 'AdminChamba2!', name: 'Admin Operaciones' },
    { email: 'admin3@chambaya.com', password: 'AdminChamba3!', name: 'Admin Soporte' },
  ],
  COLLECTIONS: {
    USERS: 'usuarios',
    WORKERS: 'trabajadores',
    QUOTES: 'cotizaciones',
    OFFERS: 'sugerencias',
    CVS: 'hojasDeVida',
    MESSAGES: 'mensajes',
    CONVERSATIONS: 'conversaciones',
    REVIEWS: 'resenas',
    REPORTS: 'reportes',
    NOTIFICATIONS: 'notificaciones',
    FAVORITES: 'favoritos',
  },
};

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initialsOf(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || '');
  return (a + b).toUpperCase();
}

function formatCop(n) {
  return Number(n || 0).toLocaleString('es-CO');
}

function adminByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return CHAMBAYA.ADMINS.find(a => a.email === e) || null;
}

function isUserActive(u) {
  return u && u.activo !== false;
}

function zoneByName(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  return CHAMBAYA.ZONES.find(z => z.name.toLowerCase() === n || z.id === n || n.includes(z.name.toLowerCase()));
}
