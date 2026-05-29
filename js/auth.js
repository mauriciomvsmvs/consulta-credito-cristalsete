// ============================================
// AUTH.JS — Proteção de rotas e sessão
// Análise de Crédito - Cristal Sete
// ============================================

// Garante login em todas as páginas (exceto login.html)
(function() {
    const pagina = window.location.pathname.split('/').pop();
    if (pagina !== 'login.html' && sessionStorage.getItem('ac_logado') !== 'true') {
        window.location.href = 'login.html';
    }
})();

// Exibe nome do usuário no header
window.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(sessionStorage.getItem('ac_usuario') || '{}');
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('avatarInitial');
    if (nameEl && user.nome) {
        nameEl.textContent = user.nome;
    }
    if (avatarEl && user.nome) {
        avatarEl.textContent = user.nome[0].toUpperCase();
    }
});

function sair() {
    sessionStorage.removeItem('ac_logado');
    sessionStorage.removeItem('ac_usuario');
    window.location.href = 'login.html';
}

function toggleMobile() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('hidden');
}
