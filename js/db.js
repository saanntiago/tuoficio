// db.js
(function() {
  const db = window.ChambaDB || firebase.firestore();
  
  const showToastError = (msg) => { if(window.Utils) window.Utils.showToast(msg, 'error'); };
  const showToastSuccess = (msg) => { if(window.Utils) window.Utils.showToast(msg, 'success'); };

  window.DB = {
    // WORKERS
    getWorkers: async function(filters = {}) {
      try {
        let query = db.collection('trabajadores');
        if (filters.categoria) query = query.where('oficio', '==', filters.categoria);
        if (filters.disponibilidad) query = query.where('disponibilidad', '==', filters.disponibilidad);
        // Note: other complex filters might need client-side filtering or complex indices
        const snapshot = await query.get();
        let workers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (filters.calificacionMin) {
          workers = workers.filter(w => (w.calificacionPromedio || 0) >= filters.calificacionMin);
        }
        return workers;
      } catch (error) {
        showToastError(`Error fetching workers: ${error.message}`);
        throw error;
      }
    },
    getWorker: async function(uid) {
      const doc = await db.collection('trabajadores').doc(uid).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    updateWorker: async function(uid, data) {
      try {
        await db.collection('trabajadores').doc(uid).update(data);
        showToastSuccess('Perfil de trabajador actualizado');
      } catch (error) {
        showToastError(`Error updating worker: ${error.message}`);
        throw error;
      }
    },
    updateAvailability: async function(uid, status) {
      return this.updateWorker(uid, { disponibilidad: status });
    },
    getWorkersByLocation: async function(lat, lng, radiusKm) {
      // In a real app, use GeoFire or equivalent. Here we just fetch all and filter in memory for demo
      try {
        const workers = await this.getWorkers();
        if(!window.Utils || !window.Utils.calculateDistance) return workers;
        return workers.filter(w => {
          if(!w.ubicacion) return false;
          const dist = window.Utils.calculateDistance(lat, lng, w.ubicacion.lat, w.ubicacion.lng);
          return dist <= radiusKm;
        });
      } catch (error) {
        showToastError(`Error: ${error.message}`);
        throw error;
      }
    },

    // QUOTES
    createQuote: async function(data) {
      try {
        const docRef = await db.collection('cotizaciones').add({
          ...data,
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
          estado: 'pendiente',
          ofertas: []
        });
        showToastSuccess('Cotización creada exitosamente');
        return docRef.id;
      } catch (error) {
        showToastError(`Error creating quote: ${error.message}`);
        throw error;
      }
    },
    getQuotesByClient: async function(clienteId) {
      const snap = await db.collection('cotizaciones').where('clienteId', '==', clienteId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    getAvailableQuotes: async function(categoria, zona) {
      const snap = await db.collection('cotizaciones')
        .where('estado', '==', 'pendiente')
        .where('categoria', '==', categoria).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    updateQuoteStatus: async function(quoteId, status) {
      await db.collection('cotizaciones').doc(quoteId).update({ estado: status });
    },
    submitOffer: async function(quoteId, offerData) {
      await db.collection('cotizaciones').doc(quoteId).update({
        ofertas: firebase.firestore.FieldValue.arrayUnion(offerData)
      });
      showToastSuccess('Oferta enviada');
    },

    // REVIEWS
    createReview: async function(data) {
      try {
        await db.collection('resenas').add({
          ...data,
          fecha: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToastSuccess('Reseña guardada');
        // trigger recalculate logic or do it securely via Cloud Functions
      } catch (error) {
        showToastError(`Error creating review: ${error.message}`);
        throw error;
      }
    },
    getReviewsByWorker: async function(workerId) {
      const snap = await db.collection('resenas').where('trabajadorId', '==', workerId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    getReviewsByClient: async function(clienteId) {
      const snap = await db.collection('resenas').where('clienteId', '==', clienteId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // FAVORITES
    addFavorite: async function(clienteId, workerId) {
      const docRef = db.collection('favoritos').doc(clienteId);
      const doc = await docRef.get();
      if (!doc.exists) {
        await docRef.set({ clienteId, trabajadores: [workerId] });
      } else {
        await docRef.update({ trabajadores: firebase.firestore.FieldValue.arrayUnion(workerId) });
      }
      showToastSuccess('Añadido a favoritos');
    },
    removeFavorite: async function(clienteId, workerId) {
      await db.collection('favoritos').doc(clienteId).update({
        trabajadores: firebase.firestore.FieldValue.arrayRemove(workerId)
      });
      showToastSuccess('Removido de favoritos');
    },
    getFavorites: async function(clienteId) {
      const doc = await db.collection('favoritos').doc(clienteId).get();
      return doc.exists ? doc.data().trabajadores : [];
    },
    isFavorite: async function(clienteId, workerId) {
      const favs = await this.getFavorites(clienteId);
      return favs.includes(workerId);
    },

    // REPORTS
    createReport: async function(data) {
      await db.collection('reportes').add({
        ...data,
        estado: 'pendiente',
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToastSuccess('Reporte enviado');
    },
    getReports: async function(filters = {}) {
      let q = db.collection('reportes');
      if (filters.estado) q = q.where('estado', '==', filters.estado);
      const snap = await q.get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    updateReportStatus: async function(reportId, status, action) {
      await db.collection('reportes').doc(reportId).update({ estado: status, accionTomada: action });
    },

    // NOTIFICATIONS
    createNotification: async function(data) {
      await db.collection('notificaciones').add({
        ...data,
        leida: false,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    getNotifications: function(userId, callback) {
      return db.collection('notificaciones')
        .where('usuarioId', '==', userId)
        .orderBy('fecha', 'desc')
        .onSnapshot(snap => {
          const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (callback) callback(notifs);
        });
    },
    markAsRead: async function(notifId) {
      await db.collection('notificaciones').doc(notifId).update({ leida: true });
    },
    getUnreadCount: async function(userId) {
      const snap = await db.collection('notificaciones')
        .where('usuarioId', '==', userId)
        .where('leida', '==', false).get();
      return snap.size;
    },

    // USERS
    getUser: async function(uid) {
      const doc = await db.collection('usuarios').doc(uid).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    updateUser: async function(uid, data) {
      await db.collection('usuarios').doc(uid).update(data);
    },
    getAllUsers: async function(filters = {}) {
      const snap = await db.collection('usuarios').get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    verifyWorker: async function(uid) {
      await this.updateUser(uid, { verificado: true });
      showToastSuccess('Trabajador verificado');
    },
    suspendUser: async function(uid) {
      await this.updateUser(uid, { suspendido: true });
      showToastSuccess('Usuario suspendido');
    },

    // STATS
    getTotalUsers: async function() {
      const snap = await db.collection('usuarios').get();
      return snap.size;
    },
    getTotalWorkers: async function() {
      const snap = await db.collection('usuarios').where('rol', '==', 'trabajador').get();
      return snap.size;
    },
    getActiveQuotes: async function() {
      const snap = await db.collection('cotizaciones').where('estado', '==', 'pendiente').get();
      return snap.size;
    },
    getCompletedServices: async function() {
      const snap = await db.collection('cotizaciones').where('estado', '==', 'completado').get();
      return snap.size;
    },
    getRecentActivity: async function() {
      // Mock for recent activity as it spans collections
      return [
        { type: 'usuario', message: 'Nuevo usuario registrado', time: new Date() },
        { type: 'cotizacion', message: 'Nueva cotización creada', time: new Date() }
      ];
    }
  };
})();
