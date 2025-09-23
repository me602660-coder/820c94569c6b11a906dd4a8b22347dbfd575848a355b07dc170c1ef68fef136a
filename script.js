// script.js

// Variáveis globais
let map;
let userMarker = null;
let currentUser = null;
let currentMarkerMode = null;
let reportMarkers = [];

// Inicialização do Mapa
document.addEventListener('DOMContentLoaded', function() {
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
        } else if (!currentUser || currentUser.type !== 'admin') {
            alert('⛔️ Apenas administradores podem adicionar marcadores.');
        } else if (!currentMarkerMode) {
            alert('ℹ️ Por favor, selecione um tipo de marcador primeiro.');
        }
    });
});

// ================= FUNÇÃO PARA ADICIONAR MARCADORES (APENAS ADMINS) =================
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

    // Armazena dados no marcador
    marker.reportData = {
        id: Date.now(), // ID único baseado no timestamp
        type: type,
        typeName: typeName,
        latlng: latlng,
        status: 'pending',
        createdAt: new Date(),
        description: '',
        priority: '',
        photoUrl: null
    };

    // Adiciona o marcador ao array global
    reportMarkers.push(marker);

    // Abre o modal para preencher detalhes
    openReportModal(latlng, type, marker);

    // Adiciona evento de clique para admins
    marker.on('click', function() {
        if (currentUser && currentUser.type === 'admin') {
            showMarkerDetails(marker);
        } else {
            // Para cidadãos, apenas mostra um popup informativo
            marker.bindPopup(`
                <strong>${typeName}</strong><br>
                Status: Pendente<br>
                <small>Reportado em: ${marker.reportData.createdAt.toLocaleDateString()}</small>
            `).openPopup();
        }
    });

    // Atualiza a lista de relatórios
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
    // Atualiza o popup com as informações completas
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

    // Atualiza a lista de relatórios
    updateReportsList();

    alert('✅ Relatório enviado com sucesso!');
}

// ================= FUNÇÃO PARA MOSTRAR DETALHES DO MARCADOR (APENAS ADMINS) =================
function showMarkerDetails(marker) {
    const data = marker.reportData;
    let statusText = 'Pendente';
    let statusClass = 'pending';

    if (data.status === 'progress') {
        statusText = 'Em Progresso';
        statusClass = 'progress';
    } else if (data.status === 'completed') {
        statusText = 'Concluído';
        statusClass = 'completed';
    }

    const content = `
        <h4>${data.typeName}</h4>
        <p><strong>Localização:</strong> Lat ${data.latlng.lat.toFixed(6)}, Lng ${data.latlng.lng.toFixed(6)}</p>
        <p><strong>Descrição:</strong> ${data.description || 'Nenhuma'}</p>
        <p><strong>Prioridade:</strong> ${data.priority || 'Não definida'}</p>
        <p><strong>Status:</strong> <span class="status ${statusClass}">${statusText}</span></p>
        <p><strong>Reportado em:</strong> ${data.createdAt.toLocaleString()}</p>
        ${data.photoUrl ? `<img src="${data.photoUrl}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 5px; margin-top: 10px;">` : ''}
    `;

    document.getElementById('markerDetailsContent').innerHTML = content;
    document.getElementById('markerDetailsModal').style.display = 'block';
}

// ================= FUNÇÃO PARA MARCAR COMO CONCLUÍDO =================
function markAsCompleted() {
    // Encontra o marcador ativo (último que abriu o modal)
    const modal = document.getElementById('markerDetailsModal');
    if (!modal.style.display || modal.style.display === 'none') return;

    // Procura o marcador correspondente (simplificado - em um sistema real, você armazenaria uma referência)
    const activeMarker = reportMarkers.find(m => m.reportData.id);
    if (activeMarker) {
        activeMarker.reportData.status = 'completed';
        alert('✅ Marcador marcado como concluído!');
        updateReportsList();
        closeMarkerDetailsModal();
    }
}

