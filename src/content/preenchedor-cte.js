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

export function criarPreenchedorCte(win, { timeoutMs = 8000, intervaloMs = 100 } = {}) {
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
      if (conformeNota) atribuir('txtMercadoriasTransportadasProduto', conformeNota.value);
      else avisos.push('Produto predominante “CONFORME NOTA” não apareceu na lista do Sitra — escolha manualmente.');
      atribuir('txtMercadoriasTransportadasEspecie', 'VOL');

      elemento('btnMercadoriasTransportadasNotasFiscais')?.click();
      await esperarCondicao('Abrir Notas e Outros', () => modalVisivel('ModalNotasFiscais'));
      const nf = elemento('rdbNF');
      if (!nf) throw new Error('A opção NF-e/NF não existe mais na tela do Sitra.');
      nf.checked = true;
      nf.dispatchEvent(new win.Event('change', { bubbles: true }));

      const nota = [
        ['txtNotasFiscaisChaveNfe', valores.protocolo_autorizacao],
        ['txtNotasFiscaisNotaFiscal', valores.numero_nota],
        ['txtNotasFiscaisSerie', valores.serie],
        ['txtNotasFiscaisCfop', valores.cfop],
        ['txtNotasFiscaisValorMerc', valores.valor_total],
        ['txtNotasFiscaisVolume', valores.volume],
        ['txtNotasFiscaisPeso', valores.peso_bruto],
        ['txtNotasFiscaisDataEmissao', valores.data_emissao],
      ];
      for (const [id, valor] of nota) if (elemento(id) && valor) atribuir(id, valor);

      const grade = elemento('divPartialNotasFiscais');
      const antes = grade?.innerHTML ?? '';
      elemento('btnNotasFiscaisAdd')?.click();
      await esperarSitra('Inserir nota');
      await esperarCondicao('A nota não apareceu na grade', () => {
        const agora = grade?.innerHTML ?? '';
        return agora !== antes && (!!grade?.querySelector('tr') || !!agora.trim());
      });
      campos.push({ rotulo: 'Nota fiscal', status: 'ok', obtido: valores.numero_nota || valores.protocolo_autorizacao });

      if (valores.motorista_cpf) {
        atribuir('txtMotoristaCpf', valores.motorista_cpf, 'blur');
        await esperarSitra('Motorista');
      }
      const combinado = elemento('chkFreteCombinado');
      if (!combinado) throw new Error('A opção Frete Combinado não existe mais na tela do Sitra.');
      if (!combinado.checked) combinado.click();
      await esperarCondicao('Abrir responsável pelo frete combinado', () => modalVisivel('ModalFreteCombinadoResponsavel'));
      return { ok: true, tela: 'cte', avisos, campos };
    } catch (e) {
      return falha(e.message);
    }
  }

  return { estado, preencher };
}
