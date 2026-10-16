import { describe, it, expect } from 'vitest';
import { montarCiot, viagensDoCadastro, cnpjNoTextoTerminaEm, ehWebrouter, salvarUltimoCte, lerUltimoCte } from '../src/lib/ciot.js';

const registro = {
  valores: { nome: { valor: 'JOAO DA SILVA' }, cpf: { valor: '529.982.247-25' }, prop_cpf_cnpj: { valor: '529.982.247-25' }, prop_nome: { valor: 'JOAO DA SILVA' }, prop_rntrc: { valor: '012345678' } },
  veiculos: [{ veic_placa: { valor: 'ABC-1D23' }, veic_eixos: { valor: '3' } }, { veic_placa: { valor: 'XYZ-9A87' }, veic_eixos: { valor: '' } }],
};
const cte = {
  destinatario_cnpj: '82.508.433/0001-17', destinatario_nome: 'CLIENTE LTDA', ncm: '7308', peso_bruto: '1.152,00',
  origem_cidade: 'SAO PAULO', origem_uf: 'SP', destino_cidade: 'CONTAGEM', destino_uf: 'MG',
};
const escolhas = { tipo: 'lotacao', contratante: 'breviis1', data_fim: '2026-10-18' };

describe('montarCiot', () => {
  it('junta cadastro, nota e escolhas; início = hoje', () => {
    const { dados, faltando, avisos } = montarCiot({ registro, cte, escolhas, hoje: '15/10/2026' });
    expect(faltando).toEqual([]);
    expect(dados).toMatchObject({
      tipo: 'lotacao', contratante: 'breviis1', data_inicio: '15/10/2026', data_fim: '18/10/2026',
      contratado: { cpf_cnpj: '529.982.247-25', rntrc: '012345678' },
      destinatario: { cpf_cnpj: '82.508.433/0001-17', nome: 'CLIENTE LTDA' }, ncm: '7308', peso: '1.152,00',
      origem: { cidade: 'SAO PAULO', uf: 'SP' }, destino: { cidade: 'CONTAGEM', uf: 'MG' },
      veiculos: [{ placa: 'ABC1D23', eixos: '3' }, { placa: 'XYZ9A87', eixos: '' }],
    });
    expect(avisos.join(' ')).toMatch(/Eixos não lidos/);
  });

  it('lista o que o operador ainda precisa escolher', () => {
    const { faltando } = montarCiot({ registro: null, cte: null, escolhas: {}, hoje: '15/10/2026' });
    expect(faltando).toEqual(['Tipo de operação (lotação ou fracionada)', 'Contratante (Breviis I ou II)', 'Data de fim da viagem',
      'CPF/CNPJ do contratado (cartão da ANTT)', 'RNTRC do contratado (cartão da ANTT)']);
  });

  it('sem cadastro ou sem nota não trava: vira aviso', () => {
    const contratado = { cpf_cnpj: '529.982.247-25', rntrc: '012345678' };
    const { faltando, avisos } = montarCiot({ registro: null, cte: null, escolhas: { ...escolhas, contratado }, hoje: '15/10/2026' });
    expect(faltando).toEqual([]);
    expect(avisos.join(' ')).toMatch(/Sem cadastro do motorista/);
    expect(avisos.join(' ')).toMatch(/Sem nota do CT-e/);
  });

  it('recusa data de fim antes de hoje', () => {
    const { faltando } = montarCiot({ registro, cte, escolhas: { ...escolhas, data_fim: '2026-10-14' }, hoje: '15/10/2026' });
    expect(faltando).toContain('Data de fim antes de hoje');
  });
});

describe('auxiliares do CIOT', () => {
  it('reconhece o final do CNPJ com ou sem máscara', () => {
    expect(cnpjNoTextoTerminaEm('BREVIIS I - 11.222.333/0002-32', '32')).toBe(true);
    expect(cnpjNoTextoTerminaEm('BREVIIS 11222333000372', '32')).toBe(false);
    expect(cnpjNoTextoTerminaEm('BREVIIS 11222333000372', '72')).toBe(true);
    expect(cnpjNoTextoTerminaEm('TELEFONE 3133330032', '32')).toBe(false);
  });

  it('só aceita o Webrouter em https', () => {
    expect(ehWebrouter('https://www.webrouter.com.br/way/?#/ciot')).toBe(true);
    expect(ehWebrouter('https://webrouter.com.br/way/?#/ciot')).toBe(true);
    expect(ehWebrouter('https://app.webrouter.com.br/way')).toBe(true);
    expect(ehWebrouter('https://falsowebrouter.com.br/')).toBe(false);
    expect(ehWebrouter('http://www.webrouter.com.br/way')).toBe(false);
    expect(ehWebrouter('https://webrouter.com.br.evil.com/')).toBe(false);
  });

  it('a última nota vale por 3 dias', async () => {
    const dados = {};
    const storage = { get: async (k) => ({ [k]: dados[k] }), set: async (o) => Object.assign(dados, o) };
    await salvarUltimoCte(cte, { storage, agora: 0 });
    expect((await lerUltimoCte({ storage, agora: 1000 })).valores).toEqual(cte);
    expect(await lerUltimoCte({ storage, agora: 4 * 24 * 60 * 60 * 1000 })).toBeNull();
  });
});

