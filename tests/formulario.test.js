// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { montarFormulario, lerFormulario, mostrarAba, abaAtiva } from '../src/sidepanel/formulario.js';
import { CAMPOS } from '../src/lib/campos.js';

const vazio = () => Object.fromEntries(CAMPOS.map(c => [c.chave, { valor: '', certeza: 'conferir', fonte: '' }]));

function renderizar(valores, veiculos) {
  document.body.innerHTML = `<form id="f">${montarFormulario(valores, veiculos)}</form>`;
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

  it('três abas: Motorista, Proprietário e Veículo; a primeira aberta', () => {
    const f = renderizar(vazio());
    expect([...f.querySelectorAll('.aba')].map(b => b.textContent)).toEqual(['Motorista', 'Proprietário', 'Veículo']);
    expect(f.querySelector('[data-painel="motorista"]').hidden).toBe(false);
    expect(f.querySelector('[data-painel="veiculo:0"]').hidden).toBe(true);
    expect(f.querySelector('[data-painel="veiculo:0"] select[name="c_veic_tipo__0"] option[value="8"]').textContent).toBe('Cavalo');
    expect(f.querySelector('[data-painel="proprietario"] select[name="c_prop_tipo_conta"]')).not.toBeNull();
  });

  it('mostrarAba troca a aba visível', () => {
    const f = renderizar(vazio());
    mostrarAba(f, 'veiculo:0');
    expect(f.querySelector('[data-painel="veiculo:0"]').hidden).toBe(false);
    expect(f.querySelector('[data-painel="motorista"]').hidden).toBe(true);
    expect(f.querySelector('.aba[data-tela="veiculo:0"]').classList.contains('ativa')).toBe(true);
  });

  it('com a tela informada, inválidos e faltando são só daquela tela', () => {
    const f = renderizar(vazio());
    f.elements.c_data_nascimento.value = '31/02/1990';
    f.elements.c_veic_ano_fab__0.value = '19';
    const { invalidos, faltando } = lerFormulario(f, 'veiculo:0');
    expect(invalidos).toEqual(['Ano Fab.']);
    expect(faltando).toContain('Chassi');
    expect(faltando).not.toContain('CPF');
  });

  it('lista inválidos e obrigatórios faltando', () => {
    const f = renderizar(vazio());
    f.elements.c_data_nascimento.value = '31/02/1990';
    const { invalidos, faltando } = lerFormulario(f);
    expect(invalidos).toEqual(['Data de Nascimento']);
    expect(faltando).toContain('CPF');
    expect(faltando).not.toContain('Complemento');
  });

  describe('cavalo + carreta', () => {
    const veiculo = (placa, tipo) => {
      const v = Object.fromEntries(CAMPOS.filter(c => c.tela === 'veiculo').map(c => [c.chave, { valor: '', certeza: 'conferir', fonte: '' }]));
      v.veic_placa = { valor: placa, certeza: 'alta', fonte: 'CRLV.pdf' };
      v.veic_tipo = { valor: tipo, certeza: 'alta', fonte: 'CRLV.pdf' };
      return v;
    };
    const dois = () => renderizar(vazio(), [veiculo('ABC-1D23', '8'), veiculo('XYZ-9K87', '4')]);

    it('uma aba por veículo, com tipo e placa', () => {
      const f = dois();
      expect([...f.querySelectorAll('.aba')].map(b => b.textContent))
        .toEqual(['Motorista', 'Proprietário', 'Veículo 1 · Cavalo ABC-1D23', 'Veículo 2 · Carreta XYZ-9K87']);
      expect(f.elements.c_veic_placa__1.value).toBe('XYZ-9K87');
    });

    it('lê só o veículo da aba pedida, junto com os demais campos', () => {
      const f = dois();
      const { valores, faltando } = lerFormulario(f, 'veiculo:1');
      expect(valores.veic_placa).toBe('XYZ-9K87');
      expect(valores.veic_tipo).toBe('4');
      expect(faltando).toContain('Chassi');
      expect(lerFormulario(f, 'motorista').valores.veic_placa).toBe('ABC-1D23');
    });

    it('abaAtiva diz qual aba está aberta', () => {
      const f = dois();
      expect(abaAtiva(f)).toBe('motorista');
      mostrarAba(f, 'veiculo:1');
      expect(abaAtiva(f)).toBe('veiculo:1');
      expect(f.querySelector('[data-painel="veiculo:0"]').hidden).toBe(true);
    });
  });
});

describe('estado do formulário para o histórico', () => {
  it('dadosDoFormulario devolve valores, certeza e fonte como estão na tela, por veículo', async () => {
    const { dadosDoFormulario } = await import('../src/sidepanel/formulario.js');
    const v = vazio();
    v.cpf = { valor: '529.982.247-25', certeza: 'alta', fonte: 'CNH-e.pdf' };
    const carreta = { ...vazio(), veic_placa: { valor: 'XYZ-9K87', certeza: 'conferir', fonte: 'CRLV.pdf' } };
    document.body.innerHTML = `<form id="f">${montarFormulario(v, [v, carreta])}</form>`;
    const f = document.getElementById('f');
    f.elements.c_nome.value = 'JOSE DA SILVA';
    f.elements.c_nome.closest('label').classList.remove('conferir'); // o painel tira o amarelo ao digitar
    const d = dadosDoFormulario(f);
    expect(d.valores.cpf).toEqual({ valor: '529.982.247-25', certeza: 'alta', fonte: 'CNH-e.pdf' });
    expect(d.valores.nome).toEqual({ valor: 'JOSE DA SILVA', certeza: 'alta', fonte: '' });
    expect(d.valores.veic_placa).toBeUndefined();
    expect(d.veiculos).toHaveLength(2);
    expect(d.veiculos[1].veic_placa).toEqual({ valor: 'XYZ-9K87', certeza: 'conferir', fonte: 'CRLV.pdf' });
    // Reabrir do histórico reconstrói a mesma tela.
    document.body.innerHTML = `<form id="g">${montarFormulario(d.valores, d.veiculos)}</form>`;
    expect(document.getElementById('g').elements.c_nome.value).toBe('JOSE DA SILVA');
    expect(document.getElementById('g').elements.c_veic_placa__1.value).toBe('XYZ-9K87');
  });
});
