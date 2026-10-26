# Plan y resultados de pruebas

## 1. Objetivo

Comprobar los flujos funcionales de las HU-01 a HU-18 y de los RF01 a RF15 sobre la aplicación real, sin inventar resultados ni evidencias externas.

## 2. Alcance

- **Incluido:** registro, perfiles, búsqueda por zona/radio, mapa Leaflet, disponibilidad, portafolio, verificación, chatbot de HV, asistente de solicitud, tarifas, cotización directa, notificaciones in-app, favoritos, reseñas, reportes, sanciones, roles, WhatsApp y enlaces públicos.
- **Probado con emulador:** Firebase Auth, Firestore y Storage con reglas reales del repositorio, incluidas escrituras, lectura de archivos privados y bloqueo de escalamiento de privilegios.
- **Fuera de alcance o bloqueado:** proyecto Firebase real (reglas sin desplegar), Google Login real (proveedor sin habilitar), push con pestaña cerrada, correo automático, API de MinTrabajo/Saber Hacer Vale, Jira/Zephyr y despliegue público.

## 3. Ambiente de ejecución

| Elemento | Valor |
| --- | --- |
| Fecha | 25 de octubre de 2026, hora local de Bogotá (26 de octubre UTC) |
| Sistema | Windows, navegador Chromium controlado por OpenCode |
| Servidor | `python -m http.server 8124 --bind 127.0.0.1` |
| URL | `http://127.0.0.1:8124/app.html` y páginas públicas |
| Backend | Modo demostración local (`localStorage`) |
| Base | `tuoficio_db_v1`, restablecida al finalizar |
| Datos | Seed de 10 técnicos, 3 clientes, 14 reseñas, trabajos y reportes demo |

La base local se restableció después de la corrida. Los IDs de evidencia que aparecen abajo fueron generados durante la ejecución y ya no existen en la base actual.

### 3.1 Corrida adicional con Firebase Emulator Suite

| Elemento | Valor |
| --- | --- |
| Fecha | 26 de octubre de 2026 |
| Servidor web | `python -m http.server 8123 --bind 127.0.0.1` |
| URL | `http://127.0.0.1:8123/app.html?emulator=1` |
| Auth | Firebase Auth Emulator `127.0.0.1:9099` |
| Firestore | Emulador `127.0.0.1:8080` con `firestore.rules` |
| Storage | Emulador `127.0.0.1:9199` con `storage.rules` |
| Datos | `npm run seed:emulator` (17 cuentas Auth y 10 colecciones) |
| Cuentas | Ana (cliente), Lucía (trabajadora), Admin Central (admin) |

Los datos del emulador son efímeros: se pierden al detener el proceso. Los IDs de esta corrida se conservan solo como registro de la ejecución. Captura del panel admin: `docs/evidencias/emulador-admin-verificaciones.png`.

## 4. Resumen de resultados

| Resultado | Cantidad | HU |
| --- | --- | --- |
| Cumple | 13 | HU-01, HU-02, HU-03, HU-05, HU-06, HU-07, HU-08, HU-09, HU-10, HU-12, HU-14, HU-16, HU-17 |
| Cumple con limitación | 4 | HU-04, HU-11, HU-13, HU-15 |
| Bloqueado externo | 1 | HU-18 |

### 4.1 Resultados de la corrida con emulador

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| Login con Firebase Auth emulado | **Pasa** | Ana, Lucía y Admin Central iniciaron sesión con sus UID demo. |
| Lectura y escritura de Firestore | **Pasa** | Cotización `mOFsbGXDgQEOeyhcXp4x` creada y recuperada. |
| Actualización de perfil propio | **Pasa** | Cambio de teléfono de `c-ana` con `updatedAt`. |
| Registro nuevo y cambio de rol | **Pasa** | Cuenta `qa.rol.20261026@demo.tuoficio.co` creada como cliente; `completeRole('trabajador')` actualizó `rol` y creó su hoja de vida. |
| Reseña solo tras trabajo finalizado | **Pasa** | Reseña `OF3J7tD4bAsywpeTZ4Mo` sobre `j-hist`; promedio de Carlos actualizado a 4.75 y `totalResenas: 4`. |
| Bloqueo de segunda reseña | **Pasa** | Firestore respondió `permission-denied`; el trabajo ya tenía `resenaId`. |
| Validación de calificación | **Pasa** | Un `rating: 9` fue rechazado; `rating: 5` sobre un trabajo finalizado se aceptó. |
| Reporte de cliente y resolución admin | **Pasa** | Reporte `Q8MGlcmveME7xi2RZ4ZS` creado y resuelto por Admin Central. |
| Verificación con Storage privado | **Pasa** | Solicitud `0mUdzdjRAdBNSCiuhWVa`; no-admin no pudo aprobarla. |
| Aprobación de verificación por admin | **Pasa** | `w-lucia` quedó con `badgeVerified: true` y `verificado: true`. |
| Storage público (avatar/portafolio) | **Pasa** | Archivos en `users/c-ana/public/avatar/...` y `users/w-lucia/public/portafolio/...`; lectura HTTP 200 y borrado correcto. |
| Storage privado (documento/selfie) | **Pasa** | Admin pudo obtener la URL; Lucía (ajena) recibió `storage/unauthorized`. |
| Escalamiento de rol a admin | **Bloqueado** | `permission-denied`: las reglas no permiten que un cliente cambie `rol` a `admin`; sí puede pasar entre `cliente` y `trabajador`. |
| Autoasignación de insignia | **Bloqueado** | `permission-denied`: el trabajador no puede escribir `badgeVerified: true` ni `verificacionEstado: aprobado`. |
| Proyecto Firebase real | **No ejecutado** | Sin sesión de Firebase ni cuenta de servicio. |

