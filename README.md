# Automação Sitra — Cadastros e CT-e manual

Extensão do Google Chrome que lê os documentos do motorista (CNH, cartão ANTT, CRV/CRLV,
comprovante de endereço, fotos/PDFs soltos ou o `.zip` da conversa do WhatsApp) com a IA do
Google Gemini e preenche as telas de cadastro do **Sitra Web Revolution**:

- **Proprietário** → **Veículo** → **Motorista** (nessa ordem: o veículo precisa do proprietário cadastrado).
- A extensão **nunca clica em "Cadastrar"**: ela preenche, mostra um relatório campo a campo e o operador confere e salva.
- **CT-e manual** → lê a nota, prepara os participantes e adiciona a NF-e/NF na Digitação de CT-e, sem emitir nem cadastrar.

## Instalar num computador (sem instalar nada além do Chrome)

1. Baixe o **cadastro-motorista-sitra.zip** da versão mais nova em
   <https://github.com/breviistransportes/Sitra_automacao/releases/latest>.
2. Extraia numa pasta fixa (ex.: `DocumentosCadastro Motorista Sitra`) — não apague essa pasta depois.
3. Abra `chrome://extensions`, ative o **Modo do desenvolvedor** (canto superior direito).
4. **Carregar sem compactação** → escolha a pasta extraída.
5. Fixe o ícone "Cadastro de Motorista – Sitra" (quebra-cabeça 🧩 na barra do Chrome).
6. Clique no ícone → **Configurações** → cole a **chave da API do Gemini** → Salvar.

> **Chave do Gemini:** crie em <https://aistudio.google.com/apikey> num projeto **com cobrança ativada**.
> No plano gratuito o Google pode usar o conteúdo enviado (documentos pessoais dos motoristas).
> A chave fica só no Chrome de cada computador — nunca coloque no código nem no repositório.

## Atualizar

Quando sair versão nova, o painel da extensão mostra **"Nova versão … disponível — baixar"**.
Baixe o `.zip`, extraia **por cima da mesma pasta** e, em `chrome://extensions`, clique em
**recarregar (↻)** na extensão. A chave e as configurações continuam salvas.

## Usar

1. Abra o painel da extensão (ícone na barra).
2. Arraste os documentos (fotos, PDFs ou `.zip`) e, se houver, cole as mensagens do motorista
   em **Informações adicionais** (telefone e e-mail só são lidos das mensagens).
3. **Ler documentos** → confira as abas **Motorista / Proprietário / Veículo** (amarelo = conferir).
   Com cavalo e carreta, cada CRLV vira uma aba (**Veículo 1 · Cavalo …**, **Veículo 2 · Carreta …**): são cadastros separados no Sitra.
   Na tela de Veículo, o painel preenche o veículo da aba que estiver aberta — cadastre um, troque de aba, abra a tela de novo e preencha o outro.
4. No Sitra, abra a tela (Proprietário, depois Veículo, depois Motorista) e clique em **Preencher no Sitra**.
5. Confira a tela do Sitra e clique em **Cadastrar**.

### Comparar com o CRM

Em **Configurações → CRM**, entre com a sua conta do CRM (logística ou admin). Depois de ler os documentos (ou ao abrir um cadastro do histórico), aparece o quadro **CRM — viagens programadas**: a viagem programada com o mesmo CPF ou alguma das placas, com ✅/⚠️ para CPF, nome e cada placa (cavalo e carreta). O quadro só avisa — não preenche nada nem altera o CRM. Corrigiu algo no painel? **Comparar de novo**.

### Histórico

Cada leitura fica guardada em **Histórico (N)**, na tela inicial, por 30 dias (no máximo 200 cadastros). Ali você reabre um cadastro, já conferido, para preencher de novo no Sitra sem ler os documentos outra vez. A cada **Preencher no Sitra** o histórico guarda também as correções feitas no painel. Dá para excluir um cadastro ou **Apagar tudo**.

### Usar o modo CT-e manual

1. No painel, selecione **CT-e manual**, anexe a foto ou o PDF da nota e clique em **Ler nota**.
2. Confira tudo que foi lido. Informe o CPF do motorista e selecione o tomador; expedidor e recebedor ficam em branco para preenchimento manual quando necessários.
3. No Sitra, abra **Digitação de CT-e** e escolha manualmente o **Tipo de Frete**.
4. Clique em **Preencher CT-e**. A extensão usa os dois primeiros CNPJs como remetente e destinatário, mantém **NF-e/NF**, põe o protocolo de autorização em **Chave NF-e**, usa o primeiro CFOP legível, seleciona **CONFORME NOTA**, informa **VOL** e marca **Frete Combinado**.
5. Complete manualmente o responsável pelo frete combinado, expedidor/recebedor quando aplicável, placas e qualquer campo que ficou vazio. Confira tudo antes de decidir se deve cadastrar.

O modo CT-e não escolhe o Tipo de Frete, não preenche placas ou responsável e nunca aciona **Cadastrar**.

### Usar o modo Pedágios (Sem Parar)

Para quando a rota do motorista não é a que o roteirizador do Sem Parar sugere.

