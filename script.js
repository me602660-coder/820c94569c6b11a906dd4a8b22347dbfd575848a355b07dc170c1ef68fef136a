// script.js
let map;
let userMarker = null;
let currentUser = null;
let currentMarkerMode = null;
let reportMarkers = [];

// === Funções de Login ===
function showEmployeeLoginForm() {
    document.getElementById('employeeLoginModal').style.display = 'block';
}
function showAdminLoginForm() {
    document.getElementById('adminLoginModal').style.display = 'block';
}
function closeEmployeeLoginModal() {
    document.getElementById('employeeLoginModal').style.display = 'none';
}
function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'none';
}

// === Cadastro de Funcionário ===
function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}
function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('registerForm').reset();
    document.getElementById('registerError').style.display = 'none';
}

// Validação e cadastro (frontend-only)
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            registerEmployee();
        });
    }
});

function registerEmployee() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('registerError');

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 4000);
    }

    if (!username || !password) {
        showError('Todos os campos são obrigatórios.');
        return;
    }
    if (password.length < 6) {
        showError('A senha deve ter pelo menos 6 caracteres.');
        return;
    }
    if (password !== confirmPassword) {
        showError('As senhas não coincidem.');
        return;
    }

    // Em produção: enviar para Supabase
    alert('✅ Funcionário cadastrado com sucesso!\nAgora ele pode fazer login.');
    closeRegisterModal();
}

// === Login Funcionário ===
function loginEmployee() {
    const username = document.getElementById('employeeUsername').value.trim();
    const password = document.getElementById('employeePassword').value.trim();
    const errorDiv = document.getElementById('employeeLoginError');

    if (username && password) {
        currentUser = { type: 'employee', username };
        closeEmployeeLoginModal();
        loadAppInterface();
    } else {
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 3000);
    }
}

// === Login Admin ===
function loginAdmin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const errorDiv = document.getElementById('adminLoginError');

    if (username === 'admin' && password === 'senha123') {
        currentUser = { type: 'admin', username };
        closeAdminLoginModal();
        loadAppInterface();
    } else {
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 3000);
    }
}

// === Carregar Interface do App ===
function loadAppInterface() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    initializeMap();
    updateUIForUser();

    // Verifica sessão salva
    const remember = document.querySelector('#rememberAdminLogin')?.checked || 
                     document.querySelector('#rememberEmployeeLogin')?.checked;
    if (remember) {
        localStorage.setItem('userSession', JSON.stringify(currentUser));
    }
}

// === Inicializar Mapa com Zoom Limitado ===
function initializeMap() {
    map = L.map('map', {
        center: [-7.8375, -35.5781],
        zoom: 13,
        maxZoom: 18, // ←←← LIMITE DE ZOOM PARA EVITAR ERRO
        layers: []
    });

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18 // ←←←
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });

    const baseMaps = {
        "Mapa (OSM)": osmLayer,
        "Satélite (Esri)": satelliteLayer
    };

    L.control.layers(baseMaps).addTo(map);
    osmLayer.addTo(map);

    map.on('click', function(e) {
        if (currentUser && (currentUser.type === 'admin' || currentUser.type === 'employee') && currentMarkerMode) {
            addReportMarker(e.latlng, currentMarkerMode);
        }
    });
}

