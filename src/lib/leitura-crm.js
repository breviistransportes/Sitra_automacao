// Ponte com a aba "Leitura de documentos" do CRM: o CRM lê os documentos (Claude) e, no
// "Usar na extensão", a página manda a leitura por postMessage; o content script repassa ao
// background, que guarda em chrome.storage.session até o painel importar.
export const ORIGENS_CRM = ['https://breviisia-crm.w7mwle.easypanel.host'];
export const CHAVE_LEITURA_CRM = 'leituraCrm';
export const PAGINA_LEITURA_CRM = `${ORIGENS_CRM[0]}/leitura-documentos`;
// O que o CRM pode mandar: cadastro (modo Cadastros), nota (modo CT-e) e cartão da ANTT (modo CIOT).
export const DOCUMENTOS_CRM = ['cadastro', 'cte', 'antt'];

const campoValido = (c) => c && typeof c === 'object' && typeof c.valor === 'string';
const listaValida = (c) => c && typeof c === 'object' && Array.isArray(c.valor) && c.valor.every(v => typeof v === 'string');
const objeto = (o) => Boolean(o) && typeof o === 'object' && !Array.isArray(o);
const camposValidos = (o) => objeto(o) && Object.values(o).every(campoValido);
const textos = (a) => Array.isArray(a) && a.every(t => typeof t === 'string');

// Mesmo formato do schema de cada leitura (montarSchema, montarSchemaCte, SCHEMA_ANTT): o que não bater é recusado.
export function leituraCrmValida(l, documento = 'cadastro') {
  if (!l || typeof l !== 'object') return false;
  if (documento === 'cadastro') {
    return camposValidos(l.campos) && Array.isArray(l.veiculos) && l.veiculos.every(camposValidos)
      && textos(l.documentos_encontrados) && textos(l.avisos);
  }
  if (documento === 'cte') {
    return objeto(l.campos) && Object.entries(l.campos).every(([k, c]) => (k === 'cfops' || k === 'outros_cnpjs' ? listaValida(c) : campoValido(c)))
      && textos(l.documentos_encontrados) && textos(l.avisos);
  }
  if (documento === 'antt') return typeof l.cpf_cnpj === 'string' && typeof l.rntrc === 'string' && typeof l.encontrou_antt === 'boolean';
  return false;
}

// Mensagem da página do CRM → { documento, leitura, mensagens }, ou null se não for um "Usar na extensão".
// "usar-leitura-cadastro" é o formato do CRM antes da leitura da nota e da ANTT.
export function pedidoDoCrm(dados) {
  if (dados?.fonte !== 'crm-breviis') return null;
  if (dados.tipo === 'usar-leitura-cadastro') return { documento: 'cadastro', leitura: dados.leitura, mensagens: dados.mensagens };
  if (dados.tipo === 'usar-leitura' && DOCUMENTOS_CRM.includes(dados.documento)) return { documento: dados.documento, leitura: dados.leitura, mensagens: dados.mensagens };
  return null;
}
