import { describe, it, expect } from 'vitest';
import { pracasNaRota } from '../src/lib/pedagios.js';

// Registros reais de vp-eletronico-bff/praca/listar/ativas (só os campos usados).
const P = {
  mairiporaN: { identificadorMapa: 207, nomePraca: 'BR381, KM065+700, NORTE, MAIRIPORÃ - SP', direcao: 'n', latitude: -23.3220119476, longitude: -46.5813980103 },
  mairiporaS: { identificadorMapa: 215, nomePraca: 'BR381, KM066+680, SUL, MAIRIPORÃ - SP', direcao: 's', latitude: -23.330818176300003, longitude: -46.5774269104 },
  vargemN: { identificadorMapa: 210, nomePraca: 'BR381, KM007+300, NORTE, VARGEM - SP', direcao: 'ne', latitude: -22.9111232758, longitude: -46.4253578186 },
  vargemS: { identificadorMapa: 218, nomePraca: 'BR381, KM007+300, SUL, VARGEM - SP', direcao: 'so', latitude: -22.9110050201, longitude: -46.4257545471 },
  atibaiaN: { identificadorMapa: 376, nomePraca: 'SP065, KM79+900, NORTE, ATIBAIA', direcao: 'o', latitude: -23.0956668854, longitude: -46.6242713928 },
  atibaiaS: { identificadorMapa: 377, nomePraca: 'SP065, KM79+900, SUL, ATIBAIA', direcao: 'e', latitude: -23.0957508087, longitude: -46.624286651599995 },
  // Par com a MESMA coordenada nos dois sentidos (acontece na lista real).
  urucuiN: { identificadorMapa: 872, nomePraca: 'PI397, KM25 + 650, NORTE, URUÇUI', direcao: 'n', latitude: -7.746275, longitude: -44.238231 },
  urucuiS: { identificadorMapa: 876, nomePraca: 'PI397, KM25 + 650, SUL, URUÇUI', direcao: 's', latitude: -7.746275, longitude: -44.238231 },
};
const TODAS = Object.values(P);
const ids = (lista) => lista.map(p => p.identificadorMapa);
const ponto = (p) => [p.latitude, p.longitude];

// São Paulo → Fernão Dias sentido Minas, passando pelas duas praças.
const SP_PARA_MINAS = [[-23.45, -46.60], ponto(P.mairiporaS), ponto(P.mairiporaN), ponto(P.vargemN), [-22.70, -46.20]];

describe('pracasNaRota', () => {
  it('pega só as praças do sentido da viagem, na ordem do caminho', () => {
    expect(ids(pracasNaRota(SP_PARA_MINAS, TODAS))).toEqual([207, 210]);
  });

  it('na volta pega as do outro sentido', () => {
    expect(ids(pracasNaRota([...SP_PARA_MINAS].reverse(), TODAS))).toEqual([218, 215]);
  });

  it('praça longe da rota fica de fora (Dom Pedro I a ~12 km)', () => {
    const r = ids(pracasNaRota(SP_PARA_MINAS, TODAS));
    expect(r).not.toContain(376);
    expect(r).not.toContain(377);
  });

  it('rota que cruza a rodovia (perpendicular) não pega a praça', () => {
    const cruzando = [[-23.3220119476, -46.62], [-23.3220119476, -46.54]];
    expect(pracasNaRota(cruzando, TODAS)).toEqual([]);
  });

  it('estrada paralela a mais de 500 m não pega a praça', () => {
    const paralela = [[-23.45, -46.565], [-23.20, -46.565]]; // ~1,6 km a leste de Mairiporã
    expect(pracasNaRota(paralela, TODAS)).toEqual([]);
  });

  it('par com a mesma coordenada: decide pelo sentido', () => {
    expect(ids(pracasNaRota([[-7.80, -44.238231], [-7.70, -44.238231]], TODAS))).toEqual([872]);
    expect(ids(pracasNaRota([[-7.70, -44.238231], [-7.80, -44.238231]], TODAS))).toEqual([876]);
  });

  it('devolve a distância até a praça e o km do caminho', () => {
    const [primeira] = pracasNaRota(SP_PARA_MINAS, TODAS);
    expect(primeira.distanciaM).toBeLessThan(1);
    expect(primeira.kmNaRota).toBeGreaterThan(14);
    expect(primeira.kmNaRota).toBeLessThan(16);
  });

  it('praça sem coordenada é ignorada; sem direção entra marcada como "semSentido"', () => {
    const semCoord = { ...P.vargemN, identificadorMapa: 1, latitude: null, longitude: null };
    const semDirecao = { ...P.vargemN, identificadorMapa: 2, direcao: null };
    const r = pracasNaRota(SP_PARA_MINAS, [semCoord, semDirecao]);
    expect(ids(r)).toEqual([2]);
    expect(r[0].semSentido).toBe(true);
  });

  it('trajeto vazio ou com um ponto só: nada', () => {
    expect(pracasNaRota([], TODAS)).toEqual([]);
    expect(pracasNaRota([[-23.3220119476, -46.5813980103]], TODAS)).toEqual([]);
  });
});
