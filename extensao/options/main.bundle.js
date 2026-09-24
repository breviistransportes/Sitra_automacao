// src/lib/config.js
var PADROES = { propriedade: "3", nacionalidade: "BRASILEIRA", emailProprietario: "comercial2@breviis.com.br", telefoneProprietario: "" };
async function lerConfig(storage = chrome.storage.local) {
  const r = await storage.get(["apiKey", "padroes"]);
  return { apiKey: r.apiKey ?? "", padroes: { ...PADROES, ...r.padroes ?? {} } };
}
async function salvarConfig(cfg2, storage = chrome.storage.local) {
  await storage.set(cfg2);
}

// src/options/main.js
var $ = (id) => document.getElementById(id);
var cfg = await lerConfig();
$("apiKey").value = cfg.apiKey;
$("nacionalidade").value = cfg.padroes.nacionalidade;
$("propriedade").value = cfg.padroes.propriedade;
$("salvar").addEventListener("click", async () => {
  await salvarConfig({
    apiKey: $("apiKey").value.trim(),
    padroes: { nacionalidade: $("nacionalidade").value.trim().toUpperCase(), propriedade: $("propriedade").value }
  });
  $("status").textContent = "Salvo.";
});
