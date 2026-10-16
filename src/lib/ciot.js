// CIOT no Webrouter: junta o cadastro do motorista (histórico) com a última nota lida no modo CT-e.
// O operador só escolhe o tipo (lotação/fracionada), a Breviis contratante e a data de fim; o valor do frete ele digita no Webrouter.
// Contratado = transportador do cartão da ANTT (prop_cpf_cnpj; sem cartão, o extrator usa o dono do CRLV).
// O que faltar no cadastro, na nota e no painel sai da viagem programada do CRM (cruzada pelo CPF ou pela placa).
import { formatarCpfCnpj, formatarData, somenteDigitos, textoSeguro, formatarUf } from './normalizar.js';
import { placasDe } from './cruzamento.js';

// webrouter.com.br com ou sem www (ou outro subdomínio). Igual ao host_permissions do manifest.
export const DOMINIO_WEBROUTER = 'webrouter.com.br';
export const ehHostWebrouter = (host) => host === DOMINIO_WEBROUTER || String(host ?? '').endsWith(`.${DOMINIO_WEBROUTER}`);
export function ehWebrouter(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ehHostWebrouter(u.hostname);
  } catch {
    return false;
  }
}

export const TIPOS_OPERACAO = { lotacao: 'CARGA LOTAÇÃO', fracionada: 'CARGA FRACIONADA' };
// Na busca de contratante do Webrouter aparecem 3 CNPJs; só usamos os de final 32 (Breviis I) e 72 (Breviis II).
export const CONTRATANTES = { breviis1: { rotulo: 'Breviis I', final: '32' }, breviis2: { rotulo: 'Breviis II', final: '72' } };

// Texto de uma opção da busca contém o CNPJ com esse final? Aceita o CNPJ com ou sem máscara.
export function cnpjNoTextoTerminaEm(texto, final) {
  const cnpjs = String(texto ?? '').match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) ?? [];
  return cnpjs.some(c => somenteDigitos(c).endsWith(final));
}

const doisDigitos = (n) => String(n).padStart(2, '0');
export const dataDeHoje = (agora = new Date()) => `${doisDigitos(agora.getDate())}/${doisDigitos(agora.getMonth() + 1)}/${agora.getFullYear()}`;

const valorDe = (mapa, chave) => mapa?.[chave]?.valor ?? mapa?.[chave] ?? '';

// O CRM grava "Cidade/UF"; viagens antigas podem ter "Cidade, Estado por extenso" ou "Cidade - UF".
const UF_POR_NOME = {
  ACRE: 'AC', ALAGOAS: 'AL', AMAPA: 'AP', AMAZONAS: 'AM', BAHIA: 'BA', CEARA: 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES',
  GOIAS: 'GO', MARANHAO: 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG', PARA: 'PA', PARAIBA: 'PB',
  PARANA: 'PR', PERNAMBUCO: 'PE', PIAUI: 'PI', 'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS',
  RONDONIA: 'RO', RORAIMA: 'RR', 'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', SERGIPE: 'SE', TOCANTINS: 'TO',
};
export function cidadeUfDoCrm(texto) {
  const m = String(texto ?? '').trim().match(/^(.+?)\s*[/,\-–]\s*([^/,\-–]+)$/);
  if (!m) return { cidade: textoSeguro(texto), uf: '' };
  const estado = m[2].trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const uf = formatarUf(estado) || UF_POR_NOME[estado] || '';
  return uf ? { cidade: textoSeguro(m[1]), uf } : { cidade: textoSeguro(texto), uf: '' };
}

const alfanum = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Viagens programadas do CRM deste cadastro: CPF do motorista igual primeiro, depois placa em comum.
export function viagensDoCadastro(registro, viagens) {
  if (!registro) return [];
  const cpf = somenteDigitos(valorDe(registro.valores, 'cpf'));
  const placas = (registro.veiculos ?? []).map(x => alfanum(valorDe(x, 'veic_placa'))).filter(Boolean);
  const mesmoCpf = (x) => !!cpf && somenteDigitos(x.motorista_doc) === cpf;
  return (Array.isArray(viagens) ? viagens : [])
    .filter(x => mesmoCpf(x) || placasDe(x.placa).some(p => placas.includes(p)))
    .sort((a, b) => Number(mesmoCpf(b)) - Number(mesmoCpf(a)));
}

