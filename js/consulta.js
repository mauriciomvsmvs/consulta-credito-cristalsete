// ============================================
// CONSULTA.JS — Lógica principal
// Análise de Crédito - Cristal Sete
// ============================================

const API_BASE = 'https://brasilapi.com.br/api';
let dadosAtual = null;
let cnpjAtual  = null;

// ---- INICIALIZAÇÃO ----
window.addEventListener('DOMContentLoaded', function() {
    renderHistorico();
    // Verifica se veio CNPJ na URL (para links do histórico)
    const params = new URLSearchParams(window.location.search);
    const c = params.get('cnpj');
    if (c) {
        document.getElementById('cnpjInput').value = formatCNPJ(c);
        document.getElementById('clearBtn').style.display = 'block';
        consultar(c);
    }
});

// ---- BUSCA ----
async function consultar(cnpjOverride) {
    const raw = cleanCNPJ(cnpjOverride || document.getElementById('cnpjInput').value);

    if (raw.length !== 14) {
        mostrarErro('CNPJ deve ter 14 dígitos.');
        return;
    }

    // UI: loading
    esconderErro();
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.remove('hidden');

    const btn = document.getElementById('searchBtn');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Consultando...`;

    try {
        const res = await fetch(`${API_BASE}/cnpj/v1/${raw}`);
        if (!res.ok) {
            if (res.status === 404) throw new Error('CNPJ não encontrado na Receita Federal. Verifique o número e tente novamente.');
            if (res.status === 429) throw new Error('Muitas consultas em sequência. Aguarde alguns segundos e tente novamente.');
            throw new Error(`Erro na consulta (código ${res.status}). Tente novamente.`);
        }
        const data = await res.json();
        dadosAtual = data;
        cnpjAtual  = raw;

        addHistorico(raw, data.razao_social || data.nome_fantasia || raw);
        renderResultado(data);
        renderHistorico();

    } catch (e) {
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
        mostrarErro(e.message || 'Erro ao consultar. Verifique a conexão com a internet.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Consultar`;
    }
}

// ---- RENDERIZAÇÃO DO RESULTADO ----
function renderResultado(d) {
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('resultSection').classList.remove('hidden');
    document.getElementById('emptyState').classList.add('hidden');

    // Header
    const nome = d.nome_fantasia || d.razao_social || '—';
    document.getElementById('nomeEmpresa').textContent = nome;
    document.getElementById('razaoSocial').textContent = d.nome_fantasia ? d.razao_social : '';
    document.getElementById('cnpjFormatado').textContent = formatCNPJ(d.cnpj);
    document.getElementById('sociosCount').textContent = (d.qsa || []).length;

    const sitEl  = document.getElementById('badgeSituacao');
    const sitTxt = d.descricao_situacao_cadastral || d.situacao_cadastral || '—';
    sitEl.textContent = sitTxt;
    sitEl.className   = 'badge ' + situacaoClass(sitTxt);

    document.getElementById('badgeTempo').textContent = calcAge(d.data_inicio_atividade);

    // Barra Serasa (se tiver anotação)
    renderSerasaBar();

    // Dados gerais
    renderDadosCadastrais(d);
    renderEndereco(d);
    renderContato(d);
    renderAtividades(d);
    renderSocios(d);
    renderAnotacoesForm();

    // Ativa tab geral
    showTab('geral', document.getElementById('tab-geral'));
}

