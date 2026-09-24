import { describe, it, expect } from 'vitest';
import { CAMPOS, CAMPO_POR_CHAVE, UFS } from '../src/lib/campos.js';

describe('CAMPOS', () => {
  it('tem chaves e ids únicos', () => {
    expect(new Set(CAMPOS.map(c => c.chave)).size).toBe(CAMPOS.length);
    expect(new Set(CAMPOS.map(c => c.id)).size).toBe(CAMPOS.length);
  });

  it('cobre todos os ids da tabela da spec', () => {
    const ids = [
      'txtMotoristaCpf', 'txtMotoristaNome', 'txtCep', 'txtEndereco', 'txtNumero', 'txtComplemento',
      'txtBairro', 'txtUf', 'txtCidade', 'txtDataNascimento', 'txtEstadoCivil', 'txtNomePai', 'txtNomeMae',
      'txtNaturalidadeUf', 'txtNaturalidade', 'txtNacionalidade', 'txtPropriedade', 'txtResidencial',
      'txtCelular', 'txtRg', 'txtUfExp', 'txtOrgExp', 'txtDataExpedicao', 'txtNumeroCnh', 'txtRegistroCNH',
      'txtDataPrimeiraCnh', 'txtDataEmissaoCnh', 'txtDataValidadeCnh', 'txtCategoriaCnh', 'txtEmail',
    ];
    expect(CAMPOS.map(c => c.id).sort()).toEqual([...ids].sort());
  });

  it('mapeia o registro da CNH para txtNumeroCnh (ids trocados no Sitra)', () => {
    expect(CAMPO_POR_CHAVE.registro_cnh.id).toBe('txtNumeroCnh');
    expect(CAMPO_POR_CHAVE.numero_espelho_cnh.id).toBe('txtRegistroCNH');
  });

  it('todo campo tem rótulo, grupo e dica', () => {
    for (const c of CAMPOS) {
      expect(c.rotulo, c.chave).toBeTruthy();
      expect(c.grupo, c.chave).toBeTruthy();
      expect(c.dica, c.chave).toBeTruthy();
    }
  });

  it('UFS tem 27 estados + EX', () => {
    expect(UFS).toHaveLength(28);
    expect(UFS).toContain('SP');
    expect(UFS).toContain('EX');
  });
});
