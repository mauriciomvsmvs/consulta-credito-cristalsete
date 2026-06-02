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

// Exibe nome e foto do usuário no header
window.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(sessionStorage.getItem('ac_usuario') || '{}');
    const nameEl   = document.getElementById('userName');
    const avatarEl = document.getElementById('avatarInitial');

    if (nameEl && user.nome) {
        nameEl.textContent = user.nome;
    }

    if (avatarEl) {
        // Busca avatar atualizado do localStorage (salvo pelo Meu Perfil)
        let avatar = '';
        try {
            const users = JSON.parse(localStorage.getItem('ac_usuarios_v1') || '[]');
            const found = users.find(u => u.email === user.usuario);
            if (found && found.avatar) avatar = found.avatar;
        } catch(e) {}

        if (avatar) {
            // Mostrar foto
            avatarEl.style.padding = '0';
            avatarEl.style.overflow = 'hidden';
            avatarEl.style.background = 'transparent';
            avatarEl.innerHTML = '<img src="' + avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="foto">';
        } else if (user.nome) {
            avatarEl.textContent = user.nome[0].toUpperCase();
        }
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
