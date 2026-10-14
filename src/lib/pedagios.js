// Quais praças do Sem Parar ficam na rota do motorista, e em qual sentido ele passa por elas.

const RUMO = { n: 0, ne: 45, e: 90, se: 135, s: 180, so: 225, o: 270, no: 315 };
const M_POR_GRAU_LAT = 110540;
const M_POR_GRAU_LNG = 111320;

// Diferença entre dois rumos, de 0 a 180 graus.
function diferencaDeRumo(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Ponto (lat/lng) em metros num plano local centrado em (lat0, lng0). Basta para distâncias de poucos km.
function plano(lat, lng, lat0, lng0) {
  return [(lng - lng0) * M_POR_GRAU_LNG * Math.cos(lat0 * Math.PI / 180), (lat - lat0) * M_POR_GRAU_LAT];
}

function comprimentoM([lat1, lng1], [lat2, lng2]) {
  const [x, y] = plano(lat2, lng2, lat1, lng1);
  return Math.hypot(x, y);
}

/**
 * trajeto: [[lat, lng], ...] na ordem da viagem. pracas: registros de praca/listar/ativas.
 * Devolve as praças a até `raioM` do trajeto cuja direção de cobrança bate com o rumo da rota
 * naquele ponto (até `toleranciaGraus`), ordenadas pela posição no caminho.
 */
export function pracasNaRota(trajeto, pracas, { raioM = 500, toleranciaGraus = 60 } = {}) {
  if (trajeto.length < 2) return [];
  // km acumulado no início de cada trecho
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

  const achadas = [];
  for (const praca of pracas) {
    const { latitude: lat, longitude: lng } = praca;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
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
      const distanciaM = Math.hypot(ax + t * dx, ay + t * dy);
      if (distanciaM > raioM || (melhor && distanciaM >= melhor.distanciaM)) continue;
      const rumo = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
      melhor = { distanciaM, rumo, posicaoM: inicioM[i] + t * Math.sqrt(tam2) };
    }
    if (!melhor) continue;
    const rumoPraca = RUMO[String(praca.direcao ?? '').trim().toLowerCase()];
    const semSentido = rumoPraca === undefined;
    if (!semSentido && diferencaDeRumo(rumoPraca, melhor.rumo) > toleranciaGraus) continue;
    achadas.push({ ...praca, distanciaM: melhor.distanciaM, kmNaRota: melhor.posicaoM / 1000, ...(semSentido ? { semSentido } : {}) });
  }
  return achadas.sort((a, b) => a.kmNaRota - b.kmNaRota);
}

export function ehSemParar(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'portal.sempararempresas.com.br';
  } catch {
    return false;
  }
}
