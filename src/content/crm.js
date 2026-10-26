// Content script na página do CRM: avisa que a extensão está instalada e repassa ao background
// a leitura enviada pelo botão "Usar na extensão" da aba Leitura de documentos.
import { ORIGENS_CRM, leituraCrmValida } from '../lib/leitura-crm.js';

document.documentElement.dataset.automacaoSitra = '1';

const responder = (dados) => window.postMessage({ fonte: 'automacao-sitra', tipo: 'leitura-recebida', ...dados }, location.origin);

window.addEventListener('message', (e) => {
  if (e.source !== window || !ORIGENS_CRM.includes(e.origin)) return;
  if (e.data?.fonte !== 'crm-breviis' || e.data?.tipo !== 'usar-leitura-cadastro') return;
  if (!leituraCrmValida(e.data.leitura)) { responder({ ok: false, erro: 'Leitura num formato que a extensão não reconhece.' }); return; }
  chrome.runtime.sendMessage({ tipo: 'leitura-crm', leitura: e.data.leitura, mensagens: String(e.data.mensagens ?? '').slice(0, 20000) })
    .then(r => responder(r ?? { ok: false, erro: 'A extensão não respondeu.' }))
    .catch(() => responder({ ok: false, erro: 'A extensão foi atualizada: recarregue esta página (F5) e tente de novo.' }));
});
