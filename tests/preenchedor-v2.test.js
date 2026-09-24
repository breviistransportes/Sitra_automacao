import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { criarPreenchedor } from '../src/content/preenchedor.js';

const fixture = (nome) => readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), 'utf8');
const BASE = 'https://2323.aleff.com.br';

// Monta a tela a partir da fixture gerada da página real, com os handlers do Sitra simulados.
function criarTela(arquivo, caminho, handlers = {}) {
  const dom = new JSDOM(fixture(arquivo), { runScripts: 'dangerously', url: BASE + caminho });
  const win = dom.window;
  const doc = win.document;
  win.jQuery = { active: 0 };
  const ajax = (fn) => { win.jQuery.active++; setTimeout(() => { fn(); win.jQuery.active--; }, 20); };
  const limpar = (manter) => { for (const el of doc.querySelectorAll('input, select')) if (el.id !== manter && el.type !== 'button') el.value = ''; };
  const abrirModal = (id, texto, alvo) => { doc.getElementById(id).style.display = 'block'; doc.getElementById(alvo).textContent = texto; };
  // Stubs neutros para os demais handlers inline da página real.
  Object.assign(win, {
    tabContent() {}, modals() {}, SomenteNumero() { return true; }, completaData() {}, trim() {},
    pesquisaCep: () => ajax(() => {}), CarregaCidadePorUf: () => ajax(() => {}), CarregaCidadePorUfNatu: () => ajax(() => {}),
    cadProp: { TrataEquiparado() {}, NaoBuscar() { win.naoBuscarChamado = true; } },
  });
  for (const [nome, fn] of Object.entries(handlers)) win[nome] = (...a) => fn({ win, doc, ajax, limpar, abrirModal }, ...a);
  const p = criarPreenchedor(win, { timeoutMs: 1000, intervaloMs: 5 });
  return { win, doc, p, val: (id) => doc.getElementById(id).value };
}

const PROP = {
  prop_cpf_cnpj: '11.222.333/0001-81', prop_nome: 'TRANSPORTES FICTICIOS LTDA', prop_cep: '32010-000', prop_endereco: 'RUA DAS FLORES',
  prop_numero: '50', prop_complemento: '', prop_bairro: 'CENTRO', prop_uf: 'MG', prop_cidade: 'CONTAGEM', prop_ie: 'ISENTO',
  prop_rg: '', prop_org_exp: '', prop_rntrc: '012345678', prop_data_emissao_rntrc: '01/02/2024', prop_venc_rntrc: '01/02/2029',
  prop_data_nascimento: '', prop_uf_naturalidade: '', prop_naturalidade: '', prop_dependentes: '0', prop_propriedade: '3',
  prop_email: 'contato@ficticio.com', prop_telefone: '(31)99876-5432', prop_banco: '0', prop_agencia: '0', prop_agencia_digito: '0',
  prop_conta: '0', prop_conta_digito: '0', prop_tipo_conta: '1',
};

const VEIC = {
  veic_placa: 'ABC-1D23', veic_cpf_cnpj_prop: '11.222.333/0001-81', veic_tipo: '8', veic_renavam: '01234567890', veic_marca: 'VOLVO',
  veic_modelo: 'FH 540 6X4T', veic_tipo_propriedade: '3', veic_combustivel: '2', veic_ano_fab: '2019', veic_ano_modelo: '2020',
  veic_cor: 'BRANCA', veic_chassi: '9BVAS02D5KE123456', veic_certificado: '123456789012', veic_uf_registro: 'MG',
  veic_cidade_registro: 'CONTAGEM', veic_venc_licenciamento: '25/09/2026', veic_venc_ipva: '25/09/2026',
};

