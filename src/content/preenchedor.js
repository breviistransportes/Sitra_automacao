import { CAMPO_POR_CHAVE, camposDaTela, TELAS } from '../lib/campos.js';

const comparavel = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^0-9A-Z@.]/g, '');

// Campos que disparam a busca no Sitra ao perder o foco: o foco não pode ficar neles depois do preenchimento.
const GATILHOS = { motorista: ['cpf', 'cep', 'placa'], proprietario: ['prop_cpf_cnpj', 'prop_cep'], veiculo: ['veic_placa', 'veic_cpf_cnpj_prop'] };
// Campos de endereço de cada tela (o Sitra preenche logradouro/bairro/UF/cidade pelo CEP).
const ENDERECO = {
  motorista: { cep: 'cep', endereco: 'endereco', bairro: 'bairro', uf: 'uf', cidade: 'cidade', numero: 'numero', complemento: 'complemento' },
  proprietario: { cep: 'prop_cep', endereco: 'prop_endereco', bairro: 'prop_bairro', uf: 'prop_uf', cidade: 'prop_cidade', numero: 'prop_numero', complemento: 'prop_complemento' },
};
const PARA_VERIFICAR_VAZIO = { motorista: ['cpf', 'nome', 'cep', 'rg'], proprietario: ['prop_cpf_cnpj', 'prop_nome', 'prop_cep'], veiculo: ['veic_placa', 'veic_renavam', 'veic_chassi'] };
const AVISO_BANCO_ZERO = /banco sem o n[uú]mero 0/i;

// Conta as requisições XHR realmente abertas. Não dá para confiar só em jQuery.active: no jQuery 1.x do
// Sitra, um erro dentro do callback de sucesso (ex.: Search do proprietário com um CPF que só existe como
// motorista → this.Gestora.GestoraId de null) pula o "--jQuery.active" e o contador fica preso para sempre.
function instalarContadorXhr(win) {
  if (win.__cmXhrInstalado || !win.XMLHttpRequest) return;
  win.__cmXhrInstalado = true;
  win.__cmXhrPendentes = win.__cmXhrPendentes ?? 0;
  const enviar = win.XMLHttpRequest.prototype.send;
  win.XMLHttpRequest.prototype.send = function (...args) {
    win.__cmXhrPendentes++;
    const fim = () => { win.__cmXhrPendentes = Math.max(0, win.__cmXhrPendentes - 1); };
    this.addEventListener('loadend', fim, { once: true });
    try {
      return enviar.apply(this, args);
    } catch (e) {
      fim();
      throw e;
    }
  };
}

