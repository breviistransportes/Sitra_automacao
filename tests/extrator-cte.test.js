import { describe, it, expect } from 'vitest';
import { CAMPOS_CTE, normalizarCampoCte } from '../src/lib/campos-cte.js';
import { INSTRUCOES_CTE, montarSchemaCte, posProcessarCte } from '../src/lib/extrator-cte.js';

const c = (valor, fonte = 'nota.jpg', certeza = 'alta') => ({ valor, fonte, certeza });

describe('campos de CT-e', () => {
  it('tem chaves únicas e IDs reais do Sitra', () => {
    expect(new Set(CAMPOS_CTE.map(x => x.chave)).size).toBe(CAMPOS_CTE.length);
    expect(Object.fromEntries(CAMPOS_CTE.map(x => [x.chave, x.id]))).toMatchObject({
      remetente_cnpj: 'txtRemetenteCpfCnpj', destinatario_cnpj: 'txtDestinatarioCpfCnpj',
      chave_acesso: 'txtNotasFiscaisChaveNfe', protocolo_autorizacao: null, cfop: 'txtNotasFiscaisCfop',
      motorista_cpf: 'txtMotoristaCpf', especie: 'txtMercadoriasTransportadasEspecie',
    });
  });

  it('normaliza documentos, moeda, quantidade, peso e data sem inventar', () => {
    const porChave = Object.fromEntries(CAMPOS_CTE.map(x => [x.chave, x]));
    expect(normalizarCampoCte(porChave.remetente_cnpj, '29.124.070/0001-00')).toBe('29.124.070/0001-00');
    expect(normalizarCampoCte(porChave.protocolo_autorizacao, '23226015464554')).toBe('23226015464554');
    expect(normalizarCampoCte(porChave.valor_total, '52.114,47')).toBe('52.114,47');
    expect(normalizarCampoCte(porChave.volume, '8 volumes')).toBe('8');
    expect(normalizarCampoCte(porChave.peso_bruto, '1.152,00 kg')).toBe('1.152,00');
    expect(normalizarCampoCte(porChave.data_emissao, '2026-09-24')).toBe('24/09/2026');
    expect(normalizarCampoCte(porChave.cfop, 'não legível')).toBe('');
    expect(normalizarCampoCte(porChave.chave_acesso, '3526 0929 1240 7000 0100 5500 0000 0078 3110 0000 7833')).toBe('35260929124070000100550000000078311000007833');
    expect(normalizarCampoCte(porChave.chave_acesso, '23226015464554')).toBe('');
  });
});

