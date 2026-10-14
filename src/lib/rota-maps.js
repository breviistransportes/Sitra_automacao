// Rota que o motorista manda pelo Google Maps: link → pontos (origem, paradas, destino) → pedido à Routes API.

const HOSTS_MAPS = ['maps.app.goo.gl', 'maps.google.com', 'www.google.com', 'google.com'];

export function ehLinkMaps(texto) {
  try {
    const u = new URL(texto);
    if (u.protocol !== 'https:' || !HOSTS_MAPS.includes(u.hostname)) return false;
    return u.hostname.endsWith('google.com') && u.hostname !== 'maps.google.com' ? u.pathname.startsWith('/maps') : true;
  } catch {
    return false;
  }
}

const COORDENADA = /^(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/;

function ponto(endereco) {
  const texto = endereco.trim();
  const m = texto.match(COORDENADA);
  return m ? { endereco: texto, lat: Number(m[1]), lng: Number(m[2]) } : { endereco: texto };
}

// Cada item do "geocode" é um protobuf em base64: campo 2 = latitude, campo 3 = longitude (fixed32, milionésimos de grau).
function coordenadaDoGeocode(item) {
  try {
    const bin = atob(decodeURIComponent(item).replace(/-/g, '+').replace(/_/g, '/'));
    const b = Uint8Array.from(bin, c => c.charCodeAt(0));
    const int32 = (i) => new DataView(b.buffer).getInt32(i, true) / 1e6;
    let lat, lng;
    for (let i = 0; i + 5 <= b.length;) {
      const tag = b[i];
      if (tag === 0x15) lat = int32(i + 1);
      else if (tag === 0x1d) lng = int32(i + 1);
      else break;
      i += 5;
    }
    return lat !== undefined && lng !== undefined ? { lat, lng } : null;
  } catch {
    return null;
  }
}

export function lerLinkMaps(texto) {
  if (!ehLinkMaps(texto) || texto.includes('maps.app.goo.gl')) return [];
  const u = new URL(texto);
  let pontos = [];
  const origem = u.searchParams.get('saddr');
  const destinos = u.searchParams.get('daddr');
  if (origem && destinos) {
    pontos = [origem, ...destinos.split(/\s+to:/)].map(ponto);
    const geocode = (u.searchParams.get('geocode') ?? '').split(';').filter(Boolean).map(coordenadaDoGeocode);
    if (geocode.length === pontos.length && geocode.every(Boolean)) {
      pontos = pontos.map((p, i) => ({ ...p, ...geocode[i] }));
    }
  } else if (u.pathname.startsWith('/maps/dir/')) {
    pontos = u.pathname.slice('/maps/dir/'.length).split('/')
      .filter(s => s && !s.startsWith('@') && !s.startsWith('data='))
      .map(s => ponto(decodeURIComponent(s.replace(/\+/g, ' '))));
  }
  return pontos.length >= 2 ? pontos : [];
}

// Polyline codificada do Google (precisão 5) → [[lat, lng], ...].
export function decodificarPolyline(codigo) {
  const pontos = [];
  let i = 0, lat = 0, lng = 0;
  const proximo = () => {
    let resultado = 0, deslocamento = 0, b;
    do {
      b = codigo.charCodeAt(i++) - 63;
      resultado |= (b & 0x1f) << deslocamento;
      deslocamento += 5;
    } while (b >= 0x20);
    return resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
  };
  while (i < codigo.length) {
    lat += proximo();
    lng += proximo();
    pontos.push([lat / 1e5, lng / 1e5]);
  }
  return pontos;
}

function waypoint(p) {
  return p.lat !== undefined ? { location: { latLng: { latitude: p.lat, longitude: p.lng } } } : { address: p.endereco };
}

// Corpo do POST https://routes.googleapis.com/directions/v2:computeRoutes
export function pedidoDeRota(pontos) {
  return {
    origin: waypoint(pontos[0]),
    destination: waypoint(pontos.at(-1)),
    intermediates: pontos.slice(1, -1).map(waypoint),
    travelMode: 'DRIVE',
    polylineQuality: 'HIGH_QUALITY',
    languageCode: 'pt-BR',
  };
}

const ROUTES_API = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// O link encurtado (maps.app.goo.gl) redireciona para o link completo; a página de consentimento guarda o destino em "continue".
async function linkCompleto(link, fetchFn) {
  if (new URL(link).hostname !== 'maps.app.goo.gl') return link;
  const r = await fetchFn(link, { method: 'HEAD' });
  const final = new URL(r.url);
  return final.hostname === 'consent.google.com' ? final.searchParams.get('continue') ?? '' : final.href;
}

export async function buscarTrajeto(link, chave, fetchFn = fetch) {
  const texto = (link ?? '').trim();
  if (!ehLinkMaps(texto)) throw new Error('Cole o link do Google Maps que o motorista mandou.');
  const pontos = lerLinkMaps(await linkCompleto(texto, fetchFn));
  if (pontos.length < 2) throw new Error('O link não tem uma rota (origem e destino). Peça ao motorista o link da rota, não de um lugar.');
  const r = await fetchFn(ROUTES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': chave,
      'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters',
    },
    body: JSON.stringify(pedidoDeRota(pontos)),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detalhe = dados?.error?.message ?? `HTTP ${r.status}`;
    if (r.status === 403 || /api key/i.test(detalhe)) throw new Error(`Chave do Google Maps recusada (confira a chave e se a Routes API está ativada): ${detalhe}`);
    throw new Error(`Falha ao calcular a rota no Google: ${detalhe}`);
  }
  const rota = dados.routes?.[0];
  if (!rota?.polyline?.encodedPolyline) throw new Error('O Google não encontrou rota de carro entre esses pontos.');
  return { pontos, trajeto: decodificarPolyline(rota.polyline.encodedPolyline), distanciaKm: Math.round((rota.distanceMeters ?? 0) / 1000) };
}
