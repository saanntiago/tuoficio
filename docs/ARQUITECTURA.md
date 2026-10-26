# Arquitectura real de TuOficioCol

## 1. Resumen

TuOficioCol es una aplicación web estática, sin build, escrita con HTML, CSS y JavaScript vanilla. La autenticación y la persistencia pueden funcionar de dos maneras:

1. **Firebase:** Firebase Auth (correo/contraseña y Google) + Firestore + Firebase Storage opcional.
2. **Modo demostración local:** si Firestore no responde o las reglas no están desplegadas, los datos se guardan en `localStorage` y la app muestra un aviso.

La interfaz autenticada está consolidada en `app.html`. Las páginas públicas son independientes y comparten `js/public.js`.

## 2. Componentes

```text
Navegador
├── index.html / buscar.html / perfil.html
│   └── js/public.js ──► datos demo o Firestore (solo lectura pública)
└── app.html
    ├── js/core/App.js            arranque, detección de backend y sesión
    ├── js/ui/UIManager.js        navegación, modales, notificaciones, registro
    ├── js/chatbot/Chatbot.js     HV, recomendaciones y asistente de solicitud
    ├── js/pages/*.js             vistas de cliente, trabajador y admin
    └── js/services/
        ├── DatabaseService.js    Firestore + fallback localStorage
        ├── StorageService.js     Cloud Storage + compresión/fallback
        ├── LocalStore.js         persistencia demo
        ├── AuthService.js        registro, login, Google, perfiles
        └── DomainServices.js     reglas de negocio
```

## 3. Flujo de arranque

1. `app.html` carga los scripts en orden.
2. `DatabaseService.probe()` intenta una lectura mínima en Firestore.
3. Si funciona, `App.mode = 'firebase'`; si falla, `App.mode = 'local'`.
4. `AuthService` restaura la sesión demo (`tuoficio_session_uid`) o la sesión de Firebase.
5. `UIManager.mount()` construye la interfaz y `showApp(user)` decide el menú según el rol.
6. Las páginas se cargan bajo demanda en `#pageContent`.

En modo local, `LocalStore` siembra `js/data/seed.js` la primera vez. La base demo se guarda completa en `tuoficio_db_v1`.

## 4. Colecciones principales

| Colección | Contenido |
| --- | --- |
| `usuarios` | Cuenta, rol, zona, teléfono, documento, preferencias, sanción. |
| `trabajadores` | Perfil público, oficio, experiencia, tarifas, disponibilidad, portafolio, badge. |
| `resenas` | Calificación de 1 a 5 asociada a un trabajo finalizado. |
| `cotizaciones` | Solicitudes publicadas por clientes. |
| `postulaciones` | Ofertas de trabajadores a cotizaciones. |
| `sugerencias` | Solicitudes directas de un cliente a un trabajador. |
| `trabajos` | Contrato y estado: Pendiente, Aceptado, En curso, Finalizado, Cancelado. |
| `verificaciones` | Documento, selfie, estado y revisión del administrador. |
| `reportes` | Reportes de cliente o trabajador y su resolución. |
| `notificaciones` | Avisos por usuario. |
| `favoritos` | Técnicos guardados por cada cliente. |
| `conversaciones` / `mensajes` | Chat interno. |
| `hojasDeVida` | HV creadas desde el chatbot, si aplica. |

## 5. Reglas de negocio implementadas

- **Búsqueda geolocalizada:** distancia Haversine desde el centro de la localidad; radio configurable (5 km por defecto).
- **Reseñas verificadas:** `JobService.canReview()` exige que el trabajo esté `Finalizado`, que el usuario sea el cliente y que no exista `resenaId`.
- **Reportes con ventana:** `JobService.canReport()` permite reportar durante el trabajo o dentro de las 24 horas posteriores a `finalizadoEn`.
- **Verificación:** el trabajador crea una solicitud con documento y selfie; solo un administrador puede aprobarla. El badge se escribe en `trabajadores.badgeVerified`.
- **Disponibilidad:** `Disponible`, `Medio tiempo` u `Ocupado`; afecta el orden y los filtros.
- **Cotización directa:** crea una sugerencia con fecha, hora, dirección, zona y presupuesto, y notifica al trabajador.
- **Asistente de solicitud:** el chatbot recoge oficio, descripción, fecha, hora, dirección, zona, presupuesto y duración; luego crea la cotización y notifica a los técnicos del oficio.
- **Roles:** cliente, trabajador y administrador tienen menús y acciones distintas. Las reglas de Firestore refuerzan los permisos cuando están desplegadas.

