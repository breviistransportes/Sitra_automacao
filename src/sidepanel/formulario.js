import { CAMPOS, UFS, TELAS, camposDaTela } from '../lib/campos.js';
import { normalizarCampo } from '../lib/normalizar.js';

const PROPRIEDADES = [['1', 'Da Casa'], ['2', 'Agregado'], ['3', 'Terceiro']];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

function controle(campo, valor) {
  const nome = `c_${campo.chave}`;
  const opcoes = (lista) => lista.map(([v, t]) => `<option value="${esc(v)}"${v === valor ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const select = (lista) => `<select name="${nome}"><option value="">—</option>${opcoes(lista)}</select>`;
  if (campo.tipo === 'uf') return select(UFS.map(u => [u, u]));
  if (campo.tipo === 'propriedade') return select(PROPRIEDADES);
  if (campo.tipo === 'opcao') return select(campo.opcoes);
  return `<input name="${nome}" value="${esc(valor)}" autocomplete="off">`;
}

function painel(tela, valores) {
  const campos = camposDaTela(tela);
  const grupos = [...new Set(campos.map(c => c.grupo))];
  return grupos.map(g => `<fieldset><legend>${esc(g)}</legend>${campos.filter(c => c.grupo === g).map(c => {
    const v = valores[c.chave] ?? { valor: '', certeza: 'conferir', fonte: '' };
    return `<label class="campo${v.certeza === 'conferir' ? ' conferir' : ''}"><span>${esc(c.rotulo)}${c.obrigatorio ? ' *' : ''}</span>${controle(c, v.valor)}${v.fonte ? `<small>${esc(v.fonte)}</small>` : ''}</label>`;
  }).join('')}</fieldset>`).join('');
}

export function montarFormulario(valores) {
  const telas = Object.keys(TELAS);
  const abas = telas.map((t, i) => `<button type="button" class="aba${i === 0 ? ' ativa' : ''}" data-tela="${t}">${esc(TELAS[t].rotulo)}</button>`).join('');
  const paineis = telas.map((t, i) => `<div data-painel="${t}"${i === 0 ? '' : ' hidden'}>${painel(t, valores)}</div>`).join('');
  return `<div class="abas">${abas}</div>${paineis}`;
}

export function mostrarAba(form, tela) {
  for (const b of form.querySelectorAll('.aba')) b.classList.toggle('ativa', b.dataset.tela === tela);
  for (const p of form.querySelectorAll('[data-painel]')) p.hidden = p.dataset.painel !== tela;
}

// Lê todos os campos; inválidos/faltando só da tela informada (ou de todas, sem tela).
export function lerFormulario(form, tela) {
  const valores = {}, invalidos = [], faltando = [];
  for (const c of CAMPOS) {
    const bruto = form.elements[`c_${c.chave}`]?.value ?? '';
    const v = normalizarCampo(c, bruto);
    valores[c.chave] = v;
    if (tela && c.tela !== tela) continue;
    if (bruto.trim() && !v) invalidos.push(c.rotulo);
    else if (!v && c.obrigatorio) faltando.push(c.rotulo);
  }
  return { valores, invalidos, faltando };
}
