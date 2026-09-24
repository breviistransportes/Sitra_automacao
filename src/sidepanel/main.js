import { lerEntrada, prepararDocumentos, temConteudo } from '../lib/entrada.js';
import { redimensionarImagem } from '../lib/imagem.js';
import { chamarGemini, posProcessar } from '../lib/extrator.js';
import { lerConfig, salvarConfig } from '../lib/config.js';
import { montarFormulario, lerFormulario, mostrarAba } from './formulario.js';
import { versaoMaior, linkAtualizacaoValido } from '../lib/versao.js';
import { TELAS, CAMPO_POR_CHAVE, ehSitra, valoresDaTela } from '../lib/campos.js';

// Documento que identifica o cadastro em cada tela do Sitra.
const DOCUMENTO = { motorista: 'cpf', proprietario: 'prop_cpf_cnpj', veiculo: 'veic_placa' };

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
  atualizarBotaoLer();
}

function atualizarBotaoLer() {
  $('btn-ler').disabled = arquivos.length === 0 && !$('mensagens').value.trim();
}

function adicionar(lista) {
  arquivos.push(...lista);
  listarArquivos();
  mensagem('');
}

async function lerDocumentos() {
  mensagem('');
  const cfg = await lerConfig();
  if (!cfg.apiKey) {
    await abrirConfig('Cole a chave da API do Gemini e clique em Salvar.');
    return;
  }
  mostrar('lendo');
  try {
    const entrada = await lerEntrada(arquivos);
    const docs = await prepararDocumentos(entrada.itens, { redimensionar: redimensionarImagem });
    docs.mensagens = $('mensagens').value;
    const avisosEntrada = [
      ...entrada.naoSuportados.map(n => `${n}: formato não suportado — solte os arquivos direto ou use .zip`),
      ...docs.avisos,
    ];
    if (!temConteudo(docs, docs.mensagens)) {
      throw new Error(['Nenhuma foto/PDF encontrada e nenhuma mensagem colada.', ...avisosEntrada].join(' '));
    }
    // Telefone/e-mail só são aceitos se estiverem escritos nas mensagens/conversas enviadas.
    const textoConfiavel = [docs.mensagens ?? '', ...docs.textos.map(t => t.conteudo)].join('\n');
    const r = posProcessar(await chamarGemini(cfg.apiKey, docs), cfg.padroes, { textoConfiavel });
    $('form-conferencia').innerHTML = montarFormulario(r.valores);
    const docsLidos = r.documentos.length ? [`Documentos lidos: ${r.documentos.join(', ')}`] : [];
    preencherLista($('avisos'), [...docsLidos, ...avisosEntrada, ...r.avisos]);
    confirmarSobrescrita = false;
    mostrar('conferencia');
  } catch (e) {
    mostrar('entrada');
    mensagem(e.message);
    $('btn-ler').textContent = 'Tentar de novo';
  }
}

async function executarNoSitra(func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // Só injeta no Sitra da empresa (host_permissions já restringe; conferimos a URL antes).
  if (!ehSitra(tab?.url)) throw new Error('A aba ativa não é o Sitra da empresa.');
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', files: ['content/injetado.bundle.js'] });
  const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func, args });
  return r.result;
}

const STATUS = { ok: '✅', sitra: '🔵 veio do Sitra (CEP) —', falhou: '⚠️ não gravou —', vazio: '⚠️ obrigatório vazio —' };

