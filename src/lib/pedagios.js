// Quais praças do Sem Parar ficam na rota do motorista, e em qual sentido ele passa por elas.
//
// Regras tiradas da lista real do portal (986 praças) cruzada com rotas reais:
// - O sentido gravado (direcao) é o rumo aproximado da pista, não a bússola exata: na Dutra a pista
//   "norte" anda para leste/nordeste (até 75° de diferença). Por isso a tolerância é 85°.
// - Quase toda praça tem o par do outro sentido no mesmo ponto. Do par, entra só a do sentido
//   mais parecido com a rota; o par também salva cadastros com o sentido errado.
// - A coordenada de algumas praças fica longe da pista (Nova Serrana, BR-262: ~700 m). Até 1 km entra
//   se o PAR estiver a até 500 m da rota e o sentido bater bem — praça de outra rodovia não tem isso.
// - Duas praças do mesmo sentido a menos de 2 km no caminho são acesso/via paralela ou cadastro
//   duplicado (Arujá/Rodoanel, Itupeva SP-324 × Bandeirantes, Seropédica): fica a mais perto da rota
//   e a outra vai em "alternativas", para o operador conferir.

const RUMO = { n: 0, ne: 45, e: 90, se: 135, s: 180, so: 225, o: 270, no: 315 };
const M_POR_GRAU_LAT = 110540;
const M_POR_GRAU_LNG = 111320;

export const RAIO_M = 500;
export const RAIO_COM_PAR_M = 1000;
export const TOLERANCIA_GRAUS = 85;
const TOLERANCIA_LONGE_GRAUS = 45;
const PAR_ATE_M = 1500;
// Do par, a melhor só entra acima da tolerância quando a outra está claramente na contramão
// (cadastro com o sentido errado). Rodovia cruzando a rota deixa as duas perto de 90° e não entra.
const CONTRAMAO_GRAUS = 150;
const MESMO_TRECHO_KM = 2;

// Diferença entre dois rumos, de 0 a 180 graus.
function diferencaDeRumo(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Ponto (lat/lng) em metros num plano local centrado em (lat0, lng0). Basta para distâncias de poucos km.
function plano(lat, lng, lat0, lng0) {
  return [(lng - lng0) * M_POR_GRAU_LNG * Math.cos(lat0 * Math.PI / 180), (lat - lat0) * M_POR_GRAU_LAT];
}

function distanciaM(a, b) {
  const [x, y] = plano(b.latitude, b.longitude, a.latitude, a.longitude);
  return Math.hypot(x, y);
}

function comprimentoM([lat1, lng1], [lat2, lng2]) {
  const [x, y] = plano(lat2, lng2, lat1, lng1);
  return Math.hypot(x, y);
}

const rumoDa = (praca) => RUMO[String(praca.direcao ?? '').trim().toLowerCase()];
// Diferença menor que isso entre as duas praças do par = empate (as duas ~90° da rota).
const EMPATE_GRAUS = 30;

// Sentido nominal escrito no nome ("BR101, KM123+050, NORTE, SERRINHA" → NORTE), se houver um só.
function palavraDeSentido(praca) {
  const achadas = [...String(praca?.nomePraca ?? '').toUpperCase().matchAll(/\b(NORTE|SUL|LESTE|OESTE)\b/g)].map(m => m[1]);
  return new Set(achadas).size === 1 ? achadas[0] : null;
}

// Rodovia da praça ("BR101", "BR 277+KM…", "SP 330, …" → BR101, BR277, SP330); nomeRodovia se o nome não disser.
function rodoviaDa(praca) {
  for (const texto of [praca?.nomePraca, praca?.nomeRodovia]) {
    const m = String(texto ?? '').toUpperCase().match(/\b([A-Z]{2,3})[\s-]*(\d{3})\b/);
    if (m) return `${m[1]}${m[2]}`;
  }
  return null;
}
const temCoordenada = (p) => Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude);

