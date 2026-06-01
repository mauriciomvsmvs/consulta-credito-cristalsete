// ============================================
// EMAILJS-CONFIG.JS
// Configuração do serviço de e-mail
// ============================================
// INSTRUÇÕES DE CONFIGURAÇÃO:
// 1. Acesse https://www.emailjs.com e crie uma conta gratuita
// 2. Crie um "Email Service" conectado ao Gmail da empresa
// 3. Crie os templates de e-mail (instruções no README)
// 4. Substitua os valores abaixo com suas credenciais
// ============================================

const EMAILJS_CONFIG = {
    publicKey:        'IaQKcjQ7PJEfLOCtm',      // Account > API Keys
    serviceId:        'service_m4nbn9s',       // Email Services > Service ID
    templateAnalista: 'template_analista',          // ID do template para analista
    templateAprovador:'template_aprovador',          // ID do template para aprovador/gerente
};

// Usuários do sistema com perfis e e-mails
const USUARIOS_SISTEMA = {
    'mauricio.silva@cristalsete.com.br': {
        nome:   'Mauricio Vieira da Silva',
        perfil: 'analista',
        email:  'mauricio.silva@cristalsete.com.br'
    },
    'pierre.alves@cristalsete.com.br': {
        nome:   'Pierre André Alves',
        perfil: 'coordenador',
        email:  'pierre.alves@cristalsete.com.br'
    },
    'angelo@cristalsete.com.br': {
        nome:   'Angelo Gracioli',
        perfil: 'gerente',
        email:  'angelo@cristalsete.com.br'
    }
};

// Inicializa EmailJS
function initEmailJS() {
    if (typeof emailjs === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.onload = () => emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
        document.head.appendChild(script);
    } else {
        emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
    }
}
initEmailJS();

// Enviar notificação por e-mail
async function enviarEmail(destinatario, templateParams) {
    try {
        const result = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            templateParams.template,
            { ...templateParams, para_email: destinatario }
        );
        return result;
    } catch (e) {
        console.error('Erro ao enviar e-mail:', e);
        return null;
    }
}

// Notificar coordenador (nova solicitação)
async function notificarCoordenador(solicitacao) {
    const coord = USUARIOS_SISTEMA['pierre.alves@cristalsete.com.br'];
    return enviarEmail(coord.email, {
        template: EMAILJS_CONFIG.templateAprovador,
        para_nome:     coord.nome,
        assunto:       `Nova Solicitação de Crédito — ${solicitacao.nomeEmpresa}`,
        empresa:       solicitacao.nomeEmpresa,
        cnpj:          formatCNPJ(solicitacao.cnpj),
        analista:      solicitacao.analistaNome,
        limite:        solicitacao.limiteSugerido,
        resumo:        solicitacao.resumoReuniao,
        link:          `${window.location.origin}${window.location.pathname.replace('index.html','')}aprovacoes.html`,
        acao:          'Nova solicitação aguardando seu parecer'
    });
}

// Notificar gerente (escalamento)
async function notificarGerente(solicitacao, motivoEscalamento) {
    const ger = USUARIOS_SISTEMA['angelo@cristalsete.com.br'];
    return enviarEmail(ger.email, {
        template: EMAILJS_CONFIG.templateAprovador,
        para_nome:     ger.nome,
        assunto:       `Solicitação Escalada — ${solicitacao.nomeEmpresa}`,
        empresa:       solicitacao.nomeEmpresa,
        cnpj:          formatCNPJ(solicitacao.cnpj),
        analista:      solicitacao.analistaNome,
        limite:        solicitacao.limiteSugerido,
        resumo:        `Escalado pelo Coordenador: ${motivoEscalamento}`,
        link:          `${window.location.origin}${window.location.pathname.replace('index.html','')}aprovacoes.html`,
        acao:          'Solicitação escalada aguardando sua decisão'
    });
}

// Notificar analista (retorno)
async function notificarAnalista(solicitacao, decisao, parecer) {
    const anal = USUARIOS_SISTEMA['mauricio.silva@cristalsete.com.br'];
    const decisaoLabel = {
        aprovado:  '✅ APROVADA',
        reprovado: '❌ REPROVADA',
        revisao:   '🔄 REQUER REVISÃO'
    }[decisao] || decisao;

    return enviarEmail(anal.email, {
        template: EMAILJS_CONFIG.templateAnalista,
        para_nome:     anal.nome,
        assunto:       `Crédito ${decisaoLabel} — ${solicitacao.nomeEmpresa}`,
        empresa:       solicitacao.nomeEmpresa,
        cnpj:          formatCNPJ(solicitacao.cnpj),
        decisao:       decisaoLabel,
        limite:        parecer.limiteAprovado || '—',
        condicoes:     parecer.condicoes || '—',
        justificativa: parecer.justificativa,
        link:          `${window.location.origin}${window.location.pathname.replace('index.html','')}aprovacoes.html`,
        acao:          `Sua solicitação foi ${decisaoLabel}`
    });
}

// Notificar coordenador sobre decisão do gerente
async function notificarCoordenadorRetorno(solicitacao, decisao, parecer) {
    const coord = USUARIOS_SISTEMA['pierre.alves@cristalsete.com.br'];
    const decisaoLabel = { aprovado:'✅ APROVADA', reprovado:'❌ REPROVADA', revisao:'🔄 REQUER REVISÃO' }[decisao] || decisao;
    return enviarEmail(coord.email, {
        template: EMAILJS_CONFIG.templateAnalista,
        para_nome:     coord.nome,
        assunto:       `Decisão do Gerente — ${solicitacao.nomeEmpresa} — ${decisaoLabel}`,
        empresa:       solicitacao.nomeEmpresa,
        cnpj:          formatCNPJ(solicitacao.cnpj),
        decisao:       decisaoLabel,
        limite:        parecer.limiteAprovado || '—',
        condicoes:     parecer.condicoes || '—',
        justificativa: parecer.justificativa,
        link:          `${window.location.origin}${window.location.pathname.replace('index.html','')}aprovacoes.html`,
        acao:          'O Gerente deu o parecer final'
    });
}
