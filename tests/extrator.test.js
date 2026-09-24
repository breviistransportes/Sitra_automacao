import { describe, it, expect } from 'vitest';
import { CAMPOS } from '../src/lib/campos.js';
import {
  MODELO, CAMPOS_IA, INSTRUCOES, montarSchema, montarPartes, chamarGemini, posProcessar, ErroExtracao,
} from '../src/lib/extrator.js';

const DOCS = {
  textos: [{ nome: '_chat.txt', conteudo: '+55 11 98765-4321: oi' }],
  imagens: [{ nome: 'comprovante.jpg', mediaType: 'image/jpeg', base64: 'AAA' }],
  pdfs: [{ nome: 'CNH-e.pdf', base64: 'BBB' }],
};

// fetch falso: registra a chamada e devolve { status, corpo }.
const fetchFalso = (corpo, status = 200) => {
  const chamadas = [];
  const fn = async (url, opcoes) => {
    chamadas.push({ url, opcoes, corpo: JSON.parse(opcoes.body) });
    return { ok: status >= 200 && status < 300, status, json: async () => corpo };
  };
  fn.chamadas = chamadas;
  return fn;
};
const respostaGemini = (obj, finishReason = 'STOP') => ({
  candidates: [{ content: { parts: [{ text: 'pensando...', thought: true }, { text: JSON.stringify(obj) }] }, finishReason }],
});

describe('schema e partes', () => {
  it('schema exige todos os campos da IA, sem propriedade', () => {
    const s = montarSchema();
    expect(s.properties.campos.required).toEqual(CAMPOS_IA.map(c => c.chave));
    expect(s.properties.campos.required).not.toContain('propriedade');
    expect(s.properties.campos.properties.cpf.properties.certeza.enum).toEqual(['alta', 'conferir']);
    expect(s.additionalProperties).toBe(false);
  });

  it('cada documento vem precedido do nome do arquivo; depois a conversa', () => {
    const p = montarPartes(DOCS);
    expect(p[0].text).toContain('CNH-e.pdf');
    expect(p[1]).toEqual({ inlineData: { mimeType: 'application/pdf', data: 'BBB' } });
    expect(p[2].text).toContain('comprovante.jpg');
    expect(p[3]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'AAA' } });
    expect(p[4].text).toContain('+55 11 98765-4321');
    expect(p).toHaveLength(6);
  });
});

describe('mensagens coladas pelo operador', () => {
  it('entram como texto antes do pedido final', () => {
    const p = montarPartes({ ...DOCS, mensagens: '  meu cel é 31 98888-7777, sou casado  ' });
    expect(p).toHaveLength(7);
    expect(p[5].text).toContain('Mensagens do motorista');
    expect(p[5].text).toContain('meu cel é 31 98888-7777, sou casado');
    expect(p[6].text).toContain('Extraia');
  });

  it('mensagem vazia não gera parte', () => {
    expect(montarPartes({ ...DOCS, mensagens: '   ' })).toHaveLength(6);
  });

  it('só mensagens, sem documentos', () => {
    const p = montarPartes({ textos: [], imagens: [], pdfs: [], mensagens: 'CPF 529.982.247-25' });
    expect(p.map(x => Object.keys(x)[0])).toEqual(['text', 'text']);
  });

  it('instruções dizem como usar as mensagens', () => {
    expect(INSTRUCOES).toContain('"mensagem"');
    expect(INSTRUCOES).toMatch(/documento prevalece/i);
  });
});

