import { lerEntrada, prepararDocumentos, temConteudo } from '../lib/entrada.js';
import { redimensionarImagem } from '../lib/imagem.js';
import { chamarGemini, chamarGeminiConferencia, posProcessar } from '../lib/extrator.js';
import { chamarGeminiCte, posProcessarCte } from '../lib/extrator-cte.js';
import { textoDoPdf } from '../lib/pdf.js';
import { camposDivergentes } from '../lib/conferencia.js';
import { lerConfig, salvarConfig } from '../lib/config.js';
import { montarFormulario, lerFormulario, mostrarAba, abaAtiva, quantidadeVeiculos, rotuloDaAba, dadosDoFormulario } from './formulario.js';
import { entrar, sair, renovarSeVencendo, viagensProgramadas, lerSessao, salvarSessao } from '../lib/crm.js';
import { cruzarComViagens } from '../lib/cruzamento.js';
import { lerHistorico, salvarNoHistorico, excluirDoHistorico, apagarHistorico, resumoDoRegistro } from '../lib/historico.js';
import { montarFormularioCte, lerFormularioCte } from './formulario-cte.js';
import { versaoMaior, linkAtualizacaoValido, textoAtualizacao } from '../lib/versao.js';
import { TELAS, CAMPO_POR_CHAVE, ehSitra, valoresDaTela } from '../lib/campos.js';
import { buscarTrajeto } from '../lib/rota-maps.js';
import { pracasNaRota, ehSemParar } from '../lib/pedagios.js';
import { montarCiot, ehWebrouter, salvarUltimoCte, lerUltimoCte, viagensDoCadastro } from '../lib/ciot.js';
import { COLUNAS_CIOT } from '../lib/crm.js';
import { opcoesMotoristaCte } from '../lib/motorista-cte.js';
import { chamarGeminiAntt, posProcessarAntt } from '../lib/extrator-antt.js';
import { CHAVE_LEITURA_CRM, leituraCrmValida } from '../lib/leitura-crm.js';

// Documento que identifica o cadastro em cada tela do Sitra.
const DOCUMENTO = { motorista: 'cpf', proprietario: 'prop_cpf_cnpj', veiculo: 'veic_placa' };

const $ = (id) => document.getElementById(id);
let arquivos = [];
let confirmarSobrescrita = false;
let modo = 'cadastro';
// Cadastro do histórico que está aberto na conferência (atualizado a cada "Preencher no Sitra").
let registroAtual = null;

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
      // O CIOT tira destinatário, carga e trajeto da última nota lida.
      await salvarUltimoCte(lerFormularioCte($('form-conferencia')).valores).catch(() => {});
      confirmarSobrescrita = false;
      mostrar('conferencia');
      mostrarMotoristaCte();
      return;
    }
    // Telefone/e-mail só são aceitos se estiverem escritos nas mensagens/conversas enviadas.
    const textoConfiavel = [docs.mensagens ?? '', ...docs.textos.map(t => t.conteudo)].join('\n');
    // Duas leituras em paralelo: a completa e a conferência dos números da CNH.
    const [bruto, segunda] = await Promise.all([
      chamarGemini(cfg.apiKey, docs),
      chamarGeminiConferencia(cfg.apiKey, docs).catch(e => ({ erro: e.message })),
    ]);
    if (segunda?.erro) avisosEntrada.push(`Segunda leitura indisponível (${segunda.erro}) — confira com atenção os números da CNH.`);
    const textoPdf = docs.pdfs.map(p => p.texto).join('\n');
    const segundaLeitura = segunda?.erro ? null : segunda;
    // Discordaram em algum número da CNH? Uma terceira leitura desempata (2 de 3).
    const terceiraLeitura = camposDivergentes(bruto?.campos, segundaLeitura).length
      ? await chamarGeminiConferencia(cfg.apiKey, docs).catch(() => null)
      : null;
    await exibirCadastro(bruto, cfg, { textoConfiavel, textoPdf, segundaLeitura, terceiraLeitura }, avisosEntrada);
  } catch (e) {
    mostrar('entrada');
    mensagem(e.message);
    $('btn-ler').textContent = 'Tentar de novo';
  }
}

// Leitura bruta (Gemini ou CRM) → tela de conferência do cadastro + histórico.
async function exibirCadastro(bruto, cfg, contexto, avisosEntrada = []) {
  const r = posProcessar(bruto, cfg.padroes, contexto);
  $('form-conferencia').innerHTML = montarFormulario(r.valores, r.veiculos);
  const docsLidos = r.documentos.length ? [`Documentos lidos: ${r.documentos.join(', ')}`] : [];
  const avisos = [...docsLidos, ...avisosEntrada, ...r.avisos];
  preencherLista($('avisos'), avisos);
  registroAtual = null;
  await guardarNoHistorico({ valores: r.valores, veiculos: r.veiculos, avisos });
  mostrarCruzamento();
  confirmarSobrescrita = false;
  mostrar('conferencia');
}

