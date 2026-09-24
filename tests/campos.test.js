import { describe, it, expect } from 'vitest';
import { CAMPOS, CAMPO_POR_CHAVE, UFS, camposDaTela } from '../src/lib/campos.js';

describe('CAMPOS', () => {
  it('tem chaves e ids únicos', () => {
    expect(new Set(CAMPOS.map(c => c.chave)).size).toBe(CAMPOS.length);
    for (const t of ['motorista', 'proprietario', 'veiculo']) {
      const ids = camposDaTela(t).map(c => c.id);
      expect(new Set(ids).size, t).toBe(ids.length);
    }
  });

  it('cobre todos os ids da tabela da spec (motorista)', () => {
    const ids = [
      'txtMotoristaCpf', 'txtMotoristaNome', 'txtCep', 'txtEndereco', 'txtNumero', 'txtComplemento',
      'txtBairro', 'txtUf', 'txtCidade', 'txtDataNascimento', 'txtEstadoCivil', 'txtNomePai', 'txtNomeMae',
      'txtNaturalidadeUf', 'txtNaturalidade', 'txtNacionalidade', 'txtPropriedade', 'txtResidencial',
      'txtCelular', 'txtRg', 'txtUfExp', 'txtOrgExp', 'txtDataExpedicao', 'txtNumeroCnh',
      'txtDataPrimeiraCnh', 'txtDataEmissaoCnh', 'txtDataValidadeCnh', 'txtCategoriaCnh', 'txtEmail', 'txtPlacaVeiculo',
    ];
    expect(camposDaTela('motorista').map(c => c.id).sort()).toEqual([...ids].sort());
  });

  it('mapeia o registro da CNH para txtNumeroCnh (ids trocados no Sitra)', () => {
    expect(CAMPO_POR_CHAVE.registro_cnh.id).toBe('txtNumeroCnh');
    expect(CAMPO_POR_CHAVE.numero_espelho_cnh).toBeUndefined(); // o operador não usa o "Nº CNH" do Sitra
  });

  it('todo campo tem rótulo, grupo e dica', () => {
    for (const c of CAMPOS) {
      expect(c.rotulo, c.chave).toBeTruthy();
      expect(c.grupo, c.chave).toBeTruthy();
      expect(c.dica, c.chave).toBeTruthy();
    }
  });

  it('proprietário cobre os obrigatórios da tela real, inclusive o CIOT', () => {
    const ids = camposDaTela('proprietario').map(c => c.id);
    for (const id of ['txtProprietarioCpfCnpj', 'txtNomeProprietario', 'txtCep', 'txtEndereco', 'txtNumero', 'txtBairro', 'txtUf', 'txtCidade',
      'txtIE', 'txtRG', 'txtOrgExp', 'txtRntrc', 'txtVencimentoRntrc', 'txtNumeroDependentes', 'txtPropriedade', 'txtEmail', 'txtTelefone',
      'txtBanco', 'txtAgencia', 'txtDigito', 'txtContaCorrente', 'txtContaCorrenteDigito', 'txtTpConta']) expect(ids, id).toContain(id);
  });

  it('veículo cobre os obrigatórios da tela real', () => {
    const ids = camposDaTela('veiculo').map(c => c.id);
    for (const id of ['txtPlacaVeiculo', 'txtCpfCnpjProprietario', 'txtTipoVeiculo', 'txtRenavam', 'txtMarca', 'txtModelo', 'txtTipoPropriedade',
      'txtTipoCombustivel', 'txtAnoFabricacao', 'txtAnoModelo', 'txtCorVeiculo', 'txtChassi', 'txtCertificadoPropriedade',
      'txtVencimentoLicenciamento', 'txtVencimentoIPVA']) expect(ids, id).toContain(id);
  });

  it('opções de tipo de veículo usam os ids do Sitra', () => {
    expect(CAMPO_POR_CHAVE.veic_tipo.opcoes).toContainEqual(['8', 'Cavalo']);
    expect(CAMPO_POR_CHAVE.veic_combustivel.opcoes).toContainEqual(['2', 'Diesel']);
  });

  it('UFS tem 27 estados + EX', () => {
    expect(UFS).toHaveLength(28);
    expect(UFS).toContain('SP');
    expect(UFS).toContain('EX');
  });
});