// Ponto do trajeto mais perto de cada praça (até `raioM`): distância, rumo da rota ali e posição no caminho.
function projetar(trajeto, pracas, raioM) {
  const inicioM = [0];
  for (let i = 1; i < trajeto.length; i++) inicioM.push(inicioM[i - 1] + comprimentoM(trajeto[i - 1], trajeto[i]));
  const folgaGraus = raioM / M_POR_GRAU_LAT * 1.5;
  // Caixa (com folga) de cada trecho, calculada uma vez: descarta rápido os trechos longe da praça.
  const n = trajeto.length - 1;
  const caixa = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) {
    const [aLat, aLng] = trajeto[i];
    const [bLat, bLng] = trajeto[i + 1];
    caixa[i * 4] = Math.min(aLat, bLat) - folgaGraus;
    caixa[i * 4 + 1] = Math.max(aLat, bLat) + folgaGraus;
    caixa[i * 4 + 2] = Math.min(aLng, bLng) - folgaGraus;
    caixa[i * 4 + 3] = Math.max(aLng, bLng) + folgaGraus;
  }
  const perto = new Map();
  for (const praca of pracas) {
    if (!temCoordenada(praca)) continue;
    const { latitude: lat, longitude: lng } = praca;
    let melhor = null;
    for (let i = 0; i < n; i++) {
      const k = i * 4;
      if (lat < caixa[k] || lat > caixa[k + 1] || lng < caixa[k + 2] || lng > caixa[k + 3]) continue;
      const [aLat, aLng] = trajeto[i];
      const [bLat, bLng] = trajeto[i + 1];
      const [ax, ay] = plano(aLat, aLng, lat, lng);
      const [bx, by] = plano(bLat, bLng, lat, lng);
      const dx = bx - ax, dy = by - ay;
      const tam2 = dx * dx + dy * dy;
      if (tam2 === 0) continue;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / tam2));
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (d > raioM || (melhor && d >= melhor.distanciaM)) continue;
      melhor = { distanciaM: d, rumo: (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360, posicaoM: inicioM[i] + t * Math.sqrt(tam2) };
    }
    if (melhor) perto.set(praca, melhor);
  }
  return perto;
}

// A praça do outro sentido no mesmo ponto: mesmo maplinkId ou sentido oposto, a até PAR_ATE_M.
function parDe(praca, pracas) {
  const rumo = rumoDa(praca);
  let par = null;
  for (const q of pracas) {
    if (q === praca || !temCoordenada(q)) continue;
    const mesmoLink = praca.maplinkId != null && praca.maplinkId !== '' && q.maplinkId === praca.maplinkId;
    const rumoQ = rumoDa(q);
    const oposto = rumo !== undefined && rumoQ !== undefined && diferencaDeRumo(rumo, rumoQ) >= 135;
    if (!mesmoLink && !oposto) continue;
    const d = distanciaM(praca, q);
    if (d <= PAR_ATE_M && (!par || d < par.d)) par = { praca: q, d };
  }
  return par?.praca ?? null;
}

/**
 * trajeto: [[lat, lng], ...] na ordem da viagem. pracas: registros de praca/listar/ativas.
 * Devolve as praças em que o motorista passa, na ordem do caminho, cada uma com distanciaM, kmNaRota
 * e, quando houver, `alternativas` (praças do mesmo sentido no mesmo trecho que ficaram de fora).
 */
