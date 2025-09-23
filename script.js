// script.js

// Variáveis globais
let map;
let userMarker = null;
let currentUser = null;
let currentMarkerMode = null;
let reportMarkers = [];

// Função para mostrar o modal de login de Funcionário
function showEmployeeLoginForm() {
    document.getElementById('employeeLoginModal').style.display = 'block';
}

// Função para mostrar o modal de login de Administrador
function showAdminLoginForm() {
    document.getElementById('adminLoginModal').style.display = 'block';
}

// Função para fechar modais
function closeEmployeeLoginModal() {
    document.getElementById('employeeLoginModal').style.display = 'none';
}

function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'none';
}

// ================= FUNÇÕES DE LOGIN =================
function loginEmployee() {
    const username = document.getElementById('employeeUsername').value.trim();
    const password = document.getElementById('employeePassword').value.trim();
    const remember = document.getElementById('rememberEmployeeLogin').checked;
    const errorDiv = document.getElementById('employeeLoginError');

    // Validação simples (substitua por chamada à API em produção)
    if (username && password) { // Aceita qualquer usuário/senha não vazia para funcionários
        currentUser = {
            type: 'employee',
            username: username
        };

        if (remember) {
            localStorage.setItem('userSession', JSON.stringify(currentUser));
        }

        closeEmployeeLoginModal();
        loadAppInterface(); // Carrega a interface do app
    } else {
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function loginAdmin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const remember = document.getElementById('rememberAdminLogin').checked;
    const errorDiv = document.getElementById('adminLoginError');

    // Validação para administrador
    if (username === 'admin' && password === 'senha123') {
        currentUser = {
            type: 'admin',
            username: username
        };

        if (remember) {
            localStorage.setItem('userSession', JSON.stringify(currentUser));
        }

        closeAdminLoginModal();
        loadAppInterface(); // Carrega a interface do app
    } else {
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// Função para carregar a interface principal do aplicativo
function loadAppInterface() {
    // Esconde a página de login
    document.getElementById('loginPage').style.display = 'none';
    // Mostra a interface do app
    document.getElementById('appPage').style.display = 'block';

    // Inicializa o mapa
    initializeMap();

    // Atualiza a UI com base no tipo de usuário
    updateUIForUser();

    // Verifica se há sessão salva ao recarregar a página
    window.addEventListener('beforeunload', function() {
        // Nada específico a fazer aqui, mas você pode adicionar lógica de limpeza se necessário
    });
}

// Função para inicializar o mapa
function initializeMap() {
    map = L.map('map', {
        center: [-7.8375, -35.5781],
        zoom: 13,
        layers: []
    });

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
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

    // Evento de clique no mapa (somente se for admin e tiver um modo ativo)
    map.on('click', function(e) {
        if (currentUser && currentUser.type === 'admin' && currentMarkerMode) {
            addReportMarker(e.latlng, currentMarkerMode);
        } else if (currentUser && currentUser.type === 'employee' && currentMarkerMode) {
            // Funcionários também podem adicionar marcadores (ajuste conforme necessidade)
            addReportMarker(e.latlng, currentMarkerMode);
        }
    });
}

// ================= FUNÇÃO PARA ADICIONAR MARCADORES =================
function addReportMarker(latlng, type) {
    let iconColor, iconText, typeName;
    switch(type) {
        case 'metralha':
            iconColor = '#e53e3e';
            iconText = '🧱';
            typeName = 'Metralha';
            break;
        case 'entulho':
            iconColor = '#8B4513';
            iconText = '🗑️';
            typeName = 'Entulho';
            break;
        case 'mato-verde':
            iconColor = '#2F855A';
            iconText = '🌿';
            typeName = 'Mato Verde';
            break;
        case 'mato-seco':
            iconColor = '#ed8936';
            iconText = '🍂';
            typeName = 'Mato Seco';
            break;
        default:
            iconColor = '#667eea';
            iconText = '📍';
            typeName = 'Desconhecido';
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
            marker.bindPopup(`
                <strong>${typeName}</strong><br>
                Status: Pendente<br>
                <small>Reportado em: ${marker.reportData.createdAt.toLocaleDateString()}</small>
            `).openPopup();
        }
    });

    updateReportsList();
}

// ================= FUNÇÃO PARA ABRIR O MODAL DE RELATÓRIO =================
function openReportModal(latlng, type, marker) {
    const typeName = getReportTypeName(type);
    document.getElementById('problemType').value = typeName;
    document.getElementById('reportLocation').value = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;

    document.getElementById('reportModal').style.display = 'block';

    const form = document.getElementById('reportForm');
    form.onsubmit = function(e) {
        e.preventDefault();
        submitReport(latlng, type, marker);
    };
}

// ================= FUNÇÃO PARA ENVIAR O RELATÓRIO =================
function submitReport(latlng, type, marker) {
    const description = document.getElementById('description').value;
    const priority = document.getElementById('priority').value;
    const photoInput = document.getElementById('photo');
    const photoFile = photoInput.files[0];

    marker.reportData.description = description;
    marker.reportData.priority = priority;

    if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            marker.reportData.photoUrl = e.target.result;
            finalizeReportSubmission(marker);
        };
        reader.readAsDataURL(photoFile);
    } else {
        finalizeReportSubmission(marker);
    }
}

function finalizeReportSubmission(marker) {
    let popupContent = `
        <strong>${marker.reportData.typeName}</strong><br>
        <strong>Descrição:</strong> ${marker.reportData.description || 'Nenhuma'}<br>
        <strong>Prioridade:</strong> ${marker.reportData.priority || 'Não definida'}<br>
        <strong>Status:</strong> Pendente<br>
        <small>Reportado em: ${marker.reportData.createdAt.toLocaleString()}</small>
    `;

    if (marker.reportData.photoUrl) {
        popupContent += `<br><img src="${marker.reportData.photoUrl}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 5px; margin-top: 10px;">`;
    }

    marker.bindPopup(popupContent);

    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportForm').reset();

    updateReportsList();
    // REMOVIDO: alert('✅ Relatório enviado com sucesso!');
}

// ================= FUN
