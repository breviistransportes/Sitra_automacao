chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// "Usar na extensão" no CRM: guarda a leitura para o painel importar e tenta abrir o painel na aba do CRM.
const ORIGENS_CRM = ['https://breviisia-crm.w7mwle.easypanel.host'];
chrome.runtime.onMessage.addListener((msg, sender, responder) => {
  if (msg?.tipo !== 'leitura-crm' || !sender.tab || !ORIGENS_CRM.includes(sender.origin)) return;
  // sidePanel.open precisa vir logo após o clique: chamado antes de qualquer await.
  const abrir = chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => true, () => false);
  chrome.storage.session.set({ leituraCrm: { leitura: msg.leitura, mensagens: msg.mensagens, em: Date.now() } })
    .then(() => abrir)
    .then(painelAberto => responder({ ok: true, painelAberto }))
    .catch(e => responder({ ok: false, erro: e.message }));
  return true;
});
