import { describe, it, expect } from 'vitest';
import { lerLinkMaps, decodificarPolyline, pedidoDeRota, ehLinkMaps, buscarTrajeto } from '../src/lib/rota-maps.js';

// Endereço final do link encurtado que um motorista mandou (maps.app.goo.gl → maps.google.com).
const LINK_MOTORISTA = 'https://maps.google.com/maps?geocode=FUaRmP4dPFY4_SnRYaSDgUTOlDGuWzP_CEupmw%3D%3D;FZvV2f4dKGpa_SlNCwWJLrWnADH_gQcghpD67g%3D%3D;FRhfIv8d7RMS_SlV3wC0tw5DkzEVQhi2fEe8WQ%3D%3D;FQlmo_8dLYgG_Smz1yQj-VDdkjFyr2ZVx4-9ig%3D%3D&daddr=Paraopeba,+MG,+35774-000+to:Urua%C3%A7u,+GO,+76400-000+to:Parauapebas,+PA,+68515-000&saddr=S%C3%A3o+Paulo,+SP&dirflg=d&ftid=0x94ce448183a461d1:0x9ba94b08ff335bae;0x92dd50f92324d7b3:0x8abd8fc75566af72&g_st=iw';

describe('lerLinkMaps', () => {
  it('link compartilhado pelo celular: origem, paradas e destino, com as coordenadas do geocode', () => {
    expect(lerLinkMaps(LINK_MOTORISTA)).toEqual([
      { endereco: 'São Paulo, SP', lat: -23.55577, lng: -46.639556 },
      { endereco: 'Paraopeba, MG, 35774-000', lat: -19.278437, lng: -44.406232 },
      { endereco: 'Uruaçu, GO, 76400-000', lat: -14.524648, lng: -49.146899 },
      { endereco: 'Parauapebas, PA, 68515-000', lat: -6.068727, lng: -49.903571 },
    ]);
  });

  it('sem geocode (ou com quantidade diferente de pontos): fica só com os endereços', () => {
    const url = 'https://maps.google.com/maps?saddr=S%C3%A3o+Paulo,+SP&daddr=Campinas,+SP+to:Ribeir%C3%A3o+Preto,+SP&geocode=FUaRmP4dPFY4_SnRYaSDgUTOlDGuWzP_CEupmw%3D%3D';
    expect(lerLinkMaps(url)).toEqual([
      { endereco: 'São Paulo, SP' },
      { endereco: 'Campinas, SP' },
      { endereco: 'Ribeirão Preto, SP' },
    ]);
  });

  it('link do computador (/maps/dir/...): cada trecho do caminho é um ponto', () => {
    const url = 'https://www.google.com/maps/dir/S%C3%A3o+Paulo,+SP/Campinas+-+SP/-22.9,-47.06/@-23.2,-46.8,9z/data=!4m2!4m1!3e0';
    expect(lerLinkMaps(url)).toEqual([
      { endereco: 'São Paulo, SP' },
      { endereco: 'Campinas - SP' },
      { endereco: '-22.9,-47.06', lat: -22.9, lng: -47.06 },
    ]);
  });

  it('link sem rota (só um lugar) ou de outro site: lista vazia', () => {
    expect(lerLinkMaps('https://maps.google.com/maps?q=S%C3%A3o+Paulo')).toEqual([]);
    expect(lerLinkMaps('https://evil.com/maps?saddr=A&daddr=B')).toEqual([]);
    expect(lerLinkMaps('não é link')).toEqual([]);
  });
});

describe('ehLinkMaps', () => {
  it('aceita só links do Google Maps', () => {
    expect(ehLinkMaps('https://maps.app.goo.gl/MPawTk33Wv8DBXfVA?g_st=iw')).toBe(true);
    expect(ehLinkMaps('https://maps.google.com/maps?saddr=A&daddr=B')).toBe(true);
    expect(ehLinkMaps('https://www.google.com/maps/dir/A/B')).toBe(true);
    expect(ehLinkMaps('https://www.google.com/search?q=maps')).toBe(false);
    expect(ehLinkMaps('https://maps.app.goo.gl.evil.com/x')).toBe(false);
    expect(ehLinkMaps('http://maps.app.goo.gl/x')).toBe(false);
  });
});

