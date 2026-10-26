(() => {
  // src/lib/leitura-crm.js
  var ORIGENS_CRM = ["https://breviisia-crm.w7mwle.easypanel.host"];
  var campoValido = (c) => c && typeof c === "object" && typeof c.valor === "string";
  var camposValidos = (o) => o && typeof o === "object" && !Array.isArray(o) && Object.values(o).every(campoValido);
  var textos = (a) => Array.isArray(a) && a.every((t) => typeof t === "string");
  function leituraCrmValida(l) {
    return Boolean(l) && camposValidos(l.campos) && Array.isArray(l.veiculos) && l.veiculos.every(camposValidos) && textos(l.documentos_encontrados) && textos(l.avisos);
  }

  // src/content/crm.js
  document.documentElement.dataset.automacaoSitra = "1";
  var responder = (dados) => window.postMessage({ fonte: "automacao-sitra", tipo: "leitura-recebida", ...dados }, location.origin);
  window.addEventListener("message", (e) => {
    if (e.source !== window || !ORIGENS_CRM.includes(e.origin)) return;
    if (e.data?.fonte !== "crm-breviis" || e.data?.tipo !== "usar-leitura-cadastro") return;
    if (!leituraCrmValida(e.data.leitura)) {
      responder({ ok: false, erro: "Leitura num formato que a extens\xE3o n\xE3o reconhece." });
      return;
    }
    chrome.runtime.sendMessage({ tipo: "leitura-crm", leitura: e.data.leitura, mensagens: String(e.data.mensagens ?? "").slice(0, 2e4) }).then((r) => responder(r ?? { ok: false, erro: "A extens\xE3o n\xE3o respondeu." })).catch(() => responder({ ok: false, erro: "A extens\xE3o foi atualizada: recarregue esta p\xE1gina (F5) e tente de novo." }));
  });
})();
