// Reduz a foto (celular: 4–8 MB) para um tamanho que a IA lê bem, mantendo legibilidade.
// createImageBitmap aplica a orientação EXIF por padrão no Chrome.
export async function redimensionarImagem(bytes, nome, ladoMax = 1568) {
  const bmp = await createImageBitmap(new Blob([bytes]));
  const escala = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * escala);
  const h = Math.round(bmp.height * escala);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mediaType: 'image/jpeg' };
}
