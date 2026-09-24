import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { classificar, lerEntrada, prepararDocumentos, paraBase64, pdfProtegido } from '../src/lib/entrada.js';

const arq = (name, conteudo) => ({
  name,
  arrayBuffer: async () => (typeof conteudo === 'string' ? new TextEncoder().encode(conteudo) : conteudo.slice()).buffer,
});

describe('classificar', () => {
  it('por extensão', () => {
    expect(classificar('WhatsApp Image 2026-09-24 at 09.30.03.jpeg')).toBe('imagem');
    expect(classificar('CNH-e.pdf.pdf')).toBe('pdf');
    expect(classificar('_chat.txt')).toBe('texto');
    expect(classificar('conversa.ZIP')).toBe('zip');
    expect(classificar('pasta.rar')).toBe('naoSuportado');
    expect(classificar('PTT-2026.opus')).toBe('ignorado');
    expect(classificar('STK-1.webp')).toBe('ignorado');
    expect(classificar('semextensao')).toBe('ignorado');
  });
});

describe('lerEntrada', () => {
  it('aceita arquivos soltos', async () => {
    const r = await lerEntrada([arq('cnh.pdf', '%PDF-1.4 x'), arq('foto.jpg', 'jpg'), arq('audio.opus', 'x')]);
    expect(r.itens.map(i => [i.nome, i.tipo])).toEqual([['cnh.pdf', 'pdf'], ['foto.jpg', 'imagem']]);
    expect(r.ignorados).toEqual(['audio.opus']);
  });

  it('abre zip do WhatsApp, pula __MACOSX e figurinhas', async () => {
    const zip = new JSZip();
    zip.file('_chat.txt', '24/09/2026 09:30 - +55 11 98765-4321: segue a cnh');
    zip.file('IMG-20260924-WA0001.jpg', 'jpg');
    zip.file('STK-20260924-WA0002.webp', 'x');
    zip.file('__MACOSX/._IMG.jpg', 'x');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const r = await lerEntrada([arq('conversa.zip', bytes)]);
    expect(r.itens.map(i => i.nome).sort()).toEqual(['IMG-20260924-WA0001.jpg', '_chat.txt']);
    expect(r.ignorados).toEqual(['STK-20260924-WA0002.webp']);
  });

  it('mistura zip e soltos; rar vira não suportado', async () => {
    const zip = new JSZip();
    zip.file('pasta/doc.pdf', '%PDF-1.4');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const r = await lerEntrada([arq('a.zip', bytes), arq('b.png', 'png'), arq('pasta.rar', 'Rar!')]);
    expect(r.itens.map(i => i.nome)).toEqual(['doc.pdf', 'b.png']);
    expect(r.naoSuportados).toEqual(['pasta.rar']);
  });

  it('zip corrompido vira não suportado em vez de quebrar', async () => {
    const r = await lerEntrada([arq('ruim.zip', 'não é zip')]);
    expect(r.naoSuportados).toEqual(['ruim.zip (zip corrompido)']);
  });
});

describe('prepararDocumentos', () => {
  const enc = (s) => new TextEncoder().encode(s);

  it('separa textos, imagens e PDFs em base64', async () => {
    const r = await prepararDocumentos([
      { nome: '_chat.txt', tipo: 'texto', bytes: enc('olá') },
      { nome: 'a.jpg', tipo: 'imagem', bytes: enc('img') },
      { nome: 'b.png', tipo: 'imagem', bytes: enc('png') },
      { nome: 'c.pdf', tipo: 'pdf', bytes: enc('%PDF-1.4') },
    ]);
    expect(r.textos).toEqual([{ nome: '_chat.txt', conteudo: 'olá' }]);
    expect(r.imagens).toEqual([
      { nome: 'a.jpg', mediaType: 'image/jpeg', base64: paraBase64(enc('img')) },
      { nome: 'b.png', mediaType: 'image/png', base64: paraBase64(enc('png')) },
    ]);
    expect(r.pdfs).toEqual([{ nome: 'c.pdf', base64: paraBase64(enc('%PDF-1.4')) }]);
    expect(r.avisos).toEqual([]);
  });

  it('usa o redimensionador injetado', async () => {
    const r = await prepararDocumentos([{ nome: 'a.jpg', tipo: 'imagem', bytes: enc('grande') }], {
      redimensionar: async () => ({ bytes: enc('pequena'), mediaType: 'image/jpeg' }),
    });
    expect(r.imagens[0].base64).toBe(paraBase64(enc('pequena')));
  });

  it('pula PDF protegido e imagem que não abre, com aviso', async () => {
    const r = await prepararDocumentos([
      { nome: 'senha.pdf', tipo: 'pdf', bytes: enc('%PDF-1.4 trailer << /Encrypt 5 0 R >>') },
      { nome: 'ruim.jpg', tipo: 'imagem', bytes: enc('x') },
    ], { redimensionar: async () => { throw new Error('decode'); } });
    expect(r.pdfs).toEqual([]);
    expect(r.imagens).toEqual([]);
    expect(r.avisos).toEqual([
      'senha.pdf: PDF protegido por senha — não foi lido',
      'ruim.jpg: imagem não pôde ser aberta',
    ]);
  });

  it('recusa quando o total passa do limite', async () => {
    await expect(prepararDocumentos([{ nome: 'a.pdf', tipo: 'pdf', bytes: enc('%PDF' + 'x'.repeat(100)) }], { limiteBytes: 50 }))
      .rejects.toThrow('Remova alguns');
  });

  it('limite padrão é 18 MB', async () => {
    const grande = new Uint8Array(14 * 1024 * 1024);
    await expect(prepararDocumentos([{ nome: 'a.pdf', tipo: 'pdf', bytes: grande }])).rejects.toThrow('mais de 18 MB');
  });

  it('pdfProtegido e paraBase64 com arquivo grande', () => {
    expect(pdfProtegido(enc('%PDF /Encrypt'))).toBe(true);
    expect(pdfProtegido(enc('%PDF normal'))).toBe(false);
    const grande = new Uint8Array(200_000).fill(65);
    expect(paraBase64(grande)).toBe(Buffer.from(grande).toString('base64'));
  });
});
