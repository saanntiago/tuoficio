# Matriz de trazabilidad RF01–RF15 / HU-01–HU-18

Estados usados:

- **Cumple:** implementado y verificado en la corrida funcional local o con Firebase Emulator Suite.
- **Cumple con limitación:** implementado, pero depende de configuración externa o solo se verificó parcialmente.
- **Bloqueado externo:** el código existe, pero no se puede probar sin credenciales/servicios.

## 1. Requerimientos funcionales

| RF | Implementación | Evidencia / observación | Estado |
| --- | --- | --- | --- |
| RF01 | Registro por rol; el trabajador ingresa teléfono/WhatsApp y documento; el cliente ingresa nombre, correo, contraseña, zona y preferencias de búsqueda. | Registro local de trabajador con teléfono/documento. Emulador: alta de `qa.rol.20261026@demo.tuoficio.co` como cliente y cambio posterior a trabajador con hoja de vida creada. | Cumple |
| RF02 | Perfil editable: datos, zona, cobertura, contacto visible, certificados/soportes, tarifas. | `WorkerService.updateProfile`, `ProfilePage`; cambio de tarifas persistido en la corrida. | Cumple |
| RF03 | Catálogo con filtros por oficio, zona, radio, calificación, disponibilidad y verificación; orden por cercanía, calificación, precio y experiencia. | Chapinero + 5 km devolvió Carlos, Lucía y Julián. | Cumple |
| RF04 | Verificación con perfil 100% completo + documento de identidad + selfie → `Pendiente` → aprobación/rechazo admin → badge. La validación MinTrabajo/Saber Hacer Vale es manual. | Emulador: solicitud `0mUdzdjRAdBNSCiuhWVa` creada por Lucía, autoaprobación bloqueada y aprobación admin aplicada (`badgeVerified = true`). Reglas: perfil incompleto y solicitud sin selfie bloqueadas con `403`; perfil completo permitida. No hay API pública de MinTrabajo. | Cumple con limitación |
| RF05 | Chatbot para HV profesional/informal, recomendaciones y asistente que crea una solicitud paso a paso. | HV informal guardada con oficio, experiencia, zona y habilidades; solicitud creada desde el chatbot. | Cumple |
| RF06 | Notificaciones in-app, aviso nativo del navegador y notificación al trabajador cuando guardan su perfil en favoritos. Push con pestaña cerrada y correo no implementados. | Notificación de favorito y de solicitud directa verificadas. `Notification.permission` estaba denegado en el navegador de prueba. | Cumple con limitación |
| RF07 | Portafolio antes/después con JPG/PNG ≤ 5 MB y video; validación de tipo y peso. | Emulador: imagen real subida a `users/w-lucia/public/portafolio/...`, ítem agregado y eliminado junto con el archivo. La subida de video pesado no se ejecutó. | Cumple con limitación |
| RF08 | Mapa Leaflet/OpenStreetMap con zona, radio y técnicos; marcadores por disponibilidad. | `buscar.html?...&view=map` renderizó Leaflet, círculo de radio y 3 técnicos. | Cumple |
| RF09 | RBAC por rol en menú y acciones; reglas Firestore incluidas. | Menús distintos para cliente, trabajador y admin. En el emulador se bloquearon el cambio de rol a admin y la autoasignación de insignia; el despliegue al proyecto real sigue pendiente. | Cumple con limitación |
| RF10 | Disponibilidad `Disponible`, `Medio tiempo`, `Ocupado`, persistida y visible. | Cambio a `Medio tiempo` persistido. | Cumple |
| RF11 | Reseña de 1 a 5 solo para trabajo finalizado, sin reseña previa. | Emulador: reseña `OF3J7tD4bAsywpeTZ4Mo` creada y promedio recalculado; la segunda reseña fue rechazada por reglas. | Cumple |
| RF12 | Tarifas de visita diagnóstica, hora base y nota; visibles en perfil público. | Tarifas actualizadas y recuperadas desde el perfil del trabajador. | Cumple |
| RF13 | Reportes de cliente y trabajador durante el trabajo o dentro de 24 h; panel admin con advertencia, suspensión o baneo. | Emulador: reporte `Q8MGlcmveME7xi2RZ4ZS` creado por Ana y resuelto por Admin Central; reportes previos de cliente y trabajador en modo local. | Cumple |
| RF14 | Enlace público de perfil y WhatsApp con mensaje predeterminado. | `whatsappLink()` generó `https://wa.me/573105550101?text=...`. | Cumple |
| RF15 | Cotización del cliente con descripción, fecha, hora, lugar, presupuesto, urgencia y duración; notifica al trabajador. | Sugerencia directa y notificación creadas; el asistente también creó una cotización. | Cumple |

## 2. Historias de usuario

