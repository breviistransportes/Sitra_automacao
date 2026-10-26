// Ponte com a aba "Leitura de documentos" do CRM: o CRM lê os documentos (Claude) e, no
// "Usar na extensão", a página manda a leitura por postMessage; o content script repassa ao
// background, que guarda em chrome.storage.session até o painel importar.
export const ORIGENS_CRM = ['https://breviisia-crm.w7mwle.easypanel.host'];
export const CHAVE_LEITURA_CRM = 'leituraCrm';

const campoValido = (c) => c && typeof c === 'object' && typeof c.valor === 'string';
const camposValidos = (o) => o && typeof o === 'object' && !Array.isArray(o) && Object.values(o).every(campoValido);
const textos = (a) => Array.isArray(a) && a.every(t => typeof t === 'string');

// Mesmo formato do schema da leitura (montarSchema): o que não bater é recusado.
export function leituraCrmValida(l) {
  return Boolean(l) && camposValidos(l.campos) && Array.isArray(l.veiculos) && l.veiculos.every(camposValidos)
    && textos(l.documentos_encontrados) && textos(l.avisos);
}