export function pracasNaRota(trajeto, pracas, { raioM = RAIO_M, toleranciaGraus = TOLERANCIA_GRAUS } = {}) {
  if (!Array.isArray(trajeto) || trajeto.length < 2) return [];
  const perto = projetar(trajeto, pracas, Math.max(raioM, RAIO_COM_PAR_M));
  const cache = new Map();
  const par = (p) => { if (!cache.has(p)) cache.set(p, parDe(p, pracas)); return cache.get(p); };

  const escolhidas = [];
  for (const [praca, g] of perto) {
    const rumoPraca = rumoDa(praca);
    const semSentido = rumoPraca === undefined;
    const diferenca = semSentido ? 0 : diferencaDeRumo(rumoPraca, g.rumo);
    const seuPar = par(praca);
    const gPar = seuPar && perto.get(seuPar);
    const pertoDoCaminho = g.distanciaM <= raioM
      || (!semSentido && gPar && gPar.distanciaM <= raioM && diferenca <= TOLERANCIA_LONGE_GRAUS);
    if (!pertoDoCaminho) continue;
    if (!semSentido) {
      const rumoPar = seuPar ? rumoDa(seuPar) : undefined;
      if (rumoPar !== undefined) {
        // Do par, só a do sentido mais parecido com a rota (o rumo é o da rota neste ponto).
        const diferencaPar = diferencaDeRumo(rumoPar, g.rumo);
        if (diferenca > diferencaPar || (diferenca === diferencaPar && praca.identificadorMapa > seuPar.identificadorMapa)) continue;
        // Empate (as duas perto de 90°, ex.: Serrinha na BR-101): quem decide é a vizinha da mesma rodovia.
        if (diferencaPar - diferenca < EMPATE_GRAUS) {
          // Rodovia que só cruza a rota: as duas a ~90°, nenhuma dentro da tolerância.
          if (diferenca > toleranciaGraus) continue;
          escolhidas.push({ praca, g, semSentido, incerto: seuPar });
          continue;
        }
        if (diferenca > toleranciaGraus && diferencaPar < CONTRAMAO_GRAUS) continue;
      } else if (diferenca > toleranciaGraus) {
        continue;
      }
    }
    escolhidas.push({ praca, g, semSentido });
  }

  // Desempate: a praça certa da vizinha mais próxima (no caminho) da mesma rodovia diz o sentido nominal
  // (NORTE/SUL/LESTE/OESTE) em que o motorista anda nela. Sem vizinha que diga: fica e vai como sentidoIncerto.
  for (const e of escolhidas.filter(x => x.incerto)) {
    const seuPar = e.incerto;
    const palavras = [palavraDeSentido(e.praca), palavraDeSentido(seuPar)];
    const via = rodoviaDa(e.praca);
    const vizinha = escolhidas
      .filter(x => !x.incerto && via && rodoviaDa(x.praca) === via && palavras.includes(palavraDeSentido(x.praca)))
      .sort((a, b) => Math.abs(a.g.posicaoM - e.g.posicaoM) - Math.abs(b.g.posicaoM - e.g.posicaoM))[0];
    if (!vizinha || !palavras[0] || !palavras[1] || palavras[0] === palavras[1]) { e.sentidoIncerto = true; continue; }
    if (palavraDeSentido(vizinha.praca) === palavras[1]) {
      e.praca = seuPar;
      e.g = perto.get(seuPar) ?? e.g;
    }
  }
  for (const e of escolhidas) delete e.incerto;

  // Mesmo trecho (menos de 2 km no caminho) e mesmo sentido, sem ser o par: fica a mais perto da rota.
  escolhidas.sort((a, b) => a.g.posicaoM - b.g.posicaoM);
  const finais = [];
  for (const atual of escolhidas) {
    const anterior = finais[finais.length - 1];
    if (anterior && (atual.g.posicaoM - anterior.g.posicaoM) / 1000 < MESMO_TRECHO_KM && par(atual.praca) !== anterior.praca) {
      const [fica, sai] = atual.g.distanciaM < anterior.g.distanciaM ? [atual, anterior] : [anterior, atual];
      fica.alternativas = [...(fica.alternativas ?? []), ...(sai.alternativas ?? []), sai];
      delete sai.alternativas;
      finais[finais.length - 1] = fica;
      continue;
    }
    finais.push(atual);
  }

  const saida = ({ praca, g, semSentido, sentidoIncerto }) => ({
    ...praca,
    distanciaM: g.distanciaM,
    kmNaRota: g.posicaoM / 1000,
    ...(semSentido ? { semSentido } : {}),
    ...(sentidoIncerto ? { sentidoIncerto } : {}),
  });
  return finais.map(e => ({
    ...saida(e),
    ...(e.alternativas?.length ? { alternativas: e.alternativas.map(saida) } : {}),
  }));
}

export function ehSemParar(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'portal.sempararempresas.com.br';
  } catch {
    return false;
  }
}
