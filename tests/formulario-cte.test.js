// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { montarFormularioCte, lerFormularioCte } from '../src/sidepanel/formulario-cte.js';

const valores = {
  remetente_cnpj: { valor: '29.124.070/0001-00', certeza: 'alta', fonte: 'nota.jpg' },
  destinatario_cnpj: { valor: '82.508.433/0001-17', certeza: 'alta', fonte: 'nota.jpg' },
  protocolo_autorizacao: { valor: '23226015464554', certeza: 'alta', fonte: 'nota.jpg' },
  cfop: { valor: '5102', certeza: 'conferir', fonte: 'nota.jpg' },
};

describe('formulário CT-e', () => {
  it('painel oferece os dois modos e textos específicos', () => {
    const html = readFileSync('extensao/sidepanel/index.html', 'utf8');
    expect(html).toContain('data-modo="cadastro"');
    expect(html).toContain('data-modo="cte"');
    expect(html).toContain('CT-e manual');
    expect(html).toContain('id="btn-preencher"');
  });
  it('mostra extraídos, manuais, tomador e amarelo', () => {
    document.body.innerHTML = `<form id="f">${montarFormularioCte(valores)}</form>`;
    const f = document.getElementById('f');
    expect(f.elements.c_remetente_cnpj.value).toBe('29.124.070/0001-00');
    expect(f.elements.c_motorista_cpf.value).toBe('');
    expect([...f.elements.c_tomador.options].map(o => o.value)).toEqual(['', 'remetente', 'destinatario', 'expedidor', 'recebedor']);
    expect(f.elements.c_cfop.closest('label').classList.contains('conferir')).toBe(true);
  });

  it('exige CNPJ manual quando tomador é expedidor ou recebedor', () => {
    document.body.innerHTML = `<form id="f">${montarFormularioCte(valores)}</form>`;
    const f = document.getElementById('f');
    f.elements.c_tomador.value = 'expedidor';
    expect(lerFormularioCte(f).faltando).toContain('CNPJ do expedidor');
    f.elements.c_expedidor_cnpj.value = '25.143.498/0001-72';
    expect(lerFormularioCte(f).faltando).not.toContain('CNPJ do expedidor');
  });

  it('escapa HTML e normaliza edição humana', () => {
    document.body.innerHTML = `<form id="f">${montarFormularioCte({ cfop: { valor: '<img src=x>', certeza: 'alta', fonte: '<b>x</b>' } })}</form>`;
    const f = document.getElementById('f');
    expect(f.querySelector('img')).toBeNull();
    f.elements.c_motorista_cpf.value = '52998224725';
    expect(lerFormularioCte(f).valores.motorista_cpf).toBe('529.982.247-25');
  });
});
