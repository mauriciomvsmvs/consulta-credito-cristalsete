// ============================================
// SIDEBAR.JS — Menu lateral retrátil
// Análise de Crédito - Cristal Sete
// ============================================

// ── ABRIR / FECHAR ──
function abrirSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebarOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function fecharSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
}
function toggleSidebar() {
    // No desktop a sidebar é sempre fixa — só funciona no mobile
    if (window.innerWidth > 1024) return;
    const sb = document.getElementById('sidebar');
    if (sb?.classList.contains('open')) fecharSidebar();
    else abrirSidebar();
}

// Fechar com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharSidebar();
});

// ── INICIALIZAÇÃO ──
window.addEventListener('DOMContentLoaded', () => {
    preencherSidebarUser();
    marcarLinkAtivo();
    atualizarBadges();
    // Mostrar seção admin apenas para perfil admin
    const _perfil = (JSON.parse(sessionStorage.getItem('ac_usuario') || '{}').perfil || '').toLowerCase();
    const _adminSec = document.getElementById('sidebarAdminSection');
    if (_adminSec && _perfil === 'admin') _adminSec.style.display = 'block';
});

function preencherSidebarUser() {
    const user = JSON.parse(sessionStorage.getItem('ac_usuario') || '{}');
    const nameEl   = document.getElementById('sidebarUserName');
    const perfilEl = document.getElementById('sidebarUserPerfil');
    const avatarEl = document.getElementById('sidebarAvatar');
    if (nameEl)   nameEl.textContent   = user.nome   || '—';
    if (perfilEl) perfilEl.textContent = user.perfil || '—';
    if (avatarEl) {
        // Buscar foto do localStorage
        let avatar = '';
        try {
            const users = JSON.parse(localStorage.getItem('ac_usuarios_v1') || '[]');
            const found = users.find(u => u.email === user.usuario);
            if (found && found.avatar) avatar = found.avatar;
        } catch(e) {}
        if (avatar) {
            avatarEl.innerHTML = '<img src="' + avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        } else {
            avatarEl.textContent = (user.nome || '?')[0].toUpperCase();
        }
    }
}

function marcarLinkAtivo() {
    const pagina = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        const page = link.getAttribute('data-page');
        if (page === pagina) link.classList.add('active');
        else link.classList.remove('active');
    });
}

function atualizarBadges() {
    // Badge de aprovações pendentes
    try {
        const user   = JSON.parse(sessionStorage.getItem('ac_usuario') || '{}');
        const perfil = (user.perfil || '').toLowerCase();
        const solic  = JSON.parse(localStorage.getItem('ac_solicitacoes_v2') || '[]');

        let pendentes = 0;
        if (perfil === 'coordenador') pendentes = solic.filter(s => s.status === 'aguard_coord').length;
        if (perfil === 'gerente')     pendentes = solic.filter(s => s.status === 'aguard_gerente' && s.escalado).length;
        if (perfil === 'analista')    pendentes = solic.filter(s => s.status === 'revisao' && s.analistaEmail === user.usuario).length;

        const badge = document.getElementById('sidebarBadgeAprov');
        if (badge) {
            if (pendentes > 0) { badge.textContent = pendentes; badge.style.display = 'inline-block'; }
            else badge.style.display = 'none';
        }
    } catch(e) {}

    // Badge de reavaliações vencidas
    try {
        const reav   = JSON.parse(localStorage.getItem('ac_reavaliacoes_v1') || '[]');
        const hoje   = new Date();
        const vencidas = reav.filter(r => r.status === 'ativo' && new Date(r.dataAlerta) <= hoje).length;
        const badgeReav = document.getElementById('sidebarBadgeReav');
        if (badgeReav) {
            if (vencidas > 0) { badgeReav.textContent = vencidas; badgeReav.style.display = 'inline-block'; }
            else badgeReav.style.display = 'none';
        }
    } catch(e) {}
}

