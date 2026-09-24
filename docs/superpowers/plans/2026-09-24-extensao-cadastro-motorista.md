# Extensão Cadastro de Motorista (Sitra) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extensão Chrome (MV3) que lê documentos do motorista (arquivos soltos ou `.zip`) com Claude, mostra uma tela de conferência e preenche o formulário "Cadastro de Motoristas" do Sitra Web Revolution — sem clicar em "Cadastrar".

**Architecture:** Painel lateral (side panel) recebe arquivos → `entrada.js` separa/redimensiona → `extrator.js` faz UMA chamada ao Claude com saída JSON estruturada → `normalizar.js` padroniza → operador confere/edita → `preenchedor.js` é injetado no MUNDO PRINCIPAL (`world: "MAIN"`) da aba do Sitra via `chrome.scripting.executeScript`, preenche na ordem certa esperando o `jQuery.active` do Sitra zerar, e devolve um relatório por campo.

**Tech Stack:** JavaScript (ES modules), Chrome Extension Manifest V3, `@anthropic-ai/sdk` (TypeScript/JS SDK), `jszip`, `esbuild` (bundle), `vitest` + `jsdom` (testes), Node 24.

**Spec:** `docs/superpowers/specs/2026-09-24-extensao-cadastro-motorista-design.md`

> **ALTERAÇÃO (2026-09-24, pedido do operador): o provedor de IA passou a ser o Gemini.**
> Onde este plano diz Claude/`@anthropic-ai/sdk`, vale: sem SDK; `extrator.js` exporta
> `MODELO = 'gemini-3.8-flash'`, `montarPartes(docs)` (partes `{text}` / `{inlineData: {mimeType, data}}`)
> e `chamarGemini(apiKey, docs, fetchFn = fetch)`, que faz POST em
> `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent` com
> cabeçalho `x-goog-api-key`, `systemInstruction`, `contents` e
> `generationConfig: { responseMimeType: 'application/json', responseJsonSchema }`; lê
> `candidates[0].content.parts[].text` (ignorando partes `thought`), trata `promptFeedback.blockReason`,
> `finishReason` ≠ `STOP` e erros HTTP (400 chave inválida, 403, 429, 5xx) como `ErroExtracao`.
> `manifest.json` usa `https://generativelanguage.googleapis.com/*` em vez de `api.anthropic.com`;
> limite de envio 18 MB; textos da interface dizem "Gemini". Os testes da Task 4 usam um `fetch` falso.
> O código commitado é a referência para Tasks 4 e 6.

## Global Constraints

- Nunca clicar em "Cadastrar", "Limpar", lupas ou qualquer botão do Sitra; só definir valores e disparar eventos `input`/`change`.
- O campo CPF é SEMPRE o primeiro preenchido, e nada mais é preenchido antes de o `Search()` do Sitra terminar (`jQuery.active === 0`), porque `Search()` chama `limparCampos()` quando o CPF é novo.
- Motorista já cadastrado (`txtStatusMotorista` com valor após a busca) → parar sem preencher mais nada.
- Modelo: `claude-opus-5`; `max_tokens: 16000`; saída estruturada via `output_config: { format: { type: "json_schema", schema } }`; `betas: ["server-side-fallback-2026-07-01"]` + `fallbacks: "default"`; checar `stop_reason === "refusal"` antes de ler `content`.
- Chave da API somente em `chrome.storage.local`; nunca em código, log ou arquivo versionado.
- Formatos gravados no Sitra: datas `DD/MM/AAAA`; CPF `000.000.000-00`; CEP `00000-000`; telefone `(00)00000-0000` ou `(00)0000-0000` (sem espaço); RG só `[0-9A-Z]`; texto em MAIÚSCULAS; cortar no `maxlength` do Sitra.
- Estado Civil (máx. 9): `SOLTEIRO`, `CASADO`, `DIVORC.`, `VIUVO`, `SEPARADO`, `UNIAO EST`.
- Padrões: Propriedade = `3` (Terceiro); Nacionalidade = `BRASILEIRA`; Fone Residencial 1 = Celular quando vazio; Estado Civil sem padrão.
- Mapeamento CNH (ids trocados no Sitra): **Nº Registro CNH → `txtNumeroCnh`**; **Nº CNH (espelho) → `txtRegistroCNH`**.
- Entrada aceita `.jpg .jpeg .png .pdf .txt .zip` (soltos e/ou dentro de zip). `.rar`/`.7z` → aviso "formato não suportado — solte os arquivos direto ou use .zip".
- Documentos pessoais de teste (`pasta.rar`) e a página salva do Sitra nunca entram no git.
- Textos da interface em português do Brasil.

## Review Focus

1. **CPF novo apaga o formulário** — se qualquer campo for preenchido antes do `Search()` terminar, o Sitra limpa tudo. Esperado: todos os campos preenchidos no final. (Teste na Task 5: `Search` simulado limpa o formulário.)
2. **Telefone com espaço estoura o `maxlength` 14** — `(11) 98765-4321` tem 15 caracteres e o Sitra corta. Esperado: `(11)98765-4321`. (Teste na Task 2.)
3. **Operador digita valor em formato livre na conferência** (`1/2/90`, `11 98765 4321`, `sp`) — esperado: normalizado antes de preencher; o que não dá para normalizar vira erro visível, não campo vazio silencioso. (Teste na Task 6.)
4. **Fotos grandes / muitos arquivos** — 10 fotos de 6 MB estouram o limite de 32 MB da API. Esperado: fotos redimensionadas; acima de 30 MB, mensagem clara. (Teste do limite na Task 3.)
5. **Sitra muda a tela e um `id` some** — esperado: o preenchimento continua nos outros campos e o relatório marca o campo ausente como ⚠️. (Teste na Task 5.)

---

## Estrutura de arquivos

```
cadastro_motorista/
  package.json              scripts build/test, deps
  build.mjs                 esbuild: 3 bundles → extensao/
  .gitignore
  extensao/                 ← pasta carregada no Chrome ("Carregar sem compactação")
    manifest.json
    background.js           abre o side panel ao clicar no ícone
    sidepanel/index.html, sidepanel/style.css   (+ main.bundle.js gerado)
    options/options.html                        (+ main.bundle.js gerado)
    content/                                    (injetado.bundle.js gerado)
  src/
    lib/campos.js           definição única dos campos (chave, id Sitra, rótulo, tipo, max, obrigatório, grupo, dica, padrão)
    lib/normalizar.js       funções puras de formatação/validação
    lib/entrada.js          arquivos soltos + zip → itens → documentos (base64)
    lib/imagem.js           redimensionamento no navegador (OffscreenCanvas) — sem teste unitário
    lib/extrator.js         schema, prompt, chamada ao Claude, pós-processamento
    lib/config.js           chave da API + padrões em chrome.storage.local
    content/preenchedor.js  criarPreenchedor(win) → { estado, preencher }
    content/injetado.js     window.__cadastroMotorista = criarPreenchedor(window)
    sidepanel/formulario.js montar/ler formulário de conferência
    sidepanel/main.js       ligação da interface
    options/main.js         tela de configurações
  tests/
    campos.test.js, normalizar.test.js, entrada.test.js, extrator.test.js,
    preenchedor.test.js, formulario.test.js
    fixtures/sitra.html     cópia mínima dos campos do Sitra
```

---

### Task 1: Projeto, build e definição dos campos

**Files:**
- Create: `package.json`, `build.mjs`, `.gitignore`, `extensao/manifest.json`, `extensao/background.js`, `src/lib/campos.js`, `src/content/injetado.js` (stub), `src/sidepanel/main.js` (stub), `src/options/main.js` (stub)
- Test: `tests/campos.test.js`

**Interfaces:**
- Produces: `CAMPOS: Array<{ chave: string, id: string, rotulo: string, tipo: 'texto'|'cpf'|'cep'|'telefone'|'data'|'uf'|'estado_civil'|'rg'|'categoria'|'email'|'digitos'|'propriedade', max?: number, obrigatorio: boolean, grupo: string, dica: string, padrao?: 'propriedade'|'nacionalidade', soPadrao?: boolean }>`; `CAMPO_POR_CHAVE: Record<string, Campo>`; `UFS: string[]`.

- [ ] **Step 1: Iniciar git e instalar dependências**

```bash
cd C:/Users/Breviis/desktop/cadastro_motorista
git init
npm init -y
npm install @anthropic-ai/sdk jszip
npm install -D vitest jsdom esbuild
```

- [ ] **Step 2: Ajustar `package.json`**

```bash
npm pkg set private=true --json
npm pkg set name=cadastro-motorista type=module scripts.build="node build.mjs" scripts.test="vitest run"
npm pkg delete main
```
Esperado: `package.json` com `"type": "module"`, scripts `build`/`test` e as dependências instaladas no Step 1.

- [ ] **Step 3: `.gitignore`**

```gitignore
node_modules/
extensao/**/*.bundle.js
*.rar
*.zip
campos_necessarios/Cadastro De Motoristas*
```

- [ ] **Step 4: `build.mjs`**

```js
import { build } from 'esbuild';

const comum = { bundle: true, target: 'chrome120', logLevel: 'info' };

await build({ ...comum, entryPoints: ['src/sidepanel/main.js'], outfile: 'extensao/sidepanel/main.bundle.js', format: 'esm' });
await build({ ...comum, entryPoints: ['src/options/main.js'], outfile: 'extensao/options/main.bundle.js', format: 'esm' });
await build({ ...comum, entryPoints: ['src/content/injetado.js'], outfile: 'extensao/content/injetado.bundle.js', format: 'iife' });
```

- [ ] **Step 5: `extensao/manifest.json` e `extensao/background.js`**

```json
{
  "manifest_version": 3,
  "name": "Cadastro de Motorista – Sitra",
  "version": "0.1.0",
  "description": "Lê os documentos do motorista com IA e preenche o cadastro no Sitra Web Revolution.",
  "permissions": ["sidePanel", "storage", "scripting"],
  "host_permissions": ["https://*.aleff.com.br/*", "https://api.anthropic.com/*"],
  "background": { "service_worker": "background.js" },
  "side_panel": { "default_path": "sidepanel/index.html" },
  "options_page": "options/options.html",
  "action": { "default_title": "Cadastro de Motorista" }
}
```

```js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

- [ ] **Step 6: Stubs para o build rodar**

`src/content/injetado.js`, `src/sidepanel/main.js`, `src/options/main.js` — cada um com uma linha:

```js
// implementado em tarefa posterior
```

- [ ] **Step 7: Escrever o teste que falha — `tests/campos.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { CAMPOS, CAMPO_POR_CHAVE, UFS } from '../src/lib/campos.js';

