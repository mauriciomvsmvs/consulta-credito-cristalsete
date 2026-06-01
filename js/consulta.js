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

    // Mostrar botão de solicitar aprovação (só para analista)
    const btnSolic = document.getElementById('btnSolicitarAprovacao');
    if (btnSolic) {
        const perfil = (JSON.parse(sessionStorage.getItem('ac_usuario') || '{}').perfil || '').toLowerCase();
        if (perfil === 'analista' || perfil === 'admin') {
            btnSolic.classList.remove('hidden');
        } else {
            btnSolic.classList.add('hidden');
        }
    }
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
        buildInfoRow('Inscrição Estadual', `
            <div class="flex items-center gap-2 flex-wrap">
                <input
                    type="text"
                    id="ie_inline"
                    value="${ie}"
                    placeholder="Digite a Inscrição Estadual..."
                    style="padding:4px 10px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:0.875rem;font-family:monospace;width:200px;transition:border-color 0.2s"
                    onfocus="this.style.borderColor='#2B5FA6';this.style.boxShadow='0 0 0 3px rgba(43,95,166,0.1)'"
                    onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"
                >
                <button onclick="salvarIEInline()" style="display:inline-flex;align-items:center;gap:5px;background:#2B5FA6;color:white;border:none;border-radius:6px;padding:5px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='#1e3a5f'" onmouseout="this.style.background='#2B5FA6'">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                    Salvar
                </button>
                <a href="${urlSintegra}" target="_blank" rel="noopener"
                   style="display:inline-flex;align-items:center;gap:5px;color:#2B5FA6;font-size:0.75rem;font-weight:600;border:1.5px solid #bfdbfe;background:#eff6ff;padding:4px 10px;border-radius:6px;text-decoration:none;transition:all 0.2s"
                   onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    Sintegra ${uf}
                </a>
                <span id="ie_toast" style="display:none;color:#065f46;font-size:0.75rem;font-weight:600;background:#d1fae5;padding:3px 10px;border-radius:6px">✓ Salvo!</span>
            </div>
        `),
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
    const end    = [d.logradouro, d.numero, d.complemento].filter(Boolean).join(', ');
    const cidade = [d.municipio, d.uf].filter(Boolean).join(' - ');
    const el     = document.getElementById('dadosEndereco');

    // Monta endereço completo para busca no Google
    const endCompleto = [end, d.bairro, d.municipio, d.uf, 'Brasil'].filter(Boolean).join(', ');
    const endEncoded  = encodeURIComponent(endCompleto);

    // Links Google (gratuitos, sem API key)
    const urlMaps       = `https://www.google.com/maps/search/?api=1&query=${endEncoded}`;
    const urlStreetView = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=&query=${endEncoded}`;
    const urlBusca      = `https://maps.google.com/?q=${endEncoded}`;

    const botoesEndereco = end ? `
        <div class="flex flex-wrap gap-2 mt-2">
            <a href="${urlMaps}" target="_blank" rel="noopener"
               class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-3 py-1.5 rounded-lg transition-all">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Ver no Maps
            </a>
            <a href="${urlBusca}" target="_blank" rel="noopener"
               class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-600 px-3 py-1.5 rounded-lg transition-all">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 22V12h6v10"/>
                </svg>
                Street View
            </a>
        </div>` : '';

    el.innerHTML = [
        buildInfoRow('Logradouro', end ? `<div>${end}${botoesEndereco}</div>` : '—'),
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

function salvarIEInline() {
    if (!cnpjAtual) return;
    const ie = document.getElementById('ie_inline')?.value.trim() || '';
    const todas = getAnotacoes();
    todas[cnpjAtual] = { ...(todas[cnpjAtual] || {}), inscricaoEstadual: ie };
    saveAnotacoes(todas);

    // Sincroniza campo da aba Anotações
    const antIe = document.getElementById('ant_ie');
    if (antIe) antIe.value = ie;

    // Toast inline
    const toast = document.getElementById('ie_toast');
    if (toast) {
        toast.style.display = 'inline-block';
        setTimeout(() => toast.style.display = 'none', 2500);
    }
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
    const tabs = ['geral', 'socios', 'atividades', 'anotacoes', 'biro', 'contrato', 'cartaocnpj', 'sintegra'];
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
    if (tab === 'biro')      renderBiro();
    if (tab === 'contrato')    renderContrato();
    if (tab === 'cartaocnpj') renderDocumento('cartaocnpj');
    if (tab === 'sintegra')   renderDocumento('sintegra');
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

// ============================================
// BIRÔ DE CRÉDITO
// ============================================
const BIRO_KEY = 'ac_biro_v1';
let biroAtivo    = null; // arquivo ativo no modal
let modalArquivo = null; // referência para download no modal

function getBiroFiles() {
    if (!cnpjAtual) return [];
    try { return JSON.parse(localStorage.getItem(BIRO_KEY + '_' + cnpjAtual) || '[]'); }
    catch { return []; }
}
function saveBiroFiles(files) {
    localStorage.setItem(BIRO_KEY + '_' + cnpjAtual, JSON.stringify(files));
}

function uploadBiro(input) {
    if (!cnpjAtual) return;
    const files = Array.from(input.files);
    if (!files.length) return;

    const existentes = getBiroFiles();
    let processados = 0;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            existentes.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2),
                nome: file.name,
                tipo: file.type,
                data: new Date().toISOString(),
                base64: e.target.result
            });
            processados++;
            if (processados === files.length) {
                saveBiroFiles(existentes);
                renderBiro();
            }
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

