// Gera as cópias de teste das telas do Sitra A PARTIR das páginas salvas (campos_necessarios/),
// copiando o HTML real de cada campo usado (handlers, classes, maxlength, opções).
// Nunca digite a fixture à mão: foi assim que o "onchange" errado da v1 passou nos testes.
// Uso: node tests/fixtures/gerar.mjs   (as páginas salvas ficam fora do git)
import { JSDOM } from 'jsdom';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { camposDaTela } from '../../src/lib/campos.js';

const PAGINAS = {
  motorista: { real: 'campos_necessarios/Cadastro De Motoristas.html', saida: 'tests/fixtures/sitra.html', extras: ['txtStatusMotorista', 'txtVeiculoMarcaModeloCor'] },
  proprietario: { real: 'campos_necessarios/CadastroDeProprietarios.html', saida: 'tests/fixtures/proprietario.html', extras: ['txtProprietarioId', 'btnCadastrar', 'btnAlterar'] },
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

const IDS_CTE = [
  'txtTipoFrete', 'txtRemetenteCpfCnpj', 'txtDestinatarioCpfCnpj', 'txtExpedidorCpfCnpj', 'txtRecebedorCpfCnpj',
  'txtTomadorCpfCnpj', 'txtMercadoriasTransportadasProduto', 'txtMercadoriasTransportadasEspecie',
  'btnMercadoriasTransportadasNotasFiscais', 'ModalNotasFiscais', 'rdbNF', 'txtNotasFiscaisChaveNfe',
  'txtNotasFiscaisNotaFiscal', 'txtNotasFiscaisSerie', 'txtNotasFiscaisCfop', 'txtNotasFiscaisValorMerc',
  'txtNotasFiscaisVolume', 'txtNotasFiscaisPeso', 'txtNotasFiscaisDataEmissao', 'btnNotasFiscaisAdd',
  'divPartialNotasFiscais', 'txtMotoristaCpf', 'chkFreteCombinado', 'ModalFreteCombinadoResponsavel',
  'txtFreteCombinadoResponsavel', 'btnCadastrar', 'txtAliquotaICMS',
];
const MODAIS_CTE = ['ModalErro', 'ModalAsk', 'ModalAskCte', 'ModalDemaisIeRemetente', 'ModalDemaisIeDestinatario', 'ModalDemaisIeExpedidor', 'ModalDemaisIeRecebedor', 'ModalDemaisIeTomador'];
const realCte = ['DigitacaoDeCT-e.html', 'campos_necessarios/DigitacaoDeCT-e.html'].find(existsSync);
if (realCte) {
  const doc = new JSDOM(readFileSync(realCte, 'utf8')).window.document;
  const modalIds = new Set(['ModalNotasFiscais', 'ModalFreteCombinadoResponsavel']);
  const descendentesDeModal = new Set(IDS_CTE.filter(id => {
    const e = doc.getElementById(id);
    return e && [...modalIds].some(mid => id !== mid && e.closest(`#${mid}`));
  }));
  const linhas = IDS_CTE.filter(id => !descendentesDeModal.has(id)).map(id => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`cte: #${id} não existe na página salva`);
    if (!modalIds.has(id)) return el.outerHTML.replace(/\s+/g, ' ');
    const filhos = IDS_CTE.filter(fid => doc.getElementById(fid)?.closest(`#${id}`)).map(fid => doc.getElementById(fid).outerHTML.replace(/\s+/g, ' ')).join('');
    return `<div class="${el.className}" id="${id}" style="display:none">${filhos}</div>`;
  });
  // Modais de erro/pergunta que o Sitra abre ao recusar um valor: só contêiner e texto.
  for (const id of MODAIS_CTE) {
    const m = doc.getElementById(id);
    if (!m) throw new Error(`cte: #${id} não existe na página salva`);
    const texto = m.querySelector('#erro, #pergunta, #perguntaCte');
    linhas.push(`<div class="${m.className}" id="${id}">${texto ? texto.outerHTML.replace(/\s+/g, ' ') : ''}</div>`);
  }
  writeFileSync('tests/fixtures/cte.html', `<!doctype html>\n<!-- GERADO por tests/fixtures/gerar.mjs a partir de ${realCte} — não editar à mão -->\n<html><body>\n${linhas.join('\n')}\n</body></html>\n`);
  console.log(`tests/fixtures/cte.html: ${linhas.length} elementos raiz`);
}
