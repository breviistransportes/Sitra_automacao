import { describe, it, expect } from 'vitest';
import { CRM, motoristasSalvos, marcarMotoristaUsado, excluirMotoristaSalvo, ErroCrm } from '../src/lib/crm.js';

const resposta = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
function fetchFalso(respostas) {
  const chamadas = [];
  const fn = async (url, init = {}) => { chamadas.push({ url, init, corpo: init.body && JSON.parse(init.body) }); return respostas.shift(); };
  return { fn, chamadas };
}
const SESSAO = { access_token: 'TOKEN', refresh_token: 'R', expira_em: 0 };

describe('motoristas salvos no CRM', () => {
  it('lista os mais novos primeiro, com o token do operador', async () => {
    const { fn, chamadas } = fetchFalso([resposta(200, [{ id: '1', nome: 'JOÃO' }])]);
    expect(await motoristasSalvos(SESSAO, { fetchFn: fn })).toEqual([{ id: '1', nome: 'JOÃO' }]);
    const u = new URL(chamadas[0].url);
    expect(`${u.origin}${u.pathname}`).toBe(`${CRM.url}/rest/v1/motoristas_salvos`);
    expect(u.searchParams.get('order')).toBe('created_at.desc');
    expect(u.searchParams.get('select')).toContain('leitura');
    expect(chamadas[0].init.headers.Authorization).toBe('Bearer TOKEN');
  });

  it('sessão vencida pede login de novo', async () => {
    const { fn } = fetchFalso([resposta(401, {})]);
    const erro = await motoristasSalvos(SESSAO, { fetchFn: fn }).catch(e => e);
    expect(erro).toBeInstanceOf(ErroCrm);
    expect(erro.sair).toBe(true);
  });

  it('resposta que não é lista é recusada', async () => {
    const { fn } = fetchFalso([resposta(200, { erro: 'x' })]);
    await expect(motoristasSalvos(SESSAO, { fetchFn: fn })).rejects.toThrow('formato inesperado');
  });

  it('marcar como usado só manda a data de uso', async () => {
    const { fn, chamadas } = fetchFalso([resposta(204, null)]);
    await marcarMotoristaUsado(SESSAO, 'abc', { fetchFn: fn, agora: Date.UTC(2026, 10, 19, 12) });
    expect(chamadas[0].url).toBe(`${CRM.url}/rest/v1/motoristas_salvos?id=eq.abc`);
    expect(chamadas[0].init.method).toBe('PATCH');
    expect(chamadas[0].corpo).toEqual({ usado_em: '2026-11-19T12:00:00.000Z' });
  });

  it('excluir apaga só aquele motorista', async () => {
    const { fn, chamadas } = fetchFalso([resposta(204, null)]);
    await excluirMotoristaSalvo(SESSAO, 'a b', { fetchFn: fn });
    expect(chamadas[0].url).toBe(`${CRM.url}/rest/v1/motoristas_salvos?id=eq.a%20b`);
    expect(chamadas[0].init.method).toBe('DELETE');
  });

  it('erro do CRM vira mensagem clara', async () => {
    const { fn } = fetchFalso([resposta(500, {})]);
    await expect(excluirMotoristaSalvo(SESSAO, 'x', { fetchFn: fn })).rejects.toThrow('(500)');
  });
});
