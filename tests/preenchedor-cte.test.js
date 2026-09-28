// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { criarPreenchedorCte } from '../src/content/preenchedor-cte.js';

const fixture = readFileSync(new URL('./fixtures/cte.html', import.meta.url), 'utf8');
const VALORES_CTE = {
  remetente_cnpj: '29.124.070/0001-00', destinatario_cnpj: '82.508.433/0001-17',
  expedidor_cnpj: '', recebedor_cnpj: '', tomador: 'remetente',
  protocolo_autorizacao: '23226015464554', numero_nota: '7831', serie: '0', cfop: '5102',
  valor_total: '52.114,47', volume: '8', peso_bruto: '1.152,00', data_emissao: '24/09/2026',
  motorista_cpf: '529.982.247-25', especie: 'VOL',
};

function criarSitraCte({ url = 'https://2323.aleff.com.br/DigitacaoCte2/DigitacaoCte2', travar, inserirNota = true, tomadorDerivado } = {}) {
  const dom = new JSDOM(fixture, { url });
  const win = dom.window;
  const doc = win.document;
  const ordem = [];
  const cliques = { cadastrar: 0 };
  win.__cmXhrInstalado = true;
  win.__cmXhrPendentes = 0;
  const produto = doc.getElementById('txtMercadoriasTransportadasProduto');
  produto.add(new win.Option('CONFORME NOTA', '1'));
  doc.getElementById('txtRemetenteCpfCnpj').addEventListener('blur', () => {
    ordem.push('remetente');
    if (travar === 'remetente') win.__cmXhrPendentes = 1;
  });
  doc.getElementById('txtDestinatarioCpfCnpj').addEventListener('blur', () => {
    ordem.push('destinatario');
    if (tomadorDerivado) doc.getElementById('txtTomadorCpfCnpj').value = tomadorDerivado;
  });
  doc.getElementById('btnMercadoriasTransportadasNotasFiscais').addEventListener('click', () => {
    ordem.push('abrir-notas');
    doc.getElementById('ModalNotasFiscais').style.display = 'block';
  });
  doc.getElementById('btnNotasFiscaisAdd').addEventListener('click', () => {
    ordem.push('inserir-nota');
    if (inserirNota) doc.getElementById('divPartialNotasFiscais').innerHTML = '<table><tbody><tr><td>7831</td></tr></tbody></table>';
  });
  doc.getElementById('chkFreteCombinado').addEventListener('click', () => {
    ordem.push('frete-combinado');
    doc.getElementById('ModalFreteCombinadoResponsavel').style.display = 'block';
  });
  doc.getElementById('btnCadastrar').addEventListener('click', () => { cliques.cadastrar++; });
  return { p: criarPreenchedorCte(win, { timeoutMs: 200, intervaloMs: 2 }), doc, ordem, cliques };
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
    expect(ordem).toEqual(['remetente', 'destinatario', 'abrir-notas', 'inserir-nota', 'frete-combinado']);
    expect(doc.getElementById('txtNotasFiscaisChaveNfe').value).toBe('23226015464554');
    expect(doc.getElementById('txtNotasFiscaisCfop').value).toBe('5102');
    expect(doc.getElementById('txtMercadoriasTransportadasProduto').selectedOptions[0].text).toBe('CONFORME NOTA');
    expect(doc.getElementById('txtMercadoriasTransportadasEspecie').value).toBe('VOL');
    expect(doc.getElementById('ModalFreteCombinadoResponsavel').style.display).toBe('block');
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
});