// "Usar na extensão" da aba Leitura de documentos do CRM: o background guarda a leitura na sessão.
async function importarLeituraDoCrm() {
  const { [CHAVE_LEITURA_CRM]: pendente } = await chrome.storage.session.get(CHAVE_LEITURA_CRM);
  if (!pendente) return;
  await chrome.storage.session.remove(CHAVE_LEITURA_CRM);
  if (!leituraCrmValida(pendente.leitura)) { mensagem('A leitura recebida do CRM veio num formato inesperado.'); return; }
  aplicarModo('cadastro');
  const cfg = await lerConfig();
  await exibirCadastro(pendente.leitura, cfg, { textoConfiavel: pendente.mensagens ?? '' }, ['Leitura feita no CRM (Leitura de documentos).']);
  mensagem('Leitura do CRM carregada: confira os campos antes de preencher.', 'alerta');
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
const STATUS_CIOT = { ...STATUS, vazio: '⚠️ preencha no Webrouter —' };

function mostrarRelatorio(rel, rotuloTela = TELAS[rel.tela]?.rotulo) {
  const sucessoCte = rel.ok && rel.tela === 'cte';
  const icones = rel.tela === 'ciot' ? STATUS_CIOT : STATUS;
  $('resultado-titulo').textContent = rel.ok && rel.tela === 'ciot'
    ? 'Pronto! No Webrouter, informe o valor do frete e a forma de pagamento, confira as 4 etapas e só então clique em "Emitir".'
    : sucessoCte
    ? 'Pronto! Confira a Digitação de CT-e, informe o responsável pelo frete combinado e só então decida se deve cadastrar.'
    : rel.ok
    ? `Pronto! Confira a tela de ${rotuloTela} no Sitra e clique em "Cadastrar".`
    : `Parou: ${rel.erro}`;
  const linhas = [
    ...rel.avisos,
    ...rel.campos.map(c => `${icones[c.status]} ${c.rotulo}${c.status === 'falhou' ? ` (esperado "${c.esperado}", ficou "${c.obtido}")` : ''}${c.motivo ? ` (${c.motivo})` : ''}`),
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
    await salvarUltimoCte(valores).catch(() => {});
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

  // O que está na tela agora (com as correções do operador) vai para o histórico.
  await guardarNoHistorico(dadosDoFormulario(form));
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
  $('cruzamento').hidden = true;
  registroAtual = null;
  atualizarBotaoHistorico();
  $('mensagens').value = '';
  listarArquivos();
  mensagem('');
  $('btn-ler').textContent = modo === 'cte' ? 'Ler nota' : 'Ler documentos';
  $('resultado-pedagios').hidden = true;
  mostrar(modo === 'pedagios' ? 'pedagios' : modo === 'ciot' ? 'ciot' : 'entrada');
  if (modo === 'ciot') {
    $('ciot-data-fim').value = '';
    carregarCiot();
  }
}

function aplicarModo(novoModo) {
  modo = ['cte', 'pedagios', 'ciot'].includes(novoModo) ? novoModo : 'cadastro';
  for (const botao of document.querySelectorAll('[data-modo]')) {
    const ativo = botao.dataset.modo === modo;
    botao.classList.toggle('ativo', ativo);
    botao.setAttribute('aria-selected', String(ativo));
  }
  const cte = modo === 'cte';
  const pedagios = modo === 'pedagios';
  const ciot = modo === 'ciot';
  $('titulo-painel').textContent = ciot ? 'CIOT' : pedagios ? 'Pedágios' : cte ? 'CT-e manual' : 'Cadastro de Motorista';
  $('subtitulo-painel').textContent = ciot
    ? 'Cadastro + nota do CT-e → Emissor de CIOT do Webrouter'
    : pedagios
    ? 'Rota do motorista (Google Maps) → praças marcadas no Sem Parar'
    : cte ? 'Leitura da nota e preenchimento assistido no Sitra' : 'Leitura de documentos e preenchimento do Sitra';
  $('titulo-upload').textContent = cte ? 'Solte aqui a nota do CT-e' : 'Solte aqui os documentos do motorista';
  $('texto-upload').textContent = cte ? 'foto ou PDF — ou clique para escolher' : 'fotos, PDFs ou o .zip da conversa — ou clique para escolher';
  $('bloco-mensagens').hidden = cte;
  $('instrucao-preenchimento').textContent = cte
    ? 'No Sitra, abra Digitação de CT-e e escolha o Tipo de Frete antes de preencher.'
    : 'Ordem no Sitra: Proprietário → Veículo (um cadastro por placa: cavalo e carreta) → Motorista. Abra a tela e clique em "Preencher".';
  $('btn-preencher').textContent = cte ? 'Preencher CT-e' : 'Preencher no Sitra';
  $('btn-novo').textContent = ciot ? 'Próximo CIOT' : cte ? 'Próximo CT-e' : 'Próximo motorista';
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
$('btn-historico').addEventListener('click', abrirHistorico);
$('crm-entrar').addEventListener('click', entrarNoCrm);
$('crm-sair').addEventListener('click', sairDoCrm);
$('btn-historico-voltar').addEventListener('click', recomecar);
$('btn-historico-apagar').addEventListener('click', apagarTudo);
$('mensagens').addEventListener('input', atualizarBotaoLer);
$('btn-preencher').addEventListener('click', (e) => { e.preventDefault(); preencherSitra(); });
$('btn-recomecar').addEventListener('click', recomecar);
$('btn-novo').addEventListener('click', recomecar);
$('btn-voltar').addEventListener('click', () => { mensagem(''); mostrar(modo === 'ciot' ? 'ciot' : 'conferencia'); });
$('link-config').addEventListener('click', (e) => { e.preventDefault(); abrirConfig(); });
$('link-config-pedagios').addEventListener('click', (e) => { e.preventDefault(); abrirConfig(); });
$('btn-pedagios').addEventListener('click', marcarPedagios);
$('link-maps').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); marcarPedagios(); } });
$('cfg-salvar').addEventListener('click', salvarConfigPainel);
$('cfg-fechar').addEventListener('click', () => { $('config').hidden = true; mensagem(''); });
$('form-conferencia').addEventListener('input', (e) => e.target.closest('label')?.classList.remove('conferir'));
$('form-conferencia').addEventListener('submit', (e) => e.preventDefault());
$('form-conferencia').addEventListener('click', (e) => {
  const aba = e.target.closest('.aba');
  if (aba) mostrarAba($('form-conferencia'), aba.dataset.tela);
});
for (const botao of document.querySelectorAll('[data-modo]')) botao.addEventListener('click', () => aplicarModo(botao.dataset.modo));
for (const botao of document.querySelectorAll('[data-ciot-tipo], [data-ciot-contratante]')) botao.addEventListener('click', () => escolherCiot(botao));
$('btn-ciot').addEventListener('click', preencherCiot);
$('ciot-cadastro').addEventListener('change', () => { mostrarContratadoCiot(); escolherViagemDoCadastro(); });
$('ciot-viagem').addEventListener('change', mostrarViagemCiot);
$('ciot-antt-arquivo').addEventListener('change', (e) => { const [a] = e.target.files; e.target.value = ''; if (a) lerCartaoAntt(a); });

