import { lerConfig, salvarConfig } from '../lib/config.js';

const $ = (id) => document.getElementById(id);

const cfg = await lerConfig();
$('apiKey').value = cfg.apiKey;
$('nacionalidade').value = cfg.padroes.nacionalidade;
$('propriedade').value = cfg.padroes.propriedade;

$('salvar').addEventListener('click', async () => {
  await salvarConfig({
    apiKey: $('apiKey').value.trim(),
    padroes: { nacionalidade: $('nacionalidade').value.trim().toUpperCase(), propriedade: $('propriedade').value },
  });
  $('status').textContent = 'Salvo.';
});