describe('CAMPOS', () => {
  it('tem chaves e ids únicos', () => {
    expect(new Set(CAMPOS.map(c => c.chave)).size).toBe(CAMPOS.length);
    expect(new Set(CAMPOS.map(c => c.id)).size).toBe(CAMPOS.length);
  });

  it('cobre todos os ids da tabela da spec', () => {
    const ids = [
      'txtMotoristaCpf', 'txtMotoristaNome', 'txtCep', 'txtEndereco', 'txtNumero', 'txtComplemento',
      'txtBairro', 'txtUf', 'txtCidade', 'txtDataNascimento', 'txtEstadoCivil', 'txtNomePai', 'txtNomeMae',
      'txtNaturalidadeUf', 'txtNaturalidade', 'txtNacionalidade', 'txtPropriedade', 'txtResidencial',
      'txtCelular', 'txtRg', 'txtUfExp', 'txtOrgExp', 'txtDataExpedicao', 'txtNumeroCnh', 'txtRegistroCNH',
      'txtDataPrimeiraCnh', 'txtDataEmissaoCnh', 'txtDataValidadeCnh', 'txtCategoriaCnh', 'txtEmail',
    ];
    expect(CAMPOS.map(c => c.id).sort()).toEqual([...ids].sort());
  });

  it('mapeia o registro da CNH para txtNumeroCnh (ids trocados no Sitra)', () => {
    expect(CAMPO_POR_CHAVE.registro_cnh.id).toBe('txtNumeroCnh');
    expect(CAMPO_POR_CHAVE.numero_espelho_cnh.id).toBe('txtRegistroCNH');
  });

  it('todo campo tem rótulo, grupo e dica', () => {
    for (const c of CAMPOS) {
      expect(c.rotulo, c.chave).toBeTruthy();
      expect(c.grupo, c.chave).toBeTruthy();
      expect(c.dica, c.chave).toBeTruthy();
    }
  });

  it('UFS tem 27 estados + EX', () => {
    expect(UFS).toHaveLength(28);
    expect(UFS).toContain('SP');
    expect(UFS).toContain('EX');
  });
});
```

- [ ] **Step 8: Rodar e ver falhar**

Run: `npx vitest run tests/campos.test.js`
Expected: FAIL — `Failed to load url ../src/lib/campos.js`

- [ ] **Step 9: Implementar `src/lib/campos.js`**

```js
export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'EX', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