// Histórico: falhar ao guardar não pode atrapalhar a leitura nem o preenchimento.
async function guardarNoHistorico(dados) {
  try {
    registroAtual = (await salvarNoHistorico({ id: registroAtual ?? undefined, ...dados })).id;
  } catch {
    // sem histórico desta vez
  }
}

async function atualizarBotaoHistorico() {
  const n = modo === 'cadastro' ? (await lerHistorico().catch(() => [])).length : 0;
  $('btn-historico').textContent = `Histórico (${n})`;
  $('btn-historico').hidden = n === 0;
}

async function abrirHistorico() {
  mensagem('');
  const lista = await lerHistorico().catch(() => []);
  const ul = $('lista-historico');
  ul.innerHTML = '';
  for (const r of lista) {
    const { nome, cpf, placas, quando } = resumoDoRegistro(r);
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'registro';
    const titulo = document.createElement('strong');
    titulo.textContent = nome;
    const detalhe = document.createElement('small');
    detalhe.textContent = [quando, cpf && `CPF ${cpf}`, placas.join(', ')].filter(Boolean).join(' · ');
    info.append(titulo, detalhe);
    const abrir = document.createElement('button');
    abrir.textContent = 'Abrir';
    abrir.onclick = () => abrirRegistro(r);
    const excluir = document.createElement('button');
    excluir.textContent = 'Excluir';
    excluir.className = 'secundario';
    excluir.onclick = async () => { await excluirDoHistorico(r.id).catch(() => {}); abrirHistorico(); };
    li.append(info, abrir, excluir);
    ul.append(li);
  }
  $('historico-vazio').hidden = lista.length > 0;
  $('btn-historico-apagar').hidden = lista.length === 0;
  $('btn-historico-apagar').classList.remove('confirmar');
  $('btn-historico-apagar').textContent = 'Apagar tudo';
  mostrar('historico');
}

function abrirRegistro(r) {
  $('form-conferencia').innerHTML = montarFormulario(r.valores ?? {}, r.veiculos ?? []);
  preencherLista($('avisos'), r.avisos ?? []);
  registroAtual = r.id;
  confirmarSobrescrita = false;
  mensagem('');
  mostrar('conferencia');
  mostrarCruzamento();
}

// Sem confirm() do navegador: o primeiro clique só pede confirmação, o segundo apaga.
async function apagarTudo() {
  const b = $('btn-historico-apagar');
  if (!b.classList.contains('confirmar')) {
    b.classList.add('confirmar');
    b.textContent = 'Clique de novo para apagar tudo';
    return;
  }
  await apagarHistorico().catch(() => {});
  abrirHistorico();
}

