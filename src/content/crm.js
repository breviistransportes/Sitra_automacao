// Content script na página do CRM: avisa que a extensão está instalada (e quais leituras ela importa)
// e repassa ao background a leitura enviada pelo botão "Usar na extensão" da aba Leitura de documentos.
import { ORIGENS_CRM, DOCUMENTOS_CRM, leituraCrmValida, pedidoDoCrm } from '../lib/leitura-crm.js';

document.documentElement.dataset.automacaoSitra = '1';
document.documentElement.dataset.automacaoSitraLeituras = DOCUMENTOS_CRM.join(' ');

const responder = (dados) => window.postMessage({ fonte: 'automacao-sitra', tipo: 'leitura-recebida', ...dados }, location.origin);

window.addEventListener('message', (e) => {
  if (e.source !== window || !ORIGENS_CRM.includes(e.origin)) return;
  const pedido = pedidoDoCrm(e.data);
  if (!pedido) return;
  if (!leituraCrmValida(pedido.leitura, pedido.documento)) { responder({ ok: false, erro: 'Leitura num formato que a extensão não reconhece.' }); return; }
  chrome.runtime.sendMessage({ tipo: 'leitura-crm', documento: pedido.documento, leitura: pedido.leitura, mensagens: String(pedido.mensagens ?? '').slice(0, 20000) })
    .then(r => responder(r ?? { ok: false, erro: 'A extensão não respondeu.' }))
    .catch(() => responder({ ok: false, erro: 'A extensão foi atualizada: recarregue esta página (F5) e tente de novo.' }));
});
