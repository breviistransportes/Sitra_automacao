// CRM da Breviis (Supabase), só leitura. A extensão vai num .zip: aqui só a chave publicável, nunca a service_role.
// Quem pode ver as viagens decide o RLS do CRM, pelo login do operador (admin/logística veem todas).
export const CRM = {
  url: 'https://lpnuuwcidpaojzqhrojh.supabase.co',
  chave: 'sb_publishable_4Xv5flgPrCnGcYbS2-XRbw_zCgpAxeb',
};

// Só o que o cruzamento usa: nada de valores, margem, custo ou pagamento do motorista.
export const COLUNAS_VIAGEM = 'id,cliente_nome,origem,destino,data_viagem,data_coleta,motorista,motorista_doc,placa,veiculo_tipo,carroceria';

const CHAVE_SESSAO = 'crm';
const MARGEM_RENOVACAO_MS = 5 * 60_000;

// sair = a sessão não vale mais: apagar e pedir login de novo.
export class ErroCrm extends Error {
  constructor(mensagem, { sair = false } = {}) {
    super(mensagem);
    this.sair = sair;
  }
}

async function chamar(caminho, init, fetchFn) {
  try {
    return await fetchFn(`${CRM.url}${caminho}`, init);
  } catch {
    throw new ErroCrm('Sem conexão com o CRM.');
  }
}

const cabecalhos = (token) => ({ apikey: CRM.chave, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });

function sessaoDe(corpo, agora) {
  return { access_token: corpo.access_token, refresh_token: corpo.refresh_token, expira_em: agora + corpo.expires_in * 1000, email: corpo.user?.email ?? '' };
}

// A senha só passa por aqui: vai ao CRM e não é guardada. Fica a sessão (renovável).
export async function entrar(email, senha, { fetchFn = fetch, agora = Date.now() } = {}) {
  const r = await chamar('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: cabecalhos(), body: JSON.stringify({ email: String(email).trim().toLowerCase(), password: senha }),
  }, fetchFn);
  const corpo = await r.json().catch(() => ({}));
  if (r.status === 400 && corpo.error === 'invalid_grant') throw new ErroCrm('E-mail ou senha do CRM incorretos.');
  if (!r.ok) throw new ErroCrm(`O CRM recusou o login (${r.status}): ${corpo.error_description ?? corpo.msg ?? corpo.message ?? 'sem detalhes'}`);
  return sessaoDe(corpo, agora);
}

export async function renovarSeVencendo(sessao, { fetchFn = fetch, agora = Date.now() } = {}) {
  if (sessao.expira_em - MARGEM_RENOVACAO_MS > agora) return sessao;
  const r = await chamar('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', headers: cabecalhos(), body: JSON.stringify({ refresh_token: sessao.refresh_token }),
  }, fetchFn);
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroCrm('A sessão do CRM expirou. Entre de novo nas Configurações.', { sair: r.status === 400 || r.status === 401 });
  return sessaoDe(corpo, agora);
}

export async function viagensProgramadas(sessao, { fetchFn = fetch } = {}) {
  const params = new URLSearchParams({ select: COLUNAS_VIAGEM, fase: 'eq.programado' });
  const r = await chamar(`/rest/v1/trips?${params}`, { method: 'GET', headers: cabecalhos(sessao.access_token) }, fetchFn);
  if (r.status === 401) throw new ErroCrm('A sessão do CRM expirou. Entre de novo nas Configurações.', { sair: true });
  if (!r.ok) throw new ErroCrm(`O CRM não respondeu as viagens (${r.status}).`);
  const lista = await r.json().catch(() => null);
  if (!Array.isArray(lista)) throw new ErroCrm('O CRM respondeu num formato inesperado.');
  return lista;
}

// Encerrar no CRM é cortesia: a sessão local é apagada de qualquer jeito.
export async function sair(sessao, { fetchFn = fetch } = {}) {
  await chamar('/auth/v1/logout', { method: 'POST', headers: cabecalhos(sessao.access_token) }, fetchFn).catch(() => {});
}

export async function lerSessao(storage = chrome.storage.local) {
  const { [CHAVE_SESSAO]: s } = await storage.get(CHAVE_SESSAO);
  return s?.access_token && s?.refresh_token ? s : null;
}

export async function salvarSessao(sessao, storage = chrome.storage.local) {
  if (sessao) await storage.set({ [CHAVE_SESSAO]: sessao });
  else await storage.remove(CHAVE_SESSAO);
}