// CRM: login do operador nas Configurações; a sessão (não a senha) fica no Chrome.
async function atualizarCrmConfig() {
  const sessao = await lerSessao().catch(() => null);
  $('crm-status').textContent = sessao ? `Conectado como ${sessao.email}.` : 'Não conectado: entre para comparar os documentos com as viagens programadas.';
  $('crm-login').hidden = !!sessao;
  $('crm-sair').hidden = !sessao;
}

async function entrarNoCrm() {
  const email = $('crm-email').value.trim();
  const senha = $('crm-senha').value;
  if (!email || !senha) { mensagem('Informe o e-mail e a senha do CRM.'); return; }
  $('crm-entrar').disabled = true;
  try {
    await salvarSessao(await entrar(email, senha));
    mensagem('Conectado ao CRM.', 'alerta');
  } catch (e) {
    mensagem(e.message);
  } finally {
    $('crm-senha').value = '';
    $('crm-entrar').disabled = false;
    atualizarCrmConfig();
  }
}

async function sairDoCrm() {
  const sessao = await lerSessao().catch(() => null);
  if (sessao) await sair(sessao);
  await salvarSessao(null).catch(() => {});
  atualizarCrmConfig();
}

// Sessão pronta para usar (renovada se estiver vencendo). Recusada pelo CRM: apaga e pede login de novo.
async function sessaoDoCrm() {
  const sessao = await lerSessao().catch(() => null);
  if (!sessao) return null;
  try {
    const nova = await renovarSeVencendo(sessao);
    if (nova !== sessao) await salvarSessao(nova);
    return nova;
  } catch (e) {
    if (e.sair) await salvarSessao(null).catch(() => {});
    throw e;
  }
}

const SIMBOLO = { ok: '✅', diferente: '⚠️', so_crm: '⚠️', so_documento: '⚠️', sem_dado: '—', sem_crm: '—' };
function textoDoItem(i) {
  if (i.status === 'ok') return `${SIMBOLO.ok} ${i.rotulo}${i.rotulo.startsWith('Placa') ? '' : `: ${i.crm}`}`;
  if (i.status === 'diferente') return `${SIMBOLO.diferente} ${i.rotulo}: CRM "${i.crm}" · documento "${i.documento}"`;
  if (i.status === 'so_crm') return `${SIMBOLO.so_crm} ${i.rotulo}: está na viagem, mas não nos documentos`;
  if (i.status === 'so_documento') return `${SIMBOLO.so_documento} ${i.rotulo}: está nos documentos, mas não na viagem`;
  if (i.status === 'sem_crm') return `${SIMBOLO.sem_crm} ${i.rotulo}: não informado na viagem do CRM · documento "${i.documento}"`;
  return `${SIMBOLO.sem_dado} ${i.rotulo}: CRM "${i.crm}" · não lido nos documentos`;
}

// Quadro "viagem programada": compara o que está no painel com o CRM. Só mostra — não preenche nada.
async function mostrarCruzamento() {
  const caixa = $('cruzamento');
  const el = (tag, texto, classe) => { const e = document.createElement(tag); if (texto) e.textContent = texto; if (classe) e.className = classe; return e; };
  const topo = el('div', '', 'cruzamento-topo');
  topo.append(el('strong', 'CRM — viagens programadas'));
  const nota = (texto) => { caixa.replaceChildren(topo, el('p', texto, 'nota')); caixa.hidden = false; };
  if (modo !== 'cadastro') { caixa.hidden = true; return; }
  let sessao;
  try {
    sessao = await sessaoDoCrm();
  } catch (e) {
    nota(e.message);
    return;
  }
  if (!sessao) { nota('Entre no CRM nas Configurações para comparar com as viagens programadas.'); return; }
  const atualizar = el('button', 'Comparar de novo', 'secundario');
  atualizar.type = 'button';
  atualizar.onclick = mostrarCruzamento;
  topo.append(atualizar);
  nota('Consultando o CRM…');
  try {
    const { valores, veiculos } = dadosDoFormulario($('form-conferencia'));
    const dados = { cpf: valores.cpf?.valor, nome: valores.nome?.valor, placas: veiculos.map(v => v.veic_placa?.valor).filter(Boolean) };
    const achadas = cruzarComViagens(dados, await viagensProgramadas(sessao));
    if (!achadas.length) { nota('Nenhuma viagem programada com este CPF ou estas placas.'); return; }
    const blocos = achadas.map(({ viagem, itens }) => {
      const b = el('div', '', 'viagem');
      b.append(el('strong', [viagem.cliente, viagem.data].filter(Boolean).join(' · ') || 'Viagem programada'));
      const detalhe = [viagem.trajeto, viagem.veiculo].filter(Boolean).join(' · ');
      if (detalhe) b.append(el('small', detalhe));
      const ul = el('ul');
      for (const i of itens) ul.append(el('li', textoDoItem(i), ['ok', 'sem_dado', 'sem_crm'].includes(i.status) ? '' : 'alerta'));
      b.append(ul);
      return b;
    });
    caixa.replaceChildren(topo, ...blocos);
  } catch (e) {
    if (e.sair) await salvarSessao(null).catch(() => {});
    nota(e.message);
  }
}

