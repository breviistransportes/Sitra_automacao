import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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

// Lista real do portal (986 praças) e rotas reais: os casos que a regra antiga errava.
describe('pracasNaRota — lista real do Sem Parar', () => {
  const { pracas, rotas } = JSON.parse(readFileSync(new URL('./fixtures/semparar-pracas-rotas.json', import.meta.url), 'utf8'));
  // Polyline com 6 casas (OSRM).
  function decodificar(str) {
    let i = 0, lat = 0, lng = 0;
    const pontos = [];
    while (i < str.length) {
      for (const k of [0, 1]) {
        let b, s = 0, r = 0;
        do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32);
        const d = r & 1 ? ~(r >> 1) : r >> 1;
        if (k === 0) lat += d; else lng += d;
      }
      pontos.push([lat / 1e6, lng / 1e6]);
    }
    return pontos;
  }
  const naRota = (rota) => pracasNaRota(decodificar(rotas[rota]), pracas);

  it('Dutra SP → Rio: as 6 praças, mesmo com a pista "norte" andando para leste', () => {
    expect(ids(naRota('SP-Rio'))).toEqual([8, 447, 10, 12, 14, 16]);
  });

  it('Dutra Rio → SP: as 6 do outro sentido', () => {
    const r = naRota('Rio-SP');
    expect(ids(r)).toEqual([488, 15, 13, 11, 9, 446]);
    // Seropédica tem dois cadastros no mesmo trecho: marca o mais perto e avisa do outro.
    expect(ids(r[0].alternativas)).toEqual([17]);
  });

  it('BR-262 BH → Uberaba: Nova Serrana entra mesmo com a coordenada a ~700 m da pista', () => {
    expect(ids(naRota('bh-uberaba'))).toContain(1117);
    expect(ids(naRota('bh-uberaba'))).not.toContain(1116);
  });

  it('Goiânia → SP: a praça da SP-324 que cruza a Bandeirantes em Itupeva fica só como alternativa', () => {
    const r = naRota('Goiania-SP');
    expect(r).toHaveLength(14);
    expect(ids(r)).not.toContain(53);
    expect(ids(r.find(p => p.identificadorMapa === 55).alternativas)).toEqual([53]);
  });

  it('SP → Curitiba: praças da SP-055 a ~1 km da Régis não entram', () => {
    const r = ids(naRota('SP-Curitiba'));
    expect(r).not.toContain(1128);
    expect(r).not.toContain(1129);
    expect(r).toEqual([249, 254, 261, 321, 259, 251, 252]);
  });

  it('Cuiabá → Goiânia: uma praça de cada par, todas do sentido da viagem', () => {
    expect(ids(naRota('cuiaba-goiania'))).toEqual([639, 636, 635, 1259, 1257, 1255, 1253, 1251, 1140, 1138, 1137, 1134]);
  });

  it('BR-101 Rio → Campos: em Serrinha as duas praças estão a ~90° da pista; a vizinha da mesma rodovia (NORTE) decide', () => {
    const r = naRota('Rio-Campos');
    expect(ids(r)).toEqual([184, 275, 272, 273]);
    expect(r.find(p => p.identificadorMapa === 273).sentidoIncerto).toBeUndefined();
  });

  it('BR-277 Curitiba → Foz: as 9 praças, todas do sentido oeste', () => {
    expect(ids(naRota('Curitiba-FozDoIguacu'))).toEqual([970, 972, 974, 1060, 1062, 1064, 1066, 1068, 1070]);
  });

  it('cadastro com o sentido errado: o par decide (rota contrária ao par certo)', () => {
    const certo = { identificadorMapa: 1, nomePraca: 'LESTE', direcao: 'e', latitude: -17.9, longitude: -51.7, maplinkId: '9' };
    const errado = { identificadorMapa: 2, nomePraca: 'OESTE', direcao: 'se', latitude: -17.9001, longitude: -51.7, maplinkId: '9' };
    expect(ids(pracasNaRota([[-17.9, -51.69], [-17.9, -51.71]], [certo, errado]))).toEqual([2]); // indo para oeste
    expect(ids(pracasNaRota([[-17.9, -51.71], [-17.9, -51.69]], [certo, errado]))).toEqual([1]); // indo para leste
  });
});
