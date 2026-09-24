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

describe('v2: proprietário e veículo', () => {
  const padroes = { propriedade: '3', nacionalidade: 'BRASILEIRA' };

  it('schema pede à IA só campos de documento, com opções do Sitra', () => {
    const s = montarSchema();
    const req = s.properties.campos.required;
    expect(req).toContain('prop_cpf_cnpj');
    expect(req).toContain('prop_rntrc');
    expect(req).toContain('veic_chassi');
    expect(req).not.toContain('prop_ie');
    expect(req).not.toContain('prop_banco');
    expect(req).not.toContain('veic_venc_ipva');
    expect(s.properties.campos.properties.veic_tipo.properties.valor.enum).toContain('Cavalo');
    expect(s.properties.campos.properties.veic_tipo.properties.valor.enum).toContain('');
  });

  it('proprietário vem do cartão ANTT; CRV/CRLV só se não houver ANTT', () => {
    expect(INSTRUCOES).toMatch(/proprietário.*cartão.*ANTT/i);
    expect(INSTRUCOES).toMatch(/ANTT prevalece/i);
    expect(CAMPOS_IA.find(c => c.chave === 'prop_cpf_cnpj').dica).toMatch(/ANTT/);
    expect(CAMPOS_IA.find(c => c.chave === 'prop_nome').dica).toMatch(/ANTT/);
  });

  it('instruções cobrem CRV/CRLV e cartão ANTT', () => {
    expect(INSTRUCOES).toContain('CRV');
    expect(INSTRUCOES).toContain('ANTT');
    expect(INSTRUCOES).toContain('veic_tipo');
  });

  it('posProcessar aplica regras e padrões das telas novas', () => {
    const r = posProcessar({
      campos: {
        cpf: { valor: '52998224725', certeza: 'alta', fonte: 'CNH' },
        prop_cpf_cnpj: { valor: '11222333000181', certeza: 'alta', fonte: 'CRV.pdf' },
        veic_tipo: { valor: 'Cavalo', certeza: 'conferir', fonte: 'CRV.pdf' },
        veic_placa: { valor: 'xyz9a87', certeza: 'alta', fonte: 'CRV.pdf' },
      },
      documentos_encontrados: [], avisos: [],
    }, padroes, { hoje: new Date(2026, 8, 24) });
    expect(r.valores.prop_cpf_cnpj.valor).toBe('11.222.333/0001-81');
    expect(r.valores.veic_tipo).toEqual({ valor: '8', certeza: 'conferir', fonte: 'CRV.pdf' });
    expect(r.valores.prop_ie.valor).toBe('ISENTO');
    expect(r.valores.prop_propriedade.valor).toBe('3');
    expect(r.valores.veic_tipo_propriedade.valor).toBe('3');
    expect(r.valores.veic_venc_ipva.valor).toBe('25/09/2026');
    expect(r.valores.placa.valor).toBe('XYZ-9A87');
  });

  it('CNPJ do proprietário inválido vira "conferir" com aviso', () => {
    const r = posProcessar({ campos: { prop_cpf_cnpj: { valor: '11222333000180', certeza: 'alta', fonte: 'CRV' } }, documentos_encontrados: [], avisos: [] }, padroes);
    expect(r.valores.prop_cpf_cnpj.certeza).toBe('conferir');
    expect(r.avisos).toContain('CPF/CNPJ do proprietário não passa na validação — confira');
  });
});

describe('telefone e e-mail só das mensagens', () => {
  const padroes = { propriedade: '3', nacionalidade: 'BRASILEIRA' };
  const bruto = (campos) => ({ campos, documentos_encontrados: [], avisos: [] });

  it('instruções proíbem telefone/e-mail de documentos', () => {
    expect(INSTRUCOES).toMatch(/telefones? e e-mails?[^.]*só das mensagens/i);
  });

  it('descarta telefone/e-mail que vieram de foto ou PDF, com aviso', () => {
    const r = posProcessar(bruto({
      celular: { valor: '(31) 3333-0800', certeza: 'alta', fonte: 'conta_luz.jpg' },
      email: { valor: 'sac@cemig.com.br', certeza: 'alta', fonte: 'Conta Luz.PDF' },
      prop_telefone: { valor: '0800 610 300', certeza: 'alta', fonte: 'ANTT.pdf' },
    }), padroes);
    expect(r.valores.celular).toEqual({ valor: '', certeza: 'conferir', fonte: '' });
    expect(r.valores.email.valor).toBe('');
    expect(r.valores.prop_telefone.valor).toBe('');
    expect(r.avisos).toContain('Celular: ignorado "(31) 3333-0800" de conta_luz.jpg — telefone e e-mail só valem das mensagens');
  });

  it('mantém os que vieram das mensagens ou da conversa, e o proprietário copia o do motorista', () => {
    const r = posProcessar(bruto({
      celular: { valor: '31 99876-5432', certeza: 'alta', fonte: 'mensagem' },
      email: { valor: 'carlos@exemplo.com', certeza: 'alta', fonte: '_chat.txt' },
      prop_telefone: { valor: '0800 610 300', certeza: 'alta', fonte: 'ANTT.pdf' },
    }), padroes);
    expect(r.valores.celular.valor).toBe('(31)99876-5432');
    expect(r.valores.email.valor).toBe('carlos@exemplo.com');
    expect(r.valores.prop_telefone).toEqual({ valor: '(31)99876-5432', certeza: 'alta', fonte: 'motorista' });
  });
});

