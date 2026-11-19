import { describe, it, expect } from 'vitest';
import { leituraCrmValida, pedidoDoCrm } from '../src/lib/leitura-crm.js';
import { posProcessar } from '../src/lib/extrator.js';
import { posProcessarCte } from '../src/lib/extrator-cte.js';
import { posProcessarAntt } from '../src/lib/extrator-antt.js';
import { PADROES } from '../src/lib/config.js';

const campo = (valor, certeza = 'alta', fonte = 'CNH.png') => ({ valor, certeza, fonte });
const LEITURA = {
  campos: { cpf: campo('387.154.290-32'), nome: campo('JOSE CARLOS PEREIRA DA SILVA') },
  veiculos: [{ veic_placa: campo('RTA4B21', 'alta', 'CRLV_cavalo.pdf') }],
  documentos_encontrados: ['CNH', 'CRLV'],
  avisos: ['CNH válida'],
};
const NOTA = {
  campos: {
    remetente_cnpj: campo('11.222.333/0001-81', 'alta', 'nota.pdf'),
    numero_nota: campo('12345', 'alta', 'nota.pdf'),
    peso_bruto: campo('1.250,50', 'alta', 'nota.pdf'),
    cfops: { valor: ['5102'], certeza: 'alta', fonte: 'nota.pdf' },
    outros_cnpjs: { valor: [], certeza: 'alta', fonte: '' },
  },
  documentos_encontrados: ['DANFE'],
  avisos: [],
};
const ANTT = { cpf_cnpj: '38715429032', rntrc: '012345678', encontrou_antt: true };

describe('leituraCrmValida', () => {
  it('aceita a leitura no formato do schema', () => {
    expect(leituraCrmValida(LEITURA)).toBe(true);
    expect(leituraCrmValida(LEITURA, 'cadastro')).toBe(true);
    expect(leituraCrmValida(NOTA, 'cte')).toBe(true);
    expect(leituraCrmValida(ANTT, 'antt')).toBe(true);
  });

  it('recusa o que não bate com o schema', () => {
    expect(leituraCrmValida(null)).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, campos: [] })).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, campos: { cpf: { valor: 123 } } })).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, veiculos: {} })).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, avisos: [1] })).toBe(false);
    expect(leituraCrmValida({ ...LEITURA, documentos_encontrados: undefined })).toBe(false);
  });

  it('não confunde um tipo de leitura com outro', () => {
    expect(leituraCrmValida(NOTA, 'cadastro')).toBe(false);
    expect(leituraCrmValida(LEITURA, 'antt')).toBe(false);
    expect(leituraCrmValida(ANTT, 'cte')).toBe(false);
    expect(leituraCrmValida(LEITURA, 'outro')).toBe(false);
    expect(leituraCrmValida({ ...NOTA, campos: { ...NOTA.campos, cfops: campo('5102') } }, 'cte')).toBe(false);
    expect(leituraCrmValida({ ...ANTT, encontrou_antt: 'sim' }, 'antt')).toBe(false);
  });

  it('a leitura do CRM passa pelo mesmo pós-processamento da leitura do Gemini', () => {
    const r = posProcessar(LEITURA, PADROES, { textoConfiavel: '' });
    expect(r.valores.cpf.valor).toBe('387.154.290-32');
    expect(r.veiculos[0].veic_placa.valor).toBe('RTA-4B21'); // placa no formato do Sitra
    expect(r.documentos).toEqual(['CNH', 'CRLV']);
    expect(posProcessarCte(NOTA).valores.numero_nota.valor).toBe('12345');
    expect(posProcessarAntt(ANTT).rntrc).toBe('012345678');
  });
});

describe('pedidoDoCrm', () => {
  it('lê o formato novo com o tipo de documento', () => {
    expect(pedidoDoCrm({ fonte: 'crm-breviis', tipo: 'usar-leitura', documento: 'cte', leitura: NOTA })).toEqual({ documento: 'cte', leitura: NOTA, mensagens: undefined });
  });

  it('o formato antigo do CRM continua sendo cadastro', () => {
    expect(pedidoDoCrm({ fonte: 'crm-breviis', tipo: 'usar-leitura-cadastro', leitura: LEITURA, mensagens: 'oi' }))
      .toEqual({ documento: 'cadastro', leitura: LEITURA, mensagens: 'oi' });
  });

  it('ignora outras mensagens', () => {
    expect(pedidoDoCrm(null)).toBe(null);
    expect(pedidoDoCrm({ fonte: 'outra', tipo: 'usar-leitura', documento: 'cte' })).toBe(null);
    expect(pedidoDoCrm({ fonte: 'crm-breviis', tipo: 'usar-leitura', documento: 'pedagio' })).toBe(null);
  });
});