function renderDadosCadastrais(d) {
    const el = document.getElementById('dadosCadastrais');
    const ant = getAnotacoes()[cnpjAtual] || {};
    const ie  = ant.inscricaoEstadual || '';
    const uf  = (d.uf || '').toUpperCase();

    // URL do Sintegra por estado
    const sintegraUrls = {
        AC: 'https://www1.sefaz.ac.gov.br/sistemas/sintegra/',
        AL: 'http://www2.sefaz.al.gov.br/sintegra/',
        AM: 'https://www.sefaz.am.gov.br/sintegra/',
        AP: 'https://www.sefaz.ap.gov.br/',
        BA: 'https://www.sefaz.ba.gov.br/contribuinte/sintegra/',
        CE: 'https://cav.receita.fazenda.gov.br/autenticacao/login',
        DF: 'https://www.receita.fazenda.df.gov.br/',
        ES: 'https://sintegra.sefaz.es.gov.br/',
        GO: 'https://www.sefaz.go.gov.br/sintegra/',
        MA: 'https://sistemas.sefaz.ma.gov.br/sintegra/',
        MG: 'https://www.fazenda.mg.gov.br/empresas/cadastro_contribuintes/sintegra/',
        MS: 'https://www.sefaz.ms.gov.br/sintegra/',
        MT: 'https://app.sefaz.mt.gov.br/0325677500623408/07957948325DBD5885256BE60073C158',
        PA: 'https://www.sefa.pa.gov.br/sintegra/',
        PB: 'https://www.sefaz.pb.gov.br/sintegra/',
        PE: 'https://www.sefaz.pe.gov.br/Servicos/SINTEGRA/Paginas/Consulta-SINTEGRA.aspx',
        PI: 'https://www.sefaz.pi.gov.br/sintegra/',
        PR: 'http://www.sintegra.fazenda.pr.gov.br/sintegra/',
        RJ: 'https://www.fazenda.rj.gov.br/sintegra/',
        RN: 'https://www.set.rn.gov.br/contentProducao/aplicacao/set_sintegra/consulta/default.asp',
        RO: 'https://www.sefin.ro.gov.br/',
        RR: 'https://www.sefaz.rr.gov.br/',
        RS: 'https://www.sefaz.rs.gov.br/sat/sintegraConsulta.aspx',
        SC: 'https://www.sef.sc.gov.br/',
        SE: 'https://www.sefaz.se.gov.br/sintegra/',
        SP: 'https://www.cadesp.fazenda.sp.gov.br/(S(ispyfmbawrilrpwo2mi1l524))/Pages/Cadastro/Consultas/ConsultaPublica/ConsultaPublica.aspx',
        TO: 'https://www.sefaz.to.gov.br/',
    };
    const urlSintegra = sintegraUrls[uf] || 'http://www.sintegra.gov.br/';

    const ieBadge = ie
        ? `<span class="font-mono">${ie}</span>
           <a href="${urlSintegra}" target="_blank" rel="noopener"
              class="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-all">
               <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
               Verificar no Sintegra
           </a>`
        : `<span class="text-gray-400 italic text-xs">Não informado</span>
           <a href="${urlSintegra}" target="_blank" rel="noopener"
              class="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-all">
               <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
               Consultar no Sintegra (${uf})
           </a>`;

    el.innerHTML = [
        buildInfoRow('Razão Social', d.razao_social),
        buildInfoRow('Nome Fantasia', d.nome_fantasia),
        buildInfoRow('CNPJ', `<span class="font-mono">${formatCNPJ(d.cnpj)}</span>`),
        buildInfoRow('Inscrição Estadual', ieBadge),
        buildInfoRow('Situação', `<span class="badge ${situacaoClass(d.descricao_situacao_cadastral || d.situacao_cadastral)}">${d.descricao_situacao_cadastral || d.situacao_cadastral || '—'}</span>`),
        buildInfoRow('Data de Abertura', formatDate(d.data_inicio_atividade)),
        buildInfoRow('Tempo de Existência', calcAge(d.data_inicio_atividade)),
        buildInfoRow('Natureza Jurídica', d.natureza_juridica),
        buildInfoRow('Capital Social', formatMoney(d.capital_social)),
        buildInfoRow('Porte da Empresa', d.porte),
        buildInfoRow('Tipo', d.descricao_identificador_matriz_filial),
    ].join('');
}

