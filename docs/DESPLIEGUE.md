# Despliegue y publicación

## Estado actual

El proyecto está actualizado en el repositorio y se ejecuta localmente. **No se verificó una URL pública** porque en el entorno de trabajo no hay Firebase CLI, sesión de Firebase ni acceso a la configuración de Pages del repositorio.

No afirmes que la app está publicada hasta comprobar la URL en un navegador.

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
firebase login
firebase use chambaya-45541
firebase deploy --only hosting,firestore:rules,storage
```

El proyecto ya tiene `firebase.json`. Revisa que `hosting.public` apunte a la raíz del proyecto y que las reglas de Firestore estén desplegadas antes de mostrar la app en producción.

Después del despliegue:

1. Copia el dominio de Hosting.
2. En Firebase Console → Authentication → Settings → Authorized domains, agrégalo.
3. Prueba Google Login y el registro por correo.
4. Restablece la base demo o usa una cuenta de prueba; no dejes datos de prueba en producción.

## Opción C: Netlify / Vercel / hosting estático

Sube la carpeta completa (sin `node_modules`, que no existe) y configura la raíz como directorio público. No hay variables de entorno obligatorias: las claves públicas de Firebase están en `js/config/firebase-config.js`.

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
- [ ] Reglas de Firestore desplegadas si se usa Firebase real.
