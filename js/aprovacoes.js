// ============================================
// APROVACOES.JS — Fluxo completo em 3 níveis
// Analista → Coordenador → Gerente
// Análise de Crédito - Cristal Sete
// ============================================

const SOLIC_KEY   = 'ac_solicitacoes_v2';
let filtroAtivo   = 'todos';
let solAtual      = null; // solicitação aberta no modal

// ── STATUS CONFIG ──
const STATUS = {
    rascunho:       { label:'Rascunho',               cor:'bg-slate-100 text-slate-600 border-slate-300',       dot:'bg-slate-400'   },
    aguard_coord:   { label:'Aguardando Coordenador',  cor:'bg-amber-100 text-amber-800 border-amber-300',       dot:'bg-amber-400'   },
    aguard_gerente: { label:'Aguardando Gerente',      cor:'bg-purple-100 text-purple-800 border-purple-300',    dot:'bg-purple-500'  },
    revisao:        { label:'Em Revisão',              cor:'bg-orange-100 text-orange-800 border-orange-300',    dot:'bg-orange-400'  },
    aprovado:       { label:'Aprovado',                cor:'bg-emerald-100 text-emerald-800 border-emerald-300', dot:'bg-emerald-500' },
    reprovado:      { label:'Reprovado',               cor:'bg-red-100 text-red-800 border-red-300',             dot:'bg-red-500'     },
};

const SERASA_LABEL = {
    regular:       '✅ Regular',
    pendencias:    '⚠️ Com Pendências',
    restrita:      '🔴 Restrita',
    nao_consultado:'⏳ Não Consultado'
};

// ── STORAGE ──
function getSolicAll()      { try { return JSON.parse(localStorage.getItem(SOLIC_KEY) || '[]'); } catch { return []; } }
function saveSolicAll(data) { localStorage.setItem(SOLIC_KEY, JSON.stringify(data)); }
function getSolicById(id)   { return getSolicAll().find(s => s.id === id) || null; }
function updateSolic(id, changes) {
    const all = getSolicAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...changes };
    saveSolicAll(all);
    return all[idx];
}

// ── PERFIL ATUAL ──
function getPerfil() {
    return (acUser.perfil || '').toLowerCase(); // analista | coordenador | gerente
}
function isAnalista()    { return getPerfil() === 'analista'; }
function isCoordenador() { return getPerfil() === 'coordenador'; }
function isGerente()     { return getPerfil() === 'gerente'; }

// ── INICIALIZAÇÃO ──
window.addEventListener('DOMContentLoaded', () => {
    configurarPorPerfil();
    render();
});

function configurarPorPerfil() {
    const sub = document.getElementById('subtituloPage');
    const btn = document.getElementById('btnNovaSolic');

    if (isAnalista()) {
        sub.textContent = 'Minhas solicitações de crédito';
    } else if (isCoordenador()) {
        sub.textContent = 'Solicitações aguardando seu parecer';
        btn?.classList.add('hidden');
    } else if (isGerente()) {
        sub.textContent = 'Casos escalados para aprovação da gerência';
        btn?.classList.add('hidden');
    }
}

// ── RENDER PRINCIPAL ──
function render() {
    renderStats();
    renderFiltros();
    renderLista();
    renderBadgeHeader();
}

function getSolicVisiveis() {
    const all = getSolicAll();
    if (isAnalista())    return all.filter(s => s.analistaEmail === acUser.usuario);
    if (isCoordenador()) return all.filter(s => ['aguard_coord','revisao','aprovado','reprovado','aguard_gerente'].includes(s.status));
    if (isGerente())     return all.filter(s => ['aguard_gerente','aprovado','reprovado'].includes(s.status) && s.escalado);
    return all;
}

