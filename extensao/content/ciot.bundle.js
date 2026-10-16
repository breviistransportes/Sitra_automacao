(() => {
  // src/lib/campos.js
  var MOTORISTA = [
    { chave: "cpf", id: "txtMotoristaCpf", rotulo: "CPF", tipo: "cpf", max: 14, obrigatorio: true, grupo: "Identifica\xE7\xE3o", dica: "CPF do motorista (na CNH ou em outro documento)" },
    { chave: "nome", id: "txtMotoristaNome", rotulo: "Nome", tipo: "texto", max: 50, obrigatorio: true, grupo: "Identifica\xE7\xE3o", dica: "Nome completo como est\xE1 na CNH" },
    { chave: "cep", id: "txtCep", rotulo: "CEP", tipo: "cep", max: 9, obrigatorio: true, grupo: "Endere\xE7o", dica: "CEP do comprovante de endere\xE7o" },
    { chave: "endereco", id: "txtEndereco", rotulo: "Endere\xE7o", tipo: "texto", max: 50, obrigatorio: true, grupo: "Endere\xE7o", dica: "Logradouro (rua, avenida...) sem o n\xFAmero" },
    { chave: "numero", id: "txtNumero", rotulo: "N\xFAmero", tipo: "texto", max: 10, obrigatorio: true, grupo: "Endere\xE7o", dica: "N\xFAmero do im\xF3vel" },
    { chave: "complemento", id: "txtComplemento", rotulo: "Complemento", tipo: "texto", max: 30, obrigatorio: false, grupo: "Endere\xE7o", dica: "Complemento (apto, bloco, casa...)" },
    { chave: "bairro", id: "txtBairro", rotulo: "Bairro", tipo: "texto", max: 30, obrigatorio: true, grupo: "Endere\xE7o", dica: "Bairro" },
    { chave: "uf", id: "txtUf", rotulo: "UF", tipo: "uf", obrigatorio: true, grupo: "Endere\xE7o", dica: "Sigla do estado do endere\xE7o" },
    { chave: "cidade", id: "txtCidade", rotulo: "Cidade", tipo: "texto", max: 40, obrigatorio: true, grupo: "Endere\xE7o", dica: "Cidade do endere\xE7o" },
    { chave: "data_nascimento", id: "txtDataNascimento", rotulo: "Data de Nascimento", tipo: "data", max: 10, obrigatorio: true, grupo: "Dados pessoais", dica: "Data de nascimento" },
    { chave: "estado_civil", id: "txtEstadoCivil", rotulo: "Estado Civil", tipo: "estado_civil", max: 9, obrigatorio: true, grupo: "Dados pessoais", dica: "Estado civil, somente se estiver escrito em algum documento ou na conversa" },
    { chave: "nome_pai", id: "txtNomePai", rotulo: "Nome do Pai", tipo: "texto", max: 40, obrigatorio: true, grupo: "Dados pessoais", dica: "Nome do pai (filia\xE7\xE3o)" },
    { chave: "nome_mae", id: "txtNomeMae", rotulo: "Nome da M\xE3e", tipo: "texto", max: 40, obrigatorio: true, grupo: "Dados pessoais", dica: "Nome da m\xE3e (filia\xE7\xE3o)" },
    { chave: "uf_naturalidade", id: "txtNaturalidadeUf", rotulo: "UF Naturalidade", tipo: "uf", obrigatorio: true, grupo: "Dados pessoais", dica: "Sigla do estado onde nasceu" },
    { chave: "naturalidade", id: "txtNaturalidade", rotulo: "Naturalidade", tipo: "texto", max: 40, obrigatorio: true, grupo: "Dados pessoais", dica: "Cidade onde nasceu" },
    { chave: "nacionalidade", id: "txtNacionalidade", rotulo: "Nacionalidade", tipo: "texto", max: 20, obrigatorio: true, grupo: "Dados pessoais", dica: "Nacionalidade, somente se estiver escrita", padrao: "nacionalidade" },
    { chave: "propriedade", id: "txtPropriedade", rotulo: "Propriedade", tipo: "propriedade", obrigatorio: true, grupo: "Dados pessoais", dica: "Tipo de v\xEDnculo (valor padr\xE3o da configura\xE7\xE3o)", padrao: "propriedade", soPadrao: true },
    { chave: "celular", id: "txtCelular", rotulo: "Celular", tipo: "telefone", max: 14, obrigatorio: true, grupo: "Contato", dica: "Celular com DDD (da conversa ou de documentos)" },
    { chave: "fone_residencial", id: "txtResidencial", rotulo: "Fone Residencial 1", tipo: "telefone", max: 14, obrigatorio: true, grupo: "Contato", dica: "Outro telefone com DDD, se houver" },
    { chave: "email", id: "txtEmail", rotulo: "E-mail", tipo: "email", max: 60, obrigatorio: false, grupo: "Contato", dica: "E-mail, se aparecer" },
    { chave: "rg", id: "txtRg", rotulo: "R.G.", tipo: "rg", max: 12, obrigatorio: true, grupo: "Documenta\xE7\xE3o", dica: "N\xFAmero do RG (na CNH: DOC. IDENTIDADE)" },
    { chave: "uf_exp", id: "txtUfExp", rotulo: "UF Exp.", tipo: "uf", obrigatorio: false, grupo: "Documenta\xE7\xE3o", dica: "UF do \xF3rg\xE3o emissor do RG" },
    { chave: "org_exp", id: "txtOrgExp", rotulo: "Org. Exp.", tipo: "texto", max: 10, obrigatorio: true, grupo: "Documenta\xE7\xE3o", dica: "\xD3rg\xE3o emissor do RG (ex.: SSP)" },
    { chave: "data_expedicao_rg", id: "txtDataExpedicao", rotulo: "Data Expedi\xE7\xE3o (RG)", tipo: "data", max: 10, obrigatorio: true, grupo: "Documenta\xE7\xE3o", dica: "Data de expedi\xE7\xE3o do RG \u2014 s\xF3 existe no pr\xF3prio RG" },
    { chave: "registro_cnh", id: "txtNumeroCnh", rotulo: "N\xBA Registro CNH", tipo: "registro_cnh", max: 14, obrigatorio: true, grupo: "Documenta\xE7\xE3o", dica: "N\xBA REGISTRO da CNH (11 d\xEDgitos)" },
    { chave: "data_primeira_cnh", id: "txtDataPrimeiraCnh", rotulo: "Data Primeira CNH", tipo: "data", max: 10, obrigatorio: true, grupo: "Documenta\xE7\xE3o", dica: "1\xAA HABILITA\xC7\xC3O" },
    { chave: "data_emissao_cnh", id: "txtDataEmissaoCnh", rotulo: "Data Emiss\xE3o CNH", tipo: "data", max: 10, obrigatorio: false, grupo: "Documenta\xE7\xE3o", dica: "DATA EMISS\xC3O da CNH" },
    { chave: "data_validade_cnh", id: "txtDataValidadeCnh", rotulo: "Data Validade CNH", tipo: "data", max: 10, obrigatorio: true, grupo: "Documenta\xE7\xE3o", dica: "VALIDADE da CNH" },
    { chave: "categoria_cnh", id: "txtCategoriaCnh", rotulo: "Categoria", tipo: "categoria", max: 4, obrigatorio: true, grupo: "Documenta\xE7\xE3o", dica: "CAT. HAB. (ex.: AE, D)" },
    { chave: "placa", id: "txtPlacaVeiculo", rotulo: "Placa Ve\xEDculo", tipo: "placa", max: 8, obrigatorio: false, grupo: "Identifica\xE7\xE3o", dica: "Placa do ve\xEDculo do motorista", ia: false }
  ].map((c) => ({ tela: "motorista", ia: !c.soPadrao, ...c }));
  var PROPRIETARIO = [
    { chave: "prop_cpf_cnpj", id: "txtProprietarioCpfCnpj", rotulo: "CPF/CNPJ", tipo: "cpf_cnpj", max: 18, obrigatorio: true, grupo: "Propriet\xE1rio", dica: "CPF ou CNPJ do transportador no cart\xE3o da ANTT (se n\xE3o houver, o PROPRIET\xC1RIO do CRV/CRLV)", ia: true },
    { chave: "prop_nome", id: "txtNomeProprietario", rotulo: "Nome", tipo: "texto", max: 50, obrigatorio: true, grupo: "Propriet\xE1rio", dica: "Nome ou raz\xE3o social do transportador no cart\xE3o da ANTT (se n\xE3o houver, o PROPRIET\xC1RIO do CRV/CRLV)", ia: true },
    { chave: "prop_cep", id: "txtCep", rotulo: "CEP", tipo: "cep", max: 9, obrigatorio: true, grupo: "Propriet\xE1rio", dica: "igual ao do motorista" },
    { chave: "prop_endereco", id: "txtEndereco", rotulo: "Endere\xE7o", tipo: "texto", max: 50, obrigatorio: true, grupo: "Propriet\xE1rio", dica: "igual ao do motorista" },
    { chave: "prop_numero", id: "txtNumero", rotulo: "N\xFAmero", tipo: "texto", max: 10, obrigatorio: true, grupo: "Propriet\xE1rio", dica: "igual ao do motorista" },
    { chave: "prop_complemento", id: "txtComplemento", rotulo: "Complemento", tipo: "texto", max: 20, obrigatorio: false, grupo: "Propriet\xE1rio", dica: "igual ao do motorista" },
    { chave: "prop_bairro", id: "txtBairro", rotulo: "Bairro", tipo: "texto", max: 30, obrigatorio: true, grupo: "Propriet\xE1rio", dica: "igual ao do motorista" },
    { chave: "prop_uf", id: "txtUf", rotulo: "UF", tipo: "uf", obrigatorio: true, grupo: "Propriet\xE1rio", dica: "igual ao do motorista" },
    { chave: "prop_cidade", id: "txtCidade", rotulo: "Cidade", tipo: "texto", max: 40, obrigatorio: true, grupo: "Propriet\xE1rio", dica: "igual ao do motorista" },
    { chave: "prop_ie", id: "txtIE", rotulo: "Inscri\xE7\xE3o Estadual", tipo: "texto", max: 16, obrigatorio: true, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "ISENTO" },
    { chave: "prop_rg", id: "txtRG", rotulo: "RG", tipo: "rg", max: 12, obrigatorio: false, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "RG do propriet\xE1rio pessoa f\xEDsica", ia: true },
    { chave: "prop_org_exp", id: "txtOrgExp", rotulo: "Org. Exp.", tipo: "texto", max: 10, obrigatorio: false, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "\xD3rg\xE3o emissor do RG do propriet\xE1rio", ia: true },
    { chave: "prop_rntrc", id: "txtRntrc", rotulo: "RNTRC", tipo: "rntrc", max: 9, obrigatorio: true, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "N\xFAmero do RNTRC no cart\xE3o/certificado da ANTT (8 ou 9 d\xEDgitos)", ia: true },
    { chave: "prop_data_emissao_rntrc", id: "txtDataEmissaoRntrc", rotulo: "Data Emiss\xE3o ANTT", tipo: "data", max: 10, obrigatorio: false, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "Data de emiss\xE3o no cart\xE3o da ANTT", ia: true },
    { chave: "prop_venc_rntrc", id: "txtVencimentoRntrc", rotulo: "Vencimento RNTRC", tipo: "data", max: 10, obrigatorio: true, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "Validade no cart\xE3o da ANTT", ia: true },
    { chave: "prop_data_nascimento", id: "txtDataNascimento", rotulo: "Data Nascimento", tipo: "data", max: 10, obrigatorio: false, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "igual ao motorista quando \xE9 a mesma pessoa" },
    { chave: "prop_uf_naturalidade", id: "txtUfNatural", rotulo: "Naturalidade UF", tipo: "uf", obrigatorio: false, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "igual ao motorista quando \xE9 a mesma pessoa" },
    { chave: "prop_naturalidade", id: "txtCidadeNatu", rotulo: "Naturalidade", tipo: "texto", max: 40, obrigatorio: false, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "igual ao motorista quando \xE9 a mesma pessoa" },
    { chave: "prop_dependentes", id: "txtNumeroDependentes", rotulo: "N\xBA Dependentes", tipo: "digitos", max: 2, obrigatorio: true, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "0" },
    { chave: "prop_propriedade", id: "txtPropriedade", rotulo: "Propriedade", tipo: "propriedade", obrigatorio: true, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "padr\xE3o da configura\xE7\xE3o", padrao: "propriedade" },
    { chave: "prop_email", id: "txtEmail", rotulo: "E-mail", tipo: "email", max: 60, obrigatorio: true, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "E-mail do propriet\xE1rio; se vazio, o do motorista", ia: true },
    { chave: "prop_telefone", id: "txtTelefone", rotulo: "Telefone", tipo: "telefone", max: 14, obrigatorio: true, grupo: "Documenta\xE7\xE3o (propriet\xE1rio)", dica: "Telefone do propriet\xE1rio; se vazio, o celular do motorista", ia: true },
    { chave: "prop_banco", id: "txtBanco", rotulo: "Banco", tipo: "digitos", max: 3, obrigatorio: true, grupo: "CIOT", dica: "0" },
    { chave: "prop_agencia", id: "txtAgencia", rotulo: "Ag\xEAncia", tipo: "digitos", max: 4, obrigatorio: true, grupo: "CIOT", dica: "0" },
    { chave: "prop_agencia_digito", id: "txtDigito", rotulo: "D\xEDgito Ag\xEAncia", tipo: "digitos", max: 1, obrigatorio: true, grupo: "CIOT", dica: "0" },
    { chave: "prop_conta", id: "txtContaCorrente", rotulo: "Conta Corrente", tipo: "digitos", max: 11, obrigatorio: true, grupo: "CIOT", dica: "0" },
    { chave: "prop_conta_digito", id: "txtContaCorrenteDigito", rotulo: "D\xEDgito Conta", tipo: "digitos", max: 1, obrigatorio: true, grupo: "CIOT", dica: "0" },
    { chave: "prop_tipo_conta", id: "txtTpConta", rotulo: "Tipo de Conta", tipo: "opcao", obrigatorio: true, grupo: "CIOT", dica: "Conta Corrente", opcoes: [["1", "CC - Conta Corrente"], ["2", "CP - Conta Poupan\xE7a"]] }
  ].map((c) => ({ tela: "proprietario", ia: false, ...c }));
  var TIPOS_VEICULO = [
    ["13", "3/4"],
    ["14", "710"],
    ["1", "Caminh\xE3o"],
    ["4", "Carreta"],
    ["5", "Carreta6"],
    ["6", "Carreta7"],
    ["7", "Carreta9"],
    ["8", "Cavalo"],
    ["9", "Fiorino"],
    ["16", "HR"],
    ["18", "IVECO"],
    ["15", "KOMBI"],
    ["17", "MASTER"],
    ["11", "Moto"],
    ["12", "Side Car"],
    ["3", "Toco"],
    ["2", "Truck"],
    ["10", "Utilit"],
    ["20", "VAN"],
    ["19", "VUC"]
  ];
  var COMBUSTIVEIS = [
    ["1", "\xC1lcool"],
    ["8", "Biodisel"],
    ["2", "Diesel"],
    ["9", "Diesel S10"],
    ["10", "Diesel S500"],
    ["3", "Energia El\xE9trica"],
    ["7", "Flex"],
    ["4", "Gasolina"],
    ["5", "GLP"],
    ["6", "GNV"],
    ["11", "N\xE3o aplic\xE1vel"]
  ];
  var VEICULO = [
    { chave: "veic_placa", id: "txtPlacaVeiculo", rotulo: "Placa", tipo: "placa", max: 8, obrigatorio: true, grupo: "Ve\xEDculo", dica: "PLACA no CRV/CRLV", ia: true },
    { chave: "veic_cpf_cnpj_prop", id: "txtCpfCnpjProprietario", rotulo: "CPF/CNPJ do Propriet\xE1rio", tipo: "cpf_cnpj", max: 18, obrigatorio: true, grupo: "Ve\xEDculo", dica: "o do propriet\xE1rio" },
    { chave: "veic_tipo", id: "txtTipoVeiculo", rotulo: "Tipo do Ve\xEDculo", tipo: "opcao", obrigatorio: true, grupo: "Ve\xEDculo", dica: "Tipo do ve\xEDculo no Sitra, deduzido de ESP\xC9CIE/TIPO, CARROCERIA e eixos do CRV (ex.: CAMINH\xC3O TRATOR \u2192 Cavalo; SEMI-REBOQUE \u2192 Carreta)", opcoes: TIPOS_VEICULO, ia: true },
    { chave: "veic_renavam", id: "txtRenavam", rotulo: "RENAVAM", tipo: "digitos", max: 11, obrigatorio: true, grupo: "Ve\xEDculo", dica: "C\xD3DIGO RENAVAM", ia: true },
    { chave: "veic_marca", id: "txtMarca", rotulo: "Marca", tipo: "texto", max: 30, obrigatorio: true, grupo: "Ve\xEDculo", dica: "Marca (parte antes da / em MARCA/MODELO/VERS\xC3O)", ia: true },
    { chave: "veic_modelo", id: "txtModelo", rotulo: "Modelo", tipo: "texto", max: 30, obrigatorio: true, grupo: "Ve\xEDculo", dica: "Modelo/vers\xE3o (parte depois da / em MARCA/MODELO/VERS\xC3O)", ia: true },
    { chave: "veic_tipo_propriedade", id: "txtTipoPropriedade", rotulo: "Tipo Propriedade", tipo: "propriedade", obrigatorio: true, grupo: "Ve\xEDculo", dica: "padr\xE3o da configura\xE7\xE3o", padrao: "propriedade" },
    { chave: "veic_combustivel", id: "txtTipoCombustivel", rotulo: "Combust\xEDvel", tipo: "opcao", obrigatorio: true, grupo: "Ve\xEDculo", dica: "COMBUST\xCDVEL no CRV", opcoes: COMBUSTIVEIS, ia: true },
    { chave: "veic_ano_fab", id: "txtAnoFabricacao", rotulo: "Ano Fab.", tipo: "ano", max: 4, obrigatorio: true, grupo: "Ve\xEDculo", dica: "ANO FABRICA\xC7\xC3O", ia: true },
    { chave: "veic_ano_modelo", id: "txtAnoModelo", rotulo: "Ano Modelo", tipo: "ano", max: 4, obrigatorio: true, grupo: "Ve\xEDculo", dica: "ANO MODELO", ia: true },
    { chave: "veic_cor", id: "txtCorVeiculo", rotulo: "Cor", tipo: "texto", max: 10, obrigatorio: true, grupo: "Ve\xEDculo", dica: "COR PREDOMINANTE", ia: true },
    { chave: "veic_chassi", id: "txtChassi", rotulo: "Chassi", tipo: "chassi", max: 22, obrigatorio: true, grupo: "Ve\xEDculo", dica: "CHASSI", ia: true },
    { chave: "veic_certificado", id: "txtCertificadoPropriedade", rotulo: "Cert. Registro e Licenciamento", tipo: "digitos", max: 15, obrigatorio: true, grupo: "Ve\xEDculo", dica: "N\xFAmero do CRV/CRLV (N\xDAMERO DO CRV ou n\xFAmero do documento)", ia: true },
    { chave: "veic_uf_registro", id: "txtUfRegistro", rotulo: "Estado Registro", tipo: "uf", obrigatorio: false, grupo: "Ve\xEDculo", dica: "UF do LOCAL de registro no CRV", ia: true },
    { chave: "veic_cidade_registro", id: "txtCidadeRegistro", rotulo: "Cidade Registro", tipo: "texto", max: 40, obrigatorio: false, grupo: "Ve\xEDculo", dica: "Cidade do LOCAL de registro no CRV", ia: true },
    // Só para o CIOT (Webrouter): no Sitra os eixos vêm do Tipo do Veículo.
    { chave: "veic_eixos", id: null, rotulo: "Eixos", tipo: "digitos", max: 2, obrigatorio: false, grupo: "Ve\xEDculo", dica: "EIXOS no CRV/CRLV (n\xFAmero de eixos)", ia: true },
    { chave: "veic_venc_licenciamento", id: "txtVencimentoLicenciamento", rotulo: "Venc. Licenciamento", tipo: "data", max: 10, obrigatorio: true, grupo: "Ve\xEDculo", dica: "amanh\xE3" },
    { chave: "veic_venc_ipva", id: "txtVencimentoIPVA", rotulo: "Venc. IPVA", tipo: "data", max: 10, obrigatorio: true, grupo: "Ve\xEDculo", dica: "amanh\xE3" }
  ].map((c) => ({ tela: "veiculo", ia: false, ...c }));
  var CAMPOS = [...MOTORISTA, ...PROPRIETARIO, ...VEICULO];
  var CAMPO_POR_CHAVE = Object.fromEntries(CAMPOS.map((c) => [c.chave, c]));

  // src/lib/normalizar.js
  function somenteDigitos(v) {
    return String(v ?? "").replace(/\D/g, "");
  }

  // src/lib/ciot.js
  var DOMINIO_WEBROUTER = "webrouter.com.br";
  var ehHostWebrouter = (host) => host === DOMINIO_WEBROUTER || String(host ?? "").endsWith(`.${DOMINIO_WEBROUTER}`);
  var CONTRATANTES = { breviis1: { rotulo: "Breviis I", final: "32" }, breviis2: { rotulo: "Breviis II", final: "72" } };
  function cnpjNoTextoTerminaEm(texto, final) {
    const cnpjs = String(texto ?? "").match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) ?? [];
    return cnpjs.some((c) => somenteDigitos(c).endsWith(final));
  }
  var VALIDADE_CTE = 3 * 24 * 60 * 60 * 1e3;

  // src/content/preenchedor-ciot.js
  var comparavel = (s) => String(s ?? "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^0-9A-Z]/g, "");
  var digitos = (s) => String(s ?? "").replace(/\D/g, "");
  var TIPO = { lotacao: "CARGA_LOTACAO", fracionada: "CARGA_FRACIONADA" };
  function numero(v) {
    const s = String(v ?? "").trim();
    if (!s) return 0;
    const t = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }
  function acharTela(doc) {
    for (const inicio of doc.querySelectorAll(".emissao-ciot-stepper-wrap, .emissao-ciot-form-campos")) {
      for (let el = inicio; el; el = el.parentElement) {
        if (!el.__vue__) continue;
        for (let vm = el.__vue__; vm; vm = vm.$parent) {
          if (vm.formulario && typeof vm.addCadastrosCiot === "function") return vm;
        }
        break;
      }
    }
    return null;
  }
  function criarPreenchedorCiot(win, { timeoutMs = 1e4 } = {}) {
    const doc = win.document;
    function estado() {
      return { tela: ehHostWebrouter(win.location.hostname) && acharTela(doc) ? "ciot" : null };
    }
    const comLimite = (promessa, etapa) => Promise.race([
      promessa,
      new Promise((_, rejeitar) => win.setTimeout(() => rejeitar(new Error(`${etapa}: o Webrouter demorou demais para responder.`)), timeoutMs))
    ]);
    const buscar = (etapa, chamar) => comLimite(new Promise((resolve, rejeitar) => {
      try {
        const r = chamar(async (fn) => {
          try {
            await fn?.();
            resolve();
          } catch (e) {
            rejeitar(e);
          }
        }, () => resolve());
        Promise.resolve(r).catch(rejeitar);
      } catch (e) {
        rejeitar(e);
      }
    }), etapa);
    async function preencher(d) {
      const avisos = [];
      const relatorio = [];
      const ok = (rotulo, obtido) => relatorio.push({ rotulo, status: "ok", obtido: String(obtido ?? "") });
      const manual = (rotulo, motivo) => relatorio.push({ rotulo, status: "vazio", obtido: "", ...motivo ? { motivo } : {} });
      const falha = (erro) => ({ ok: false, tela: "ciot", erro, avisos, campos: relatorio });
      const vm = acharTela(doc);
      if (!ehHostWebrouter(win.location.hostname) || !vm) return falha("Abra no Webrouter o Emissor de CIOT (Novo CIOT).");
      const f = vm.formulario;
      const mascara = (v) => typeof vm.documentoCadastroComMascaraCpfCnpj === "function" ? vm.documentoCadastroComMascaraCpfCnpj(digitos(v)) : digitos(v);
      const proximo = () => typeof vm.$nextTick === "function" ? vm.$nextTick() : Promise.resolve();
      try {
        f.tipoOperacao = TIPO[d.tipo];
        await proximo();
        ok("Tipo de opera\xE7\xE3o", d.tipo === "fracionada" ? "CARGA FRACIONADA" : "CARGA LOTA\xC7\xC3O");
        f.dataInicio = d.data_inicio;
        f.dataFim = d.data_fim;
        vm.onDataInicioViagemChange?.();
        ok("Data in\xEDcio da viagem", d.data_inicio);
        if (d.data_fim) ok("Data fim da viagem", d.data_fim);
        else manual("Data fim da viagem");
        const { rotulo: rotuloBreviis, final } = CONTRATANTES[d.contratante];
        const rotuloContratante = `Contratante (${rotuloBreviis})`;
        let breviis = null;
        try {
          for (const termo of ["", "BREVIIS"]) {
            await buscar("Contratante", (update, abort) => vm.filterCadastrosCiot(termo, update, abort));
            const opcoes = vm.select?.optionsCadastrosCiot ?? [];
            breviis = opcoes.find((o) => digitos(o?.documento?.numero).endsWith(final) || cnpjNoTextoTerminaEm(o?.documento?.numero, final));
            if (breviis) break;
          }
        } catch (e) {
          avisos.push(e.message);
        }
        const escolherContratante = (fracionadaIdx) => {
          vm.dialogCadastrosCiot.tipo = "contratante";
          vm.dialogCadastrosCiot.fracionadaIdx = fracionadaIdx;
          vm.cadastrosCiot = breviis;
          vm.addCadastrosCiot("contratante");
        };
        if (breviis) {
          escolherContratante(null);
          ok(rotuloContratante, f.contratante.documento);
        } else {
          manual(rotuloContratante, `nenhum contratante com CNPJ final ${final} na busca do Webrouter`);
        }
        if (d.tipo === "fracionada") {
          vm.garantirContratantesCargaFracionadaMinimas?.();
          const primeiro = f.carga?.contratantesCargaFracionada?.[0];
          if (breviis && primeiro && !digitos(primeiro.documento)) {
            escolherContratante(0);
            ok("Contratante 1 (fracionada)", primeiro.documento);
          } else if (!breviis) manual("Contratante 1 (fracionada)");
        }
        if (digitos(d.contratado.cpf_cnpj)) {
          f.contratado.documento = mascara(d.contratado.cpf_cnpj);
          if (d.contratado.nome) f.contratado.nome = d.contratado.nome;
          f.contratado.rntrc = d.contratado.rntrc || f.contratado.rntrc;
          ok("CPF/CNPJ do contratado (ANTT)", f.contratado.documento);
          if (d.contratado.rntrc) ok("RNTRC do contratado", d.contratado.rntrc);
          else manual("RNTRC do contratado");
        } else {
          manual("Contratado (CPF/CNPJ do cart\xE3o da ANTT)");
        }
        if (f.motorista && (d.motorista.nome || d.motorista.cpf)) {
          f.motorista.nome = d.motorista.nome;
          f.motorista.documento = mascara(d.motorista.cpf);
          ok("Motorista", [d.motorista.nome, f.motorista.documento].filter(Boolean).join(" \xB7 "));
        }
        if (digitos(d.destinatario.cpf_cnpj)) {
          f.destinatario.documento = mascara(d.destinatario.cpf_cnpj);
          f.destinatario.nome = d.destinatario.nome || f.destinatario.nome;
          ok("Destinat\xE1rio", [d.destinatario.nome, f.destinatario.documento].filter(Boolean).join(" \xB7 "));
          if (!d.destinatario.nome) manual("Nome do destinat\xE1rio");
        } else manual("Destinat\xE1rio");
        f.carga.codigoTipoCarga = "CARGA_GERAL";
        ok("Tipo de carga", "Carga geral");
        if (d.tipo === "fracionada") ok("NCM", `${f.carga.codigoNatureza || "0001"} (padr\xE3o do Webrouter na fracionada)`);
        else if (d.ncm) {
          f.carga.codigoNatureza = d.ncm;
          ok("NCM", d.ncm);
        } else manual("NCM");
        const peso = numero(d.peso);
        if (peso > 0) {
          f.carga.peso = peso;
          ok("Peso (kg)", d.peso);
        } else manual("Peso (kg)");
        vm.garantirViagensMinimas?.();
        const viagem = f.viagens?.[0];
        let cidades = 0;
        for (const [lado, lugar, rotulo] of [["origem", d.origem, "Origem"], ["destino", d.destino, "Destino"]]) {
          if (!viagem || !lugar.cidade) {
            manual(rotulo);
            continue;
          }
          try {
            await buscar(rotulo, (update, abort) => vm.filterCidade(lugar.cidade, update, abort, "Brasil"));
            const opcoes = vm.select?.optionsCidades ?? [];
            const cidade = opcoes.find((o) => comparavel(o?.cidade) === comparavel(lugar.cidade) && (!lugar.uf || comparavel(o?.uf) === comparavel(lugar.uf)));
            if (!cidade) {
              const vistas = opcoes.slice(0, 4).map((o) => `${o?.cidade}/${o?.uf}`).join(" | ");
              manual(rotulo, `cidade n\xE3o encontrada${vistas ? ` (apareceram: ${vistas})` : ""}`);
              continue;
            }
            vm.aplicarCidadeNoLado(cidade, viagem, lado, 0);
            cidades++;
            ok(rotulo, `${cidade.cidade}/${cidade.uf}`);
          } catch (e) {
            manual(rotulo, e.message);
          }
        }
        if (cidades === 2 && typeof vm.calcularDistanciasTodasViagens === "function") {
          await proximo();
          try {
            await comLimite(Promise.resolve(vm.calcularDistanciasTodasViagens()), "Dist\xE2ncia");
            if (viagem.distanciaPercorrida) ok("Dist\xE2ncia (km)", viagem.distanciaPercorrida);
            else manual("Dist\xE2ncia (km)", 'clique em "Calcular dist\xE2ncias"');
          } catch (e) {
            manual("Dist\xE2ncia (km)", e.message);
          }
        }
        if (d.veiculos.length) {
          f.veiculos = d.veiculos.map((v) => ({ placa: v.placa, rntrc: d.contratado.rntrc || null, numeroEixos: Number(v.eixos) || null }));
          for (const v of d.veiculos) {
            ok(`Placa ${v.placa}`, v.eixos ? `${v.eixos} eixos` : "sem eixos");
            if (!v.eixos) manual(`Eixos (${v.placa})`);
          }
        } else manual("Placas");
        await proximo();
        manual("Valor do frete e forma de pagamento");
        avisos.push('Passe pelas etapas com "Avan\xE7ar" conferindo cada uma, informe o valor do frete e a forma de pagamento e s\xF3 ent\xE3o clique em "Emitir". A extens\xE3o n\xE3o emite.');
        return { ok: true, tela: "ciot", avisos, campos: relatorio };
      } catch (e) {
        return falha(e.message);
      }
    }
    return { estado, preencher };
  }

  // src/content/ciot.js
  window.__ciotWebrouter = window.__ciotWebrouter ?? criarPreenchedorCiot(window);
})();