## 5. Casos ejecutados

### HU-01 / RF01–RF02 — Registro y perfil

- **Pasos:** abrir registro, elegir “Trabajador”, completar nombre, correo, contraseña, teléfono, documento, zona, oficio y experiencia; enviar.
- **Esperado:** cuenta creada, sesión iniciada y perfil de trabajador con esos datos.
- **Observado:** cuenta `qa.worker...@demo.tuoficio.co` creada; usuario con `telefono`, `whatsapp` y `documento`; trabajador con oficio, zona, experiencia y nombre. Al cambiar a “Empleador”, el campo documento se oculta.
- **Resultado:** **Cumple**.
- **Evidencia:** usuario `u-mvoqou1s`.

### HU-02 / RF05 — HV digital con chatbot

- **Pasos:** iniciar “Armar HV informal”; responder oficio, experiencia, zona, habilidades y descripción.
- **Esperado:** chatbot guarda la HV y confirma.
- **Observado:** se corrigió la detección de “informal” (antes “formal” se confundía con “informal”); la HV se guardó con `tipoHojaVida: informal`, oficio Electricidad, 6 años, zona Chapinero y habilidades.
- **Resultado:** **Cumple**.
- **Evidencia:** perfil `w-carlos` actualizado en la corrida.

### HU-03 / RF10 — Disponibilidad

- **Pasos:** cambiar disponibilidad a “Medio tiempo”.
- **Esperado:** estado persistido y visible.
- **Observado:** `disponibilidad: "Medio tiempo"` recuperada desde el servicio.
- **Resultado:** **Cumple**.

### HU-04 / RF07 — Portafolio antes/después

- **Pasos:** agregar un ítem de portafolio con imagen antes/después y descripción.
- **Esperado:** el ítem aparece en el perfil.
- **Observado:** el portafolio pasó de 2 a 3 ítems. La validación de JPG/PNG ≤ 5 MB y video ≤ 50 MB está en `PortfolioPage`; en modo local el video se limita a 4 MB.
- **Limitación:** no se cargó un archivo real desde el selector en esta corrida local; la prueba fue a nivel de servicio. En la corrida del emulador sí se subió una imagen real a Storage, se agregó/eliminó el ítem y se borró el archivo.
- **Resultado:** **Cumple con limitación** (por el video pesado, no ejecutado).

### HU-05 / HU-15 / RF04 — Verificación y aprobación

- **Pasos:** el trabajador completa su perfil al 100%, envía documento + selfie; el administrador revisa y aprueba.
- **Esperado:** sin perfil completo no se puede enviar la solicitud; con el perfil completo, estado `Pendiente` → `Aprobado`, badge visible.
- **Observado:** solicitud `ver-mvoqtm7n-w0b3x` creada con estado `Pendiente`; el admin la aprobó y el trabajador quedó con `badgeVerified: true` y `verificacionEstado: aprobado`. En la validación de reglas del 27 de octubre de 2026, un perfil incompleto y una solicitud sin selfie devolvieron `403`; el perfil completo permitió crear la solicitud (`200`).
- **Limitación:** no hay integración con MinTrabajo/Saber Hacer Vale; la validación institucional es manual. En el emulador se repitió el flujo con documento/selfie privados y un intento de autoaprobación bloqueado.
- **Resultado:** **Cumple con limitación**.

### HU-06 / RF03–RF08 — Búsqueda por radio y mapa

- **Pasos:** abrir `buscar.html?zone=Chapinero&radius=5&view=map`.
- **Esperado:** técnicos dentro de 5 km y mapa interactivo.
- **Observado:** 3 técnicos: Carlos Ramírez (0.0 km), Lucía Torres (2.5 km) y Julián Gómez (3.2 km). Leaflet renderizó el mapa, el círculo de radio y los marcadores.
- **Resultado:** **Cumple**.

