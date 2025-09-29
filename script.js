// script.js (com autenticação real via Supabase Auth)
import { supabase } from './supabase-client.js';

let map;
let userMarker = null;
let currentUser = null;
let currentMarkerMode = null;
let reportMarkers = [];

// === Funções de Abertura de Modal (sem onclick no HTML) ===
document.addEventListener('DOMContentLoaded', async function () {
    // Vincula botões da tela de login
    document.getElementById('btnLoginEmployee')?.addEventListener('click', () => {
        document.getElementById('employeeLoginModal').style.display = 'block';
    });
    document.getElementById('btnLoginAdmin')?.addEventListener('click', () => {
        document.getElementById('adminLoginModal').style.display = 'block';
    });
    document.getElementById('btnRegister')?.addEventListener('click', () => {
        document.getElementById('registerModal').style.display = 'block';
    });

    // Fecha modais com X
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    // Verifica se já está logado
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await loadUserProfile(session.user.id);
    }
});

// === Carregar perfil do usuário ===
async function loadUserProfile(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        alert('❌ Perfil não encontrado. Faça logout e tente novamente.');
        return;
    }

    currentUser = {
        id: userId,
        email: supabase.auth.getUser().email,
        fullName: profile.full_name,
        type: profile.role // 'employee' ou 'admin'
    };

    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    initializeMap();
    updateUIForUser();
}

// === Cadastro de Funcionário (via Supabase Auth) ===
async function registerEmployee() {
    const fullName = document.getElementById('fullName')?.value.trim();
    const email = document.getElementById('newEmail')?.value.trim();
    const password = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const errorDiv = document.getElementById('registerError');

    const showError = (msg) => {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 4000);
    };

    if (!fullName || !email || !password) {
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

    // 1. Cria usuário no auth
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
    });

    if (error) {
        showError('Erro no cadastro: ' + (error.message || 'Tente novamente.'));
        return;
    }

    if (data.user) {
        // 2. Cria perfil com role = 'employee'
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: data.user.id, full_name: fullName, role: 'employee' });

        if (profileError) {
            console.error('Erro ao criar perfil:', profileError);
            showError('Usuário criado, mas erro no perfil. Contate o admin.');
        } else {
            alert('✅ Funcionário cadastrado com sucesso!\nEle pode fazer login com seu e-mail.');
            closeRegisterModal();
        }
    }
}

// === Login (Funcionário ou Admin) ===
async function loginWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    await loadUserProfile(data.user.id);
    return { success: true };
}

// === Funções de Interface ===
function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('registerForm')?.reset();
    document.getElementById('registerError').style.display = 'none';
}

// === Login de Funcionário (botão no modal) ===
document.getElementById('employeeLoginModal')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('employeeEmail').value.trim();
    const password = document.getElementById('employeePassword').value.trim();
    const errorDiv = document.getElementById('employeeLoginError');

    const result = await loginWithEmail(email, password);
    if (!result.success) {
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 3000);
    } else {
        document.getElementById('employeeLoginModal').style.display = 'none';
    }
});

// === Login de Admin (botão no modal) ===
document.getElementById('adminLoginModal')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const errorDiv = document.getElementById('adminLoginError');

    const result = await loginWithEmail(email, password);
    if (!result.success) {
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 3000);
    } else {
        document.getElementById('adminLoginModal').style.display = 'none';
    }
});

// === Logout ===
async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    document.getElementById('appPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
    if (map) {
        map.remove();
        map = null;
        reportMarkers = [];
    }
}

// === Restante do sistema (mapa, marcadores, etc.) ===
function initializeMap() {
    map = L.map('map', {
        center: [-7.8375, -35.5781],
        zoom: 13,
        maxZoom: 18,
        layers: []
    });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
    });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });
    L.control.layers({ "Mapa (OSM)": osmLayer, "Satélite (Esri)": satelliteLayer }).addTo(map);
    osmLayer.addTo(map);

    map.on('click', function(e) {
        if (currentUser && currentMarkerMode) {
            addReportMarker(e.latlng, currentMarkerMode);
        }
    });
}

// === Funções de Marcador (sem alteração lógica, apenas mantidas) ===
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
        html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:${iconColor};color:white;border-radius:50%;border:3px solid white;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;">${iconText}</div>`,
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
    marker.on('click', () => showMarkerDetails(marker));
    updateReportsList();
}

