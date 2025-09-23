// script.js

// Variáveis globais
let map;
let userMarker = null;
let currentUser = null;
let currentMarkerMode = null;
let reportMarkers = [];

// Inicialização do Mapa com Duas Camadas
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
            // Silenciosamente ignora, sem alert
            console.log('Ação bloqueada: Apenas administradores podem adicionar marcadores.');
        } else if (!currentMarkerMode) {
            // Silenciosamente ignora, sem alert
            console.log('Ação bloqueada: Nenhum tipo de marcador selecionado.');
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
        }
