const comparavel = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^0-9A-Z]/g, '');

function instalarContadorXhr(win) {
  if (win.__cmXhrInstalado || !win.XMLHttpRequest) return;
  win.__cmXhrInstalado = true;
  win.__cmXhrPendentes = win.__cmXhrPendentes ?? 0;
  const enviar = win.XMLHttpRequest.prototype.send;
  win.XMLHttpRequest.prototype.send = function (...args) {
    win.__cmXhrPendentes++;
    const fim = () => { win.__cmXhrPendentes = Math.max(0, win.__cmXhrPendentes - 1); };
    this.addEventListener('loadend', fim, { once: true });
    try { return enviar.apply(this, args); } catch (e) { fim(); throw e; }
  };
}

export function criarPreenchedorCte(win, { timeoutMs = 8000, intervaloMs = 100, calmaMs = 1500 } = {}) {
  instalarContadorXhr(win);
  const doc = win.document;
  const elemento = (id) => doc.getElementById(id);
  const esperar = (ms) => new Promise(resolve => win.setTimeout(resolve, ms));
  const pendentes = () => win.__cmXhrInstalado ? (win.__cmXhrPendentes ?? 0) : (win.jQuery?.active ?? 0);

  function atribuir(id, valor, evento = 'change') {
    const campo = elemento(id);
    if (!campo) throw new Error(`O campo #${id} não existe mais na página do Sitra.`);
    campo.value = valor ?? '';
    campo.dispatchEvent(new win.Event('input', { bubbles: true }));
    campo.dispatchEvent(new win.Event('change', { bubbles: true }));
    if (evento === 'blur') {
      campo.dispatchEvent(new win.Event('blur'));
      campo.dispatchEvent(new win.Event('focusout', { bubbles: true }));
    }
    return campo;
  }

  async function esperarSitra(etapa) {
    const fim = Date.now() + timeoutMs;
    let ocioso = 0;
    await esperar(intervaloMs);
    while (Date.now() < fim) {
      ocioso = pendentes() > 0 ? 0 : ocioso + 1;
      if (ocioso >= 2) return;
      await esperar(intervaloMs);
    }
    throw new Error(`${etapa}: o Sitra demorou demais para responder.`);
  }

  // Espera o Sitra ficar sem requisições por calmaMs seguidos: a soma das notas encadeia
  // setTimeout(1000) + várias requisições, e o cálculo por tabela pode desmarcar o combinado.
  async function esperarCalma(etapa) {
    const fim = Date.now() + Math.max(timeoutMs, calmaMs * 4);
    let desde = Date.now();
    while (Date.now() < fim) {
      if (pendentes() > 0) desde = Date.now();
      else if (Date.now() - desde >= calmaMs) return;
      await esperar(intervaloMs);
    }
    throw new Error(`${etapa}: o Sitra demorou demais para responder.`);
  }

  async function esperarCondicao(etapa, condicao) {
    const fim = Date.now() + timeoutMs;
    while (Date.now() < fim) {
      if (condicao()) return;
      await esperar(intervaloMs);
    }
    throw new Error(`${etapa}: o Sitra demorou demais para atualizar.`);
  }

  const modalVisivel = (id) => {
    const modal = elemento(id);
    return !!modal && (modal.classList.contains('in') || modal.style.display === 'block');
  };

  // Recusas do servidor mantêm o valor digitado e abrem um destes modais (DigitacaoCte.js, Search*).
  const MODAIS_BLOQUEIO = ['ModalErro', 'ModalAsk', 'ModalAskCte', 'ModalDemaisIeRemetente', 'ModalDemaisIeDestinatario',
    'ModalDemaisIeExpedidor', 'ModalDemaisIeRecebedor', 'ModalDemaisIeTomador'];
  function mensagemBloqueio() {
    const aberto = MODAIS_BLOQUEIO.find(modalVisivel);
    if (!aberto) return null;
    const texto = elemento(aberto).querySelector('#erro, #pergunta, #perguntaCte')?.textContent.replace(/\s+/g, ' ').trim();
    return texto || 'o Sitra abriu uma pergunta ou erro na tela';
  }
  function verificarBloqueio(etapa) {
    const msg = mensagemBloqueio();
    if (msg) throw new Error(`${etapa}: ${msg} — resolva no Sitra antes de continuar.`);
  }

  function estado() {
    const correto = win.location.origin === 'https://2323.aleff.com.br'
      && win.location.pathname.toLowerCase().replace(/\/$/, '') === '/digitacaocte2/digitacaocte2';
    return { tela: correto ? 'cte' : null, tipoFreteEscolhido: !!elemento('txtTipoFrete')?.value };
  }

  async function preencher(valores) {
    const avisos = [];
    const campos = [];
    const falha = (erro) => ({ ok: false, tela: 'cte', erro, avisos, campos });
    if (estado().tela !== 'cte') return falha('Abra a tela Digitação de CT-e.');
    if (!elemento('txtTipoFrete')?.value) return falha('Escolha o Tipo de Frete no Sitra antes de preencher.');

    const preencherParticipante = async (id, valor, etapa) => {
      if (!valor) return;
      atribuir(id, valor, 'blur');
      await esperarSitra(etapa);
      verificarBloqueio(etapa);
      if (!elemento(id)?.value) throw new Error(`${etapa}: o Sitra recusou o CNPJ informado.`);
      campos.push({ rotulo: etapa, status: 'ok', obtido: elemento(id).value });
    };

    try {
      await preencherParticipante('txtRemetenteCpfCnpj', valores.remetente_cnpj, 'Remetente');
      await preencherParticipante('txtDestinatarioCpfCnpj', valores.destinatario_cnpj, 'Destinatário');
      await preencherParticipante('txtExpedidorCpfCnpj', valores.expedidor_cnpj, 'Expedidor');
      await preencherParticipante('txtRecebedorCpfCnpj', valores.recebedor_cnpj, 'Recebedor');

      const cnpjTomador = {
        remetente: valores.remetente_cnpj,
        destinatario: valores.destinatario_cnpj,
        expedidor: valores.expedidor_cnpj,
        recebedor: valores.recebedor_cnpj,
      }[valores.tomador] ?? '';
      const tomador = elemento('txtTomadorCpfCnpj');
      if (tomador && !tomador.disabled && !tomador.readOnly) {
        await preencherParticipante('txtTomadorCpfCnpj', cnpjTomador, 'Tomador');
      } else if (tomador && cnpjTomador && comparavel(tomador.value) !== comparavel(cnpjTomador)) {
        avisos.push('O tomador derivado pelo Tipo de Frete diverge do tomador selecionado. Confira sem alterar o Tipo de Frete.');
      }

      const produto = elemento('txtMercadoriasTransportadasProduto');
      const conformeNota = produto && [...produto.options].find(o => comparavel(o.text) === 'CONFORMENOTA');
      // Os dois campos têm onblur="Cte.GetAliqICMS()": o blur busca a alíquota de ICMS.
      if (conformeNota) atribuir('txtMercadoriasTransportadasProduto', conformeNota.value, 'blur');
      else avisos.push('Produto predominante “CONFORME NOTA” não apareceu na lista do Sitra — escolha manualmente.');
      atribuir('txtMercadoriasTransportadasEspecie', 'VOL', 'blur');
      await esperarSitra('Alíquota de ICMS');
      verificarBloqueio('Alíquota de ICMS');

      elemento('btnMercadoriasTransportadasNotasFiscais')?.click();
      await esperarCondicao('Abrir Notas e Outros', () => modalVisivel('ModalNotasFiscais'));
      const nf = elemento('rdbNF');
      if (!nf) throw new Error('A opção NF-e/NF não existe mais na tela do Sitra.');
      nf.checked = true;
      nf.dispatchEvent(new win.Event('change', { bubbles: true }));

      // onblur="Cte.ConsultaChaveNotasFiscais": com a chave, o Sitra traz nº/série e bloqueia esses campos.
      if (valores.chave_acesso) {
        atribuir('txtNotasFiscaisChaveNfe', valores.chave_acesso, 'blur');
        await esperarSitra('Consultar chave de acesso');
        verificarBloqueio('Consultar chave de acesso');
      }
      const nota = [
        ['txtNotasFiscaisNotaFiscal', valores.numero_nota],
        ['txtNotasFiscaisSerie', valores.serie],
        ['txtNotasFiscaisCfop', valores.cfop],
        ['txtNotasFiscaisValorMerc', valores.valor_total],
        ['txtNotasFiscaisVolume', valores.volume],
        ['txtNotasFiscaisPeso', valores.peso_bruto],
        ['txtNotasFiscaisDataEmissao', valores.data_emissao],
      ];
      for (const [id, valor] of nota) if (elemento(id) && !elemento(id).disabled && valor) atribuir(id, valor);

      const grade = elemento('divPartialNotasFiscais');
      const antes = grade?.innerHTML ?? '';
      elemento('btnNotasFiscaisAdd')?.click();
      await esperarSitra('Inserir nota');
      verificarBloqueio('Inserir nota');
      await esperarCondicao('A nota não apareceu na grade', () => {
        const agora = grade?.innerHTML ?? '';
        return agora !== antes && (!!grade?.querySelector('tr') || !!agora.trim());
      });
      campos.push({ rotulo: 'Nota fiscal', status: 'ok', obtido: valores.numero_nota || valores.chave_acesso });

      // Ordem pedida pelo operador: fechar Notas/Outros primeiro (entrar nas notas desmarca o combinado),
      // esperar a soma e o cálculo do Sitra terminarem, e só então marcar o Frete Combinado.
      win.jQuery?.('#ModalNotasFiscais')?.modal?.('hide');
      await esperarCondicao('Fechar Notas e Outros', () => !modalVisivel('ModalNotasFiscais'));
      await esperarCalma('Somar notas');
      // Pergunta do cálculo por tabela ("Cobrar Taxa…?") não impede o combinado: fica para o operador.
      const perguntaTabela = modalVisivel('ModalAskCte') ? mensagemBloqueio() : null;
      if (!perguntaTabela) verificarBloqueio('Somar notas');

      const combinado = elemento('chkFreteCombinado');
      if (!combinado) throw new Error('A opção Frete Combinado não existe mais na tela do Sitra.');
      if (combinado.disabled) throw new Error('Frete Combinado está desabilitado no Sitra (CT-e vinculado a cotação?) — marque manualmente.');
      if (!combinado.checked) combinado.click();
      await esperarCondicao('Marcar Frete Combinado', () => combinado.checked);
      // Com alíquota ≠ 0 o Sitra pergunta "Deseja incluir ICMS": a decisão fiscal é do operador.
      const perguntaIcms = modalVisivel('ModalAsk') ? elemento('pergunta')?.textContent.replace(/\s+/g, ' ').trim() : null;

      if (valores.motorista_cpf) {
        atribuir('txtMotoristaCpf', valores.motorista_cpf, 'blur');
        await esperarSitra('Motorista');
        if (modalVisivel('ModalErro')) verificarBloqueio('Motorista');
      }
      if (!combinado.checked) throw new Error('O Sitra desmarcou o Frete Combinado — marque de novo manualmente.');
      campos.push({ rotulo: 'Frete Combinado', status: 'ok', obtido: 'marcado' });
      for (const p of [perguntaTabela, perguntaIcms]) if (p) avisos.push(`O Sitra perguntou: "${p}" — responda na tela.`);
      avisos.push('Informe frete peso, frete valor, o responsável pelo frete combinado e os campos manuais antes de cadastrar.');
      return { ok: true, tela: 'cte', avisos, campos };
    } catch (e) {
      return falha(e.message);
    }
  }

  return { estado, preencher };
}
