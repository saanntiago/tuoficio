#  TuOficioCol (ChambaYa)

> Plataforma web para la conexión directa entre trabajadores independientes de oficio (plomeros, electricistas, carpinteros, etc.) y empleadores, organizada por localidades y barrios en Colombia.

---

##  Características Principales
- **Búsqueda por Localidad / Barrio:** Encuentra profesionales certificados cerca de tu ubicación.
- **Sistema de Autenticación:** Registro diferenciado para clientes y trabajadores mediante Firebase Auth (Correo/Contraseña y Google).
- **Gestión de Cotizaciones:** Publicación de solicitudes de servicio y recepción de ofertas técnicas en tiempo real con Cloud Firestore.
- **Panel de Administración (Dashboard):** Control de usuarios, validación y verificación de técnicos, auditoría de reseñas y reportes.
- **Asistente Virtual (Chatbot):** Soporte automatizado integrado para guiar a los usuarios en la plataforma.

---

##  Tecnologías y Stack
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla moderno con diseño modular).
- **Estilos y Componentes:** CSS Modules / Design System personalizado, Leaflet (Mapas interactivos).
- **Backend / BaaS:** Firebase (Authentication, Firestore Database, Security Rules).
- **Control de Versiones:** Git & GitHub.

---

##  Estructura del Proyecto
```text
[Tuoficiocol.com/](https://Tuoficiocol.com/)
├── css/                  # Hojas de estilo modulares (Design System, componentes, dashboards)
├── js/
│   ├── config/           # Configuración de Firebase y constantes globales
│   ├── services/         # Servicios de base de datos y autenticación
│   ├── chatbot/          # Lógica del asistente virtual
│   ├── pages/            # Controladores de vistas
│   └── ui/               # Gestores de interfaz de usuario
├── index.html            # Landing Page principal
├── app.html              # Aplicación / Pantalla de acceso principal
├── buscar.html           # Módulo de búsqueda y filtrado de técnicos
├── dashboard-admin.html  # Panel de control para administradores
└── dashboard-cliente.html# Panel de control para clientes / empleadores