// === Funções de Marcador ===
function addReportMarker(latlng, type) {
    let iconColor, iconText, typeName;
    switch(type) {
        case 'metralha': iconColor = '#e53e3e'; iconText = '🧱'; typeName = 'Metralha'; break;
        case 'entulho': iconColor = '#8B4513'; iconText = '🗑️'; typeName = 'Entulho'; break;
        case 'mato-verde': iconColor = '#2F855A'; iconText = '🌿'; typeName = 'Mato Verde'; break;
        case 'mato-seco': iconColor = '#ed8936'; iconText = '🍂'; typeName = 'Mato Seco'; break;
        default: iconColor = '#667eea'; iconText = '📍'; typeName = 'Desconhecido';
    }

    const markerIcon = L.divIcon({
        className: 'report-marker-icon',
        html: `<div style="
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${iconColor};
            color: white;
            border-radius: 50%;
            border: 3px solid white;
            font-size: 18px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
        ">${iconText}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    const marker = L.marker(latlng, { icon: markerIcon }).addTo(map);
    marker.reportData = {
        id: Date.now(),
        type: type,
        typeName: typeName,
        latlng: latlng,
        status: 'pending',
        createdAt: new Date(),
        description: '',
        priority: '',
        photoUrl: null
    };

    reportMarkers.push(marker);
    openReportModal(latlng, type, marker);

    marker.on('click', function() {
        if (currentUser && (currentUser.type === 'admin' || currentUser.type === 'employee')) {
            showMarkerDetails(marker);
        } else {
            marker.bindPopup(`<strong>${typeName}</strong><br>Status: Pendente<br><small>Reportado em: ${marker.reportData.createdAt.toLocaleDateString()}</small>`).openPopup();
        }
    });

    updateReportsList();
}

function openReportModal(latlng, type, marker) {
    const typeName = getReportTypeName(type);
    document.getElementById('problemType').value = typeName;
    document.getElementById('reportLocation').value = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
    document.getElementById('reportModal').style.display = 'block';
    document.getElementById('reportForm').onsubmit = function(e) {
        e.preventDefault();
        submitReport(latlng, type, marker);
    };
}

function submitReport(latlng, type, marker) {
    const description = document.getElementById('description').value;
    const priority = document.getElementById('priority').value;
    const photoFile = document.getElementById('photo').files[0];

    marker.reportData.description = description;
    marker.reportData.priority = priority;

    if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            marker.reportData.photoUrl = e.target.result;
            finalizeReport(marker);
        };
        reader.readAsDataURL(photoFile);
    } else {
        finalizeReport(marker);
    }
}

function finalizeReport(marker) {
    let content = `
        <strong>${marker.reportData.typeName}</strong><br>
        <strong>Descrição:</strong> ${marker.reportData.description || 'Nenhuma'}<br>
        <strong>Prioridade:</strong> ${marker.reportData.priority || 'Não definida'}<br>
        <strong>Status:</strong> Pendente<br>
        <small>Reportado em: ${marker.reportData.createdAt.toLocaleString()}</small>
    `;
    if (marker.reportData.photoUrl) {
        content += `<br><img src="${marker.reportData.photoUrl}" style="width:100%;max-height:150px;object-fit:cover;border-radius:5px;margin-top:10px;">`;
    }
    marker.bindPopup(content);
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportForm').reset();
    updateReportsList();
}

// === Detalhes e Gerenciamento ===
function showMarkerDetails(marker) {
    const d = marker.reportData;
    let statusText = 'Pendente', statusClass = 'pending';
    if (d.status === 'progress') { statusText = 'Em Progresso'; statusClass = 'progress'; }
    else if (d.status === 'completed') { statusText = 'Concluído'; statusClass = 'completed'; }

    document.getElementById('markerDetailsContent').innerHTML = `
        <h4>${d.typeName}</h4>
        <p><strong>Localização:</strong> Lat ${d.latlng.lat.toFixed(6)}, Lng ${d.latlng.lng.toFixed(6)}</p>
        <p><strong>Descrição:</strong> ${d.description || 'Nenhuma'}</p>
        <p><strong>Prioridade:</strong> ${d.priority || 'Não definida'}</p>
        <p><strong>Status:</strong> <span class="status ${statusClass}">${statusText}</span></p>
        <p><strong>Reportado em:</strong> ${d.createdAt.toLocaleString()}</p>
        ${d.photoUrl ? `<img src="${d.photoUrl}" style="width:100%;max-height:200px;object-fit:cover;border-radius:5px;margin-top:10px;">` : ''}
    `;
    document.getElementById('markerDetailsModal').style.display = 'block';
}

function markAsCompleted() {
    const m = reportMarkers.find(m => m.reportData.id);
    if (m) {
        m.reportData.status = 'completed';
        updateReportsList();
        closeMarkerDetailsModal();
    }
}

function removeMarker() {
    if (currentUser.type !== 'admin') {
        alert('⛔️ Apenas administradores podem remover marcadores.');
        return;
    }
    const m = reportMarkers.find(m => m.reportData.id);
    if (m) {
        map.removeLayer(m);
        reportMarkers = reportMarkers.filter(x => x !== m);
        updateReportsList();
        closeMarkerDetailsModal();
    }
}

// === Sincronização da Lista ===
function updateReportsList() {
    const list = document.getElementById('reportsList');
    list.innerHTML = '';
    if (reportMarkers.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#666;padding:1rem;">Nenhum relatório encontrado.</p>';
        return;
    }
    const sorted = [...reportMarkers].sort((a, b) => b.reportData.createdAt - a.reportData.createdAt);
    sorted.forEach(m => {
        const d = m.reportData;
        let statusText = 'Pendente', statusClass = 'pending';
        if (d.status === 'progress') { statusText = 'Em Progresso'; statusClass = 'progress'; }
        else if (d.status === 'completed') { statusText = 'Concluído'; statusClass = 'completed'; }

        const item = document.createElement('div');
        item.className = 'report-item';
        item.innerHTML = `
            <div class="report-header">
                <span class="report-type">${getReportTypeEmoji(d.type)}</span>
                <span class="status ${statusClass}">${statusText}</span>
            </div>
            <p>Lat: ${d.latlng.lat.toFixed(4)}, Lng: ${d.latlng.lng.toFixed(4)}</p>
            <small>Reportado em: ${d.createdAt.toLocaleString()}</small>
        `;
        item.addEventListener('click', () => {
            map.setView(d.latlng, 18);
            m.openPopup();
        });
        list.appendChild(item);
    });
}

// === Auxiliares ===
function getReportTypeEmoji(t) {
    return t === 'metralha' ? '🧱' : t === 'entulho' ? '🗑️' : t === 'mato-verde' ? '🌿' : t === 'mato-seco' ? '🍂' : '📍';
}
function getReportTypeName(t) {
    return t === 'metralha' ? 'Metralha' : t === 'entulho' ? 'Entulho' : t === 'mato-verde' ? 'Mato Verde' : t === 'mato-seco' ? 'Mato Seco' : 'Desconhecido';
}

function setMarkerMode(type) {
    currentMarkerMode = type;
    updateMarkerButtons();
}
function updateMarkerButtons() {
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    const active = document.querySelector(`.${currentMarkerMode}-btn`);
    if (active) active.classList.add('active');
}

// === Localização ===
function requestLocation() {
    if (!navigator.geolocation) {
        alert("⚠️ Seu navegador não suporta Geolocalização.");
        return;
    }
    const btn = document.getElementById('locationBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '📍 Buscando...';
    btn.disabled = true;

    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 18);
            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.marker([latitude, longitude], {
                icon: L.divIcon({
                    className: 'user-location-icon',
                    html: `<div style="width:24px;height:24px;border-radius:50%;background:#48bb78;border:3px solid white;box-shadow:0 0 0 2px #48bb78,0 0 10px rgba(72,187,120,0.8);animation:pulse 1.5s infinite;"></div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(map);
            userMarker.bindPopup(`
                <strong>📍 Sua Localização</strong><br>
                Latitude: ${latitude.toFixed(6)}<br>
                Longitude: ${longitude.toFixed(6)}<br>
                Precisão: ±${pos.coords.accuracy.toFixed(2)} metros<br>
                <small>Última atualização: ${new Date().toLocaleTimeString()}</small>
            `).openPopup();
            btn.innerHTML = original;
            btn.disabled = false;
        },
        (err) => {
            console.error("Erro na localização:", err);
            alert("❌ Não foi possível obter sua localização.");
            btn.innerHTML = original;
            btn.disabled = false;
        },
        options
    );
}

