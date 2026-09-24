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
    { chave: "registro_cnh", id: "txtNumeroCnh", rotulo: "N\xBA Registro CNH", tipo: "digitos", max: 14, obrigatorio: true, grupo: "Documenta\xE7\xE3o", dica: "N\xBA REGISTRO da CNH (11 d\xEDgitos)" },
    { chave: "numero_espelho_cnh", id: "txtRegistroCNH", rotulo: "N\xBA CNH (espelho)", tipo: "digitos", max: 10, obrigatorio: false, grupo: "Documenta\xE7\xE3o", dica: "N\xFAmero do espelho da CNH (diferente do registro), se vis\xEDvel" },
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
    { chave: "veic_venc_licenciamento", id: "txtVencimentoLicenciamento", rotulo: "Venc. Licenciamento", tipo: "data", max: 10, obrigatorio: true, grupo: "Ve\xEDculo", dica: "amanh\xE3" },
    { chave: "veic_venc_ipva", id: "txtVencimentoIPVA", rotulo: "Venc. IPVA", tipo: "data", max: 10, obrigatorio: true, grupo: "Ve\xEDculo", dica: "amanh\xE3" }
  ].map((c) => ({ tela: "veiculo", ia: false, ...c }));
  var TELAS = {
    motorista: { rotulo: "Motorista", caminho: "/motorista/cadastrodemotorista" },
    proprietario: { rotulo: "Propriet\xE1rio", caminho: "/proprietario/cadastrodeproprietario" },
    veiculo: { rotulo: "Ve\xEDculo", caminho: "/veiculo/cadastrodeveiculos" }
  };
  var CAMPOS = [...MOTORISTA, ...PROPRIETARIO, ...VEICULO];
  var camposDaTela = (tela) => CAMPOS.filter((c) => c.tela === tela);
  var CAMPO_POR_CHAVE = Object.fromEntries(CAMPOS.map((c) => [c.chave, c]));

  // src/content/preenchedor.js
  var comparavel = (s) => String(s ?? "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^0-9A-Z@.]/g, "");
  var GATILHOS = { motorista: ["cpf", "cep", "placa"], proprietario: ["prop_cpf_cnpj", "prop_cep"], veiculo: ["veic_placa", "veic_cpf_cnpj_prop"] };
  var ENDERECO = {
    motorista: { cep: "cep", endereco: "endereco", bairro: "bairro", uf: "uf", cidade: "cidade", numero: "numero", complemento: "complemento" },
    proprietario: { cep: "prop_cep", endereco: "prop_endereco", bairro: "prop_bairro", uf: "prop_uf", cidade: "prop_cidade", numero: "prop_numero", complemento: "prop_complemento" }
  };
  var PARA_VERIFICAR_VAZIO = { motorista: ["cpf", "nome", "cep", "rg"], proprietario: ["prop_cpf_cnpj", "prop_nome", "prop_cep"], veiculo: ["veic_placa", "veic_renavam", "veic_chassi"] };
  var AVISO_BANCO_ZERO = /banco sem o n[uú]mero 0/i;
  function instalarContadorXhr(win) {
    if (win.__cmXhrInstalado || !win.XMLHttpRequest) return;
    win.__cmXhrInstalado = true;
    win.__cmXhrPendentes = win.__cmXhrPendentes ?? 0;
    const enviar = win.XMLHttpRequest.prototype.send;
    win.XMLHttpRequest.prototype.send = function(...args) {
      win.__cmXhrPendentes++;
      const fim = () => {
        win.__cmXhrPendentes = Math.max(0, win.__cmXhrPendentes - 1);
      };
      this.addEventListener("loadend", fim, { once: true });
      try {
        return enviar.apply(this, args);
      } catch (e) {
        fim();
        throw e;
      }
    };
  }
  function criarPreenchedor(win, { timeoutMs = 8e3, intervaloMs = 100 } = {}) {
    instalarContadorXhr(win);
    const doc = win.document;
    const el = (id) => doc.getElementById(id);
    const esperar = (ms) => new Promise((r) => win.setTimeout(r, ms));
    const valorDe = (chave) => el(CAMPO_POR_CHAVE[chave].id)?.value ?? "";
    const pendentes = () => win.__cmXhrInstalado ? win.__cmXhrPendentes : win.jQuery?.active ?? 0;
    const ocupado = () => pendentes() > 0 || !!doc.querySelector('script[src*="viacep.com.br"]');
    let ultimoCampo = "in\xEDcio";
    async function aguardarSitra() {
      const fim = Date.now() + timeoutMs;
      let ociosos = 0;
      await esperar(intervaloMs);
      while (Date.now() < fim) {
        ociosos = ocupado() ? 0 : ociosos + 1;
        if (ociosos >= 2) return;
        await esperar(intervaloMs);
      }
      const viacep = doc.querySelector('script[src*="viacep.com.br"]') ? "sim" : "n\xE3o";
      throw new Error(`O Sitra demorou demais para responder (\xFAltimo campo: ${ultimoCampo}; requisi\xE7\xF5es pendentes: ${pendentes()}; jQuery.active: ${win.jQuery?.active ?? "?"}; ViaCEP pendente: ${viacep}). Tente de novo.`);
    }
    const visivel = (id) => {
      const m = el(id);
      return !!m && (m.classList.contains("in") || m.style.display === "block");
    };
    const esconder = (id) => {
      if (win.jQuery?.fn?.modal) win.jQuery(`#${id}`).modal("hide");
      const m = el(id);
      m.classList.remove("in");
      m.style.display = "none";
    };
    function telaAtual() {
      const caminho = win.location.pathname.toLowerCase();
      return Object.keys(TELAS).find((t) => caminho.includes(TELAS[t].caminho)) ?? null;
    }
    function estado() {
      const tela = telaAtual();
      const vazio = !!tela && PARA_VERIFICAR_VAZIO[tela].every((k) => !valorDe(k).trim());
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
          avisos.push(`Campo ${campo.rotulo} n\xE3o existe mais na p\xE1gina do Sitra`);
          return;
        }
        ultimoCampo = campo.rotulo;
        e.value = valores[chave];
        e.dispatchEvent(new win.Event("input", { bubbles: true }));
        e.dispatchEvent(new win.Event("change", { bubbles: true }));
        e.dispatchEvent(new win.Event("blur"));
        e.dispatchEvent(new win.Event("focusout", { bubbles: true }));
      };
      const definirSeTiver = (chave) => {
        if (valores[chave]) definir(chave);
      };
      const definirEAguardar = async (chave) => {
        if (valores[chave]) {
          definir(chave);
          await aguardarSitra();
        }
      };
      const registrarModal = (ignorar) => {
        if (!visivel("ModalErro")) return null;
        const t = (el("erro")?.textContent ?? "").trim();
        esconder("ModalErro");
        if (t && !(ignorar && ignorar.test(t))) avisos.push(`Sitra: ${t}`);
        return t;
      };
      const identificar = async (chave, jaExiste, rotulo) => {
        definir(chave);
        await aguardarSitra();
        if (visivel("ModalAsk")) {
          el("btnPerguntaNao").click();
          esconder("ModalAsk");
          await aguardarSitra();
        }
        const msg = registrarModal();
        if (!valorDe(chave)) return `O Sitra recusou o ${rotulo}${msg ? `: ${msg}` : ""}.`;
        if (jaExiste()) return `Este ${TELAS[tela].rotulo.toLowerCase()} j\xE1 est\xE1 cadastrado no Sitra. Nada foi alterado al\xE9m do ${rotulo}.`;
        return null;
      };
      const endereco = async (k) => {
        if (valores[k.cep]) {
          definir(k.cep);
          await aguardarSitra();
          registrarModal();
        }
        definirSeTiver(k.numero);
        definirSeTiver(k.complemento);
        if (!valorDe(k.uf) && valores[k.uf]) {
          definir(k.uf);
          await aguardarSitra();
        }
        for (const c of [k.endereco, k.bairro, k.cidade]) if (!valorDe(c).trim()) definirSeTiver(c);
      };
      const escolherOpcaoPorTexto = (chave) => {
        const campo = CAMPO_POR_CHAVE[chave];
        const s = el(campo.id);
        if (!valores[chave] || !s) return;
        const op = [...s.options].find((o) => comparavel(o.text) === comparavel(valores[chave]));
        if (!op) {
          avisos.push(`${campo.rotulo} "${valores[chave]}" n\xE3o est\xE1 na lista do Sitra \u2014 escolha manualmente`);
          return;
        }
        valores = { ...valores, [chave]: op.value };
        definir(chave);
      };
      const SEQUENCIAS = {
        async motorista() {
          const erro = await identificar("cpf", () => !!(el("txtStatusMotorista")?.value ?? "").trim(), "CPF");
          if (erro) return erro;
          ["nome", "data_nascimento", "estado_civil", "nome_pai", "nome_mae", "nacionalidade", "propriedade", "celular", "fone_residencial", "email"].forEach(definirSeTiver);
          await definirEAguardar("uf_naturalidade");
          definirSeTiver("naturalidade");
          await endereco(ENDERECO.motorista);
          ["rg", "uf_exp", "org_exp", "data_expedicao_rg", "registro_cnh", "numero_espelho_cnh", "data_primeira_cnh", "data_emissao_cnh", "data_validade_cnh", "categoria_cnh"].forEach(definirSeTiver);
          await definirEAguardar("placa");
          registrarModal();
          return null;
        },
        async proprietario() {
          const erro = await identificar("prop_cpf_cnpj", () => el("btnAlterar")?.getAttribute("type") === "button", "CPF/CNPJ");
          if (erro) return erro;
          definirSeTiver("prop_nome");
          await endereco(ENDERECO.proprietario);
          ["prop_ie", "prop_rg", "prop_org_exp", "prop_rntrc", "prop_data_emissao_rntrc", "prop_venc_rntrc", "prop_data_nascimento"].forEach(definirSeTiver);
          await definirEAguardar("prop_uf_naturalidade");
          ["prop_naturalidade", "prop_dependentes", "prop_propriedade", "prop_email", "prop_telefone"].forEach(definirSeTiver);
          await definirEAguardar("prop_banco");
          registrarModal(AVISO_BANCO_ZERO);
          ["prop_agencia", "prop_agencia_digito", "prop_conta", "prop_conta_digito", "prop_tipo_conta"].forEach(definirSeTiver);
          registrarModal();
          return null;
        },
        async veiculo() {
          const erro = await identificar("veic_placa", () => !!(el("txtStatusVeiculo")?.value ?? "").trim(), "Placa");
          if (erro) return erro;
          await definirEAguardar("veic_cpf_cnpj_prop");
          registrarModal();
          if (valores.veic_cpf_cnpj_prop && !(el("txtNomeProprietario")?.value ?? "").trim()) {
            avisos.push("Propriet\xE1rio n\xE3o encontrado no Sitra \u2014 cadastre o propriet\xE1rio antes de salvar o ve\xEDculo.");
          }
          await definirEAguardar("veic_tipo");
          registrarModal();
          [
            "veic_renavam",
            "veic_marca",
            "veic_modelo",
            "veic_tipo_propriedade",
            "veic_combustivel",
            "veic_ano_fab",
            "veic_ano_modelo",
            "veic_cor",
            "veic_chassi",
            "veic_certificado",
            "veic_venc_licenciamento",
            "veic_venc_ipva"
          ].forEach(definirSeTiver);
          await definirEAguardar("veic_uf_registro");
          escolherOpcaoPorTexto("veic_cidade_registro");
          registrarModal();
          return null;
        }
      };
      if (!tela) return falha("Abra no Sitra a tela de Cadastro de Motorista, de Propriet\xE1rio ou de Ve\xEDculo nesta aba.");
      try {
        const ativo = doc.activeElement;
        if (ativo && GATILHOS[tela].map((k) => CAMPO_POR_CHAVE[k].id).includes(ativo.id)) {
          ativo.blur();
          await aguardarSitra();
        }
        const erro = await SEQUENCIAS[tela]();
        if (erro) return falha(erro);
      } catch (e) {
        return falha(e.message);
      }
      const doCep = ENDERECO[tela] ? [ENDERECO[tela].endereco, ENDERECO[tela].bairro, ENDERECO[tela].uf, ENDERECO[tela].cidade] : [];
      const campos = [];
      for (const c of camposDaTela(tela)) {
        const esperado = valores[c.chave] ?? "";
        const obtido = valorDe(c.chave);
        let status;
        if (esperado) {
          if (el(c.id) && comparavel(obtido) === comparavel(esperado)) status = "ok";
          else if (doCep.includes(c.chave) && obtido) status = "sitra";
          else status = "falhou";
        } else if (obtido) status = "sitra";
        else if (c.obrigatorio) status = "vazio";
        else continue;
        campos.push({ chave: c.chave, rotulo: c.rotulo, esperado, obtido, status });
      }
      return { ok: true, tela, avisos, campos };
    }
    return { estado, preencher };
  }

  // src/content/injetado.js
  window.__cadastroMotorista = criarPreenchedor(window);
})();
