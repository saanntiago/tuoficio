/* c:\Users\juanc\OneDrive\Documentos\UMB\ChambaYa\js\dashboard-cliente.js */
(function() {
    window.DashboardCliente = {
        init: async function(user) {
            this.user = user;
            console.log("Iniciando Dashboard Cliente para:", user.uid);
            
            // Load user data
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if(doc.exists) {
                const data = doc.data();
                document.getElementById('welcome-text').textContent = `Bienvenido, ${data.nombre}`;
                document.getElementById('sidebar-name').textContent = data.nombre;
                if(data.foto) {
                    document.getElementById('sidebar-avatar').src = data.foto;
                    document.getElementById('header-avatar').src = data.foto;
                }
            }
            
            this.loadStats();
            this.loadQuotes();
            this.loadRecommendedWorkers();
            this.initMap();
            this.setupForm();
        },
        
        loadStats: async function() {
            try {
                const quotesSnap = await db.collection('cotizaciones')
                    .where('clienteId', '==', this.user.uid)
                    .where('estado', '==', 'activa').get();
                document.getElementById('stat-cotizaciones').textContent = quotesSnap.size;
                
                const favsSnap = await db.collection('favoritos')
                    .where('clienteId', '==', this.user.uid).get();
                if(!favsSnap.empty) {
                    const favs = favsSnap.docs[0].data().trabajadores || [];
                    document.getElementById('stat-favoritos').textContent = favs.length;
                }
                
                const reviewsSnap = await db.collection('resenas')
                    .where('clienteId', '==', this.user.uid).get();
                document.getElementById('stat-resenas').textContent = reviewsSnap.size;
            } catch(e) { console.error("Error loading stats", e); }
        },
        
        loadQuotes: async function() {
            db.collection('cotizaciones')
                .where('clienteId', '==', this.user.uid)
                .orderBy('fechaCreacion', 'desc')
                .limit(5)
                .onSnapshot(snap => {
                    const tbody = document.getElementById('quotes-table-body');
                    tbody.innerHTML = '';
                    if(snap.empty) {
                        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No tienes cotizaciones recientes</td></tr>';
                        return;
                    }
                    snap.forEach(doc => {
                        const q = doc.data();
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${q.titulo}</td>
                            <td><span class="badge bg-light text-dark">${q.categoria}</span></td>
                            <td>$${q.presupuesto || 'A convenir'}</td>
                            <td><span class="badge ${q.estado==='activa'?'bg-success':'bg-secondary'} text-white">${q.estado}</span></td>
                            <td>${(q.ofertas || []).length} ofertas</td>
                            <td>
                                <button class="btn btn-sm btn-outline">Ver</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                });
        },
        
        loadRecommendedWorkers: async function() {
            const container = document.getElementById('recommended-workers');
            container.innerHTML = ''; // clear skeletons
            
            try {
                const snap = await db.collection('trabajadores')
                    .orderBy('calificacionPromedio', 'desc').limit(5).get();
                
                if(snap.empty) {
                    container.innerHTML = '<p>No hay recomendaciones por ahora.</p>';
                    return;
                }
                
                snap.forEach(doc => {
                    const w = doc.data();
                    const card = document.createElement('div');
                    card.className = 'worker-card card p-3 mr-3 d-inline-block';
                    card.style.width = '250px';
                    card.innerHTML = `
                        <div class="text-center mb-2">
                            <img src="${w.foto || 'assets/default-avatar.png'}" class="avatar avatar-lg mb-2">
                            <h4 class="mb-0">${w.nombre || 'Trabajador'}</h4>
                            <p class="text-sm text-secondary">${w.oficio}</p>
                        </div>
                        <div class="d-flex justify-content-between text-sm mb-3">
                            <span>⭐ ${w.calificacionPromedio || '0.0'}</span>
                            <span class="badge bg-success text-white">Disponible</span>
                        </div>
                        <a href="perfil-trabajador.html?id=${doc.id}" class="btn btn-outline btn-full btn-sm">Ver Perfil</a>
                    `;
                    container.appendChild(card);
                });
            } catch(e) {
                console.error("Error loading recommended", e);
                container.innerHTML = '<p>Error al cargar recomendaciones</p>';
            }
        },
        
        initMap: function() {
            if(document.getElementById('map')) {
                const map = L.map('map').setView([4.6097, -74.0817], 13); // Default Bogota
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                
                // Add dummy marker for demo
                L.marker([4.6097, -74.0817]).addTo(map)
                    .bindPopup('Plomero Experto cerca de ti');
            }
        },
        
        setupForm: function() {
            const form = document.getElementById('quote-form');
            if(form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const title = document.getElementById('quote-title').value;
                    const cat = document.getElementById('quote-category').value;
                    const desc = document.getElementById('quote-desc').value;
                    const budget = document.getElementById('quote-budget').value;
                    
                    try {
                        await db.collection('cotizaciones').add({
                            clienteId: this.user.uid,
                            titulo: title,
                            categoria: cat,
                            descripcion: desc,
                            presupuesto: budget,
                            estado: 'activa',
                            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                            ofertas: []
                        });
                        alert("Cotización publicada con éxito!");
                        closeQuoteModal();
                        form.reset();
                    } catch(err) {
                        console.error(err);
                        alert("Error al publicar");
                    }
                });
            }
        }
    };
})();
