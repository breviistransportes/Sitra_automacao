import { describe, it, expect } from 'vitest';
import { versaoMaior } from '../src/lib/versao.js';

describe('versaoMaior', () => {
  it('compara número a número, aceitando "v" na frente', () => {
    expect(versaoMaior('v0.3.0', '0.2.0')).toBe(true);
    expect(versaoMaior('0.10.0', '0.9.9')).toBe(true);
    expect(versaoMaior('v0.2.0', '0.2.0')).toBe(false);
    expect(versaoMaior('0.1.9', '0.2.0')).toBe(false);
    expect(versaoMaior('1.0', '0.9.9')).toBe(true);
    expect(versaoMaior('lixo', '0.2.0')).toBe(false);
  });
});
