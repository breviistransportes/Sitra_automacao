// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { criarPreenchedorCiot } from '../src/content/preenchedor-ciot.js';

const fixture = (nome) => readFileSync(new URL(`./fixtures/webrouter-${nome}.html`, import.meta.url), 'utf8');
const URL_CIOT = 'https://www.webrouter.com.br/way/?#/ciot/emissaoCIOT/v2/add';

const DADOS = {
  tipo: 'lotacao', contratante: 'breviis1', data_inicio: '15/10/2026', data_fim: '18/10/2026',
  contratado: { cpf_cnpj: '529.982.247-25', nome: 'JOAO DA SILVA', rntrc: '012345678' },
  motorista: { nome: 'JOAO DA SILVA', cpf: '529.982.247-25' },
  destinatario: { cpf_cnpj: '82.508.433/0001-17', nome: 'CLIENTE LTDA' },
  ncm: '7308', peso: '1.152,00',
  origem: { cidade: 'SAO PAULO', uf: 'SP' }, destino: { cidade: 'CONTAGEM', uf: 'MG' },
  veiculos: [{ placa: 'ABC1D23', eixos: '3' }, { placa: 'XYZ9A87', eixos: '' }],
};

const CONTRATANTES_WEBROUTER = [
  { nome: 'BREVIIS TRANSPORTES', documento: { numero: '11222333000181' }, rntrc: '' },
  { nome: 'BREVIIS I', documento: { numero: '11222333000232' }, rntrc: '' },
  { nome: 'BREVIIS II', documento: { numero: '11222333000372' }, rntrc: '' },
];
const CIDADES = [
  { cidade: 'São Paulo', uf: 'SP', pais: 'Brasil', codigoIbge: '3550308' },
  { cidade: 'São Paulo de Olivença', uf: 'AM', pais: 'Brasil', codigoIbge: '1303908' },
  { cidade: 'Contagem', uf: 'MG', pais: 'Brasil', codigoIbge: '3118601' },
];

