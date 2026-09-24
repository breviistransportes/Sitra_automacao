import JSZip from 'jszip';

const TIPOS = { jpg: 'imagem', jpeg: 'imagem', png: 'imagem', pdf: 'pdf', txt: 'texto', zip: 'zip', rar: 'naoSuportado', '7z': 'naoSuportado' };
const UTEIS = ['imagem', 'pdf', 'texto'];
const MB = 1024 * 1024;

export function classificar(nome) {
  if (!nome.includes('.')) return 'ignorado';
  return TIPOS[nome.split('.').pop().toLowerCase()] ?? 'ignorado';
}

export async function lerEntrada(arquivos) {
  const itens = [], ignorados = [], naoSuportados = [];
  const separar = (nome, tipo, bytes) => {
    if (UTEIS.includes(tipo)) itens.push({ nome, tipo, bytes });
    else if (tipo === 'naoSuportado') naoSuportados.push(nome);
    else ignorados.push(nome);
  };

  for (const a of arquivos) {
    const tipo = classificar(a.name);
    if (tipo !== 'zip') {
      separar(a.name, tipo, UTEIS.includes(tipo) ? new Uint8Array(await a.arrayBuffer()) : null);
      continue;
    }
    let zip;
    try {
      zip = await JSZip.loadAsync(await a.arrayBuffer());
    } catch {
      naoSuportados.push(`${a.name} (zip corrompido)`);
      continue;
    }
    for (const e of Object.values(zip.files)) {
      if (e.dir || e.name.startsWith('__MACOSX/')) continue;
      const nome = e.name.split('/').pop();
      const t = classificar(nome);
      separar(nome, t, UTEIS.includes(t) ? await e.async('uint8array') : null);
    }
  }
  return { itens, ignorados, naoSuportados };
}

export function paraBase64(bytes) {
  let s = '';
  const PEDACO = 0x8000;
  for (let i = 0; i < bytes.length; i += PEDACO) s += String.fromCharCode.apply(null, bytes.subarray(i, i + PEDACO));
  return btoa(s);
}

export function pdfProtegido(bytes) {
  return new TextDecoder('latin1').decode(bytes).includes('/Encrypt');
}

// Há o que ler? Documentos (foto/PDF) ou mensagens coladas pelo operador.
export function temConteudo(docs, mensagens) {
  return docs.imagens.length + docs.pdfs.length > 0 || !!mensagens?.trim();
}

const semRedimensionar =async (bytes, nome) => ({ bytes, mediaType: /\.png$/i.test(nome) ? 'image/png' : 'image/jpeg' });

// Limite de 18 MB (em base64) para caber no envio inline da API do Gemini.
export async function prepararDocumentos(itens, { redimensionar = semRedimensionar, limiteBytes = 18 * MB } = {}) {
  const textos = [], imagens = [], pdfs = [], avisos = [];
  let total = 0;
  // Soma a cada arquivo e para cedo: não adianta redimensionar o resto se já passou do limite.
  const somar = (tamanho) => {
    total += tamanho;
    if (total > limiteBytes) {
      throw new Error(`Os arquivos somam mais de ${Math.round(limiteBytes / MB)} MB. Remova alguns e tente de novo. Se for um .zip da conversa, solte só as fotos e PDFs dos documentos.`);
    }
  };
  for (const it of itens) {
    if (it.tipo === 'texto') {
      const conteudo = new TextDecoder('utf-8').decode(it.bytes);
      somar(it.bytes.length);
      textos.push({ nome: it.nome, conteudo });
    } else if (it.tipo === 'pdf') {
      if (pdfProtegido(it.bytes)) {
        avisos.push(`${it.nome}: PDF protegido por senha — não foi lido`);
        continue;
      }
      const base64 = paraBase64(it.bytes);
      somar(base64.length);
      pdfs.push({ nome: it.nome, base64 });
    } else if (it.tipo === 'imagem') {
      let r;
      try {
        r = await redimensionar(it.bytes, it.nome);
      } catch {
        avisos.push(`${it.nome}: imagem não pôde ser aberta`);
        continue;
      }
      const base64 = paraBase64(r.bytes);
      somar(base64.length);
      imagens.push({ nome: it.nome, mediaType: r.mediaType, base64 });
    }
  }
  return { textos, imagens, pdfs, avisos };
}
