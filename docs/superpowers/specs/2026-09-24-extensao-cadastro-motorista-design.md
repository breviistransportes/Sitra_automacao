# Extensão Chrome — Cadastro de Motorista no Sitra Web Revolution

**Data:** 2026-09-24
**Status:** aguardando revisão

## 1. Objetivo

Reduzir o cadastro de um motorista no Sitra Web Revolution de ~15 min para ~1–2 min
(só conferência). O motorista envia dados e documentos pelo WhatsApp; o operador
solta na extensão **os documentos soltos** (fotos/PDFs baixados do WhatsApp) **ou** a
conversa exportada como `.zip`, confere os campos extraídos por IA
e a extensão preenche o formulário do Sitra. **O operador clica em "Cadastrar".**

### Fora do escopo (v1)
- Anexar arquivos de documentos no Sitra (Doc. CNH, RG, etc.)
- Placa do veículo, abas Dados para Pagamento, Gerenciadora de Risco, Observações,
  Pendências, CIOT
- Clicar em "Cadastrar" automaticamente
- Uso por mais de um operador / publicação na Chrome Web Store

## 2. Contexto do Sitra (levantado em 2026-09-24)

- URL: `https://2323.aleff.com.br/Motorista/CadastroDeMotorista`
- Página única, **sem iframe**. jQuery 1.11.3. Abas Bootstrap (`#menu1`, `#menu2`):
  campos das abas ocultas já existem no DOM → preencher sem trocar de aba.
- Campos com máscara por classe CSS: `cpf`, `cep`, `date`, `sp_celphones`, `rg`, `placa`.
- Handlers com efeito colateral:
  - `txtMotoristaCpf` onchange `Search()` — busca motorista existente
  - `txtCep` onchange `pesquisaCep()` — preenche endereço/bairro/UF/cidade
  - `txtUf` onchange `CarregaCidadePorUf()` — carrega autocomplete de `txtCidade`
  - `txtNaturalidadeUf` onchange `CarregaCidadePorUfNatu()` — autocomplete de `txtNaturalidade`
- Atenção: nomes de `id` não batem com o rótulo em dois casos da CNH (ver tabela).
  Confirmado no `Motorista.js`: `txtNumeroCnh` é enviado como `Habilitacao` (obrigatório).

**Comportamentos confirmados no `Motorista.js` (página salva em `campos_necessarios/`):**
- `Search()` valida o CPF (inválido → abre `#ModalErro` e **apaga o CPF**); se o CPF
  **não** existe, chama `limparCampos()` — **apaga o formulário inteiro**. Por isso o CPF
  é sempre o primeiro campo e só se segue depois que as 3 requisições dele terminam.
  Motorista existente → preenche os campos e `txtStatusMotorista` = `"Ativo"`.
- `Search()` também chama `SearchVeiculo/`, que pode abrir `#ModalErro` com mensagem
  (ex.: sem veículo) — o preenchedor fecha esse modal e registra a mensagem no relatório.
- `pesquisaCep()` usa ViaCEP (JSONP) e escreve direto em endereço/bairro/cidade/UF;
  CEP não encontrado → `#ModalErro` "CEP não Encontrado!".
- `txtCidade` / `txtNaturalidade` aceitam texto livre em MAIÚSCULAS (o Sitra só grava
  `.val()`); não é preciso escolher item do autocomplete.
- Erros do Sitra usam modal Bootstrap (`#ModalErro`, texto em `#erro`), não `alert()`.

## 3. Arquitetura

Extensão Chrome Manifest V3, sem servidor. Quatro unidades:

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| **Painel lateral** (`sidepanel/`) | Receber o zip, mostrar progresso, tela de conferência editável, botão "Preencher", relatório final | as outras três |
| **Leitor de entrada** (`lib/entrada.js`) | Aceitar, no mesmo arraste/seleção, **arquivos soltos** (`.jpg/.jpeg/.png/.pdf/.txt`) e/ou **`.zip`** (JSZip, empacotado localmente); juntar tudo numa lista única; separar texto de conversa (`.txt`), imagens e PDFs; redimensionar imagens (lado maior ≤ 1568 px, JPEG); mostrar a lista de arquivos recebidos com opção de remover algum antes de extrair | JSZip |
| **Extrator** (`lib/extrator.js`) | Uma chamada ao Gemini com todos os documentos + texto do chat; retorna JSON estruturado; normalização determinística | `fetch` para a API REST do Gemini, chave da API |
| **Preenchedor** (`content/preenchedor.js`) | Content script na página do Sitra; preenche campos na ordem definida, espera efeitos colaterais, verifica e reporta | DOM do Sitra |

