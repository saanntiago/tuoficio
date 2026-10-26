// notifications.js
(function() {
  const db = window.ChambaDB || firebase.firestore();

  window.Notifications = {
    // Web Push API implementation
    requestPermission: async function() {
      if (!('Notification' in window)) {
        console.warn('Este navegador no soporta notificaciones de escritorio');
        return false;
      }
      
      let permission = Notification.permission;
      if (permission !== 'granted' && permission !== 'denied') {
        permission = await Notification.requestPermission();
      }
      return permission === 'granted';
    },

    sendBrowserNotification: function(title, body, icon, url) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, { body, icon });
        if (url) {
          notification.onclick = () => {
            window.open(url);
          };
        }
      }
    },

    // EmailJS implementation (placeholder values)
    sendEmailNotification: async function(to, subject, body) {
      if (!window.emailjs) {
        console.warn('EmailJS no está cargado');
        return;
      }
      try {
        await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
          to_email: to,
          subject: subject,
          message: body
        });
        console.log('Email enviado correctamente');
      } catch (error) {
        console.error('Error enviando email:', error);
      }
    },

    // Specific business logic notifications
    notifyNewRequest: async function(workerId, quoteData) {
      const dbInstance = window.DB || null;
      if (dbInstance) {
        await dbInstance.createNotification({
          usuarioId: workerId,
          tipo: 'nueva_cotizacion',
          titulo: 'Nueva Solicitud de Trabajo',
          mensaje: `Has recibido una solicitud para: ${quoteData.titulo}`,
          enlace: `/cotizacion.html?id=${quoteData.id}`
        });
      }
      this.sendBrowserNotification('Nueva Solicitud', 'Has recibido una nueva solicitud de trabajo');
    },

    notifyFavorited: async function(workerId, clientName) {
      if (window.DB) {
        await window.DB.createNotification({
          usuarioId: workerId,
          tipo: 'favorito',
          titulo: '¡Alguien te ha añadido a favoritos!',
          mensaje: `${clientName} ha guardado tu perfil.`,
          enlace: null
        });
      }
    },

    notifyNewMessage: async function(userId, senderName) {
      if (window.DB) {
        await window.DB.createNotification({
          usuarioId: userId,
          tipo: 'mensaje',
          titulo: 'Nuevo mensaje',
          mensaje: `Tienes un nuevo mensaje de ${senderName}.`,
          enlace: '/mensajes.html'
        });
      }
    },

    notifyReview: async function(workerId, rating) {
      if (window.DB) {
        await window.DB.createNotification({
          usuarioId: workerId,
          tipo: 'resena',
          titulo: 'Nueva reseña',
          mensaje: `Has recibido una reseña de ${rating} estrellas.`,
          enlace: '/perfil.html'
        });
      }
    },

    initNotificationListener: function(userId) {
      return db.collection('notificaciones')
        .where('usuarioId', '==', userId)
        .orderBy('fecha', 'desc')
        .limit(20)
        .onSnapshot(snap => {
          const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          this._updateUI(notifications);
        });
    },

    renderNotificationBell: function(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = `
        <div class="notification-wrapper" style="position: relative; cursor: pointer;">
          <i class="fas fa-bell"></i>
          <span id="notif-badge" class="notification-badge" style="display:none; position: absolute; top: -5px; right: -5px; background: var(--danger); color: white; border-radius: 50%; padding: 2px 5px; font-size: 10px;">0</span>
          <div id="notif-dropdown" class="notif-dropdown" style="display:none; position: absolute; right: 0; top: 30px; background: white; border: 1px solid var(--border); border-radius: var(--radius-sm); width: 300px; box-shadow: var(--shadow); z-index: 1000;">
          </div>
        </div>
      `;
      container.querySelector('.notification-wrapper').onclick = () => {
        const dropdown = document.getElementById('notif-dropdown');
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      };
    },

    renderNotificationDropdown: function(notifications) {
      const dropdown = document.getElementById('notif-dropdown');
      if (!dropdown) return;
      
      if (notifications.length === 0) {
        dropdown.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--text-secondary);">No tienes notificaciones</div>';
        return;
      }

      let html = '<ul style="list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;">';
      notifications.forEach(notif => {
        const isReadStr = notif.leida ? 'opacity: 0.7;' : 'font-weight: bold; background: var(--bg-light);';
        html += `
          <li style="padding: 10px 15px; border-bottom: 1px solid var(--border); ${isReadStr}">
            <div style="font-size: 14px;">${notif.titulo}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${notif.mensaje}</div>
            ${notif.enlace ? `<a href="${notif.enlace}" style="font-size: 12px; color: var(--primary);">Ver más</a>` : ''}
          </li>
        `;
      });
      html += '</ul>';
      dropdown.innerHTML = html;
    },

    _updateUI: function(notifications) {
      const unreadCount = notifications.filter(n => !n.leida).length;
      const badge = document.getElementById('notif-badge');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.style.display = 'block';
        } else {
          badge.style.display = 'none';
        }
      }
      this.renderNotificationDropdown(notifications);
    }
  };

  // Initialize EmailJS on load
  if (typeof emailjs !== 'undefined') {
    emailjs.init("YOUR_PUBLIC_KEY");
  }

})();