1. Uma vez só: em **Configurações**, cole a **chave da API do Google Maps** (veja abaixo) e salve.
2. No portal Sem Parar Empresas, abra **Rotas → Cadastrar**, dê o nome da rota e clique em **Configurar pedágios**.
3. No painel, selecione **Pedágios**, cole o link do Google Maps que o motorista mandou e clique em **Marcar pedágios no Sem Parar**.
4. A extensão calcula a rota do link (mesmas paradas), escolhe as praças a até 500 m do caminho — de cada par, só a do
   sentido da viagem — e clica nelas no mapa, na ordem do caminho. O painel mostra o que entrou e o que precisa ser marcado à mão.
5. Confira no mapa do portal e clique em **Salvar rota**. A extensão nunca salva.

Se o painel pedir, recarregue a página do Sem Parar (**F5**): a extensão precisa estar ativa antes de o mapa carregar.
Se o motorista só **arrastou** a linha azul no Maps (sem adicionar parada), esse desvio não vai no link — confira o trecho.

**Chave do Google Maps:** no Google Cloud Console (o mesmo projeto da chave do Gemini serve), ative a **Routes API**,
crie uma chave em **Credenciais** e restrinja-a à "Routes API". O volume de rotas do dia a dia cabe na cota gratuita.

## Desenvolvimento

Precisa de [Node.js](https://nodejs.org) 20+: `npm install`, depois:

- `npm test` — testes (Vitest + jsdom).
- `npm run build` — gera `extensao/**/main.bundle.js` e `extensao/content/injetado.bundle.js`. **Esses arquivos ficam no git** (assim a pasta `extensao/` funciona até pelo "Download ZIP"): rode `npm run build` e faça commit deles junto com qualquer mudança em `src/`.
- `node tests/fixtures/gerar.mjs` — regera as cópias de teste das telas a partir das páginas salvas do Sitra
  em `campos_necessarios/` (essas páginas ficam fora do git). Nunca edite as fixtures à mão.
- Design e decisões: `docs/superpowers/specs/`. Planos: `docs/superpowers/plans/`.

## Publicar uma versão nova

1. Aumente `"version"` em `extensao/manifest.json` (ex.: `0.12.0`) e rode `npm test`.
2. Faça o commit e leve para a `main` (push direto ou PR mesclado).

Pronto: o workflow **Release** (`.github/workflows/release.yml`) roda os testes, monta o `cadastro-motorista-sitra.zip`
e publica a release `v0.12.0`. A partir daí o painel de todos os computadores mostra a faixa
"Você está na vX — a v0.12.0 já está disponível". Versão que já tem release é ignorada; para refazer, apague a release
no GitHub e rode o workflow à mão (Actions → Release → Run workflow).
**Não** use o botão verde "Code → Download ZIP" para instalar: ele traz o código-fonte, sem a extensão montada.

## Segurança e LGPD

- **Chave do Gemini:** use uma chave exclusiva da extensão, em projeto **com cobrança ativada**, restrita à
  "Generative Language API" (Google Cloud Console → Credenciais) e com limite de gasto. Troque a chave se o
  computador for compartilhado ou se ela vazar.
- **Conteúdo dos documentos não é confiável:** a extensão remove caracteres de HTML/script dos campos de texto,
  mantém em amarelo campos críticos lidos de texto/mensagem, só aceita telefone/e-mail que estejam escritos nas
  mensagens e recusa `.zip`/arquivos grandes demais. **Sempre confira** a conferência e a tela do Sitra antes de cadastrar.
- **Histórico:** guarda no Chrome do computador (não vai para nenhum servidor) os dados conferidos de cada cadastro — CPF, CNH, endereço, placas —, sem as fotos e PDFs, e apaga sozinho o que passou de 30 dias. Em computador compartilhado, use **Apagar tudo** ao terminar.
- **CRM:** a extensão só tem a chave publicável do CRM (a mesma de qualquer página pública dele); sem login ela não lê nenhuma viagem. Quem pode ver o quê é decidido pelas regras do CRM, pela conta do operador. A senha não fica salva, só a sessão ("Sair do CRM" encerra). Busca só as viagens programadas e só as colunas do cruzamento — nunca valores, margem ou pagamento.
- **Escopo:** a extensão só injeta no Sitra da empresa (`https://2323.aleff.com.br`) e envia para a página apenas
  os campos da tela aberta. No portal Sem Parar (`https://portal.sempararempresas.com.br`) ela só lê a lista de praças
  que o próprio portal carrega e clica nos marcadores do mapa — não salva rota nem compra vale-pedágio.
- **Pedágios:** o link do motorista e as paradas dele vão para o Google (Routes API) para calcular o caminho; nenhum dado do Sem Parar sai do navegador.
- **LGPD:** CNH, CPF, endereço e mensagens dos motoristas são enviados ao Google (Gemini) para leitura. Registre essa
  finalidade, a base legal e o Google como operador no registro de tratamento da empresa e informe os motoristas.
- **GitHub:** ative a verificação em 2 etapas na conta `breviistransportes` — o aviso de atualização aponta para os
  Releases deste repositório.