// ================= FUNÇÃO PARA REMOVER MARCADOR (APENAS ADMINS) =================
function removeMarker() {
    const modal = document.getElementById('markerDetailsModal');
    if (!modal.style.display || modal.style.display === 'none') return;

    // Encontra e remove o marcador
    const markerToRemove = reportMarkers.find(m => m.reportData.id);
    if (markerToRemove) {
        map.removeLayer(markerToRemove);
        reportMarkers = reportMarkers.filter(m => m !== markerToRemove);
        alert('🗑️ Marcador removido com sucesso!');
        updateReportsList();
        closeMarkerDetailsModal();
    }
}

// ================= FUNÇÃO PARA ATUALIZAR A LISTA DE RELATÓRIOS RECENTES =================
function updateReportsList() {
    const reportsList = document.getElementById('reportsList');
    reportsList.innerHTML = '';

    if (reportMarkers.length === 0) {
        reportsList.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem;">Nenhum relatório encontrado.</p>';
        return;
    }

    // Ordena por data (mais recente primeiro)
    const sortedMarkers = [...reportMarkers].sort((a, b) => b.reportData.createdAt - a.reportData.createdAt);

    sortedMarkers.forEach(marker => {
        const data = marker.reportData;
        let statusText = 'Pendente';
        let statusClass = 'pending';

        if (data.status === 'progress') {
            statusText = 'Em Progresso';
            statusClass = 'progress';
        } else if (data.status === 'completed') {
            statusText = 'Concluído';
            statusClass = 'completed';
        }

        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        reportItem.innerHTML = `
            <div class="report-header">
                <span class="report-type">${getReportTypeEmoji(data.type)}</span>
                <span class="status ${statusClass}">${statusText}</span>
            </div>
            <p>Lat: ${data.latlng.lat.toFixed(4)}, Lng: ${data.latlng.lng.toFixed(4)}</p>
            <small>Reportado em: ${data.createdAt.toLocaleString()}</small>
        `;

        // Adiciona evento de clique para focar no marcador no mapa
        reportItem.addEventListener('click', function() {
            map.setView(data.latlng, 18);
            marker.openPopup();
        });

        reportsList.appendChild(reportItem);
    });
}

// Funções auxiliares para obter emoji e nome do tipo
function getReportTypeEmoji(type) {
    switch(type) {
        case 'metralha': return '🧱';
        case 'entulho': return '🗑️';
        case 'mato-verde': return '🌿';
        case 'mato-seco': return '🍂';
        default: return '📍';
    }
}

function getReportTypeName(type) {
    switch(type) {
        case 'metralha': return 'Metralha';
        case 'entulho': return 'Entulho';
        case 'mato-verde': return 'Mato Verde';
        case 'mato-seco': return 'Mato Seco';
        default: return 'Desconhecido';
    }
}

// ================= FUNÇÃO PARA DEFINIR O MODO DE MARCADOR =================
function setMarkerMode(type) {
    if (!currentUser || currentUser.type !== 'admin') {
        alert('⛔️ Apenas administradores podem adicionar marcadores.');
        return;
    }
    currentMarkerMode = type;
    updateMarkerButtons();
    console.log(`Modo de marcador definido para: ${type}`);
}

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
    const employeeLoginBtn = document.getElementById('employeeLoginBtn');

    if (currentUser && currentUser.type === 'admin') {
        logoutBtn.style.display = 'inline-block';
        adminPanel.style.display = 'block';
        // ESCONDE o botão de Funcionário conforme solicitado
        employeeLoginBtn.style.display = 'none';
    } else {
        logoutBtn.style.display = 'none';
        adminPanel.style.display = 'none';
        // MOSTRA o botão de Funcionário
        employeeLoginBtn.style.display = 'inline-block';
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

function closeMarkerDetailsModal() {
    document.getElementById('markerDetailsModal').style.display = 'none';
}

function loginEmployee() {
    alert("Login de funcionário ainda não implementado.");
}

function manageUsers() {
    alert("Gerenciamento de usuários ainda não implementado.");
}
