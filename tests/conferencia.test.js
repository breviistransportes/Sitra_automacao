import { describe, it, expect } from 'vitest';
import { conferirComTextoPdf, compararLeituras } from '../src/lib/conferencia.js';

const v = (valor, certeza = 'alta', fonte = 'CRV.pdf') => ({ valor, certeza, fonte });
const CRLV = `CÓDIGO RENAVAM 01234567890 PLACA ABC1D23 EXERCÍCIO 2026 NÚMERO DO CRV 123456789012
MARCA / MODELO / VERSÃO VOLVO/FH 540 CHASSI 9BVAS02D5KE123456 CPF / CNPJ 11.222.333/0001-81 ANO 2019 2020
`.repeat(2);

describe('conferência exata com o texto do CRV/CRLV', () => {
  it('valor que está no texto: confirmado', () => {
    const avisos = [];
    const r = conferirComTextoPdf({ veic_renavam: v('01234567890', 'conferir'), veic_placa: v('ABC-1D23') }, CRLV, avisos);
    expect(r.veic_renavam).toEqual({ valor: '01234567890', certeza: 'alta', fonte: 'CRV.pdf (conferido no texto do PDF)' });
    expect(r.veic_placa.valor).toBe('ABC-1D23');
    expect(avisos).toEqual([]);
  });

  it('um dígito trocado ou invertido: corrige pelo texto, com aviso', () => {
    const avisos = [];
    const r = conferirComTextoPdf({
      veic_renavam: v('01234567809'),          // dois últimos invertidos
      veic_chassi: v('9BVAS02D5KE123465'),
      veic_certificado: v('123456789013'),
      veic_placa: v('ABC-1D28'),
    }, CRLV, avisos);
    expect(r.veic_renavam.valor).toBe('01234567890');
    expect(r.veic_chassi.valor).toBe('9BVAS02D5KE123456');
    expect(r.veic_certificado.valor).toBe('123456789012');
    expect(r.veic_placa.valor).toBe('ABC-1D23');
    expect(r.veic_renavam.fonte).toBe('texto exato do PDF');
    expect(avisos).toContain('RENAVAM: corrigido pelo texto do PDF (01234567809 → 01234567890)');
  });

  it('valor muito diferente de tudo no texto: não corrige, marca para conferir', () => {
    const avisos = [];
    const r = conferirComTextoPdf({ veic_renavam: v('99999999999') }, CRLV, avisos);
    expect(r.veic_renavam).toEqual({ valor: '99999999999', certeza: 'conferir', fonte: 'CRV.pdf' });
    expect(avisos).toContain('RENAVAM: não confere com o texto do PDF — confira');
  });

  it('sem texto de PDF (foto/imagem): não mexe', () => {
    const avisos = [];
    const entrada = { veic_renavam: v('01234567809') };
    expect(conferirComTextoPdf(entrada, 'pouco texto 123', avisos)).toEqual(entrada);
    expect(avisos).toEqual([]);
  });
});

describe('dupla leitura dos números da CNH', () => {
  it('as duas batem: confirma (inclusive o registro, que deixa de ficar amarelo)', () => {
    const avisos = [];
    const r = compararLeituras({ registro_cnh: v('04123456789', 'conferir', 'CNH-e.pdf'), rg: v('0012345678', 'alta', 'CNH-e.pdf') },
      { registro_cnh: '04123456789', rg: 'MG12345678' }, avisos);
    expect(r.registro_cnh).toEqual({ valor: '04123456789', certeza: 'alta', fonte: 'CNH-e.pdf (2 leituras iguais)' });
    expect(r.rg.fonte).toBe('CNH-e.pdf (2 leituras iguais)');
    expect(avisos).toEqual([]);
  });

  it('não batem: amarelo com as duas opções', () => {
    const avisos = [];
    const r = compararLeituras({ registro_cnh: v('04123456789', 'alta', 'CNH-e.pdf'), data_validade_cnh: v('01/02/2033') },
      { registro_cnh: '04123456798', data_validade_cnh: '01/02/2033' }, avisos);
    expect(r.registro_cnh.certeza).toBe('conferir');
    expect(avisos).toContain('Nº Registro CNH: as duas leituras não batem (04123456789 / 04123456798) — confira na CNH');
    expect(r.data_validade_cnh.fonte).toMatch(/2 leituras iguais/);
  });

  it('só a segunda leitura achou: preenche, mas em amarelo', () => {
    const avisos = [];
    const r = compararLeituras({ cpf: v('', 'conferir', '') }, { cpf: '52998224725' }, avisos);
    expect(r.cpf).toEqual({ valor: '529.982.247-25', certeza: 'conferir', fonte: 'segunda leitura' });
  });

  it('segunda leitura vazia ou ausente: não mexe', () => {
    const entrada = { cpf: v('529.982.247-25') };
    expect(compararLeituras(entrada, null, [])).toEqual(entrada);
    expect(compararLeituras(entrada, { cpf: '' }, [])).toEqual(entrada);
  });
});

import { chamarGeminiConferencia, posProcessar, MODELO_CONFERENCIA } from '../src/lib/extrator.js';
import { prepararDocumentos } from '../src/lib/entrada.js';