function renderBadgeHeader() {
    const badge = document.getElementById('headerBadge');
    if (!badge) return;
    const pendentes = getSolicAll().filter(s => {
        if (isCoordenador()) return s.status === 'aguard_coord';
        if (isGerente())     return s.status === 'aguard_gerente' && s.escalado;
        if (isAnalista())    return s.status === 'revisao' && s.analistaEmail === acUser.usuario;
        return false;
    }).length;
    if (pendentes > 0) { badge.textContent = pendentes; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
}

function renderStats() {
    const solic = getSolicVisiveis();
    const grid  = document.getElementById('statsGrid');
    if (!grid) return;

    const contar = (st) => solic.filter(s => s.status === st).length;
    const pendentes = isCoordenador() ? contar('aguard_coord')
                    : isGerente()     ? contar('aguard_gerente')
                    : solic.filter(s => s.status === 'revisao').length;

    const stats = [
        { label:'Total', val: solic.length, bg:'bg-white border border-gray-200', cor:'text-gray-800',
          iconBg:'bg-blue-100', iconColor:'#2B5FA6',
          svg:'<rect x="2" y="3" width="20" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 21h8M12 17v4"/>' },
        { label: isCoordenador()||isGerente() ? 'Aguardando' : 'Em Revisão',
          val: pendentes, bg:'bg-white border border-amber-200', cor:'text-amber-700',
          iconBg:'bg-amber-100', iconColor:'#b45309',
          svg:'<circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/>' },
        { label:'Aprovadas', val: contar('aprovado'), bg:'bg-white border border-emerald-200', cor:'text-emerald-700',
          iconBg:'bg-emerald-100', iconColor:'#065f46',
          svg:'<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
        { label:'Reprovadas', val: contar('reprovado'), bg:'bg-white border border-red-200', cor:'text-red-700',
          iconBg:'bg-red-100', iconColor:'#991b1b',
          svg:'<path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
    ];
    grid.innerHTML = stats.map(s => `
        <div class="card ${s.bg} flex items-center gap-4 p-4">
            <div class="w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0" style="color:${s.iconColor}">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">${s.svg}</svg>
            </div>
            <div>
                <p class="text-2xl font-extrabold ${s.cor} leading-tight">${s.val}</p>
                <p class="text-xs font-semibold text-gray-400">${s.label}</p>
            </div>
        </div>`).join('');
}

function renderFiltros() {
    const wrap = document.getElementById('filtrosWrap');
    if (!wrap) return;

    let filtros = [{ key:'todos', label:'Todos' }];
    if (isAnalista()) {
        filtros = filtros.concat([
            { key:'aguard_coord',   label:'Aguardando' },
            { key:'revisao',        label:'Em Revisão'  },
            { key:'aprovado',       label:'Aprovados'   },
            { key:'reprovado',      label:'Reprovados'  },
        ]);
    } else if (isCoordenador()) {
        filtros = filtros.concat([
            { key:'aguard_coord',   label:'Aguardando Parecer' },
            { key:'revisao',        label:'Em Revisão'         },
            { key:'aguard_gerente', label:'Escalados'          },
            { key:'aprovado',       label:'Aprovados'          },
            { key:'reprovado',      label:'Reprovados'         },
        ]);
    } else if (isGerente()) {
        filtros = filtros.concat([
            { key:'aguard_gerente', label:'Aguardando Parecer' },
            { key:'aprovado',       label:'Aprovados'          },
            { key:'reprovado',      label:'Reprovados'         },
        ]);
    }

    wrap.innerHTML = filtros.map(f => `
        <button onclick="setFiltro('${f.key}', this)" class="tab-btn-filt ${filtroAtivo === f.key ? 'active' : ''}">
            ${f.label}
        </button>`).join('');
}

function setFiltro(key, btn) {
    filtroAtivo = key;
    document.querySelectorAll('.tab-btn-filt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLista();
}

function renderLista() {
    let solic = getSolicVisiveis();
    if (filtroAtivo !== 'todos') solic = solic.filter(s => s.status === filtroAtivo);
    solic = solic.slice().reverse();

    const lista = document.getElementById('listaSolicacoes');
    const empty = document.getElementById('emptyState');
    const emptyMsg = document.getElementById('emptyMsg');

    if (solic.length === 0) {
        lista.innerHTML = '';
        empty.classList.remove('hidden');
        if (isAnalista()) emptyMsg.textContent = 'Crie uma nova solicitação de crédito clicando no botão acima.';
        else if (isCoordenador()) emptyMsg.textContent = 'Nenhuma solicitação aguardando seu parecer.';
        else emptyMsg.textContent = 'Nenhum caso escalado para a gerência.';
        return;
    }
    empty.classList.add('hidden');

    lista.innerHTML = solic.map(s => {
        const st     = STATUS[s.status] || STATUS.rascunho;
        const isNew  = (isCoordenador() && s.status === 'aguard_coord') ||
                       (isGerente()     && s.status === 'aguard_gerente' && s.escalado) ||
                       (isAnalista()    && s.status === 'revisao');
        return `
        <div class="sol-card ${isNew ? 'border-blue-300 bg-blue-50/20' : ''}" onclick="abrirDetalhe('${s.id}')">
            <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                        ${isNew ? '<span class="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>' : ''}
                        <p class="font-bold text-gray-800 text-sm">${s.nomeEmpresa || '—'}</p>
                        <span class="badge ${st.cor} text-xs border">${st.label}</span>
                        ${s.escalado ? '<span class="badge bg-purple-50 text-purple-700 border-purple-200 text-xs border">⬆️ Escalado</span>' : ''}
                    </div>
                    <p class="text-xs font-mono text-gray-400">${formatCNPJ(s.cnpj)}</p>
                    <div class="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        ${s.limiteSugerido ? `<span class="flex items-center gap-1"><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Limite: <strong>${s.limiteSugerido}</strong></span>` : ''}
                        <span class="flex items-center gap-1"><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> ${s.analistaNome}</span>
                        <span class="flex items-center gap-1"><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 2v4M8 2v4M3 10h18"/></svg> ${formatDate(s.criadoEm)}</span>
                    </div>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" stroke-width="2" class="shrink-0 mt-1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </div>
        </div>`;
    }).join('');
}

// ── MODAL NOVA SOLICITAÇÃO ──
function abrirModalNova() {
    document.getElementById('modalNova').classList.remove('hidden');
}
function fecharModalNova() {
    document.getElementById('modalNova').classList.add('hidden');
    ['nov_cnpj','nov_nome','nov_reuniao','nov_perfil','nov_consumo','nov_limite','nov_condicoes','nov_obs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const sel = document.getElementById('nov_serasa');
    if (sel) sel.value = '';
    document.getElementById('novError')?.classList.add('hidden');
}

async function buscarNomeEmpresa() {
    const cnpj = cleanCNPJ(document.getElementById('nov_cnpj')?.value || '');
    if (cnpj.length !== 14) return;
    const nomeEl = document.getElementById('nov_nome');
    if (nomeEl && !nomeEl.value) {
        nomeEl.placeholder = 'Buscando...';
        try {
            const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            const data = await res.json();
            if (data.razao_social) nomeEl.value = data.razao_social;
        } catch {}
        nomeEl.placeholder = 'Razão Social';
    }
}

async function salvarSolicitacao() {
    const cnpj    = cleanCNPJ(document.getElementById('nov_cnpj')?.value || '');
    const nome    = document.getElementById('nov_nome')?.value.trim();
    const reuniao = document.getElementById('nov_reuniao')?.value.trim();
    const limite  = document.getElementById('nov_limite')?.value.trim();

    if (!cnpj || cnpj.length !== 14) { showNovError('Informe um CNPJ válido.'); return; }
    if (!nome)    { showNovError('Informe a razão social da empresa.'); return; }
    if (!reuniao) { showNovError('Preencha o resumo da reunião.'); return; }
    if (!limite)  { showNovError('Informe o limite de crédito sugerido.'); return; }

    const solic = {
        id:             Date.now().toString(),
        cnpj,
        nomeEmpresa:    nome,
        analistaEmail:  acUser.usuario,
        analistaNome:   acUser.nome,
        resumoReuniao:  reuniao,
        perfilCliente:  document.getElementById('nov_perfil')?.value.trim(),
        consumoEstimado:document.getElementById('nov_consumo')?.value.trim(),
        limiteSugerido: limite,
        condicoesSuger: document.getElementById('nov_condicoes')?.value.trim(),
        serasaSituacao: document.getElementById('nov_serasa')?.value,
        observacoes:    document.getElementById('nov_obs')?.value.trim(),
        status:         'aguard_coord',
        criadoEm:       new Date().toISOString(),
        escalado:       false,
        historico: [{
            acao:    'Solicitação criada e enviada ao Coordenador',
            usuario: acUser.nome,
            data:    new Date().toISOString(),
            cor:     'bg-blue-500'
        }]
    };

    const all = getSolicAll();
    all.push(solic);
    saveSolicAll(all);
    fecharModalNova();

    // Enviar e-mail ao coordenador
    await notificarCoordenador(solic);

    mostrarSucesso(
        '✅ Solicitação Enviada!',
        `Solicitação para ${nome} enviada ao Coordenador Pierre Alves. Ele receberá uma notificação por e-mail.`
    );
    render();
}

function showNovError(msg) {
    const el = document.getElementById('novError');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

// ── MODAL DETALHE ──
function abrirDetalhe(id) {
    const s = getSolicById(id);
    if (!s) return;
    solAtual = s;
    const el = document.getElementById('modalDetalheConteudo');
    el.innerHTML = buildDetalheHTML(s);
    document.getElementById('modalDetalhe').classList.remove('hidden');
}
function fecharModalDetalhe() {
    document.getElementById('modalDetalhe').classList.add('hidden');
    solAtual = null;
}

function buildDetalheHTML(s) {
    const st = STATUS[s.status] || STATUS.rascunho;

    // Bloco de dados da solicitação
    const dadosHTML = `
        <div class="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <p class="font-bold text-gray-800">${s.nomeEmpresa}</p>
                    <p class="text-xs font-mono text-gray-400">${formatCNPJ(s.cnpj)}</p>
                </div>
                <span class="badge ${st.cor} border text-xs shrink-0">${st.label}</span>
            </div>
            <div class="grid sm:grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                <div><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Limite Sugerido</span><p class="font-semibold mt-0.5">${s.limiteSugerido || '—'}</p></div>
                <div><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Condições Sugeridas</span><p class="font-semibold mt-0.5">${s.condicoesSuger || '—'}</p></div>
                <div><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Consumo Estimado</span><p class="font-semibold mt-0.5">${s.consumoEstimado || '—'}</p></div>
                <div><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Serasa</span><p class="font-semibold mt-0.5">${SERASA_LABEL[s.serasaSituacao] || '—'}</p></div>
            </div>
            ${s.resumoReuniao ? `<div class="mt-2"><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Resumo da Reunião</span><p class="text-xs text-gray-600 mt-0.5">${s.resumoReuniao}</p></div>` : ''}
            ${s.perfilCliente ? `<div class="mt-1"><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Perfil do Cliente</span><p class="text-xs text-gray-600 mt-0.5">${s.perfilCliente}</p></div>` : ''}
            ${s.observacoes ? `<div class="mt-1"><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Observações</span><p class="text-xs text-gray-600 mt-0.5">${s.observacoes}</p></div>` : ''}
            <p class="text-xs text-gray-400 pt-1">Solicitado por <strong>${s.analistaNome}</strong> em ${formatDate(s.criadoEm)}</p>
        </div>`;

    // Histórico/timeline
    const histHTML = s.historico?.length ? `
        <div class="mb-5">
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Histórico</p>
            <div class="space-y-0">
                ${s.historico.slice().reverse().map(h => `
                    <div class="timeline-item">
                        <div class="timeline-dot ${h.cor || 'bg-blue-400'}"></div>
                        <p class="text-sm text-gray-700">${h.acao}</p>
                        <p class="text-xs text-gray-400 mt-0.5">${h.usuario} · ${formatDate(h.data)} ${new Date(h.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p>
                        ${h.comentario ? `<p class="text-xs text-gray-500 italic mt-0.5 bg-gray-50 rounded px-2 py-1">"${h.comentario}"</p>` : ''}
                    </div>`).join('')}
            </div>
        </div>` : '';

    // Parecer final (se já decidido)
    const parecerFinalHTML = s.parecerFinal ? `
        <div class="mb-5 p-4 rounded-xl border ${s.status === 'aprovado' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}">
            <p class="text-sm font-bold ${s.status === 'aprovado' ? 'text-emerald-800' : 'text-red-800'} mb-2">Parecer Final</p>
            <div class="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
                <div><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Limite Aprovado</span><p class="font-bold mt-0.5">${s.parecerFinal.limiteAprovado || '—'}</p></div>
                <div><span class="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Condições</span><p class="font-bold mt-0.5">${s.parecerFinal.condicoes || '—'}</p></div>
            </div>
            <p class="text-xs text-gray-600 mt-2 italic">"${s.parecerFinal.justificativa}"</p>
            <p class="text-xs text-gray-400 mt-1">Por <strong>${s.parecerFinal.aprovadorNome}</strong> em ${formatDate(s.parecerFinal.data)}</p>
        </div>` : '';

    // Formulário de ação (dependendo do perfil e status)
    let acaoHTML = '';

    // COORDENADOR vendo solicitação aguardando
    if (isCoordenador() && s.status === 'aguard_coord') {
        acaoHTML = `
            <div class="border-t border-gray-100 pt-5">
                <p class="text-sm font-bold text-gray-700 mb-4">Seu Parecer</p>
                <div class="space-y-3">
                    <div class="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label>Limite Aprovado</label>
                            <input type="text" id="par_limite" placeholder="Ex: R$ 40.000,00" value="${s.limiteSugerido || ''}">
                        </div>
                        <div>
                            <label>Condições de Pagamento</label>
                            <input type="text" id="par_condicoes" placeholder="Ex: 30/60/90 dias">
                        </div>
                    </div>
                    <div>
                        <label>Justificativa / Comentário <span class="text-red-400 text-xs">*</span></label>
                        <textarea id="par_just" rows="2" placeholder="Explique sua decisão..."></textarea>
                    </div>
                    <div id="par_escalamento" class="hidden">
                        <label>Motivo do Escalonamento <span class="text-red-400 text-xs">*</span></label>
                        <textarea id="par_motivo_esc" rows="2" placeholder="Por que está escalando para o gerente?"></textarea>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                    <button onclick="darParecer('aprovado')" class="btn-primary text-xs py-2 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Aprovar
                    </button>
                    <button onclick="darParecer('reprovado')" class="btn-primary text-xs py-2 flex items-center justify-center gap-1.5" style="background:#dc2626">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        Reprovar
                    </button>
                    <button onclick="darParecer('revisao')" class="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        Revisão
                    </button>
                    <button onclick="mostrarEscalamento()" class="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5" style="color:#7c3aed;border-color:#c4b5fd">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                        Escalar Gerente
                    </button>
                </div>
            </div>`;
    }

    // GERENTE vendo solicitação escalada
    if (isGerente() && s.status === 'aguard_gerente' && s.escalado) {
        acaoHTML = `
            <div class="border-t border-gray-100 pt-5">
                <div class="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800">
                    <strong>Escalado pelo Coordenador Pierre:</strong> ${s.motivoEscalamento || '—'}
                </div>
                <p class="text-sm font-bold text-gray-700 mb-4">Decisão Final da Gerência</p>
                <div class="space-y-3">
                    <div class="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label>Limite Aprovado</label>
                            <input type="text" id="par_limite" placeholder="Ex: R$ 40.000,00" value="${s.limiteSugerido || ''}">
                        </div>
                        <div>
                            <label>Condições de Pagamento</label>
                            <input type="text" id="par_condicoes" placeholder="Ex: 30/60/90 dias">
                        </div>
                    </div>
                    <div>
                        <label>Justificativa / Comentário <span class="text-red-400 text-xs">*</span></label>
                        <textarea id="par_just" rows="2" placeholder="Explique sua decisão final..."></textarea>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 mt-4">
                    <button onclick="darParecer('aprovado')" class="btn-primary text-xs py-2 flex items-center justify-center gap-1.5" style="background:#059669">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Aprovar
                    </button>
                    <button onclick="darParecer('reprovado')" class="btn-primary text-xs py-2 flex items-center justify-center gap-1.5" style="background:#dc2626">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        Reprovar
                    </button>
                    <button onclick="darParecer('revisao')" class="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        Solicitar Revisão
                    </button>
                </div>
            </div>`;
    }

    // ANALISTA vendo em revisão (pode reenviar)
    if (isAnalista() && s.status === 'revisao') {
        acaoHTML = `
            <div class="border-t border-gray-100 pt-5">
                <div class="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <p class="text-sm font-semibold text-orange-800 mb-1">🔄 Revisão Solicitada</p>
                    <p class="text-xs text-orange-700">${s.historico?.slice(-1)[0]?.comentario || 'Verifique o histórico para mais detalhes.'}</p>
                </div>
                <div>
                    <label>Atualização / Resposta à Revisão</label>
                    <textarea id="par_just" rows="2" placeholder="Descreva as alterações realizadas ou informações adicionais..."></textarea>
                </div>
                <button onclick="reenviarSolicitacao()" class="btn-primary text-sm mt-3 flex items-center gap-2">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    Reenviar para Aprovação
                </button>
            </div>`;
    }

    return `
        <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-bold text-gray-800">Solicitação de Crédito</h3>
            <button onclick="fecharModalDetalhe()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        ${dadosHTML}
        ${parecerFinalHTML}
        ${histHTML}
        ${acaoHTML}
    `;
}

// ── AÇÕES ──
function mostrarEscalamento() {
    const div = document.getElementById('par_escalamento');
    if (div) div.classList.toggle('hidden');
}

async function darParecer(decisao) {
    if (!solAtual) return;

    const just    = document.getElementById('par_just')?.value.trim();
    const limite  = document.getElementById('par_limite')?.value.trim();
    const cond    = document.getElementById('par_condicoes')?.value.trim();
    const escalDiv= document.getElementById('par_escalamento');
    const escalar = escalDiv && !escalDiv.classList.contains('hidden');
    const motivo  = document.getElementById('par_motivo_esc')?.value.trim();

    if (!just) { alert('Preencha a justificativa.'); return; }
    if (escalar && !motivo) { alert('Informe o motivo do escalonamento.'); return; }

    const acao = {
        aprovado:  { label: 'Solicitação aprovada', cor: 'bg-emerald-500' },
        reprovado: { label: 'Solicitação reprovada', cor: 'bg-red-500' },
        revisao:   { label: 'Revisão solicitada ao Analista', cor: 'bg-orange-400' },
    }[decisao];

    const novoHistorico = [
        ...(solAtual.historico || []),
        {
            acao:      escalar ? 'Escalado para o Gerente Angelo' : acao.label,
            usuario:   acUser.nome,
            data:      new Date().toISOString(),
            cor:       escalar ? 'bg-purple-500' : acao.cor,
            comentario: just
        }
    ];

    const changes = {
        status:    escalar ? 'aguard_gerente' : decisao,
        escalado:  escalar,
        motivoEscalamento: escalar ? motivo : undefined,
        historico: novoHistorico,
    };

    // Adiciona parecer final se decisão definitiva
    if (!escalar && (decisao === 'aprovado' || decisao === 'reprovado')) {
        changes.parecerFinal = {
            limiteAprovado: limite,
            condicoes:      cond,
            justificativa:  just,
            aprovadorNome:  acUser.nome,
            data:           new Date().toISOString()
        };
    }

    const updated = updateSolic(solAtual.id, changes);
    fecharModalDetalhe();

    // Enviar e-mails
    if (escalar) {
        await notificarGerente(updated, motivo);
        mostrarSucesso('⬆️ Escalado para Gerência', `Angelo Gracioli foi notificado por e-mail sobre o caso ${updated.nomeEmpresa}.`);
    } else if (decisao === 'revisao') {
        await notificarAnalista(updated, 'revisao', { justificativa: just });
        mostrarSucesso('🔄 Revisão Solicitada', `${updated.analistaNome} foi notificado para revisar a solicitação.`);
    } else {
        await notificarAnalista(updated, decisao, { limiteAprovado: limite, condicoes: cond, justificativa: just });
        if (updated.escalado) await notificarCoordenadorRetorno(updated, decisao, { limiteAprovado: limite, condicoes: cond, justificativa: just });
        mostrarSucesso(
            decisao === 'aprovado' ? '✅ Crédito Aprovado!' : '❌ Crédito Reprovado',
            `${updated.analistaNome} foi notificado por e-mail com o resultado.`
        );
    }
    render();
}

async function reenviarSolicitacao() {
    if (!solAtual) return;
    const comentario = document.getElementById('par_just')?.value.trim();
    if (!comentario) { alert('Descreva as alterações realizadas.'); return; }

    const updated = updateSolic(solAtual.id, {
        status: 'aguard_coord',
        historico: [
            ...(solAtual.historico || []),
            { acao:'Solicitação revisada e reenviada ao Coordenador', usuario: acUser.nome, data: new Date().toISOString(), cor:'bg-blue-400', comentario }
        ]
    });
    fecharModalDetalhe();
    await notificarCoordenador(updated);
    mostrarSucesso('✅ Reenviado!', 'Pierre Alves foi notificado com a atualização da solicitação.');
    render();
}

// ── HELPERS ──
function mostrarSucesso(titulo, msg) {
    document.getElementById('sucessoTitulo').textContent = titulo;
    document.getElementById('sucessoMsg').textContent    = msg;
    document.getElementById('modalSucesso').classList.remove('hidden');
}

function maskCNPJModal(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
    input.value = v;
}
