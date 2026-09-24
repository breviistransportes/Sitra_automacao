import { CAMPOS, CAMPO_POR_CHAVE } from '../lib/campos.js';

const PESSOAIS = ['nome', 'data_nascimento', 'estado_civil', 'nome_pai', 'nome_mae', 'nacionalidade', 'propriedade', 'celular', 'fone_residencial', 'email'];
const DOCUMENTACAO = ['rg', 'uf_exp', 'org_exp', 'data_expedicao_rg', 'registro_cnh', 'numero_espelho_cnh', 'data_primeira_cnh', 'data_emissao_cnh', 'data_validade_cnh', 'categoria_cnh'];
const VINDOS_DO_CEP = ['endereco', 'bairro', 'uf', 'cidade'];

const comparavel = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^0-9A-Z@.]/g, '');

// Roda no mundo principal da página (world: "MAIN") para enxergar o jQuery do Sitra.
export function criarPreenchedor(win, { timeoutMs = 8000, intervaloMs = 100 } = {}) {
  const doc = win.document;
  const el = (id) => doc.getElementById(id);
  const esperar = (ms) => new Promise(r => win.setTimeout(r, ms));
  const valorDe = (chave) => el(CAMPO_POR_CHAVE[chave].id)?.value ?? '';

  async function aguardarSitra() {
    const fim = Date.now() + timeoutMs;
    let ociosos = 0;
    await esperar(intervaloMs);
    while (Date.now() < fim) {
      ociosos = (win.jQuery?.active ?? 0) === 0 ? ociosos + 1 : 0;
      if (ociosos >= 2) return;
      await esperar(intervaloMs);
    }
    throw new Error('O Sitra demorou demais para responder. Tente de novo.');
  }

  function fecharModalErroSeAberto() {
    const m = el('ModalErro');
    if (!m || !(m.classList.contains('in') || m.style.display === 'block')) return null;
    const texto = (el('erro')?.textContent ?? '').trim();
    if (win.jQuery?.fn?.modal) win.jQuery('#ModalErro').modal('hide');
    m.classList.remove('in');
    m.style.display = 'none';
    return texto;
  }

  function estado() {
    const naPagina = win.location.pathname.toLowerCase().includes('/motorista/cadastrodemotorista');
    const vazio = naPagina && ['cpf', 'nome', 'cep', 'rg'].every(k => !valorDe(k).trim());
    return { naPagina, vazio };
  }

  async function preencher(valores) {
    const avisos = [];
    const falha = (erro) => ({ ok: false, erro, avisos, campos: [] });

    const definir = (chave) => {
      const campo = CAMPO_POR_CHAVE[chave];
      const e = el(campo.id);
      if (!e) {
        avisos.push(`Campo ${campo.rotulo} não existe mais na página do Sitra`);
        return;
      }
      e.value = valores[chave];
      e.dispatchEvent(new win.Event('input', { bubbles: true }));
      e.dispatchEvent(new win.Event('change', { bubbles: true }));
    };
    const definirSeTiver = (chave) => { if (valores[chave]) definir(chave); };
    const registrarModal = () => {
      const t = fecharModalErroSeAberto();
      if (t) avisos.push(`Sitra: ${t}`);
      return t;
    };

    if (!estado().naPagina) return falha('Abra a tela Cadastro de Motoristas do Sitra nesta aba.');

    try {
      // 1. CPF primeiro: o Search() do Sitra limpa o formulário quando o CPF é novo.
      definir('cpf');
      await aguardarSitra();
      const msgCpf = registrarModal();
      if (!valorDe('cpf')) return falha(`O Sitra recusou o CPF${msgCpf ? `: ${msgCpf}` : ''}.`);
      if ((el('txtStatusMotorista')?.value ?? '').trim()) return falha('Este motorista já está cadastrado no Sitra. Nada foi alterado além do CPF.');

      // 2. Dados pessoais e contato.
      PESSOAIS.forEach(definirSeTiver);

      // 3. Naturalidade: a UF carrega a lista de cidades antes.
      if (valores.uf_naturalidade) { definir('uf_naturalidade'); await aguardarSitra(); }
      definirSeTiver('naturalidade');

      // 4. Endereço: o CEP preenche logradouro/bairro/UF/cidade; só completamos o que ficou vazio.
      if (valores.cep) { definir('cep'); await aguardarSitra(); registrarModal(); }
      definirSeTiver('numero');
      definirSeTiver('complemento');
      if (!valorDe('uf') && valores.uf) { definir('uf'); await aguardarSitra(); }
      for (const k of ['endereco', 'bairro', 'cidade']) if (!valorDe(k).trim()) definirSeTiver(k);

      // 5. Documentação.
      DOCUMENTACAO.forEach(definirSeTiver);
      registrarModal();
    } catch (e) {
      return falha(e.message);
    }

    // 6. Conferência campo a campo.
    const campos = [];
    for (const c of CAMPOS) {
      const esperado = valores[c.chave] ?? '';
      const obtido = valorDe(c.chave);
      let status;
      if (esperado) {
        if (el(c.id) && comparavel(obtido) === comparavel(esperado)) status = 'ok';
        else if (VINDOS_DO_CEP.includes(c.chave) && obtido) status = 'sitra';
        else status = 'falhou';
      } else if (obtido) status = 'sitra';
      else if (c.obrigatorio) status = 'vazio';
      else continue;
      campos.push({ chave: c.chave, rotulo: c.rotulo, esperado, obtido, status });
    }
    return { ok: true, avisos, campos };
  }

  return { estado, preencher };
}
