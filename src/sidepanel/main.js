import { lerEntrada, prepararDocumentos } from '../lib/entrada.js';
import { redimensionarImagem } from '../lib/imagem.js';
import { chamarGemini, posProcessar } from '../lib/extrator.js';
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

async function lerDocumentos() {
  mensagem('');
  const cfg = await lerConfig();
  if (!cfg.apiKey) {
    mensagem('Configure a chave da API do Gemini primeiro.');
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
    if (docs.imagens.length + docs.pdfs.length === 0) {
      throw new Error(['Nenhuma foto/PDF encontrada.', ...avisosEntrada].join(' '));
    }
    const r = posProcessar(await chamarGemini(cfg.apiKey, docs), cfg.padroes);
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
