// auth.js
(function() {
  const auth = window.ChambaAuth || firebase.auth();
  const db = window.ChambaDB || firebase.firestore();
  const provider = window.ChambaGoogleProvider || new firebase.auth.GoogleAuthProvider();

  window.Auth = {
    signInWithGoogle: async function() {
      try {
        if (window.Utils) window.Utils.showLoading();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user exists in db
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        if (!userDoc.exists) {
          // Create new user doc
          await db.collection('usuarios').doc(user.uid).set({
            uid: user.uid,
            nombre: user.displayName || 'Usuario TuOficioCol',
            email: user.email,
            foto: user.photoURL || '',
            rol: 'cliente', // default role
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
            verificado: false,
            ubicacion: null
          });
        }
        
        if (window.Utils) {
          window.Utils.hideLoading();
          window.Utils.showToast('Inicio de sesión exitoso', 'success');
        }
        
        // Redirect based on role
        const userData = userDoc.exists ? userDoc.data() : { rol: 'cliente' };
        this._redirectByRole(userData.rol);
        
        return user;
      } catch (error) {
        if (window.Utils) {
          window.Utils.hideLoading();
          window.Utils.showToast(`Error de autenticación: ${error.message}`, 'error');
        }
        throw error;
      }
    },

    signInWithEmail: async function(email, password) {
      try {
        if (window.Utils) window.Utils.showLoading();
        const result = await auth.signInWithEmailAndPassword(email, password);
        const user = result.user;
        
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        const userData = userDoc.data() || { rol: 'cliente' };
        
        if (window.Utils) {
          window.Utils.hideLoading();
          window.Utils.showToast('Inicio de sesión exitoso', 'success');
        }
        this._redirectByRole(userData.rol);
        return user;
      } catch (error) {
        if (window.Utils) {
          window.Utils.hideLoading();
          window.Utils.showToast(`Error al iniciar sesión: ${error.message}`, 'error');
        }
        throw error;
      }
    },

    signUpWithEmail: async function(email, password, name, role) {
      try {
        if (window.Utils) window.Utils.showLoading();
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        
        // Update auth profile
        await user.updateProfile({ displayName: name });
        await user.sendEmailVerification();
        
        // Create user doc
        await db.collection('usuarios').doc(user.uid).set({
          uid: user.uid,
          nombre: name,
          email: email,
          foto: '',
          rol: role,
          fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
          verificado: false,
          ubicacion: null
        });
        
        if (role === 'trabajador') {
          // Create worker doc
          await db.collection('trabajadores').doc(user.uid).set({
            uid: user.uid,
            oficio: '',
            experiencia: '',
            descripcion: '',
            disponibilidad: 'disponible',
            tarifas: { visitaDiagnostica: 0, horaBase: 0 },
            calificacionPromedio: 0,
            totalResenas: 0,
            zonasCobertura: [],
            portafolio: [],
            insignias: []
          });
        }
        
        if (window.Utils) {
          window.Utils.hideLoading();
          window.Utils.showToast('Registro exitoso. Por favor verifica tu correo.', 'success');
        }
        this._redirectByRole(role);
        return user;
      } catch (error) {
        if (window.Utils) {
          window.Utils.hideLoading();
          window.Utils.showToast(`Error al registrarse: ${error.message}`, 'error');
        }
        throw error;
      }
    },

    signOut: async function() {
      try {
        await auth.signOut();
        if (window.Utils) window.Utils.showToast('Sesión cerrada correctamente', 'success');
        window.location.href = 'index.html';
      } catch (error) {
        if (window.Utils) window.Utils.showToast(`Error al cerrar sesión: ${error.message}`, 'error');
        throw error;
      }
    },

    getCurrentUser: function() {
      return auth.currentUser;
    },

    onAuthStateChanged: function(callback) {
      return auth.onAuthStateChanged(callback);
    },

    getUserRole: async function(uid) {
      try {
        const doc = await db.collection('usuarios').doc(uid).get();
        if (doc.exists) {
          return doc.data().rol;
        }
        return 'cliente';
      } catch (error) {
        console.error("Error al obtener rol:", error);
        return 'cliente';
      }
    },

    sendPasswordReset: async function(email) {
      try {
        await auth.sendPasswordResetEmail(email);
        if (window.Utils) window.Utils.showToast('Correo de recuperación enviado.', 'success');
      } catch (error) {
        if (window.Utils) window.Utils.showToast(`Error: ${error.message}`, 'error');
        throw error;
      }
    },

    protectRoute: async function(allowedRoles) {
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          unsubscribe();
          if (!user) {
            window.location.href = 'login.html';
            return resolve(false);
          }
          const role = await this.getUserRole(user.uid);
          if (!allowedRoles.includes(role)) {
            window.location.href = 'unauthorized.html';
            return resolve(false);
          }
          resolve(true);
        });
      });
    },

    updateProfile: async function(data) {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");
      
      try {
        if (window.Utils) window.Utils.showLoading();
        await user.updateProfile({
          displayName: data.displayName || user.displayName,
          photoURL: data.photoURL || user.photoURL
        });
        
        const updateData = {};
        if (data.displayName) updateData.nombre = data.displayName;
        if (data.photoURL) updateData.foto = data.photoURL;
        
        if (Object.keys(updateData).length > 0) {
          await db.collection('usuarios').doc(user.uid).update(updateData);
        }
        
        if (window.Utils) {
          window.Utils.hideLoading();
          window.Utils.showToast('Perfil actualizado correctamente', 'success');
        }
      } catch (error) {
        if (window.Utils) {
          window.Utils.hideLoading();
          window.Utils.showToast(`Error al actualizar perfil: ${error.message}`, 'error');
        }
        throw error;
      }
    },

    _redirectByRole: function(role) {
      if (role === 'trabajador') {
        window.location.href = 'dashboard-worker.html';
      } else if (role === 'admin') {
        window.location.href = 'dashboard-admin.html';
      } else {
        window.location.href = 'dashboard-client.html';
      }
    }
  };
})();
