# TuOficioCol

Plataforma web para conectar empleadores con trabajadores independientes de oficio (electricistas, plomeros, carpinteros, pintores, etc.) en Bogotá. Incluye búsqueda geolocalizada, perfiles con hoja de vida y portafolio, cotizaciones, trabajos, reseñas, reportes, verificación de identidad y un panel administrativo.

> Proyecto académico desarrollado con HTML, CSS y JavaScript vanilla + Firebase (Auth, Firestore y Storage). No requiere build ni framework.

---

## 1. Demo rápida

1. Abre una terminal en la raíz del proyecto.
2. Ejecuta un servidor local:

   ```powershell
   python -m http.server 8123 --bind 127.0.0.1
   ```

3. Abre:

   - Landing pública: <http://127.0.0.1:8123/index.html>
   - Buscador público: <http://127.0.0.1:8123/buscar.html>
   - Perfil público: <http://127.0.0.1:8123/perfil.html?id=w-carlos>
   - Aplicación completa: <http://127.0.0.1:8123/app.html>

Si Firestore no está disponible o las reglas aún no están desplegadas, la app activa automáticamente el **modo demostración local** y muestra un aviso. Los datos se guardan en `localStorage` del navegador.

### Credenciales de demostración

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Empleador | `ana@demo.tuoficio.co` | `demo1234` |
| Empleador | `jorge@demo.tuoficio.co` | `demo1234` |
| Empleador | `paula@demo.tuoficio.co` | `demo1234` |
| Trabajador | `carlos@demo.tuoficio.co` | `demo1234` |
| Administrador | `admin1@chambaya.com` | `AdminChamba1!` |

En la pantalla de acceso también hay botones de **entrada rápida como empleador, trabajador o administrador**. Los datos demo se pueden restaurar desde `Configuración → Restablecer datos de demostración`.

---

## 2. Funcionalidades

### Público (sin iniciar sesión)
- Landing con búsqueda por oficio y zona, estadísticas reales, categorías, zonas, mapa y técnicos destacados.
- Directorio de técnicos con filtros combinados: oficio, zona, radio de 5 km, calificación, disponibilidad y verificación.
- Orden por cercanía, calificación o precio; vista de lista o mapa.
- Perfil público con badge de verificado, tarifas indicativas, habilidades, zona de cobertura, portafolio antes/después con lightbox, reseñas reales, mapa y contacto por WhatsApp.
- URL compartible con filtros (`buscar.html?trade=Electricidad&zone=Chapinero&radius=5`).

### Empleador
- Registro e inicio de sesión con correo o Google.
- Solicitud directa a un técnico con fecha, hora, dirección, descripción y presupuesto.
- Publicación de solicitudes para recibir varias ofertas.
- Comparación y aceptación de ofertas.
- Seguimiento de trabajos: pendiente, aceptado, en curso, finalizado.
- Reseña únicamente cuando el trabajo está **Finalizado** y aún no ha sido reseñado.
- Reportes durante el trabajo o hasta 24 horas después de finalizarlo.
- Favoritos, mensajería interna y notificaciones.

### Trabajador
- Perfil profesional con oficio, experiencia, descripción, tarifas y cobertura.
- Hoja de vida y portafolio con imágenes antes/después (JPG/PNG ≤ 5 MB) y video.
- Verificación de identidad: documento + selfie → estado **En revisión** → aprobación del administrador → badge de verificado.
- Interruptor de disponibilidad.
- Recepción de solicitudes directas, envío de ofertas y postulación a solicitudes publicadas.
- Gestión de trabajos, reseñas recibidas y reportes.

### Administrador
- Panel con métricas generales.
- Aprobación o rechazo de verificaciones de identidad.
- Gestión de usuarios, técnicos, reportes y reseñas.
- Resolución de reportes con sanción (advertencia, suspensión o baneo).
- Auditoría de reseñas y contenido.

### Cobertura de requisitos