// Ordem = ordem de exibição na tela de conferência.
// ATENÇÃO: no Sitra, "Nº Registro CNH" é txtNumeroCnh e "Nº CNH" (espelho) é txtRegistroCNH.
export const CAMPOS = [
  { chave: 'cpf', id: 'txtMotoristaCpf', rotulo: 'CPF', tipo: 'cpf', max: 14, obrigatorio: true, grupo: 'Identificação', dica: 'CPF do motorista (na CNH ou em outro documento)' },
  { chave: 'nome', id: 'txtMotoristaNome', rotulo: 'Nome', tipo: 'texto', max: 50, obrigatorio: true, grupo: 'Identificação', dica: 'Nome completo como está na CNH' },

  { chave: 'cep', id: 'txtCep', rotulo: 'CEP', tipo: 'cep', max: 9, obrigatorio: true, grupo: 'Endereço', dica: 'CEP do comprovante de endereço' },
  { chave: 'endereco', id: 'txtEndereco', rotulo: 'Endereço', tipo: 'texto', max: 50, obrigatorio: true, grupo: 'Endereço', dica: 'Logradouro (rua, avenida...) sem o número' },
  { chave: 'numero', id: 'txtNumero', rotulo: 'Número', tipo: 'texto', max: 10, obrigatorio: true, grupo: 'Endereço', dica: 'Número do imóvel' },
  { chave: 'complemento', id: 'txtComplemento', rotulo: 'Complemento', tipo: 'texto', max: 30, obrigatorio: false, grupo: 'Endereço', dica: 'Complemento (apto, bloco, casa...)' },
  { chave: 'bairro', id: 'txtBairro', rotulo: 'Bairro', tipo: 'texto', max: 30, obrigatorio: true, grupo: 'Endereço', dica: 'Bairro' },
  { chave: 'uf', id: 'txtUf', rotulo: 'UF', tipo: 'uf', obrigatorio: true, grupo: 'Endereço', dica: 'Sigla do estado do endereço' },
  { chave: 'cidade', id: 'txtCidade', rotulo: 'Cidade', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Endereço', dica: 'Cidade do endereço' },

  { chave: 'data_nascimento', id: 'txtDataNascimento', rotulo: 'Data de Nascimento', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Data de nascimento' },
  { chave: 'estado_civil', id: 'txtEstadoCivil', rotulo: 'Estado Civil', tipo: 'estado_civil', max: 9, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Estado civil, somente se estiver escrito em algum documento ou na conversa' },
  { chave: 'nome_pai', id: 'txtNomePai', rotulo: 'Nome do Pai', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Nome do pai (filiação)' },
  { chave: 'nome_mae', id: 'txtNomeMae', rotulo: 'Nome da Mãe', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Nome da mãe (filiação)' },
  { chave: 'uf_naturalidade', id: 'txtNaturalidadeUf', rotulo: 'UF Naturalidade', tipo: 'uf', obrigatorio: true, grupo: 'Dados pessoais', dica: 'Sigla do estado onde nasceu' },
  { chave: 'naturalidade', id: 'txtNaturalidade', rotulo: 'Naturalidade', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Cidade onde nasceu' },
  { chave: 'nacionalidade', id: 'txtNacionalidade', rotulo: 'Nacionalidade', tipo: 'texto', max: 20, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Nacionalidade, somente se estiver escrita', padrao: 'nacionalidade' },
  { chave: 'propriedade', id: 'txtPropriedade', rotulo: 'Propriedade', tipo: 'propriedade', obrigatorio: true, grupo: 'Dados pessoais', dica: 'Tipo de vínculo (valor padrão da configuração)', padrao: 'propriedade', soPadrao: true },

  { chave: 'celular', id: 'txtCelular', rotulo: 'Celular', tipo: 'telefone', max: 14, obrigatorio: true, grupo: 'Contato', dica: 'Celular com DDD (da conversa ou de documentos)' },
  { chave: 'fone_residencial', id: 'txtResidencial', rotulo: 'Fone Residencial 1', tipo: 'telefone', max: 14, obrigatorio: true, grupo: 'Contato', dica: 'Outro telefone com DDD, se houver' },
  { chave: 'email', id: 'txtEmail', rotulo: 'E-mail', tipo: 'email', max: 60, obrigatorio: false, grupo: 'Contato', dica: 'E-mail, se aparecer' },

  { chave: 'rg', id: 'txtRg', rotulo: 'R.G.', tipo: 'rg', max: 12, obrigatorio: true, grupo: 'Documentação', dica: 'Número do RG (na CNH: DOC. IDENTIDADE)' },
  { chave: 'uf_exp', id: 'txtUfExp', rotulo: 'UF Exp.', tipo: 'uf', obrigatorio: false, grupo: 'Documentação', dica: 'UF do órgão emissor do RG' },
  { chave: 'org_exp', id: 'txtOrgExp', rotulo: 'Org. Exp.', tipo: 'texto', max: 10, obrigatorio: true, grupo: 'Documentação', dica: 'Órgão emissor do RG (ex.: SSP)' },
  { chave: 'data_expedicao_rg', id: 'txtDataExpedicao', rotulo: 'Data Expedição (RG)', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Documentação', dica: 'Data de expedição do RG — só existe no próprio RG' },
  { chave: 'registro_cnh', id: 'txtNumeroCnh', rotulo: 'Nº Registro CNH', tipo: 'digitos', max: 14, obrigatorio: true, grupo: 'Documentação', dica: 'Nº REGISTRO da CNH (11 dígitos)' },
  { chave: 'numero_espelho_cnh', id: 'txtRegistroCNH', rotulo: 'Nº CNH (espelho)', tipo: 'digitos', max: 10, obrigatorio: false, grupo: 'Documentação', dica: 'Número do espelho da CNH (diferente do registro), se visível' },
  { chave: 'data_primeira_cnh', id: 'txtDataPrimeiraCnh', rotulo: 'Data Primeira CNH', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Documentação', dica: '1ª HABILITAÇÃO' },
  { chave: 'data_emissao_cnh', id: 'txtDataEmissaoCnh', rotulo: 'Data Emissão CNH', tipo: 'data', max: 10, obrigatorio: false, grupo: 'Documentação', dica: 'DATA EMISSÃO da CNH' },
  { chave: 'data_validade_cnh', id: 'txtDataValidadeCnh', rotulo: 'Data Validade CNH', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Documentação', dica: 'VALIDADE da CNH' },
  { chave: 'categoria_cnh', id: 'txtCategoriaCnh', rotulo: 'Categoria', tipo: 'categoria', max: 4, obrigatorio: true, grupo: 'Documentação', dica: 'CAT. HAB. (ex.: AE, D)' },
];

export const CAMPO_POR_CHAVE = Object.fromEntries(CAMPOS.map(c => [c.chave, c]));
```

- [ ] **Step 10: Rodar testes e build**

Run: `npx vitest run tests/campos.test.js`
Expected: PASS (5 testes)

Run: `npm run build`
Expected: três arquivos `*.bundle.js` gerados em `extensao/`, sem erro.

- [ ] **Step 11: Commit**

```bash
git add .gitignore package.json package-lock.json build.mjs extensao/manifest.json extensao/background.js src tests docs
git commit -m "feat: estrutura da extensão e definição dos campos do Sitra"
```

---

### Task 2: Normalização

**Files:**
- Create: `src/lib/normalizar.js`
- Test: `tests/normalizar.test.js`

**Interfaces:**
- Consumes: `UFS` de `campos.js`.
- Produces: `somenteDigitos(v)`, `maiusculas(v)`, `formatarCpf(v)`, `cpfValido(v): boolean`, `formatarCep(v)`, `formatarTelefone(v)`, `formatarData(v)`, `formatarUf(v)`, `formatarEstadoCivil(v)`, `formatarRg(v)`, `formatarCategoria(v)`, `formatarEmail(v)`, `normalizarCampo(campo, valor): string` — todas retornam `''` quando não conseguem normalizar.

- [ ] **Step 1: Teste que falha — `tests/normalizar.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  formatarCpf, cpfValido, formatarCep, formatarTelefone, formatarData, formatarUf,
  formatarEstadoCivil, formatarRg, formatarCategoria, formatarEmail, normalizarCampo,
} from '../src/lib/normalizar.js';
import { CAMPO_POR_CHAVE } from '../src/lib/campos.js';

describe('normalizar', () => {
  it('CPF', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(formatarCpf('529.982.247-25')).toBe('529.982.247-25');
    expect(formatarCpf('123')).toBe('');
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('529.982.247-24')).toBe(false);
  });

  it('CEP', () => {
    expect(formatarCep('01310100')).toBe('01310-100');
    expect(formatarCep('01310-100')).toBe('01310-100');
    expect(formatarCep('0131')).toBe('');
  });

  it('telefone sem espaço (máscara do Sitra, maxlength 14)', () => {
    expect(formatarTelefone('11987654321')).toBe('(11)98765-4321');
    expect(formatarTelefone('(11) 98765-4321')).toBe('(11)98765-4321');
    expect(formatarTelefone('+55 11 98765-4321')).toBe('(11)98765-4321');
    expect(formatarTelefone('1133334444')).toBe('(11)3333-4444');
    expect(formatarTelefone('98765-4321')).toBe('');
    expect(formatarTelefone('(11) 98765-4321').length).toBeLessThanOrEqual(14);
  });

  it('data', () => {
    expect(formatarData('15/03/1985')).toBe('15/03/1985');
    expect(formatarData('1/2/1990')).toBe('01/02/1990');
    expect(formatarData('15-03-1985')).toBe('15/03/1985');
    expect(formatarData('1985-03-15')).toBe('15/03/1985');
    expect(formatarData('31/02/2020')).toBe('');
    expect(formatarData('ontem')).toBe('');
  });

  it('UF', () => {
    expect(formatarUf('sp')).toBe('SP');
    expect(formatarUf(' mg ')).toBe('MG');
    expect(formatarUf('São Paulo')).toBe('');
  });

  it('estado civil cabe em 9 caracteres', () => {
    expect(formatarEstadoCivil('solteiro')).toBe('SOLTEIRO');
    expect(formatarEstadoCivil('Casada')).toBe('CASADO');
    expect(formatarEstadoCivil('DIVORCIADO')).toBe('DIVORC.');
    expect(formatarEstadoCivil('viúva')).toBe('VIUVO');
    expect(formatarEstadoCivil('separado judicialmente')).toBe('SEPARADO');
    expect(formatarEstadoCivil('união estável')).toBe('UNIAO EST');
    expect(formatarEstadoCivil('')).toBe('');
  });

  it('RG, categoria, e-mail', () => {
    expect(formatarRg('12.345.678-x')).toBe('12345678X');
    expect(formatarCategoria('a e')).toBe('AE');
    expect(formatarCategoria('D')).toBe('D');
    expect(formatarEmail(' Jose@Exemplo.com ')).toBe('jose@exemplo.com');
    expect(formatarEmail('jose@')).toBe('');
  });

  it('normalizarCampo usa o tipo e corta no max', () => {
    expect(normalizarCampo(CAMPO_POR_CHAVE.nome, '  josé   da silva ')).toBe('JOSÉ DA SILVA');
    expect(normalizarCampo(CAMPO_POR_CHAVE.nome_pai, 'A'.repeat(60))).toHaveLength(40);
    expect(normalizarCampo(CAMPO_POR_CHAVE.registro_cnh, '012.345.678-90')).toBe('01234567890');
    expect(normalizarCampo(CAMPO_POR_CHAVE.propriedade, '3')).toBe('3');
    expect(normalizarCampo(CAMPO_POR_CHAVE.propriedade, 'Terceiro')).toBe('');
    expect(normalizarCampo(CAMPO_POR_CHAVE.celular, undefined)).toBe('');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/normalizar.test.js`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `src/lib/normalizar.js`**

```js
import { UFS } from './campos.js';

export function somenteDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

export function maiusculas(v) {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function semAcento(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function formatarCpf(v) {
  const d = somenteDigitos(v);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : '';
}

export function cpfValido(v) {
  const d = somenteDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function formatarCep(v) {
  const d = somenteDigitos(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : '';
}

// Máscara do Sitra: "(00)00000-0000" / "(00)0000-0000" — sem espaço (maxlength 14).
export function formatarTelefone(v) {
  let d = somenteDigitos(v);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)})${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)})${d.slice(2, 6)}-${d.slice(6)}`;
  return '';
}

export function formatarData(v) {
  const s = String(v ?? '').trim();
  let dia, mes, ano, m;
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, dia, mes, ano] = m;
  else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) [, ano, mes, dia] = m;
  else return '';
  const dt = new Date(Number(ano), Number(mes) - 1, Number(dia));
  if (dt.getFullYear() !== Number(ano) || dt.getMonth() !== Number(mes) - 1 || dt.getDate() !== Number(dia)) return '';
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
}

export function formatarUf(v) {
  const u = maiusculas(v);
  return UFS.includes(u) ? u : '';
}

export function formatarEstadoCivil(v) {
  const s = semAcento(maiusculas(v));
  if (!s) return '';
  if (s.startsWith('SOLT')) return 'SOLTEIRO';
  if (s.startsWith('CAS')) return 'CASADO';
  if (s.startsWith('DIVOR')) return 'DIVORC.';
  if (s.startsWith('VIUV')) return 'VIUVO';
  if (s.startsWith('SEPAR')) return 'SEPARADO';
  if (s.includes('UNIAO') || s.includes('ESTAVEL')) return 'UNIAO EST';
  return s.slice(0, 9);
}

// O Sitra remove pontuação do RG no blur/keyup.
export function formatarRg(v) {
  return maiusculas(v).replace(/[^0-9A-Z]/g, '');
}

export function formatarCategoria(v) {
  return maiusculas(v).replace(/[^A-E]/g, '').slice(0, 4);
}

export function formatarEmail(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
}

export function normalizarCampo(campo, valor) {
  const cortar = (s) => (campo.max ? s.slice(0, campo.max) : s);
  switch (campo.tipo) {
    case 'cpf': return formatarCpf(valor);
    case 'cep': return formatarCep(valor);
    case 'telefone': return formatarTelefone(valor);
    case 'data': return formatarData(valor);
    case 'uf': return formatarUf(valor);
    case 'estado_civil': return formatarEstadoCivil(valor);
    case 'rg': return cortar(formatarRg(valor));
    case 'categoria': return formatarCategoria(valor);
    case 'email': return cortar(formatarEmail(valor));
    case 'digitos': return cortar(somenteDigitos(valor));
    case 'propriedade': return ['1', '2', '3'].includes(String(valor ?? '').trim()) ? String(valor).trim() : '';
    default: return cortar(maiusculas(valor));
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/normalizar.test.js`
Expected: PASS (8 testes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/normalizar.js tests/normalizar.test.js
git commit -m "feat: normalização dos campos no formato do Sitra"
```

---

### Task 3: Leitura da entrada (arquivos soltos + zip)

**Files:**
- Create: `src/lib/entrada.js`, `src/lib/imagem.js`
- Test: `tests/entrada.test.js`

**Interfaces:**
- Produces:
  - `classificar(nome): 'imagem'|'pdf'|'texto'|'zip'|'naoSuportado'|'ignorado'`
  - `lerEntrada(arquivos: Array<{name: string, arrayBuffer(): Promise<ArrayBuffer>}>): Promise<{ itens: Array<{nome, tipo: 'imagem'|'pdf'|'texto', bytes: Uint8Array}>, ignorados: string[], naoSuportados: string[] }>`
  - `prepararDocumentos(itens, { redimensionar?, limiteBytes? }): Promise<{ textos: Array<{nome, conteudo}>, imagens: Array<{nome, mediaType, base64}>, pdfs: Array<{nome, base64}>, avisos: string[] }>` — lança `Error` se passar do limite.
  - `paraBase64(bytes: Uint8Array): string`, `pdfProtegido(bytes): boolean`
  - `redimensionarImagem(bytes, nome, ladoMax = 1568): Promise<{ bytes: Uint8Array, mediaType: 'image/jpeg' }>` (somente navegador)

- [ ] **Step 1: Teste que falha — `tests/entrada.test.js`**

```js
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { classificar, lerEntrada, prepararDocumentos, paraBase64, pdfProtegido } from '../src/lib/entrada.js';

const arq = (name, conteudo) => ({
  name,
  arrayBuffer: async () => (typeof conteudo === 'string' ? new TextEncoder().encode(conteudo) : conteudo.slice()).buffer,
});

describe('classificar', () => {
  it('por extensão', () => {
    expect(classificar('WhatsApp Image 2026-09-24 at 09.30.03.jpeg')).toBe('imagem');
    expect(classificar('CNH-e.pdf.pdf')).toBe('pdf');
    expect(classificar('_chat.txt')).toBe('texto');
    expect(classificar('conversa.ZIP')).toBe('zip');
    expect(classificar('pasta.rar')).toBe('naoSuportado');
    expect(classificar('PTT-2026.opus')).toBe('ignorado');
    expect(classificar('STK-1.webp')).toBe('ignorado');
    expect(classificar('semextensao')).toBe('ignorado');
  });
});

describe('lerEntrada', () => {
  it('aceita arquivos soltos', async () => {
    const r = await lerEntrada([arq('cnh.pdf', '%PDF-1.4 x'), arq('foto.jpg', 'jpg'), arq('audio.opus', 'x')]);
    expect(r.itens.map(i => [i.nome, i.tipo])).toEqual([['cnh.pdf', 'pdf'], ['foto.jpg', 'imagem']]);
    expect(r.ignorados).toEqual(['audio.opus']);
  });

  it('abre zip do WhatsApp, pula __MACOSX e figurinhas', async () => {
    const zip = new JSZip();
    zip.file('_chat.txt', '24/09/2026 09:30 - +55 11 98765-4321: segue a cnh');
    zip.file('IMG-20260924-WA0001.jpg', 'jpg');
    zip.file('STK-20260924-WA0002.webp', 'x');
    zip.file('__MACOSX/._IMG.jpg', 'x');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const r = await lerEntrada([arq('conversa.zip', bytes)]);
    expect(r.itens.map(i => i.nome).sort()).toEqual(['IMG-20260924-WA0001.jpg', '_chat.txt']);
    expect(r.ignorados).toEqual(['STK-20260924-WA0002.webp']);
  });

  it('mistura zip e soltos; rar vira não suportado', async () => {
    const zip = new JSZip();
    zip.file('pasta/doc.pdf', '%PDF-1.4');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const r = await lerEntrada([arq('a.zip', bytes), arq('b.png', 'png'), arq('pasta.rar', 'Rar!')]);
    expect(r.itens.map(i => i.nome)).toEqual(['doc.pdf', 'b.png']);
    expect(r.naoSuportados).toEqual(['pasta.rar']);
  });

  it('zip corrompido vira não suportado em vez de quebrar', async () => {
    const r = await lerEntrada([arq('ruim.zip', 'não é zip')]);
    expect(r.naoSuportados).toEqual(['ruim.zip (zip corrompido)']);
  });
});

describe('prepararDocumentos', () => {
  const enc = (s) => new TextEncoder().encode(s);

  it('separa textos, imagens e PDFs em base64', async () => {
    const r = await prepararDocumentos([
      { nome: '_chat.txt', tipo: 'texto', bytes: enc('olá') },
      { nome: 'a.jpg', tipo: 'imagem', bytes: enc('img') },
      { nome: 'b.png', tipo: 'imagem', bytes: enc('png') },
      { nome: 'c.pdf', tipo: 'pdf', bytes: enc('%PDF-1.4') },
    ]);
    expect(r.textos).toEqual([{ nome: '_chat.txt', conteudo: 'olá' }]);
    expect(r.imagens).toEqual([
      { nome: 'a.jpg', mediaType: 'image/jpeg', base64: paraBase64(enc('img')) },
      { nome: 'b.png', mediaType: 'image/png', base64: paraBase64(enc('png')) },
    ]);
    expect(r.pdfs).toEqual([{ nome: 'c.pdf', base64: paraBase64(enc('%PDF-1.4')) }]);
    expect(r.avisos).toEqual([]);
  });

  it('usa o redimensionador injetado', async () => {
    const r = await prepararDocumentos([{ nome: 'a.jpg', tipo: 'imagem', bytes: enc('grande') }], {
      redimensionar: async () => ({ bytes: enc('pequena'), mediaType: 'image/jpeg' }),
    });
    expect(r.imagens[0].base64).toBe(paraBase64(enc('pequena')));
  });

  it('pula PDF protegido e imagem que não abre, com aviso', async () => {
    const r = await prepararDocumentos([
      { nome: 'senha.pdf', tipo: 'pdf', bytes: enc('%PDF-1.4 trailer << /Encrypt 5 0 R >>') },
      { nome: 'ruim.jpg', tipo: 'imagem', bytes: enc('x') },
    ], { redimensionar: async () => { throw new Error('decode'); } });
    expect(r.pdfs).toEqual([]);
    expect(r.imagens).toEqual([]);
    expect(r.avisos).toEqual([
      'senha.pdf: PDF protegido por senha — não foi lido',
      'ruim.jpg: imagem não pôde ser aberta',
    ]);
  });

  it('recusa quando o total passa do limite', async () => {
    await expect(prepararDocumentos([{ nome: 'a.pdf', tipo: 'pdf', bytes: enc('%PDF' + 'x'.repeat(100)) }], { limiteBytes: 50 }))
      .rejects.toThrow('mais de 30 MB');
  });

  it('pdfProtegido e paraBase64 com arquivo grande', () => {
    expect(pdfProtegido(enc('%PDF /Encrypt'))).toBe(true);
    expect(pdfProtegido(enc('%PDF normal'))).toBe(false);
    const grande = new Uint8Array(200_000).fill(65);
    expect(paraBase64(grande)).toBe(Buffer.from(grande).toString('base64'));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/entrada.test.js`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `src/lib/entrada.js`**

```js
import JSZip from 'jszip';

const TIPOS = { jpg: 'imagem', jpeg: 'imagem', png: 'imagem', pdf: 'pdf', txt: 'texto', zip: 'zip', rar: 'naoSuportado', '7z': 'naoSuportado' };
const UTEIS = ['imagem', 'pdf', 'texto'];

export function classificar(nome) {
  if (!nome.includes('.')) return 'ignorado';
  return TIPOS[nome.split('.').pop().toLowerCase()] ?? 'ignorado';
}

export async function lerEntrada(arquivos) {
  const itens = [], ignorados = [], naoSuportados = [];
  const separar = (nome, tipo, bytes) => {
    if (UTEIS.includes(tipo)) itens.push({ nome, tipo, bytes });
    else if (tipo === 'naoSuportado') naoSuportados.push(nome);
    else ignorados.push(nome);
  };

  for (const a of arquivos) {
    const tipo = classificar(a.name);
    if (tipo !== 'zip') {
      separar(a.name, tipo, UTEIS.includes(tipo) ? new Uint8Array(await a.arrayBuffer()) : null);
      continue;
    }
    let zip;
    try {
      zip = await JSZip.loadAsync(await a.arrayBuffer());
    } catch {
      naoSuportados.push(`${a.name} (zip corrompido)`);
      continue;
    }
    for (const e of Object.values(zip.files)) {
      if (e.dir || e.name.startsWith('__MACOSX/')) continue;
      const nome = e.name.split('/').pop();
      const t = classificar(nome);
      separar(nome, t, UTEIS.includes(t) ? await e.async('uint8array') : null);
    }
  }
  return { itens, ignorados, naoSuportados };
}

export function paraBase64(bytes) {
  let s = '';
  const PEDACO = 0x8000;
  for (let i = 0; i < bytes.length; i += PEDACO) s += String.fromCharCode.apply(null, bytes.subarray(i, i + PEDACO));
  return btoa(s);
}

export function pdfProtegido(bytes) {
  return new TextDecoder('latin1').decode(bytes).includes('/Encrypt');
}

const semRedimensionar = async (bytes, nome) => ({ bytes, mediaType: /\.png$/i.test(nome) ? 'image/png' : 'image/jpeg' });

export async function prepararDocumentos(itens, { redimensionar = semRedimensionar, limiteBytes = 30 * 1024 * 1024 } = {}) {
  const textos = [], imagens = [], pdfs = [], avisos = [];
  let total = 0;
  for (const it of itens) {
    if (it.tipo === 'texto') {
      textos.push({ nome: it.nome, conteudo: new TextDecoder('utf-8').decode(it.bytes) });
    } else if (it.tipo === 'pdf') {
      if (pdfProtegido(it.bytes)) {
        avisos.push(`${it.nome}: PDF protegido por senha — não foi lido`);
        continue;
      }
      const base64 = paraBase64(it.bytes);
      total += base64.length;
      pdfs.push({ nome: it.nome, base64 });
    } else if (it.tipo === 'imagem') {
      try {
        const r = await redimensionar(it.bytes, it.nome);
        const base64 = paraBase64(r.bytes);
        total += base64.length;
        imagens.push({ nome: it.nome, mediaType: r.mediaType, base64 });
      } catch {
        avisos.push(`${it.nome}: imagem não pôde ser aberta`);
      }
    }
  }
  if (total > limiteBytes) throw new Error('Os arquivos somam mais de 30 MB. Remova alguns e tente de novo.');
  return { textos, imagens, pdfs, avisos };
}
```

- [ ] **Step 4: Implementar `src/lib/imagem.js` (só navegador; validado no teste manual da Task 7)**

```js
// Reduz a foto (celular: 4–8 MB) para o tamanho que a API usa, mantendo legibilidade.
// createImageBitmap aplica a orientação EXIF por padrão no Chrome.
export async function redimensionarImagem(bytes, nome, ladoMax = 1568) {
  const bmp = await createImageBitmap(new Blob([bytes]));
  const escala = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * escala);
  const h = Math.round(bmp.height * escala);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mediaType: 'image/jpeg' };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/entrada.test.js`
Expected: PASS (10 testes)

- [ ] **Step 6: Commit**

```bash
git add src/lib/entrada.js src/lib/imagem.js tests/entrada.test.js
git commit -m "feat: leitura de arquivos soltos e zip com redimensionamento de imagens"
```

---

### Task 4: Extrator (Claude) e pós-processamento

**Files:**
- Create: `src/lib/extrator.js`
- Test: `tests/extrator.test.js`

**Interfaces:**
- Consumes: `CAMPOS` (campos.js); `normalizarCampo`, `cpfValido` (normalizar.js); saída de `prepararDocumentos` (Task 3).
- Produces:
  - `MODELO = 'claude-opus-5'`, `CAMPOS_IA` (CAMPOS sem `soPadrao`), `INSTRUCOES: string`
  - `montarSchema(): object`, `montarMensagem(docs): ContentBlock[]`
  - `class ErroExtracao extends Error`
  - `chamarClaude(client, docs): Promise<{ campos: Record<chave, {valor, certeza, fonte}>, documentos_encontrados: string[], avisos: string[] }>`
  - `posProcessar(bruto, padroes: {propriedade: string, nacionalidade: string}): { valores: Record<chave, {valor: string, certeza: 'alta'|'conferir', fonte: string}>, avisos: string[], documentos: string[] }`

- [ ] **Step 1: Teste que falha — `tests/extrator.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { CAMPOS } from '../src/lib/campos.js';
import {
  MODELO, CAMPOS_IA, montarSchema, montarMensagem, chamarClaude, posProcessar, ErroExtracao,
} from '../src/lib/extrator.js';

const DOCS = {
  textos: [{ nome: '_chat.txt', conteudo: '+55 11 98765-4321: oi' }],
  imagens: [{ nome: 'comprovante.jpg', mediaType: 'image/jpeg', base64: 'AAA' }],
  pdfs: [{ nome: 'CNH-e.pdf', base64: 'BBB' }],
};

const clienteFalso = (resposta) => {
  const chamadas = [];
  return { chamadas, beta: { messages: { create: async (p) => { chamadas.push(p); return resposta; } } } };
};
const resp = (obj, stop_reason = 'end_turn') => ({ stop_reason, content: [{ type: 'text', text: JSON.stringify(obj) }] });

describe('schema e mensagem', () => {
  it('schema exige todos os campos da IA, sem propriedade', () => {
    const s = montarSchema();
    expect(s.properties.campos.required).toEqual(CAMPOS_IA.map(c => c.chave));
    expect(s.properties.campos.required).not.toContain('propriedade');
    expect(s.properties.campos.properties.cpf.properties.certeza.enum).toEqual(['alta', 'conferir']);
    expect(s.additionalProperties).toBe(false);
  });

  it('mensagem tem cada documento precedido do nome do arquivo e o texto da conversa', () => {
    const m = montarMensagem(DOCS);
    expect(m.map(b => b.type)).toEqual(['text', 'document', 'text', 'image', 'text', 'text']);
    expect(m[0].text).toContain('CNH-e.pdf');
    expect(m[1].source).toEqual({ type: 'base64', media_type: 'application/pdf', data: 'BBB' });
    expect(m[3].source).toEqual({ type: 'base64', media_type: 'image/jpeg', data: 'AAA' });
    expect(m[4].text).toContain('+55 11 98765-4321');
  });
});

describe('chamarClaude', () => {
  it('envia modelo, schema e fallback; devolve o JSON', async () => {
    const bruto = { campos: {}, documentos_encontrados: ['CNH-e'], avisos: [] };
    const c = clienteFalso(resp(bruto));
    expect(await chamarClaude(c, DOCS)).toEqual(bruto);
    const p = c.chamadas[0];
    expect(p.model).toBe(MODELO);
    expect(p.max_tokens).toBe(16000);
    expect(p.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(p.fallbacks).toBe('default');
    expect(p.output_config.format.type).toBe('json_schema');
    expect(p.messages[0].role).toBe('user');
  });

  it('recusa, corte e JSON inválido viram ErroExtracao', async () => {
    await expect(chamarClaude(clienteFalso(resp({}, 'refusal')), DOCS)).rejects.toThrow(ErroExtracao);
    await expect(chamarClaude(clienteFalso(resp({}, 'max_tokens')), DOCS)).rejects.toThrow('cortada');
    await expect(chamarClaude(clienteFalso({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'oi' }] }), DOCS))
      .rejects.toThrow('formato inesperado');
  });
});

describe('posProcessar', () => {
  const padroes = { propriedade: '3', nacionalidade: 'BRASILEIRA' };
  const campo = (valor, certeza = 'alta', fonte = 'CNH-e.pdf') => ({ valor, certeza, fonte });

  it('normaliza, aplica padrões e copia celular para fone residencial', () => {
    const r = posProcessar({
      campos: { cpf: campo('52998224725'), nome: campo('José da Silva'), celular: campo('11 98765-4321', 'alta', '_chat.txt'), fone_residencial: campo('') },
      documentos_encontrados: ['CNH-e'], avisos: ['comprovante em nome de terceiro'],
    }, padroes);
    expect(r.valores.cpf).toEqual({ valor: '529.982.247-25', certeza: 'alta', fonte: 'CNH-e.pdf' });
    expect(r.valores.nome.valor).toBe('JOSÉ DA SILVA');
    expect(r.valores.propriedade).toEqual({ valor: '3', certeza: 'alta', fonte: 'padrão' });
    expect(r.valores.nacionalidade).toEqual({ valor: 'BRASILEIRA', certeza: 'alta', fonte: 'padrão' });
    expect(r.valores.fone_residencial).toEqual({ valor: '(11)98765-4321', certeza: 'alta', fonte: 'igual ao celular' });
    expect(r.valores.estado_civil).toEqual({ valor: '', certeza: 'conferir', fonte: '' });
    expect(r.documentos).toEqual(['CNH-e']);
    expect(r.avisos).toContain('comprovante em nome de terceiro');
    expect(Object.keys(r.valores).sort()).toEqual(CAMPOS.map(c => c.chave).sort());
  });

  it('valor ilegível vira "conferir" com aviso; CPF inválido também', () => {
    const r = posProcessar({ campos: { data_nascimento: campo('32/13/1990'), cpf: campo('52998224724') }, documentos_encontrados: [], avisos: [] }, padroes);
    expect(r.valores.data_nascimento).toEqual({ valor: '', certeza: 'conferir', fonte: 'CNH-e.pdf' });
    expect(r.avisos).toContain('Data de Nascimento: valor lido "32/13/1990" não está num formato válido');
    expect(r.valores.cpf.certeza).toBe('conferir');
    expect(r.avisos).toContain('CPF lido não passa na validação — confira');
  });

  it('aguenta resposta vazia', () => {
    const r = posProcessar(null, padroes);
    expect(r.valores.cpf).toEqual({ valor: '', certeza: 'conferir', fonte: '' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/extrator.test.js`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `src/lib/extrator.js`**

```js
import { CAMPOS } from './campos.js';
import { normalizarCampo, cpfValido } from './normalizar.js';

export const MODELO = 'claude-opus-5';
export const CAMPOS_IA = CAMPOS.filter(c => !c.soPadrao);

export class ErroExtracao extends Error {}

export const INSTRUCOES = `Você extrai dados de documentos de motoristas brasileiros para o cadastro no sistema Sitra.
Você recebe fotos e PDFs (CNH ou CNH-e, RG, comprovante de endereço, CRLV e outros) e, às vezes, o texto de uma conversa de WhatsApp.

Regras gerais:
- Preencha cada campo só com o que está escrito nos documentos ou na conversa. Nunca invente nem deduza. Se não encontrar, use valor "" e certeza "conferir".
- certeza "alta" apenas quando o texto está nítido e não há dúvida. Qualquer dúvida (foto borrada, dígito ambíguo, informação indireta) → "conferir".
- fonte: nome do arquivo de onde veio o valor (ex.: "CNH-e.pdf"), ou "conversa" se veio do texto do WhatsApp.
- Datas sempre no formato DD/MM/AAAA.

CNH / CNH-e:
- "Nº REGISTRO" (11 dígitos) → registro_cnh. O número do espelho (impresso na lateral ou no verso, diferente do registro) → numero_espelho_cnh.
- "1ª HABILITAÇÃO" → data_primeira_cnh. "DATA EMISSÃO" → data_emissao_cnh. "VALIDADE" → data_validade_cnh. "CAT. HAB." → categoria_cnh.
- "FILIAÇÃO": em geral o primeiro nome é o pai e o segundo a mãe. Se houver um só nome ou não der para distinguir, marque os dois como "conferir".
- "DATA, LOCAL E UF DE NASCIMENTO" → data_nascimento, naturalidade (cidade) e uf_naturalidade.
- "DOC. IDENTIDADE / ÓRG. EMISSOR / UF" → rg, org_exp, uf_exp.

Outros documentos:
- data_expedicao_rg só existe no próprio RG; nunca use datas da CNH para ele.
- Endereço vem do comprovante de endereço (conta de luz, água, telefone etc.): endereco = só o logradouro, sem número; numero; complemento; bairro; cidade; uf; cep. Se o comprovante estiver em nome de outra pessoa, use o endereço e registre isso em avisos.
- CRLV é documento do veículo: não use para dados pessoais.
- celular, fone_residencial e email: da conversa (inclusive o número de quem enviou, se aparecer no cabeçalho das mensagens) ou de documentos. Telefones com DDD.
- estado_civil e nacionalidade: só se estiverem escritos em algum documento ou na conversa.

documentos_encontrados: lista curta dos tipos identificados (ex.: "CNH-e", "Comprovante de endereço", "CRLV").
avisos: problemas úteis para quem vai conferir — documento ilegível, CNH ou comprovante de endereço ausente, CNH vencida, nomes diferentes entre documentos.`;

export function montarSchema() {
  const campo = {
    type: 'object',
    properties: {
      valor: { type: 'string' },
      certeza: { type: 'string', enum: ['alta', 'conferir'] },
      fonte: { type: 'string' },
    },
    required: ['valor', 'certeza', 'fonte'],
    additionalProperties: false,
  };
  return {
    type: 'object',
    properties: {
      campos: {
        type: 'object',
        properties: Object.fromEntries(CAMPOS_IA.map(c => [c.chave, { ...campo, description: c.dica }])),
        required: CAMPOS_IA.map(c => c.chave),
        additionalProperties: false,
      },
      documentos_encontrados: { type: 'array', items: { type: 'string' } },
      avisos: { type: 'array', items: { type: 'string' } },
    },
    required: ['campos', 'documentos_encontrados', 'avisos'],
    additionalProperties: false,
  };
}

export function montarMensagem({ textos, imagens, pdfs }) {
  return [
    ...pdfs.flatMap(p => [
      { type: 'text', text: `Arquivo: ${p.nome}` },
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: p.base64 } },
    ]),
    ...imagens.flatMap(i => [
      { type: 'text', text: `Arquivo: ${i.nome}` },
      { type: 'image', source: { type: 'base64', media_type: i.mediaType, data: i.base64 } },
    ]),
    ...textos.map(t => ({ type: 'text', text: `Conversa do WhatsApp (${t.nome}):\n${t.conteudo}` })),
    { type: 'text', text: 'Extraia os campos do cadastro conforme as instruções.' },
  ];
}

export async function chamarClaude(client, docs) {
  const resposta = await client.beta.messages.create({
    model: MODELO,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: INSTRUCOES,
    messages: [{ role: 'user', content: montarMensagem(docs) }],
    output_config: { format: { type: 'json_schema', schema: montarSchema() } },
  });
  if (resposta.stop_reason === 'refusal') throw new ErroExtracao('A IA se recusou a ler estes documentos. Preencha manualmente.');
  if (resposta.stop_reason === 'max_tokens') throw new ErroExtracao('A resposta da IA foi cortada. Tente de novo.');
  const texto = resposta.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErroExtracao('A resposta da IA veio num formato inesperado. Tente de novo.');
  }
}

export function posProcessar(bruto, padroes) {
  const valores = {};
  const avisos = [...(bruto?.avisos ?? [])];
  for (const campo of CAMPOS) {
    const b = bruto?.campos?.[campo.chave];
    let valor = normalizarCampo(campo, b?.valor ?? '');
    let certeza = b?.certeza === 'alta' ? 'alta' : 'conferir';
    let fonte = b?.fonte ?? '';
    if (b?.valor && !valor) avisos.push(`${campo.rotulo}: valor lido "${b.valor}" não está num formato válido`);
    if (!valor && campo.padrao && padroes?.[campo.padrao]) {
      valor = normalizarCampo(campo, padroes[campo.padrao]);
      certeza = 'alta';
      fonte = 'padrão';
    }
    if (!valor) certeza = 'conferir';
    valores[campo.chave] = { valor, certeza, fonte };
  }
  if (!valores.fone_residencial.valor && valores.celular.valor) {
    valores.fone_residencial = { ...valores.celular, fonte: 'igual ao celular' };
  }
  if (valores.cpf.valor && !cpfValido(valores.cpf.valor)) {
    valores.cpf.certeza = 'conferir';
    avisos.push('CPF lido não passa na validação — confira');
  }
  return { valores, avisos, documentos: bruto?.documentos_encontrados ?? [] };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/extrator.test.js`
Expected: PASS (7 testes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/extrator.js tests/extrator.test.js
git commit -m "feat: extração dos campos com Claude e pós-processamento"
```

---

### Task 5: Preenchedor (roda na página do Sitra)

**Files:**
- Create: `src/content/preenchedor.js`, `tests/fixtures/sitra.html`
- Modify: `src/content/injetado.js` (substituir o stub)
- Test: `tests/preenchedor.test.js`

**Interfaces:**
- Consumes: `CAMPOS`, `CAMPO_POR_CHAVE` (campos.js).
- Produces: `criarPreenchedor(win, { timeoutMs = 8000, intervaloMs = 100 }) → { estado(): {naPagina: boolean, vazio: boolean}, preencher(valores: Record<chave, string>): Promise<Relatorio> }` onde `Relatorio = { ok: boolean, erro?: string, avisos: string[], campos: Array<{ chave, rotulo, esperado, obtido, status: 'ok'|'sitra'|'falhou'|'vazio' }> }`. Global `window.__cadastroMotorista` definido por `injetado.js`.

- [ ] **Step 1: Fixture — `tests/fixtures/sitra.html`** (ids, classes e handlers iguais ao Sitra real; UFs reduzidas)

```html
<!doctype html>
<html><body>
<input id="txtMotoristaCpf" class="cpf" maxlength="14" onchange="Search()">
<input id="txtMotoristaNome" maxlength="50">
<input id="txtStatusMotorista">
<input id="txtCep" class="cep" maxlength="9" onchange="pesquisaCep()">
<input id="txtEndereco" maxlength="50">
<input id="txtNumero" maxlength="10">
<input id="txtComplemento" maxlength="30">
<input id="txtBairro" maxlength="30">
<select id="txtUf" onchange="CarregaCidadePorUf()"><option value="">Selecione</option><option>MG</option><option>RJ</option><option>SP</option></select>
<input id="txtCidade">
<input id="txtDataNascimento" class="date" maxlength="10">
<input id="txtEstadoCivil" maxlength="9">
<input id="txtNomePai" maxlength="40">
<input id="txtNomeMae" maxlength="40">
<select id="txtNaturalidadeUf" onchange="CarregaCidadePorUfNatu()"><option value="">Selecione</option><option>MG</option><option>RJ</option><option>SP</option></select>
<input id="txtNaturalidade" maxlength="40">
<input id="txtNacionalidade" maxlength="20">
<select id="txtPropriedade"><option value="">Selecione</option><option value="1">Da Casa</option><option value="2">Agregado</option><option value="3">Terceiro</option></select>
<input id="txtResidencial" class="sp_celphones" maxlength="14">
<input id="txtCelular" class="sp_celphones" maxlength="14">
<input id="txtRg" class="rg" maxlength="12">
<select id="txtUfExp"><option value="">Selecione</option><option>MG</option><option>RJ</option><option>SP</option></select>
<input id="txtOrgExp" maxlength="10">
<input id="txtDataExpedicao" class="date" maxlength="10">
<input id="txtNumeroCnh" maxlength="14">
<input id="txtRegistroCNH" maxlength="10">
<input id="txtDataPrimeiraCnh" class="date" maxlength="10">
<input id="txtDataEmissaoCnh" class="date" maxlength="10">
<input id="txtDataValidadeCnh" class="date" maxlength="10">
<input id="txtCategoriaCnh" maxlength="4">
<input id="txtEmail" maxlength="60">
<div id="ModalErro" style="display:none"><span id="erro"></span></div>
</body></html>
```

- [ ] **Step 2: Teste que falha — `tests/preenchedor.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { criarPreenchedor } from '../src/content/preenchedor.js';

const HTML = readFileSync(new URL('./fixtures/sitra.html', import.meta.url), 'utf8');
const URL_SITRA = 'https://2323.aleff.com.br/Motorista/CadastroDeMotorista';

const VALORES = {
  cpf: '529.982.247-25', nome: 'JOSE DA SILVA', cep: '01310-100', endereco: 'AVENIDA PAULISTA', numero: '1000',
  complemento: 'AP 12', bairro: 'BELA VISTA', uf: 'SP', cidade: 'SAO PAULO', data_nascimento: '15/03/1985',
  estado_civil: 'CASADO', nome_pai: 'JOAO DA SILVA', nome_mae: 'MARIA DA SILVA', uf_naturalidade: 'MG',
  naturalidade: 'BELO HORIZONTE', nacionalidade: 'BRASILEIRA', propriedade: '3', celular: '(11)98765-4321',
  fone_residencial: '(11)98765-4321', email: 'jose@exemplo.com', rg: '123456789', uf_exp: 'SP', org_exp: 'SSP',
  data_expedicao_rg: '10/01/2005', registro_cnh: '01234567890', numero_espelho_cnh: '',
  data_primeira_cnh: '20/05/2005', data_emissao_cnh: '01/02/2023', data_validade_cnh: '01/02/2033', categoria_cnh: 'AE',
};

// Simula o Sitra: cada handler "faz uma requisição" (jQuery.active > 0 por alguns ms).
function criarSitra({ url = URL_SITRA, search, pesquisaCep } = {}) {
  const dom = new JSDOM(HTML, { runScripts: 'dangerously', url });
  const win = dom.window;
  const doc = win.document;
  win.jQuery = { active: 0 };
  const ajax = (fn) => { win.jQuery.active++; setTimeout(() => { fn(); win.jQuery.active--; }, 20); };
  const limparCampos = () => {
    for (const el of doc.querySelectorAll('input, select')) if (el.id !== 'txtMotoristaCpf') el.value = '';
  };
  win.Search = () => ajax(search ?? limparCampos);
  win.pesquisaCep = () => ajax(pesquisaCep ?? (() => {}));
  win.CarregaCidadePorUf = () => ajax(() => {});
  win.CarregaCidadePorUfNatu = () => ajax(() => {});
  const p = criarPreenchedor(win, { timeoutMs: 1000, intervaloMs: 5 });
  const val = (id) => doc.getElementById(id).value;
  const abrirModal = (texto) => { doc.getElementById('ModalErro').style.display = 'block'; doc.getElementById('erro').textContent = texto; };
  return { win, doc, p, val, abrirModal };
}

describe('preenchedor', () => {
  it('preenche tudo mesmo com o Search() limpando o formulário (CPF novo)', async () => {
    const { p, val } = criarSitra();
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(true);
    expect(val('txtMotoristaCpf')).toBe('529.982.247-25');
    expect(val('txtMotoristaNome')).toBe('JOSE DA SILVA');
    expect(val('txtNumeroCnh')).toBe('01234567890');
    expect(val('txtPropriedade')).toBe('3');
    expect(val('txtNaturalidade')).toBe('BELO HORIZONTE');
    expect(rel.campos.filter(c => c.status !== 'ok')).toEqual([]);
  });

  it('para quando o motorista já existe', async () => {
    const { p, val, doc } = criarSitra({
      search: () => { doc.getElementById('txtStatusMotorista').value = 'Ativo'; doc.getElementById('txtMotoristaNome').value = 'FULANO'; },
    });
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/já está cadastrado/);
    expect(val('txtMotoristaNome')).toBe('FULANO');
  });

  it('para quando o Sitra recusa o CPF e repassa a mensagem', async () => {
    const { p, doc, abrirModal } = criarSitra({
      search: () => { abrirModal('CPF inválido, Favor Verificar!'); doc.getElementById('txtMotoristaCpf').value = ''; },
    });
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toContain('CPF inválido, Favor Verificar!');
    expect(doc.getElementById('ModalErro').style.display).toBe('none');
  });

  it('mantém o endereço que o Sitra trouxe pelo CEP e marca como "sitra"', async () => {
    const { p, val, doc } = criarSitra({
      pesquisaCep: () => {
        doc.getElementById('txtEndereco').value = 'AV. PAULISTA';
        doc.getElementById('txtBairro').value = 'BELA VISTA';
        doc.getElementById('txtUf').value = 'SP';
        doc.getElementById('txtCidade').value = 'SÃO PAULO';
      },
    });
    const rel = await p.preencher(VALORES);
    expect(val('txtEndereco')).toBe('AV. PAULISTA');
    expect(val('txtNumero')).toBe('1000');
    expect(rel.campos.find(c => c.chave === 'endereco').status).toBe('sitra');
  });

  it('CEP não encontrado: fecha o modal, avisa e usa o endereço do documento', async () => {
    const { p, val, abrirModal } = criarSitra({ pesquisaCep: () => abrirModal('CEP não Encontrado!') });
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(true);
    expect(rel.avisos).toContain('Sitra: CEP não Encontrado!');
    expect(val('txtEndereco')).toBe('AVENIDA PAULISTA');
    expect(val('txtUf')).toBe('SP');
  });

  it('campo que sumiu da página: continua e marca como falhou', async () => {
    const { p, doc, val } = criarSitra();
    doc.getElementById('txtCategoriaCnh').remove();
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(true);
    expect(val('txtNumeroCnh')).toBe('01234567890');
    expect(rel.campos.find(c => c.chave === 'categoria_cnh').status).toBe('falhou');
    expect(rel.avisos).toContain('Campo Categoria não existe mais na página do Sitra');
  });

  it('obrigatório sem valor aparece como vazio', async () => {
    const { p } = criarSitra();
    const rel = await p.preencher({ ...VALORES, estado_civil: '' });
    expect(rel.campos.find(c => c.chave === 'estado_civil').status).toBe('vazio');
  });

  it('fora da tela de cadastro não preenche', async () => {
    const { p, val } = criarSitra({ url: 'https://2323.aleff.com.br/Home' });
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(false);
    expect(val('txtMotoristaCpf')).toBe('');
  });

  it('Sitra que não responde vira erro claro', async () => {
    const { p, win } = criarSitra({ search: () => {} });
    win.Search = () => { win.jQuery.active = 1; };
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/demorou demais/);
  });

  it('estado() informa página e formulário vazio', () => {
    const { p, doc } = criarSitra();
    expect(p.estado()).toEqual({ naPagina: true, vazio: true });
    doc.getElementById('txtMotoristaNome').value = 'X';
    expect(p.estado()).toEqual({ naPagina: true, vazio: false });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/preenchedor.test.js`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 4: Implementar `src/content/preenchedor.js`**

```js
import { CAMPOS, CAMPO_POR_CHAVE } from '../lib/campos.js';

const PESSOAIS = ['nome', 'data_nascimento', 'estado_civil', 'nome_pai', 'nome_mae', 'nacionalidade', 'propriedade', 'celular', 'fone_residencial', 'email'];
const DOCUMENTACAO = ['rg', 'uf_exp', 'org_exp', 'data_expedicao_rg', 'registro_cnh', 'numero_espelho_cnh', 'data_primeira_cnh', 'data_emissao_cnh', 'data_validade_cnh', 'categoria_cnh'];
const VINDOS_DO_CEP = ['endereco', 'bairro', 'uf', 'cidade'];

const comparavel = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^0-9A-Z@.]/g, '');

// Roda no mundo principal da página (world: "MAIN") para enxergar o jQuery do Sitra.
export function criarPreenchedor(win, { timeoutMs = 8000, intervaloMs = 100 } = {}) {
  const doc = win.document;
  const el = (id) => doc.getElementById(id);
  const esperar = (ms) => new Promise(r => win.setTimeout(r, ms));
  const valorDe = (chave) => el(CAMPO_POR_CHAVE[chave].id)?.value ?? '';

  async function aguardarSitra() {
    const fim = Date.now() + timeoutMs;
    let ociosos = 0;
    await esperar(intervaloMs);
    while (Date.now() < fim) {
      ociosos = (win.jQuery?.active ?? 0) === 0 ? ociosos + 1 : 0;
      if (ociosos >= 2) return;
      await esperar(intervaloMs);
    }
    throw new Error('O Sitra demorou demais para responder. Tente de novo.');
  }

  function fecharModalErroSeAberto() {
    const m = el('ModalErro');
    if (!m || !(m.classList.contains('in') || m.style.display === 'block')) return null;
    const texto = (el('erro')?.textContent ?? '').trim();
    if (win.jQuery?.fn?.modal) win.jQuery('#ModalErro').modal('hide');
    m.classList.remove('in');
    m.style.display = 'none';
    return texto;
  }

  function estado() {
    const naPagina = win.location.pathname.toLowerCase().includes('/motorista/cadastrodemotorista');
    const vazio = naPagina && ['cpf', 'nome', 'cep', 'rg'].every(k => !valorDe(k).trim());
    return { naPagina, vazio };
  }

  async function preencher(valores) {
    const avisos = [];
    const falha = (erro) => ({ ok: false, erro, avisos, campos: [] });

    const definir = (chave) => {
      const campo = CAMPO_POR_CHAVE[chave];
      const e = el(campo.id);
      if (!e) {
        avisos.push(`Campo ${campo.rotulo} não existe mais na página do Sitra`);
        return;
      }
      e.value = valores[chave];
      e.dispatchEvent(new win.Event('input', { bubbles: true }));
      e.dispatchEvent(new win.Event('change', { bubbles: true }));
    };
    const definirSeTiver = (chave) => { if (valores[chave]) definir(chave); };
    const registrarModal = () => {
      const t = fecharModalErroSeAberto();
      if (t) avisos.push(`Sitra: ${t}`);
      return t;
    };

    if (!estado().naPagina) return falha('Abra a tela Cadastro de Motoristas do Sitra nesta aba.');

    try {
      // 1. CPF primeiro: o Search() do Sitra limpa o formulário quando o CPF é novo.
      definir('cpf');
      await aguardarSitra();
      const msgCpf = registrarModal();
      if (!valorDe('cpf')) return falha(`O Sitra recusou o CPF${msgCpf ? `: ${msgCpf}` : ''}.`);
      if ((el('txtStatusMotorista')?.value ?? '').trim()) return falha('Este motorista já está cadastrado no Sitra. Nada foi alterado além do CPF.');

      // 2. Dados pessoais e contato.
      PESSOAIS.forEach(definirSeTiver);

      // 3. Naturalidade: a UF carrega a lista de cidades antes.
      if (valores.uf_naturalidade) { definir('uf_naturalidade'); await aguardarSitra(); }
      definirSeTiver('naturalidade');

      // 4. Endereço: o CEP preenche logradouro/bairro/UF/cidade; só completamos o que ficou vazio.
      if (valores.cep) { definir('cep'); await aguardarSitra(); registrarModal(); }
      definirSeTiver('numero');
      definirSeTiver('complemento');
      if (!valorDe('uf') && valores.uf) { definir('uf'); await aguardarSitra(); }
      for (const k of ['endereco', 'bairro', 'cidade']) if (!valorDe(k).trim()) definirSeTiver(k);

      // 5. Documentação.
      DOCUMENTACAO.forEach(definirSeTiver);
      registrarModal();
    } catch (e) {
      return falha(e.message);
    }

    // 6. Conferência campo a campo.
    const campos = [];
    for (const c of CAMPOS) {
      const esperado = valores[c.chave] ?? '';
      const obtido = valorDe(c.chave);
      let status;
      if (esperado) {
        if (el(c.id) && comparavel(obtido) === comparavel(esperado)) status = 'ok';
        else if (VINDOS_DO_CEP.includes(c.chave) && obtido) status = 'sitra';
        else status = 'falhou';
      } else if (obtido) status = 'sitra';
      else if (c.obrigatorio) status = 'vazio';
      else continue;
      campos.push({ chave: c.chave, rotulo: c.rotulo, esperado, obtido, status });
    }
    return { ok: true, avisos, campos };
  }

  return { estado, preencher };
}
```

- [ ] **Step 5: Substituir `src/content/injetado.js`**

```js
import { criarPreenchedor } from './preenchedor.js';

window.__cadastroMotorista = criarPreenchedor(window);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/preenchedor.test.js`
Expected: PASS (10 testes)

- [ ] **Step 7: Commit**

```bash
git add src/content tests/preenchedor.test.js tests/fixtures/sitra.html
git commit -m "feat: preenchedor do formulário do Sitra com espera do jQuery e relatório"
```

---

### Task 6: Painel lateral, conferência e configurações

**Files:**
- Create: `src/sidepanel/formulario.js`, `src/lib/config.js`, `extensao/sidepanel/index.html`, `extensao/sidepanel/style.css`, `extensao/options/options.html`
- Modify: `src/sidepanel/main.js`, `src/options/main.js` (substituir stubs)
- Test: `tests/formulario.test.js`

**Interfaces:**
- Consumes: `CAMPOS`, `UFS` (campos.js); `normalizarCampo` (normalizar.js); `lerEntrada`, `prepararDocumentos` (Task 3); `redimensionarImagem` (Task 3); `chamarClaude`, `posProcessar`, `ErroExtracao` (Task 4); `window.__cadastroMotorista.estado/preencher` (Task 5).
- Produces: `montarFormulario(valores: Record<chave,{valor,certeza,fonte}>): string` (HTML); `lerFormulario(form: HTMLFormElement): { valores: Record<chave,string>, invalidos: string[], faltando: string[] }`; `PADROES`, `lerConfig(storage?)`, `salvarConfig(cfg, storage?)`.

- [ ] **Step 1: Teste que falha — `tests/formulario.test.js`**

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { montarFormulario, lerFormulario } from '../src/sidepanel/formulario.js';
import { CAMPOS } from '../src/lib/campos.js';

const vazio = () => Object.fromEntries(CAMPOS.map(c => [c.chave, { valor: '', certeza: 'conferir', fonte: '' }]));

function renderizar(valores) {
  document.body.innerHTML = `<form id="f">${montarFormulario(valores)}</form>`;
  return document.getElementById('f');
}

describe('formulário de conferência', () => {
  it('marca em amarelo o que precisa conferir e mostra a fonte', () => {
    const v = vazio();
    v.cpf = { valor: '529.982.247-25', certeza: 'alta', fonte: 'CNH-e.pdf' };
    const f = renderizar(v);
    expect(f.querySelector('[name="c_cpf"]').closest('label').classList.contains('conferir')).toBe(false);
    expect(f.querySelector('[name="c_estado_civil"]').closest('label').classList.contains('conferir')).toBe(true);
    expect(f.textContent).toContain('CNH-e.pdf');
    expect(f.querySelector('select[name="c_uf"]')).not.toBeNull();
    expect(f.querySelector('select[name="c_propriedade"] option[value="3"]').textContent).toBe('Terceiro');
  });

  it('escapa HTML vindo dos documentos', () => {
    const v = vazio();
    v.nome = { valor: '"><img src=x onerror=alert(1)>', certeza: 'alta', fonte: '<b>x</b>' };
    const f = renderizar(v);
    expect(f.querySelector('img')).toBeNull();
    expect(f.querySelector('[name="c_nome"]').value).toBe('"><img src=x onerror=alert(1)>');
  });

  it('normaliza o que o operador digitou em formato livre', () => {
    const f = renderizar(vazio());
    f.elements.c_cpf.value = '52998224725';
    f.elements.c_data_nascimento.value = '1/2/1990';
    f.elements.c_celular.value = '11 98765 4321';
    f.elements.c_estado_civil.value = 'solteira';
    const { valores } = lerFormulario(f);
    expect(valores.cpf).toBe('529.982.247-25');
    expect(valores.data_nascimento).toBe('01/02/1990');
    expect(valores.celular).toBe('(11)98765-4321');
    expect(valores.estado_civil).toBe('SOLTEIRO');
  });

  it('lista inválidos e obrigatórios faltando', () => {
    const f = renderizar(vazio());
    f.elements.c_data_nascimento.value = '31/02/1990';
    const { invalidos, faltando } = lerFormulario(f);
    expect(invalidos).toEqual(['Data de Nascimento']);
    expect(faltando).toContain('CPF');
    expect(faltando).not.toContain('Complemento');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/formulario.test.js`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `src/sidepanel/formulario.js`**

```js
import { CAMPOS, UFS } from '../lib/campos.js';
import { normalizarCampo } from '../lib/normalizar.js';

const PROPRIEDADES = [['1', 'Da Casa'], ['2', 'Agregado'], ['3', 'Terceiro']];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

function controle(campo, valor) {
  const nome = `c_${campo.chave}`;
  const opcoes = (lista) => lista.map(([v, t]) => `<option value="${esc(v)}"${v === valor ? ' selected' : ''}>${esc(t)}</option>`).join('');
  if (campo.tipo === 'uf') return `<select name="${nome}"><option value="">—</option>${opcoes(UFS.map(u => [u, u]))}</select>`;
  if (campo.tipo === 'propriedade') return `<select name="${nome}"><option value="">—</option>${opcoes(PROPRIEDADES)}</select>`;
  return `<input name="${nome}" value="${esc(valor)}" autocomplete="off">`;
}

export function montarFormulario(valores) {
  const grupos = [...new Set(CAMPOS.map(c => c.grupo))];
  return grupos.map(g => `<fieldset><legend>${esc(g)}</legend>${CAMPOS.filter(c => c.grupo === g).map(c => {
    const v = valores[c.chave] ?? { valor: '', certeza: 'conferir', fonte: '' };
    return `<label class="campo${v.certeza === 'conferir' ? ' conferir' : ''}"><span>${esc(c.rotulo)}${c.obrigatorio ? ' *' : ''}</span>${controle(c, v.valor)}${v.fonte ? `<small>${esc(v.fonte)}</small>` : ''}</label>`;
  }).join('')}</fieldset>`).join('');
}

export function lerFormulario(form) {
  const valores = {}, invalidos = [], faltando = [];
  for (const c of CAMPOS) {
    const bruto = form.elements[`c_${c.chave}`]?.value ?? '';
    const v = normalizarCampo(c, bruto);
    if (bruto.trim() && !v) invalidos.push(c.rotulo);
    else if (!v && c.obrigatorio) faltando.push(c.rotulo);
    valores[c.chave] = v;
  }
  return { valores, invalidos, faltando };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/formulario.test.js`
Expected: PASS (4 testes)

- [ ] **Step 5: `src/lib/config.js`**

```js
export const PADROES = { propriedade: '3', nacionalidade: 'BRASILEIRA' };

export async function lerConfig(storage = chrome.storage.local) {
  const r = await storage.get(['apiKey', 'padroes']);
  return { apiKey: r.apiKey ?? '', padroes: { ...PADROES, ...(r.padroes ?? {}) } };
}

export async function salvarConfig(cfg, storage = chrome.storage.local) {
  await storage.set(cfg);
}
```

- [ ] **Step 6: Conferir os nomes do SDK antes de usar**

Run: `grep -rl "dangerouslyAllowBrowser" node_modules/@anthropic-ai/sdk --include=*.d.ts | head -3` e `grep -rhoE "class (AuthenticationError|RateLimitError|APIConnectionError|APIError)\b" node_modules/@anthropic-ai/sdk --include=*.d.ts | sort -u`
Expected: pelo menos um arquivo com `dangerouslyAllowBrowser`; as quatro classes listadas. Se algum nome não existir, ajuste o Step 8 ao nome encontrado antes de seguir.

- [ ] **Step 7: `extensao/sidepanel/index.html` e `style.css`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Cadastro de Motorista</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Cadastro de Motorista</h1>
  <p id="mensagem" hidden></p>

  <section data-etapa="entrada">
    <label id="zona">
      <strong>Solte aqui os documentos do motorista</strong>
      <span>fotos, PDFs ou o .zip da conversa — ou clique para escolher</span>
      <input id="seletor" type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.txt,.zip,.rar" hidden>
    </label>
    <ul id="lista-arquivos"></ul>
    <button id="btn-ler" disabled>Ler documentos</button>
    <a href="#" id="link-config">Configurações</a>
  </section>

  <section data-etapa="lendo" hidden>
    <p class="carregando">Lendo documentos com a IA… (até 1 minuto)</p>
  </section>

  <section data-etapa="conferencia" hidden>
    <p>Confira os campos. <span class="legenda">Amarelo = conferir.</span></p>
    <ul id="avisos"></ul>
    <form id="form-conferencia"></form>
    <div class="acoes">
      <button id="btn-preencher">Preencher no Sitra</button>
      <button id="btn-recomecar" class="secundario">Recomeçar</button>
    </div>
  </section>

  <section data-etapa="resultado" hidden>
    <p id="resultado-titulo"></p>
    <ul id="relatorio"></ul>
    <div class="acoes">
      <button id="btn-voltar" class="secundario">Voltar à conferência</button>
      <button id="btn-novo">Próximo motorista</button>
    </div>
  </section>

  <script type="module" src="main.bundle.js"></script>
</body>
</html>
```

```css
:root { --laranja: #e8710a; --amarelo: #fff4c2; --borda: #ccc; --texto: #222; --fundo: #fff; }
body { font: 13px/1.4 system-ui, sans-serif; color: var(--texto); background: var(--fundo); margin: 0; padding: 12px; }
h1 { font-size: 16px; margin: 0 0 12px; }
#mensagem { padding: 8px; border-radius: 4px; }
#mensagem.erro { background: #fde2e1; }
#mensagem.alerta { background: var(--amarelo); }
#zona { display: flex; flex-direction: column; gap: 4px; padding: 24px 12px; border: 2px dashed var(--borda); border-radius: 8px; text-align: center; cursor: pointer; }
#zona.ativa { border-color: var(--laranja); background: #fff7ef; }
#lista-arquivos, #avisos, #relatorio { padding-left: 16px; }
#lista-arquivos li button { margin-left: 6px; border: 0; background: none; cursor: pointer; }
button { background: var(--laranja); color: #fff; border: 0; border-radius: 4px; padding: 8px 12px; cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
button.secundario { background: #888; }
fieldset { border: 1px solid var(--borda); border-radius: 6px; margin: 0 0 10px; }
legend { font-weight: 600; }
.campo { display: grid; gap: 2px; margin-bottom: 6px; padding: 4px; border-radius: 4px; }
.campo.conferir { background: var(--amarelo); }
.campo input, .campo select { width: 100%; box-sizing: border-box; padding: 4px; }
.campo small { color: #666; }
.acoes { display: flex; gap: 8px; margin-top: 8px; }
.carregando { font-style: italic; }
#avisos li { color: #8a5a00; }
```

- [ ] **Step 8: `src/sidepanel/main.js`**

```js
import Anthropic from '@anthropic-ai/sdk';
import { lerEntrada, prepararDocumentos } from '../lib/entrada.js';
import { redimensionarImagem } from '../lib/imagem.js';
import { chamarClaude, posProcessar, ErroExtracao } from '../lib/extrator.js';
import { lerConfig } from '../lib/config.js';
import { montarFormulario, lerFormulario } from './formulario.js';

const $ = (id) => document.getElementById(id);
let arquivos = [];
let confirmarSobrescrita = false;

function mostrar(etapa) {
  for (const s of document.querySelectorAll('section[data-etapa]')) s.hidden = s.dataset.etapa !== etapa;
}

function mensagem(texto, tipo = 'erro') {
  $('mensagem').textContent = texto;
  $('mensagem').className = tipo;
  $('mensagem').hidden = !texto;
}

function preencherLista(ul, itens) {
  ul.innerHTML = '';
  for (const t of itens) {
    const li = document.createElement('li');
    li.textContent = t;
    ul.append(li);
  }
}

function listarArquivos() {
  const ul = $('lista-arquivos');
  ul.innerHTML = '';
  arquivos.forEach((f, i) => {
    const li = document.createElement('li');
    li.textContent = f.name;
    const b = document.createElement('button');
    b.textContent = '✕';
    b.title = 'Remover';
    b.onclick = () => { arquivos.splice(i, 1); listarArquivos(); };
    li.append(b);
    ul.append(li);
  });
  $('btn-ler').disabled = arquivos.length === 0;
}

function adicionar(lista) {
  arquivos.push(...lista);
  listarArquivos();
  mensagem('');
}

function descreverErro(e) {
  if (e instanceof ErroExtracao) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'Chave da API inválida. Confira nas configurações.';
  if (e instanceof Anthropic.RateLimitError) return 'Limite de uso da API atingido. Espere um pouco e tente de novo.';
  if (e instanceof Anthropic.APIConnectionError) return 'Sem conexão com a API do Claude. Verifique a internet.';
  if (e instanceof Anthropic.APIError) return `Erro da API do Claude: ${e.message}`;
  return e.message;
}

async function lerDocumentos() {
  mensagem('');
  const cfg = await lerConfig();
  if (!cfg.apiKey) {
    mensagem('Configure a chave da API do Claude primeiro.');
    chrome.runtime.openOptionsPage();
    return;
  }
  mostrar('lendo');
  try {
    const entrada = await lerEntrada(arquivos);
    const docs = await prepararDocumentos(entrada.itens, { redimensionar: redimensionarImagem });
    const avisosEntrada = [
      ...entrada.naoSuportados.map(n => `${n}: formato não suportado — solte os arquivos direto ou use .zip`),
      ...docs.avisos,
    ];
    if (docs.imagens.length + docs.pdfs.length === 0) throw new ErroExtracao(['Nenhuma foto/PDF encontrada.', ...avisosEntrada].join(' '));
    const client = new Anthropic({ apiKey: cfg.apiKey, dangerouslyAllowBrowser: true });
    const r = posProcessar(await chamarClaude(client, docs), cfg.padroes);
    $('form-conferencia').innerHTML = montarFormulario(r.valores);
    const docsLidos = r.documentos.length ? [`Documentos lidos: ${r.documentos.join(', ')}`] : [];
    preencherLista($('avisos'), [...docsLidos, ...avisosEntrada, ...r.avisos]);
    confirmarSobrescrita = false;
    mostrar('conferencia');
  } catch (e) {
    mostrar('entrada');
    mensagem(descreverErro(e));
    $('btn-ler').textContent = 'Tentar de novo';
  }
}

async function executarNoSitra(func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', files: ['content/injetado.bundle.js'] });
  const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func, args });
  return r.result;
}

const STATUS = { ok: '✅', sitra: '🔵 veio do Sitra (CEP) —', falhou: '⚠️ não gravou —', vazio: '⚠️ obrigatório vazio —' };

function mostrarRelatorio(rel) {
  $('resultado-titulo').textContent = rel.ok
    ? 'Pronto! Confira a tela do Sitra e clique em "Cadastrar".'
    : `Parou: ${rel.erro}`;
  const linhas = [
    ...rel.avisos,
    ...rel.campos.map(c => `${STATUS[c.status]} ${c.rotulo}${c.status === 'falhou' ? ` (esperado "${c.esperado}", ficou "${c.obtido}")` : ''}`),
  ];
  preencherLista($('relatorio'), linhas);
  mostrar('resultado');
}

async function preencherSitra() {
  mensagem('');
  const { valores, invalidos, faltando } = lerFormulario($('form-conferencia'));
  if (invalidos.length) { mensagem(`Formato inválido: ${invalidos.join(', ')}`); return; }
  if (!valores.cpf) { mensagem('O CPF é obrigatório para preencher.'); return; }

  let est;
  try {
    est = await executarNoSitra(() => window.__cadastroMotorista.estado());
  } catch {
    est = { naPagina: false };
  }
  if (!est?.naPagina) { mensagem('Abra a tela Cadastro de Motoristas do Sitra nesta aba.'); return; }
  if (!est.vazio && !confirmarSobrescrita) {
    confirmarSobrescrita = true;
    mensagem('O formulário do Sitra já tem dados. Clique em "Preencher no Sitra" de novo para sobrescrever, ou clique em "Limpar" no Sitra antes.', 'alerta');
    return;
  }
  confirmarSobrescrita = false;
  if (faltando.length) mensagem(`Vai ficar faltando: ${faltando.join(', ')}`, 'alerta');

  $('btn-preencher').disabled = true;
  $('btn-preencher').textContent = 'Preenchendo…';
  try {
    mostrarRelatorio(await executarNoSitra((v) => window.__cadastroMotorista.preencher(v), [valores]));
  } catch (e) {
    mensagem(`Falha ao preencher: ${e.message}`);
  } finally {
    $('btn-preencher').disabled = false;
    $('btn-preencher').textContent = 'Preencher no Sitra';
  }
}

function recomecar() {
  arquivos = [];
  listarArquivos();
  mensagem('');
  $('btn-ler').textContent = 'Ler documentos';
  mostrar('entrada');
}

$('zona').addEventListener('dragover', (e) => { e.preventDefault(); $('zona').classList.add('ativa'); });
$('zona').addEventListener('dragleave', () => $('zona').classList.remove('ativa'));
$('zona').addEventListener('drop', (e) => { e.preventDefault(); $('zona').classList.remove('ativa'); adicionar([...e.dataTransfer.files]); });
$('seletor').addEventListener('change', (e) => { adicionar([...e.target.files]); e.target.value = ''; });
$('btn-ler').addEventListener('click', lerDocumentos);
$('btn-preencher').addEventListener('click', (e) => { e.preventDefault(); preencherSitra(); });
$('btn-recomecar').addEventListener('click', recomecar);
$('btn-novo').addEventListener('click', recomecar);
$('btn-voltar').addEventListener('click', () => { mensagem(''); mostrar('conferencia'); });
$('link-config').addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
$('form-conferencia').addEventListener('input', (e) => e.target.closest('label')?.classList.remove('conferir'));
$('form-conferencia').addEventListener('submit', (e) => e.preventDefault());
```

- [ ] **Step 9: `extensao/options/options.html` e `src/options/main.js`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Configurações – Cadastro de Motorista</title>
  <style>
    body { font: 14px/1.4 system-ui, sans-serif; max-width: 480px; margin: 24px auto; padding: 0 16px; }
    label { display: grid; gap: 4px; margin-bottom: 12px; }
    input, select { padding: 6px; }
    button { background: #e8710a; color: #fff; border: 0; border-radius: 4px; padding: 8px 12px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Configurações</h1>
  <label>Chave da API do Claude
    <input id="apiKey" type="password" autocomplete="off" placeholder="sk-ant-...">
  </label>
  <label>Nacionalidade padrão
    <input id="nacionalidade">
  </label>
  <label>Propriedade padrão
    <select id="propriedade"><option value="1">Da Casa</option><option value="2">Agregado</option><option value="3">Terceiro</option></select>
  </label>
  <button id="salvar">Salvar</button>
  <p id="status"></p>
  <script type="module" src="main.bundle.js"></script>
</body>
</html>
```

```js
import { lerConfig, salvarConfig } from '../lib/config.js';

const $ = (id) => document.getElementById(id);

const cfg = await lerConfig();
$('apiKey').value = cfg.apiKey;
$('nacionalidade').value = cfg.padroes.nacionalidade;
$('propriedade').value = cfg.padroes.propriedade;

$('salvar').addEventListener('click', async () => {
  await salvarConfig({
    apiKey: $('apiKey').value.trim(),
    padroes: { nacionalidade: $('nacionalidade').value.trim().toUpperCase(), propriedade: $('propriedade').value },
  });
  $('status').textContent = 'Salvo.';
});
```

- [ ] **Step 10: Rodar todos os testes e o build**

Run: `npm test`
Expected: PASS em todos os arquivos (campos, normalizar, entrada, extrator, preenchedor, formulario).

Run: `npm run build`
Expected: três bundles gerados sem erro; `extensao/sidepanel/main.bundle.js` contém o SDK (arquivo com algumas centenas de KB).

- [ ] **Step 11: Commit**

```bash
git add src tests extensao/sidepanel/index.html extensao/sidepanel/style.css extensao/options/options.html
git commit -m "feat: painel lateral com conferência, preenchimento e configurações"
```

---

### Task 7: Verificação manual no Chrome (com o operador)

**Files:** nenhum código novo, a menos que um defeito seja encontrado (nesse caso: teste que reproduz → correção → commit).

- [ ] **Step 1: Carregar a extensão**

`chrome://extensions` → ativar "Modo do desenvolvedor" → "Carregar sem compactação" → escolher `cadastro_motorista/extensao`. Esperado: extensão aparece sem erros.

- [ ] **Step 2: Configurar a chave**

Ícone da extensão → "Configurações" → colar a chave da API (console.anthropic.com → API Keys) → Salvar. Esperado: "Salvo."

- [ ] **Step 3: Extrair com o exemplo real**

Extrair `pasta.rar` numa pasta local (fora do git), abrir o painel, arrastar os 3 arquivos (CNH-e.pdf, CRLV.pdf, foto) → "Ler documentos". Esperado: tela de conferência em até ~1 min; CPF, nome, filiação, CNH preenchidos; Celular/Estado Civil em amarelo; aviso "Documentos lidos: …". Testar também arrastar o `pasta.rar` sozinho → mensagem de formato não suportado.

- [ ] **Step 4: Preencher no Sitra real (sem cadastrar)**

Operador abre o Sitra → Cadastro de Motoristas (vazio) na aba ativa → completa Estado Civil/Celular na conferência → "Preencher no Sitra". Esperado: campos das abas Dados Gerais e Documentação preenchidos; relatório com ✅; nenhum botão do Sitra clicado. **O operador decide se clica em "Cadastrar".** Se o motorista já existir, esperado: "Este motorista já está cadastrado".

- [ ] **Step 5: Registrar o resultado**

Anotar no fim da spec (seção 9) o que funcionou e o que não funcionou; commitar.

```bash
git add docs/superpowers/specs/2026-09-24-extensao-cadastro-motorista-design.md
git commit -m "docs: resultado do teste manual no Sitra"
```