// CT-e: a nota não traz o motorista. O CPF sai de uma viagem programada do CRM ou de um cadastro do Histórico;
// sozinho, só quando uma única viagem tem o destino da nota e o campo ainda está vazio.
async function mostrarMotoristaCte() {
  const caixa = $('cruzamento');
  const el = (tag, texto, classe) => { const e = document.createElement(tag); if (texto) e.textContent = texto; if (classe) e.className = classe; return e; };
  const topo = el('div', '', 'cruzamento-topo');
  topo.append(el('strong', 'Motorista do CT-e'));
  const nota = (texto) => { caixa.replaceChildren(topo, el('p', texto, 'nota')); caixa.hidden = false; };
  nota('Consultando o CRM e o Histórico…');
  let viagens = [];
  let avisoCrm = '';
  try {
    const sessao = await sessaoDoCrm();
    if (sessao) viagens = await viagensProgramadas(sessao);
    else avisoCrm = 'Entre no CRM nas Configurações para ver os motoristas das viagens programadas.';
  } catch (e) {
    if (e.sair) await salvarSessao(null).catch(() => {});
    avisoCrm = e.message;
  }
  if (modo !== 'cte') return;
  const form = $('form-conferencia');
  const campoCpf = form.elements.c_motorista_cpf;
  if (!campoCpf) return;
  const historico = await lerHistorico().catch(() => []);
  const { opcoes, sugerida } = opcoesMotoristaCte({ viagens, historico, nota: lerFormularioCte(form).valores });
  if (!opcoes.length) { nota(avisoCrm || 'Nenhum motorista com CPF nas viagens do CRM nem no Histórico: digite o CPF.'); return; }
  const sel = el('select');
  sel.append(el('option', '— Escolha o motorista —'));
  sel.firstChild.value = '';
  opcoes.forEach((o, i) => { const op = el('option', `${o.fonte}: ${o.rotulo} · ${o.cpf}`); op.value = String(i); sel.append(op); });
  const info = el('small', '', 'nota');
  const aplicar = () => {
    const o = opcoes[Number(sel.value)];
    if (sel.value === '' || !o) return;
    campoCpf.value = o.cpf;
    campoCpf.closest('label')?.classList.add('conferir');
  };
  sel.addEventListener('change', () => { aplicar(); info.textContent = sel.value === '' ? '' : 'CPF colocado no campo "CPF do motorista". Confira.'; });
  if (sugerida >= 0 && !campoCpf.value.trim()) {
    sel.value = String(sugerida);
    aplicar();
    info.textContent = 'Viagem do CRM com o mesmo destino da nota: CPF já colocado. Confira se é o motorista certo.';
  } else {
    info.textContent = 'Escolha o motorista para colocar o CPF no CT-e.';
  }
  caixa.replaceChildren(topo, sel, info, ...(avisoCrm ? [el('p', avisoCrm, 'nota')] : []));
  caixa.hidden = false;
}

// Pedágios: link do Maps do motorista → rota no Google → praças da rota → cliques nos marcadores do portal Sem Parar.
const STATUS_PEDAGIO = {
  ok: ['✅', ''],
  ja_estava: ['☑️', ' (já estava marcada)'],
  ambiguo: ['⚠️', ' — dois marcadores no mesmo ponto: marque à mão'],
  sem_marcador: ['⚠️', ' — não achei no mapa: marque à mão'],
  nao_entrou: ['⚠️', ' — cliquei, mas não entrou na lista: marque à mão'],
};

