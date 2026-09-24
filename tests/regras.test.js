import { describe, it, expect } from 'vitest';
import { aplicarRegras } from '../src/lib/regras.js';
import { CAMPOS } from '../src/lib/campos.js';

const HOJE = new Date(2026, 8, 24, 15, 30); // 24/09/2026 à tarde

// Todos os campos vazios, com alguns valores preenchidos.
function valores(preenchidos) {
  const v = Object.fromEntries(CAMPOS.map(c => [c.chave, { valor: '', certeza: 'conferir', fonte: '' }]));
  for (const [k, valor] of Object.entries(preenchidos)) v[k] = { valor, certeza: 'alta', fonte: 'doc' };
  return v;
}

const MOTORISTA = {
  cpf: '529.982.247-25', nome: 'JOSE DA SILVA', cep: '01310-100', endereco: 'AVENIDA PAULISTA', numero: '1000',
  complemento: 'APARTAMENTO 1234 BLOCO B FUNDOS', bairro: 'BELA VISTA', uf: 'SP', cidade: 'SAO PAULO',
  data_nascimento: '15/03/1985', uf_naturalidade: 'MG', naturalidade: 'BELO HORIZONTE', rg: '123456789', org_exp: 'SSP',
  celular: '(11)98765-4321', email: 'jose@exemplo.com',
};

describe('aplicarRegras', () => {
  it('endereço do proprietário = do motorista (complemento cortado em 20)', () => {
    const r = aplicarRegras(valores({ ...MOTORISTA, prop_cpf_cnpj: '11.222.333/0001-81' }), { hoje: HOJE });
    expect(r.prop_cep.valor).toBe('01310-100');
    expect(r.prop_endereco.valor).toBe('AVENIDA PAULISTA');
    expect(r.prop_uf.valor).toBe('SP');
    expect(r.prop_complemento.valor).toBe('APARTAMENTO 1234 BLO');
    expect(r.prop_cep.fonte).toBe('motorista');
  });

  it('proprietário com o CPF do motorista copia os dados pessoais', () => {
    const r = aplicarRegras(valores({ ...MOTORISTA, prop_cpf_cnpj: '529.982.247-25', prop_nome: 'JOSE S' }), { hoje: HOJE });
    expect(r.prop_nome.valor).toBe('JOSE DA SILVA');
    expect(r.prop_rg.valor).toBe('123456789');
    expect(r.prop_org_exp.valor).toBe('SSP');
    expect(r.prop_data_nascimento.valor).toBe('15/03/1985');
    expect(r.prop_uf_naturalidade.valor).toBe('MG');
    expect(r.prop_naturalidade.valor).toBe('BELO HORIZONTE');
  });

  it('proprietário CNPJ não copia os dados pessoais do motorista', () => {
    const r = aplicarRegras(valores({ ...MOTORISTA, prop_cpf_cnpj: '11.222.333/0001-81', prop_nome: 'TRANSPORTES X LTDA' }), { hoje: HOJE });
    expect(r.prop_nome.valor).toBe('TRANSPORTES X LTDA');
    expect(r.prop_rg.valor).toBe('');
  });

  it('e-mail e telefone do proprietário caem para os do motorista', () => {
    const r = aplicarRegras(valores({ ...MOTORISTA, prop_cpf_cnpj: '11.222.333/0001-81' }), { hoje: HOJE });
    expect(r.prop_email.valor).toBe('jose@exemplo.com');
    expect(r.prop_telefone.valor).toBe('(11)98765-4321');
    const r2 = aplicarRegras(valores({ ...MOTORISTA, prop_email: 'empresa@x.com' }), { hoje: HOJE });
    expect(r2.prop_email.valor).toBe('empresa@x.com');
  });

  it('valores fixos: IE, dependentes e CIOT', () => {
    const r = aplicarRegras(valores({}), { hoje: HOJE });
    expect(r.prop_ie.valor).toBe('ISENTO');
    expect(r.prop_dependentes.valor).toBe('0');
    for (const k of ['prop_banco', 'prop_agencia', 'prop_agencia_digito', 'prop_conta', 'prop_conta_digito']) expect(r[k].valor, k).toBe('0');
    expect(r.prop_tipo_conta.valor).toBe('1');
    expect(r.prop_ie.certeza).toBe('alta');
  });

  it('vencimento RNTRC: o do cartão, senão hoje', () => {
    expect(aplicarRegras(valores({}), { hoje: HOJE }).prop_venc_rntrc.valor).toBe('24/09/2026');
    expect(aplicarRegras(valores({ prop_venc_rntrc: '10/05/2027' }), { hoje: HOJE }).prop_venc_rntrc.valor).toBe('10/05/2027');
  });

  it('veículo: proprietário, vencimentos amanhã (o Sitra recusa hoje), placa no motorista', () => {
    const r = aplicarRegras(valores({ prop_cpf_cnpj: '11.222.333/0001-81', veic_placa: 'XYZ-9A87' }), { hoje: HOJE });
    expect(r.veic_cpf_cnpj_prop.valor).toBe('11.222.333/0001-81');
    expect(r.veic_venc_licenciamento.valor).toBe('25/09/2026');
    expect(r.veic_venc_ipva.valor).toBe('25/09/2026');
    expect(r.placa.valor).toBe('XYZ-9A87');
  });

  it('amanhã vira o mês e o ano', () => {
    const r = aplicarRegras(valores({}), { hoje: new Date(2026, 11, 31) });
    expect(r.veic_venc_ipva.valor).toBe('01/01/2027');
  });

  it('não altera o objeto recebido', () => {
    const v = valores({});
    aplicarRegras(v, { hoje: HOJE });
    expect(v.prop_ie.valor).toBe('');
  });

  it('estado civil é sempre CASADO', () => {
    expect(aplicarRegras(valores({}), { hoje: HOJE }).estado_civil).toEqual({ valor: 'CASADO', certeza: 'alta', fonte: 'regra' });
    expect(aplicarRegras(valores({ estado_civil: 'SOLTEIRO' }), { hoje: HOJE }).estado_civil.valor).toBe('CASADO');
  });

  it('data de expedição do RG = data de emissão da CNH quando não houver outra', () => {
    const r = aplicarRegras(valores({ data_emissao_cnh: '01/02/2023' }), { hoje: HOJE });
    expect(r.data_expedicao_rg).toEqual({ valor: '01/02/2023', certeza: 'alta', fonte: 'CNH (data de emissão)' });
    expect(aplicarRegras(valores({ data_emissao_cnh: '01/02/2023', data_expedicao_rg: '10/01/2005' }), { hoje: HOJE }).data_expedicao_rg.valor).toBe('10/01/2005');
    expect(aplicarRegras(valores({}), { hoje: HOJE }).data_expedicao_rg.valor).toBe('');
  });
});