function renderBiro() {
    if (!cnpjAtual) return;
    const files = getBiroFiles();
    const lista  = document.getElementById('biroLista');
    const empty  = document.getElementById('biroEmpty');
    if (!lista) return;

    // Verificar se tem reavaliação agendada e mostrar banner
    renderBiroReavBanner();

    if (files.length === 0) {
        lista.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');

    lista.innerHTML = files.map((f, i) => `
        <div class="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:bg-red-50/30 transition-all group">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate">${f.nome}</p>
                    <p class="text-xs text-gray-400">${formatDate(f.data)} às ${new Date(f.data).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button onclick="verBiro(${i})" class="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Visualizar
                </button>
                <button onclick="removerBiro(${i})" class="text-gray-300 hover:text-red-500 transition-colors p-1.5">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function verBiro(idx) {
    const files = getBiroFiles();
    const f = files[idx];
    if (!f) return;
    biroAtivo    = f;
    modalArquivo = f;
    abrirModalPDF(f);
}

function removerBiro(idx) {
    if (!confirm('Remover este arquivo?')) return;
    const files = getBiroFiles();
    files.splice(idx, 1);
    saveBiroFiles(files);
    document.getElementById('biroViewer')?.classList.add('hidden');
    biroAtivo = null;
    renderBiro();
}

function downloadBiro(formato) {
    if (!biroAtivo) return;
    if (formato === 'pdf') {
        const a = document.createElement('a');
        a.href = biroAtivo.base64;
        a.download = biroAtivo.nome;
        a.click();
    } else {
        converterPdfParaJpeg(biroAtivo);
    }
}

// ============================================
// CONTRATO SOCIAL
// ============================================
const CONTRATO_KEY = 'ac_contrato_v1';
let contratoAtivo = null;

function getContratoFile() {
    if (!cnpjAtual) return null;
    try { return JSON.parse(localStorage.getItem(CONTRATO_KEY + '_' + cnpjAtual) || 'null'); }
    catch { return null; }
}
function saveContratoFile(data) {
    localStorage.setItem(CONTRATO_KEY + '_' + cnpjAtual, JSON.stringify(data));
}

function uploadContrato(input) {
    if (!cnpjAtual) return;
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = {
            nome: file.name,
            data: new Date().toISOString(),
            base64: e.target.result
        };
        saveContratoFile(data);
        contratoAtivo = data;
        renderContrato();
    };
    reader.readAsDataURL(file);
    input.value = '';
}

function renderContrato() {
    if (!cnpjAtual) return;
    const f = getContratoFile();
    const infoEl  = document.getElementById('contratoInfo');
    const emptyEl = document.getElementById('contratoEmpty');
    if (!infoEl) return;

    if (!f) {
        infoEl.classList.add('hidden');
        emptyEl?.classList.remove('hidden');
        return;
    }
    contratoAtivo = f;
    emptyEl?.classList.add('hidden');
    infoEl.classList.remove('hidden');
    document.getElementById('contratoNome').textContent = f.nome;
    document.getElementById('contratoData').textContent = `Enviado em ${formatDate(f.data)}`;
}

function verContrato() {
    const f = getContratoFile();
    if (!f) return;
    contratoAtivo = f;
    modalArquivo  = f;
    abrirModalPDF(f);
}

function removerContrato() {
    if (!confirm('Remover o contrato social?')) return;
    localStorage.removeItem(CONTRATO_KEY + '_' + cnpjAtual);
    contratoAtivo = null;
    document.getElementById('contratoViewer')?.classList.add('hidden');
    renderContrato();
}

function downloadContrato(formato) {
    const f = getContratoFile();
    if (!f) return;
    if (formato === 'pdf') {
        const a = document.createElement('a');
        a.href = f.base64;
        a.download = f.nome;
        a.click();
    } else {
        converterPdfParaJpeg(f);
    }
}

// ── MODAL PDF FULLSCREEN ──
function abrirModalPDF(arquivo) {
    const modal = document.getElementById('modalPDF');
    const frame = document.getElementById('modalPDFFrame');
    const nome  = document.getElementById('modalPDFNome');
    if (!modal || !frame) return;
    modalArquivo = arquivo;
    frame.src = arquivo.base64;
    nome.textContent = arquivo.nome;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function fecharModalPDF() {
    const modal = document.getElementById('modalPDF');
    const frame = document.getElementById('modalPDFFrame');
    if (modal) modal.classList.add('hidden');
    if (frame) frame.src = '';
    document.body.style.overflow = '';
    modalArquivo = null;
}

function modalDownload(formato) {
    if (!modalArquivo) return;
    if (formato === 'pdf') {
        const a = document.createElement('a');
        a.href = modalArquivo.base64;
        a.download = modalArquivo.nome;
        a.click();
    } else {
        converterPdfParaJpeg(modalArquivo);
    }
}

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModalPDF();
});

// ============================================
// CONVERSOR PDF → JPEG (via PDF.js CDN)
// ============================================
async function converterPdfParaJpeg(arquivo) {
    // Carrega PDF.js dinamicamente se necessário
    if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    try {
        const base64Data = arquivo.base64.split(',')[1];
        const binary = atob(base64Data);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
        const nomeBase = arquivo.nome.replace('.pdf', '');

        for (let i = 1; i <= pdf.numPages; i++) {
            const page    = await pdf.getPage(i);
            const scale   = 2; // alta resolução
            const viewport = page.getViewport({ scale });
            const canvas  = document.createElement('canvas');
            canvas.width  = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/jpeg', 0.92);
            a.download = `${nomeBase}_pagina${i}.jpg`;
            a.click();
            await new Promise(r => setTimeout(r, 300)); // pequeno delay entre downloads
        }
    } catch (e) {
        alert('Erro ao converter PDF para JPEG. Tente novamente.');
        console.error(e);
    }
}

// ============================================
// DOCUMENTOS GENÉRICOS: Cartão CNPJ + Sintegra
// ============================================
const DOC_KEY = 'ac_doc_v1';

function getDocFile(tipo) {
    if (!cnpjAtual) return null;
    try { return JSON.parse(localStorage.getItem(DOC_KEY + '_' + tipo + '_' + cnpjAtual) || 'null'); }
    catch { return null; }
}
function saveDocFile(tipo, data) {
    localStorage.setItem(DOC_KEY + '_' + tipo + '_' + cnpjAtual, JSON.stringify(data));
}
function removeDocFile(tipo) {
    localStorage.removeItem(DOC_KEY + '_' + tipo + '_' + cnpjAtual);
}

function uploadDocumento(input, tipo) {
    if (!cnpjAtual) return;
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        saveDocFile(tipo, { nome: file.name, data: new Date().toISOString(), base64: e.target.result });
        renderDocumento(tipo);
    };
    reader.readAsDataURL(file);
    input.value = '';
}

function renderDocumento(tipo) {
    if (!cnpjAtual) return;
    const f = getDocFile(tipo);
    const cap = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    const infoEl  = document.getElementById(tipo + 'Info');
    const emptyEl = document.getElementById(tipo + 'Empty');
    const nomeEl  = document.getElementById(tipo + 'Nome');
    const dataEl  = document.getElementById(tipo + 'Data');
    if (!infoEl) return;
    if (!f) {
        infoEl.classList.add('hidden');
        emptyEl?.classList.remove('hidden');
        return;
    }
    emptyEl?.classList.add('hidden');
    infoEl.classList.remove('hidden');
    if (nomeEl) nomeEl.textContent = f.nome;
    if (dataEl) dataEl.textContent = 'Enviado em ' + formatDate(f.data);
}

// ── Cartão CNPJ ──
function verCartaoCnpj() {
    const f = getDocFile('cartaocnpj');
    if (!f) return;
    modalArquivo = f;
    abrirModalPDF(f);
}
function removerCartaoCnpj() {
    if (!confirm('Remover o Cartão CNPJ?')) return;
    removeDocFile('cartaocnpj');
    renderDocumento('cartaocnpj');
}
function downloadCartaoCnpj(formato) {
    const f = getDocFile('cartaocnpj');
    if (!f) return;
    if (formato === 'pdf') { const a = document.createElement('a'); a.href = f.base64; a.download = f.nome; a.click(); }
    else converterPdfParaJpeg(f);
}

// ── Sintegra / IE ──
function verSintegra() {
    const f = getDocFile('sintegra');
    if (!f) return;
    modalArquivo = f;
    abrirModalPDF(f);
}
function removerSintegra() {
    if (!confirm('Remover o documento do Sintegra?')) return;
    removeDocFile('sintegra');
    renderDocumento('sintegra');
}
function downloadSintegra(formato) {
    const f = getDocFile('sintegra');
    if (!f) return;
    if (formato === 'pdf') { const a = document.createElement('a'); a.href = f.base64; a.download = f.nome; a.click(); }
    else converterPdfParaJpeg(f);
}

// ============================================
// SOLICITAR APROVAÇÃO PRÉ-PREENCHIDA
// ============================================
function abrirSolicitacaoPreenchida() {
    if (!dadosAtual) return;

    // Salva dados em sessionStorage para a página de aprovações ler
    sessionStorage.setItem('ac_prefill', JSON.stringify({
        cnpj:  dadosAtual.cnpj,
        nome:  dadosAtual.razao_social || dadosAtual.nome_fantasia || '',
        serasa: (getAnotacoes()[cleanCNPJ(dadosAtual.cnpj)] || {}).situacao || ''
    }));

    // Redireciona para aprovações
    window.location.href = 'aprovacoes.html?nova=1';
}

// ============================================
// AGENDAR REAVALIAÇÃO — Integração Birô ↔ Reavaliar
// ============================================
const REAV_KEY_BIRO = 'ac_reavaliacoes_v1'; // mesmo key da página reavaliar.html

function getReavaliacoesBiro() {
    try { return JSON.parse(localStorage.getItem(REAV_KEY_BIRO) || '[]'); } catch { return []; }
}
function saveReavaliacoesBiro(d) { localStorage.setItem(REAV_KEY_BIRO, JSON.stringify(d)); }

function renderBiroReavBanner() {
    if (!cnpjAtual) return;
    const reav    = getReavaliacoesBiro();
    const ativa   = reav.find(r => r.cnpj === cnpjAtual && r.status !== 'inativo');
    const banner  = document.getElementById('biroReavBanner');
    const texto   = document.getElementById('biroReavTexto');
    if (!banner) return;

    if (ativa) {
        banner.classList.remove('hidden');
        texto.textContent = `✅ Reavaliação agendada — próxima em ${formatDate(ativa.dataAlerta)} (a cada ${ativa.periodo} dias)`;
    } else {
        banner.classList.add('hidden');
    }
}

function abrirModalAgendarReav() {
    if (!dadosAtual || !cnpjAtual) return;
    const modal = document.getElementById('modalAgendarReav');
    if (!modal) return;

    // Preencher dados da empresa
    document.getElementById('agReav_nomeEmpresa').textContent = dadosAtual.razao_social || dadosAtual.nome_fantasia || '—';
    document.getElementById('agReav_cnpj').textContent        = formatCNPJ(cnpjAtual);

    // Data de hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('agReav_dataAtual').value = hoje;

    // Calcular próxima data com período padrão (60 dias)
    document.getElementById('agReav_periodo').value = '60';
    calcularProximaDataReav();

    // Verificar se já tem agendamento e preencher
    const reav   = getReavaliacoesBiro();
    const ativa  = reav.find(r => r.cnpj === cnpjAtual && r.status !== 'inativo');
    if (ativa) {
        document.getElementById('agReav_periodo').value = String(ativa.periodo);
        if (!['30','60','90','180','365'].includes(String(ativa.periodo))) {
            document.getElementById('agReav_periodo').value = 'custom';
            document.getElementById('agReav_customDiv').classList.remove('hidden');
            document.getElementById('agReav_diasCustom').value = ativa.periodo;
        }
        document.getElementById('agReav_obs').value = ativa.obs || '';
        calcularProximaDataReav();
    }

    modal.classList.remove('hidden');
}

function fecharModalAgendarReav() {
    document.getElementById('modalAgendarReav')?.classList.add('hidden');
}

function toggleCustomDias() {
    const sel = document.getElementById('agReav_periodo')?.value;
    document.getElementById('agReav_customDiv')?.classList.toggle('hidden', sel !== 'custom');
    calcularProximaDataReav();
}

function calcularProximaDataReav() {
    const periodoSel = document.getElementById('agReav_periodo')?.value;
    const dias       = periodoSel === 'custom'
        ? parseInt(document.getElementById('agReav_diasCustom')?.value) || 60
        : parseInt(periodoSel) || 60;
    const dataAtual  = document.getElementById('agReav_dataAtual')?.value || new Date().toISOString().split('T')[0];
    const prox       = new Date(dataAtual);
    prox.setDate(prox.getDate() + dias);
    const proxEl = document.getElementById('agReav_proximaData');
    if (proxEl) proxEl.textContent = formatDate(prox.toISOString().split('T')[0]) + ` (em ${dias} dias)`;
}

// Recalcular ao mudar data ou dias customizados
document.addEventListener('change', (e) => {
    if (['agReav_dataAtual', 'agReav_diasCustom', 'agReav_periodo'].includes(e.target?.id)) {
        calcularProximaDataReav();
    }
});

function salvarAgendamentoReav() {
    if (!cnpjAtual || !dadosAtual) return;

    const periodoSel = document.getElementById('agReav_periodo')?.value;
    const periodo    = periodoSel === 'custom'
        ? parseInt(document.getElementById('agReav_diasCustom')?.value) || 60
        : parseInt(periodoSel) || 60;
    const dataAtual  = document.getElementById('agReav_dataAtual')?.value || new Date().toISOString().split('T')[0];
    const obs        = document.getElementById('agReav_obs')?.value.trim() || '';

    if (periodo < 1 || periodo > 730) { alert('Período deve ser entre 1 e 730 dias.'); return; }

    // Calcular próxima data
    const prox = new Date(dataAtual);
    prox.setDate(prox.getDate() + periodo);
    const dataAlerta = prox.toISOString().split('T')[0];

    // Salvar/atualizar na lista de reavaliações
    const reav = getReavaliacoesBiro();
    const idx  = reav.findIndex(r => r.cnpj === cnpjAtual && r.status !== 'inativo');

    const registro = {
        id:             Date.now().toString(),
        cnpj:           cnpjAtual,
        nome:           dadosAtual.razao_social || dadosAtual.nome_fantasia || '',
        periodo,
        ultimaConsulta: dataAtual,
        dataAlerta,
        obs,
        status:         'ativo',
        criadoEm:       new Date().toISOString()
    };

    if (idx >= 0) reav[idx] = registro;
    else reav.push(registro);

    saveReavaliacoesBiro(reav);
    fecharModalAgendarReav();
    renderBiroReavBanner();

    // Feedback visual
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-[9999] flex items-center gap-2';
    toast.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Reavaliação agendada para ${formatDate(dataAlerta)}!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ============================================
// BUSCA NO HISTÓRICO
// ============================================
function buscarNoHistorico(termo) {
    const clearBtn  = document.getElementById('histBuscaClear');
    const resultDiv = document.getElementById('histBuscaResultados');
    const lista     = document.getElementById('histBuscaLista');

    if (!termo || termo.trim().length < 2) {
        fecharBuscaHistorico();
        return;
    }

    clearBtn?.classList.remove('hidden');
    const t       = termo.toLowerCase().replace(/\D/g, '') || termo.toLowerCase();
    const hist    = getHistorico();
    const ants    = getAnotacoes();

    const filtrados = hist.filter(h => {
        const cnpjLimpo = cleanCNPJ(h.cnpj);
        const nome      = (h.nome || '').toLowerCase();
        return cnpjLimpo.includes(t) || nome.includes(termo.toLowerCase());
    });

    resultDiv?.classList.remove('hidden');

    if (filtrados.length === 0) {
        lista.innerHTML = `<div class="hist-empty">Nenhuma consulta encontrada para "<strong>${termo}</strong>"</div>`;
        return;
    }

    lista.innerHTML = filtrados.slice(0, 8).map(h => {
        const ant     = ants[cleanCNPJ(h.cnpj)] || {};
        const sitCor  = {
            regular:   'bg-emerald-100 text-emerald-700',
            pendencias:'bg-amber-100 text-amber-700',
            restrita:  'bg-red-100 text-red-700',
        }[ant.situacao] || '';

        return `
        <div class="hist-result-item" onclick="selecionarDoHistorico('${h.cnpj}')">
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2B5FA6" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
            </div>
            <div class="flex-1 min-w-0">
                <p class="hist-result-nome truncate">${h.nome || '—'}</p>
                <p class="hist-result-cnpj">${formatCNPJ(h.cnpj)}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                ${ant.situacao ? `<span class="text-xs font-semibold px-2 py-0.5 rounded-full ${sitCor}">${ant.situacao === 'regular' ? 'Regular' : ant.situacao === 'pendencias' ? 'Pendências' : 'Restrita'}</span>` : ''}
                <span class="text-xs text-gray-400">${formatDate(h.data)}</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
            </div>
        </div>`;
    }).join('');
}

function selecionarDoHistorico(cnpj) {
    fecharBuscaHistorico();
    document.getElementById('cnpjInput').value = formatCNPJ(cnpj);
    document.getElementById('clearBtn').style.display = 'block';
    consultar(cnpj);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fecharBuscaHistorico() {
    const input     = document.getElementById('histBuscaInput');
    const clearBtn  = document.getElementById('histBuscaClear');
    const resultDiv = document.getElementById('histBuscaResultados');
    if (input)     input.value = '';
    clearBtn?.classList.add('hidden');
    resultDiv?.classList.add('hidden');
}

// Fechar ao clicar fora
document.addEventListener('click', (e) => {
    const card = document.querySelector('.hist-search-card');
    if (card && !card.contains(e.target)) fecharBuscaHistorico();
});