// Roda no mundo principal da página (world: "MAIN") para enxergar o jQuery do Sitra.
export function criarPreenchedor(win, { timeoutMs = 8000, intervaloMs = 100 } = {}) {
  instalarContadorXhr(win);
  const doc = win.document;
  const el = (id) => doc.getElementById(id);
  const esperar = (ms) => new Promise(r => win.setTimeout(r, ms));
  const valorDe = (chave) => el(CAMPO_POR_CHAVE[chave].id)?.value ?? '';

  // O ViaCEP (pesquisaCep) é JSONP entre domínios: o jQuery 1.11 não o conta em jQuery.active,
  // então também esperamos a tag <script> do ViaCEP sumir.
  const pendentes = () => (win.__cmXhrInstalado ? win.__cmXhrPendentes : (win.jQuery?.active ?? 0));
  const ocupado = () => pendentes() > 0 || !!doc.querySelector('script[src*="viacep.com.br"]');
  let ultimoCampo = 'início';

  async function aguardarSitra() {
    const fim = Date.now() + timeoutMs;
    let ociosos = 0;
    await esperar(intervaloMs);
    while (Date.now() < fim) {
      ociosos = ocupado() ? 0 : ociosos + 1;
      if (ociosos >= 2) return;
      await esperar(intervaloMs);
    }
    const viacep = doc.querySelector('script[src*="viacep.com.br"]') ? 'sim' : 'não';
    throw new Error(`O Sitra demorou demais para responder (último campo: ${ultimoCampo}; requisições pendentes: ${pendentes()}; jQuery.active: ${win.jQuery?.active ?? '?'}; ViaCEP pendente: ${viacep}). Tente de novo.`);
  }

  const visivel = (id) => {
    const m = el(id);
    return !!m && (m.classList.contains('in') || m.style.display === 'block');
  };
  const esconder = (id) => {
    if (win.jQuery?.fn?.modal) win.jQuery(`#${id}`).modal('hide');
    const m = el(id);
    m.classList.remove('in');
    m.style.display = 'none';
  };

  function telaAtual() {
    const caminho = win.location.pathname.toLowerCase();
    return Object.keys(TELAS).find(t => caminho.includes(TELAS[t].caminho)) ?? null;
  }

  function estado() {
    const tela = telaAtual();
    const vazio = !!tela && PARA_VERIFICAR_VAZIO[tela].every(k => !valorDe(k).trim());
    return { tela, vazio };
  }

  async function preencher(valoresRecebidos) {
    let valores = { ...valoresRecebidos };
    const tela = telaAtual();
    const avisos = [];
    const falha = (erro) => ({ ok: false, erro, avisos, campos: [] });

    const definir = (chave) => {
      const campo = CAMPO_POR_CHAVE[chave];
      const e = el(campo.id);
      if (!e) {
        avisos.push(`Campo ${campo.rotulo} não existe mais na página do Sitra`);
        return;
      }
      ultimoCampo = campo.rotulo;
      e.value = valores[chave];
      e.dispatchEvent(new win.Event('input', { bubbles: true }));
      e.dispatchEvent(new win.Event('change', { bubbles: true }));
      // O Sitra dispara as buscas (Search, pesquisaCep, CarregaCidade*…) no onblur, não no onchange.
      e.dispatchEvent(new win.Event('blur'));
      e.dispatchEvent(new win.Event('focusout', { bubbles: true }));
    };
    const definirSeTiver = (chave) => { if (valores[chave]) definir(chave); };
    const definirEAguardar = async (chave) => { if (valores[chave]) { definir(chave); await aguardarSitra(); } };
    const registrarModal = (ignorar) => {
      if (!visivel('ModalErro')) return null;
      const t = (el('erro')?.textContent ?? '').trim();
      esconder('ModalErro');
      if (t && !(ignorar && ignorar.test(t))) avisos.push(`Sitra: ${t}`);
      return t;
    };

    // Documento principal (CPF, CPF/CNPJ ou placa) primeiro: a busca do Sitra limpa o formulário quando é novo.
    const identificar = async (chave, jaExiste, rotulo) => {
      definir(chave);
      await aguardarSitra();
      if (visivel('ModalAsk')) {
        // Proprietário novo: "buscar dados na Receita?" → Não (os dados vêm dos documentos). Responde, não salva.
        el('btnPerguntaNao').click();
        esconder('ModalAsk');
        await aguardarSitra();
      }
      const msg = registrarModal();
      if (!valorDe(chave)) return `O Sitra recusou o ${rotulo}${msg ? `: ${msg}` : ''}.`;
      if (jaExiste()) return `Este ${TELAS[tela].rotulo.toLowerCase()} já está cadastrado no Sitra. Nada foi alterado além do ${rotulo}.`;
      return null;
    };

    // Endereço: o CEP preenche logradouro/bairro/UF/cidade; só completamos o que ficou vazio.
    const endereco = async (k) => {
      if (valores[k.cep]) { definir(k.cep); await aguardarSitra(); registrarModal(); }
      definirSeTiver(k.numero);
      definirSeTiver(k.complemento);
      if (!valorDe(k.uf) && valores[k.uf]) { definir(k.uf); await aguardarSitra(); }
      for (const c of [k.endereco, k.bairro, k.cidade]) if (!valorDe(c).trim()) definirSeTiver(c);
    };

    // <select> carregado pelo Sitra: escolhe a opção pelo texto (valores em MAIÚSCULAS, com ou sem acento).
    const escolherOpcaoPorTexto = (chave) => {
      const campo = CAMPO_POR_CHAVE[chave];
      const s = el(campo.id);
      if (!valores[chave] || !s) return;
      const op = [...s.options].find(o => comparavel(o.text) === comparavel(valores[chave]));
      if (!op) { avisos.push(`${campo.rotulo} "${valores[chave]}" não está na lista do Sitra — escolha manualmente`); return; }
      valores = { ...valores, [chave]: op.value };
      definir(chave);
    };

    const SEQUENCIAS = {
      async motorista() {
        const erro = await identificar('cpf', () => !!(el('txtStatusMotorista')?.value ?? '').trim(), 'CPF');
        if (erro) return erro;
        ['nome', 'data_nascimento', 'estado_civil', 'nome_pai', 'nome_mae', 'nacionalidade', 'propriedade', 'celular', 'fone_residencial', 'email'].forEach(definirSeTiver);
        await definirEAguardar('uf_naturalidade');
        definirSeTiver('naturalidade');
        await endereco(ENDERECO.motorista);
        ['rg', 'uf_exp', 'org_exp', 'data_expedicao_rg', 'registro_cnh', 'data_primeira_cnh', 'data_emissao_cnh', 'data_validade_cnh', 'categoria_cnh'].forEach(definirSeTiver);
        await definirEAguardar('placa');
        registrarModal();
        return null;
      },
      async proprietario() {
        // Existente = o Sitra mostrou "Alterar". txtProprietarioId não serve: um CPF que só existe como
        // motorista (EhMot) também preenche o id, e o Sitra o trata como proprietário novo.
        const erro = await identificar('prop_cpf_cnpj', () => el('btnAlterar')?.getAttribute('type') === 'button', 'CPF/CNPJ');
        if (erro) return erro;
        definirSeTiver('prop_nome');
        await endereco(ENDERECO.proprietario);
        ['prop_ie', 'prop_rg', 'prop_org_exp', 'prop_rntrc', 'prop_data_emissao_rntrc', 'prop_venc_rntrc', 'prop_data_nascimento'].forEach(definirSeTiver);
        await definirEAguardar('prop_uf_naturalidade');
        ['prop_naturalidade', 'prop_dependentes', 'prop_propriedade', 'prop_email', 'prop_telefone'].forEach(definirSeTiver);
        // CIOT: banco "0" gera o aviso "sem o 0 inicial", que o Sitra aceita — fechamos sem registrar.
        await definirEAguardar('prop_banco');
        registrarModal(AVISO_BANCO_ZERO);
        ['prop_agencia', 'prop_agencia_digito', 'prop_conta', 'prop_conta_digito', 'prop_tipo_conta'].forEach(definirSeTiver);
        registrarModal();
        return null;
      },
      async veiculo() {
        const erro = await identificar('veic_placa', () => !!(el('txtStatusVeiculo')?.value ?? '').trim(), 'Placa');
        if (erro) return erro;
        await definirEAguardar('veic_cpf_cnpj_prop');
        registrarModal();
        if (valores.veic_cpf_cnpj_prop && !(el('txtNomeProprietario')?.value ?? '').trim()) {
          avisos.push('Proprietário não encontrado no Sitra — cadastre o proprietário antes de salvar o veículo.');
        }
        // O tipo carrega eixos/capacidade (changeEngate) antes dos demais campos.
        await definirEAguardar('veic_tipo');
        registrarModal();
        ['veic_renavam', 'veic_marca', 'veic_modelo', 'veic_tipo_propriedade', 'veic_combustivel', 'veic_ano_fab', 'veic_ano_modelo',
          'veic_cor', 'veic_chassi', 'veic_certificado', 'veic_venc_licenciamento', 'veic_venc_ipva'].forEach(definirSeTiver);
        // Cidade de registro é um <select> carregado depois da UF.
        await definirEAguardar('veic_uf_registro');
        escolherOpcaoPorTexto('veic_cidade_registro');
        registrarModal();
        return null;
      },
    };

    if (!tela) return falha('Abra no Sitra a tela de Cadastro de Motorista, de Proprietário ou de Veículo nesta aba.');

    try {
      // Se o foco está num campo de busca (o "Limpar" do Sitra foca o documento), tira agora: um blur
      // real depois do preenchimento rodaria a busca de novo e apagaria/trocaria tudo.
      const ativo = doc.activeElement;
      if (ativo && GATILHOS[tela].map(k => CAMPO_POR_CHAVE[k].id).includes(ativo.id)) {
        ativo.blur();
        await aguardarSitra();
      }
      const erro = await SEQUENCIAS[tela]();
      if (erro) return falha(erro);
    } catch (e) {
      return falha(e.message);
    }

    // Conferência campo a campo, só da tela aberta.
    const doCep = ENDERECO[tela] ? [ENDERECO[tela].endereco, ENDERECO[tela].bairro, ENDERECO[tela].uf, ENDERECO[tela].cidade] : [];
    const campos = [];
    for (const c of camposDaTela(tela)) {
      const esperado = valores[c.chave] ?? '';
      const obtido = valorDe(c.chave);
      let status;
      if (esperado) {
        if (el(c.id) && comparavel(obtido) === comparavel(esperado)) status = 'ok';
        else if (doCep.includes(c.chave) && obtido) status = 'sitra';
        else status = 'falhou';
      } else if (obtido) status = 'sitra';
      else if (c.obrigatorio) status = 'vazio';
      else continue;
      campos.push({ chave: c.chave, rotulo: c.rotulo, esperado, obtido, status });
    }
    return { ok: true, tela, avisos, campos };
  }

  return { estado, preencher };
}
