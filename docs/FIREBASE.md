# Firebase real: Firestore, Auth y Storage

Esta guía explica cómo activar el backend real del proyecto `tuoficiocol` y cómo probarlo localmente con el emulador. La aplicación ya incluye el código de integración; lo que falta en el entorno de trabajo es la **sesión de Firebase** o una **cuenta de servicio** para desplegar reglas y sembrar datos.

> Importante: no afirmes que Firestore real está funcionando hasta desplegar `firestore.rules` y comprobar una lectura autenticada. La consulta REST sin autenticación devuelve `403 PERMISSION_DENIED` mientras las reglas no estén publicadas.

---

## 1. Requisitos

- Node.js LTS y npm (en este equipo ya están instalados).
- Firebase CLI: `npm install -g firebase-tools`.
- Una cuenta con acceso al proyecto `tuoficiocol`.

## 2. Configuración en Firebase Console

1. **Firestore Database** → crear la base en modo producción.
2. **Storage** → crear el bucket. El proyecto usa `tuoficiocol.firebasestorage.app`. Cloud Storage for Firebase exige el plan **Blaze** (pago por uso), pero incluye una cuota sin costo: 5 GB almacenados, 100 GB de descarga al mes y 5.000 subidas al mes, solo en `us-central1`, `us-west1` o `us-east1`. No hay cargo fijo mensual; el plan Blaze requiere una tarjeta y el crédito de bienvenida de 300 USD (si aplica) es un abono, no un cobro.
   - Después de crear el bucket, publica las reglas de `storage.rules`: **Storage → Rules**, pega el contenido del archivo y pulsa **Publicar**. Crear el bucket no publica las reglas: con las reglas iniciales en modo bloqueado, las subidas fallan con `storage/unauthorized` aunque el usuario esté autenticado.
   - Alternativa por CLI: `firebase deploy --only storage`.
3. **Authentication → Sign-in method**:
   - Correo electrónico/contraseña: habilitado para las cuentas demo.
   - Google: habilitado para HU-18.
4. **Authentication → Settings → Authorized domains**:
   - `localhost` y `127.0.0.1` para desarrollo.
   - El dominio de Hosting cuando se publique.
   - Firebase no acepta comodines (`*`): agrega cada dominio exacto, sin `http://`, sin puerto y sin ruta.
5. **Authentication → Users**: el script de seed crea las cuentas; no es necesario crearlas a mano.

### Crear una cuenta de administrador

El rol vive en `usuarios/{uid}.rol`. Las reglas de Firestore impiden que un usuario se autoasigne `admin`, así que el cambio debe hacerse con la Admin SDK o desde la consola:

1. Crea la cuenta en **Authentication → Users** o regístrate en la app.
2. En **Firestore → usuarios**, abre el documento cuyo ID es el UID de esa cuenta.
3. Cambia el campo `rol` a `admin` (minúsculas).
4. Cierra sesión y vuelve a entrar.

También puedes usar `npm run seed`: crea `admin1@chambaya.com / AdminChamba1!`, `admin2@chambaya.com / AdminChamba2!` y `admin3@chambaya.com / AdminChamba3!` con `rol: admin`. El seed necesita la cuenta de servicio y omite las reglas de seguridad.

## 3. Desplegar reglas e índices

```powershell
firebase login
firebase use tuoficiocol
firebase deploy --only firestore:rules,firestore:indexes,storage
```

El despliegue incluye:

- `firestore.rules`: permisos por propietario, rol y estado; bloquea el cambio de `rol` a admin, la autoasignación de `badgeVerified` y la autoaprobación de verificaciones; valida reseñas, reportes y el agregado de calificación.
- `firestore.indexes.json`: índices para mensajes y reseñas.
- `storage.rules`: lectura pública de avatar/portafolio y lectura privada de documento/selfie.

## 4. Sembrar Firestore y Firebase Auth

Descarga una clave de cuenta de servicio:

**Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**.

Guarda el JSON fuera del repositorio. Luego:

```powershell
npm install
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\service-account.json"
npm run seed
```

El script:

- crea las cuentas de Firebase Auth con los mismos UID de los datos demo (`w-carlos`, `c-ana`, etc.);
- crea los administradores (`admin1`, `admin2`, `admin3`);
- escribe las colecciones `usuarios`, `trabajadores`, `resenas`, `cotizaciones`, `postulaciones`, `trabajos`, `verificaciones`, `reportes`, `notificaciones`, `favoritos`, `conversaciones`, `mensajes`, `hojasDeVida` y `sugerencias`;
- no guarda contraseñas ni hashes en Firestore.

Credenciales resultantes:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Cliente | `ana@demo.tuoficio.co` | `demo1234` |
| Cliente | `jorge@demo.tuoficio.co` | `demo1234` |
| Cliente | `paula@demo.tuoficio.co` | `demo1234` |
| Trabajador | `carlos@demo.tuoficio.co` | `demo1234` |
| Administrador | `admin1@chambaya.com` | `AdminChamba1!` |

