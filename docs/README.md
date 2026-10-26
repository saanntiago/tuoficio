# Documentación de TuOficioCol

Esta carpeta reúne la documentación técnica, la trazabilidad de requisitos y las pruebas ejecutadas sobre el proyecto.

| Documento | Para qué sirve |
| --- | --- |
| [GUIA_APERTURA.md](GUIA_APERTURA.md) | Abrir el proyecto en el PC, credenciales demo y solución de problemas. |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Arquitectura real implementada y diferencias frente al informe de laboratorio. |
| [MATRIZ_RF_HU.md](MATRIZ_RF_HU.md) | Trazabilidad RF01–RF15 y HU-01–HU-18. |
| [PLAN_PRUEBAS.md](PLAN_PRUEBAS.md) | Casos, resultados reales de la corrida funcional/local y con emulador, y pruebas pendientes. |
| [FIREBASE.md](FIREBASE.md) | Firestore, Firebase Auth, Storage, seed y Firebase Emulator Suite. |
| [DESPLIEGUE.md](DESPLIEGUE.md) | Cómo publicar en GitHub Pages, Firebase Hosting o un hosting estático. |
| [ENTREGABLES.md](ENTREGABLES.md) | Copia de guías, requerimientos, historias de usuario e informe de laboratorio. |

## Estado corto

- La aplicación funciona sin build en `app.html`, con páginas públicas `index.html`, `buscar.html` y `perfil.html`.
- Si Firestore no está disponible, se activa automáticamente el modo demostración local.
- Firebase Auth, Firestore y Storage se probaron con **Firebase Emulator Suite** y las reglas del repositorio: login, escrituras, reseñas, reportes, verificación, archivos públicos/privados y bloqueo de escalamiento de privilegios.
- El proyecto real `tuoficiocol` ya tiene Firestore y reglas activas, pero aún no tiene Authentication habilitado, Storage creado ni datos sembrados: faltan `firebase login` o una cuenta de servicio y `npm run seed`. Mientras tanto, la app usa el modo demo local si Firestore responde `permission-denied`.
- Google Login está implementado en código, pero requiere habilitar el proveedor en Firebase y autorizar el dominio.
- Las notificaciones push con la pestaña cerrada y el correo automático no están implementados: requieren un backend/FCM o un servicio de correo con credenciales.
- La validación con MinTrabajo/Saber Hacer Vale es manual porque no existe una API pública documentada.
- El detalle de la corrida con emulador y sus IDs efímeros está en [PLAN_PRUEBAS.md](PLAN_PRUEBAS.md), sección 5.1.
