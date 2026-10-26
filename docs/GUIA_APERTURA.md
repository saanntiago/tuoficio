# Cómo abrir TuOficioCol en el PC

## 1. Requisitos

- Windows con Python 3 instalado (`python --version`).
- Un navegador actualizado (Chrome, Edge o Firefox).
- No hace falta Node, npm, MySQL ni compilar nada.

## 2. Abrir la carpeta correcta

La copia de trabajo está en:

```text
C:\Users\santr\Downloads\tuoficio
```

Si tienes otra copia, asegúrate de abrir una terminal **dentro de la carpeta que contiene `app.html`**. Si el servidor se inicia en otra carpeta, verás una versión antigua o un error 404.

```powershell
cd "C:\Users\santr\Downloads\tuoficio"
```

## 3. Iniciar el servidor local

```powershell
python -m http.server 8123 --bind 127.0.0.1
```

Si el puerto 8123 está ocupado:

```powershell
python -m http.server 8124 --bind 127.0.0.1
```

Deja esa terminal abierta. El servidor debe seguir corriendo mientras usas la app.

También existe un acceso directo en el escritorio: `Abrir TuOficio.bat`. Ese archivo inicia el servidor y abre la landing.

## 4. Abrir las páginas

Con el servidor en el puerto 8123:

| Página | URL |
| --- | --- |
| Landing pública | <http://127.0.0.1:8123/index.html> |
| Directorio | <http://127.0.0.1:8123/buscar.html> |
| Perfil público de ejemplo | <http://127.0.0.1:8123/perfil.html?id=w-carlos> |
| Aplicación completa | <http://127.0.0.1:8123/app.html> |

Si usaste el puerto 8124, cambia el número en las URLs.

## 5. Entrar a la demo

En `app.html`, usa “Entrada rápida” o estas credenciales:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Empleador | `ana@demo.tuoficio.co` | `demo1234` |
| Empleador | `jorge@demo.tuoficio.co` | `demo1234` |
| Empleador | `paula@demo.tuoficio.co` | `demo1234` |
| Trabajador | `carlos@demo.tuoficio.co` | `demo1234` |
| Administrador | `admin1@chambaya.com` | `AdminChamba1!` |

La app detecta si Firestore responde. Si no responde o no hay permisos, muestra un aviso y usa **modo demostración local**. Los datos se guardan en el navegador:

- Base: `tuoficio_db_v1`
- Sesión: `tuoficio_session_uid`

Para restaurar los datos iniciales: **Configuración → Restablecer datos de demostración**.

## 6. Recorrido recomendado para mostrar

1. **Público:** abre la landing y el directorio; filtra Chapinero + 5 km y cambia a vista de mapa.
2. **Perfil:** abre `perfil.html?id=w-carlos`; muestra badge, tarifas, portafolio, reseñas y WhatsApp.
3. **Cliente:** entra como Ana; abre el perfil de Carlos y usa “Solicitar cotización” con fecha, hora, dirección y presupuesto.
4. **Notificación:** entra como Carlos; revisa la campana y la notificación de la solicitud.
5. **Chatbot:** como Ana, abre el chatbot y escribe “Publicar solicitud”; sigue las preguntas.
6. **Disponibilidad y portafolio:** como Carlos, cambia disponibilidad y agrega un proyecto antes/después.
7. **Verificación:** como Carlos, solicita verificación con documento y selfie; entra como admin y apruébala.
8. **Reseña:** como Ana, abre un trabajo finalizado y deja una reseña; el botón desaparece después.
9. **Reporte:** como Ana o Carlos, reporta el trabajo dentro de las 24 h; como admin, resuélvelo con advertencia.
10. **Avisos del navegador:** Configuración → “Activar” en Avisos del navegador (el navegador pedirá permiso).

## 7. Firebase (opcional)

El proyecto apunta a `chambaya-45541` en `js/config/firebase-config.js` y `.firebaserc`. Para usar Firestore real:

```powershell
npm install -g firebase-tools
firebase login
firebase use chambaya-45541
firebase deploy --only firestore:rules,storage
```

Si no tienes Node/npm instalados, instala Node LTS primero. Sin reglas desplegadas, la app seguirá en modo local.

### Google Login

En Firebase Console:

1. Authentication → Sign-in method → habilitar **Google**.
2. Authentication → Settings → Authorized domains → agregar `127.0.0.1`, `localhost` y el dominio de producción.
3. En Google Cloud, revisar que el cliente OAuth permita el origen correspondiente.

Sin esos pasos, el botón existe pero el login real falla. La app no simula un login de Google exitoso.

## 8. Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| La página no carga | El servidor no está corriendo | Ejecutar `python -m http.server ...` en la carpeta del proyecto. |
| Se ve una versión vieja | El servidor está en otra carpeta o el navegador tiene caché | Verificar `cd`; recargar con `Ctrl+F5`. |
| “Missing or insufficient permissions” | Reglas de Firestore no desplegadas | Usar modo demo o desplegar `firestore.rules`. |
| Tarda unos segundos al entrar | `DatabaseService.probe()` intenta Firestore antes de caer a local | Esperar 8–10 segundos. |
| Google Login falla | Proveedor/dominio no habilitado | Configurar Firebase Console. |
| No aparece el aviso nativo | Permiso denegado por el navegador | Configuración → Avisos del navegador → permitir; recargar. |
| Los cambios no se ven | Caché de JS | `Ctrl+F5` o abrir con `?v=fecha`. |

## 9. Apagar el servidor

Vuelve a la terminal y pulsa `Ctrl+C`. Los datos de la demo permanecen en `localStorage` hasta que se restablezcan.
