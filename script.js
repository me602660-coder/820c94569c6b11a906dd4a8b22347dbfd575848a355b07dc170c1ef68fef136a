// Variáveis globais
let map;
let currentUserType = 'citizen'; // Default para cidadão, será alterado pelo login
let currentMarkerMode = null;
let markers = []; // Armazenará objetos { id, latlng, type, description, photo, marker: L.Marker }
let employeeMarkers = [];
let selectedMarker = null;

let osmLayer;
let satelliteLayer;

// Funções globais (definidas no escopo window)
window.requestLocation = function() {
    getUserLocation();
}

window.searchLocation = function() {
    document.getElementById('locationModal').style.display = 'block';
}

window.closeLocationModal = function() {
    document.getElementById('locationModal').style.display = 'none';
}

window.closeModal = function() {
    document.getElementById('reportModal').style.display = 'none';
}

window.openAdminLoginModal = function() {
    document.getElementById('adminLoginModal').style.display = 'block';
    // Verificar se há login salvo
    const savedAdminLogin = localStorage.getItem('adminLogin');
    if (savedAdminLogin) {
        const loginData = JSON.parse(savedAdminLogin);
        document.getElementById('adminUsername').value = loginData.username;
        document.getElementById('rememberAdminLogin').checked = true;
    }
}

window.closeAdminLoginModal = function() {
    document.getElementById('adminLoginModal').style.display = 'none';
    document.getElementById('adminUsername').value = '';
    document.getElementById('adminPassword').value = '';
    document.getElementById('rememberAdminLogin').checked = false;
}

window.openEmployeeLoginModal = function() {
    document.getElementById('employeeLoginModal').style.display = 'block';
    // Verificar se há login salvo
    const savedEmployeeLogin = localStorage.getItem('employeeLogin');
    if (savedEmployeeLogin) {
        const loginData = JSON.parse(savedEmployeeLogin);
        document.getElementById('employeeUsername').value = loginData.username;
        document.getElementById('rememberEmployeeLogin').checked = true;
    }
}

window.closeEmployeeLoginModal = function() {
    document.getElementById('employeeLoginModal').style.display = 'none';
    document.getElementById('employeeUsername').value = '';
    document.getElementById('employeePassword').value = '';
    document.getElementById('rememberEmployeeLogin').checked = false;
}

window.loginAdmin = function() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    const rememberLogin = document.getElementById('rememberAdminLogin').checked;

    // Credenciais de admin (exemplo simples)
    if (username === 'adm' && password === '12345') {
        setUserType('admin');
        
        // Salvar login se solicitado
        if (rememberLogin) {
            localStorage.setItem('adminLogin', JSON.stringify({ username: username }));
        } else {
            localStorage.removeItem('adminLogin');
        }
        
        closeAdminLoginModal();
        showNotification('Login de administrador bem-sucedido!', 'info');
    } else {
        showNotification('Usuário ou senha incorretos. Tente novamente.', 'error');
    }
}

window.loginEmployee = function() {
    const username = document.getElementById('employeeUsername').value;
    const password = document.getElementById('employeePassword').value;
    const rememberLogin = document.getElementById('rememberEmployeeLogin').checked;

    // Credenciais de funcionário (exemplo simples)
    if (username === 'funcionario' && password === '123') {
        setUserType('employee');
        
        // Salvar login se solicitado
        if (rememberLogin) {
            localStorage.setItem('employeeLogin', JSON.stringify({ username: username }));
        } else {
            localStorage.removeItem('employeeLogin');
        }
        
        closeEmployeeLoginModal();
        showNotification('Login de funcionário bem-sucedido!', 'info');
    } else {
        showNotification('Usuário ou senha incorretos. Tente novamente.', 'error');
    }
}