| RF | Funcionalidad | HU | Estado |
| --- | --- | --- | --- |
| RF01 | Registro por rol | HU-01 | Implementado; el documento y el teléfono se completan en el perfil |
| RF02 | Perfil del trabajador, cobertura y visibilidad de contacto | HU-01 | Implementado |
| RF03 | Catálogo, filtros y orden por experiencia, cercanía, calificación y disponibilidad | HU-06 | Implementado |
| RF04 | Verificación y confianza | HU-05, HU-15 | Implementado con revisión manual; no hay integración real con MinTrabajo/Saber Hacer Vale |
| RF05 | Chatbot para hoja de vida y recomendaciones | HU-02, HU-07 | Implementado para HV y recomendaciones; la asistencia para redactar una solicitud es guiada, no un formulario automático |
| RF06 | Notificaciones de solicitudes y favoritos | HU-09, HU-11 | Notificaciones dentro de la app; no hay push ni correo |
| RF07 | Portafolio antes/después | HU-04 | Implementado |
| RF08 | Zonas y mapa interactivo | HU-06 | Implementado con Leaflet/OpenStreetMap; no usa Google Maps |
| RF09 | Roles y control de permisos | HU-13 | Implementado con RBAC y reglas de Firestore |
| RF10 | Disponibilidad y horarios | HU-03 | Implementado con Disponible, Medio tiempo y Ocupado |
| RF11 | Reseñas y calificación de 1 a 5 | HU-10 | Implementado solo para trabajos finalizados |
| RF12 | Tarifas orientativas y presupuesto previo | HU-08 | Implementado: visita diagnóstica, mano de obra y nota |
| RF13 | Reportes de incidentes | HU-14, HU-16, HU-17 | Implementado para cliente y trabajador, activo o dentro de 24 h |
| RF14 | Compartir perfil y contacto | HU-12 | Implementado con enlace público y WhatsApp |
| RF15 | Cotización del cliente | HU-09 | Implementado con descripción, fecha, hora, lugar, presupuesto y duración |
| HU-18 | Inicio de sesión con Google | HU-18 | Implementado en código; requiere habilitar Google en Firebase y dominios autorizados |

La app cubre los flujos funcionales de las guías, pero hay tres diferencias de arquitectura que debes tener presentes al presentar: usa **Firestore** en lugar de MySQL, **Leaflet/OpenStreetMap** en lugar de Google Maps y **Firebase Auth** en lugar de un backend propio con middleware JWT. La verificación institucional con MinTrabajo/Saber Hacer Vale y las notificaciones push/correo están simuladas o pendientes.

---

## 3. Estructura del proyecto

```text
tuoficio/
├── index.html                  # Landing pública
├── buscar.html                 # Directorio público con filtros y mapa
├── perfil.html                 # Perfil público del técnico
├── app.html                    # SPA autenticada (cliente, trabajador y admin)
├── dashboard-*.html            # Redirecciones a app.html (compatibilidad)
├── mockup.html                 # Redirección a app.html
├── perfil-trabajador.html      # Redirección a perfil.html
├── css/
│   ├── design-system.css       # Tokens y base visual (salvia / marfil)
│   ├── public.css              # Estilos de páginas públicas
│   ├── app.css, auth.css       # Shell y autenticación de la SPA
│   └── app-extras.css          # Componentes de la aplicación
├── js/
│   ├── config/                 # Constantes y configuración de Firebase
│   ├── data/seed.js            # Datos demo (10 técnicos, reseñas, trabajos...)
│   ├── services/
│   │   ├── DatabaseService.js  # Firestore + fallback local
│   │   ├── LocalStore.js       # Persistencia demo en localStorage
│   │   ├── AuthService.js      # Login, registro, Google, sesión
│   │   └── DomainServices.js   # Reglas de negocio (búsqueda, reseñas, etc.)
│   ├── pages/                  # Vistas de la SPA
│   ├── ui/UIManager.js         # Navegación, modales, toasts
│   ├── core/App.js             # Arranque y enrutamiento
│   └── public.js               # Adaptador de datos para páginas públicas
├── firestore.rules             # Reglas de seguridad de Firestore
├── storage.rules               # Límites y permisos de Storage
├── firebase.json
└── firestore.indexes.json
```

Las páginas antiguas (`dashboard-cliente.html`, `dashboard-trabajador.html`, `dashboard-admin.html`, `mockup.html`, `perfil-trabajador.html`) se conservan como redirecciones para no romper enlaces existentes.

---

## 4. Configuración de Firebase

Proyecto configurado por defecto: **`chambaya-45541`** (ver `.firebaserc` y `js/config/firebase-config.js`).

### 4.1 Desplegar reglas

Mientras las reglas no estén desplegadas, Firestore responderá `Missing or insufficient permissions` y la app usará el modo demo local.