// === Controle de Sessão e Logout ===
function logout() {
    currentUser = null;
    localStorage.removeItem('userSession');
    document.getElementById('appPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
    if (map) {
        map.remove();
        map = null;
        reportMarkers = [];
    }
}

function updateUIForUser() {
    const logoutBtn = document.getElementById('logoutBtn');
    const adminPanel = document.getElementById('adminPanel');
    const empBtn = document.getElementById('employeeLoginBtn');

    if (currentUser.type === 'admin') {
        logoutBtn.style.display = 'inline-block';
        adminPanel.style.display = 'block';
        empBtn.style.display = 'none';
    } else if (currentUser.type === 'employee') {
        logoutBtn.style.display = 'inline-block';
        adminPanel.style.display = 'none';
        empBtn.style.display = 'none';
    }
}

// === Carregar sessão salva ===
document.addEventListener('DOMContentLoaded', function() {
    const saved = localStorage.getItem('userSession');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            if (currentUser.type === 'admin' || currentUser.type === 'employee') {
                loadAppInterface();
            }
        } catch (e) {
            console.error("Erro ao carregar sessão:", e);
            localStorage.removeItem('userSession');
        }
    }
});

// === Funções Auxiliares de Modal ===
function searchLocation() { document.getElementById('locationModal').style.display = 'block'; }
function closeLocationModal() { document.getElementById('locationModal').style.display = 'none'; }
function searchAddress() { alert("Busca por endereço não implementada."); closeLocationModal(); }
function goToLocation(lat, lng, name) {
    map.setView([lat, lng], 15);
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lng]).addTo(map).bindPopup(`📍 ${name}`).openPopup();
    closeLocationModal();
}
function closeModal() { document.getElementById('reportModal').style.display = 'none'; }
function closeMarkerDetailsModal() { document.getElementById('markerDetailsModal').style.display = 'none'; }
function openEmployeeLoginModal() { document.getElementById('employeeLoginModal').style.display = 'block'; }
function openAdminLoginModal() { document.getElementById('adminLoginModal').style.display = 'block'; }
function manageUsers() { alert("Gerenciamento de funcionários ainda não implementado."); }
