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

Para probar Firestore, Auth y Storage reales sin tocar producción existe un **modo emulador**:

```powershell
npm install
npm run emulators        # terminal 1
npm run seed:emulator    # terminal 2
python -m http.server 8123 --bind 127.0.0.1  # terminal 3
```

Abre `http://127.0.0.1:8123/app.html?emulator=1`. Las instrucciones completas para el proyecto real están en [Firebase real](docs/FIREBASE.md).

### Credenciales de demostración

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Empleador | `ana@demo.tuoficio.co` | `demo1234` |
| Empleador | `jorge@demo.tuoficio.co` | `demo1234` |
| Empleador | `paula@demo.tuoficio.co` | `demo1234` |
| Trabajador | `carlos@demo.tuoficio.co` | `demo1234` |
| Administrador | `admin1@chambaya.com` | `AdminChamba1!` |

En la pantalla de acceso también hay botones de **entrada rápida como empleador, trabajador o administrador**. Los datos demo se pueden restaurar desde `Configuración → Restablecer datos de demostración`.

### Documentación y evidencias

- [Guía de apertura en el PC](docs/GUIA_APERTURA.md)
- [Arquitectura real](docs/ARQUITECTURA.md)
- [Matriz RF01–RF15 / HU-01–HU-18](docs/MATRIZ_RF_HU.md)
- [Plan de pruebas y resultados reales](docs/PLAN_PRUEBAS.md)
- [Firebase real: Firestore, Auth y Storage](docs/FIREBASE.md)
- [Despliegue y publicación](docs/DESPLIEGUE.md)
- [Entregables y capturas](docs/ENTREGABLES.md)

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
| RF01 | Registro por rol | HU-01 | Implementado; el registro pide teléfono/WhatsApp y documento al trabajador |
| RF02 | Perfil del trabajador, cobertura y visibilidad de contacto | HU-01 | Implementado |
| RF03 | Catálogo, filtros y orden por experiencia, cercanía, calificación y disponibilidad | HU-06 | Implementado |
| RF04 | Verificación y confianza | HU-05, HU-15 | Implementado con revisión manual; no hay integración real con MinTrabajo/Saber Hacer Vale |
| RF05 | Chatbot para hoja de vida y recomendaciones | HU-02, HU-07 | Implementado para HV, recomendaciones y asistente que crea la solicitud paso a paso |
| RF06 | Notificaciones de solicitudes y favoritos | HU-09, HU-11 | In-app + aviso nativo del navegador + favoritos; push con pestaña cerrada y correo quedan pendientes de backend |
| RF07 | Portafolio antes/después | HU-04 | Implementado con validación JPG/PNG ≤ 5 MB y video |
| RF08 | Zonas y mapa interactivo | HU-06 | Implementado con Leaflet/OpenStreetMap; no usa Google Maps |
| RF09 | Roles y control de permisos | HU-13 | Implementado con RBAC y reglas de Firestore |
| RF10 | Disponibilidad y horarios | HU-03 | Implementado con Disponible, Medio tiempo y Ocupado |
| RF11 | Reseñas y calificación de 1 a 5 | HU-10 | Implementado solo para trabajos finalizados |
| RF12 | Tarifas orientativas y presupuesto previo | HU-08 | Implementado: visita diagnóstica, mano de obra y nota |
| RF13 | Reportes de incidentes | HU-14, HU-16, HU-17 | Implementado para cliente y trabajador, activo o dentro de 24 h |
| RF14 | Compartir perfil y contacto | HU-12 | Implementado con enlace público y WhatsApp |
| RF15 | Cotización del cliente | HU-09 | Implementado con descripción, fecha, hora, lugar, presupuesto y duración |
| HU-18 | Inicio de sesión con Google | HU-18 | Implementado en código; requiere habilitar Google en Firebase y dominios autorizados |

