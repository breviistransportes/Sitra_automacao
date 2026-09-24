// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { montarFormulario, lerFormulario } from '../src/sidepanel/formulario.js';
import { CAMPOS } from '../src/lib/campos.js';

const vazio = () => Object.fromEntries(CAMPOS.map(c => [c.chave, { valor: '', certeza: 'conferir', fonte: '' }]));

function renderizar(valores) {
  document.body.innerHTML = `<form id="f">${montarFormulario(valores)}</form>`;
  return document.getElementById('f');
}

describe('formulário de conferência', () => {
  it('marca em amarelo o que precisa conferir e mostra a fonte', () => {
    const v = vazio();
    v.cpf = { valor: '529.982.247-25', certeza: 'alta', fonte: 'CNH-e.pdf' };
    const f = renderizar(v);
    expect(f.querySelector('[name="c_cpf"]').closest('label').classList.contains('conferir')).toBe(false);
    expect(f.querySelector('[name="c_estado_civil"]').closest('label').classList.contains('conferir')).toBe(true);
    expect(f.textContent).toContain('CNH-e.pdf');
    expect(f.querySelector('select[name="c_uf"]')).not.toBeNull();
    expect(f.querySelector('select[name="c_propriedade"] option[value="3"]').textContent).toBe('Terceiro');
  });

  it('escapa HTML vindo dos documentos', () => {
    const v = vazio();
    v.nome = { valor: '"><img src=x onerror=alert(1)>', certeza: 'alta', fonte: '<b>x</b>' };
    const f = renderizar(v);
    expect(f.querySelector('img')).toBeNull();
    expect(f.querySelector('[name="c_nome"]').value).toBe('"><img src=x onerror=alert(1)>');
  });

  it('normaliza o que o operador digitou em formato livre', () => {
    const f = renderizar(vazio());
    f.elements.c_cpf.value = '52998224725';
    f.elements.c_data_nascimento.value = '1/2/1990';
    f.elements.c_celular.value = '11 98765 4321';
    f.elements.c_estado_civil.value = 'solteira';
    const { valores } = lerFormulario(f);
    expect(valores.cpf).toBe('529.982.247-25');
    expect(valores.data_nascimento).toBe('01/02/1990');
    expect(valores.celular).toBe('(11)98765-4321');
    expect(valores.estado_civil).toBe('SOLTEIRO');
  });

  it('lista inválidos e obrigatórios faltando', () => {
    const f = renderizar(vazio());
    f.elements.c_data_nascimento.value = '31/02/1990';
    const { invalidos, faltando } = lerFormulario(f);
    expect(invalidos).toEqual(['Data de Nascimento']);
    expect(faltando).toContain('CPF');
    expect(faltando).not.toContain('Complemento');
  });
});