describe('extração do CT-e', () => {
  it('schema exige só os campos lidos pela IA', () => {
    const schema = montarSchemaCte();
    expect(schema.properties.campos.required).toContain('protocolo_autorizacao');
    expect(schema.properties.campos.required).toContain('chave_acesso');
    expect(schema.properties.campos.required).not.toContain('motorista_cpf');
    expect(schema.properties.campos.required).not.toContain('tomador');
  });

  it('instruções fixam a ordem dos CNPJs e ignoram o terceiro da transportadora', () => {
    expect(INSTRUCOES_CTE).toMatch(/primeiro CPF ou CNPJ.*remetente/is);
    expect(INSTRUCOES_CTE).toMatch(/segundo.*destinatário/is);
    expect(INSTRUCOES_CTE).toMatch(/terceiro.*transportadora/is);
  });

  it('usa o primeiro CFOP, prefere peso bruto e marca múltiplos', () => {
    const r = posProcessarCte({
      campos: {
        remetente_cnpj: c('29.124.070/0001-00'), destinatario_cnpj: c('82.508.433/0001-17'),
        protocolo_autorizacao: c('23226015464554'), numero_nota: c('0000007831'), serie: c('0'),
        cfops: { valor: ['5102', '5405'], certeza: 'alta', fonte: 'nota.jpg' },
        valor_total: c('52.114,47'), volume: c('8'), peso_bruto: c('1.152,00'), peso_liquido: c('1.150,00'), data_emissao: c('24/09/2026'),
      }, documentos_encontrados: ['NF-e'], avisos: [],
    });
    expect(r.valores.cfop.valor).toBe('5102');
    expect(r.valores.cfop.certeza).toBe('conferir');
    expect(r.valores.peso_bruto.valor).toBe('1.152,00');
    expect(r.avisos.join(' ')).toMatch(/mais de um CFOP/i);
    expect(r.valores.especie.valor).toBe('VOL');
  });
  it('instruções distinguem chave de acesso de 44 dígitos do protocolo', () => {
    expect(INSTRUCOES_CTE).toMatch(/chave_acesso.*CHAVE DE ACESSO.*44/is);
  });

  it('chave de acesso com dígito verificador errado vai para conferência', () => {
    const r = posProcessarCte({ campos: { chave_acesso: c('35260929124070000100550000000078311000007834') }, avisos: [], documentos_encontrados: [] });
    expect(r.valores.chave_acesso.certeza).toBe('conferir');
    expect(r.avisos.join(' ')).toMatch(/chave de acesso.*verificador/i);
    const ok = posProcessarCte({ campos: { chave_acesso: c('35260929124070000100550000000078311000007833') }, avisos: [], documentos_encontrados: [] });
    expect(ok.valores.chave_acesso.certeza).toBe('alta');
  });
  it('números: ponto de milhar e formato americano não viram decimais errados', () => {
    const peso = CAMPOS_CTE.find(x => x.chave === 'peso_bruto');
    expect(normalizarCampoCte(peso, '1.152')).toBe('1.152,00');
    expect(normalizarCampoCte(peso, '1152')).toBe('1.152,00');
    expect(normalizarCampoCte(peso, '1152.5')).toBe('1.152,50');
    expect(normalizarCampoCte(peso, '52,114.47')).toBe('52.114,47');
    expect(normalizarCampoCte(peso, '52.114,47')).toBe('52.114,47');
    expect(normalizarCampoCte(peso, '8,5')).toBe('8,50');
  });

  it('CFOP repetido nos itens não gera aviso de múltiplos', () => {
    const r = posProcessarCte({ campos: { cfops: { valor: ['6.108', '6108', '6108'], certeza: 'alta', fonte: 'n' } }, avisos: [], documentos_encontrados: [] });
    expect(r.valores.cfop.valor).toBe('6108');
    expect(r.valores.cfop.certeza).toBe('alta');
    expect(r.avisos.join(' ')).not.toMatch(/CFOP/);
  });

  it('CFOP ilegível conta como outro CFOP e força conferência', () => {
    const r = posProcessarCte({ campos: { cfops: { valor: ['5102', '?'], certeza: 'alta', fonte: 'n' } }, avisos: [], documentos_encontrados: [] });
    expect(r.valores.cfop.valor).toBe('5102');
    expect(r.valores.cfop.certeza).toBe('conferir');
    expect(r.avisos.join(' ')).toMatch(/mais de um CFOP/i);
    expect(INSTRUCOES_CTE).toMatch(/CFOP ilegível.*"?"/is);
  });

  it('remetente/destinatário aceitam CPF de pessoa física', () => {
    const dest = CAMPOS_CTE.find(x => x.chave === 'destinatario_cnpj');
    expect(normalizarCampoCte(dest, '52998224725')).toBe('529.982.247-25');
    expect(INSTRUCOES_CTE).toMatch(/primeiro CPF ou CNPJ/i);
  });

  it('não troca os dois primeiros CNPJs pelo terceiro', () => {
    const r = posProcessarCte({ campos: {
      remetente_cnpj: c('29.124.070/0001-00'), destinatario_cnpj: c('82.508.433/0001-17'),
      outros_cnpjs: { valor: ['25.143.498/0001-72'], certeza: 'alta', fonte: 'nota.jpg' },
    }, avisos: [], documentos_encontrados: [] });
    expect(r.valores.remetente_cnpj.valor).toBe('29.124.070/0001-00');
    expect(r.valores.destinatario_cnpj.valor).toBe('82.508.433/0001-17');
  });
});
