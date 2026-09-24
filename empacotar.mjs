// Gera cadastro-motorista-sitra.zip com a pasta extensao/ já montada (rode `npm run build` antes).
// É esse .zip que vai no GitHub Releases: extraído, tem o manifest.json direto na pasta.
import JSZip from 'jszip';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = 'extensao';
const SAIDA = process.argv[2] ?? 'cadastro-motorista-sitra.zip';

for (const obrigatorio of ['sidepanel/main.bundle.js', 'sidepanel/pdf.worker.min.mjs', 'options/main.bundle.js', 'content/injetado.bundle.js']) {
  if (!existsSync(join(RAIZ, obrigatorio))) throw new Error(`Falta ${obrigatorio} — rode "npm run build" antes.`);
}

const zip = new JSZip();
const andar = (dir) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) andar(caminho);
    else zip.file(relative(RAIZ, caminho).split(sep).join('/'), readFileSync(caminho));
  }
};
andar(RAIZ);
writeFileSync(SAIDA, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log(`${SAIDA}: ${Object.values(zip.files).filter(f => !f.dir).length} arquivos`);
