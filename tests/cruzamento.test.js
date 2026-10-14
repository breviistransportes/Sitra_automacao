import { describe, it, expect } from 'vitest';
import { placasDe, cruzarComViagens } from '../src/lib/cruzamento.js';

const viagem = (extra = {}) => ({
  id: 'v1', cliente_nome: 'ACME LTDA', origem: 'GUARULHOS/SP', destino: 'BETIM/MG', data_viagem: '2026-10-03', data_coleta: null,
  motorista: 'José da Silva', motorista_doc: '52998224725', placa: 'ABC1D23 / XYZ9K87', veiculo_tipo: 'Carreta', carroceria: 'Sider',
  ...extra,
});
const docs = (extra = {}) => ({ cpf: '529.982.247-25', nome: 'JOSE DA SILVA', placas: ['ABC-1D23', 'XYZ-9K87'], ...extra });

describe('placasDe', () => {
  it('acha uma ou duas placas, com ou sem separador, antigas e Mercosul', () => {
    expect(placasDe('ABC1D23 / XYZ9K87')).toEqual(['ABC1D23', 'XYZ9K87']);
    expect(placasDe('abc-1234xyz9k87')).toEqual(['ABC1234', 'XYZ9K87']);
    expect(placasDe('')).toEqual([]);
    expect(placasDe(null)).toEqual([]);
  });
});

describe('cruzarComViagens', () => {
  it('tudo batendo: CPF, nome (sem acento/maiúsculas) e as duas placas', () => {
    const [r] = cruzarComViagens(docs(), [viagem()]);
    expect(r.viagem).toEqual({ id: 'v1', cliente: 'ACME LTDA', trajeto: 'GUARULHOS/SP → BETIM/MG', data: '03/10/2026', veiculo: 'Carreta · Sider' });
    expect(r.itens.map(i => [i.rotulo, i.status])).toEqual([['CPF', 'ok'], ['Nome', 'ok'], ['Placa ABC-1D23', 'ok'], ['Placa XYZ-9K87', 'ok']]);
  });

  it('acha pela placa quando o CPF é outro, e aponta a diferença', () => {
    const [r] = cruzarComViagens(docs({ cpf: '111.444.777-35', nome: 'MARIA' }), [viagem()]);
    expect(r.itens.find(i => i.rotulo === 'CPF')).toEqual({ rotulo: 'CPF', crm: '529.982.247-25', documento: '111.444.777-35', status: 'diferente' });
    expect(r.itens.find(i => i.rotulo === 'Nome').status).toBe('diferente');
  });

  it('placa só no CRM ou só nos documentos', () => {
    const [r] = cruzarComViagens(docs({ placas: ['ABC-1D23', 'QWE4R56'] }), [viagem()]);
    expect(r.itens.filter(i => i.rotulo.startsWith('Placa'))).toEqual([
      { rotulo: 'Placa ABC-1D23', crm: 'ABC-1D23', documento: 'ABC-1D23', status: 'ok' },
      { rotulo: 'Placa XYZ-9K87', crm: 'XYZ-9K87', documento: '', status: 'so_crm' },
      { rotulo: 'Placa QWE-4R56', crm: '', documento: 'QWE-4R56', status: 'so_documento' },
    ]);
  });

  it('sem CPF ou nome nos documentos: "sem_dado", não "diferente"', () => {
    const [r] = cruzarComViagens(docs({ cpf: '', nome: '' }), [viagem()]);
    expect(r.itens.find(i => i.rotulo === 'CPF').status).toBe('sem_dado');
    expect(r.itens.find(i => i.rotulo === 'Nome').status).toBe('sem_dado');
  });

  it('viagem do CRM sem CPF ou sem nome: "sem_crm", não "diferente"', () => {
    const [r] = cruzarComViagens(docs(), [viagem({ motorista_doc: '', motorista: null })]);
    expect(r.itens.find(i => i.rotulo === 'CPF')).toEqual({ rotulo: 'CPF', crm: '', documento: '529.982.247-25', status: 'sem_crm' });
    expect(r.itens.find(i => i.rotulo === 'Nome')).toEqual({ rotulo: 'Nome', crm: '', documento: 'JOSE DA SILVA', status: 'sem_crm' });
  });

  it('nenhuma viagem com o CPF ou as placas: lista vazia; CPF que bate vem antes de só placa', () => {
    expect(cruzarComViagens(docs({ cpf: '111.444.777-35', placas: ['QWE4R56'] }), [viagem()])).toEqual([]);
    const r = cruzarComViagens(docs(), [viagem({ id: 'placa', motorista_doc: '11144477735' }), viagem({ id: 'cpf', placa: 'JJJ1J11' })]);
    expect(r.map(x => x.viagem.id)).toEqual(['cpf', 'placa']);
  });

  it('texto do CRM volta como texto puro (o painel usa textContent)', () => {
    const [r] = cruzarComViagens(docs(), [viagem({ cliente_nome: '<img src=x onerror=alert(1)>' })]);
    expect(r.viagem.cliente).toBe('<img src=x onerror=alert(1)>');
  });
});