function openReportModal(latlng, type, marker) {
    const typeName = getReportTypeName(type);
    document.getElementById('problemType').value = typeName;
    document.getElementById('reportLocation').value = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
    document.getElementById('reportModal').style.display = 'block';

    document.getElementById('reportForm').onsubmit = (e) => {
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
        reader.onload = () => {
            marker.reportData.photoUrl = reader.result;
            finalizeReport(marker);
        };
        reader.readAsDataURL(photoFile);
    } else {
        finalizeReport(marker);
    }
}

function finalizeReport(marker) {
    let content = `<strong>${marker.reportData.typeName}</strong><br><strong>Descrição:</strong> ${marker.reportData.description || 'Nenhuma'}<br><strong>Prioridade:</strong> ${marker.reportData.priority || 'Não definida'}<br><strong>Status:</strong> Pendente<br><small>Reportado em: ${marker.reportData.createdAt.toLocaleString()}</small>`;
    if (marker.reportData.photoUrl) {
        content += `<br><img src="${marker.reportData.photoUrl}" style="width:100%;max-height:150px;object-fit:cover;border-radius:5px;margin-top:10px;">`;
    }
    marker.bindPopup(content);
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportForm').reset();
    updateReportsList();
}

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
    if (currentUser?.type !== 'admin') {
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

function closeMarkerDetailsModal() {
    document.getElementById('markerDetailsModal').style.display = 'none';
}

function updateReportsList() {
    const list = document.getElementById('reportsList');
    list.innerHTML = reportMarkers.length === 0
        ? '<p style="text-align:center;color:#666;padding:1rem;">Nenhum relatório encontrado.</p>'
        : [...reportMarkers].sort((a, b) => b.reportData.createdAt - a.reportData.createdAt).map(m => {
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
            return item;
        }).reduce((frag, el) => { frag.appendChild(el); return frag; }, document.createDocumentFragment());
    if (list.innerHTML instanceof DocumentFragment) list.appendChild(list.innerHTML);
}

function getReportTypeEmoji(t) {
    return t === 'metralha' ? '🧱' : t === 'entulho' ? '🗑️' : t === 'mato-verde' ? '🌿' : t === 'mato-seco' ? '🍂' : '📍';
}
function getReportTypeName(t) {
    return t === 'metralha' ? 'Metralha' : t === 'entulho' ? 'Entulho' : t === 'mato-verde' ? 'Mato Verde' : t === 'mato-seco' ? 'Mato Seco' : 'Desconhecido';
}
function setMarkerMode(type) {
    currentMarkerMode = type;
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    const active = document.querySelector(`.${type}-btn`);
    if (active) active.classList.add('active');
}
function requestLocation() {
    if (!navigator.geolocation) return alert("⚠️ Seu navegador não suporta Geolocalização.");
    const btn = document.getElementById('locationBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '📍 Buscando...'; btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 18);
            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.marker([latitude, longitude], {
                icon: L.divIcon({
                    className: 'user-location-icon',
                    html: `<div style="width:24px;height:24px;border-radius:50%;background:#48bb78;border:3px solid white;box-shadow:0 0 0 2px #48bb78,0 0 10px rgba(72,187,120,0.8);animation:pulse 1.5s infinite;"></div>`,
                    iconSize: [24, 24], iconAnchor: [12, 12]
                })
            }).addTo(map);
            userMarker.bindPopup(`<strong>📍 Sua Localização</strong><br>Latitude: ${latitude.toFixed(6)}<br>Longitude: ${longitude.toFixed(6)}<br>Precisão: ±${pos.coords.accuracy.toFixed(2)} metros<br><small>Última atualização: ${new Date().toLocaleTimeString()}</small>`).openPopup();
            btn.innerHTML = original; btn.disabled = false;
        },
        (err) => {
            alert("❌ Não foi possível obter sua localização.");
            btn.innerHTML = original; btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}
function updateUIForUser() {
    const adminPanel = document.getElementById('adminPanel');
    if (currentUser?.type === 'admin') {
        adminPanel.style.display = 'block';
    }
}
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
function manageUsers() { alert("Gerenciamento de funcionários ainda não implementado."); }
