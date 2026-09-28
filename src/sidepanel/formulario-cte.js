import { CAMPOS_CTE, TOMADORES, normalizarCampoCte } from '../lib/campos-cte.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

function controle(campo, valor) {
  const nome = `c_${campo.chave}`;
  if (campo.tipo === 'tomador') {
    const opcoes = TOMADORES.map(([v, t]) => `<option value="${v}"${v === valor ? ' selected' : ''}>${esc(t)}</option>`).join('');
    return `<select name="${nome}"><option value="">— Selecione —</option>${opcoes}</select>`;
  }
  return `<input name="${nome}" value="${esc(valor)}" autocomplete="off"${campo.fixo ? ' readonly' : ''}>`;
}

export function montarFormularioCte(valores = {}) {
  const grupos = [...new Set(CAMPOS_CTE.map(c => c.grupo))];
  return grupos.map(grupo => `<fieldset><legend>${esc(grupo)}</legend>${CAMPOS_CTE.filter(c => c.grupo === grupo).map(campo => {
    const dado = valores[campo.chave] ?? { valor: campo.fixo ?? '', certeza: campo.fixo ? 'alta' : 'conferir', fonte: '' };
    const valor = campo.fixo ?? dado.valor ?? '';
    return `<label class="campo${dado.certeza === 'conferir' ? ' conferir' : ''}"><span>${esc(campo.rotulo)}${campo.obrigatorio ? ' *' : ''}</span>${controle(campo, valor)}${dado.fonte ? `<small>${esc(dado.fonte)}</small>` : ''}</label>`;
  }).join('')}</fieldset>`).join('');
}

export function lerFormularioCte(form) {
  const valores = {}, invalidos = [], faltando = [];
  for (const campo of CAMPOS_CTE) {
    const bruto = campo.fixo ?? form.elements[`c_${campo.chave}`]?.value ?? '';
    const valor = normalizarCampoCte(campo, bruto);
    valores[campo.chave] = valor;
    if (String(bruto).trim() && !valor) invalidos.push(campo.rotulo);
    else if (!valor && campo.obrigatorio) faltando.push(campo.rotulo);
  }
  if (valores.tomador === 'expedidor' && !valores.expedidor_cnpj && !faltando.includes('CNPJ do expedidor')) faltando.push('CNPJ do expedidor');
  if (valores.tomador === 'recebedor' && !valores.recebedor_cnpj && !faltando.includes('CNPJ do recebedor')) faltando.push('CNPJ do recebedor');
  return { valores, invalidos, faltando };
}
