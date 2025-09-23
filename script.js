// script.js

// Inicialização do Mapa
let map;
let userMarker = null; // Variável global para armazenar o marcador do usuário

document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o mapa centrado em Alagoinha, PE (coordenadas aproximadas)
    map = L.map('map').setView([-7.8375, -35.5781], 13);

    // Adiciona camada de tiles (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
});

// ================= FUNÇÃO DE LOCALIZAÇÃO APRIMORADA =================
function requestLocation() {
    // Verifica se o navegador suporta Geolocation
    if (!navigator.geolocation) {
        alert("⚠️ Seu navegador não suporta Geolocalização.");
        return;
    }

    // Mostra um indicador de carregamento para o usuário
    const locationBtn = document.getElementById('locationBtn');
    const originalButtonText = locationBtn.innerHTML;
    locationBtn.innerHTML = '📍 Buscando...';
    locationBtn.disabled = true; // Desabilita o botão durante a busca

    // Opções para obter a localização mais precisa possível
    const options = {
        enableHighAccuracy: true, // Solicita a melhor precisão disponível (GPS)
        timeout: 15000,           // Tempo máximo de espera por uma resposta (15 segundos)
        maximumAge: 0             // Não aceita dados em cache, sempre busca nova posição
    };

    // Função de sucesso
    const successCallback = (position) => {
        const { latitude, longitude } = position.coords;
        const accuracy = position.coords.accuracy; // Precisão em metros

        console.log(`✅ Localização obtida com sucesso: Lat ${latitude}, Lng ${longitude}. Precisão: ±${accuracy.toFixed(2)}m`);

        // Centraliza o mapa na localização do usuário com zoom alto
        map.setView([latitude, longitude], 18);

        // Remove o marcador anterior, se existir
        if (userMarker) {
            map.removeLayer(userMarker);
        }

        // Cria um novo marcador estilizado e animado para o usuário
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

        // Adiciona um popup informativo ao marcador
        userMarker.bindPopup(`
            <strong>📍 Sua Localização</strong><br>
            Latitude: ${latitude.toFixed(6)}<br>
            Longitude: ${longitude.toFixed(6)}<br>
            Precisão: ±${accuracy.toFixed(2)} metros<br>
            <small>Última atualização: ${new Date().toLocaleTimeString()}</small>
        `).openPopup();

        // Restaura o texto e habilita o botão
        locationBtn.innerHTML = originalButtonText;
        locationBtn.disabled = false;
    };

    // Função de erro
    const errorCallback = (error) => {
        console.error("❌ Erro ao obter localização:", error);

        let errorMessage = "❌ Não foi possível obter sua localização precisa.";

        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = "⛔️ Permissão de localização negada. Por favor, habilite-a nas configurações do seu navegador.";
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = "📡 Sinal de localização indisponível. Tente novamente ou verifique sua conexão GPS.";
                break;
            case error.TIMEOUT:
                errorMessage = "⏳ Tempo esgotado. Tentando novamente com precisão reduzida...";
                // Fallback: Tenta novamente com precisão reduzida
                retryWithLowAccuracy();
                return;
            default:
                errorMessage = "⚙️ Um erro desconhecido ocorreu.";
                break;
        }

        alert(errorMessage);
        // Restaura o botão mesmo em caso de erro
        locationBtn.innerHTML = originalButtonText;
        locationBtn.disabled = false;
    };

    // Função de fallback para precisão reduzida
    function retryWithLowAccuracy() {
        const lowAccuracyOptions = {
            enableHighAccuracy: false, // Aceita fontes menos precisas (como Wi-Fi)
            timeout: 10000,
            maximumAge: 60000 // Aceita dados com até 1 minuto de cache
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.warn("✅ Localização obtida com precisão reduzida.");
                successCallback(position);
            },
            (error) => {
                console.error("❌ Falha mesmo com precisão reduzida:", error);
                alert("❌ Todas as tentativas de obter sua localização falharam. Por favor, tente novamente mais tarde.");
                // Restaura o botão
                const locationBtn = document.getElementById('locationBtn');
                locationBtn.innerHTML = '📍 Minha Localização';
                locationBtn.disabled = false;
            },
            lowAccuracyOptions
        );
    }

    // Primeira tentativa com alta precisão
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
}

// ============= FUNÇÕES AUXILIARES (PLACEHOLDERS) =============
// Estas funções precisam ser implementadas conforme a lógica do seu sistema.

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

function loginAdmin() {
    alert("Login de administrador ainda não implementado.");
}

function logout() {
    alert("Logout ainda não implementado.");
}

function markAsCompleted() {
    alert("Marcar como concluído ainda não implementado.");
}

function removeMarker() {
    alert("Remover marcador ainda não implementado.");
}
