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
    const errorDiv = document.getElementById