window.setMarkerMode = function(mode) {
    currentMarkerMode = mode;

    document.querySelectorAll('.marker-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`.${mode}-btn`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

window.logout = function() {
    currentUserType = 'citizen';
    
    // Limpar logins salvos
    localStorage.removeItem('adminLogin');
    localStorage.removeItem('employeeLogin');
    
    // Resetar interface
    document.querySelectorAll('.user-type').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Esconder tracker de funcionários
    document.getElementById('employeeTracker').style.display = 'none';
    clearEmployeeMarkers();
    
    // Esconder botões de adicionar marcador
    const addMarkerButtons = document.querySelectorAll('.marker-btn.metralha-btn, .marker-btn.entulho-btn, .marker-btn.mato-verde-btn, .marker-btn.mato-seco-btn');
    addMarkerButtons.forEach(btn => btn.style.display = 'none');
    
    // Esconder botão de logout e mostrar botões de login
    document.getElementById('logoutBtn').style.display = 'none';
    document.querySelector('.employee').style.display = 'inline-block';
    document.querySelector('.admin').style.display = 'inline-block';
    
    showNotification('Logout realizado com sucesso!', 'info');
    
    // Recarregar marcadores para remover funcionalidades de admin
    loadMarkersFromSupabase();
}

window.goToLocation = function(lat, lng, placeName) {
    // Remover marcador de localização do usuário existente
    map.eachLayer(function(layer) {
        if (layer.options && layer.options.className === 'user-location-marker') {
            map.removeLayer(layer);
        }
    });

    map.setView([lat, lng], 16);

    const userIcon = L.divIcon({
        html: `<div style="background: #667eea; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 4px solid white; box-shadow: 0 3px 15px rgba(0,0,0,0.3);">📍</div>`,
        className: 'user-location-marker',
        iconSize: [40, 40]
    });

    L.marker([lat, lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>📍 ${placeName}</b><br>Sua localização atual`)
        .openPopup();

    updateExampleMarkersNearUser(lat, lng);
    showNotification(`Localização definida: ${placeName}`, 'info');
    closeLocationModal();
}

function searchAddress() {
    const address = document.getElementById('addressInput').value.trim();
    if (!address) {
        showNotification('Por favor, digite um endereço!', 'warning');
        return;
    }

    showNotification('Buscando endereço...', 'info', 2000);

    // Usar Nominatim para geocodificação
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                goToLocation(lat, lng, data[0].display_name);
                closeLocationModal();
            } else {
                showNotification('Endereço não encontrado. Tente novamente.', 'warning', 4000);
            }
        })
        .catch(error => {
            console.error('Erro ao buscar endereço:', error);
            showNotification('Erro ao buscar endereço. Tente novamente.', 'error', 4000);
        });
}

// Inicializar mapa
function initMap() {
    map = L.map('map', {
        center: [-8.5709, -36.8736],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true
    });

    // Camada OpenStreetMap padrão
    osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
    });

    // Camada de satélite do Esri World Imagery
    satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    });

    // Adicionar a camada de satélite por padrão
    satelliteLayer.addTo(map);

    // Controlo de camadas
    const baseMaps = {
        "Satélite": satelliteLayer,
        "Ruas": osmLayer
    };

    L.control.layers(baseMaps).addTo(map);

    map.on('click', function(e) {
        if (currentMarkerMode) {
            if (currentUserType === 'admin') {
                addMarker(e.latlng, currentMarkerMode, false);
            } else {
                showNotification('Apenas administradores podem adicionar marcadores.', 'error');
            }
        }
    });

    if (currentUserType === 'employee' || currentUserType === 'admin') {
        simulateEmployeeLocations();
    }

    addExampleMarkers();
    getUserLocation();
}

function getUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                goToLocation(lat, lng, 'Sua Localização');
            },
            function(error) {
                showNotification('Não foi possível obter sua localização. Use "Buscar Endereço".', 'warning', 4000);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        showNotification('Geolocalização não é suportada por este navegador.', 'error', 4000);
    }
}

function setUserType(type) {
    currentUserType = type;

    document.querySelectorAll('.user-type').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar/esconder botões baseado no tipo de usuário
    if (type === 'admin' || type === 'employee') {
        document.getElementById('logoutBtn').style.display = 'inline-block';
        document.querySelector('.employee').style.display = 'none';
        document.querySelector('.admin').style.display = 'none';
    } else {
        document.getElementById('logoutBtn').style.display = 'none';
        document.querySelector('.employee').style.display = 'inline-block';
        document.querySelector('.admin').style.display = 'inline-block';
    }

    const tracker = document.getElementById('employeeTracker');
    if (type === 'employee' || type === 'admin') {
        tracker.style.display = 'block';
        simulateEmployeeLocations();
    } else {
        tracker.style.display = 'none';
        clearEmployeeMarkers();
    }

    // Ajustar visibilidade dos botões de adicionar marcador para admin
    const addMarkerButtons = document.querySelectorAll('.marker-btn.metralha-btn, .marker-btn.entulho-btn, .marker-btn.mato-verde-btn, .marker-btn.mato-seco-btn');
    if (currentUserType === 'admin') {
        addMarkerButtons.forEach(btn => btn.style.display = 'block');
    } else {
        addMarkerButtons.forEach(btn => btn.style.display = 'none');
    }
}

async function addMarker(latlng, type, isAdminAction = false, description = '', photoFile = null) {
    let photoUrl = null;
    if (photoFile) {
        const filePath = `${Date.now()}-${photoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('photos')
            .upload(filePath, photoFile);

        if (uploadError) {
            console.error('Erro ao fazer upload da foto:', uploadError);
            showNotification('Erro ao fazer upload da foto.', 'error');
            return;
        }
        photoUrl = supabaseClient.storage.from('photos').getPublicUrl(filePath).data.publicUrl;
    }
    
    const typeLabels = { 
        'metralha': 'Metralha', 
        'entulho': 'Entulho', 
        'mato-verde': 'Mato Verde', 
        'mato-seco': 'Mato Seco' 
    };
    
    // Criar ícone personalizado com cor correspondente
    const markerColor = getMarkerColor(type);
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${markerColor}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 12]
    });
    
    const marker = L.marker(latlng, { icon: customIcon }).addTo(map);

    const markerData = {
        id: Date.now(),
        latlng: latlng,
        type: type,
        description: description,
        photo: photoUrl,
        marker: marker,
        location: '',
        priority: '',
        estimatedSize: '',
        additionalNotes: '',
        timestamp: new Date().toLocaleString('pt-BR')
    };

    // Salvar marcador no Supabase
    const { data, error } = await supabaseClient
        .from("markers")
        .insert([
            {
                lat: latlng.lat,
                lng: latlng.lng,
                type: type,
                description: description,
                photo: photoUrl,
                location: markerData.location,
                priority: markerData.priority,
                estimated_size: markerData.estimatedSize,
                additional_notes: markerData.additionalNotes,
                timestamp: new Date().toISOString(),
            },
        ])
        .select();

    if (error) {
        console.error("Erro ao salvar marcador no Supabase:", error);
        showNotification("Erro ao salvar marcador.", "error");
        map.removeLayer(marker);
        return;
    }

    markerData.id = data[0].id;
    markers.push(markerData);

    const popupContent = `
        <div style="text-align: center;">
            <h4>${typeLabels[type] || type}</h4>
            ${currentUserType === 'admin' ? '<p>Clique para ver detalhes (Admin)</p>' : (description ? `<p>${description}</p>` : '')}
            ${photoUrl ? `<img src="${photoUrl}" style="max-width: 100px; height: auto; margin-top: 10px;">` : ''}
        </div>
    `;

    marker.bindPopup(popupContent);

    // Adicionar evento de clique para admins verem detalhes
    if (currentUserType === 'admin') {
        marker.on('click', function() {
            showMarkerDetails(markerData);
        });
    }

    if (currentUserType === 'admin' && !isAdminAction) {
        document.getElementById('problemType').value = typeLabels[type] || type;
        document.getElementById('reportModal').style.display = 'block';
        document.getElementById('reportLocation').value = '';
        document.getElementById('description').value = '';
        document.getElementById('priority').value = '';
        document.getElementById('photo').value = '';
    } else if (isAdminAction) {
        showNotification(`Marcador de ${typeLabels[type] || type} adicionado pelo Admin.`, 'info');
    }
    
    updateReportsList();
}

function getMarkerColor(type) {
    const colors = {
        'metralha': '#e53e3e',
        'entulho': '#8B4513',
        'mato-verde': '#2F855A',
        'mato-seco': '#ed8936'
    };
    return colors[type] || '#667eea';
}

function getTypeLabel(type) {
    const labels = {
        'metralha': 'Metralha',
        'entulho': 'Entulho',
        'mato-verde': 'Mato Verde',
        'mato-seco': 'Mato Seco'
    };
    return labels[type] || type;
}

function simulateEmployeeLocations() {
    clearEmployeeMarkers();
}

function clearEmployeeMarkers() {
    employeeMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    employeeMarkers = [];
}

// Função para carregar marcadores existentes do Supabase
async function loadMarkersFromSupabase() {
    try {
        const { data: markersData, error } = await supabaseClient
            .from('markers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar marcadores:', error);
            showNotification('Erro ao carregar marcadores existentes.', 'error');
            return;
        }

        // Limpar marcadores existentes
        markers.forEach(markerData => {
            if (markerData.marker) {
                map.removeLayer(markerData.marker);
            }
        });
        markers = [];

        // Adicionar marcadores carregados do banco
        markersData.forEach(markerData => {
            const latlng = { lat: markerData.lat, lng: markerData.lng };
            const type = markerData.type;
            const description = markerData.description || '';
            const photo = markerData.photo;

            // Criar ícone personalizado
            const markerColor = getMarkerColor(type);
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${markerColor}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            });

            const marker = L.marker(latlng, { icon: customIcon }).addTo(map);

            const newMarkerData = {
                id: markerData.id,
                latlng: latlng,
                type: type,
                description: description,
                photo: photo,
                marker: marker,
                location: markerData.location,
                priority: markerData.priority,
                estimatedSize: markerData.estimated_size,
                additionalNotes: markerData.additional_notes,
                timestamp: markerData.timestamp,
                status: markerData.status || 'pending'
            };

            markers.push(newMarkerData);

            const typeLabels = { 
                'metralha': 'Metralha', 
                'entulho': 'Entulho', 
                'mato-verde': 'Mato Verde', 
                'mato-seco': 'Mato Seco' 
            };

            const popupContent = `
                <div style="text-align: center;">
                    <h4>${typeLabels[type] || type}</h4>
                    ${currentUserType === 'admin' ? '<p>Clique para ver detalhes (Admin)</p>' : (description ? `<p>${description}</p>` : '')}
                    ${photo ? `<img src="${photo}" style="max-width: 100px; height: auto; margin-top: 10px;">` : ''}
                </div>
            `;

            marker.bindPopup(popupContent);

            if (currentUserType === 'admin') {
                marker.on('click', function() {
                    showMarkerDetails(newMarkerData);
                });
            }
        });

        updateReportsList();
        showNotification(`${markersData.length} marcadores carregados do banco de dados.`, 'info');

    } catch (error) {
        console.error('Erro ao carregar marcadores:', error);
        showNotification('Erro ao conectar com o banco de dados.', 'error');
    }
}

