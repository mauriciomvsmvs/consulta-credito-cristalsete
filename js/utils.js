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

function buildInfoRow(label, value) {
    return `
        <div class="info-row">
            <span class="info-label">${label}</span>
            <span class="info-value">${value || '—'}</span>
        </div>
    `;
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

// Copiar campo individual
function copiarCampo(texto) {
    if (!texto) return;
    navigator.clipboard.writeText(texto).then(() => {
        // feedback visual simples
    });
}