- Chave da API guardada em `chrome.storage.local` (tela de opções). Aceitável por ser
  uso de um único operador; se passar a ser multiusuário, mover a chave para um servidor.
- Instalação: "Carregar sem compactação" no modo desenvolvedor.
- Build: bundler simples (esbuild) para empacotar SDK e JSZip — MV3 não permite código remoto.

## 4. Extrator

**Entrada:** texto do `.txt` da conversa, **se houver** (arquivos soltos normalmente não
trazem; nesse caso Celular/E-mail ficam vazios e em amarelo para a conferência) + imagens (base64 JPEG redimensionado) + PDFs (base64,
bloco `document`). Áudio, vídeo, figurinhas (`.opus`, `.mp4`, `.webp`) ignorados.

**Chamada (alterado em 2026-09-24: Gemini no lugar do Claude, a pedido do operador):**
API REST do Gemini `v1beta/models/gemini-3.8-flash:generateContent` via `fetch` (sem SDK),
chave no cabeçalho `x-goog-api-key`, documentos como `inlineData`, saída estruturada com
`generationConfig.responseMimeType = "application/json"` + `responseJsonSchema`
(formato validado com chamada real em 2026-09-24). Cada campo retorna
`{ valor, certeza: "alta" | "conferir", fonte }`; não encontrado → `valor: ""`.
Limite de envio: 18 MB somados. **A chave deve pertencer a um projeto com cobrança
ativada** — no plano gratuito o Google pode usar o conteúdo enviado (documentos pessoais).

**Normalização (código, não IA):** datas `DD/MM/AAAA`; CPF `000.000.000-00`;
CEP `00000-000`; telefones `(00)00000-0000` ou `(00)0000-0000` (**sem espaço** — máscara do Sitra, maxlength 14); RG só letras e números (o Sitra remove pontuação); UF em sigla; texto em MAIÚSCULAS;
corte no `maxlength` do Sitra. Estado Civil limitado a 9 caracteres com abreviações
fixas: `SOLTEIRO`, `CASADO`, `DIVORC.`, `VIUVO`, `SEPARADO`, `UNIAO EST`.

**Padrões configuráveis:** Propriedade = `Terceiro` (valor `3`); Nacionalidade =
`BRASILEIRA`; Fone Residencial 1 = Celular; Estado Civil = vazio (destacado).

## 5. Mapeamento de campos (v1)

| Campo na tela | `id` no Sitra | Obrig. | Fonte típica | maxlen |
|---|---|---|---|---|
| CPF | `txtMotoristaCpf` | ✔ | CNH | 14 |
| Nome | `txtMotoristaNome` | ✔ | CNH | 50 |
| CEP | `txtCep` | ✔ | Comprovante | 9 |
| Endereço | `txtEndereco` | ✔ | Comprovante / Sitra via CEP | 50 |
| Número | `txtNumero` | ✔ | Comprovante | 10 |
| Complemento | `txtComplemento` | | Comprovante | 30 |
| Bairro | `txtBairro` | ✔ | Comprovante / Sitra via CEP | 30 |
| UF | `txtUf` (select) | ✔ | Comprovante / Sitra via CEP | — |
| Cidade | `txtCidade` (autocomplete) | ✔ | Comprovante / Sitra via CEP | — |
| Data de Nascimento | `txtDataNascimento` | ✔ | CNH | 10 |
| Estado Civil | `txtEstadoCivil` | ✔ | Conferência manual | 9 |
| Nome do Pai | `txtNomePai` | ✔ | CNH (filiação) | 40 |
| Nome da Mãe | `txtNomeMae` | ✔ | CNH (filiação) | 40 |
| UF Naturalidade | `txtNaturalidadeUf` (select) | ✔ | CNH / RG | — |
| Naturalidade | `txtNaturalidade` (autocomplete) | ✔ | CNH / RG | 40 |
| Nacionalidade | `txtNacionalidade` | ✔ | Padrão | 20 |
| Propriedade | `txtPropriedade` (select 1/2/3) | ✔ | Padrão | — |
| Fone Residencial 1 | `txtResidencial` | ✔ | Chat / = Celular | 14 |
| Celular | `txtCelular` | ✔ | Chat | 14 |
| R.G. | `txtRg` | ✔ | CNH / RG | 12 |
| UF Exp. | `txtUfExp` (select) | | CNH / RG | — |
| Org. Exp. | `txtOrgExp` | ✔ | CNH / RG | 10 |
| Data Expedição (RG) | `txtDataExpedicao` | ✔ | RG | 10 |
| **Nº Registro CNH** | **`txtNumeroCnh`** | ✔ | CNH (11 dígitos) | 14 |
| **Nº CNH** (espelho) | **`txtRegistroCNH`** | | CNH | 10 |
| Data Primeira CNH | `txtDataPrimeiraCnh` | ✔ | CNH | 10 |
| Data Emissão CNH | `txtDataEmissaoCnh` | | CNH | 10 |
| Data Validade CNH | `txtDataValidadeCnh` | ✔ | CNH | 10 |
| Categoria | `txtCategoriaCnh` | ✔ | CNH | 4 |
| E-mail | `txtEmail` | | Chat | 60 |