// Função para remover marcador do Supabase
async function removeMarkerFromSupabase(markerId) {
    try {
        const { error } = await supabaseClient
            .from('markers')
            .delete()
            .eq('id', markerId);

        if (error) {
            console.error('Erro ao remover marcador do Supabase:', error);
            showNotification('Erro ao remover marcador do banco de dados.', 'error');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erro ao remover marcador:', error);
        showNotification('Erro ao conectar com o banco de dados.', 'error');
        return false;
    }
}

// Função para atualizar status do marcador no Supabase
async function updateMarkerStatusInSupabase(markerId, status) {
    try {
        const { error } = await supabaseClient
            .from('markers')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', markerId);

        if (error) {
            console.error('Erro ao atualizar status do marcador:', error);
            showNotification('Erro ao atualizar status no banco de dados.', 'error');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erro ao atualizar marcador:', error);
        showNotification('Erro ao conectar com o banco de dados.', 'error');
        return false;
    }
}

function addExampleMarkers() {
    loadMarkersFromSupabase();
}

function updateExampleMarkersNearUser(userLat, userLng) {
    updateReportsList();
}

function showNotification(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    const colors = { info: '#48bb78', warning: '#ed8936', error: '#f56565' };

    notification.innerHTML = `
        <div style="position: fixed; top: 100px; right: 20px; background: ${colors[type]}; color: white; padding: 1rem 1.5rem; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); z-index: 2000; max-width: 350px;">${message}</div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, duration);
}

async function updateReportsList() {
    const reportsListDiv = document.getElementById('reportsList');
    reportsListDiv.innerHTML = '';

    const realMarkers = markers.filter(markerData => markerData.marker && map.hasLayer(markerData.marker));

    if (realMarkers.length === 0) {
        reportsListDiv.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">Nenhum relatório encontrado.</p>';
        return;
    }

    realMarkers.forEach(markerData => {
        const reportItem = document.createElement('div');
        reportItem.classList.add('report-item');

        const typeLabels = { 
            'metralha': 'Metralha', 
            'entulho': 'Entulho', 
            'mato-verde': 'Mato Verde', 
            'mato-seco': 'Mato Seco' 
        };
        const typeLabel = typeLabels[markerData.type] || markerData.type;
        const statusClass = markerData.status || 'pending';
        const statusText = statusClass === 'pending' ? 'Pendente' : (statusClass === 'progress' ? 'Em Progresso' : 'Concluído');

        let photoHtml = '';
        if (markerData.photo) {
            photoHtml = `<img src="${markerData.photo}" style="max-width: 100%; height: auto; margin-top: 10px; border-radius: 5px;">`;
        }

        let priorityHtml = '';
        if (markerData.priority) {
            const priorityColors = {
                'baixa': '#48bb78',
                'media': '#ed8936', 
                'alta': '#f56565',
                'urgente': '#e53e3e'
            };
            priorityHtml = `<span style="background: ${priorityColors[markerData.priority]}; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin-left: 0.5rem;">${markerData.priority.charAt(0).toUpperCase() + markerData.priority.slice(1)}</span>`;
        }

        reportItem.innerHTML = `
            <div class="report-header">
                <span class="report-type ${markerData.type}-btn">${typeLabel}</span>
                <span class="status ${statusClass}">${statusText}</span>
            </div>
            <p><strong>${markerData.location || markerData.description || 'Sem descrição'}</strong>${priorityHtml}</p>
            ${photoHtml}
            <small>Coordenadas: ${markerData.latlng.lat.toFixed(4)}, ${markerData.latlng.lng.toFixed(4)}</small>
        `;
        
        reportItem.addEventListener("click", function() {
            showMarkerDetails(markerData);
        });
        
        reportsListDiv.appendChild(reportItem);
    });
}

// Função para configurar sincronização em tempo real
function setupRealtimeSync() {
    const markersSubscription = supabaseClient
        .channel('markers-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'markers' 
            }, 
            (payload) => {
                console.log('Mudança detectada:', payload);
                
                if (payload.eventType === 'INSERT') {
                    showNotification('Novo marcador adicionado por outro usuário.', 'info');
                    loadMarkersFromSupabase();
                } else if (payload.eventType === 'UPDATE') {
                    showNotification('Marcador atualizado por outro usuário.', 'info');
                    loadMarkersFromSupabase();
                } else if (payload.eventType === 'DELETE') {
                    showNotification('Marcador removido por outro usuário.', 'info');
                    loadMarkersFromSupabase();
                }
            }
        )
        .subscribe();

    return markersSubscription;
}

// Função para mostrar detalhes do marcador (Admin)
function showMarkerDetails(markerData) {
    if (currentUserType !== 'admin') {
        showNotification('Apenas administradores podem ver detalhes dos marcadores.', 'error');
        return;
    }
    
    selectedMarker = markerData;
    
    const detailsContent = document.getElementById('markerDetailsContent');
    detailsContent.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <h4 style="color: ${getMarkerColor(markerData.type)}; margin-bottom: 0.5rem;">
                ${getTypeLabel(markerData.type)}
            </h4>
            <p><strong>ID:</strong> ${markerData.id}</p>
            <p><strong>Data/Hora:</strong> ${markerData.timestamp}</p>
            <p><strong>Coordenadas:</strong> ${markerData.latlng.lat.toFixed(6)}, ${markerData.latlng.lng.toFixed(6)}</p>
        </div>
        
        <div style="margin-bottom: 1rem;">
            <h5>Detalhes do Relatório:</h5>
            <p><strong>Localização:</strong> ${markerData.location || 'Não informado'}</p>
            <p><strong>Descrição:</strong> ${markerData.description || 'Não informado'}</p>
            <p><strong>Prioridade:</strong> ${markerData.priority || 'Não informado'}</p>
        </div>
        
        ${markerData.photo ? `
            <div style="margin-bottom: 1rem;">
                <h5>Foto:</h5>
                <img src="${markerData.photo}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            </div>
        ` : ''}
        
        <div style="background: #f7fafc; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
            <h5>Ações Administrativas:</h5>
            <p style="font-size: 0.9rem; color: #666;">Use os botões abaixo para gerenciar este marcador.</p>
        </div>
    `;
    
    document.getElementById('markerDetailsModal').style.display = 'block';
}

// Função para fechar modal de detalhes
window.closeMarkerDetailsModal = function() {
    document.getElementById('markerDetailsModal').style.display = 'none';
    selectedMarker = null;
}

// Função para remover marcador selecionado
window.removeMarker = async function() {
    if (!selectedMarker) {
        showNotification('Nenhum marcador selecionado.', 'error');
        return;
    }
    
    if (currentUserType !== 'admin') {
        showNotification('Apenas administradores podem remover marcadores.', 'error');
        return;
    }
    
    const success = await removeMarkerFromSupabase(selectedMarker.id);
    if (success) {
        const index = markers.findIndex(m => m.id === selectedMarker.id);
        if (index !== -1) {
            map.removeLayer(markers[index].marker);
            markers.splice(index, 1);
            showNotification('Marcador removido com sucesso.', 'info');
            updateReportsList();
            closeMarkerDetailsModal();
        } else {
            showNotification('Erro ao remover marcador.', 'error');
        }
    }
}

// Função para marcar como concluído
window.markAsCompleted = async function() {
    if (!selectedMarker) {
        showNotification('Nenhum marcador selecionado.', 'error');
        return;
    }
    
    if (currentUserType !== 'admin') {
        showNotification('Apenas administradores podem marcar como concluído.', 'error');
        return;
    }
    
    const success = await updateMarkerStatusInSupabase(selectedMarker.id, 'completed');
    if (success) {
        selectedMarker.status = 'completed';
        selectedMarker.completedAt = new Date().toLocaleString('pt-BR');
        
        const completedIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #48bb78; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); opacity: 0.7;"></div>`,
            iconSize: [25, 25],
            iconAnchor: [12, 12]
        });
        
        selectedMarker.marker.setIcon(completedIcon);
        
        showNotification('Marcador marcado como concluído.', 'info');
        updateReportsList();
        closeMarkerDetailsModal();
    }
}