async function marcarPedagios() {
  mensagem('');
  const caixa = $('resultado-pedagios');
  const el = (tag, texto, classe) => { const e = document.createElement(tag); if (texto) e.textContent = texto; if (classe) e.className = classe; return e; };
  const cfg = await lerConfig();
  if (!cfg.mapsKey) { await abrirConfig('Cole a chave da API do Google Maps (Pedágios) e clique em Salvar.'); $('cfg-mapsKey').focus(); return; }
  const link = $('link-maps').value.trim();
  if (!link) { mensagem('Cole o link do Google Maps que o motorista mandou.'); return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!ehSemParar(tab?.url)) { mensagem('Abra nesta aba o portal Sem Parar Empresas, na tela Rotas → Cadastrar.'); return; }
  const noPortal = async (func, args = []) => (await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func, args }))[0]?.result;

  const est = await noPortal(() => window.__semParar?.estado() ?? null).catch(() => null);
  if (!est) { mensagem('A extensão ainda não está ativa nesta aba: recarregue a página do Sem Parar (F5) e tente de novo.'); return; }
  if (est.tela !== 'cadastrar_rota') { mensagem('No portal Sem Parar, abra a tela Rotas → Cadastrar.'); return; }
  if (!est.pracas || !est.marcadores) {
    mensagem('Não encontrei as praças do mapa. Recarregue a página do Sem Parar (F5), clique em "Configurar pedágios" e tente de novo.');
    return;
  }

  const botao = $('btn-pedagios');
  botao.disabled = true;
  caixa.hidden = true;
  try {
    botao.textContent = 'Calculando a rota…';
    const { pontos, trajeto, distanciaKm } = await buscarTrajeto(link, cfg.mapsKey);
    const pracas = await noPortal(() => window.__semParar.pracas());
    const naRota = pracasNaRota(trajeto, pracas ?? []);
    const topo = el('p', `Rota: ${pontos.map(p => p.endereco).join(' → ')}${distanciaKm ? ` (≈ ${distanciaKm} km)` : ''}`);
    if (!naRota.length) {
      caixa.replaceChildren(topo, el('p', 'Nenhuma praça de pedágio do Sem Parar nessa rota.', 'nota'));
      caixa.hidden = false;
      return;
    }
    botao.textContent = `Marcando ${naRota.length} praças…`;
    const lista = naRota.map(({ identificadorMapa, nomePraca, latitude, longitude }) => ({ identificadorMapa, nomePraca, latitude, longitude }));
    const resultado = (await noPortal((l) => window.__semParar.marcar(l), [lista])) ?? [];
    const semSentido = new Set(naRota.filter(p => p.semSentido).map(p => p.identificadorMapa));
    const ul = el('ul');
    for (const r of resultado) {
      const [icone, sufixo] = STATUS_PEDAGIO[r.status] ?? ['⚠️', ` — ${r.status}`];
      const aviso = semSentido.has(r.identificadorMapa) ? ' — sem sentido no cadastro, confira' : '';
      ul.append(el('li', `${icone} ${r.identificadorMapa} - ${r.nomePraca}${sufixo}${aviso}`, icone === '⚠️' || aviso ? 'alerta' : ''));
    }
    const marcadas = resultado.filter(r => r.status === 'ok' || r.status === 'ja_estava').length;
    caixa.replaceChildren(
      topo,
      el('p', `${marcadas} de ${naRota.length} praças marcadas, na ordem do caminho.`),
      ul,
      el('p', 'Confira as praças no mapa do portal e clique em "Salvar rota". A extensão não salva.', 'nota'),
    );
    caixa.hidden = false;
  } catch (e) {
    mensagem(e.message);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Marcar pedágios no Sem Parar';
  }
}

// CIOT: cadastro do histórico + última nota do CT-e → Emissor de CIOT do Webrouter. Nunca emite.
const ORIGENS_WEBROUTER = ['https://webrouter.com.br/*', 'https://*.webrouter.com.br/*'];
const escolhasCiot = { tipo: '', contratante: '' };
let cadastrosCiot = [];
let notaCiot = null;
let viagensCiot = [];

function escolherCiot(botao) {
  const grupo = botao.dataset.ciotTipo ? 'tipo' : 'contratante';
  escolhasCiot[grupo] = botao.dataset.ciotTipo ?? botao.dataset.ciotContratante;
  const seletor = grupo === 'tipo' ? '[data-ciot-tipo]' : '[data-ciot-contratante]';
  for (const b of document.querySelectorAll(seletor)) {
    const ativo = b === botao;
    b.classList.toggle('ativo', ativo);
    b.setAttribute('aria-checked', String(ativo));
  }
}

async function carregarCiot() {
  const el = (tag, texto, classe) => { const e = document.createElement(tag); if (texto) e.textContent = texto; if (classe) e.className = classe; return e; };
  cadastrosCiot = await lerHistorico().catch(() => []);
  const sel = $('ciot-cadastro');
  sel.replaceChildren(...(cadastrosCiot.length
    ? cadastrosCiot.map((r, i) => {
      const { nome, placas, quando } = resumoDoRegistro(r);
      const o = el('option', [nome, placas.join(' + '), quando].filter(Boolean).join(' · '));
      o.value = String(i);
      return o;
    })
    : [el('option', 'Nenhum cadastro no histórico — leia os documentos no modo Cadastros')]));
  sel.disabled = !cadastrosCiot.length;
  mostrarContratadoCiot();
  notaCiot = await lerUltimoCte().catch(() => null);
  const n = notaCiot?.valores ?? {};
  const linha = (rotulo, valor) => el('p', `${rotulo}: ${valor || '—'}`, valor ? '' : 'alerta');
  $('ciot-nota').replaceChildren(...(notaCiot
    ? [
      el('p', 'Nota do CT-e (última lida)', ''),
      linha('Destinatário', [n.destinatario_nome, n.destinatario_cnpj].filter(Boolean).join(' · ')),
      linha('NCM', n.ncm),
      linha('Peso', n.peso_bruto),
      linha('Origem', [n.origem_cidade, n.origem_uf].filter(Boolean).join(' - ')),
      linha('Destino', [n.destino_cidade, n.destino_uf].filter(Boolean).join(' - ')),
    ]
    : [el('p', 'Nenhuma nota lida nos últimos 3 dias: leia a nota no modo CT-e manual antes.', 'alerta')]));
  await carregarViagensCiot();
}

