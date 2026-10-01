import { lerEntrada, prepararDocumentos, temConteudo } from '../lib/entrada.js';
import { redimensionarImagem } from '../lib/imagem.js';
import { chamarGemini, chamarGeminiConferencia, posProcessar } from '../lib/extrator.js';
import { chamarGeminiCte, posProcessarCte } from '../lib/extrator-cte.js';
import { textoDoPdf } from '../lib/pdf.js';
import { camposDivergentes } from '../lib/conferencia.js';
import { lerConfig, salvarConfig } from '../lib/config.js';
import { montarFormulario, lerFormulario, mostrarAba, abaAtiva, quantidadeVeiculos, rotuloDaAba } from './formulario.js';
import { montarFormularioCte, lerFormularioCte } from './formulario-cte.js';
import { versaoMaior, linkAtualizacaoValido } from '../lib/versao.js';
import { TELAS, CAMPO_POR_CHAVE, ehSitra, valoresDaTela } from '../lib/campos.js';

// Documento que identifica o cadastro em cada tela do Sitra.
const DOCUMENTO = { motorista: 'cpf', proprietario: 'prop_cpf_cnpj', veiculo: 'veic_placa' };

const $ = (id) => document.getElementById(id);
let arquivos = [];
let confirmarSobrescrita = false;
let modo = 'cadastro';

function mostrar(etapa) {
  for (const s of document.querySelectorAll('section[data-etapa]')) s.hidden = s.dataset.etapa !== etapa;
}