// Inicializar quando carregar
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    
    setupRealtimeSync();

    document.getElementById('reportForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const description = document.getElementById('description').value;
        const location = document.getElementById('reportLocation').value;
        const priority = document.getElementById('priority').value;
        const photoInput = document.getElementById('photo');
        const photoFile = photoInput.files[0];
        let photoUrl = null;

        if (photoFile) {
            const filePath = `${Date.now()}-${photoFile.name}`;
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('photos')
                .upload(filePath, photoFile);

            if (uploadError) {
                console.error('Erro ao fazer upload da foto:', uploadError);
                showNotification('Erro ao fazer upload da foto.', 'error');
                return;
            }
            photoUrl = supabaseClient.storage.from('photos').getPublicUrl(filePath).data.publicUrl;
        }

        const lastMarkerData = markers[markers.length - 1];
        if (lastMarkerData) {
            lastMarkerData.description = description;
            lastMarkerData.location = location;
            lastMarkerData.priority = priority;
            lastMarkerData.photo = photoUrl;
            
            const typeLabels = { 
                'metralha': 'Metralha', 
                'entulho': 'Entulho', 
                'mato-verde': 'Mato Verde', 
                'mato-seco': 'Mato Seco' 
            };
            
            let priorityBadge = '';
            if (priority) {
                const priorityColors = {
                    'baixa': '#48bb78',
                    'media': '#ed8936', 
                    'alta': '#f56565',
                    'urgente': '#e53e3e'
                };
                priorityBadge = `<span style="background: ${priorityColors[priority]}; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin: 0.5rem 0; display: inline-block;">${priority.charAt(0).toUpperCase() + priority.slice(1)}</span><br>`;
            }
            
            const newPopupContent = `
                <div style="text-align: center; max-width: 200px;">
                    <h4>${typeLabels[lastMarkerData.type]}</h4>
                    <p><strong>${location}</strong></p>
                    ${priorityBadge}
                    <p style="font-size: 0.9rem;">${description}</p>
                    ${photoUrl ? `<img src="${photoUrl}" style="max-width: 150px; height: auto; margin-top: 10px; border-radius: 5px;">` : ''}
                </div>
            `;
            lastMarkerData.marker.setPopupContent(newPopupContent);
            updateReportsList();
            showNotification('Relatório enviado com sucesso!', 'info');
        }
        closeModal();
    });

    document.getElementById('addressInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchAddress();
        }
    });

    const addMarkerButtons = document.querySelectorAll('.marker-btn.metralha-btn, .marker-btn.entulho-btn, .marker-btn.mato-verde-btn, .marker-btn.mato-seco-btn');
    addMarkerButtons.forEach(btn => btn.style.display = 'none');
    
    const savedAdminLogin = localStorage.getItem('adminLogin');
    const savedEmployeeLogin = localStorage.getItem('employeeLogin');
    
    if (savedAdminLogin) {
        setUserType('admin');
        showNotification('Login de administrador restaurado automaticamente', 'info');
    } else if (savedEmployeeLogin) {
        setUserType('employee');
        showNotification('Login de funcionário restaurado automaticamente', 'info');
    }
});