const propNovo = (extra = {}) => ({
  // CPF/CNPJ novo: o Sitra pergunta se busca na Receita.
  Search: ({ doc, ajax, abrirModal }) => ajax(() => {
    doc.getElementById('btnPerguntaNao').setAttribute('onclick', 'cadProp.NaoBuscar()');
    abrirModal('ModalAsk', 'Proprietário não cadastrado. Deseja buscar os dados na Receita?', 'pergunta');
  }),
  // Banco "0": o Sitra avisa, mas aceita.
  SearchBancoText: ({ abrirModal }) => abrirModal('ModalErro', 'Atenção, favor informar o número do banco sem o número 0 (zero) inicial.', 'erro'),
  ...extra,
});

describe('proprietário', () => {
  it('novo: responde "Não" à Receita, preenche tudo e ignora o aviso do banco 0', async () => {
    const { p, val, win, doc } = criarTela('proprietario.html', '/Proprietario/CadastroDeProprietario', propNovo());
    expect(p.estado()).toEqual({ tela: 'proprietario', vazio: true });
    const rel = await p.preencher(PROP);
    expect(rel.ok).toBe(true);
    expect(win.naoBuscarChamado).toBe(true);
    expect(doc.getElementById('ModalAsk').style.display).toBe('none');
    expect(val('txtProprietarioCpfCnpj')).toBe('11.222.333/0001-81');
    expect(val('txtIE')).toBe('ISENTO');
    expect(val('txtRntrc')).toBe('012345678');
    expect(val('txtBanco')).toBe('0');
    expect(val('txtTpConta')).toBe('1');
    expect(val('txtPropriedade')).toBe('3');
    expect(rel.avisos.join(' ')).not.toMatch(/banco/i);
    expect(doc.getElementById('ModalErro').style.display).toBe('none');
    expect(rel.campos.filter(c => c.status === 'falhou' || c.status === 'vazio')).toEqual([]);
  });

  it('já cadastrado: para', async () => {
    const { p } = criarTela('proprietario.html', '/Proprietario/CadastroDeProprietario', {
      Search: ({ doc, ajax }) => ajax(() => { doc.getElementById('txtProprietarioId').value = '77'; doc.getElementById('txtNomeProprietario').value = 'X'; }),
    });
    const rel = await p.preencher(PROP);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/já está cadastrado/);
  });

  it('outro aviso do Sitra no banco continua aparecendo', async () => {
    const { p } = criarTela('proprietario.html', '/Proprietario/CadastroDeProprietario', propNovo({
      SearchBancoText: ({ abrirModal }) => abrirModal('ModalErro', 'Banco não encontrado', 'erro'),
    }));
    const rel = await p.preencher({ ...PROP, prop_banco: '341' });
    expect(rel.avisos).toContain('Sitra: Banco não encontrado');
  });
});