// Viagens programadas do CRM: o que faltar no cadastro, na nota e no painel sai da viagem escolhida aqui.
async function carregarViagensCiot() {
  const sel = $('ciot-viagem');
  const opcao = (texto, valor) => { const o = document.createElement('option'); o.textContent = texto; o.value = valor; return o; };
  viagensCiot = [];
  sel.replaceChildren(opcao('Consultando o CRM…', ''));
  sel.disabled = true;
  $('ciot-viagem-info').textContent = '';
  let aviso = '';
  try {
    const sessao = await sessaoDoCrm();
    if (!sessao) aviso = 'Entre no CRM nas Configurações para completar o CIOT com a viagem programada.';
    else viagensCiot = await viagensProgramadas(sessao, { colunas: COLUNAS_CIOT });
  } catch (e) {
    aviso = e.message;
  }
  if (modo !== 'ciot') return;
  const dataBr = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(iso ?? '') ? iso.slice(0, 10).split('-').reverse().join('/') : '');
  sel.replaceChildren(
    opcao(viagensCiot.length ? 'Não usar o CRM' : aviso ? 'CRM indisponível' : 'Nenhuma viagem programada no CRM', ''),
    ...viagensCiot.map((t, i) => opcao([t.cliente_nome, [t.origem, t.destino].filter(Boolean).join(' → '), t.placa, dataBr(t.data_coleta) || dataBr(t.data_viagem)]
      .filter(Boolean).join(' · ') || 'Viagem programada', String(i))),
  );
  sel.disabled = !viagensCiot.length;
  if (aviso) { $('ciot-viagem-info').textContent = aviso; return; }
  escolherViagemDoCadastro();
}

// Ao trocar de cadastro, escolhe a viagem do mesmo CPF (ou placa); sem nenhuma, não usa o CRM.
function escolherViagemDoCadastro() {
  if (!viagensCiot.length) return;
  const registro = cadastrosCiot[Number($('ciot-cadastro').value)] ?? null;
  const [achada] = viagensDoCadastro(registro, viagensCiot);
  $('ciot-viagem').value = achada ? String(viagensCiot.indexOf(achada)) : '';
  mostrarViagemCiot();
}

function viagemCiotEscolhida() {
  const valor = $('ciot-viagem').value;
  return valor === '' ? null : viagensCiot[Number(valor)] ?? null;
}

function mostrarViagemCiot() {
  const t = viagemCiotEscolhida();
  $('ciot-viagem-info').textContent = !viagensCiot.length ? $('ciot-viagem-info').textContent
    : t ? 'O que faltar no cadastro, na nota e no contratado sai desta viagem (motorista, placas, peso, origem, destino, previsão de entrega e proprietário).'
    : 'Nenhuma viagem do CRM com o CPF ou as placas deste cadastro: escolha uma, se for o caso.';
}

// Contratado = CPF/CNPJ e RNTRC do cartão da ANTT: vêm do cadastro escolhido, da leitura do cartão ou digitados.
function mostrarContratadoCiot() {
  const r = cadastrosCiot[Number($('ciot-cadastro').value)];
  const v = r?.valores ?? {};
  $('ciot-contratado-doc').value = v.prop_cpf_cnpj?.valor ?? '';
  $('ciot-contratado-rntrc').value = v.prop_rntrc?.valor ?? '';
  $('ciot-contratado-origem').textContent = r
    ? (v.prop_rntrc?.valor ? 'Do cadastro do motorista. Confira com o cartão da ANTT.' : 'O cadastro não tem RNTRC (cartão da ANTT não lido): leia o cartão ou digite.')
    : 'Sem cadastro no Histórico: leia o cartão da ANTT, digite ou deixe em branco para usar o proprietário da viagem do CRM.';
}

async function lerCartaoAntt(arquivo) {
  mensagem('');
  const cfg = await lerConfig();
  if (!cfg.apiKey) { await abrirConfig('Cole a chave da API do Gemini e clique em Salvar.'); return; }
  $('ciot-contratado-origem').textContent = 'Lendo o cartão da ANTT…';
  try {
    const entrada = await lerEntrada([arquivo]);
    const docs = await prepararDocumentos(entrada.itens, { redimensionar: redimensionarImagem, lerTextoPdf: textoDoPdf });
    if (!temConteudo(docs, '')) throw new Error('Arquivo não suportado: use foto (JPG/PNG) ou PDF do cartão da ANTT.');
    const r = posProcessarAntt(await chamarGeminiAntt(cfg.apiKey, docs));
    if (r.cpf_cnpj) $('ciot-contratado-doc').value = r.cpf_cnpj;
    if (r.rntrc) $('ciot-contratado-rntrc').value = r.rntrc;
    $('ciot-contratado-origem').textContent = ['Lido do cartão da ANTT.', ...r.avisos].join(' ');
  } catch (e) {
    $('ciot-contratado-origem').textContent = '';
    mensagem(e.message);
  }
}

