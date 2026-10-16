import { describe, it, expect } from 'vitest';
import { posProcessarAntt, chamarGeminiAntt } from '../src/lib/extrator-antt.js';

describe('leitura do cartão da ANTT', () => {
  it('devolve só CPF/CNPJ formatado e RNTRC', () => {
    expect(posProcessarAntt({ cpf_cnpj: '52998224725', rntrc: 'RNTRC: 012.345.678', encontrou_antt: true }))
      .toEqual({ cpf_cnpj: '529.982.247-25', rntrc: '012345678', avisos: [] });
  });

  it('avisa quando não leu ou o documento não é da ANTT', () => {
    const r = posProcessarAntt({ cpf_cnpj: '', rntrc: '12', encontrou_antt: false });
    expect(r).toMatchObject({ cpf_cnpj: '', rntrc: '' });
    expect(r.avisos.join(' ')).toMatch(/ANTT/);
    expect(r.avisos.join(' ')).toMatch(/RNTRC não lido/);
  });

  it('pede ao Gemini só os dois campos', async () => {
    let corpo;
    const fetchFn = async (_url, init) => {
      corpo = JSON.parse(init.body);
      return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"cpf_cnpj":"52998224725","rntrc":"12345678","encontrou_antt":true}' }] } }] }) };
    };
    const r = await chamarGeminiAntt('chave', { textos: [], imagens: [], pdfs: [] }, fetchFn);
    expect(Object.keys(corpo.generationConfig.responseJsonSchema.properties)).toEqual(['cpf_cnpj', 'rntrc', 'encontrou_antt']);
    expect(r.rntrc).toBe('12345678');
  });
});