describe('a IA não pode inventar', () => {
  it('nome do pai e da mãe sempre em amarelo, mesmo com certeza "alta"', () => {
    const r = posProcessar({ campos: {
      nome_pai: { valor: 'JOAO DA SILVA', certeza: 'alta', fonte: 'CNH-e.pdf' },
      nome_mae: { valor: 'MARIA DA SILVA', certeza: 'alta', fonte: 'CNH-e.pdf' },
    }, documentos_encontrados: [], avisos: [] }, { propriedade: '3', nacionalidade: 'BRASILEIRA' });
    expect(r.valores.nome_pai.certeza).toBe('conferir');
    expect(r.valores.nome_mae.certeza).toBe('conferir');
  });

  it('instruções proíbem inventar e mandam copiar letra por letra', () => {
    expect(INSTRUCOES).toMatch(/NUNCA invente/);
    expect(INSTRUCOES).toMatch(/letra por letra/);
    expect(INSTRUCOES).toMatch(/nome_mae.*""/);
  });
});

describe('Nº de Registro da CNH', () => {
  const pp = (campos) => posProcessar({ campos, documentos_encontrados: [], avisos: [] }, { propriedade: '3', nacionalidade: 'BRASILEIRA' });
  const c = (valor) => ({ valor, certeza: 'alta', fonte: 'CNH-e.pdf' });

  it('precisa ter 11 dígitos', () => {
    const r = pp({ registro_cnh: c('123456789') });
    expect(r.valores.registro_cnh.valor).toBe('');
    expect(r.avisos.join(' ')).toMatch(/Nº Registro CNH: valor lido "123456789"/);
  });

  it('não pode ser o CPF nem o número do espelho', () => {
    const r = pp({ cpf: c('52998224725'), registro_cnh: c('52998224725') });
    expect(r.valores.registro_cnh.valor).toBe('');
    expect(r.avisos.join(' ')).toMatch(/Nº Registro CNH.*CPF/);
    const r2 = pp({ numero_espelho_cnh: c('01234567890'), registro_cnh: c('01234567890') });
    expect(r2.valores.registro_cnh.valor).toBe('');
  });

  it('válido fica, mas sempre em amarelo', () => {
    const r = pp({ cpf: c('52998224725'), registro_cnh: c('01234567890') });
    expect(r.valores.registro_cnh).toEqual({ valor: '01234567890', certeza: 'conferir', fonte: 'CNH-e.pdf' });
  });

  it('instruções distinguem o registro dos outros números da CNH', () => {
    expect(INSTRUCOES).toMatch(/registro_cnh.*11 dígitos/);
    expect(INSTRUCOES).toMatch(/RENACH/);
    expect(INSTRUCOES).toMatch(/espelho/);
  });
});

describe('RG pela CNH', () => {
  it('instrução: RG vem do DOC. IDENTIDADE da CNH, só o número', () => {
    expect(INSTRUCOES).toMatch(/rg.*DOC. IDENTIDADE/);
  });
});

describe('filiação e datas da CNH', () => {
  it('instruções: filiação tem pai e mãe; expedição do RG = emissão da CNH', () => {
    expect(INSTRUCOES).toMatch(/FILIAÇÃO.*primeiro nome.*nome_pai/);
    expect(INSTRUCOES).toMatch(/segundo.*nome_mae/);
    expect(INSTRUCOES).not.toMatch(/nunca use datas da CNH/);
    expect(INSTRUCOES).toMatch(/data_expedicao_rg.*DATA EMISSÃO/);
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
    expect(r.valores.estado_civil).toEqual({ valor: 'CASADO', certeza: 'alta', fonte: 'regra' });
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
