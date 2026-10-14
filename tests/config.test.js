import { describe, it, expect } from 'vitest';
import { lerConfig } from '../src/lib/config.js';

const storage = (dados) => ({ get: async (chaves) => Object.fromEntries(chaves.filter(k => k in dados).map(k => [k, dados[k]])) });

describe('lerConfig', () => {
  it('chave do Google Maps (pedágios) fica separada da chave do Gemini', async () => {
    const cfg = await lerConfig(storage({ apiKey: 'GEMINI', mapsKey: 'MAPS' }));
    expect(cfg.apiKey).toBe('GEMINI');
    expect(cfg.mapsKey).toBe('MAPS');
  });

  it('sem chave do Maps salva: texto vazio', async () => {
    expect((await lerConfig(storage({ apiKey: 'GEMINI' }))).mapsKey).toBe('');
  });
});