function mensagem(texto, tipo = 'erro') {
  $('mensagem').textContent = texto;
  $('mensagem').className = tipo;
  $('mensagem').hidden = !texto;
  // Com o painel rolado para baixo, a mensagem (no topo) ficaria fora de vista.
  if (texto) $('mensagem').scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
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
    const docs = await prepararDocumentos(entrada.itens, { redimensionar: redimensionarImagem, lerTextoPdf: textoDoPdf });
    docs.mensagens = $('mensagens').value;
    const avisosEntrada = [
      ...entrada.naoSuportados.map(n => `${n}: formato não suportado — solte os arquivos direto ou use .zip`),
      ...docs.avisos,
    ];
    if (!temConteudo(docs, docs.mensagens)) {
      throw new Error(['Nenhuma foto/PDF encontrada e nenhuma mensagem colada.', ...avisosEntrada].join(' '));
    }
    if (modo === 'cte') {
      const r = posProcessarCte(await chamarGeminiCte(cfg.apiKey, docs));
      $('form-conferencia').innerHTML = montarFormularioCte(r.valores);
      const docsLidos = r.documentos.length ? [`Documentos lidos: ${r.documentos.join(', ')}`] : [];
      preencherLista($('avisos'), [...docsLidos, ...avisosEntrada, ...r.avisos]);
      confirmarSobrescrita = false;
      mostrar('conferencia');
      return;
    }
    // Telefone/e-mail só são aceitos se estiverem escritos nas mensagens/conversas enviadas.
    const textoConfiavel = [docs.mensagens ?? '', ...docs.textos.map(t => t.conteudo)].join('\n');
    // Duas leituras em paralelo: a completa e a conferência dos números da CNH (modelo mais forte).
    const [bruto, segunda] = await Promise.all([
      chamarGemini(cfg.apiKey, docs),
      chamarGeminiConferencia(cfg.apiKey, docs).catch(e => ({ erro: e.message })),
    ]);
    if (segunda.erro) avisosEntrada.push(`Segunda leitura indisponível (${segunda.erro}) — confira com atenção os números da CNH.`);
    const textoPdf = docs.pdfs.map(p => p.texto).join('\n');
    const segundaLeitura = segunda.erro ? null : segunda;
    // Discordaram em algum número da CNH? Uma terceira leitura desempata (2 de 3).
    const terceiraLeitura = camposDivergentes(bruto?.campos, segundaLeitura).length
      ? await chamarGeminiConferencia(cfg.apiKey, docs).catch(() => null)
      : null;
    const r = posProcessar(bruto, cfg.padroes, { textoConfiavel, textoPdf, segundaLeitura, terceiraLeitura });
    $('form-conferencia').innerHTML = montarFormulario(r.valores, r.veiculos);
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

function mostrarRelatorio(rel, rotuloTela = TELAS[rel.tela]?.rotulo) {
  const sucessoCte = rel.ok && rel.tela === 'cte';
  $('resultado-titulo').textContent = sucessoCte
    ? 'Pronto! Confira a Digitação de CT-e, informe o responsável pelo frete combinado e só então decida se deve cadastrar.'
    : rel.ok
    ? `Pronto! Confira a tela de ${rotuloTela} no Sitra e clique em "Cadastrar".`
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
  if (modo === 'cte') {
    let est;
    try { est = await executarNoSitra(() => window.__cteManual.estado()); } catch { est = { tela: null }; }
    if (!est?.tela) { mensagem('Abra no Sitra a tela Digitação de CT-e e escolha o Tipo de Frete.'); return; }
    const { valores, invalidos, faltando } = lerFormularioCte($('form-conferencia'));
    if (invalidos.length) { mensagem(`Formato inválido: ${invalidos.join(', ')}`); return; }
    if (faltando.length) { mensagem(`Preencha antes de continuar: ${faltando.join(', ')}`); return; }
    $('btn-preencher').disabled = true;
    $('btn-preencher').textContent = 'Preenchendo…';
    try {
      mostrarRelatorio(await executarNoSitra(v => window.__cteManual.preencher(v), [valores]));
    } catch (e) {
      mensagem(`Falha ao preencher: ${e.message}`);
    } finally {
      $('btn-preencher').disabled = false;
      $('btn-preencher').textContent = 'Preencher CT-e';
    }
    return;
  }
  let est;
  try {
    est = await executarNoSitra(() => window.__cadastroMotorista.estado());
  } catch {
    est = { tela: null };
  }
  if (!est?.tela) { mensagem('Abra no Sitra a tela de Cadastro de Motorista, de Proprietário ou de Veículo nesta aba.'); return; }

  const form = $('form-conferencia');
  // Tela de Veículo: preenche o veículo da aba aberta no painel (cavalo e carreta são cadastros separados).
  let aba = est.tela;
  if (est.tela === 'veiculo') {
    const ativa = abaAtiva(form);
    if (ativa?.startsWith('veiculo:')) aba = ativa;
    else if (quantidadeVeiculos(form) > 1) {
      mostrarAba(form, 'veiculo:0');
      mensagem('Há mais de um veículo. Abra no painel a aba do veículo que vai cadastrar e clique em "Preencher no Sitra" de novo.', 'alerta');
      return;
    }
    else aba = 'veiculo:0';
  }
  mostrarAba(form, aba);
  const { valores, invalidos, faltando } = lerFormulario(form, aba);
  const rotuloTela = est.tela === 'veiculo' ? rotuloDaAba(form, aba) : TELAS[est.tela].rotulo;
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
    mostrarRelatorio(await executarNoSitra((v) => window.__cadastroMotorista.preencher(v), [valoresDaTela(valores, est.tela)]), rotuloTela);
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
  $('btn-ler').textContent = modo === 'cte' ? 'Ler nota' : 'Ler documentos';
  mostrar('entrada');
}

function aplicarModo(novoModo) {
  modo = novoModo === 'cte' ? 'cte' : 'cadastro';
  for (const botao of document.querySelectorAll('[data-modo]')) {
    const ativo = botao.dataset.modo === modo;
    botao.classList.toggle('ativo', ativo);
    botao.setAttribute('aria-selected', String(ativo));
  }
  const cte = modo === 'cte';
  $('titulo-painel').textContent = cte ? 'CT-e manual' : 'Cadastro de Motorista';
  $('subtitulo-painel').textContent = cte ? 'Leitura da nota e preenchimento assistido no Sitra' : 'Leitura de documentos e preenchimento do Sitra';
  $('titulo-upload').textContent = cte ? 'Solte aqui a nota do CT-e' : 'Solte aqui os documentos do motorista';
  $('texto-upload').textContent = cte ? 'foto ou PDF — ou clique para escolher' : 'fotos, PDFs ou o .zip da conversa — ou clique para escolher';
  $('bloco-mensagens').hidden = cte;
  $('instrucao-preenchimento').textContent = cte
    ? 'No Sitra, abra Digitação de CT-e e escolha o Tipo de Frete antes de preencher.'
    : 'Ordem no Sitra: Proprietário → Veículo (um cadastro por placa: cavalo e carreta) → Motorista. Abra a tela e clique em "Preencher".';
  $('btn-preencher').textContent = cte ? 'Preencher CT-e' : 'Preencher no Sitra';
  $('btn-novo').textContent = cte ? 'Próximo CT-e' : 'Próximo motorista';
  recomecar();
}

$('zona').addEventListener('dragover', (e) => { e.preventDefault(); $('zona').classList.add('ativa'); });
$('zona').addEventListener('dragleave', () => $('zona').classList.remove('ativa'));
$('zona').addEventListener('drop', (e) => { e.preventDefault(); $('zona').classList.remove('ativa'); adicionar([...e.dataTransfer.files]); });
$('seletor').addEventListener('change', (e) => { adicionar([...e.target.files]); e.target.value = ''; });
// Área de arquivos acessível pelo teclado (Enter/Espaço abre o seletor).
$('zona').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('seletor').click(); }
});
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
for (const botao of document.querySelectorAll('[data-modo]')) botao.addEventListener('click', () => aplicarModo(botao.dataset.modo));

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
  $('cfg-emailProprietario').value = cfg.padroes.emailProprietario;
  $('cfg-telefoneProprietario').value = cfg.padroes.telefoneProprietario;
  $('config').hidden = false;
  mensagem(aviso, 'alerta');
  $('cfg-apiKey').focus();
}

async function salvarConfigPainel() {
  const apiKey = $('cfg-apiKey').value.trim();
  if (!apiKey) { mensagem('Cole a chave da API do Gemini.'); return; }
  await salvarConfig({
    apiKey,
    padroes: {
      nacionalidade: $('cfg-nacionalidade').value.trim().toUpperCase(),
      propriedade: $('cfg-propriedade').value,
      emailProprietario: $('cfg-emailProprietario').value.trim().toLowerCase(),
      telefoneProprietario: $('cfg-telefoneProprietario').value.trim(),
    },
  });
  $('config').hidden = true;
  mensagem('Configurações salvas.', 'alerta');
}

// Primeira vez (sem chave salva): já abre as configurações.
lerConfig().then(cfg => { if (!cfg.apiKey) abrirConfig('Primeiro uso: cole a chave da API do Gemini e clique em Salvar.'); }).catch(() => {});
