import { describe, it, expect } from 'vitest';
import { opcoesMotoristaCte } from '../src/lib/motorista-cte.js';

const viagens = [
  { id: 't1', cliente_nome: 'CLIENTE A', origem: 'Guarulhos/SP', destino: 'Contagem/MG', motorista: 'JOAO DA SILVA', motorista_doc: '52998224725', placa: 'ABC1D23' },
  { id: 't2', cliente_nome: 'CLIENTE B', origem: 'Guarulhos/SP', destino: 'Curitiba/PR', motorista: 'PEDRO SOUZA', motorista_doc: '111.444.777-35', placa: 'XYZ9A87' },
  { id: 't3', cliente_nome: 'CLIENTE C', origem: 'Guarulhos/SP', destino: 'Recife/PE', motorista: 'SEM CPF', motorista_doc: null, placa: 'KKK1A11' },
];
const historico = [
  { valores: { nome: { valor: 'MARIA LIMA' }, cpf: { valor: '390.533.447-05' } }, veiculos: [{ veic_placa: { valor: 'QWE1R23' } }] },
  { valores: { nome: { valor: 'JOAO DA SILVA' }, cpf: { valor: '529.982.247-25' } }, veiculos: [] },
  { valores: { nome: { valor: 'SEM DOCUMENTO' }, cpf: { valor: '' } }, veiculos: [] },
];

describe('opcoesMotoristaCte', () => {
  it('lista viagens do CRM e cadastros do Histórico que têm CPF, sem repetir CPF', () => {
    const { opcoes } = opcoesMotoristaCte({ viagens, historico, nota: {} });
    expect(opcoes.map(o => [o.fonte, o.cpf])).toEqual([
      ['CRM', '529.982.247-25'],
      ['CRM', '111.444.777-35'],
      ['Histórico', '390.533.447-05'],
    ]);
    expect(opcoes[0].rotulo).toMatch(/JOAO DA SILVA.*Contagem\/MG.*CLIENTE A/);
  });

  it('sugere a única viagem do CRM com o mesmo destino da nota', () => {
    const { opcoes, sugerida } = opcoesMotoristaCte({ viagens, historico, nota: { destino_cidade: 'CURITIBA', destino_uf: 'PR' } });
    expect(opcoes[sugerida].cpf).toBe('111.444.777-35');
  });

  it('não sugere quando o destino bate com mais de uma viagem ou com nenhuma', () => {
    const duas = [...viagens, { ...viagens[1], id: 't4', motorista_doc: '390.533.447-05' }];
    expect(opcoesMotoristaCte({ viagens: duas, historico: [], nota: { destino_cidade: 'Curitiba', destino_uf: 'PR' } }).sugerida).toBe(-1);
    expect(opcoesMotoristaCte({ viagens, historico, nota: { destino_cidade: 'Belém', destino_uf: 'PA' } }).sugerida).toBe(-1);
    expect(opcoesMotoristaCte({ viagens, historico, nota: {} }).sugerida).toBe(-1);
  });

  it('sem CRM e sem Histórico, lista vazia', () => {
    expect(opcoesMotoristaCte({ viagens: null, historico: undefined, nota: null })).toEqual({ opcoes: [], sugerida: -1 });
  });
});