La app cubre los flujos funcionales de las guías, pero hay tres diferencias de arquitectura que debes tener presentes al presentar: usa **Firestore** en lugar de MySQL, **Leaflet/OpenStreetMap** en lugar de Google Maps y **Firebase Auth** en lugar de un backend propio con middleware JWT. La verificación institucional con MinTrabajo/Saber Hacer Vale y las notificaciones push/correo están simuladas o pendientes. La matriz completa, la arquitectura y los resultados de pruebas están en [`docs/`](docs/README.md).

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
│   │   ├── StorageService.js   # Firebase Storage, compresión y borrado
│   │   ├── LocalStore.js       # Persistencia demo en localStorage
│   │   ├── AuthService.js      # Login, registro, Google, sesión
│   │   └── DomainServices.js   # Reglas de negocio (búsqueda, reseñas, etc.)
│   ├── pages/                  # Vistas de la SPA
│   ├── ui/UIManager.js         # Navegación, modales, toasts
│   ├── core/App.js             # Arranque y enrutamiento
│   └── public.js               # Adaptador de datos para páginas públicas
├── firestore.rules             # Reglas de seguridad de Firestore
├── storage.rules               # Límites y permisos de Storage
├── firebase.json               # Hosting, reglas y emuladores
├── firestore.indexes.json
├── package.json                # Scripts de seed y emulador
├── scripts/seed-firestore.mjs  # Seed idempotente de Auth + Firestore
└── docs/
    ├── GUIA_APERTURA.md        # Cómo ejecutar el proyecto
    ├── ARQUITECTURA.md         # Arquitectura real y diferencias con el informe
    ├── MATRIZ_RF_HU.md         # Trazabilidad de requisitos e historias
    ├── PLAN_PRUEBAS.md         # Casos y resultados reales
    ├── FIREBASE.md             # Firestore, Auth, Storage, seed y emulador
    ├── DESPLIEGUE.md           # Publicación local/GitHub/Firebase
    ├── ENTREGABLES.md          # Documentos fuente y capturas
    ├── entregables/            # PDF/PPTX/DOCX originales
    └── evidencias/             # Capturas de la app en ejecución
```

Las páginas antiguas (`dashboard-cliente.html`, `dashboard-trabajador.html`, `dashboard-admin.html`, `mockup.html`, `perfil-trabajador.html`) se conservan como redirecciones para no romper enlaces existentes.

---

## 4. Configuración de Firebase

Proyecto configurado por defecto: **`tuoficiocol`** (ver `.firebaserc` y `js/config/firebase-config.js`).

### 4.1 Desplegar reglas

Mientras las reglas no estén desplegadas, Firestore responderá `Missing or insufficient permissions` y la app usará el modo demo local.

```powershell
npm install
npm install -g firebase-tools
firebase login
firebase use tuoficiocol
firebase deploy --only firestore:rules,firestore:indexes,storage
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\service-account.json"
npm run seed
```

Si el proyecto aún no existe o no tienes permisos:

```powershell
firebase projects:list
firebase use --add
```

El seed crea las cuentas demo en Firebase Auth y los documentos de Firestore. No guarda contraseñas ni hashes en la base. La guía completa está en [docs/FIREBASE.md](docs/FIREBASE.md).

### 4.2 Authentication

En Firebase Console → Authentication → Sign-in method:

- Habilitar **Correo electrónico/contraseña**.
- Habilitar **Google**.
- Agregar `127.0.0.1`, `localhost` y el dominio exacto de producción a **Authorized domains**. Firebase no acepta comodines (`*`): cada dominio se registra sin `http://`, sin puerto y sin ruta.

### 4.3 Firestore

- Crear la base de datos en modo producción.
- Desplegar `firestore.rules` y, si se usan consultas compuestas, `firestore.indexes.json`:

  ```powershell
  firebase deploy --only firestore:indexes
  ```

### 4.4 Firebase Storage

- Avatar y portafolio: `users/{uid}/public/...` (lectura pública).
- Documento y selfie: `users/{uid}/private/verificacion/...` (dueño y administrador).
- Imágenes JPG/PNG hasta **5 MB**; video MP4/WebM/MOV hasta **50 MB**.
- Las imágenes se comprimen en el navegador antes de subirse.
- En modo demo se guarda un Data URL; el video local se limita a **4 MB**. En modo Firebase, si Storage falla, la imagen comprimida se conserva como Data URL, pero el video exige Storage o un enlace externo.

### 4.5 Modo de datos

| Situación | Comportamiento |
| --- | --- |
| Firestore responde correctamente | Se usan datos reales de Firestore |
| Firestore no disponible o sin permisos | Se activa el modo demo con `js/data/seed.js` |
| `?emulator=1` en localhost | Usa Auth/Firestore/Storage en `127.0.0.1` |
| `?emulator=0` | Vuelve al proyecto Firebase real |
| Sesión demo | Se guarda en `tuoficio_session_uid` |
| Base demo | Se guarda en `tuoficio_db_v1` |

### 4.6 Emulador local

```powershell
npm install
npm run emulators        # terminal 1
npm run seed:emulator    # terminal 2
python -m http.server 8123 --bind 127.0.0.1  # terminal 3
```

Abre `http://127.0.0.1:8123/app.html?emulator=1`. El emulador carga las reglas del repositorio y permite probar login, escrituras, Storage y bloqueos de seguridad sin tocar producción. La UI queda en `http://127.0.0.1:4000`.

---

## 5. Flujos de prueba sugeridos