function renderEndereco(d) {
    const end = [d.logradouro, d.numero, d.complemento].filter(Boolean).join(', ');
    const cidade = [d.municipio, d.uf].filter(Boolean).join(' - ');
    const el = document.getElementById('dadosEndereco');
    el.innerHTML = [
        buildInfoRow('Logradouro', end || '—'),
        buildInfoRow('Bairro', d.bairro),
        buildInfoRow('Cidade / UF', cidade),
        buildInfoRow('CEP', `<span class="font-mono">${d.cep || '—'}</span>`),
    ].join('');
}

function renderContato(d) {
    const el = document.getElementById('dadosContato');
    el.innerHTML = [
        buildInfoRow('Telefone', d.ddd_telefone_1 ? `<span class="font-mono">${d.ddd_telefone_1}</span>` : null),
        buildInfoRow('Telefone 2', d.ddd_telefone_2 ? `<span class="font-mono">${d.ddd_telefone_2}</span>` : null),
        buildInfoRow('E-mail', d.email || null),
    ].join('');
}

function renderAtividades(d) {
    const el = document.getElementById('dadosAtividades');
    const secundarios = (d.cnaes_secundarios || []).filter(c => c.descricao && c.descricao !== 'Não informada');
    let html = [
        buildInfoRow('CNAE Principal', d.cnae_fiscal_descricao || '—'),
        buildInfoRow('Código CNAE', d.cnae_fiscal ? `<span class="font-mono">${d.cnae_fiscal}</span>` : null),
    ].join('');

    if (secundarios.length > 0) {
        html += `<div class="info-row"><span class="info-label">CNAEs Secundários</span><span class="info-value"><div class="flex flex-wrap gap-1.5 mt-1">`;
        secundarios.slice(0, 10).forEach(c => {
            html += `<span class="badge badge-gray text-xs">${c.codigo} — ${c.descricao}</span>`;
        });
        if (secundarios.length > 10) html += `<span class="text-xs text-gray-400">+${secundarios.length - 10} mais</span>`;
        html += `</div></span></div>`;
    }
    el.innerHTML = html;
}

function renderSocios(d) {
    const el = document.getElementById('listaSocios');
    const socios = d.qsa || [];
    if (socios.length === 0) {
        el.innerHTML = `<p class="text-sm text-gray-400 italic py-4">Nenhum sócio encontrado nos registros públicos.</p>`;
        return;
    }
    el.innerHTML = socios.map((s, i) => `
        <div class="socio-card mb-3">
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 flex-1">
                    <span class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        ${(s.nome_socio || '?')[0].toUpperCase()}
                    </span>
                    <div>
                        <p class="font-semibold text-gray-800 text-sm">${s.nome_socio || '—'}</p>
                        <p class="text-xs text-gray-400 mt-0.5">${s.qualificacao_socio || s.codigo_qualificacao_socio || '—'}</p>
                        ${s.cnpj_cpf_do_socio ? `<p class="text-xs font-mono text-gray-400 mt-1">Doc: ${s.cnpj_cpf_do_socio}</p>` : ''}
                        ${s.data_entrada_sociedade ? `<p class="text-xs text-gray-400 mt-0.5">Entrada: ${formatDate(s.data_entrada_sociedade)}</p>` : ''}
                    </div>
                </div>
                <button
                    class="socio-btn-busca btn-secondary text-xs py-1.5 px-3"
                    onclick="abrirBuscaSocio('${(s.nome_socio || '').replace(/'/g, "\\'")}', '${s.cnpj_cpf_do_socio || ''}')"
                    title="Buscar outras empresas deste sócio"
                >
                    🔎 Outras empresas
                </button>
            </div>
        </div>
    `).join('');
}