describe('contratado do CIOT (cartão da ANTT)', () => {
  const base = { registro, cte, hoje: '15/10/2026' };
  it('usa o CPF/CNPJ e o RNTRC dos campos do painel, mesmo sem cadastro', () => {
    const { dados, faltando } = montarCiot({ ...base, registro: null, escolhas: { ...escolhas, contratado: { cpf_cnpj: '11.444.777/0001-61', rntrc: '0123 4567 8' } } });
    expect(faltando).toEqual([]);
    expect(dados.contratado).toEqual({ cpf_cnpj: '11.444.777/0001-61', nome: '', rntrc: '012345678' });
  });

  it('CPF/CNPJ e RNTRC são obrigatórios', () => {
    const { faltando } = montarCiot({ ...base, escolhas: { ...escolhas, contratado: { cpf_cnpj: '123', rntrc: '' } } });
    expect(faltando).toEqual(['CPF/CNPJ do contratado (cartão da ANTT)', 'RNTRC do contratado (cartão da ANTT)']);
  });

  it('sem os campos do painel, usa o cadastro (com o nome, se for o mesmo CPF)', () => {
    const { dados } = montarCiot({ ...base, escolhas });
    expect(dados.contratado).toEqual({ cpf_cnpj: '529.982.247-25', nome: 'JOAO DA SILVA', rntrc: '012345678' });
  });
});

describe('CIOT completa com a viagem programada do CRM', () => {
  const viagem = {
    id: 'v1', motorista: 'JOAO DA SILVA', motorista_doc: '52998224725', placa: 'ABC1D23 / XYZ9A87',
    origem: 'Guarulhos/SP', destino: 'Contagem, Minas Gerais', peso_kg: 1152.5, previsao_entrega: '2026-10-20',
    proprietario_nome: 'TRANSPORTES JS LTDA', proprietario_cpf: '82508433000117', proprietario_antt: '12345678',
  };

  it('sem cadastro, sem nota e sem contratado digitado: tudo que falta vem do CRM', () => {
    const { dados, faltando, avisos } = montarCiot({ registro: null, cte: null, viagem, escolhas: { tipo: 'lotacao', contratante: 'breviis1' }, hoje: '15/10/2026' });
    expect(faltando).toEqual([]);
    expect(dados).toMatchObject({
      data_fim: '20/10/2026',
      contratado: { cpf_cnpj: '82.508.433/0001-17', nome: 'TRANSPORTES JS LTDA', rntrc: '12345678' },
      motorista: { nome: 'JOAO DA SILVA', cpf: '529.982.247-25' },
      peso: '1152.5',
      origem: { cidade: 'GUARULHOS', uf: 'SP' }, destino: { cidade: 'CONTAGEM', uf: 'MG' },
      veiculos: [{ placa: 'ABC1D23', eixos: '' }, { placa: 'XYZ9A87', eixos: '' }],
    });
    expect(avisos.join(' ')).toMatch(/Do CRM: .*motorista.*placas.*peso.*origem.*destino.*data de fim.*contratado/i);
    expect(avisos.join(' ')).not.toMatch(/Sem cadastro do motorista|motorista e placas ficam/);
  });

  it('cadastro, nota e painel têm prioridade: o CRM só preenche o que falta', () => {
    const { dados, avisos } = montarCiot({ registro, cte: { ...cte, peso_bruto: '' }, viagem, escolhas, hoje: '15/10/2026' });
    expect(dados.motorista.nome).toBe('JOAO DA SILVA');
    expect(dados.contratado).toMatchObject({ cpf_cnpj: '529.982.247-25', rntrc: '012345678' });
    expect(dados.origem).toEqual({ cidade: 'SAO PAULO', uf: 'SP' });
    expect(dados.data_fim).toBe('18/10/2026');
    expect(dados.veiculos.map(v => v.placa)).toEqual(['ABC1D23', 'XYZ9A87']);
    expect(dados.peso).toBe('1152.5');
    expect(avisos.join(' ')).toMatch(/Do CRM: peso\./);
  });

  it('contratado em branco no painel cai para o CRM; previsão de entrega no passado não vira data de fim', () => {
    const { dados, faltando } = montarCiot({
      registro: null, cte: null, viagem: { ...viagem, previsao_entrega: '2026-10-01' },
      escolhas: { tipo: 'lotacao', contratante: 'breviis1', contratado: { cpf_cnpj: '', rntrc: '' } }, hoje: '15/10/2026',
    });
    expect(dados.contratado.rntrc).toBe('12345678');
    expect(faltando).toEqual(['Data de fim da viagem']);
  });
});

describe('viagensDoCadastro', () => {
  const viagens = [
    { id: 'so-placa', motorista_doc: '', placa: 'XYZ9A87' },
    { id: 'outra', motorista_doc: '11144477735', placa: 'QQQ1Q11' },
    { id: 'mesmo-cpf', motorista_doc: '529.982.247-25', placa: '' },
  ];
  it('acha a viagem do motorista pelo CPF primeiro, depois pela placa', () => {
    expect(viagensDoCadastro(registro, viagens).map(v => v.id)).toEqual(['mesmo-cpf', 'so-placa']);
  });
  it('sem cadastro, não escolhe nenhuma', () => {
    expect(viagensDoCadastro(null, viagens)).toEqual([]);
  });
});