1. **Público:** abre `buscar.html`, filtra por `Chapinero` y radio `5 km`; deben aparecer Carlos, Lucía y Julián con distancia. Cambia a vista Mapa.
2. **Perfil:** abre `perfil.html?id=w-carlos`; verifica badge, 4.7 de calificación, 3 reseñas, tarifas y 2 proyectos de portafolio.
3. **Empleador:** entra como `ana@demo.tuoficio.co` → solicita cotización directa a Carlos con fecha, hora, dirección y presupuesto.
4. **Chatbot:** como Ana, abre el chatbot y escribe **“Publicar solicitud”**; responde oficio, descripción, fecha, hora, dirección, zona, presupuesto y duración. La solicitud se crea y se notifica a los técnicos.
5. **Favoritos:** guarda a Carlos en favoritos; Carlos recibe una notificación.
6. **Trabajador:** entra como `carlos@demo.tuoficio.co` → revisa notificaciones, cambia disponibilidad, agrega un proyecto al portafolio y consulta “Reseñas recibidas”.
7. **Verificación:** como Carlos, envía documento + selfie; como admin, apruébala y comprueba el badge.
8. **Reseña:** como empleador, entra al trabajo `j-hist` (Finalizado) y crea una reseña; el botón solo aparece si no existe una previa.
9. **Reporte:** en un trabajo activo o dentro de las 24 h posteriores a finalizar, crea un reporte como cliente o trabajador.
10. **Administrador:** entra con `admin1@chambaya.com` → revisa verificaciones, reportes y usuarios; aplica una advertencia.
11. **Avisos del navegador:** Configuración → “Activar”; el navegador pedirá permiso. El push real con la pestaña cerrada no está implementado.
12. **Google:** prueba “Continuar con Google” cuando el proveedor esté habilitado en Firebase y el dominio autorizado.

### Resultados de la última corrida

Se ejecutaron los flujos en modo demostración local el 25 de octubre de 2026 y con Firebase Emulator Suite el 26 de octubre de 2026. Resultado: **13 HU cumplen**, **4 cumplen con limitación** (video pesado del portafolio, notificaciones push/correo, despliegue de reglas al proyecto real y validación institucional) y **1 está bloqueada** (Google Login real). El detalle, los IDs, la corrida del emulador y las pruebas no ejecutadas están en [docs/PLAN_PRUEBAS.md](docs/PLAN_PRUEBAS.md).

---

## 6. Decisiones técnicas

- **SPA única:** `app.html` concentra la experiencia autenticada; las vistas se cargan desde `js/pages/` y se navega sin recargar.
- **Capa de datos dual:** `DatabaseService` intenta Firestore y cae a `LocalStore` si no hay permisos o conexión.
- **RBAC:** el rol (`cliente`, `trabajador`, `admin`) define la navegación y las acciones disponibles; las reglas de Firestore refuerzan los permisos.
- **Búsqueda por radio:** cálculo Haversine sobre latitud/longitud de la zona seleccionada (5 km por defecto).
- **Reseñas verificadas:** solo se permiten sobre trabajos finalizados y sin reseña previa.
- **Reportes con ventana:** solo durante un trabajo activo o dentro de las 24 h posteriores a su finalización.
- **Verificación:** el técnico no puede autoaprobarse; el badge solo lo otorga un administrador.
- **Asistente de solicitud:** el chatbot recoge los datos mínimos y crea la cotización; no es solo un texto de ayuda.
- **Notificaciones:** in-app inmediatas y aviso nativo opcional del navegador. El push con la pestaña cerrada requiere backend.
- **Fechas:** las fechas `YYYY-MM-DD` se interpretan como fecha local para evitar el desfase de un día.
- **Compatibilidad:** las páginas antiguas redirigen a las nuevas rutas para conservar enlaces.

---

## 7. Limitaciones conocidas

- El proyecto `tuoficiocol` ya tiene Firestore creado y reglas activas, pero faltan habilitar Authentication, crear el bucket de Storage y ejecutar `npm run seed` para cargar los datos demo. La CLI aún no tiene sesión (`firebase login`) ni cuenta de servicio en este equipo. El emulador sí fue probado con las reglas del repositorio.
- El inicio de sesión con Google requiere habilitar el proveedor y los dominios autorizados en Firebase. El botón existe, pero el flujo real no se ha probado.
- En modo demo los datos son locales al navegador y no se sincronizan entre dispositivos.
- No se incluyen Cloud Functions; el push con la pestaña cerrada y el correo automático requieren backend/FCM o un proveedor de correo con credenciales.
- La validación con MinTrabajo/Saber Hacer Vale es manual: no hay API pública documentada.
- Los mapas usan OpenStreetMap/Leaflet y no requieren API key.
- No se pudo verificar un despliegue público: el repositorio no tenía Pages habilitado y no hay credenciales de hosting en este entorno.
- El informe de la Guía 6 menciona MySQL/JWT/Google Maps; la implementación real es Firestore/Firebase Auth/Leaflet. Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

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
