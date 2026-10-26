# Despliegue y publicación

## Estado actual

El proyecto está actualizado en el repositorio y se ejecuta localmente. **No se verificó una URL pública** porque en el entorno de trabajo no hay sesión de Firebase ni acceso a la configuración de Pages del repositorio.

Node.js LTS, npm y Firebase CLI ya están instalados. Falta autenticar la CLI (`firebase login`) o usar una cuenta de servicio para desplegar reglas, sembrar Firestore y publicar Hosting. La guía paso a paso está en [Firebase real](FIREBASE.md).

Comprobación del 25 de octubre de 2026: `https://saanntiago.github.io/tuoficio/` devolvió **404 (Site not found)**, es decir, GitHub Pages aún no está habilitado o el repositorio no permite Pages. No afirmes que la app está publicada hasta comprobar la URL en un navegador.

## Opción A: GitHub Pages

Requisitos:

- El repositorio debe permitir Pages (en repositorios privados depende del plan de GitHub).
- La app es estática; no necesita build.

Pasos:

1. En GitHub, abre **Settings → Pages**.
2. En “Build and deployment”, elige **Deploy from a branch**.
3. Rama `main`, carpeta `/ (root)`.
4. Guarda y espera el despliegue.
5. Abre `https://saanntiago.github.io/tuoficio/` y comprueba `app.html`, `buscar.html` y `perfil.html`.

Si Pages no está disponible para el repositorio, usa Firebase Hosting o un hosting estático.

## Opción B: Firebase Hosting

```powershell
npm install -g firebase-tools
npm install
firebase login
firebase use chambaya-45541
firebase deploy --only firestore:rules,firestore:indexes,storage
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\service-account.json"
npm run seed
firebase deploy --only hosting
```

El proyecto ya tiene `firebase.json`. Revisa que `hosting.public` apunte a la raíz del proyecto y que las reglas de Firestore y Storage estén desplegadas antes de mostrar la app en producción. El seed crea las cuentas demo en Firebase Auth y los documentos de Firestore; no subas la cuenta de servicio al repositorio.

Después del despliegue:

1. Copia el dominio de Hosting.
2. En Firebase Console → Authentication → Settings → Authorized domains, agrégalo.
3. Prueba Google Login y el registro por correo.
4. Restablece la base demo o usa una cuenta de prueba; no dejes datos de prueba en producción.

## Opción B2: probar con emulador antes de desplegar

```powershell
npm run emulators        # terminal 1
npm run seed:emulator    # terminal 2
python -m http.server 8123 --bind 127.0.0.1  # terminal 3
```

Abre `http://127.0.0.1:8123/app.html?emulator=1`. Esto no publica nada ni toca el proyecto real. La corrida del 26 de octubre de 2026 verificó Auth, Firestore, Storage y reglas; el detalle está en [PLAN_PRUEBAS.md](PLAN_PRUEBAS.md).

## Opción C: Netlify / Vercel / hosting estático

Sube la carpeta completa sin `node_modules`, `scripts`, `.firebase` ni archivos de cuenta de servicio, y configura la raíz como directorio público. No hay variables de entorno obligatorias: las claves públicas de Firebase están en `js/config/firebase-config.js`. `firebase.json` ya excluye esos directorios si se publica con Firebase Hosting.

## Checklist antes de mostrar

- [ ] `python -m http.server` sirve la carpeta correcta.
- [ ] `app.html` entra en modo demo o Firestore, sin errores en consola.
- [ ] `buscar.html?zone=Chapinero&radius=5&view=map` muestra 3 técnicos y el mapa.
- [ ] `perfil.html?id=w-carlos` muestra badge, tarifas, portafolio y reseñas.
- [ ] Registro de trabajador guarda teléfono y documento.
- [ ] Chatbot “Publicar solicitud” crea la cotización.
- [ ] Verificación → aprobación admin → badge.
- [ ] Reseña solo en trabajo finalizado y una sola vez.
- [ ] Reporte dentro de 24 h y sanción en admin.
- [ ] Google Login probado o marcado como pendiente.
- [ ] Reglas de Firestore y Storage desplegadas si se usa Firebase real.
- [ ] Seed ejecutado y cuentas demo creadas en Firebase Auth.
- [ ] Avatar, portafolio y verificación suben archivos a Storage.
- [ ] Emulador probado con `?emulator=1` o Firestore real verificado.