async function preencherCiot() {
  mensagem('');
  // Primeira coisa do clique (o Chrome só pergunta durante o gesto do usuário): com o "Acesso ao site" da extensão
  // em "sites específicos"/"ao clicar", o Webrouter não vem liberado e a aba fica invisível. Já liberado, não pergunta.
  const liberado = await chrome.permissions.request({ origins: ORIGENS_WEBROUTER }).catch(() => false);
  if (!liberado) {
    mensagem('O Chrome não liberou o acesso ao Webrouter. Clique em "Preencher" de novo e escolha "Permitir" — ou, em chrome://extensions → Detalhes da extensão → Acesso ao site, inclua webrouter.com.br.');
    return;
  }
  const registro = cadastrosCiot[Number($('ciot-cadastro').value)] ?? null;
  const { dados, faltando, avisos } = montarCiot({
    registro,
    cte: notaCiot?.valores ?? null,
    viagem: viagemCiotEscolhida(),
    escolhas: {
      ...escolhasCiot,
      data_fim: $('ciot-data-fim').value,
      contratado: { cpf_cnpj: $('ciot-contratado-doc').value, rntrc: $('ciot-contratado-rntrc').value },
    },
  });
  if (faltando.length) { mensagem(`Falta: ${faltando.join(', ')}`); return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!ehWebrouter(tab?.url)) {
    // Sem permissão para o site, o Chrome não mostra o endereço da aba.
    let visto = 'endereço não visível para a extensão';
    try { visto = new URL(tab.url).host; } catch { /* sem url */ }
    mensagem(`Abra nesta aba o Webrouter, em Emissor de CIOT → Novo CIOT (aba atual: ${visto}).`);
    return;
  }
  const naAba = async (func, args = []) => {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', files: ['content/ciot.bundle.js'] });
    return (await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func, args }))[0]?.result;
  };
  const botao = $('btn-ciot');
  botao.disabled = true;
  botao.textContent = 'Preenchendo…';
  try {
    const est = await naAba(() => window.__ciotWebrouter.estado());
    if (!est?.tela) { mensagem('No Webrouter, abra o Emissor de CIOT e clique em "Novo CIOT".'); return; }
    const rel = await naAba((d) => window.__ciotWebrouter.preencher(d), [dados]);
    rel.avisos = [...avisos, ...(rel.avisos ?? [])];
    mostrarRelatorio(rel);
  } catch (e) {
    mensagem(`Falha ao preencher: ${e.message}`);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Preencher CIOT no Webrouter';
  }
}

// Aviso de versão nova publicada no GitHub (Releases). Sem internet ou sem release: não mostra nada.
async function verificarAtualizacao() {
  try {
    const r = await fetch('https://api.github.com/repos/breviistransportes/Sitra_automacao/releases/latest');
    if (!r.ok) return;
    const { tag_name: tag, html_url: url } = await r.json();
    const atual = chrome.runtime.getManifest().version;
    if (!linkAtualizacaoValido(tag, url) || !versaoMaior(tag, atual)) return;
    $('texto-atualizacao').textContent = textoAtualizacao(tag, atual);
    $('link-atualizacao').href = url;
    $('atualizacao').hidden = false;
  } catch {
    // silencioso: o aviso é só uma conveniência
  }
}
verificarAtualizacao();
// O painel pode ficar aberto o dia todo: confere de novo a cada 6 horas.
setInterval(verificarAtualizacao, 6 * 60 * 60 * 1000);
atualizarBotaoHistorico();

// Configurações dentro do próprio painel (não depende da página de opções do Chrome).
async function abrirConfig(aviso = '') {
  const cfg = await lerConfig();
  $('cfg-apiKey').value = cfg.apiKey;
  $('cfg-mapsKey').value = cfg.mapsKey;
  $('cfg-nacionalidade').value = cfg.padroes.nacionalidade;
  $('cfg-propriedade').value = cfg.padroes.propriedade;
  $('cfg-emailProprietario').value = cfg.padroes.emailProprietario;
  $('cfg-telefoneProprietario').value = cfg.padroes.telefoneProprietario;
  $('config').hidden = false;
  atualizarCrmConfig();
  mensagem(aviso, 'alerta');
  $('cfg-apiKey').focus();
}

async function salvarConfigPainel() {
  const apiKey = $('cfg-apiKey').value.trim();
  if (!apiKey) { mensagem('Cole a chave da API do Gemini.'); return; }
  await salvarConfig({
    apiKey,
    mapsKey: $('cfg-mapsKey').value.trim(),
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

importarLeituraDoCrm().catch(e => mensagem(e.message));
chrome.storage.onChanged.addListener((mudou, area) => {
  if (area === 'session' && mudou[CHAVE_LEITURA_CRM]?.newValue) importarLeituraDoCrm().catch(e => mensagem(e.message));
});

// Primeira vez (sem chave salva): já abre as configurações.
lerConfig().then(cfg => { if (!cfg.apiKey) abrirConfig('Primeiro uso: cole a chave da API do Gemini e clique em Salvar.'); }).catch(() => {});
