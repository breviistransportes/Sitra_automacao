import { describe, it, expect } from 'vitest';
import { leituraCrmValida } from '../src/lib/leitura-crm.js';
import { posProcessar } from '../src/lib/extrator.js';
import { PADROES } from '../src/lib/config.js';

const campo = (valor, certeza = 'alta', fonte = 'CNH.png') => ({ valor, certeza, fonte });
const LEITURA = {
  campos: { cpf: campo('387.154.290-32'), nome: campo('JOSE CARLOS PEREIRA DA SILVA') },
  veiculos: [{ veic_placa: campo('RTA4B21', 'alta', 'CRLV_cavalo.pdf') }],
  documentos_encontrados: ['CNH', 'CRLV'],
  avisos: ['CNH válida'],
};

describe('leituraCrmValida', () => {
  it('aceita a leitura no formato do schema', () => {
    expect(leituraCrmValida(LEITURA)).toBe(true);
  });

  it('recusa o que não bate com o schema', () => {
    expect(leituraCrmValida(null)).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, campos: [] })).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, campos: { cpf: { valor: 123 } } })).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, veiculos: {} })).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, avisos: [1] })).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, documentos_encontrados: undefined })).toBe(false);
  });

  it('a leitura do CRM passa pelo mesmo pós-processamento da leitura do Gemini', () => {
    const r = posProcessar(LEITURA, PADROES, { textoConfiavel: '' });
    expect(r.valores.cpf.valor).toBe('387.154.290-32');
    expect(r.veiculos[0].veic_placa.valor).toBe('RTA-4B21'); // placa no formato do Sitra
    expect(r.documentos).toEqual(['CNH', 'CRLV']);
  });
});
