import { build } from 'esbuild';
import { copyFileSync } from 'node:fs';

const comum = { bundle: true, target: 'chrome120', logLevel: 'info' };

await build({ ...comum, entryPoints: ['src/sidepanel/main.js'], outfile: 'extensao/sidepanel/main.bundle.js', format: 'esm' });
await build({ ...comum, entryPoints: ['src/options/main.js'], outfile: 'extensao/options/main.bundle.js', format: 'esm' });
await build({ ...comum, entryPoints: ['src/content/injetado.js'], outfile: 'extensao/content/injetado.bundle.js', format: 'iife' });

// Worker do pdf.js (leitura do texto dos PDFs no painel).
copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'extensao/sidepanel/pdf.worker.min.mjs');