## 6. Archivos y Firebase Storage

`StorageService` centraliza la carga de archivos:

- **Avatar y portafolio:** `users/{uid}/public/avatar/...` y `users/{uid}/public/portafolio/...`. Son de lectura pública para el directorio y el perfil público.
- **Verificación:** `users/{uid}/private/verificacion/...`. Solo el dueño y un administrador pueden leerlos.
- Las imágenes JPG/PNG se comprimen en el navegador antes de subirse; el límite es 5 MB. Los videos MP4/WebM/MOV se limitan a 50 MB.
- En modo local se guarda un Data URL. En modo Firebase, si Storage no está habilitado, la imagen comprimida se conserva como Data URL para no interrumpir el flujo; el video exige Storage o un enlace externo.
- Al eliminar un proyecto del portafolio también se intentan borrar sus archivos de Storage.

## 7. Seguridad

- `firestore.rules` restringe escrituras por propietario/rol. Un usuario no puede cambiar su propio `rol` a administrador; tampoco puede modificar `activo`, `sancion` o `verificado`. Un trabajador no puede escribir `badgeVerified: true` ni aprobar su verificación.
- La solicitud de verificación solo puede pasar a `en_revision` con `badgeVerified: false`; la aprobación queda reservada al administrador.
- El promedio de reseñas se actualiza con una regla que exige un `ultimaResenaId` real, del mismo trabajador y creado por el cliente autenticado.
- `storage.rules` separa archivos públicos y privados, limita imágenes a 5 MB y videos a 50 MB, y permite al administrador leer las verificaciones. En el emulador se comprobó que un usuario ajeno recibe `storage/unauthorized`.
- En modo local no hay seguridad de servidor: es una demostración para un solo navegador.
- Las reglas incluidas en el repositorio **no se han desplegado** en el proyecto real porque no hay sesión de Firebase ni cuenta de servicio. El emulador permite probarlas localmente con `npm run emulators`; la corrida del 26 de octubre de 2026 está en [PLAN_PRUEBAS.md](PLAN_PRUEBAS.md).

## 8. Diferencias frente al informe de la Guía 6

El informe de laboratorio describe MySQL, un backend con JWT y Google Maps. El código entregado no usa esa arquitectura:

| Informe | Implementación real | Motivo |
| --- | --- | --- |
| MySQL | Firestore | El proyecto es estático y no hay servidor/MySQL en el entorno de despliegue. |
| Backend propio con JWT | Firebase Auth + reglas de Firestore | Evita mantener un servidor y credenciales adicionales. |
| Google Maps | Leaflet + OpenStreetMap | No se dispone de `GOOGLE_MAPS_API_KEY`; Leaflet no requiere clave. |
| Push/correo | Notificaciones in-app y aviso nativo del navegador | El push real y el correo necesitan backend/FCM o un proveedor con credenciales. |

Esta diferencia debe explicarse en la sustentación. No se debe afirmar que el proyecto usa MySQL, JWT propio ni Google Maps.

## 9. Limitaciones externas

- Firebase CLI, Node y npm ya están instalados en el equipo de prueba; `gh` y MySQL no.
- No hay sesión de Firebase ni cuenta de servicio para desplegar reglas, sembrar datos o publicar Hosting.
- No hay proveedor de Google habilitado ni dominio autorizado para probar HU-18.
- No hay API pública de MinTrabajo/Saber Hacer Vale.
- No hay credenciales de Jira/Zephyr para cargar evidencias formales.
- El repositorio no tiene Pages habilitado y no se pudo verificar un despliegue público.