// HTML da sidebar (injetado em todas as páginas)
function buildSidebarHTML() {
    return `
    <!-- Overlay -->
    <div id="sidebarOverlay" class="sidebar-overlay" onclick="fecharSidebar()"></div>

    <!-- Sidebar -->
    <nav id="sidebar" class="sidebar">

        <!-- Header -->
        <div class="sidebar-header">
            <img src="assets/logos/cistalsete.png" alt="Cristal Sete" class="sidebar-logo">
            <button class="sidebar-close" onclick="fecharSidebar()">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>

        <!-- Usuário -->
        <div class="sidebar-user">
            <div class="sidebar-avatar" id="sidebarAvatar">?</div>
            <div class="sidebar-user-info">
                <p class="sidebar-user-name" id="sidebarUserName">—</p>
                <p class="sidebar-user-perfil" id="sidebarUserPerfil">—</p>
            </div>
        </div>

        <!-- Nav -->
        <div class="sidebar-nav">

            <!-- CONSULTA -->
            <div class="sidebar-section">
                <p class="sidebar-section-title">Consulta</p>
                <a href="index.html" class="sidebar-link" data-page="index.html">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/>
                        </svg>
                    </span>
                    Consulta de CNPJ
                </a>
                <a href="historico.html" class="sidebar-link" data-page="historico.html">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </span>
                    Histórico de Consultas
                </a>
            </div>

            <!-- CRÉDITO -->
            <div class="sidebar-section">
                <p class="sidebar-section-title">Crédito</p>
                <a href="aprovacoes.html" class="sidebar-link" data-page="aprovacoes.html">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </span>
                    Aprovações
                    <span class="sidebar-link-badge" id="sidebarBadgeAprov" style="display:none">0</span>
                </a>
                <a href="serasa-historico.html" class="sidebar-link" data-page="serasa-historico.html">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </span>
                    Histórico Serasa
                </a>
                <a href="solicitacoes.html" class="sidebar-link" data-page="solicitacoes.html">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                    </span>
                    Solicitações de Consulta de Crédito
                    <span class="sidebar-link-tag">SLACK</span>
                </a>
                <a href="reavaliar.html" class="sidebar-link" data-page="reavaliar.html">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                        </svg>
                    </span>
                    Reavaliar Clientes
                    <span class="sidebar-link-badge" id="sidebarBadgeReav" style="display:none">0</span>
                </a>
            </div>

            <!-- AGENDA -->
            <div class="sidebar-section">
                <p class="sidebar-section-title">Agenda</p>
                <a href="calendario.html" class="sidebar-link" data-page="calendario.html">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                    </span>
                    Calendário de Reavaliações
                </a>
            </div>

            <!-- FINANCEIRO -->
            <div class="sidebar-section">
                <p class="sidebar-section-title">Financeiro</p>
                <a class="sidebar-link disabled">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                    </span>
                    Dashboard Financeiro
                    <span class="sidebar-link-tag">EM BREVE</span>
                </a>
                <a class="sidebar-link disabled">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                        </svg>
                    </span>
                    SYM Glass API
                    <span class="sidebar-link-tag">EM BREVE</span>
                </a>
            </div>

        </div>

            <!-- ADMIN (só para admin) -->
            <div class="sidebar-section" id="sidebarAdminSection" style="display:none">
                <p class="sidebar-section-title">Administração</p>
                <a href="admin.html" class="sidebar-link" data-page="admin.html">
                    <span class="sidebar-link-icon">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                    </span>
                    Painel Admin
                </a>
            </div>

        <!-- Footer -->
        <div class="sidebar-footer">
            <a href="meu-perfil.html" class="sidebar-footer-btn" style="text-decoration:none">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Meu Perfil
            </a>
            <button class="sidebar-footer-btn" onclick="sair()">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                Sair do sistema
            </button>
        </div>

    </nav>`;
}

// Injeta a sidebar no body ao carregar
document.addEventListener('DOMContentLoaded', () => {
    const div = document.createElement('div');
    div.innerHTML = buildSidebarHTML();
    document.body.insertBefore(div, document.body.firstChild);
    preencherSidebarUser();
    marcarLinkAtivo();
    atualizarBadges();
    // Mostrar seção admin apenas para perfil admin
    const _perfil = (JSON.parse(sessionStorage.getItem('ac_usuario') || '{}').perfil || '').toLowerCase();
    const _adminSec = document.getElementById('sidebarAdminSection');
    if (_adminSec && _perfil === 'admin') _adminSec.style.display = 'block';
});
