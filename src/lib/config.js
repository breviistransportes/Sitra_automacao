export const PADROES = { propriedade: '3', nacionalidade: 'BRASILEIRA' };

export async function lerConfig(storage = chrome.storage.local) {
  const r = await storage.get(['apiKey', 'padroes']);
  return { apiKey: r.apiKey ?? '', padroes: { ...PADROES, ...(r.padroes ?? {}) } };
}

export async function salvarConfig(cfg, storage = chrome.storage.local) {
  await storage.set(cfg);
}