### HU-07 / RF05 — Asistente de solicitud

- **Pasos:** como cliente, escribir “Publicar solicitud” y responder oficio, descripción, fecha, hora, dirección, zona, presupuesto y duración.
- **Esperado:** cotización creada y técnicos notificados.
- **Observado:** cotización `cot-mvoqt70-qzn5x` creada con fecha, hora, dirección, zona y presupuesto; se notificó a 2 técnicos de Plomería.
- **Resultado:** **Cumple**.

### HU-08 / RF12 — Tarifas orientativas

- **Pasos:** actualizar visita diagnóstica, hora base y nota.
- **Esperado:** tarifas guardadas y visibles en el perfil.
- **Observado:** `{ visitaDiagnostica: 50000, horaBase: 70000, nota: "Prueba de tarifas" }` recuperadas.
- **Resultado:** **Cumple**.

### HU-09 / RF15 — Cotización directa

- **Pasos:** abrir perfil de Carlos, “Solicitar cotización”, completar servicio, descripción, fecha, hora, dirección, zona y presupuesto.
- **Esperado:** sugerencia creada y notificación inmediata al trabajador.
- **Observado:** sugerencia `sug-mvoqtg1e-18b4r` y notificación `not-mvoqtg1g-hvc0x` con fecha, hora y dirección.
- **Resultado:** **Cumple**.

### HU-10 / RF11 — Reseña

- **Pasos:** reseñar el trabajo finalizado `j-hist` y marcar el trabajo como reseñado.
- **Esperado:** solo se permite una vez y únicamente si está finalizado.
- **Observado:** `canReview` era `true` antes y `false` después; reseña `res-mvoqtg1i-7qjkh` creada y promedio recalculado.
- **Resultado:** **Cumple**.

### HU-11 / RF06 — Notificaciones

- **Pasos:** guardar un técnico en favoritos y enviar una solicitud directa; revisar notificaciones del trabajador.
- **Esperado:** aviso al trabajador.
- **Observado:** notificación de favorito `not-mvoqtg1h-ilod6` y notificación de solicitud directa `not-mvoqtg1g-hvc0x`. Se añadió un botón “Activar avisos del navegador” y el uso de `Notification` cuando hay permiso.
- **Limitación:** el navegador de prueba tenía `Notification.permission = denied`; no se pudo verificar el aviso nativo. El push con pestaña cerrada y el correo no están implementados.
- **Resultado:** **Cumple con limitación**.

### HU-12 / RF14 — Compartir perfil

- **Pasos:** generar enlace público y enlace de WhatsApp.
- **Esperado:** URL directa con mensaje.
- **Observado:** `publicProfileUrl('w-carlos')` y `https://wa.me/573105550101?text=Hola%2C%20prueba`.
- **Resultado:** **Cumple**.

### HU-13 / RF09 — Roles

- **Pasos:** iniciar como cliente, trabajador y administrador y revisar menús.
- **Esperado:** menú distinto y acciones restringidas.
- **Observado:** cliente vio Inicio/Directorio/Mapa/Solicitudes/Trabajos/Favoritos; trabajador vio Mi panel/Perfil/Portafolio/Disponibilidad/Ofertas/Trabajos; admin vio Usuarios/Verificaciones/Reportes/Trabajos/Zonas.
- **Limitación:** en la corrida local las reglas de Firestore no estaban desplegadas; en el emulador sí se probaron y bloquearon el escalamiento. El despliegue al proyecto real sigue pendiente.
- **Resultado:** **Cumple con limitación**.

### HU-14 / RF13 — Reportes y sanción

- **Pasos:** el cliente reporta al trabajador; el admin resuelve y aplica advertencia.
- **Esperado:** reporte en revisión y sanción registrada.
- **Observado:** reporte `rep-mvoqtg1j-7nvgt` creado; admin lo marcó `Resuelto`, con observación, y guardó `sancion: { tipo: "advertencia" }` en el usuario.
- **Resultado:** **Cumple**.

### HU-16 / RF13 — Reportar trabajador

- **Pasos:** cliente reporta el trabajo `j-hist` dentro de las 24 h.
- **Esperado:** reporte creado.
- **Observado:** `canReport = true`; reporte `rep-mvoqtg1j-7nvgt`.
- **Resultado:** **Cumple**.

### HU-17 / RF13 — Reportar cliente

- **Pasos:** trabajador reporta a la clienta del trabajo `j-hist` dentro de las 24 h.
- **Esperado:** reporte creado.
- **Observado:** `canReport = true`; reporte `rep-mvoqtm7n-d66fc`.
- **Resultado:** **Cumple**.

### HU-18 / RF04 — Google Login

