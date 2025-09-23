// script.js

// Variáveis globais
let map;
let userMarker = null;
let currentUser = null;
let currentMarkerMode = null; // Armazena o modo de marcador ativo ('metralha', 'entulho', etc.)
let reportMarkers = []; // Array para armazenar todos os marcadores de relatório

// Inicialização do Mapa com Duas Camadas
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o mapa centrado em Alagoinha, PE
    map = L.map('map', {
        center: [-7.8375, -35.5781],
        zoom: 13,
        layers: []
    });

    // Define as camadas de mapa
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    });

    // Objeto com as camadas para o controle de camadas
    const baseMaps = {
        "Mapa (OSM)": osmLayer,
        "Satélite (Esri)": satelliteLayer
    };

    // Adiciona o controle de camadas ao mapa
    L.control.layers(baseMaps).addTo(map);

    // Define a camada padrão (OpenStreetMap)
    osmLayer.addTo(map);

    // Adiciona evento de clique no mapa para adicionar marcadores
    map.on('click', function(e) {
        if (currentMarkerMode) {
            addReportMarker(e.latlng, currentMarkerMode);
        }
    });
});

// ================= FUNÇÃO PARA ADICIONAR MARCADORES DE RELATÓRIO =================
function addReportMarker(latlng, type) {
    // Define o ícone com base no tipo
    let iconColor, iconText;
    switch(type) {
        case 'metralha':
            iconColor = '#e53e3e';
            iconText = '🧱';
            break;
        case 'entulho':
            iconColor = '#8B4513';
            iconText = '🗑️';
            break;
        case 'mato-verde':
            iconColor = '#2F855A';
            iconText = '🌿';
            break;
        case 'mato-seco':
            iconColor = '#ed8936';
            iconText = '🍂';
            break;
        default:
            iconColor = '#667eea';
            iconText = '📍';
    }

    // Cria o ícone personalizado
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

    // Cria o marcador
    const marker = L.marker(latlng, { icon: markerIcon }).addTo(map);

    // Armazena informações no marcador
    marker.reportData = {
        type: type,
        latlng: latlng,
        status: 'pending',
        createdAt: new Date()
    };

    // Adiciona o marcador ao array global
    reportMarkers.push(marker);

    // Abre o modal de relatório automaticamente
    openReportModal(latlng, type, marker);

    // Opcional: Adiciona um popup ao marcador
    marker.bindPopup(`
        <strong>Tipo: ${type}</strong><br>
        Status: Pendente<br>
        Clique para mais detalhes.
    `);

    // Define o modo de marcador como null após adicionar (opcional)
    // currentMarkerMode = null;
    // updateMarkerButtons();
}

// ================= FUNÇÃO PARA ABRIR O MODAL DE RELATÓRIO =================
function openReportModal(latlng, type, marker) {
    // Preenche os campos do formulário
    document.getElementById('problemType').value = type;
    document.getElementById('reportLocation').value = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;

    // Mostra o modal
    document.getElementById('reportModal').style.display = 'block';

    // Adiciona evento de submit ao formulário
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

    // Aqui você normalmente enviaria os dados para um servidor
    // Por enquanto, apenas atualizamos o marcador localmente

    marker.reportData.description = description;
    marker.reportData.priority = priority;
    marker.reportData.photo = photoFile ? URL.createObjectURL(photoFile) : null;

    // Atualiza o popup do marcador com as novas informações
    marker.bindPopup(`
        <strong>Tipo: ${type}</strong><br>
        <strong>Descrição:</strong> ${description || 'Nenhuma'}<br>
        <strong>Prioridade:</strong> ${priority || 'Não definida'}<br>
        <strong>Status:</strong> Pendente<br>
        <small>Reportado em: ${new Date().toLocaleString()}</small>
        ${photoFile ? `<br><img src="${marker.reportData.photo}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 5px; margin-top: 10px;">` : ''}
    `);

    // Fecha o modal
    document.getElementById('reportModal').style.display = 'none';

    // Limpa o formulário
    document.getElementById('reportForm').reset();

    // Opcional: Mostra uma mensagem de sucesso
    alert('✅ Relatório enviado com sucesso!');
}

// ================= FUNÇÃO PARA DEFINIR O MODO DE MARCADOR =================
function setMarkerMode(type) {
    currentMarkerMode = type;
    updateMarkerButtons();
    console.log(`Modo de marcador definido para: ${type}`);
    // O alert foi REMOVIDO conforme solicitado
}

