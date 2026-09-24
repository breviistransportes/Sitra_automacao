import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { criarPreenchedor } from '../src/content/preenchedor.js';

const HTML = readFileSync(new URL('./fixtures/sitra.html', import.meta.url), 'utf8');
const URL_SITRA = 'https://2323.aleff.com.br/Motorista/CadastroDeMotorista';

const VALORES = {
  cpf: '529.982.247-25', nome: 'JOSE DA SILVA', cep: '01310-100', endereco: 'AVENIDA PAULISTA', numero: '1000',
  complemento: 'AP 12', bairro: 'BELA VISTA', uf: 'SP', cidade: 'SAO PAULO', data_nascimento: '15/03/1985',
  estado_civil: 'CASADO', nome_pai: 'JOAO DA SILVA', nome_mae: 'MARIA DA SILVA', uf_naturalidade: 'MG',
  naturalidade: 'BELO HORIZONTE', nacionalidade: 'BRASILEIRA', propriedade: '3', celular: '(11)98765-4321',
  fone_residencial: '(11)98765-4321', email: 'jose@exemplo.com', rg: '123456789', uf_exp: 'SP', org_exp: 'SSP',
  data_expedicao_rg: '10/01/2005', registro_cnh: '01234567890', numero_espelho_cnh: '',
  data_primeira_cnh: '20/05/2005', data_emissao_cnh: '01/02/2023', data_validade_cnh: '01/02/2033', categoria_cnh: 'AE',
};

// Simula o Sitra: cada handler "faz uma requisição" (jQuery.active > 0 por alguns ms).
function criarSitra({ url = URL_SITRA, search, pesquisaCep } = {}) {
  const dom = new JSDOM(HTML, { runScripts: 'dangerously', url });
  const win = dom.window;
  const doc = win.document;
  win.jQuery = { active: 0 };
  const ajax = (fn) => { win.jQuery.active++; setTimeout(() => { fn(); win.jQuery.active--; }, 20); };
  const limparCampos = () => {
    for (const el of doc.querySelectorAll('input, select')) if (el.id !== 'txtMotoristaCpf') el.value = '';
  };
  win.Search = () => ajax(search ?? limparCampos);
  win.pesquisaCep = () => ajax(pesquisaCep ?? (() => {}));
  win.CarregaCidadePorUf = () => ajax(() => {});
  win.CarregaCidadePorUfNatu = () => ajax(() => {});
  const p = criarPreenchedor(win, { timeoutMs: 1000, intervaloMs: 5 });
  const val = (id) => doc.getElementById(id).value;
  const abrirModal = (texto) => { doc.getElementById('ModalErro').style.display = 'block'; doc.getElementById('erro').textContent = texto; };
  return { win, doc, p, val, abrirModal };
}

describe('preenchedor', () => {
  it('preenche tudo mesmo com o Search() limpando o formulário (CPF novo)', async () => {
    const { p, val } = criarSitra();
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(true);
    expect(val('txtMotoristaCpf')).toBe('529.982.247-25');
    expect(val('txtMotoristaNome')).toBe('JOSE DA SILVA');
    expect(val('txtNumeroCnh')).toBe('01234567890');
    expect(val('txtPropriedade')).toBe('3');
    expect(val('txtNaturalidade')).toBe('BELO HORIZONTE');
    expect(rel.campos.filter(c => c.status !== 'ok')).toEqual([]);
  });

  it('para quando o motorista já existe', async () => {
    const { p, val, doc } = criarSitra({
      search: () => { doc.getElementById('txtStatusMotorista').value = 'Ativo'; doc.getElementById('txtMotoristaNome').value = 'FULANO'; },
    });
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/já está cadastrado/);
    expect(val('txtMotoristaNome')).toBe('FULANO');
  });

  it('para quando o Sitra recusa o CPF e repassa a mensagem', async () => {
    const { p, doc, abrirModal } = criarSitra({
      search: () => { abrirModal('CPF inválido, Favor Verificar!'); doc.getElementById('txtMotoristaCpf').value = ''; },
    });
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toContain('CPF inválido, Favor Verificar!');
    expect(doc.getElementById('ModalErro').style.display).toBe('none');
  });

  it('mantém o endereço que o Sitra trouxe pelo CEP e marca como "sitra"', async () => {
    const { p, val, doc } = criarSitra({
      pesquisaCep: () => {
        doc.getElementById('txtEndereco').value = 'AV. PAULISTA';
        doc.getElementById('txtBairro').value = 'BELA VISTA';
        doc.getElementById('txtUf').value = 'SP';
        doc.getElementById('txtCidade').value = 'SÃO PAULO';
      },
    });
    const rel = await p.preencher(VALORES);
    expect(val('txtEndereco')).toBe('AV. PAULISTA');
    expect(val('txtNumero')).toBe('1000');
    expect(rel.campos.find(c => c.chave === 'endereco').status).toBe('sitra');
  });

  it('CEP não encontrado: fecha o modal, avisa e usa o endereço do documento', async () => {
    const { p, val, abrirModal } = criarSitra({ pesquisaCep: () => abrirModal('CEP não Encontrado!') });
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(true);
    expect(rel.avisos).toContain('Sitra: CEP não Encontrado!');
    expect(val('txtEndereco')).toBe('AVENIDA PAULISTA');
    expect(val('txtUf')).toBe('SP');
  });

  it('campo que sumiu da página: continua e marca como falhou', async () => {
    const { p, doc, val } = criarSitra();
    doc.getElementById('txtCategoriaCnh').remove();
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(true);
    expect(val('txtNumeroCnh')).toBe('01234567890');
    expect(rel.campos.find(c => c.chave === 'categoria_cnh').status).toBe('falhou');
    expect(rel.avisos).toContain('Campo Categoria não existe mais na página do Sitra');
  });

  it('obrigatório sem valor aparece como vazio', async () => {
    const { p } = criarSitra();
    const rel = await p.preencher({ ...VALORES, estado_civil: '' });
    expect(rel.campos.find(c => c.chave === 'estado_civil').status).toBe('vazio');
  });

  it('fora da tela de cadastro não preenche', async () => {
    const { p, val } = criarSitra({ url: 'https://2323.aleff.com.br/Home' });
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(false);
    expect(val('txtMotoristaCpf')).toBe('');
  });

  it('Sitra que não responde vira erro claro', async () => {
    const { p, win } = criarSitra({ search: () => {} });
    win.Search = () => { win.jQuery.active = 1; };
    const rel = await p.preencher(VALORES);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/demorou demais/);
  });

  it('estado() informa página e formulário vazio', () => {
    const { p, doc } = criarSitra();
    expect(p.estado()).toEqual({ naPagina: true, vazio: true });
    doc.getElementById('txtMotoristaNome').value = 'X';
    expect(p.estado()).toEqual({ naPagina: true, vazio: false });
  });
});
