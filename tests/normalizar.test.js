import { describe, it, expect } from 'vitest';
import {
  formatarCpf, cpfValido, formatarCep, formatarTelefone, formatarData, formatarUf,
  formatarEstadoCivil, formatarRg, formatarCategoria, formatarEmail, normalizarCampo,
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
});
