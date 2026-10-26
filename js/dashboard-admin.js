/* c:\Users\juanc\OneDrive\Documentos\UMB\ChambaYa\js\dashboard-admin.js */
(function() {
    window.DashboardAdmin = {
        init: async function(user) {
            this.user = user;
            console.log("Iniciando Admin Dashboard");
            
            this.loadStats();
            this.loadUsersTable();
            this.initChart();
        },
        
        loadStats: async function() {
            try {
                // Mock stats since real querying across all collections can be heavy without aggregation
                document.getElementById('admin-users').textContent = "1,245";
                document.getElementById('admin-workers').textContent = "328";
                document.getElementById('admin-services').textContent = "4,500";
                document.getElementById('admin-reports').textContent = "12";
            } catch(e) { console.error("Error loading admin stats", e); }
        },
        
        loadUsersTable: function() {
            db.collection('usuarios').orderBy('fechaRegistro', 'desc').limit(10)
                .onSnapshot(snap => {
                    const tbody = document.getElementById('admin-users-table');
                    tbody.innerHTML = '';
                    if(snap.empty) {
                        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Sin usuarios</td></tr>';
                        return;
                    }
                    snap.forEach(doc => {
                        const u = doc.data();
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>
                                <div class="d-flex align-items-center">
                                    <img src="${u.foto || 'assets/default-avatar.png'}" class="avatar mr-2" width="30">
                                    ${u.nombre || 'Desconocido'}
                                </div>
                            </td>
                            <td>${u.email}</td>
                            <td><span class="badge ${u.rol==='trabajador'?'bg-primary':'bg-secondary'} text-white">${u.rol}</span></td>
                            <td><span class="badge bg-success text-white">Activo</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline text-danger">Suspender</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                });
        },
        
        initChart: function() {
            const ctx = document.getElementById('activityChart');
            if(ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
                        datasets: [
                            {
                                label: 'Nuevos Usuarios',
                                data: [12, 19, 15, 25, 22, 30, 28],
                                borderColor: '#B8914A',
                                tension: 0.4
                            },
                            {
                                label: 'Servicios Completados',
                                data: [5, 12, 8, 15, 10, 20, 25],
                                borderColor: '#4E7A5C',
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true
                    }
                });
            }
        }
    };
})();
