import { describe, it, expect } from 'vitest';
import {
  formatarCpf, cpfValido, formatarCep, formatarTelefone, formatarData, formatarUf,
  formatarEstadoCivil, formatarRg, formatarCategoria, formatarEmail, normalizarCampo,
  formatarCpfCnpj, cnpjValido, cpfCnpjValido, formatarPlaca, formatarAno,
} from '../src/lib/normalizar.js';
import { CAMPO_POR_CHAVE } from '../src/lib/campos.js';

describe('normalizar', () => {
  it('CPF', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(formatarCpf('529.982.247-25')).toBe('529.982.247-25');
    expect(formatarCpf('123')).toBe('');
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('529.982.247-24')).toBe(false);
  });

  it('CEP', () => {
    expect(formatarCep('01310100')).toBe('01310-100');
    expect(formatarCep('01310-100')).toBe('01310-100');
    expect(formatarCep('0131')).toBe('');
  });

  it('telefone sem espaço (máscara do Sitra, maxlength 14)', () => {
    expect(formatarTelefone('11987654321')).toBe('(11)98765-4321');
    expect(formatarTelefone('(11) 98765-4321')).toBe('(11)98765-4321');
    expect(formatarTelefone('+55 11 98765-4321')).toBe('(11)98765-4321');
    expect(formatarTelefone('1133334444')).toBe('(11)3333-4444');
    expect(formatarTelefone('98765-4321')).toBe('');
    expect(formatarTelefone('(11) 98765-4321').length).toBeLessThanOrEqual(14);
  });

  it('data', () => {
    expect(formatarData('15/03/1985')).toBe('15/03/1985');
    expect(formatarData('1/2/1990')).toBe('01/02/1990');
    expect(formatarData('15-03-1985')).toBe('15/03/1985');
    expect(formatarData('1985-03-15')).toBe('15/03/1985');
    expect(formatarData('31/02/2020')).toBe('');
    expect(formatarData('ontem')).toBe('');
  });

  it('UF', () => {
    expect(formatarUf('sp')).toBe('SP');
    expect(formatarUf(' mg ')).toBe('MG');
    expect(formatarUf('São Paulo')).toBe('');
  });

  it('estado civil cabe em 9 caracteres', () => {
    expect(formatarEstadoCivil('solteiro')).toBe('SOLTEIRO');
    expect(formatarEstadoCivil('Casada')).toBe('CASADO');
    expect(formatarEstadoCivil('DIVORCIADO')).toBe('DIVORC.');
    expect(formatarEstadoCivil('viúva')).toBe('VIUVO');
    expect(formatarEstadoCivil('separado judicialmente')).toBe('SEPARADO');
    expect(formatarEstadoCivil('união estável')).toBe('UNIAO EST');
    expect(formatarEstadoCivil('')).toBe('');
  });

  it('RG, categoria, e-mail', () => {
    expect(formatarRg('12.345.678-x')).toBe('12345678X');
    expect(formatarCategoria('a e')).toBe('AE');
    expect(formatarCategoria('D')).toBe('D');
    expect(formatarEmail(' Jose@Exemplo.com ')).toBe('jose@exemplo.com');
    expect(formatarEmail('jose@')).toBe('');
  });

  it('normalizarCampo usa o tipo e corta no max', () => {
    expect(normalizarCampo(CAMPO_POR_CHAVE.nome, '  josé   da silva ')).toBe('JOSÉ DA SILVA');
    expect(normalizarCampo(CAMPO_POR_CHAVE.nome_pai, 'A'.repeat(60))).toHaveLength(40);
    expect(normalizarCampo(CAMPO_POR_CHAVE.registro_cnh, '012.345.678-90')).toBe('01234567890');
    expect(normalizarCampo(CAMPO_POR_CHAVE.propriedade, '3')).toBe('3');
    expect(normalizarCampo(CAMPO_POR_CHAVE.propriedade, 'Terceiro')).toBe('');
    expect(normalizarCampo(CAMPO_POR_CHAVE.celular, undefined)).toBe('');
  });

  it('CPF/CNPJ na máscara do Sitra', () => {
    expect(formatarCpfCnpj('52998224725')).toBe('529.982.247-25');
    expect(formatarCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatarCpfCnpj('123')).toBe('');
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.222.333/0001-80')).toBe(false);
    expect(cpfCnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cpfCnpjValido('529.982.247-25')).toBe(true);
  });

  it('placa antiga e Mercosul em SSS-0A00', () => {
    expect(formatarPlaca('xyz9a87')).toBe('XYZ-9A87');
    expect(formatarPlaca('ABC 1D23')).toBe('ABC-1D23');
    expect(formatarPlaca('AB1234')).toBe('');
  });

  it('ano com 4 dígitos e plausível', () => {
    expect(formatarAno('2019')).toBe('2019');
    expect(formatarAno('19')).toBe('');
    expect(formatarAno('1800')).toBe('');
  });

  it('opção aceita id ou rótulo sem acento', () => {
    expect(normalizarCampo(CAMPO_POR_CHAVE.veic_tipo, 'cavalo')).toBe('8');
    expect(normalizarCampo(CAMPO_POR_CHAVE.veic_tipo, '8')).toBe('8');
    expect(normalizarCampo(CAMPO_POR_CHAVE.veic_tipo, 'Caminhao')).toBe('1');
    expect(normalizarCampo(CAMPO_POR_CHAVE.veic_combustivel, 'DIESEL S10')).toBe('9');
    expect(normalizarCampo(CAMPO_POR_CHAVE.veic_tipo, 'CAMINHAO TRATOR')).toBe('');
  });

  it('chassi sem espaços, maiúsculo', () => {
    expect(normalizarCampo(CAMPO_POR_CHAVE.veic_chassi, '9bm 958074 cb123456')).toBe('9BM958074CB123456');
  });

  it('RNTRC: o Sitra pede os 9 últimos dígitos', () => {
    expect(normalizarCampo(CAMPO_POR_CHAVE.prop_rntrc, '012345678')).toBe('012345678');
    expect(normalizarCampo(CAMPO_POR_CHAVE.prop_rntrc, '000.012.345.678')).toBe('012345678');
    expect(normalizarCampo(CAMPO_POR_CHAVE.prop_rntrc, '12345678')).toBe('12345678');
  });
});

describe('RG da CNH (DOC. IDENTIDADE)', () => {
  it('as 2 letras do início viram 00', () => {
    expect(normalizarCampo(CAMPO_POR_CHAVE.rg, 'MG12345678')).toBe('0012345678');
    expect(normalizarCampo(CAMPO_POR_CHAVE.rg, 'mg-12.345.678')).toBe('0012345678');
    expect(normalizarCampo(CAMPO_POR_CHAVE.rg, 'SP 1234567')).toBe('001234567');
    expect(normalizarCampo(CAMPO_POR_CHAVE.prop_rg, 'MG12345678')).toBe('0012345678');
  });

  it('sem letras no início, fica como está', () => {
    expect(normalizarCampo(CAMPO_POR_CHAVE.rg, '12.345.678-X')).toBe('12345678X');
    expect(normalizarCampo(CAMPO_POR_CHAVE.rg, 'M1234567')).toBe('M1234567');
  });
});
