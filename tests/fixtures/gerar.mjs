// Gera as cópias de teste das telas do Sitra A PARTIR das páginas salvas (campos_necessarios/),
// copiando o HTML real de cada campo usado (handlers, classes, maxlength, opções).
// Nunca digite a fixture à mão: foi assim que o "onchange" errado da v1 passou nos testes.
// Uso: node tests/fixtures/gerar.mjs   (as páginas salvas ficam fora do git)
import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync } from 'node:fs';
import { camposDaTela } from '../../src/lib/campos.js';

const PAGINAS = {
  motorista: { real: 'campos_necessarios/Cadastro De Motoristas.html', saida: 'tests/fixtures/sitra.html', extras: ['txtStatusMotorista', 'txtVeiculoMarcaModeloCor'] },
  proprietario: { real: 'campos_necessarios/CadastroDeProprietarios.html', saida: 'tests/fixtures/proprietario.html', extras: ['txtProprietarioId'] },
  veiculo: { real: 'campos_necessarios/CadastroDeVeiculos.html', saida: 'tests/fixtures/veiculo.html', extras: ['txtStatusVeiculo', 'txtNomeProprietario', 'txtEixos', 'txtCapacidadeKg'] },
};
const MODAIS = ['ModalErro', 'ModalAsk'];

for (const [tela, { real, saida, extras }] of Object.entries(PAGINAS)) {
  const doc = new JSDOM(readFileSync(real, 'utf8')).window.document;
  const ids = [...new Set([...camposDaTela(tela).map(c => c.id), ...extras])];
  const linhas = ids.map(id => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`${tela}: #${id} não existe na página salva`);
    return el.outerHTML.replace(/\s+/g, ' ');
  });
  for (const id of MODAIS) {
    const m = doc.getElementById(id);
    if (!m) continue;
    // Mantém só o contêiner do modal, o texto e os botões que o preenchedor usa.
    const texto = m.querySelector('#erro, #pergunta');
    const botoes = [...m.querySelectorAll('#btnPerguntaSim, #btnPerguntaNao, #btnOk')].map(b => b.outerHTML).join('');
    linhas.push(`<div class="${m.className}" id="${id}">${texto ? texto.outerHTML : ''}${botoes}</div>`);
  }
  writeFileSync(saida, `<!doctype html>\n<!-- GERADO por tests/fixtures/gerar.mjs a partir de ${real} — não editar à mão -->\n<html><body>\n${linhas.join('\n')}\n</body></html>\n`);
  console.log(`${saida}: ${linhas.length} elementos`);
}