## 5. Publicar con Firebase Hosting

```powershell
firebase deploy --only hosting
```

La configuración está en `firebase.json`; la raíz pública es el directorio del proyecto y se excluyen `scripts`, `docs`, `node_modules` y credenciales.

Después del despliegue:

1. Copia el dominio (`https://tuoficiocol.web.app` o el dominio asignado).
2. Agrégalo en **Authentication → Settings → Authorized domains**.
3. Abre la app, entra con una cuenta demo y verifica Firestore, Storage y Google Login.

## 6. Probar sin tocar producción: emulador

El emulador permite validar el código, las reglas y el seed sin credenciales reales. Usa Java (ya instalado) y descarga los emuladores la primera vez.

Terminal 1:

```powershell
npm run emulators
```

Terminal 2:

```powershell
npm run seed:emulator
```

Terminal 3:

```powershell
python -m http.server 8123 --bind 127.0.0.1
```

Abre:

```text
http://127.0.0.1:8123/app.html?emulator=1
```

- `?emulator=1` activa Firestore `127.0.0.1:8080`, Auth `127.0.0.1:9099` y Storage `127.0.0.1:9199`.
- `?emulator=0` vuelve al proyecto real.
- La preferencia se guarda en `localStorage`.
- El emulador usa las reglas del repositorio, por lo que también sirve para detectar errores de permisos.

La UI del emulador queda en `http://127.0.0.1:4000`.

En la corrida del 26 de octubre de 2026 se verificaron login, cotización, perfil, reseña, reporte, verificación, portafolio y archivos públicos/privados. También se comprobó que un cliente no puede cambiar su `rol` a admin y que un trabajador no puede autoasignarse `badgeVerified`. El detalle está en [PLAN_PRUEBAS.md](PLAN_PRUEBAS.md), sección 5.1.

## 7. Rutas de Storage

| Ruta | Contenido | Lectura |
| --- | --- | --- |
| `users/{uid}/public/avatar/...` | Foto de perfil | Pública |
| `users/{uid}/public/portafolio/...` | Fotos antes/después y video | Pública |
| `users/{uid}/private/verificacion/...` | Documento y selfie | Dueño y administrador |

Límites aplicados en cliente y reglas: imágenes JPG/PNG ≤ 5 MB; video MP4/WebM/MOV ≤ 50 MB. Las imágenes se comprimen en el navegador antes de subirse.

Las reglas restringen `getDownloadURL` y el listado de archivos privados, pero una URL de descarga con token, una vez compartida, puede abrirse sin autenticación hasta que el archivo se elimine o el token se revoque. No publiques ni pegues en documentos las URL privadas de documento/selfie.

Si Storage no está habilitado, el código espera como máximo 20 segundos, cancela la subida y conserva la imagen comprimida como Data URL para no romper el flujo; el video sí exige Storage o un enlace externo. Ese tiempo evita que la interfaz se quede cargando cuando el bucket no existe o la red no responde.

## 8. Diagnóstico rápido

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| La app entra en modo local | Firestore responde `403` o no hay red | Despliega `firestore.rules` y recarga |
| `auth/unauthorized-domain` | Dominio no autorizado | Agrégalo en Authentication → Authorized domains |
| `auth/operation-not-allowed` | Proveedor deshabilitado | Habilita correo y/o Google |
| `storage/unauthorized` | Reglas de Storage no publicadas o ruta incorrecta | Publica `storage.rules` en Console → Storage → Rules o ejecuta `firebase deploy --only storage` |
| `storage/bucket-not-found` | Storage no creado o bucket distinto | Créalo en Console y revisa `storageBucket` |
| La subida se queda cargando | Bucket inexistente o red sin respuesta | Se cancela a los 20 s y usa el respaldo; crea Storage para subir de verdad |
| Storage pide el plan Blaze | Requisito de Cloud Storage for Firebase | Actívalo con alertas de presupuesto; la cuota gratuita cubre un portafolio pequeño |
| El seed falla con credenciales | Falta `GOOGLE_APPLICATION_CREDENTIALS` | Descarga la cuenta de servicio |
| El emulador no arranca | Puerto ocupado | Cambia los puertos en `firebase.json` y en `firebase-config.js` |

## 9. Pendientes externos que no resuelve este repositorio

- Push con la pestaña cerrada y correo automático: requieren FCM/Cloud Functions o un proveedor con credenciales.
- Validación automática con MinTrabajo/Saber Hacer Vale: no hay API pública documentada.
- Evidencias Jira/Zephyr: requieren credenciales y un proyecto externo.
- Google Login real: el código está listo, pero el proveedor y el dominio deben habilitarse en Console.