describe('chamarGemini', () => {
  it('envia modelo, chave no cabeçalho, schema; ignora partes de raciocínio', async () => {
    const bruto = { campos: {}, documentos_encontrados: ['CNH-e'], avisos: [] };
    const f = fetchFalso(respostaGemini(bruto));
    expect(await chamarGemini('CHAVE', DOCS, f)).toEqual(bruto);
    const c = f.chamadas[0];
    expect(c.url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`);
    expect(c.url).not.toContain('CHAVE');
    expect(c.opcoes.headers['x-goog-api-key']).toBe('CHAVE');
    expect(c.corpo.generationConfig.responseMimeType).toBe('application/json');
    expect(c.corpo.generationConfig.responseJsonSchema).toEqual(montarSchema());
    expect(c.corpo.systemInstruction.parts[0].text).toContain('Sitra');
    expect(c.corpo.contents[0].role).toBe('user');
  });

  it('erros HTTP viram mensagens em português', async () => {
    await expect(chamarGemini('X', DOCS, fetchFalso({ error: { message: 'API key not valid. Please pass a valid API key.' } }, 400)))
      .rejects.toThrow('Chave da API do Gemini inválida');
    await expect(chamarGemini('X', DOCS, fetchFalso({ error: { message: 'quota' } }, 429))).rejects.toThrow('Limite de uso');
    await expect(chamarGemini('X', DOCS, fetchFalso({ error: { message: 'denied' } }, 403))).rejects.toThrow('permissão');
    await expect(chamarGemini('X', DOCS, fetchFalso({}, 503))).rejects.toThrow('instável');
    await expect(chamarGemini('X', DOCS, fetchFalso({ error: { message: 'bad schema' } }, 400))).rejects.toThrow('bad schema');
  });

  it('sem internet vira ErroExtracao', async () => {
    const f = async () => { throw new TypeError('Failed to fetch'); };
    await expect(chamarGemini('X', DOCS, f)).rejects.toThrow('Sem conexão');
  });

  it('bloqueio, corte e JSON inválido viram ErroExtracao', async () => {
    await expect(chamarGemini('X', DOCS, fetchFalso({ promptFeedback: { blockReason: 'SAFETY' } }))).rejects.toThrow(ErroExtracao);
    await expect(chamarGemini('X', DOCS, fetchFalso(respostaGemini({}, 'MAX_TOKENS')))).rejects.toThrow('cortada');
    await expect(chamarGemini('X', DOCS, fetchFalso(respostaGemini({}, 'SAFETY')))).rejects.toThrow('não concluiu');
    await expect(chamarGemini('X', DOCS, fetchFalso({ candidates: [{ content: { parts: [{ text: 'oi' }] }, finishReason: 'STOP' }] })))
      .rejects.toThrow('formato inesperado');
  });
});

describe('posProcessar', () => {
  const padroes = { propriedade: '3', nacionalidade: 'BRASILEIRA' };
  const campo = (valor, certeza = 'alta', fonte = 'CNH-e.pdf') => ({ valor, certeza, fonte });

  it('normaliza, aplica padrões e copia celular para fone residencial', () => {
    const r = posProcessar({
      campos: { cpf: campo('52998224725'), nome: campo('José da Silva'), celular: campo('11 98765-4321', 'alta', '_chat.txt'), fone_residencial: campo('') },
      documentos_encontrados: ['CNH-e'], avisos: ['comprovante em nome de terceiro'],
    }, padroes);
    expect(r.valores.cpf).toEqual({ valor: '529.982.247-25', certeza: 'alta', fonte: 'CNH-e.pdf' });
    expect(r.valores.nome.valor).toBe('JOSÉ DA SILVA');
    expect(r.valores.propriedade).toEqual({ valor: '3', certeza: 'alta', fonte: 'padrão' });
    expect(r.valores.nacionalidade).toEqual({ valor: 'BRASILEIRA', certeza: 'alta', fonte: 'padrão' });
    expect(r.valores.fone_residencial).toEqual({ valor: '(11)98765-4321', certeza: 'alta', fonte: 'igual ao celular' });
    expect(r.valores.estado_civil).toEqual({ valor: '', certeza: 'conferir', fonte: '' });
    expect(r.documentos).toEqual(['CNH-e']);
    expect(r.avisos).toContain('comprovante em nome de terceiro');
    expect(Object.keys(r.valores).sort()).toEqual(CAMPOS.map(c => c.chave).sort());
  });

  it('valor ilegível vira "conferir" com aviso; CPF inválido também', () => {
    const r = posProcessar({ campos: { data_nascimento: campo('32/13/1990'), cpf: campo('52998224724') }, documentos_encontrados: [], avisos: [] }, padroes);
    expect(r.valores.data_nascimento).toEqual({ valor: '', certeza: 'conferir', fonte: 'CNH-e.pdf' });
    expect(r.avisos).toContain('Data de Nascimento: valor lido "32/13/1990" não está num formato válido');
    expect(r.valores.cpf.certeza).toBe('conferir');
    expect(r.avisos).toContain('CPF lido não passa na validação — confira');
  });

  it('aguenta resposta vazia', () => {
    const r = posProcessar(null, padroes);
    expect(r.valores.cpf).toEqual({ valor: '', certeza: 'conferir', fonte: '' });
  });
});
