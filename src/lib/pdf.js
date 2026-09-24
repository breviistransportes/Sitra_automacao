import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Lê o texto embutido no PDF, sem IA (o CRV/CRLV digital traz os dados como texto exato).
// O worker do pdf.js é copiado para a extensão no build (build.mjs).
export async function textoDoPdf(bytes) {
  GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('sidepanel/pdf.worker.min.mjs');
  const pdf = await getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  try {
    const partes = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const conteudo = await (await pdf.getPage(p)).getTextContent();
      partes.push(conteudo.items.map(i => i.str).join(' '));
    }
    return partes.join('\n');
  } finally {
    await pdf.destroy();
  }
}