describe('decodificarPolyline', () => {
  it('exemplo da documentação do Google', () => {
    expect(decodificarPolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
  });
});

describe('pedidoDeRota', () => {
  it('carro, traçado detalhado; usa coordenadas quando houver e endereço quando não', () => {
    const corpo = pedidoDeRota([
      { endereco: 'São Paulo, SP', lat: -23.55577, lng: -46.639556 },
      { endereco: 'Campinas, SP' },
      { endereco: 'Parauapebas, PA', lat: -6.068727, lng: -49.903571 },
    ]);
    expect(corpo).toEqual({
      origin: { location: { latLng: { latitude: -23.55577, longitude: -46.639556 } } },
      destination: { location: { latLng: { latitude: -6.068727, longitude: -49.903571 } } },
      intermediates: [{ address: 'Campinas, SP' }],
      travelMode: 'DRIVE',
      polylineQuality: 'HIGH_QUALITY',
      languageCode: 'pt-BR',
    });
  });
});

describe('buscarTrajeto', () => {
  const resposta = (dados, extra = {}) => ({ ok: true, status: 200, json: async () => dados, ...extra });

  it('segue o link encurtado, pede a rota com a chave e devolve o traçado decodificado', async () => {
    const chamadas = [];
    const fetchFalso = async (url, opcoes) => {
      chamadas.push({ url, opcoes });
      if (url.startsWith('https://maps.app.goo.gl/')) return resposta(null, { url: LINK_MOTORISTA });
      return resposta({ routes: [{ polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }, distanceMeters: 3200000 }] });
    };
    const r = await buscarTrajeto('https://maps.app.goo.gl/MPawTk33Wv8DBXfVA?g_st=iw', 'CHAVE', fetchFalso);
    expect(r.trajeto).toEqual([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
    expect(r.distanciaKm).toBe(3200);
    expect(r.pontos.map(p => p.endereco)).toEqual(['São Paulo, SP', 'Paraopeba, MG, 35774-000', 'Uruaçu, GO, 76400-000', 'Parauapebas, PA, 68515-000']);
    expect(chamadas[0].opcoes).toEqual({ method: 'HEAD' });
    const rotas = chamadas[1];
    expect(rotas.url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
    expect(rotas.opcoes.method).toBe('POST');
    expect(rotas.opcoes.headers['X-Goog-Api-Key']).toBe('CHAVE');
    expect(rotas.opcoes.headers['X-Goog-FieldMask']).toBe('routes.polyline.encodedPolyline,routes.distanceMeters');
    expect(JSON.parse(rotas.opcoes.body).intermediates).toHaveLength(2);
  });

  it('link completo (sem encurtador) não faz a primeira chamada', async () => {
    const urls = [];
    const fetchFalso = async (url) => { urls.push(url); return resposta({ routes: [{ polyline: { encodedPolyline: '_p~iF~ps|U' }, distanceMeters: 1 }] }); };
    await buscarTrajeto(LINK_MOTORISTA, 'CHAVE', fetchFalso);
    expect(urls).toEqual(['https://routes.googleapis.com/directions/v2:computeRoutes']);
  });

  it('link que não é do Maps, ou sem rota: erro claro, sem chamar o Google', async () => {
    let chamou = false;
    const fetchFalso = async () => { chamou = true; return resposta({}); };
    await expect(buscarTrajeto('https://evil.com/x', 'CHAVE', fetchFalso)).rejects.toThrow(/link do Google Maps/);
    await expect(buscarTrajeto('https://maps.google.com/maps?q=Campinas', 'CHAVE', fetchFalso)).rejects.toThrow(/não tem uma rota/);
    expect(chamou).toBe(false);
  });

  it('chave recusada pelo Google: mensagem que diz o que fazer', async () => {
    const fetchFalso = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'Routes API has not been used in project' } }) });
    await expect(buscarTrajeto(LINK_MOTORISTA, 'CHAVE', fetchFalso)).rejects.toThrow(/Chave do Google Maps recusada.*Routes API/);
  });

  it('Google sem rota para os pontos: erro', async () => {
    const fetchFalso = async () => resposta({});
    await expect(buscarTrajeto(LINK_MOTORISTA, 'CHAVE', fetchFalso)).rejects.toThrow(/não encontrou rota/);
  });
});