// Função para atualizar o estilo dos botões de marcador
function updateMarkerButtons() {
    const buttons = document.querySelectorAll('.marker-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    const activeButton = document.querySelector(`.${currentMarkerMode}-btn`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// ================= FUNÇÃO DE LOCALIZAÇÃO APRIMORADA =================
function requestLocation() {
    if (!navigator.geolocation) {
        alert("⚠️ Seu navegador não suporta Geolocalização.");
        return;
    }

    const locationBtn = document.getElementById('locationBtn');
    const originalButtonText = locationBtn.innerHTML;
    locationBtn.innerHTML = '📍 Buscando...';
    locationBtn.disabled = true;

    const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    };

    const successCallback = (position) => {
        const { latitude, longitude } = position.coords;
        const accuracy = position.coords.accuracy;

        console.log(`✅ Localização obtida: Lat ${latitude}, Lng ${longitude}. Precisão: ±${accuracy.toFixed(2)}m`);

        map.setView([latitude, longitude], 18);

        if (userMarker) {
            map.removeLayer(userMarker);
        }

        userMarker = L.marker([latitude, longitude], {
            icon: L.divIcon({
                className: 'user-location-icon',
                html: `<div style="
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #48bb78;
                    border: 3px solid white;
                    box-shadow: 0 0 0 2px #48bb78, 0 0 10px rgba(72, 187, 120, 0.8);
                    animation: pulse 1.5s infinite;
                "></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(map);

        userMarker.bindPopup(`
            <strong>📍 Sua Localização</strong><br>
            Latitude: ${latitude.toFixed(6)}<br>
            Longitude: ${longitude.toFixed(6)}<br>
            Precisão: ±${accuracy.toFixed(2)} metros<br>
            <small>Última atualização: ${new Date().toLocaleTimeString()}</small>
        `).openPopup();

        locationBtn.innerHTML = originalButtonText;
        locationBtn.disabled = false;
    };

    const errorCallback = (error) => {
        console.error("❌ Erro ao obter localização:", error);
        let errorMessage = "❌ Não foi possível obter sua localização precisa.";

        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = "⛔️ Permissão de localização negada. Por favor, habilite-a nas configurações.";
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = "📡 Sinal de localização indisponível. Tente novamente.";
                break;
            case error.TIMEOUT:
                errorMessage = "⏳ Tempo esgotado. Tentando com precisão reduzida...";
                retryWithLowAccuracy();
                return;
            default:
                errorMessage = "⚙️ Um erro desconhecido ocorreu.";
                break;
        }

        alert(errorMessage);
        locationBtn.innerHTML = originalButtonText;
        locationBtn.disabled = false;
    };

    function retryWithLowAccuracy() {
        const lowAccuracyOptions = {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.warn("✅ Localização obtida com precisão reduzida.");
                successCallback(position);
            },
            (error) => {
                console.error("❌ Falha mesmo com precisão reduzida:", error);
                alert("❌ Todas as tentativas falharam. Tente novamente mais tarde.");
                const locationBtn = document.getElementById('locationBtn');
                locationBtn.innerHTML = '📍 Minha Localização';
                locationBtn.disabled = false;
            },
            lowAccuracyOptions
        );
    }

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
}

// ================= FUNÇÕES DE LOGIN E CONTROLE DE ACESSO =================

function loginAdmin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const remember = document.getElementById('rememberAdminLogin').checked;
    const errorDiv = document.getElementById('loginError');

    // Validação simples
    if (username === 'admin' && password === 'senha123') {
        currentUser = {
            type: 'admin',
            username: username
        };

        if (remember) {
            localStorage.setItem('userSession', JSON.stringify(currentUser));
        }

        closeAdminLoginModal();
        updateUIForUser();

        alert('✅ Login de administrador bem-sucedido!');
    } else {
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('userSession');
    updateUIForUser();
    alert('👋 Você saiu da sua conta.');
}

function updateUIForUser() {
    const logoutBtn = document.getElementById('logoutBtn');
    const adminPanel = document.getElementById('adminPanel');

    if (currentUser && currentUser.type === 'admin') {
        logoutBtn.style.display = 'inline-block';
        adminPanel.style.display = 'block';
    } else {
        logoutBtn.style.display = 'none';
        adminPanel.style.display = 'none';
    }
}

window.addEventListener('DOMContentLoaded', function() {
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
        try {
            currentUser = JSON.parse(savedSession);
            if (currentUser.type === 'admin') {
                updateUIForUser();
            }
        } catch (e) {
            console.error("Erro ao carregar sessão salva:", e);
            localStorage.removeItem('userSession');
        }
    }
});

// ================= FUNÇÕES AUXILIARES =================

function searchLocation() {
    document.getElementById('locationModal').style.display = 'block';
}

function closeLocationModal() {
    document.getElementById('locationModal').style.display = 'none';
}

function searchAddress() {
    alert("Função de busca por endereço ainda não implementada.");
    closeLocationModal();
}

function goToLocation(lat, lng, name) {
    map.setView([lat, lng], 15);
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    userMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup(`📍 ${name}`).openPopup();
    closeLocationModal();
}

function openEmployeeLoginModal() {
    document.getElementById('employeeLoginModal').style.display = 'block';
}

function closeEmployeeLoginModal() {
    document.getElementById('employeeLoginModal').style.display = 'none';
}

function openAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'block';
}

function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'none';
}

function closeModal() {
    document.getElementById('reportModal').style.display = 'none';
}

function loginEmployee() {
    alert("Login de funcionário ainda não implementado.");
}

// Funções do painel do administrador (placeholders)
function manageUsers() {
    alert("Gerenciamento de usuários ainda não implementado.");
}

function viewAnalytics() {
    alert("Visualização de analíticos ainda não implementada.");
}

function exportData() {
    alert("Exportação de dados ainda não implementada.");
}

function markAsCompleted() {
    alert("Marcar como concluído ainda não implementado.");
}

function removeMarker() {
    alert("Remover marcador ainda não implementado.");
}