function mostrarRelatorio(rel) {
  $('resultado-titulo').textContent = rel.ok
    ? `Pronto! Confira a tela de ${TELAS[rel.tela].rotulo} no Sitra e clique em "Cadastrar".`
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
  let est;
  try {
    est = await executarNoSitra(() => window.__cadastroMotorista.estado());
  } catch {
    est = { tela: null };
  }
  if (!est?.tela) { mensagem('Abra no Sitra a tela de Cadastro de Motorista, de Proprietário ou de Veículo nesta aba.'); return; }

  const form = $('form-conferencia');
  mostrarAba(form, est.tela);
  const { valores, invalidos, faltando } = lerFormulario(form, est.tela);
  const rotuloTela = TELAS[est.tela].rotulo;
  if (invalidos.length) { mensagem(`Formato inválido (${rotuloTela}): ${invalidos.join(', ')}`); return; }
  const doc = DOCUMENTO[est.tela];
  if (!valores[doc]) { mensagem(`${CAMPO_POR_CHAVE[doc].rotulo} é obrigatório para preencher a tela de ${rotuloTela}.`); return; }
  if (!est.vazio && !confirmarSobrescrita) {
    confirmarSobrescrita = true;
    mensagem('O formulário do Sitra já tem dados. Clique em "Preencher no Sitra" de novo para sobrescrever, ou clique em "Limpar" no Sitra antes.', 'alerta');
    return;
  }
  confirmarSobrescrita = false;
  if (faltando.length) mensagem(`Vai ficar faltando (${rotuloTela}): ${faltando.join(', ')}`, 'alerta');

  $('btn-preencher').disabled = true;
  $('btn-preencher').textContent = 'Preenchendo…';
  try {
    mostrarRelatorio(await executarNoSitra((v) => window.__cadastroMotorista.preencher(v), [valoresDaTela(valores, est.tela)]));
  } catch (e) {
    mensagem(`Falha ao preencher: ${e.message}`);
  } finally {
    $('btn-preencher').disabled = false;
    $('btn-preencher').textContent = 'Preencher no Sitra';
  }
}

function recomecar() {
  arquivos = [];
  $('mensagens').value = '';
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
$('mensagens').addEventListener('input', atualizarBotaoLer);
$('btn-preencher').addEventListener('click', (e) => { e.preventDefault(); preencherSitra(); });
$('btn-recomecar').addEventListener('click', recomecar);
$('btn-novo').addEventListener('click', recomecar);
$('btn-voltar').addEventListener('click', () => { mensagem(''); mostrar('conferencia'); });
$('link-config').addEventListener('click', (e) => { e.preventDefault(); abrirConfig(); });
$('cfg-salvar').addEventListener('click', salvarConfigPainel);
$('cfg-fechar').addEventListener('click', () => { $('config').hidden = true; mensagem(''); });
$('form-conferencia').addEventListener('input', (e) => e.target.closest('label')?.classList.remove('conferir'));
$('form-conferencia').addEventListener('submit', (e) => e.preventDefault());
$('form-conferencia').addEventListener('click', (e) => {
  const aba = e.target.closest('.aba');
  if (aba) mostrarAba($('form-conferencia'), aba.dataset.tela);
});

// Aviso de versão nova publicada no GitHub (Releases). Sem internet ou sem release: não mostra nada.
async function verificarAtualizacao() {
  try {
    const r = await fetch('https://api.github.com/repos/breviistransportes/Sitra_automacao/releases/latest');
    if (!r.ok) return;
    const { tag_name: tag, html_url: url } = await r.json();
    if (!linkAtualizacaoValido(tag, url) || !versaoMaior(tag, chrome.runtime.getManifest().version)) return;
    $('link-atualizacao').href = url;
    $('link-atualizacao').textContent = `Nova versão ${tag} disponível — baixar`;
    $('atualizacao').hidden = false;
  } catch {
    // silencioso: o aviso é só uma conveniência
  }
}
verificarAtualizacao();

// Configurações dentro do próprio painel (não depende da página de opções do Chrome).
async function abrirConfig(aviso = '') {
  const cfg = await lerConfig();
  $('cfg-apiKey').value = cfg.apiKey;
  $('cfg-nacionalidade').value = cfg.padroes.nacionalidade;
  $('cfg-propriedade').value = cfg.padroes.propriedade;
  $('config').hidden = false;
  mensagem(aviso, 'alerta');
  $('cfg-apiKey').focus();
}

async function salvarConfigPainel() {
  const apiKey = $('cfg-apiKey').value.trim();
  if (!apiKey) { mensagem('Cole a chave da API do Gemini.'); return; }
  await salvarConfig({
    apiKey,
    padroes: { nacionalidade: $('cfg-nacionalidade').value.trim().toUpperCase(), propriedade: $('cfg-propriedade').value },
  });
  $('config').hidden = true;
  mensagem('Configurações salvas.', 'alerta');
}

// Primeira vez (sem chave salva): já abre as configurações.
lerConfig().then(cfg => { if (!cfg.apiKey) abrirConfig('Primeiro uso: cole a chave da API do Gemini e clique em Salvar.'); }).catch(() => {});
