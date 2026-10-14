import { CAMPOS, UFS, TELAS, camposDaTela, CAMPO_POR_CHAVE } from '../lib/campos.js';
import { normalizarCampo } from '../lib/normalizar.js';

const PROPRIEDADES = [['1', 'Da Casa'], ['2', 'Agregado'], ['3', 'Terceiro']];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

// Abas: 'motorista', 'proprietario' e uma por veículo ('veiculo:0', 'veiculo:1'…) — cavalo e carreta são cadastros separados.
const indiceVeiculo = (aba) => (String(aba ?? '').startsWith('veiculo:') ? Number(aba.slice(8)) : 0);
const telaDaAba = (aba) => String(aba).split(':')[0];
// Campos de veículo levam o índice no nome (c_veic_placa__1); os demais, só a chave (c_cpf).
const nomeDoCampo = (campo, i) => (campo.tela === 'veiculo' ? `c_${campo.chave}__${i}` : `c_${campo.chave}`);

function controle(campo, valor, nome) {
  const opcoes = (lista) => lista.map(([v, t]) => `<option value="${esc(v)}"${v === valor ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const select = (lista) => `<select name="${nome}"><option value="">—</option>${opcoes(lista)}</select>`;
  if (campo.tipo === 'uf') return select(UFS.map(u => [u, u]));
  if (campo.tipo === 'propriedade') return select(PROPRIEDADES);
  if (campo.tipo === 'opcao') return select(campo.opcoes);
  return `<input name="${nome}" value="${esc(valor)}" autocomplete="off">`;
}

function painel(tela, valores, i = 0) {
  const campos = camposDaTela(tela);
  const grupos = [...new Set(campos.map(c => c.grupo))];
  return grupos.map(g => `<fieldset><legend>${esc(g)}</legend>${campos.filter(c => c.grupo === g).map(c => {
    const v = valores[c.chave] ?? { valor: '', certeza: 'conferir', fonte: '' };
    return `<label class="campo${v.certeza === 'conferir' ? ' conferir' : ''}"><span>${esc(c.rotulo)}${c.obrigatorio ? ' *' : ''}</span>${controle(c, v.valor, nomeDoCampo(c, i))}${v.fonte ? `<small>${esc(v.fonte)}</small>` : ''}</label>`;
  }).join('')}</fieldset>`).join('');
}

function rotuloVeiculo(v, i, total) {
  if (total === 1) return TELAS.veiculo.rotulo;
  const tipo = CAMPO_POR_CHAVE.veic_tipo.opcoes.find(([valor]) => valor === v.veic_tipo?.valor)?.[1] ?? '';
  return [`Veículo ${i + 1} ·`, tipo, v.veic_placa?.valor].filter(Boolean).join(' ');
}

// veiculos: um mapa de valores por veículo; sem a lista, o veículo vem dos próprios valores.
export function montarFormulario(valores, veiculos = [valores]) {
  const lista = veiculos.length ? veiculos : [{}];
  const abas = [
    ...Object.keys(TELAS).filter(t => t !== 'veiculo').map(t => ({ aba: t, rotulo: TELAS[t].rotulo, html: painel(t, valores) })),
    ...lista.map((v, i) => ({ aba: `veiculo:${i}`, rotulo: rotuloVeiculo(v, i, lista.length), html: painel('veiculo', v, i) })),
  ];
  const botoes = abas.map((a, i) => `<button type="button" class="aba${i === 0 ? ' ativa' : ''}" data-tela="${a.aba}">${esc(a.rotulo)}</button>`).join('');
  const paineis = abas.map((a, i) => `<div data-painel="${a.aba}"${i === 0 ? '' : ' hidden'}>${a.html}</div>`).join('');
  return `<div class="abas">${botoes}</div>${paineis}`;
}

export function mostrarAba(form, aba) {
  for (const b of form.querySelectorAll('.aba')) b.classList.toggle('ativa', b.dataset.tela === aba);
  for (const p of form.querySelectorAll('[data-painel]')) p.hidden = p.dataset.painel !== aba;
}

export const abaAtiva = (form) => form.querySelector('.aba.ativa')?.dataset.tela ?? null;

export const quantidadeVeiculos = (form) => form.querySelectorAll('[data-painel^="veiculo:"]').length;

export const rotuloDaAba = (form, aba) => form.querySelector(`.aba[data-tela="${aba}"]`)?.textContent ?? '';

// Estado da tela como está (valor digitado, amarelo ou não, fonte), no formato de montarFormulario — para o histórico.
export function dadosDoFormulario(form) {
  const ler = (c, i) => {
    const e = form.elements[nomeDoCampo(c, i)];
    const label = e?.closest('label');
    return {
      valor: e?.value ?? '',
      certeza: label?.classList.contains('conferir') ? 'conferir' : 'alta',
      fonte: label?.querySelector('small')?.textContent ?? '',
    };
  };
  const valores = Object.fromEntries(CAMPOS.filter(c => c.tela !== 'veiculo').map(c => [c.chave, ler(c, 0)]));
  const veiculos = Array.from({ length: quantidadeVeiculos(form) }, (_, i) =>
    Object.fromEntries(camposDaTela('veiculo').map(c => [c.chave, ler(c, i)])));
  return { valores, veiculos };
}

// Lê os campos gerais e os do veículo da aba (o primeiro, se a aba não for de veículo).
// Inválidos/faltando: só da tela da aba informada (ou de todas, sem aba).
export function lerFormulario(form, aba) {
  const i = indiceVeiculo(aba);
  const tela = aba ? telaDaAba(aba) : null;
  const valores = {}, invalidos = [], faltando = [];
  for (const c of CAMPOS) {
    const bruto = form.elements[nomeDoCampo(c, i)]?.value ?? '';
    const v = normalizarCampo(c, bruto);
    valores[c.chave] = v;
    if (tela && c.tela !== tela) continue;
    if (bruto.trim() && !v) invalidos.push(c.rotulo);
    else if (!v && c.obrigatorio) faltando.push(c.rotulo);
  }
  return { valores, invalidos, faltando };
}