// Componente da tela do Webrouter: formulário vazio (ciotEmissaoV2) e os métodos que a extensão usa,
// com a mesma lógica do código do Webrouter (785.*.js: addCadastrosCiot, filterCadastrosCiot, filterCidade…).
function criarTela({ url = URL_CIOT, contratantes = CONTRATANTES_WEBROUTER, cidades = CIDADES } = {}) {
  const dom = new JSDOM(fixture('contratante'), { url });
  const win = dom.window;
  const chamadas = { emitir: 0, buscasContratante: [] };
  const vm = {
    formulario: {
      tipoOperacao: 'CARGA_LOTACAO', dataInicio: '', dataFim: '',
      contratante: { nome: '', documento: '', rntrc: null }, contratado: { nome: '', documento: '', rntrc: null },
      motorista: { nome: '', documento: '' }, destinatario: { nome: '', documento: '' }, viagens: [],
      carga: { codigoNatureza: '0001', codigoTipoCarga: '', contratantesCargaFracionada: [], peso: 0 },
      veiculos: [], valorFrete: 0,
    },
    select: { optionsCadastrosCiot: [], optionsCidades: [] },
    dialogCadastrosCiot: { open: false, tipo: '', fracionadaIdx: null },
    cadastrosCiot: null,
    $nextTick: () => Promise.resolve(),
    onDataInicioViagemChange() {},
    async filterCadastrosCiot(val, update) {
      chamadas.buscasContratante.push(val);
      await Promise.resolve();
      update(() => { this.select.optionsCadastrosCiot = contratantes.filter(c => !val || c.nome.includes(val)); });
    },
    documentoCadastroComMascaraCpfCnpj(doc) {
      const d = String(doc ?? '').replace(/\D/g, '');
      if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
      if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
      return d;
    },
    addCadastrosCiot(tipo) {
      const idx = this.dialogCadastrosCiot.fracionadaIdx;
      if (tipo === 'contratante' && idx != null && idx >= 0) {
        const item = this.formulario.carga.contratantesCargaFracionada[idx];
        item.nome = this.cadastrosCiot.nome;
        item.documento = this.documentoCadastroComMascaraCpfCnpj(this.cadastrosCiot.documento.numero);
      } else if (tipo === 'contratante') {
        this.formulario.contratante.nome = this.cadastrosCiot.nome;
        this.formulario.contratante.documento = this.documentoCadastroComMascaraCpfCnpj(this.cadastrosCiot.documento.numero);
        this.formulario.contratante.rntrc = this.cadastrosCiot.rntrc || '';
      }
      this.cadastrosCiot = null;
      this.dialogCadastrosCiot.open = false;
      this.dialogCadastrosCiot.fracionadaIdx = null;
    },
    garantirContratantesCargaFracionadaMinimas() {
      if (!this.formulario.carga.contratantesCargaFracionada.length) this.formulario.carga.contratantesCargaFracionada.push({ documento: '', nome: '' });
    },
    garantirViagensMinimas() {
      if (!this.formulario.viagens.length) {
        this.formulario.viagens.push({ origem: { cidade: { cidade: '', uf: '', pais: 'Brasil', codigoIbge: '' } }, destino: { cidade: { cidade: '', uf: '', pais: 'Brasil', codigoIbge: '' } }, distanciaPercorrida: null });
      }
    },
    filterCidade(val, update) {
      update(async () => {
        if (!val) return;
        await Promise.resolve();
        const n = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
        this.select.optionsCidades = cidades.filter(c => n(c.cidade).startsWith(n(val)));
      });
    },
    aplicarCidadeNoLado(opt, viagem, lado) {
      const alvo = viagem[lado].cidade;
      Object.assign(alvo, { cidade: opt.cidade, uf: opt.uf, codigoIbge: opt.codigoIbge });
    },
    async calcularDistanciasTodasViagens() { this.formulario.viagens[0].distanciaPercorrida = 590; },
    emitir() { chamadas.emitir++; },
  };
  // Vue 2 só guarda o componente (el.__vue__) no elemento raiz dele: aqui, num ancestral do formulário,
  // e o componente com o formulário é um pai desse (como o FormSectionCard dentro da tela de emissão).
  const raiz = win.document.querySelector('.emissao-ciot-form-campos').parentElement.parentElement;
  raiz.__vue__ = { $parent: vm };
  return { win, vm, f: vm.formulario, chamadas };
}

const status = (rel) => Object.fromEntries(rel.campos.map(c => [c.rotulo, c.status]));

