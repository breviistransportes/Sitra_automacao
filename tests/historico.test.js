import { describe, it, expect } from 'vitest';
import { lerHistorico, salvarNoHistorico, excluirDoHistorico, apagarHistorico, resumoDoRegistro, DIAS_NO_HISTORICO, MAXIMO_NO_HISTORICO } from '../src/lib/historico.js';

// Imita chrome.storage.local (get/set/remove com chaves).
function storageFalso() {
  const dados = {};
  return {
    dados,
    async get(chaves) { return Object.fromEntries([].concat(chaves).filter(k => k in dados).map(k => [k, structuredClone(dados[k])])); },
    async set(obj) { Object.assign(dados, structuredClone(obj)); },
    async remove(chaves) { for (const k of [].concat(chaves)) delete dados[k]; },
  };
}
const c = (valor) => ({ valor, certeza: 'alta', fonte: 'CNH.pdf' });
const registro = (nome, extra = {}) => ({
  valores: { nome: c(nome), cpf: c('529.982.247-25') },
  veiculos: [{ veic_placa: c('ABC-1D23') }, { veic_placa: c('XYZ-9K87') }],
  avisos: ['CNH vence em breve'],
  ...extra,
});
const DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date(2026, 9, 1, 14, 30).getTime();

describe('histórico de cadastros', () => {
  it('guarda um cadastro novo e devolve o id; o mais recente vem primeiro', async () => {
    const s = storageFalso();
    const a = await salvarNoHistorico(registro('ANA'), { storage: s, agora: AGORA, novoId: () => 'a' });
    await salvarNoHistorico(registro('BETO'), { storage: s, agora: AGORA + 1000, novoId: () => 'b' });
    expect(a.id).toBe('a');
    const lista = await lerHistorico({ storage: s, agora: AGORA + 2000 });
    expect(lista.map(r => r.id)).toEqual(['b', 'a']);
    expect(lista[1]).toMatchObject({ criadoEm: AGORA, atualizadoEm: AGORA, valores: { nome: c('ANA') }, avisos: ['CNH vence em breve'] });
  });

  it('atualizar pelo id troca os valores, mantém criadoEm e os avisos', async () => {
    const s = storageFalso();
    await salvarNoHistorico(registro('ANA'), { storage: s, agora: AGORA, novoId: () => 'a' });
    await salvarNoHistorico({ id: 'a', valores: { nome: c('ANA MARIA') }, veiculos: [] }, { storage: s, agora: AGORA + 5000 });
    const [r] = await lerHistorico({ storage: s, agora: AGORA + 6000 });
    expect(r).toMatchObject({ id: 'a', criadoEm: AGORA, atualizadoEm: AGORA + 5000, valores: { nome: c('ANA MARIA') }, avisos: ['CNH vence em breve'] });
  });

  it(`apaga o que passou de ${DIAS_NO_HISTORICO} dias sem uso`, async () => {
    const s = storageFalso();
    await salvarNoHistorico(registro('VELHO'), { storage: s, agora: AGORA - (DIAS_NO_HISTORICO + 1) * DIA, novoId: () => 'v' });
    await salvarNoHistorico(registro('NOVO'), { storage: s, agora: AGORA - 2 * DIA, novoId: () => 'n' });
    expect((await lerHistorico({ storage: s, agora: AGORA })).map(r => r.id)).toEqual(['n']);
    expect(s.dados.historico.map(r => r.id)).toEqual(['n']); // apagado de verdade, não só escondido
  });

  it(`guarda no máximo ${MAXIMO_NO_HISTORICO} cadastros`, async () => {
    const s = storageFalso();
    let i = 0;
    for (; i < MAXIMO_NO_HISTORICO + 3; i++) await salvarNoHistorico(registro(`M${i}`), { storage: s, agora: AGORA + i, novoId: () => `id${i}` });
    const lista = await lerHistorico({ storage: s, agora: AGORA + i });
    expect(lista).toHaveLength(MAXIMO_NO_HISTORICO);
    expect(lista.at(-1).id).toBe('id3');
  });

  it('excluir um e apagar tudo', async () => {
    const s = storageFalso();
    await salvarNoHistorico(registro('ANA'), { storage: s, agora: AGORA, novoId: () => 'a' });
    await salvarNoHistorico(registro('BETO'), { storage: s, agora: AGORA, novoId: () => 'b' });
    await excluirDoHistorico('a', { storage: s, agora: AGORA });
    expect((await lerHistorico({ storage: s, agora: AGORA })).map(r => r.id)).toEqual(['b']);
    await apagarHistorico({ storage: s });
    expect(await lerHistorico({ storage: s, agora: AGORA })).toEqual([]);
  });

  it('histórico ausente ou corrompido vira lista vazia', async () => {
    const s = storageFalso();
    expect(await lerHistorico({ storage: s, agora: AGORA })).toEqual([]);
    s.dados.historico = 'lixo';
    expect(await lerHistorico({ storage: s, agora: AGORA })).toEqual([]);
  });

  it('resumo para a lista: nome, CPF e placas', () => {
    const r = { ...registro('ANA'), atualizadoEm: AGORA };
    expect(resumoDoRegistro(r)).toEqual({ nome: 'ANA', cpf: '529.982.247-25', placas: ['ABC-1D23', 'XYZ-9K87'], quando: '01/10/2026 14:30' });
    expect(resumoDoRegistro({ valores: {}, veiculos: [{}], atualizadoEm: AGORA }).nome).toBe('(sem nome)');
  });
});
