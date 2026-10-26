/* c:\Users\juanc\OneDrive\Documentos\UMB\ChambaYa\js\dashboard-trabajador.js */
(function() {
    window.DashboardTrabajador = {
        init: async function(user) {
            this.user = user;
            console.log("Iniciando Dashboard Trabajador para:", user.uid);
            
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if(doc.exists) {
                const data = doc.data();
                document.getElementById('preview-name').textContent = data.nombre;
                if(data.foto) {
                    document.getElementById('worker-avatar').src = data.foto;
                    document.getElementById('preview-avatar').src = data.foto;
                }
            }
            
            const workerDoc = await db.collection('trabajadores').doc(user.uid).get();
            if(workerDoc.exists) {
                const wData = workerDoc.data();
                document.getElementById('preview-trade').textContent = wData.oficio || 'Sin oficio';
                document.getElementById('stat-rating').textContent = wData.calificacionPromedio || '0.0';
                document.getElementById('stat-reviews').textContent = wData.totalResenas || 0;
                
                if(wData.disponibilidad) {
                    document.getElementById('worker-status').value = wData.disponibilidad;
                }
            } else {
                // Initialize worker doc if missing
                await db.collection('trabajadores').doc(user.uid).set({
                    uid: user.uid,
                    oficio: '',
                    disponibilidad: 'disponible',
                    calificacionPromedio: 0,
                    totalResenas: 0,
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            this.loadRequests();
            this.initChart();
        },
        
        toggleAvailability: async function(status) {
            try {
                await db.collection('trabajadores').doc(this.user.uid).update({
                    disponibilidad: status
                });
                console.log("Estado actualizado a:", status);
            } catch(e) { console.error("Error al actualizar estado", e); }
        },
        
        loadRequests: function() {
            const container = document.getElementById('incoming-requests');
            // Assuming we match category. In a real app we'd filter by category or direct invites.
            db.collection('cotizaciones')
                .where('estado', '==', 'activa')
                .limit(3)
                .onSnapshot(snap => {
                    container.innerHTML = '';
                    if(snap.empty) {
                        container.innerHTML = '<p class="text-secondary text-center">No hay solicitudes nuevas.</p>';
                        return;
                    }
                    snap.forEach(doc => {
                        const q = doc.data();
                        const div = document.createElement('div');
                        div.className = 'border-bottom pb-3 mb-3';
                        div.innerHTML = `
                            <h5>${q.titulo}</h5>
                            <p class="text-sm text-secondary mb-2">${q.descripcion.substring(0, 50)}...</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-light text-dark">${q.categoria}</span>
                                <div>
                                    <button class="btn btn-sm btn-outline">Ignorar</button>
                                    <button class="btn btn-sm btn-primary ml-2">Hacer Oferta</button>
                                </div>
                            </div>
                        `;
                        container.appendChild(div);
                    });
                });
        },
        
        initChart: function() {
            const ctx = document.getElementById('earningsChart');
            if(ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Ingresos ($)',
                            data: [120000, 190000, 150000, 220000, 180000, 250000],
                            borderColor: '#4E7A5C',
                            tension: 0.4,
                            fill: true,
                            backgroundColor: 'rgba(117, 81, 255, 0.1)'
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            }
        }
    };
})();
