// script.js

// Variáveis globais
let map;
let userMarker = null;
let currentUser = null; // Armazena o usuário logado

// Inicialização do Mapa com Duas Camadas
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o mapa centrado em Alagoinha, PE
    map = L.map('map', {
        center: [-7.8375, -35.5781],
        zoom: 13,
        layers: [] // Inicia sem camada ativa
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
});

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

// Função para login de Administrador
function loginAdmin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const remember = document.getElementById('rememberAdminLogin').checked;
    const errorDiv = document.getElementById('loginError');

    // Validação simples (em um sistema real, isso seria feito no backend)
    if (username === 'admin' && password === 'senha123') {
        // Login bem-sucedido
        currentUser = {
            type: 'admin',
            username: username
        };

        // Salva no localStorage se "Lembrar login" estiver marcado
        if (remember) {
            localStorage.setItem('userSession', JSON.stringify(currentUser));
        }

        // Fecha o modal
        closeAdminLoginModal();

        // Atualiza a interface do usuário
        updateUIForUser();

        alert('✅ Login de administrador bem-sucedido!');
    } else {
        // Login falhou
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// Função para logout
function logout() {
    currentUser = null;
    localStorage.removeItem('userSession');
    updateUIForUser();
    alert('👋 Você saiu da sua conta.');
}

// Função para atualizar a interface com base no usuário logado
function updateUIForUser() {
    const logoutBtn = document.getElementById('logoutBtn');
    const adminPanel = document.getElementById('adminPanel');

    if (currentUser && currentUser.type === 'admin') {
        // Mostra o botão de logout
        logoutBtn.style.display = 'inline-block';
        // Mostra o painel de admin
        adminPanel.style.display = 'block';
    } else {
        // Esconde o botão de logout
        logoutBtn.style.display = 'none';
        // Esconde o painel de admin
        adminPanel.style.display = 'none';
    }
}

// Função para verificar se há uma sessão salva ao carregar a página
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

function setMarkerMode(type) {
    alert(`Modo de marcador definido para: ${type}`);
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
