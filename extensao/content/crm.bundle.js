(() => {
  // src/lib/leitura-crm.js
  var ORIGENS_CRM = ["https://breviisia-crm.w7mwle.easypanel.host"];
  var PAGINA_LEITURA_CRM = `${ORIGENS_CRM[0]}/leitura-documentos`;
  var DOCUMENTOS_CRM = ["cadastro", "cte", "antt"];
  var campoValido = (c) => c && typeof c === "object" && typeof c.valor === "string";
  var listaValida = (c) => c && typeof c === "object" && Array.isArray(c.valor) && c.valor.every((v) => typeof v === "string");
  var objeto = (o) => Boolean(o) && typeof o === "object" && !Array.isArray(o);
  var camposValidos = (o) => objeto(o) && Object.values(o).every(campoValido);
  var textos = (a) => Array.isArray(a) && a.every((t) => typeof t === "string");
  function leituraCrmValida(l, documento = "cadastro") {
    if (!l || typeof l !== "object") return false;
    if (documento === "cadastro") {
      return camposValidos(l.campos) && Array.isArray(l.veiculos) && l.veiculos.every(camposValidos) && textos(l.documentos_encontrados) && textos(l.avisos);
    }
    if (documento === "cte") {
      return objeto(l.campos) && Object.entries(l.campos).every(([k, c]) => k === "cfops" || k === "outros_cnpjs" ? listaValida(c) : campoValido(c)) && textos(l.documentos_encontrados) && textos(l.avisos);
    }
    if (documento === "antt") return typeof l.cpf_cnpj === "string" && typeof l.rntrc === "string" && typeof l.encontrou_antt === "boolean";
    return false;
  }
  function pedidoDoCrm(dados) {
    if (dados?.fonte !== "crm-breviis") return null;
    if (dados.tipo === "usar-leitura-cadastro") return { documento: "cadastro", leitura: dados.leitura, mensagens: dados.mensagens };
    if (dados.tipo === "usar-leitura" && DOCUMENTOS_CRM.includes(dados.documento)) return { documento: dados.documento, leitura: dados.leitura, mensagens: dados.mensagens };
    return null;
  }

  // src/content/crm.js
  document.documentElement.dataset.automacaoSitra = "1";
  document.documentElement.dataset.automacaoSitraLeituras = DOCUMENTOS_CRM.join(" ");
  var responder = (dados) => window.postMessage({ fonte: "automacao-sitra", tipo: "leitura-recebida", ...dados }, location.origin);
  window.addEventListener("message", (e) => {
    if (e.source !== window || !ORIGENS_CRM.includes(e.origin)) return;
    const pedido = pedidoDoCrm(e.data);
    if (!pedido) return;
    if (!leituraCrmValida(pedido.leitura, pedido.documento)) {
      responder({ ok: false, erro: "Leitura num formato que a extens\xE3o n\xE3o reconhece." });
      return;
    }
    chrome.runtime.sendMessage({ tipo: "leitura-crm", documento: pedido.documento, leitura: pedido.leitura, mensagens: String(pedido.mensagens ?? "").slice(0, 2e4) }).then((r) => responder(r ?? { ok: false, erro: "A extens\xE3o n\xE3o respondeu." })).catch(() => responder({ ok: false, erro: "A extens\xE3o foi atualizada: recarregue esta p\xE1gina (F5) e tente de novo." }));
  });
})();