- **Pasos previstos:** pulsar “Continuar con Google”, autenticarse, aceptar nombre/correo y llegar al panel.
- **Estado:** el botón y `AuthService.loginWithGoogle()` existen, pero el proveedor de Google no está habilitado en Firebase y el dominio no está autorizado.
- **Resultado:** **Bloqueado externo**. No se probó el flujo real; no se debe presentar como exitoso.

### 5.1 Detalle de la corrida con emulador

1. **Arranque:** `npm run emulators` levantó Auth, Firestore, Storage y la UI. La app se abrió con `?emulator=1`; `DatabaseService.probe()` detectó `mode: firebase`, host `127.0.0.1:8080` y Storage disponible.
2. **Seed:** `npm run seed:emulator` creó 17 cuentas de Auth y 10 colecciones de Firestore. Los administradores se crearon con los UID `admin1`, `admin2` y `admin3`.
3. **Login:** Ana entró con correo/contraseña; el panel de empleador cargó 7 técnicos disponibles, 1 solicitud activa, 1 trabajo histórico y 2 favoritos desde Firestore.
4. **Escritura de cotización:** se creó `mOFsbGXDgQEOeyhcXp4x` con `clientId: c-ana`, estado `Activa` y `createdAt` del servidor. La lectura posterior devolvió el documento.
5. **Perfil:** se actualizó el teléfono de Ana y se comprobó `updatedAt`. El intento de cambiar `rol` a `admin` fue rechazado por reglas.
6. **Reseña:** se publicó `OF3J7tD4bAsywpeTZ4Mo` para `j-hist`; Carlos quedó con `calificacionPromedio: 4.75`, `totalResenas: 4` y `ultimaResenaId`. El trabajo recibió `resenaId`. Un segundo intento fue rechazado. También se comprobó que `rating: 9` es rechazado y `rating: 5` es aceptado.
7. **Reporte:** se creó `Q8MGlcmveME7xi2RZ4ZS` como Ana y el admin lo marcó `Resuelto` con observación. La lectura del reporte por parte de Ana fue denegada, como corresponde.
8. **Verificación:** Lucía subió documento/selfie al área privada y creó `0mUdzdjRAdBNSCiuhWVa`. Su intento de aprobarse fue denegado. Admin Central la aprobó; el perfil pasó a `aprobado` y `badgeVerified: true`.
9. **Storage:** se subieron imágenes reales generadas en canvas. Las URL públicas respondieron HTTP 200. El admin pudo obtener la URL del archivo privado de Ana; Lucía recibió `storage/unauthorized`. El ítem de portafolio de Lucía se agregó, recuperó y eliminó junto con su archivo.
10. **Persistencia:** la app se recargó con `?emulator=1&v=7`; el host de Firestore siguió en `127.0.0.1:8080` y no apareció el error de `settings()` duplicado. También se comprobó que guardar el perfil de una clienta no crea un documento vacío en `trabajadores`.
11. **Registro y rol:** se creó `qa.rol.20261026@demo.tuoficio.co` como cliente y luego `qa.rol2.20261026@demo.tuoficio.co` para repetir la prueba con el código final. `completeRole('trabajador')` cambió el rol y creó `trabajadores/{uid}` con nombre, `badgeVerified: false` y `calificacionPromedio: 0`; el intento posterior de `rol: admin` fue rechazado.

Rutas de Storage observadas:

```text
users/c-ana/public/avatar/1793027893121-9trkhu6.jpg
users/c-ana/private/verificacion/1793027893279-z26hmrn.jpg
users/w-lucia/public/portafolio/1793028213531-7d46qyr.jpg
```

## 6. Pruebas no ejecutadas

| Prueba | Motivo |
| --- | --- |
| Firestore/Storage del proyecto real y reglas desplegadas | Hay Firebase CLI instalado, pero no hay sesión ni cuenta de servicio. El emulador sí se probó. |
| Google Login real | Proveedor y dominio pendientes en Firebase Console. |
| Push con pestaña cerrada | Requiere FCM + backend o Cloud Functions. |
| Correo automático | Requiere proveedor de correo y credenciales. |
| Video real del portafolio | Se validó el código y el límite, pero no se subió un video pesado al emulador. |
| Validación MinTrabajo/Saber Hacer Vale | No existe API pública documentada. |
| Jira/Zephyr | No hay credenciales ni sesión. |

## 7. Conclusión

Los flujos académicos principales están implementados y fueron ejercitados en modo local y con Firebase Emulator Suite. La corrida del emulador confirma Auth, Firestore, Storage, reglas de propiedad y bloqueo de escalamiento de privilegios. Las brechas restantes son de integración externa o de infraestructura: despliegue del proyecto Firebase real, Google Login real, push/correo, video pesado, MinTrabajo y Jira/Zephyr. Cualquier afirmación de que esas integraciones funcionan en producción sería incorrecta.
