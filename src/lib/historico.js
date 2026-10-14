// Histórico de cadastros: só no Chrome deste computador (chrome.storage.local), sem fotos nem PDFs.
// Guarda o que foi conferido (valores, veículos e avisos) para reabrir um cadastro sem ler os documentos de novo.
export const DIAS_NO_HISTORICO = 30;
export const MAXIMO_NO_HISTORICO = 200;
const CHAVE = 'historico';
const DIA = 24 * 60 * 60 * 1000;

// Dados pessoais não ficam além do prazo: o que passou de DIAS_NO_HISTORICO sem uso é apagado a cada leitura.
function validos(lista, agora) {
  return (Array.isArray(lista) ? lista : [])
    .filter(r => r && typeof r.id === 'string' && agora - r.atualizadoEm <= DIAS_NO_HISTORICO * DIA)
    .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
    .slice(0, MAXIMO_NO_HISTORICO);
}

async function ler(storage, agora) {
  const { [CHAVE]: bruto } = await storage.get(CHAVE);
  const lista = validos(bruto, agora);
  if (!Array.isArray(bruto) || lista.length !== bruto.length) await storage.set({ [CHAVE]: lista });
  return lista;
}

export async function lerHistorico({ storage = chrome.storage.local, agora = Date.now() } = {}) {
  return ler(storage, agora);
}

// Sem id: cadastro novo. Com id: atualiza os valores/veículos desse cadastro (mantém criadoEm e avisos).
export async function salvarNoHistorico({ id, valores, veiculos, avisos },
  { storage = chrome.storage.local, agora = Date.now(), novoId = () => crypto.randomUUID() } = {}) {
  const lista = await ler(storage, agora);
  const atual = id && lista.find(r => r.id === id);
  const registro = atual
    ? { ...atual, valores, veiculos, ...(avisos ? { avisos } : {}), atualizadoEm: agora }
    : { id: id ?? novoId(), criadoEm: agora, atualizadoEm: agora, valores, veiculos, avisos: avisos ?? [] };
  await storage.set({ [CHAVE]: validos([registro, ...lista.filter(r => r.id !== registro.id)], agora) });
  return registro;
}

export async function excluirDoHistorico(id, { storage = chrome.storage.local, agora = Date.now() } = {}) {
  const lista = await ler(storage, agora);
  await storage.set({ [CHAVE]: lista.filter(r => r.id !== id) });
}

export async function apagarHistorico({ storage = chrome.storage.local } = {}) {
  await storage.remove(CHAVE);
}

const doisDigitos = (n) => String(n).padStart(2, '0');

export function resumoDoRegistro(r) {
  const d = new Date(r.atualizadoEm);
  return {
    nome: r.valores?.nome?.valor || '(sem nome)',
    cpf: r.valores?.cpf?.valor ?? '',
    placas: (r.veiculos ?? []).map(v => v?.veic_placa?.valor).filter(Boolean),
    quando: `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()} ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`,
  };
}
