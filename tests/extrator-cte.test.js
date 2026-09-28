import { describe, it, expect } from 'vitest';
import { CAMPOS_CTE, normalizarCampoCte } from '../src/lib/campos-cte.js';
import { INSTRUCOES_CTE, montarSchemaCte, posProcessarCte } from '../src/lib/extrator-cte.js';

const c = (valor, fonte = 'nota.jpg', certeza = 'alta') => ({ valor, fonte, certeza });

describe('campos de CT-e', () => {
  it('tem chaves únicas e IDs reais do Sitra', () => {
    expect(new Set(CAMPOS_CTE.map(x => x.chave)).size).toBe(CAMPOS_CTE.length);
    expect(Object.fromEntries(CAMPOS_CTE.map(x => [x.chave, x.id]))).toMatchObject({
      remetente_cnpj: 'txtRemetenteCpfCnpj', destinatario_cnpj: 'txtDestinatarioCpfCnpj',
      protocolo_autorizacao: 'txtNotasFiscaisChaveNfe', cfop: 'txtNotasFiscaisCfop',
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
  });
});

describe('extração do CT-e', () => {
  it('schema exige só os campos lidos pela IA', () => {
    const schema = montarSchemaCte();
    expect(schema.properties.campos.required).toContain('protocolo_autorizacao');
    expect(schema.properties.campos.required).not.toContain('motorista_cpf');
    expect(schema.properties.campos.required).not.toContain('tomador');
  });

  it('instruções fixam a ordem dos CNPJs e ignoram o terceiro da transportadora', () => {
    expect(INSTRUCOES_CTE).toMatch(/primeiro CNPJ.*remetente/is);
    expect(INSTRUCOES_CTE).toMatch(/segundo CNPJ.*destinatário/is);
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

  it('não troca os dois primeiros CNPJs pelo terceiro', () => {
    const r = posProcessarCte({ campos: {
      remetente_cnpj: c('29.124.070/0001-00'), destinatario_cnpj: c('82.508.433/0001-17'),
      outros_cnpjs: { valor: ['25.143.498/0001-72'], certeza: 'alta', fonte: 'nota.jpg' },
    }, avisos: [], documentos_encontrados: [] });
    expect(r.valores.remetente_cnpj.valor).toBe('29.124.070/0001-00');
    expect(r.valores.destinatario_cnpj.valor).toBe('82.508.433/0001-17');
  });
});