// registro: cadastro do histórico ({ valores, veiculos }); cte: valores da última nota; escolhas: o que o operador marcou;
// viagem: viagem programada do CRM (linha de trips), usada só para o que faltar nos outros três.
export function montarCiot({ registro, cte, escolhas, viagem = null, hoje = dataDeHoje() }) {
  const v = registro?.valores ?? {};
  const n = cte ?? {};
  const t = viagem ?? {};
  const doCrm = [];
  // Primeiro valor preenchido; se veio do CRM, anota o rótulo para o aviso.
  const ou = (rotulo, proprio, doCrmValor) => {
    if (proprio) return proprio;
    if (doCrmValor && rotulo && !doCrm.includes(rotulo)) doCrm.push(rotulo);
    return doCrmValor;
  };
  // Contratado vem inteiro de uma fonte só (CPF/CNPJ e RNTRC de pessoas diferentes não podem se misturar):
  // os campos do painel (cadastro, leitura do cartão da ANTT ou digitado); vazios, o cadastro; sem cadastro, o proprietário no CRM.
  const fontesContratado = [
    escolhas?.contratado && { cpf_cnpj: escolhas.contratado.cpf_cnpj, rntrc: escolhas.contratado.rntrc },
    { cpf_cnpj: valorDe(v, 'prop_cpf_cnpj'), rntrc: valorDe(v, 'prop_rntrc'), nome: valorDe(v, 'prop_nome') },
    { cpf_cnpj: t.proprietario_cpf, rntrc: t.proprietario_antt, nome: t.proprietario_nome, crm: true },
  ];
  const fonte = fontesContratado.find(f => f && (somenteDigitos(f.cpf_cnpj) || somenteDigitos(f.rntrc))) ?? {};
  if (fonte.crm) doCrm.push('contratado');
  const docContratado = formatarCpfCnpj(fonte.cpf_cnpj);
  const rntrcFonte = somenteDigitos(fonte.rntrc).slice(-9);
  const rntrcContratado = rntrcFonte.length >= 8 ? rntrcFonte : '';
  const doc = somenteDigitos(docContratado);
  const nomeContratado = !doc ? ''
    : doc === somenteDigitos(valorDe(v, 'prop_cpf_cnpj')) ? textoSeguro(valorDe(v, 'prop_nome'))
    : doc === somenteDigitos(t.proprietario_cpf) ? textoSeguro(t.proprietario_nome) : '';
  const origemCrm = cidadeUfDoCrm(t.origem);
  const destinoCrm = cidadeUfDoCrm(t.destino);
  const origem = { cidade: textoSeguro(valorDe(n, 'origem_cidade')), uf: formatarUf(valorDe(n, 'origem_uf')) };
  const destino = { cidade: textoSeguro(valorDe(n, 'destino_cidade')), uf: formatarUf(valorDe(n, 'destino_uf')) };
  const veiculosCadastro = (registro?.veiculos ?? [])
    .map(x => ({ placa: alfanum(valorDe(x, 'veic_placa')), eixos: somenteDigitos(valorDe(x, 'veic_eixos')) }))
    .filter(x => x.placa);
  // Previsão de entrega do CRM só vira data de fim se não for antes de hoje.
  const previsao = formatarData(String(t.previsao_entrega ?? '').slice(0, 10));
  const dados = {
    tipo: TIPOS_OPERACAO[escolhas?.tipo] ? escolhas.tipo : '',
    contratante: CONTRATANTES[escolhas?.contratante] ? escolhas.contratante : '',
    data_inicio: hoje,
    data_fim: ou('data de fim', formatarData(escolhas?.data_fim), previsao && compararDatas(previsao, hoje) >= 0 ? previsao : ''),
    contratado: { cpf_cnpj: docContratado, nome: nomeContratado, rntrc: rntrcContratado },
    motorista: {
      nome: ou('motorista', textoSeguro(valorDe(v, 'nome')), textoSeguro(t.motorista)),
      cpf: ou('motorista', formatarCpfCnpj(valorDe(v, 'cpf')), formatarCpfCnpj(t.motorista_doc)),
    },
    destinatario: { cpf_cnpj: formatarCpfCnpj(valorDe(n, 'destinatario_cnpj')), nome: textoSeguro(valorDe(n, 'destinatario_nome')) },
    ncm: somenteDigitos(valorDe(n, 'ncm')).slice(0, 4),
    peso: ou('peso', String(valorDe(n, 'peso_bruto')), Number(t.peso_kg) > 0 ? String(t.peso_kg) : ''),
    origem: origem.cidade ? origem : ou('origem', null, origemCrm.cidade ? origemCrm : null) ?? origem,
    destino: destino.cidade ? destino : ou('destino', null, destinoCrm.cidade ? destinoCrm : null) ?? destino,
    veiculos: veiculosCadastro.length ? veiculosCadastro : ou('placas', null, placasDe(t.placa).length ? placasDe(t.placa).map(placa => ({ placa, eixos: '' })) : null) ?? [],
  };
  const faltando = [
    [!dados.tipo, 'Tipo de operação (lotação ou fracionada)'],
    [!dados.contratante, 'Contratante (Breviis I ou II)'],
    [!dados.data_fim, 'Data de fim da viagem'],
    [!dados.contratado.cpf_cnpj, 'CPF/CNPJ do contratado (cartão da ANTT)'],
    [!dados.contratado.rntrc, 'RNTRC do contratado (cartão da ANTT)'],
  ].filter(([falta]) => falta).map(([, rotulo]) => rotulo);
  // Sem cadastro, sem nota ou sem viagem no CRM não trava: preenche o resto e o operador completa no Webrouter.
  const semNota = [['destinatário', true], ['NCM', true], ['peso', !dados.peso], ['origem', !dados.origem.cidade], ['destino', !dados.destino.cidade]]
    .filter(([, falta]) => falta).map(([rotulo]) => rotulo);
  const avisos = [
    [!registro && !dados.motorista.nome && !dados.veiculos.length, 'Sem cadastro do motorista no Histórico: motorista e placas ficam para preencher'],
    [!registro && dados.motorista.nome && !dados.veiculos.length, 'Nenhuma placa na viagem do CRM'],
    [!cte, `Sem nota do CT-e lida: ${semNota.join(', ')} ficam para preencher`],
    [cte && !dados.destinatario.cpf_cnpj, 'Destinatário sem CPF/CNPJ na nota'],
    [cte && !dados.ncm, 'NCM não lido na nota'],
    [cte && !dados.peso, 'Peso não lido na nota'],
    [cte && (!dados.origem.cidade || !dados.destino.cidade), 'Origem/destino incompletos na nota'],
    [registro && !dados.veiculos.length, 'Nenhuma placa no cadastro'],
    [dados.veiculos.some(x => !x.eixos), 'Eixos não lidos em alguma placa'],
  ].filter(([cond]) => cond).map(([, texto]) => `${texto} — complete no Webrouter.`);
  const ORDEM_CRM = ['motorista', 'placas', 'peso', 'origem', 'destino', 'data de fim', 'contratado'];
  if (doCrm.length) avisos.unshift(`Do CRM: ${ORDEM_CRM.filter(r => doCrm.includes(r)).join(', ')}. Confira com a viagem programada.`);
  if (dados.data_fim && compararDatas(dados.data_fim, dados.data_inicio) < 0) faltando.push('Data de fim antes de hoje');
  return { dados, faltando, avisos };
}

function compararDatas(a, b) {
  const chave = (d) => d.split('/').reverse().join('');
  return chave(a).localeCompare(chave(b));
}

// Última nota lida no modo CT-e (só neste computador): é dela que o CIOT tira destinatário, carga e trajeto.
const CHAVE_CTE = 'ultimoCte';
const VALIDADE_CTE = 3 * 24 * 60 * 60 * 1000;

export async function salvarUltimoCte(valores, { storage = chrome.storage.local, agora = Date.now() } = {}) {
  await storage.set({ [CHAVE_CTE]: { valores, salvoEm: agora } });
}

export async function lerUltimoCte({ storage = chrome.storage.local, agora = Date.now() } = {}) {
  const { [CHAVE_CTE]: r } = await storage.get(CHAVE_CTE);
  if (!r?.valores || !(agora - r.salvoEm <= VALIDADE_CTE)) return null;
  return r;
}
