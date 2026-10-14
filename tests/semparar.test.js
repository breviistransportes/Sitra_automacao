// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { instalarSemParar } from '../src/content/semparar.js';

// Lista "Praças/Pórticos selecionados" salva da página real (3 praças marcadas: 207, 377, 210).
const LISTA_REAL = readFileSync(new URL('./fixtures/semparar-selecionadas.html', import.meta.url), 'utf8');
const URL_PRACAS = 'https://www.apisemparar.io/spe-portal/vp-eletronico-bff/praca/listar/ativas';

const PRACAS = [
  { identificadorMapa: 207, nomePraca: 'BR381, KM065+700, NORTE, MAIRIPORÃ - SP', direcao: 'n', latitude: -23.3220119476, longitude: -46.5813980103 },
  { identificadorMapa: 215, nomePraca: 'BR381, KM066+680, SUL, MAIRIPORÃ - SP', direcao: 's', latitude: -23.330818176300003, longitude: -46.5774269104 },
  { identificadorMapa: 210, nomePraca: 'BR381, KM007+300, NORTE, VARGEM - SP', direcao: 'ne', latitude: -22.9111232758, longitude: -46.4253578186 },
  { identificadorMapa: 872, nomePraca: 'PI397, KM25 + 650, NORTE, URUÇUI', direcao: 'n', latitude: -7.746275, longitude: -44.238231 },
  { identificadorMapa: 876, nomePraca: 'PI397, KM25 + 650, SUL, URUÇUI', direcao: 's', latitude: -7.746275, longitude: -44.238231 },
];

// Página com a lista vazia; o "portal" simulado acrescenta um item (mesma marcação do real) a cada clique num marcador.
function montarPagina({ comListaReal = false } = {}) {
  const dom = new JSDOM(`<body>${LISTA_REAL}</body>`, { url: 'https://portal.sempararempresas.com.br/vp-eletronico/rota/cadastrar' });
  const win = dom.window;
  const lista = win.document.querySelector('.pracas-pedagios > div');
  const modelo = lista.querySelector('.item-praca-pedagio').cloneNode(true);
  if (!comListaReal) lista.replaceChildren();
  const adicionarNaLista = (p) => {
    const item = modelo.cloneNode(true);
    item.querySelector('p.text').textContent = `${p.identificadorMapa} - ${p.nomePraca}`;
    lista.append(item);
  };
  return { win, adicionarNaLista, lista };
}

// Google Maps simulado: Marker com getPosition/addListener e google.maps.event.trigger.
function carregarGoogleMaps(win) {
  class LatLng { constructor(lat, lng) { this._lat = lat; this._lng = lng; } lat() { return this._lat; } lng() { return this._lng; } }
  class Marker {
    constructor(opts) { this.opts = opts; this.ouvintes = {}; }
    getPosition() { const p = this.opts.position; return new LatLng(p.lat, p.lng); }
    addListener(ev, fn) { (this.ouvintes[ev] ??= []).push(fn); }
  }
  const event = { trigger: (alvo, ev, ...args) => (alvo.ouvintes?.[ev] ?? []).forEach(fn => fn(...args)) };
  // Como o carregador do Maps: cria window.google e window.google.maps, depois põe as classes.
  win.google = win.google || {};
  win.google.maps = win.google.maps || {};
  win.google.maps.LatLng = LatLng;
  win.google.maps.Marker = Marker;
  win.google.maps.event = event;
}

// O "portal": cria um marcador por praça; clique acrescenta a praça na lista de selecionadas.
function criarMarcadores(win, pracas, adicionarNaLista) {
  return pracas.map(p => {
    const m = new win.google.maps.Marker({ position: { lat: p.latitude, lng: p.longitude } });
    m.addListener('click', () => adicionarNaLista(p));
    return m;
  });
}