```powershell
npm install -g firebase-tools
firebase login
firebase use chambaya-45541
firebase deploy --only firestore:rules,storage
```

Si el proyecto aún no existe o no tienes permisos:

```powershell
firebase projects:list
firebase use --add
```

### 4.2 Authentication

En Firebase Console → Authentication → Sign-in method:

- Habilitar **Correo electrónico/contraseña**.
- Habilitar **Google**.
- Agregar `127.0.0.1` y el dominio de producción a **Authorized domains**.

### 4.3 Firestore

- Crear la base de datos en modo producción.
- Desplegar `firestore.rules` y, si se usan consultas compuestas, `firestore.indexes.json`:

  ```powershell
  firebase deploy --only firestore:indexes
  ```

### 4.4 Storage (opcional en demo)

- Las imágenes se limitan a **5 MB** y los videos a **50 MB** en Firebase Storage.
- En modo demo, las imágenes se comprimen y se guardan como Data URLs en `localStorage`; el video se limita localmente a **4 MB**.

### 4.5 Modo de datos

| Situación | Comportamiento |
| --- | --- |
| Firestore responde correctamente | Se usan datos reales de Firestore |
| Firestore no disponible o sin permisos | Se activa el modo demo con `js/data/seed.js` |
| Sesión demo | Se guarda en `tuoficio_session_uid` |
| Base demo | Se guarda en `tuoficio_db_v1` |

---

## 5. Flujos de prueba sugeridos

1. **Público:** abre `buscar.html`, filtra por `Chapinero` y radio `5 km`; deben aparecer Carlos, Lucía y Julián con distancia.
2. **Perfil:** abre `perfil.html?id=w-carlos`; verifica badge, 4.7 de calificación, 3 reseñas y 2 proyectos de portafolio.
3. **Empleador:** entra como `ana@demo.tuoficio.co` → solicita cotización directa a Carlos con fecha, hora, dirección y presupuesto.
4. **Trabajador:** entra como `carlos@demo.tuoficio.co` → revisa la notificación, acepta la solicitud y consulta “Reseñas recibidas”.
5. **Reseña:** como empleador, entra al trabajo `j-hist` (Finalizado) y crea una reseña; el botón solo aparece si no existe una previa.
6. **Reporte:** en un trabajo activo o dentro de las 24 h posteriores a finalizar, crea un reporte.
7. **Administrador:** entra con `admin1@chambaya.com` → aprueba la verificación `v1` de Julián y resuelve el reporte `rp1`.
8. **Google:** prueba “Continuar con Google” cuando el proveedor esté habilitado en Firebase.

---

## 6. Decisiones técnicas

- **SPA única:** `app.html` concentra la experiencia autenticada; las vistas se cargan desde `js/pages/` y se navega sin recargar.
- **Capa de datos dual:** `DatabaseService` intenta Firestore y cae a `LocalStore` si no hay permisos o conexión.
- **RBAC:** el rol (`cliente`, `trabajador`, `admin`) define la navegación y las acciones disponibles; las reglas de Firestore refuerzan los permisos.
- **Búsqueda por radio:** cálculo Haversine sobre latitud/longitud de la zona seleccionada (5 km por defecto).
- **Reseñas verificadas:** solo se permiten sobre trabajos finalizados y sin reseña previa.
- **Reportes con ventana:** solo durante un trabajo activo o dentro de las 24 h posteriores a su finalización.
- **Verificación:** el técnico no puede autoaprobarse; el badge solo lo otorga un administrador.
- **Compatibilidad:** las páginas antiguas redirigen a las nuevas rutas para conservar enlaces.

---

## 7. Limitaciones conocidas

- El proyecto desplegado en `chambaya-45541` requiere ejecutar `firebase deploy --only firestore:rules` para salir del modo demo.
- El inicio de sesión con Google requiere habilitar el proveedor y los dominios autorizados en Firebase.
- En modo demo los datos son locales al navegador y no se sincronizan entre dispositivos.
- No se incluyen Cloud Functions; las reglas y la lógica del cliente cubren los flujos académicos.
- Los mapas usan OpenStreetMap/Leaflet y no requieren API key.

---

## 8. Repositorio

<https://github.com/saanntiago/tuoficio>

```powershell
git clone https://github.com/saanntiago/tuoficio.git
cd tuoficio
python -m http.server 8123 --bind 127.0.0.1
```

---

Proyecto académico TuOficioCol. Diseño y desarrollo web.