describe('veículo', () => {
  const veicHandlers = (extra = {}) => ({
    Search: ({ ajax, limpar }) => ajax(() => limpar('txtPlacaVeiculo')),
    SearchProprietario: ({ doc, ajax }) => ajax(() => { doc.getElementById('txtNomeProprietario').value = 'TRANSPORTES FICTICIOS LTDA'; }),
    changeEngate: ({ doc, ajax }) => ajax(() => { doc.getElementById('txtEixos').value = '3'; doc.getElementById('txtCapacidadeKg').value = '0'; }),
    CarregaCidadePorUf: ({ doc, ajax }) => ajax(() => {
      const s = doc.getElementById('txtCidadeRegistro');
      s.innerHTML = '<option value="">Selecione</option><option value="BELO HORIZONTE">BELO HORIZONTE</option><option value="CONTAGEM">CONTAGEM</option>';
    }),
    ...extra,
  });

  it('novo: preenche, espera o tipo (eixos) e escolhe a cidade de registro carregada', async () => {
    const { p, val } = criarTela('veiculo.html', '/Veiculo/CadastroDeVeiculos', veicHandlers());
    expect(p.estado()).toEqual({ tela: 'veiculo', vazio: true });
    const rel = await p.preencher(VEIC);
    expect(rel.ok).toBe(true);
    expect(val('txtPlacaVeiculo')).toBe('ABC-1D23');
    expect(val('txtTipoVeiculo')).toBe('8');
    expect(val('txtEixos')).toBe('3');
    expect(val('txtTipoCombustivel')).toBe('2');
    expect(val('txtCidadeRegistro')).toBe('CONTAGEM');
    expect(val('txtVencimentoIPVA')).toBe('25/09/2026');
    expect(rel.campos.filter(c => c.status !== 'ok')).toEqual([]);
  });

  it('placa já cadastrada: para', async () => {
    const { p } = criarTela('veiculo.html', '/Veiculo/CadastroDeVeiculos', veicHandlers({
      Search: ({ doc, ajax }) => ajax(() => { doc.getElementById('txtStatusVeiculo').value = 'Ativo'; }),
    }));
    const rel = await p.preencher(VEIC);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/já está cadastrado/);
  });

  it('proprietário ainda não cadastrado: avisa e continua', async () => {
    const { p } = criarTela('veiculo.html', '/Veiculo/CadastroDeVeiculos', veicHandlers({ SearchProprietario: ({ ajax }) => ajax(() => {}) }));
    const rel = await p.preencher(VEIC);
    expect(rel.ok).toBe(true);
    expect(rel.avisos.join(' ')).toMatch(/cadastre o proprietário/);
  });

  it('cidade de registro que não está na lista: avisa', async () => {
    const { p } = criarTela('veiculo.html', '/Veiculo/CadastroDeVeiculos', veicHandlers());
    const rel = await p.preencher({ ...VEIC, veic_cidade_registro: 'CIDADE INEXISTENTE' });
    expect(rel.avisos.join(' ')).toMatch(/Cidade Registro/);
  });
});

describe('motorista v2', () => {
  it('preenche a placa e espera a busca do veículo', async () => {
    const { p, val } = criarTela('sitra.html', '/Motorista/CadastroDeMotorista', {
      Search: ({ ajax, limpar }) => ajax(() => limpar('txtMotoristaCpf')),
      searchVeiculo: ({ doc, ajax }) => ajax(() => { doc.getElementById('txtVeiculoMarcaModeloCor').value = 'VOLVO - FH - BRANCA'; }),
    });
    const rel = await p.preencher({ cpf: '529.982.247-25', nome: 'JOSE', placa: 'ABC-1D23' });
    expect(rel.ok).toBe(true);
    expect(val('txtPlacaVeiculo')).toBe('ABC-1D23');
    expect(val('txtVeiculoMarcaModeloCor')).toBe('VOLVO - FH - BRANCA');
  });
});

describe('estado e paridade com as páginas reais', () => {
  it('detecta cada tela pela URL', () => {
    expect(criarTela('sitra.html', '/Motorista/CadastroDeMotorista').p.estado().tela).toBe('motorista');
    expect(criarTela('proprietario.html', '/Proprietario/CadastroDeProprietario').p.estado().tela).toBe('proprietario');
    expect(criarTela('veiculo.html', '/Veiculo/CadastroDeVeiculos').p.estado().tela).toBe('veiculo');
    expect(criarTela('sitra.html', '/Home').p.estado().tela).toBe(null);
  });

  it('fixtures têm exatamente os handlers inline das páginas salvas', () => {
    const pares = [['sitra.html', 'Cadastro De Motoristas.html'], ['proprietario.html', 'CadastroDeProprietarios.html'], ['veiculo.html', 'CadastroDeVeiculos.html']];
    for (const [fix, real] of pares) {
      const caminho = new URL(`../campos_necessarios/${real}`, import.meta.url);
      if (!existsSync(caminho)) continue; // páginas salvas ficam fora do git
      const docReal = new JSDOM(readFileSync(caminho, 'utf8')).window.document;
      const docFix = new JSDOM(fixture(fix)).window.document;
      for (const el of docFix.querySelectorAll('[id]')) {
        const r = docReal.getElementById(el.id);
        const eventos = (x) => [...x.attributes].filter(a => a.name.startsWith('on')).map(a => `${a.name}=${a.value}`).sort();
        expect(eventos(el), `${fix} #${el.id}`).toEqual(eventos(r));
      }
    }
  });
});