describe('instalarSemParar — captura da lista de praças', () => {
  it('guarda a resposta de praca/listar/ativas vinda por XHR', async () => {
    const { win } = montarPagina();
    win.XMLHttpRequest = class {
      open(m, u) { this.url = u; }
      addEventListener(ev, fn) { this.onLoad = fn; }
      send() { this.responseText = JSON.stringify({ dados: PRACAS, erros: null }); this.onLoad?.(); }
    };
    instalarSemParar(win);
    const xhr = new win.XMLHttpRequest();
    xhr.open('GET', URL_PRACAS);
    xhr.send();
    expect(win.__semParar.pracas()).toHaveLength(5);
    expect(win.__semParar.estado().pracas).toBe(5);
  });

  it('guarda a resposta vinda por fetch e não atrapalha a resposta do portal', async () => {
    const { win } = montarPagina();
    win.fetch = async () => new Response(JSON.stringify({ dados: PRACAS }), { status: 200 });
    instalarSemParar(win);
    const r = await win.fetch(URL_PRACAS);
    expect((await r.json()).dados).toHaveLength(5);
    await new Promise(res => setTimeout(res, 0));
    expect(win.__semParar.pracas()).toHaveLength(5);
  });

  it('outras chamadas são ignoradas', async () => {
    const { win } = montarPagina();
    win.fetch = async () => new Response(JSON.stringify({ dados: [{ x: 1 }] }));
    instalarSemParar(win);
    await win.fetch('https://www.apisemparar.io/spe-portal/master-bff/menu');
    await new Promise(res => setTimeout(res, 0));
    expect(win.__semParar.pracas()).toEqual([]);
  });
});

describe('instalarSemParar — marcadores do mapa', () => {
  it('registra os marcadores criados depois que o Google Maps carrega', () => {
    const { win, adicionarNaLista } = montarPagina();
    instalarSemParar(win); // document_start: antes do Maps existir
    carregarGoogleMaps(win);
    criarMarcadores(win, PRACAS, adicionarNaLista);
    expect(win.__semParar.estado().marcadores).toBe(5);
  });

  it('Maps já carregado quando a extensão entra: também registra os novos', () => {
    const { win, adicionarNaLista } = montarPagina();
    carregarGoogleMaps(win);
    instalarSemParar(win);
    criarMarcadores(win, PRACAS, adicionarNaLista);
    expect(win.__semParar.estado().marcadores).toBe(5);
  });
});

describe('instalarSemParar — marcar praças', () => {
  function pronto(opcoes) {
    const pagina = montarPagina(opcoes);
    instalarSemParar(pagina.win);
    carregarGoogleMaps(pagina.win);
    criarMarcadores(pagina.win, PRACAS, pagina.adicionarNaLista);
    return pagina;
  }
  const textos = (lista) => [...lista.querySelectorAll('p.text')].map(p => p.textContent);

  it('clica no marcador de cada praça, na ordem, e confere na lista do portal', async () => {
    const { win, lista } = pronto();
    const r = await win.__semParar.marcar([PRACAS[2], PRACAS[0]]);
    expect(r.map(x => [x.identificadorMapa, x.status])).toEqual([[210, 'ok'], [207, 'ok']]);
    expect(textos(lista)).toEqual(['210 - BR381, KM007+300, NORTE, VARGEM - SP', '207 - BR381, KM065+700, NORTE, MAIRIPORÃ - SP']);
  });

  it('praça que já está na lista não é clicada de novo (o clique tiraria)', async () => {
    const { win, lista } = pronto({ comListaReal: true });
    const r = await win.__semParar.marcar([PRACAS[0]]);
    expect(r[0].status).toBe('ja_estava');
    expect(textos(lista).filter(t => t.startsWith('207 -'))).toHaveLength(1);
  });

  it('dois marcadores no mesmo ponto: não chuta, avisa para marcar à mão', async () => {
    const { win, lista } = pronto();
    const r = await win.__semParar.marcar([PRACAS[3]]);
    expect(r[0].status).toBe('ambiguo');
    expect(textos(lista)).toEqual([]);
  });

  it('praça sem marcador no mapa', async () => {
    const { win } = pronto();
    const r = await win.__semParar.marcar([{ identificadorMapa: 999, nomePraca: 'X', latitude: -10, longitude: -50 }]);
    expect(r[0].status).toBe('sem_marcador');
  });

  it('clique que não muda a lista do portal é relatado', async () => {
    const { win } = pronto();
    const p = PRACAS[1];
    new win.google.maps.Marker({ position: { lat: p.latitude + 0.5, lng: p.longitude } }); // marcador sem clique
    const marcador = { identificadorMapa: 555, nomePraca: 'SEM REAÇÃO', latitude: p.latitude + 0.5, longitude: p.longitude };
    const r = await win.__semParar.marcar([marcador], { esperaMs: 50 });
    expect(r[0].status).toBe('nao_entrou');
  });
});