## 6. Preenchedor — sequência

1. Validar URL (`/Motorista/CadastroDeMotorista`) e que o formulário está vazio;
   se houver dados, pedir confirmação no painel antes de sobrescrever.
2. CPF → disparar `input`/`change`/`blur` → aguardar fim do `Search()` (rede ociosa
   ou `txtMotoristaId` preenchido). Se motorista existir (`txtMotoristaId` com valor
   ou nome carregado) → **parar e avisar**.
3. Dados pessoais (nome, nascimento, estado civil, filiação, nacionalidade,
   propriedade, telefones, e-mail).
4. UF Naturalidade → aguardar carga → Naturalidade.
5. CEP → aguardar `pesquisaCep()` → preencher número/complemento e apenas os campos
   de endereço que ficaram vazios; UF → aguardar → Cidade se vazia.
6. Documentação (RG, UF/Org. Exp., datas, CNH).
7. Verificação: reler cada campo e reportar ✅/⚠️ no painel.
8. Parar. Operador confere e clica "Cadastrar".

Eventos: definir `.value` e disparar `input`, `change`, `blur` nativos (jQuery e
atributos `onchange` inline recebem eventos nativos). Sem cliques em botões.
Esperas com timeout (padrão 8 s) e mensagem clara se estourar.

## 7. Erros

| Situação | Comportamento |
|---|---|
| Nenhuma imagem/PDF entre os arquivos | Mensagem "Nenhuma foto/PDF encontrada" |
| Arquivo `.rar` ou tipo não suportado | Mensagem "Formato não suportado — solte os arquivos direto ou use .zip" |
| PDF protegido por senha | Aviso com o nome do arquivo; segue com os demais |
| Documento ausente/ilegível | Campos vazios em amarelo + aviso ("não achei o comprovante de endereço") |
| Falha de API (rede, chave, limite, recusa) | Mensagem + botão "Tentar de novo" |
| Aba ativa não é o cadastro | Ao clicar "Preencher": aviso "Abra a tela Cadastro de Motoristas do Sitra nesta aba" |
| Motorista já cadastrado | Para e avisa |
| Campo não gravou | ⚠️ no relatório final |

## 8. Testes

- **Unitários** (Vitest, dados falsos): leitor de entrada (arquivos soltos, zip sintético estilo WhatsApp, mistura dos dois),
  normalização, mapeamento campo→id, parse do chat.
- **Preenchedor** contra cópia local da página do Sitra (HTML salvo, com stubs dos
  handlers `Search`/`pesquisaCep`) — nunca contra o sistema real no desenvolvimento.
- **Extrator**: teste com resposta da API mockada; um teste manual real com documentos
  de exemplo.
- **Aceite**: um zip real; extensão preenche; operador confere e decide cadastrar.

## 9. Pendências conhecidas

- Exemplo real recebido (`pasta.rar`): CNH-e em PDF, CRLV em PDF e uma foto — sem texto
  da conversa. Confirma que o caso principal é **arquivos soltos**. O CRLV traz a placa,
  útil quando o campo Placa entrar no escopo.
- Formato exato do telefone de quem enviou no `_chat.txt` (depende de o número estar
  salvo nos contatos) — validar com um zip real.
- ~~Autocomplete de cidade~~ — resolvido: texto livre (ver seção 2).
- ~~Cópia local do Sitra~~ — salva em `campos_necessarios/Cadastro De Motoristas.html`.