describe('CIOT no Webrouter', () => {
  it('reconhece o emissor pelo formulário da tela, com ou sem www', () => {
    expect(criarPreenchedorCiot(criarTela().win).estado().tela).toBe('ciot');
    expect(criarPreenchedorCiot(criarTela({ url: 'https://webrouter.com.br/way/#/ciot' }).win).estado().tela).toBe('ciot');
    expect(criarPreenchedorCiot(criarTela({ url: 'https://exemplo.com.br/#/ciot' }).win).estado().tela).toBeNull();
    const semFormulario = new JSDOM('<body><h1>Dashboard</h1></body>', { url: URL_CIOT }).window;
    expect(criarPreenchedorCiot(semFormulario).estado().tela).toBeNull();
  });

  it('preenche o formulário inteiro sem abrir a janela do contratante e sem emitir', async () => {
    const t = criarTela();
    const rel = await criarPreenchedorCiot(t.win).preencher(DADOS);
    expect(rel.erro).toBeUndefined();
    expect(rel.ok).toBe(true);
    expect(t.f).toMatchObject({
      tipoOperacao: 'CARGA_LOTACAO', dataInicio: '15/10/2026', dataFim: '18/10/2026',
      contratante: { nome: 'BREVIIS I', documento: '11.222.333/0002-32' },
      contratado: { nome: 'JOAO DA SILVA', documento: '529.982.247-25', rntrc: '012345678' },
      motorista: { nome: 'JOAO DA SILVA', documento: '529.982.247-25' },
      destinatario: { nome: 'CLIENTE LTDA', documento: '82.508.433/0001-17' },
      carga: { codigoNatureza: '7308', codigoTipoCarga: 'CARGA_GERAL', peso: 1152 },
      veiculos: [{ placa: 'ABC1D23', rntrc: '012345678', numeroEixos: 3 }, { placa: 'XYZ9A87', rntrc: '012345678', numeroEixos: null }],
      valorFrete: 0,
    });
    expect(t.f.viagens[0]).toMatchObject({ origem: { cidade: { cidade: 'São Paulo', uf: 'SP', codigoIbge: '3550308' } }, destino: { cidade: { cidade: 'Contagem', uf: 'MG' } }, distanciaPercorrida: 590 });
    expect(t.vm.dialogCadastrosCiot.open).toBe(false);
    expect(t.chamadas.emitir).toBe(0);
    expect(status(rel)).toMatchObject({ 'Contratante (Breviis I)': 'ok', 'CPF/CNPJ do contratado (ANTT)': 'ok', Origem: 'ok', Destino: 'ok', 'Eixos (XYZ9A87)': 'vazio', 'Valor do frete e forma de pagamento': 'vazio' });
  });

  it('Breviis II fica com o CNPJ de final 72', async () => {
    const t = criarTela();
    await criarPreenchedorCiot(t.win).preencher({ ...DADOS, contratante: 'breviis2' });
    expect(t.f.contratante.documento).toMatch(/72$/);
  });

  it('fracionada: tipo, Contratante 1 com a mesma Breviis e NCM 0001 do Webrouter', async () => {
    const t = criarTela();
    const rel = await criarPreenchedorCiot(t.win).preencher({ ...DADOS, tipo: 'fracionada' });
    expect(t.f.tipoOperacao).toBe('CARGA_FRACIONADA');
    expect(t.f.carga.contratantesCargaFracionada[0]).toEqual({ nome: 'BREVIIS I', documento: '11.222.333/0002-32' });
    expect(t.f.carga.codigoNatureza).toBe('0001');
    expect(status(rel)['Contratante 1 (fracionada)']).toBe('ok');
  });

  it('sem a Breviis na busca: busca por nome, anota a pendência e preenche o contratado mesmo assim', async () => {
    const t = criarTela({ contratantes: [CONTRATANTES_WEBROUTER[0]] });
    const rel = await criarPreenchedorCiot(t.win).preencher(DADOS);
    expect(t.chamadas.buscasContratante).toEqual(['', 'BREVIIS']);
    expect(status(rel)['Contratante (Breviis I)']).toBe('vazio');
    expect(t.f.contratante.documento).toBe('');
    expect(t.f.contratado.documento).toBe('529.982.247-25');
  });

  it('cidade que não existe na busca vira pendência e a distância não é calculada', async () => {
    const t = criarTela({ cidades: [CIDADES[0]] });
    const rel = await criarPreenchedorCiot(t.win).preencher(DADOS);
    expect(rel.ok).toBe(true);
    const destino = rel.campos.find(c => c.rotulo === 'Destino');
    expect(destino.status).toBe('vazio');
    expect(destino.motivo).toMatch(/cidade não encontrada/);
    expect(t.f.viagens[0].distanciaPercorrida).toBeNull();
  });

  it('fora do emissor não mexe em nada', async () => {
    const outra = new JSDOM('<body><h1>Dashboard</h1></body>', { url: URL_CIOT }).window;
    const rel = await criarPreenchedorCiot(outra).preencher(DADOS);
    expect(rel.ok).toBe(false);
    expect(rel.erro).toMatch(/Emissor de CIOT/);
  });
});
