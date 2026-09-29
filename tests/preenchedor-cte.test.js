// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { criarPreenchedorCte } from '../src/content/preenchedor-cte.js';

const fixture = readFileSync(new URL('./fixtures/cte.html', import.meta.url), 'utf8');
const VALORES_CTE = {
  remetente_cnpj: '29.124.070/0001-00', destinatario_cnpj: '82.508.433/0001-17',
  expedidor_cnpj: '', recebedor_cnpj: '', tomador: 'remetente',
  chave_acesso: '35260929124070000100550000000078311000007833', protocolo_autorizacao: '135260000000000', numero_nota: '7831', serie: '0', cfop: '5102',
  valor_total: '52.114,47', volume: '8', peso_bruto: '1.152,00', data_emissao: '24/09/2026',
  motorista_cpf: '529.982.247-25', especie: 'VOL',
};

function criarSitraCte({ url = 'https://2323.aleff.com.br/DigitacaoCte2/DigitacaoCte2', travar, inserirNota = true, tomadorDerivado, recusar, aliquota = '12,00', erroInserir } = {}) {
  const dom = new JSDOM(fixture, { url });
  const win = dom.window;
  const doc = win.document;
  const ordem = [];
  const cliques = { cadastrar: 0 };
  win.__cmXhrInstalado = true;
  win.__cmXhrPendentes = 0;
  const produto = doc.getElementById('txtMercadoriasTransportadasProduto');
  produto.add(new win.Option('CONFORME NOTA', '1'));
  // Como o Sitra real: recusa no servidor mantém o valor e abre #ModalAsk/#ModalErro com a mensagem.
  const abrirModal = (id, textoId, texto) => {
    doc.getElementById(textoId).textContent = texto;
    doc.getElementById(id).classList.add('in');
  };
  doc.getElementById('txtRemetenteCpfCnpj').addEventListener('blur', () => {
    ordem.push('remetente');
    if (travar === 'remetente') win.__cmXhrPendentes = 1;
    if (recusar === 'remetente') abrirModal('ModalAsk', 'pergunta', 'Remetente não cadastrado, deseja cadastrar?');
  });
  // onblur="Cte.GetAliqICMS()" nos dois campos de mercadoria preenche a alíquota.
  for (const id of ['txtMercadoriasTransportadasProduto', 'txtMercadoriasTransportadasEspecie']) {
    doc.getElementById(id).addEventListener('blur', () => {
      if (!ordem.includes('aliquota')) ordem.push('aliquota');
      doc.getElementById('txtAliquotaICMS').value = aliquota;
    });
  }
  // Bootstrap: .modal('hide') fecha o modal de notas (o Sitra soma as notas no hide.bs.modal).
  // Depois da soma, o Sitra roda Cte.CalculaTabelas só com Frete Combinado desmarcado:
  // pergunta "Cobrar Taxa de Coleta?" (#ModalAskCte) ou PreenherCalculoFrete, que desmarca o combinado.
  win.jQuery = (sel) => ({ modal: (acao) => {
    if (sel === '#ModalNotasFiscais' && acao === 'hide') {
      ordem.push('fechar-notas');
      const m = doc.getElementById('ModalNotasFiscais');
      m.style.display = 'none'; m.classList.remove('in');
      const combinado = doc.getElementById('chkFreteCombinado');
      if (!combinado.checked) abrirModal('ModalAskCte', 'perguntaCte', 'Cobrar Taxa de Coleta R$10,00?');
    }
  } });
  doc.getElementById('txtDestinatarioCpfCnpj').addEventListener('blur', () => {
    ordem.push('destinatario');
    if (tomadorDerivado) doc.getElementById('txtTomadorCpfCnpj').value = tomadorDerivado;
  });
  doc.getElementById('btnMercadoriasTransportadasNotasFiscais').addEventListener('click', () => {
    ordem.push('abrir-notas');
    doc.getElementById('ModalNotasFiscais').style.display = 'block';
    doc.getElementById('chkFreteCombinado').checked = false; // relato do operador: entrar em Notas desmarca o combinado
  });
  // onblur="Cte.ConsultaChaveNotasFiscais(event)": o Sitra preenche nº/série pela chave e os desabilita.
  doc.getElementById('txtNotasFiscaisChaveNfe').addEventListener('blur', () => {
    ordem.push('consulta-chave');
    for (const [id, v] of [['txtNotasFiscaisNotaFiscal', '7831'], ['txtNotasFiscaisSerie', '1']]) {
      const e = doc.getElementById(id); e.value = v; e.disabled = true;
    }
  });
  doc.getElementById('btnNotasFiscaisAdd').addEventListener('click', () => {
    ordem.push('inserir-nota');
    if (erroInserir) return abrirModal('ModalErro', 'erro', erroInserir);
    if (inserirNota) doc.getElementById('divPartialNotasFiscais').innerHTML = '<table><tbody><tr><td>7831</td></tr></tbody></table>';
  });
  // Como Cte.FreteCombinadoOnclick real: não abre o modal do responsável; com alíquota ≠ 0 pergunta sobre ICMS.
  doc.getElementById('chkFreteCombinado').addEventListener('click', () => {
    ordem.push('frete-combinado');
    const s = parseFloat(doc.getElementById('txtAliquotaICMS').value.replace(',', '.')) || 0;
    if (doc.getElementById('chkFreteCombinado').checked && s !== 0) abrirModal('ModalAsk', 'pergunta', 'Deseja incluir ICMS');
  });
  doc.getElementById('txtMotoristaCpf').addEventListener('blur', () => { ordem.push('motorista'); });
  doc.getElementById('btnCadastrar').addEventListener('click', () => { cliques.cadastrar++; });
  return { p: criarPreenchedorCte(win, { timeoutMs: 200, intervaloMs: 2, calmaMs: 10 }), doc, ordem, cliques };
}

