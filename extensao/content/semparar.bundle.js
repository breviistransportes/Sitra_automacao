(() => {
  // src/content/semparar.js
  var URL_PRACAS = /\/vp-eletronico-bff\/praca\/listar\/ativas(\?|$)/;
  var MESMO_PONTO_M = 5;
  function quandoExistir(obj, prop, cb) {
    if (obj[prop] !== void 0) {
      cb(obj[prop]);
      return;
    }
    const atual = Object.getOwnPropertyDescriptor(obj, prop);
    if (atual && !atual.configurable) return;
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: true,
      get: () => void 0,
      set(valor) {
        Object.defineProperty(obj, prop, { value: valor, writable: true, configurable: true, enumerable: true });
        cb(valor);
      }
    });
  }
  function instalarSemParar(win) {
    if (win.__semParar) return win.__semParar;
    let pracas = [];
    const marcadores = [];
    const guardarPracas = (texto) => {
      try {
        const dados = JSON.parse(texto)?.dados;
        if (Array.isArray(dados)) pracas = dados;
      } catch {
      }
    };
    if (typeof win.fetch === "function") {
      const fetchOriginal = win.fetch;
      win.fetch = async function(...args) {
        const r = await fetchOriginal.apply(this, args);
        try {
          const url = String(args[0]?.url ?? args[0]);
          if (URL_PRACAS.test(url)) r.clone().text().then(guardarPracas, () => {
          });
        } catch {
        }
        return r;
      };
    }
    const Xhr = win.XMLHttpRequest;
    if (Xhr?.prototype) {
      const abrir = Xhr.prototype.open;
      const enviar = Xhr.prototype.send;
      Xhr.prototype.open = function(metodo, url, ...resto) {
        this.__urlSemParar = String(url);
        return abrir?.call(this, metodo, url, ...resto);
      };
      Xhr.prototype.send = function(...args) {
        if (URL_PRACAS.test(this.__urlSemParar ?? "")) {
          this.addEventListener("load", () => guardarPracas(this.responseText));
        }
        return enviar?.apply(this, args);
      };
    }
    const embrulhar = (Original) => {
      if (typeof Original !== "function" || Original.__semParar) return Original;
      class Marker extends Original {
        constructor(...args) {
          super(...args);
          marcadores.push(this);
        }
      }
      Marker.__semParar = true;
      return Marker;
    };
    const vigiarMaps = (maps) => {
      if (!maps || typeof maps !== "object") return;
      if (maps.Marker !== void 0) {
        maps.Marker = embrulhar(maps.Marker);
        return;
      }
      quandoExistir(maps, "Marker", (M) => {
        maps.Marker = embrulhar(M);
      });
    };
    quandoExistir(win, "google", (g) => {
      if (g && typeof g === "object") quandoExistir(g, "maps", vigiarMaps);
    });
    const vigia = win.setInterval?.(() => {
      const maps = win.google?.maps;
      if (maps?.Marker && !maps.Marker.__semParar) {
        try {
          maps.Marker = embrulhar(maps.Marker);
        } catch {
        }
      }
    }, 20);
    win.setTimeout?.(() => win.clearInterval?.(vigia), 12e4);
    const selecionadas = () => new Set([...win.document.querySelectorAll(".pracas-pedagios .item-praca-pedagio p.text")].map((p) => Number(p.textContent.split(" - ")[0].trim())));
    const distanciaM = (m, lat, lng) => {
      const p = m.getPosition?.();
      if (!p) return Infinity;
      const dLat = (p.lat() - lat) * 110540;
      const dLng = (p.lng() - lng) * 111320 * Math.cos(lat * Math.PI / 180);
      return Math.hypot(dLat, dLng);
    };
    const esperar = (ms) => new Promise((res) => win.setTimeout(res, ms));
    async function marcar(lista, { esperaMs = 3e3 } = {}) {
      const resultado = [];
      for (const praca of lista) {
        const { identificadorMapa: id, nomePraca, latitude, longitude } = praca;
        const item = (status) => resultado.push({ identificadorMapa: id, nomePraca, status });
        if (selecionadas().has(id)) {
          item("ja_estava");
          continue;
        }
        const perto = marcadores.filter((m) => distanciaM(m, latitude, longitude) <= MESMO_PONTO_M);
        if (perto.length === 0) {
          item("sem_marcador");
          continue;
        }
        if (perto.length > 1) {
          item("ambiguo");
          continue;
        }
        const [marcador] = perto;
        win.google.maps.event.trigger(marcador, "click", { latLng: marcador.getPosition(), stop() {
        } });
        let entrou = selecionadas().has(id);
        for (let t = 0; !entrou && t < esperaMs; t += 50) {
          await esperar(50);
          entrou = selecionadas().has(id);
        }
        item(entrou ? "ok" : "nao_entrou");
      }
      return resultado;
    }
    const api = {
      estado: () => ({
        tela: /\/vp-eletronico\/rota\/cadastrar/.test(win.location.pathname) ? "cadastrar_rota" : null,
        pracas: pracas.length,
        marcadores: marcadores.length
      }),
      pracas: () => pracas,
      marcar
    };
    win.__semParar = api;
    return api;
  }

  // src/content/semparar-inicio.js
  instalarSemParar(window);
})();
