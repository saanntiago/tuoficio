# Documentación de TuOficioCol

Esta carpeta reúne la documentación técnica, la trazabilidad de requisitos y las pruebas ejecutadas sobre el proyecto.

| Documento | Para qué sirve |
| --- | --- |
| [GUIA_APERTURA.md](GUIA_APERTURA.md) | Abrir el proyecto en el PC, credenciales demo y solución de problemas. |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Arquitectura real implementada y diferencias frente al informe de laboratorio. |
| [MATRIZ_RF_HU.md](MATRIZ_RF_HU.md) | Trazabilidad RF01–RF15 y HU-01–HU-18. |
| [PLAN_PRUEBAS.md](PLAN_PRUEBAS.md) | Casos, resultados reales de la corrida funcional y pruebas pendientes. |
| [DESPLIEGUE.md](DESPLIEGUE.md) | Cómo publicar en GitHub Pages, Firebase Hosting o un hosting estático. |
| [ENTREGABLES.md](ENTREGABLES.md) | Copia de guías, requerimientos, historias de usuario e informe de laboratorio. |

## Estado corto

- La aplicación funciona sin build en `app.html`, con páginas públicas `index.html`, `buscar.html` y `perfil.html`.
- Si Firestore no está disponible, se activa automáticamente el modo demostración local.
- Google Login está implementado en código, pero requiere habilitar el proveedor en Firebase y autorizar el dominio.
- Las notificaciones push con la pestaña cerrada y el correo automático no están implementados: requieren un backend/FCM o un servicio de correo con credenciales.
- La validación con MinTrabajo/Saber Hacer Vale es manual porque no existe una API pública documentada.
