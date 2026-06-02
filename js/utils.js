// ============================================
// UTILS.JS — Funções utilitárias
// Análise de Crédito - Cristal Sete
// ============================================

// Formatar CNPJ enquanto digita
function maskCNPJ(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
    input.value = v;
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.style.display = v.length > 0 ? 'block' : 'none';
}

function formatCNPJ(v) {
    const d = String(v || '').replace(/\D/g, '');
    if (d.length !== 14) return v;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function cleanCNPJ(v) {
    return String(v || '').replace(/\D/g, '');
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('pt-BR');
}

function calcAge(dateStr) {
    if (!dateStr) return 'Não informado';
    const d = new Date(dateStr);
    if (isNaN(d)) return 'Não informado';
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear();
    let m = now.getMonth() - d.getMonth();
    if (m < 0) { y--; m += 12; }
    if (y === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
    if (m === 0) return `${y} ${y === 1 ? 'ano' : 'anos'}`;
    return `${y} ${y === 1 ? 'ano' : 'anos'} e ${m} ${m === 1 ? 'mês' : 'meses'}`;
}

function formatMoney(v) {
    if (v === null || v === undefined || v === '') return '—';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function situacaoClass(sit) {
    const s = String(sit || '').toLowerCase();
    if (s.includes('ativa'))   return 'sit-ativa';
    if (s.includes('baixa') || s.includes('inativa')) return 'sit-baixada';
    if (s.includes('suspens')) return 'sit-suspensa';
    return 'sit-default';
}

function buildInfoRow(label, value, copiavel) {
    const icone = copiavel ? `
        <button onclick="copiarCampo(this, \${JSON.stringify(copiavel)})"
            title="Copiar"
            class="btn-copiar-campo"
            style="opacity:0;transition:opacity 0.15s;background:none;border:none;cursor:pointer;padding:2px 4px;color:#9ca3af;vertical-align:middle;flex-shrink:0;border-radius:4px"
            onmouseover="this.style.color='#2B5FA6';this.style.background='#eff6ff'"
            onmouseout="this.style.color='#9ca3af';this.style.background='none'">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
        </button>` : '';
    return \`
        <div class="info-row"
            onmouseenter="this.querySelector && this.querySelector('.btn-copiar-campo') && (this.querySelector('.btn-copiar-campo').style.opacity='1')"
            onmouseleave="this.querySelector && this.querySelector('.btn-copiar-campo') && (this.querySelector('.btn-copiar-campo').style.opacity='0')">
            <span class="info-label">\${label}</span>
            <span class="info-value" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">\${value || '—'}\${icone}</span>
        </div>
    \`;
}

function copiarCampo(btn, texto) {
    if (!texto) return;
    navigator.clipboard.writeText(texto).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#059669" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
        btn.style.opacity = '1';
        btn.style.color   = '#059669';
        setTimeout(() => { btn.innerHTML = orig; btn.style.color = '#9ca3af'; }, 2000);
    });
}

// Storage de anotações
const STORAGE_KEY = 'ac_anotacoes_v1';
function getAnotacoes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
}
function saveAnotacoes(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Storage de histórico
const HIST_KEY = 'ac_historico_v1';
function getHistorico() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }
    catch { return []; }
}
function saveHistorico(data) {
    localStorage.setItem(HIST_KEY, JSON.stringify(data));
}
function addHistorico(cnpj, nome) {
    const h = getHistorico().filter(x => x.cnpj !== cnpj);
    h.unshift({ cnpj, nome, data: new Date().toISOString() });
    saveHistorico(h.slice(0, 15));
}