describe('integração', () => {
  it('segunda leitura usa o modelo Pro e pede só os números da CNH', async () => {
    const chamadas = [];
    const fetchFn = async (url, op) => { chamadas.push({ url, corpo: JSON.parse(op.body) });
      return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"cpf":"52998224725","rg":"","registro_cnh":"04123456789","data_nascimento":"","data_primeira_cnh":"","data_validade_cnh":"","data_emissao_cnh":""}' }] } }] }) }; };
    const r = await chamarGeminiConferencia('K', { textos: [], imagens: [], pdfs: [{ nome: 'CNH-e.pdf', base64: 'A' }] }, fetchFn);
    expect(chamadas[0].url).toContain(MODELO_CONFERENCIA);
    expect(Object.keys(chamadas[0].corpo.generationConfig.responseJsonSchema.properties).sort()).toEqual(['cpf', 'data_emissao_cnh', 'data_nascimento', 'data_primeira_cnh', 'data_validade_cnh', 'registro_cnh', 'rg']);
    expect(r.registro_cnh).toBe('04123456789');
  });

  it('posProcessar aplica dupla leitura e texto do PDF antes das regras', () => {
    const r = posProcessar({ campos: {
      registro_cnh: { valor: '04123456789', certeza: 'alta', fonte: 'CNH-e.pdf' },
      veic_placa: { valor: 'ABC1D28', certeza: 'alta', fonte: 'CRV.pdf' },
    }, documentos_encontrados: [], avisos: [] }, { propriedade: '3', nacionalidade: 'BRASILEIRA' }, {
      segundaLeitura: { registro_cnh: '04123456789' },
      textoPdf: CRLV,
    });
    expect(r.valores.registro_cnh.certeza).toBe('alta');
    expect(r.valores.veic_placa.valor).toBe('ABC-1D23');
    expect(r.valores.placa.valor).toBe('ABC-1D23'); // regra copia a placa já corrigida para o motorista
  });

  it('prepararDocumentos guarda o texto de cada PDF', async () => {
    const d = await prepararDocumentos([{ nome: 'CRV.pdf', tipo: 'pdf', bytes: new TextEncoder().encode('%PDF') }], { lerTextoPdf: async () => 'TEXTO' });
    expect(d.pdfs[0].texto).toBe('TEXTO');
  });
});

import { desempatar, camposDivergentes } from '../src/lib/conferencia.js';

describe('desempate por terceira leitura', () => {
  it('a terceira leitura decide pela maioria (2 de 3), ainda em amarelo', () => {
    const avisos = [];
    const valores = { registro_cnh: { valor: '04123456789', certeza: 'conferir', fonte: 'CNH-e.pdf' } };
    const r = desempatar(valores, { registro_cnh: '04123456798' }, { registro_cnh: '04123456798' }, avisos);
    expect(r.registro_cnh).toEqual({ valor: '04123456798', certeza: 'conferir', fonte: '2 de 3 leituras' });
    expect(avisos).toContain('Nº Registro CNH: 2 de 3 leituras deram 04123456798 (a outra deu 04123456789) — confira na CNH');
  });

  it('três leituras diferentes: mantém e avisa', () => {
    const avisos = [];
    const valores = { rg: { valor: '1234567', certeza: 'conferir', fonte: 'CNH-e.pdf' } };
    const r = desempatar(valores, { rg: '1234576' }, { rg: '1243567' }, avisos);
    expect(r.rg.valor).toBe('1234567');
    expect(avisos.join(' ')).toMatch(/R\.G\.: 3 leituras diferentes/);
  });

  it('campos que já bateram não são tocados', () => {
    const valores = { cpf: { valor: '529.982.247-25', certeza: 'alta', fonte: 'x (2 leituras iguais)' } };
    expect(desempatar(valores, { cpf: '52998224725' }, { cpf: '11111111111' }, [])).toEqual(valores);
  });

  it('camposDivergentes lista o que precisa de desempate', () => {
    expect(camposDivergentes({ cpf: { valor: '529.982.247-25' }, registro_cnh: { valor: '04123456789' } }, { cpf: '52998224725', registro_cnh: '04123456798' })).toEqual(['registro_cnh']);
  });
});

describe('posProcessar com terceira leitura', () => {
  it('divergência resolvida por 2 de 3, sem aviso duplicado', () => {
    const r = posProcessar({ campos: { registro_cnh: { valor: '04123456789', certeza: 'alta', fonte: 'CNH-e.pdf' } }, documentos_encontrados: [], avisos: [] },
      { propriedade: '3', nacionalidade: 'BRASILEIRA' },
      { segundaLeitura: { registro_cnh: '04123456798' }, terceiraLeitura: { registro_cnh: '04123456798' } });
    expect(r.valores.registro_cnh.valor).toBe('04123456798');
    expect(r.avisos.filter(a => a.startsWith('Nº Registro CNH'))).toEqual(['Nº Registro CNH: 2 de 3 leituras deram 04123456798 (a outra deu 04123456789) — confira na CNH']);
  });
});
