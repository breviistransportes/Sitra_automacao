import { CAMPOS, UFS } from '../lib/campos.js';
import { normalizarCampo } from '../lib/normalizar.js';

const PROPRIEDADES = [['1', 'Da Casa'], ['2', 'Agregado'], ['3', 'Terceiro']];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

function controle(campo, valor) {
  const nome = `c_${campo.chave}`;
  const opcoes = (lista) => lista.map(([v, t]) => `<option value="${esc(v)}"${v === valor ? ' selected' : ''}>${esc(t)}</option>`).join('');
  if (campo.tipo === 'uf') return `<select name="${nome}"><option value="">—</option>${opcoes(UFS.map(u => [u, u]))}</select>`;
  if (campo.tipo === 'propriedade') return `<select name="${nome}"><option value="">—</option>${opcoes(PROPRIEDADES)}</select>`;
  return `<input name="${nome}" value="${esc(valor)}" autocomplete="off">`;
}

export function montarFormulario(valores) {
  const grupos = [...new Set(CAMPOS.map(c => c.grupo))];
  return grupos.map(g => `<fieldset><legend>${esc(g)}</legend>${CAMPOS.filter(c => c.grupo === g).map(c => {
    const v = valores[c.chave] ?? { valor: '', certeza: 'conferir', fonte: '' };
    return `<label class="campo${v.certeza === 'conferir' ? ' conferir' : ''}"><span>${esc(c.rotulo)}${c.obrigatorio ? ' *' : ''}</span>${controle(c, v.valor)}${v.fonte ? `<small>${esc(v.fonte)}</small>` : ''}</label>`;
  }).join('')}</fieldset>`).join('');
}

export function lerFormulario(form) {
  const valores = {}, invalidos = [], faltando = [];
  for (const c of CAMPOS) {
    const bruto = form.elements[`c_${c.chave}`]?.value ?? '';
    const v = normalizarCampo(c, bruto);
    if (bruto.trim() && !v) invalidos.push(c.rotulo);
    else if (!v && c.obrigatorio) faltando.push(c.rotulo);
    valores[c.chave] = v;
  }
  return { valores, invalidos, faltando };
}
