# Sitra automação — Cadastro de Motorista, Proprietário e Veículo

Extensão do Google Chrome que lê os documentos do motorista (CNH, cartão ANTT, CRV/CRLV,
comprovante de endereço, fotos/PDFs soltos ou o `.zip` da conversa do WhatsApp) com a IA do
Google Gemini e preenche as telas de cadastro do **Sitra Web Revolution**:

- **Proprietário** → **Veículo** → **Motorista** (nessa ordem: o veículo precisa do proprietário cadastrado).
- A extensão **nunca clica em "Cadastrar"**: ela preenche, mostra um relatório campo a campo e o operador confere e salva.

## Instalar num computador

Pré-requisito: [Node.js](https://nodejs.org) 20 ou mais novo (só para gerar a extensão).

```bash
git clone https://github.com/breviistransportes/Sitra_automacao.git
cd Sitra_automacao
npm install
npm run build
```

No Chrome:

1. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
2. **Carregar sem compactação** → escolha a pasta `extensao/` do projeto.
3. Fixe o ícone "Cadastro de Motorista – Sitra" na barra.
4. Clique no ícone → **Configurações** → cole a **chave da API do Gemini** → Salvar.

> **Chave do Gemini:** crie em <https://aistudio.google.com/apikey> num projeto **com cobrança ativada**.
> No plano gratuito o Google pode usar o conteúdo enviado (documentos pessoais dos motoristas).
> A chave fica só no Chrome de cada computador — nunca coloque no código nem no repositório.

## Atualizar

```bash
git pull
npm install
npm run build
```

Depois, em `chrome://extensions`, clique em **recarregar (↻)** na extensão.

## Usar

1. Abra o painel da extensão (ícone na barra).
2. Arraste os documentos (fotos, PDFs ou `.zip`) e, se houver, cole as mensagens do motorista
   em **Informações adicionais** (telefone e e-mail só são lidos das mensagens).
3. **Ler documentos** → confira as abas **Motorista / Proprietário / Veículo** (amarelo = conferir).
4. No Sitra, abra a tela (Proprietário, depois Veículo, depois Motorista) e clique em **Preencher no Sitra**.
5. Confira a tela do Sitra e clique em **Cadastrar**.

## Desenvolvimento

- `npm test` — testes (Vitest + jsdom).
- `npm run build` — gera `extensao/**/main.bundle.js` e `extensao/content/injetado.bundle.js` (não versionados).
- `node tests/fixtures/gerar.mjs` — regera as cópias de teste das telas a partir das páginas salvas do Sitra
  em `campos_necessarios/` (essas páginas ficam fora do git). Nunca edite as fixtures à mão.
- Design e decisões: `docs/superpowers/specs/`. Planos: `docs/superpowers/plans/`.
