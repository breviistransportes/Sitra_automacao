import { build } from 'esbuild';

const comum = { bundle: true, target: 'chrome120', logLevel: 'info' };

await build({ ...comum, entryPoints: ['src/sidepanel/main.js'], outfile: 'extensao/sidepanel/main.bundle.js', format: 'esm' });
await build({ ...comum, entryPoints: ['src/options/main.js'], outfile: 'extensao/options/main.bundle.js', format: 'esm' });
await build({ ...comum, entryPoints: ['src/content/injetado.js'], outfile: 'extensao/content/injetado.bundle.js', format: 'iife' });