describe('preenchedor de CT-e', () => {
  it('rejeita URL fora da Digitação de CT-e', () => {
    const { p } = criarSitraCte({ url: 'https://2323.aleff.com.br/Home' });
    expect(p.estado().tela).toBeNull();
  });

  it('não altera Tipo de Frete nem clica em Cadastrar', async () => {
    const { p, doc, cliques } = criarSitraCte();
    doc.getElementById('txtTipoFrete').value = '1';
    await p.preencher(VALORES_CTE);
    expect(doc.getElementById('txtTipoFrete').value).toBe('1');
    expect(cliques.cadastrar).toBe(0);
  });

  it('preenche CNPJs em sequência, insere nota e só então marca frete combinado', async () => {
    const { p, doc, ordem } = criarSitraCte();
    doc.getElementById('txtTipoFrete').value = '1';
    const rel = await p.preencher(VALORES_CTE);
    expect(rel.ok).toBe(true);
    expect(ordem).toEqual(['remetente', 'destinatario', 'aliquota', 'abrir-notas', 'consulta-chave', 'inserir-nota', 'fechar-notas', 'frete-combinado', 'motorista']);
    expect(doc.getElementById('txtNotasFiscaisChaveNfe').value).toBe('35260929124070000100550000000078311000007833');
    expect(doc.getElementById('txtNotasFiscaisSerie').value).toBe('1');
    expect(doc.getElementById('txtNotasFiscaisCfop').value).toBe('5102');
    expect(doc.getElementById('txtMercadoriasTransportadasProduto').selectedOptions[0].text).toBe('CONFORME NOTA');
    expect(doc.getElementById('txtMercadoriasTransportadasEspecie').value).toBe('VOL');
    expect(doc.getElementById('chkFreteCombinado').checked).toBe(true);
    expect(rel.avisos.join(' ')).toMatch(/Cobrar Taxa de Coleta/);
    expect(doc.getElementById('txtAliquotaICMS').value).toBe('12,00');
    expect(rel.avisos.join(' ')).toMatch(/Deseja incluir ICMS/);
    expect(rel.avisos.join(' ')).toMatch(/respons[aá]vel/i);
  });

  it('sem alíquota de ICMS conclui ao marcar frete combinado, sem esperar modal que o Sitra não abre', async () => {
    const { p, doc } = criarSitraCte({ aliquota: '0' });
    doc.getElementById('txtTipoFrete').value = '1';
    const rel = await p.preencher(VALORES_CTE);
    expect(rel.ok).toBe(true);
    expect(doc.getElementById('chkFreteCombinado').checked).toBe(true);
    expect(rel.avisos.join(' ')).not.toMatch(/ICMS/);
  });

  it('recusa do Sitra que mantém o valor e abre pergunta interrompe e mostra a mensagem', async () => {
    const { p, doc, ordem } = criarSitraCte({ recusar: 'remetente' });
    doc.getElementById('txtTipoFrete').value = '1';
    const rel = await p.preencher(VALORES_CTE);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/Remetente.*não cadastrado, deseja cadastrar/i);
    expect(ordem).not.toContain('destinatario');
    expect(doc.getElementById('chkFreteCombinado').checked).toBe(false);
  });

  it('timeout no remetente interrompe antes do destinatário', async () => {
    const { p, ordem, doc } = criarSitraCte({ travar: 'remetente' });
    doc.getElementById('txtTipoFrete').value = '1';
    const rel = await p.preencher(VALORES_CTE);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/remetente.*demorou/i);
    expect(ordem).not.toContain('destinatario');
  });

  it('tomador derivado divergente só avisa', async () => {
    const { p, doc } = criarSitraCte({ tomadorDerivado: '82.508.433/0001-17' });
    doc.getElementById('txtTipoFrete').value = '1';
    const rel = await p.preencher({ ...VALORES_CTE, tomador: 'remetente' });
    expect(rel.avisos.join(' ')).toMatch(/tomador.*diverge/i);
    expect(doc.getElementById('txtTipoFrete').value).toBe('1');
  });

  it('sem linha na grade não marca frete combinado', async () => {
    const { p, doc } = criarSitraCte({ inserirNota: false });
    doc.getElementById('txtTipoFrete').value = '1';
    const rel = await p.preencher(VALORES_CTE);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/nota.*grade/i);
    expect(doc.getElementById('chkFreteCombinado').checked).toBe(false);
  });

  it('erro do Sitra ao inserir a nota aparece no relatório e não marca frete combinado', async () => {
    const { p, doc } = criarSitraCte({ erroInserir: 'Favor informar uma chave de nota fiscal válida!' });
    doc.getElementById('txtTipoFrete').value = '1';
    const rel = await p.preencher(VALORES_CTE);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/Inserir nota: Favor informar uma chave de nota fiscal válida!/);
    expect(doc.getElementById('chkFreteCombinado').checked).toBe(false);
  });
});