| HU | Título | RF | Implementación / evidencia | Estado |
| --- | --- | --- | --- | --- |
| HU-01 | Registro por rol y datos técnicos | RF01, RF02 | Registro de trabajador con oficio, zona, experiencia, teléfono y documento. | Cumple |
| HU-02 | HV digital generada por chatbot | RF05 | Flujo profesional/informal corregido y probado; guarda la HV. | Cumple |
| HU-03 | Cambio de disponibilidad | RF10 | Estado actualizado en el perfil. | Cumple |
| HU-04 | Portafolio antes/después | RF07 | Imagen real subida a Storage, ítem agregado/eliminado y archivo borrado. Video pesado no ejecutado. | Cumple con limitación |
| HU-05 | Insignia de perfil verificado | RF04 | Emulador: solicitud pendiente → autoaprobación bloqueada → aprobación admin → badge. | Cumple |
| HU-06 | Búsqueda con mapa y radio | RF03, RF08 | 5 km desde Chapinero con 3 técnicos y mapa Leaflet. | Cumple |
| HU-07 | Asistencia en creación de solicitud | RF05 | Asistente del chatbot creó la solicitud y notificó a 2 técnicos. | Cumple |
| HU-08 | Tarifas orientativas | RF12 | Visita diagnóstica, hora base y nota en perfil. | Cumple |
| HU-09 | Envío de cotización directa | RF15 | Solicitud directa con fecha/hora/dirección/presupuesto + notificación inmediata. | Cumple |
| HU-10 | Reseña y 1–5 estrellas | RF11 | Solo tras trabajo finalizado; reglas bloquearon la segunda reseña del mismo trabajo. | Cumple |
| HU-11 | Notificaciones push y correo | RF06 | In-app y aviso nativo implementados; push real/correo requieren backend. | Cumple con limitación |
| HU-12 | Compartir perfil en WhatsApp | RF14 | Enlace público y mensaje predeterminado. | Cumple |
| HU-13 | Vistas diferenciadas por rol | RF09 | Menús y acciones por rol; reglas del emulador bloquearon escalamiento. El despliegue real sigue pendiente. | Cumple con limitación |
| HU-14 | Módulo de reportes y sanciones | RF13 | Panel admin resuelve reportes y aplica advertencia/suspensión/baneo. Reporte QA resuelto en el emulador. | Cumple |
| HU-15 | Aprobación de credenciales | RF04 | Aprobación de documento + selfie en emulador; validación institucional manual. | Cumple con limitación |
| HU-16 | Reportar trabajadores | RF13 | Cliente reportó a un trabajador dentro de las 24 h. | Cumple |
| HU-17 | Reportar clientes | RF13 | Trabajador reportó a un cliente dentro de las 24 h. | Cumple |
| HU-18 | Verificación mediante login de Google | RF04 | Botón y código de Google implementados; proveedor/dominio no habilitados. | Bloqueado externo |

## 3. Cobertura de criterios de aceptación

| Criterio | Dónde se cumple |
| --- | --- |
| Campos requeridos de oficio y zona | Registro y perfil del trabajador. |
| Chatbot entrega borrador final | `Chatbot._cvStep()` guarda la HV al finalizar. |
| Switch de disponibilidad en vivo | `AvailabilityPage` + `WorkerService.setAvailability`. |
| Imágenes JPG/PNG hasta 5 MB | `PortfolioPage.preview()` y validación de `CHAMBAYA.LIMITS.IMAGE_MB`. |
| Validación de certificación por admin | `VerificationService.approve()` y panel de verificaciones. |
| Filtro por radio funcional | `WorkerService.nearby()` con Haversine. |
| Estructuración interactiva de la solicitud | `Chatbot._quoteStep()` y formulario de cotización. |
| Desglose de visita y mano de obra | Perfil público y `tarifas`. |
| Notificación inmediata al trabajador | `WorkersPage.submitRequest()` y `QuotesPage.submitQuote()`. |
| Reseña solo tras servicio completado | `JobService.canReview()`. |
| Alertas en menos de 5 segundos | Notificación in-app inmediata; push/correo no implementados. |
| Link directo con mensaje | `publicProfileUrl()` + `whatsappLink()`. |
| Menú personalizado y bloqueo de acciones ajenas | `UIManager._renderSidebar()` + reglas Firestore. |
| Panel de bloqueo/baneo | `ReportService.sanction()`. |
| Validación cruzada institucional | Manual, sin API pública. |
| Reportes dentro de 24 h | `JobService.canReport()`. |
| Login con Google | Código listo; falta habilitar proveedor y dominio. |

## 4. Pruebas con Firebase Emulator Suite

La segunda corrida se hizo con **Firebase Auth, Firestore y Storage emulados** y las reglas del repositorio. Se verificaron login, escrituras, reseñas, reportes, verificación, archivos públicos/privados y bloqueos de escalamiento. El proyecto real `tuoficiocol` ya tiene Firestore y reglas activas, pero seguía sin datos sembrados y sin Authentication/Storage configurados porque falta sesión/cuenta de servicio.

## 5. Nota de honestidad académica

La corrida funcional se hizo en **modo demostración local y con Firebase Emulator Suite**, no contra el proyecto Firebase real. No se inventaron resultados de Jira/Zephyr ni capturas de Google Login. Las pruebas y sus límites están en [PLAN_PRUEBAS.md](PLAN_PRUEBAS.md).
