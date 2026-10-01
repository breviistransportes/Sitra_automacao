import { describe, it, expect } from 'vitest';
import { CRM, entrar, renovarSeVencendo, viagensProgramadas, sair, ErroCrm, COLUNAS_VIAGEM } from '../src/lib/crm.js';

const resposta = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
function fetchFalso(respostas) {
  const chamadas = [];
  const fn = async (url, init = {}) => { chamadas.push({ url, init, corpo: init.body && JSON.parse(init.body) }); return respostas.shift(); };
  return { fn, chamadas };
}
const AGORA = 1_800_000_000_000;

describe('CRM (Supabase): só leitura, com o login do operador', () => {
  it('usa a chave publicável, nunca a service_role', () => {
    expect(CRM.url).toBe('https://lpnuuwcidpaojzqhrojh.supabase.co');
    expect(CRM.chave).toMatch(/^sb_publishable_/);
  });

  it('entrar: troca e-mail/senha por uma sessão e não guarda a senha', async () => {
    const { fn, chamadas } = fetchFalso([resposta(200, { access_token: 'A', refresh_token: 'R', expires_in: 3600, user: { email: 'op@breviis.com.br' } })]);
    const s = await entrar(' OP@breviis.com.br ', 'segredo', { fetchFn: fn, agora: AGORA });
    expect(chamadas[0].url).toBe(`${CRM.url}/auth/v1/token?grant_type=password`);
    expect(chamadas[0].init.headers.apikey).toBe(CRM.chave);
    expect(chamadas[0].corpo).toEqual({ email: 'op@breviis.com.br', password: 'segredo' });
    expect(s).toEqual({ access_token: 'A', refresh_token: 'R', expira_em: AGORA + 3600_000, email: 'op@breviis.com.br' });
    expect(JSON.stringify(s)).not.toContain('segredo');
  });

  it('entrar com senha errada: mensagem clara', async () => {
    const { fn } = fetchFalso([resposta(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })]);
    await expect(entrar('a@b.c', 'x', { fetchFn: fn })).rejects.toThrow('E-mail ou senha do CRM incorretos.');
  });

  it('renova a sessão só quando está para vencer', async () => {
    const s = { access_token: 'A', refresh_token: 'R', expira_em: AGORA + 30 * 60_000, email: 'e' };
    const { fn, chamadas } = fetchFalso([resposta(200, { access_token: 'B', refresh_token: 'R2', expires_in: 3600, user: { email: 'e' } })]);
    expect(await renovarSeVencendo(s, { fetchFn: fn, agora: AGORA })).toBe(s);
    expect(chamadas).toHaveLength(0);
    const nova = await renovarSeVencendo({ ...s, expira_em: AGORA + 30_000 }, { fetchFn: fn, agora: AGORA });
    expect(chamadas[0].url).toBe(`${CRM.url}/auth/v1/token?grant_type=refresh_token`);
    expect(chamadas[0].corpo).toEqual({ refresh_token: 'R' });
    expect(nova).toMatchObject({ access_token: 'B', refresh_token: 'R2' });
  });

  it('renovação recusada: pede para entrar de novo', async () => {
    const { fn } = fetchFalso([resposta(400, { error: 'invalid_grant' })]);
    const err = await renovarSeVencendo({ access_token: 'A', refresh_token: 'R', expira_em: 0, email: 'e' }, { fetchFn: fn, agora: AGORA }).catch(e => e);
    expect(err).toBeInstanceOf(ErroCrm);
    expect(err.sair).toBe(true);
  });

  it('viagens programadas: só fase=programado e só as colunas do cruzamento (nada de valores)', async () => {
    const { fn, chamadas } = fetchFalso([resposta(200, [{ id: 'v1' }])]);
    expect(await viagensProgramadas({ access_token: 'A' }, { fetchFn: fn })).toEqual([{ id: 'v1' }]);
    const u = new URL(chamadas[0].url);
    expect(u.pathname).toBe('/rest/v1/trips');
    expect(u.searchParams.get('fase')).toBe('eq.programado');
    expect(u.searchParams.get('select')).toBe(COLUNAS_VIAGEM);
    expect(COLUNAS_VIAGEM).not.toMatch(/valor|margem|custo|imposto|pago/);
    expect(chamadas[0].init.headers).toMatchObject({ apikey: CRM.chave, Authorization: 'Bearer A' });
    expect(chamadas[0].init.method ?? 'GET').toBe('GET');
  });

  it('sessão recusada pelo CRM (401) pede para entrar de novo; sem internet, avisa', async () => {
    const { fn } = fetchFalso([resposta(401, { message: 'JWT expired' })]);
    const err = await viagensProgramadas({ access_token: 'A' }, { fetchFn: fn }).catch(e => e);
    expect(err.sair).toBe(true);
    await expect(viagensProgramadas({ access_token: 'A' }, { fetchFn: async () => { throw new TypeError('x'); } }))
      .rejects.toThrow('Sem conexão com o CRM.');
  });

  it('sair: encerra a sessão no CRM e não falha se já estiver encerrada', async () => {
    const { fn, chamadas } = fetchFalso([resposta(401, {})]);
    await sair({ access_token: 'A' }, { fetchFn: fn });
    expect(chamadas[0].url).toBe(`${CRM.url}/auth/v1/logout`);
    expect(chamadas[0].init.headers.Authorization).toBe('Bearer A');
  });
});