// ---- BUSCA POR SÓCIO ----
function abrirBuscaSocio(nome, doc) {
    const painel = document.getElementById('painelBuscaSocio');
    const conteudo = document.getElementById('conteudoBuscaSocio');
    painel.classList.remove('hidden');

    const cnpjLimpo = cleanCNPJ(doc);
    const podeCnsltCNPJ = cnpjLimpo.length === 14;

    conteudo.innerHTML = `
        <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p class="font-semibold text-blue-800 text-sm">${nome || '—'}</p>
            ${doc ? `<p class="text-xs font-mono text-blue-600 mt-0.5">Documento: ${doc}</p>` : ''}
        </div>

        <div class="alert alert-warning mb-5">
            <span>⚠️</span>
            <div>
                <p class="font-semibold text-sm">Limitação das APIs públicas</p>
                <p class="text-xs mt-1">A busca de empresas por CPF/nome de sócio não está disponível em fontes gratuitas. Use os serviços abaixo para esta consulta.</p>
            </div>
        </div>

        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Fontes recomendadas:</p>
        <div class="space-y-2 mb-5">
            <a href="https://casadosdados.com.br/solucao/cnpj" target="_blank" rel="noopener" class="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition-all group">
                <span class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg">🏠</span>
                <div>
                    <p class="text-sm font-semibold text-gray-700">Casa dos Dados</p>
                    <p class="text-xs text-gray-400">casadosdados.com.br — busca por sócio gratuita</p>
                </div>
                <span class="ml-auto text-gray-300 group-hover:text-blue-500 font-bold">→</span>
            </a>
            <a href="https://www.serasaexperian.com.br/consulte-cnpj/" target="_blank" rel="noopener" class="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition-all group">
                <span class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-lg">📊</span>
                <div>
                    <p class="text-sm font-semibold text-gray-700">Serasa Experian</p>
                    <p class="text-xs text-gray-400">serasaexperian.com.br — consulta paga completa</p>
                </div>
                <span class="ml-auto text-gray-300 group-hover:text-blue-500 font-bold">→</span>
            </a>
            <a href="https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp" target="_blank" rel="noopener" class="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition-all group">
                <span class="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-lg">🏛️</span>
                <div>
                    <p class="text-sm font-semibold text-gray-700">Receita Federal</p>
                    <p class="text-xs text-gray-400">receita.fazenda.gov.br — dados oficiais</p>
                </div>
                <span class="ml-auto text-gray-300 group-hover:text-blue-500 font-bold">→</span>
            </a>
        </div>

        ${podeCnsltCNPJ ? `
        <div class="pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400 mb-2">O documento deste sócio é um CNPJ. Você pode consultá-lo diretamente:</p>
            <button onclick="consultarSocio('${cnpjLimpo}')" class="btn-primary text-sm py-2 px-4">
                🔍 Consultar CNPJ ${doc} diretamente
            </button>
        </div>
        ` : ''}
    `;

    // Scroll suave até o painel
    painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharBuscaSocio() {
    document.getElementById('painelBuscaSocio').classList.add('hidden');
}

function consultarSocio(cnpj) {
    fecharBuscaSocio();
    document.getElementById('cnpjInput').value = formatCNPJ(cnpj);
    document.getElementById('clearBtn').style.display = 'block';
    consultar(cnpj);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- ANOTAÇÕES ----
function renderAnotacoesForm() {
    if (!cnpjAtual) return;
    const ant = getAnotacoes()[cnpjAtual] || {};
    document.getElementById('ant_score').value           = ant.score || '';
    document.getElementById('ant_situacao').value        = ant.situacao || '';
    document.getElementById('ant_limite').value          = ant.limite || '';
    document.getElementById('ant_restricoes').value      = ant.restricoes || '';
    document.getElementById('ant_ie').value              = ant.inscricaoEstadual || '';
    document.getElementById('ant_obs').value             = '';
    renderHistoricoObs(ant.notas || []);
}

function renderHistoricoObs(notas) {
    const secEl   = document.getElementById('historicoObs');
    const listaEl = document.getElementById('listaObs');
    if (notas.length === 0) { secEl.classList.add('hidden'); return; }
    secEl.classList.remove('hidden');
    listaEl.innerHTML = notas.slice().reverse().map(n => `
        <div class="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p class="text-sm text-gray-700">${n.texto}</p>
            <p class="text-xs text-gray-400 mt-1">${formatDate(n.data)} às ${new Date(n.data).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</p>
        </div>
    `).join('');
}

function salvarAnotacoes() {
    if (!cnpjAtual) return;
    const todas = getAnotacoes();
    const ant   = todas[cnpjAtual] || {};
    const obs   = document.getElementById('ant_obs').value.trim();

    todas[cnpjAtual] = {
        score:              document.getElementById('ant_score').value,
        situacao:           document.getElementById('ant_situacao').value,
        limite:             document.getElementById('ant_limite').value,
        restricoes:         document.getElementById('ant_restricoes').value,
        inscricaoEstadual:  document.getElementById('ant_ie').value,
        notas: [...(ant.notas || []), ...(obs ? [{ texto: obs, data: new Date().toISOString() }] : [])],
    };
    // Atualiza IE nos dados cadastrais sem recarregar tudo
    if (dadosAtual) renderDadosCadastrais(dadosAtual);
    saveAnotacoes(todas);
    document.getElementById('ant_obs').value = '';
    renderHistoricoObs(todas[cnpjAtual].notas || []);
    renderSerasaBar();

    // Toast
    const toast = document.getElementById('saveToast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function renderSerasaBar() {
    if (!cnpjAtual) return;
    const ant = (getAnotacoes()[cnpjAtual] || {});
    const bar = document.getElementById('serasaBar');
    if (!ant.situacao) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');

    const labels = {
        regular: '✅ Regular',
        pendencias: '⚠️ Com Pendências',
        restrita: '🔴 Restrita',
        nao_consultado: '⏳ Não Consultado'
    };
    const classes = {
        regular: 'serasa-regular badge',
        pendencias: 'serasa-pendente badge',
        restrita: 'serasa-restrito badge',
        nao_consultado: 'serasa-nao badge'
    };

    document.getElementById('serasaBadge').textContent  = labels[ant.situacao] || ant.situacao;
    document.getElementById('serasaBadge').className    = classes[ant.situacao] || 'badge badge-gray';
    document.getElementById('serasaScore').textContent  = ant.score ? `Score: ${ant.score}` : '';
    document.getElementById('serasaLimite').textContent = ant.limite ? `Limite: ${ant.limite}` : '';
}

// ---- ABAS ----
function showTab(tab, btnEl) {
    const tabs = ['geral', 'socios', 'atividades', 'anotacoes'];
    tabs.forEach(t => {
        const el = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (el) el.classList.add('hidden');
        const btn = document.getElementById(`tab-${t}`);
        if (btn) btn.classList.remove('active');
    });
    const active = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (active) active.classList.remove('hidden');
    if (btnEl) btnEl.classList.add('active');

    if (tab === 'anotacoes') renderAnotacoesForm();
}

// ---- HISTÓRICO ----
function renderHistorico() {
    const h = getHistorico();
    const sec = document.getElementById('historicoSection');
    const lista = document.getElementById('historicoLista');
    if (!sec || !lista) return;
    if (h.length === 0) { sec.classList.add('hidden'); return; }
    sec.classList.remove('hidden');
    lista.innerHTML = h.map(item => `
        <button
            onclick="carregarDoHistorico('${item.cnpj}')"
            class="historico-item flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-left"
        >
            <span class="text-xs font-mono text-gray-500">${formatCNPJ(item.cnpj)}</span>
            <span class="text-xs text-gray-400 hidden sm:inline truncate max-w-[140px]">${item.nome || ''}</span>
        </button>
    `).join('');
}

function carregarDoHistorico(cnpj) {
    document.getElementById('cnpjInput').value = formatCNPJ(cnpj);
    document.getElementById('clearBtn').style.display = 'block';
    consultar(cnpj);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparHistorico() {
    saveHistorico([]);
    renderHistorico();
}

// ---- HELPERS UI ----
function mostrarErro(msg) {
    document.getElementById('searchError').classList.remove('hidden');
    document.getElementById('searchErrorMsg').textContent = msg;
}
function esconderErro() {
    document.getElementById('searchError').classList.add('hidden');
}
function limparBusca() {
    document.getElementById('cnpjInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    esconderErro();
    dadosAtual = null;
    cnpjAtual = null;
}
