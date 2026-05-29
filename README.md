# 📊 Análise de Crédito — Cristal Sete

Plataforma interna de consulta e análise de crédito empresarial do time financeiro da Cristal Sete.

## ✨ Funcionalidades

- 🔐 **Login com senha** — acesso restrito ao time financeiro
- 🔍 **Consulta de CNPJ** — dados da Receita Federal via BrasilAPI
- 👥 **Quadro Societário** — listagem de sócios com busca de outras empresas
- 📋 **Anotações de Crédito** — Score Serasa, situação, limite, restrições e observações
- 🕐 **Histórico de Consultas** — últimas 15 consultas salvas localmente
- ✅ **Painel de Aprovações** — gerenciar solicitações de crédito por cliente

## 🗂️ Estrutura de Arquivos

```
analise-credito/
├── login.html              # Página de login
├── index.html              # Consulta de CNPJ (principal)
├── historico.html          # Histórico de consultas
├── aprovacoes.html         # Painel de aprovações de crédito
├── css/
│   └── global.css          # Estilos globais
├── js/
│   ├── auth.js             # Autenticação e proteção de rotas
│   ├── utils.js            # Funções utilitárias
│   └── consulta.js         # Lógica principal da consulta
├── assets/
│   └── logos/
│       └── cristalsete.png
└── .github/
    └── workflows/
        └── deploy.yml      # Deploy automático GitHub Pages
```

## 👤 Usuários Padrão

| Usuário | Senha | Perfil |
|---------|-------|--------|
| `admin` | `credito2025` | Administrador |
| `financeiro` | `cristal@fin` | Analista |
| `gerente` | `gerente2025` | Gerente |

> ⚠️ Para alterar usuários, edite o arquivo `login.html` na seção `USUARIOS`.

## 🚀 Como fazer o deploy

1. Crie o repositório no GitHub como **público**
2. Vá em **Settings → Pages → Source → GitHub Actions**
3. Faça o push de todos os arquivos
4. O deploy acontece automaticamente

**URL do sistema:**  
`https://SEU-USUARIO.github.io/analise-credito/login.html`

## ⚙️ Tecnologias

- HTML5 + CSS3 (Tailwind CDN)
- JavaScript Vanilla
- GitHub Pages (hospedagem gratuita)
- BrasilAPI (dados da Receita Federal — gratuito)

## 📌 Observações

- Anotações e histórico são salvos no **localStorage** do navegador
- Dados da Receita Federal são públicos e não requerem chave de API
- A busca de empresas por CPF/nome de sócio requer serviço pago (Serasa, Casa dos Dados)
