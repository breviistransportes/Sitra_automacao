export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'EX', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

// Ordem = ordem de exibição na tela de conferência.
// ia: extraído pela IA; os demais vêm de regras (regras.js) ou de padrões da configuração.
// ATENÇÃO: no Sitra, "Nº Registro CNH" é txtNumeroCnh e "Nº CNH" (espelho) é txtRegistroCNH.
const MOTORISTA = [
  { chave: 'cpf', id: 'txtMotoristaCpf', rotulo: 'CPF', tipo: 'cpf', max: 14, obrigatorio: true, grupo: 'Identificação', dica: 'CPF do motorista (na CNH ou em outro documento)' },
  { chave: 'nome', id: 'txtMotoristaNome', rotulo: 'Nome', tipo: 'texto', max: 50, obrigatorio: true, grupo: 'Identificação', dica: 'Nome completo como está na CNH' },

  { chave: 'cep', id: 'txtCep', rotulo: 'CEP', tipo: 'cep', max: 9, obrigatorio: true, grupo: 'Endereço', dica: 'CEP do comprovante de endereço' },
  { chave: 'endereco', id: 'txtEndereco', rotulo: 'Endereço', tipo: 'texto', max: 50, obrigatorio: true, grupo: 'Endereço', dica: 'Logradouro (rua, avenida...) sem o número' },
  { chave: 'numero', id: 'txtNumero', rotulo: 'Número', tipo: 'texto', max: 10, obrigatorio: true, grupo: 'Endereço', dica: 'Número do imóvel' },
  { chave: 'complemento', id: 'txtComplemento', rotulo: 'Complemento', tipo: 'texto', max: 30, obrigatorio: false, grupo: 'Endereço', dica: 'Complemento (apto, bloco, casa...)' },
  { chave: 'bairro', id: 'txtBairro', rotulo: 'Bairro', tipo: 'texto', max: 30, obrigatorio: true, grupo: 'Endereço', dica: 'Bairro' },
  { chave: 'uf', id: 'txtUf', rotulo: 'UF', tipo: 'uf', obrigatorio: true, grupo: 'Endereço', dica: 'Sigla do estado do endereço' },
  { chave: 'cidade', id: 'txtCidade', rotulo: 'Cidade', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Endereço', dica: 'Cidade do endereço' },

  { chave: 'data_nascimento', id: 'txtDataNascimento', rotulo: 'Data de Nascimento', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Data de nascimento' },
  { chave: 'estado_civil', id: 'txtEstadoCivil', rotulo: 'Estado Civil', tipo: 'estado_civil', max: 9, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Estado civil, somente se estiver escrito em algum documento ou na conversa' },
  { chave: 'nome_pai', id: 'txtNomePai', rotulo: 'Nome do Pai', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Nome do pai (filiação)' },
  { chave: 'nome_mae', id: 'txtNomeMae', rotulo: 'Nome da Mãe', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Nome da mãe (filiação)' },
  { chave: 'uf_naturalidade', id: 'txtNaturalidadeUf', rotulo: 'UF Naturalidade', tipo: 'uf', obrigatorio: true, grupo: 'Dados pessoais', dica: 'Sigla do estado onde nasceu' },
  { chave: 'naturalidade', id: 'txtNaturalidade', rotulo: 'Naturalidade', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Cidade onde nasceu' },
  { chave: 'nacionalidade', id: 'txtNacionalidade', rotulo: 'Nacionalidade', tipo: 'texto', max: 20, obrigatorio: true, grupo: 'Dados pessoais', dica: 'Nacionalidade, somente se estiver escrita', padrao: 'nacionalidade' },
  { chave: 'propriedade', id: 'txtPropriedade', rotulo: 'Propriedade', tipo: 'propriedade', obrigatorio: true, grupo: 'Dados pessoais', dica: 'Tipo de vínculo (valor padrão da configuração)', padrao: 'propriedade', soPadrao: true },

  { chave: 'celular', id: 'txtCelular', rotulo: 'Celular', tipo: 'telefone', max: 14, obrigatorio: true, grupo: 'Contato', dica: 'Celular com DDD (da conversa ou de documentos)' },
  { chave: 'fone_residencial', id: 'txtResidencial', rotulo: 'Fone Residencial 1', tipo: 'telefone', max: 14, obrigatorio: true, grupo: 'Contato', dica: 'Outro telefone com DDD, se houver' },
  { chave: 'email', id: 'txtEmail', rotulo: 'E-mail', tipo: 'email', max: 60, obrigatorio: false, grupo: 'Contato', dica: 'E-mail, se aparecer' },

  { chave: 'rg', id: 'txtRg', rotulo: 'R.G.', tipo: 'rg', max: 12, obrigatorio: true, grupo: 'Documentação', dica: 'Número do RG (na CNH: DOC. IDENTIDADE)' },
  { chave: 'uf_exp', id: 'txtUfExp', rotulo: 'UF Exp.', tipo: 'uf', obrigatorio: false, grupo: 'Documentação', dica: 'UF do órgão emissor do RG' },
  { chave: 'org_exp', id: 'txtOrgExp', rotulo: 'Org. Exp.', tipo: 'texto', max: 10, obrigatorio: true, grupo: 'Documentação', dica: 'Órgão emissor do RG (ex.: SSP)' },
  { chave: 'data_expedicao_rg', id: 'txtDataExpedicao', rotulo: 'Data Expedição (RG)', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Documentação', dica: 'Data de expedição do RG — só existe no próprio RG' },
  { chave: 'registro_cnh', id: 'txtNumeroCnh', rotulo: 'Nº Registro CNH', tipo: 'digitos', max: 14, obrigatorio: true, grupo: 'Documentação', dica: 'Nº REGISTRO da CNH (11 dígitos)' },
  { chave: 'numero_espelho_cnh', id: 'txtRegistroCNH', rotulo: 'Nº CNH (espelho)', tipo: 'digitos', max: 10, obrigatorio: false, grupo: 'Documentação', dica: 'Número do espelho da CNH (diferente do registro), se visível' },
  { chave: 'data_primeira_cnh', id: 'txtDataPrimeiraCnh', rotulo: 'Data Primeira CNH', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Documentação', dica: '1ª HABILITAÇÃO' },
  { chave: 'data_emissao_cnh', id: 'txtDataEmissaoCnh', rotulo: 'Data Emissão CNH', tipo: 'data', max: 10, obrigatorio: false, grupo: 'Documentação', dica: 'DATA EMISSÃO da CNH' },
  { chave: 'data_validade_cnh', id: 'txtDataValidadeCnh', rotulo: 'Data Validade CNH', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Documentação', dica: 'VALIDADE da CNH' },
  { chave: 'categoria_cnh', id: 'txtCategoriaCnh', rotulo: 'Categoria', tipo: 'categoria', max: 4, obrigatorio: true, grupo: 'Documentação', dica: 'CAT. HAB. (ex.: AE, D)' },
  { chave: 'placa', id: 'txtPlacaVeiculo', rotulo: 'Placa Veículo', tipo: 'placa', max: 8, obrigatorio: false, grupo: 'Identificação', dica: 'Placa do veículo do motorista', ia: false },
].map(c => ({ tela: 'motorista', ia: !c.soPadrao, ...c }));

// Endereço, IE, dependentes e CIOT vêm de regras (spec §11); a IA lê só o que está nos documentos.
const PROPRIETARIO = [
  { chave: 'prop_cpf_cnpj', id: 'txtProprietarioCpfCnpj', rotulo: 'CPF/CNPJ', tipo: 'cpf_cnpj', max: 18, obrigatorio: true, grupo: 'Proprietário', dica: 'CPF ou CNPJ do proprietário do veículo (campo PROPRIETÁRIO / CPF-CNPJ do CRV ou CRLV)', ia: true },
  { chave: 'prop_nome', id: 'txtNomeProprietario', rotulo: 'Nome', tipo: 'texto', max: 50, obrigatorio: true, grupo: 'Proprietário', dica: 'Nome ou razão social do proprietário do veículo (CRV/CRLV)', ia: true },
  { chave: 'prop_cep', id: 'txtCep', rotulo: 'CEP', tipo: 'cep', max: 9, obrigatorio: true, grupo: 'Proprietário', dica: 'igual ao do motorista' },
  { chave: 'prop_endereco', id: 'txtEndereco', rotulo: 'Endereço', tipo: 'texto', max: 50, obrigatorio: true, grupo: 'Proprietário', dica: 'igual ao do motorista' },
  { chave: 'prop_numero', id: 'txtNumero', rotulo: 'Número', tipo: 'texto', max: 10, obrigatorio: true, grupo: 'Proprietário', dica: 'igual ao do motorista' },
  { chave: 'prop_complemento', id: 'txtComplemento', rotulo: 'Complemento', tipo: 'texto', max: 20, obrigatorio: false, grupo: 'Proprietário', dica: 'igual ao do motorista' },
  { chave: 'prop_bairro', id: 'txtBairro', rotulo: 'Bairro', tipo: 'texto', max: 30, obrigatorio: true, grupo: 'Proprietário', dica: 'igual ao do motorista' },
  { chave: 'prop_uf', id: 'txtUf', rotulo: 'UF', tipo: 'uf', obrigatorio: true, grupo: 'Proprietário', dica: 'igual ao do motorista' },
  { chave: 'prop_cidade', id: 'txtCidade', rotulo: 'Cidade', tipo: 'texto', max: 40, obrigatorio: true, grupo: 'Proprietário', dica: 'igual ao do motorista' },

  { chave: 'prop_ie', id: 'txtIE', rotulo: 'Inscrição Estadual', tipo: 'texto', max: 16, obrigatorio: true, grupo: 'Documentação (proprietário)', dica: 'ISENTO' },
  { chave: 'prop_rg', id: 'txtRG', rotulo: 'RG', tipo: 'rg', max: 12, obrigatorio: false, grupo: 'Documentação (proprietário)', dica: 'RG do proprietário pessoa física', ia: true },
  { chave: 'prop_org_exp', id: 'txtOrgExp', rotulo: 'Org. Exp.', tipo: 'texto', max: 10, obrigatorio: false, grupo: 'Documentação (proprietário)', dica: 'Órgão emissor do RG do proprietário', ia: true },
  { chave: 'prop_rntrc', id: 'txtRntrc', rotulo: 'RNTRC', tipo: 'rntrc', max: 9, obrigatorio: true, grupo: 'Documentação (proprietário)', dica: 'Número do RNTRC no cartão/certificado da ANTT (8 ou 9 dígitos)', ia: true },
  { chave: 'prop_data_emissao_rntrc', id: 'txtDataEmissaoRntrc', rotulo: 'Data Emissão ANTT', tipo: 'data', max: 10, obrigatorio: false, grupo: 'Documentação (proprietário)', dica: 'Data de emissão no cartão da ANTT', ia: true },
  { chave: 'prop_venc_rntrc', id: 'txtVencimentoRntrc', rotulo: 'Vencimento RNTRC', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Documentação (proprietário)', dica: 'Validade no cartão da ANTT', ia: true },
  { chave: 'prop_data_nascimento', id: 'txtDataNascimento', rotulo: 'Data Nascimento', tipo: 'data', max: 10, obrigatorio: false, grupo: 'Documentação (proprietário)', dica: 'igual ao motorista quando é a mesma pessoa' },
  { chave: 'prop_uf_naturalidade', id: 'txtUfNatural', rotulo: 'Naturalidade UF', tipo: 'uf', obrigatorio: false, grupo: 'Documentação (proprietário)', dica: 'igual ao motorista quando é a mesma pessoa' },
  { chave: 'prop_naturalidade', id: 'txtCidadeNatu', rotulo: 'Naturalidade', tipo: 'texto', max: 40, obrigatorio: false, grupo: 'Documentação (proprietário)', dica: 'igual ao motorista quando é a mesma pessoa' },
  { chave: 'prop_dependentes', id: 'txtNumeroDependentes', rotulo: 'Nº Dependentes', tipo: 'digitos', max: 2, obrigatorio: true, grupo: 'Documentação (proprietário)', dica: '0' },
  { chave: 'prop_propriedade', id: 'txtPropriedade', rotulo: 'Propriedade', tipo: 'propriedade', obrigatorio: true, grupo: 'Documentação (proprietário)', dica: 'padrão da configuração', padrao: 'propriedade' },
  { chave: 'prop_email', id: 'txtEmail', rotulo: 'E-mail', tipo: 'email', max: 60, obrigatorio: true, grupo: 'Documentação (proprietário)', dica: 'E-mail do proprietário; se vazio, o do motorista', ia: true },
  { chave: 'prop_telefone', id: 'txtTelefone', rotulo: 'Telefone', tipo: 'telefone', max: 14, obrigatorio: true, grupo: 'Documentação (proprietário)', dica: 'Telefone do proprietário; se vazio, o celular do motorista', ia: true },

  { chave: 'prop_banco', id: 'txtBanco', rotulo: 'Banco', tipo: 'digitos', max: 3, obrigatorio: true, grupo: 'CIOT', dica: '0' },
  { chave: 'prop_agencia', id: 'txtAgencia', rotulo: 'Agência', tipo: 'digitos', max: 4, obrigatorio: true, grupo: 'CIOT', dica: '0' },
  { chave: 'prop_agencia_digito', id: 'txtDigito', rotulo: 'Dígito Agência', tipo: 'digitos', max: 1, obrigatorio: true, grupo: 'CIOT', dica: '0' },
  { chave: 'prop_conta', id: 'txtContaCorrente', rotulo: 'Conta Corrente', tipo: 'digitos', max: 11, obrigatorio: true, grupo: 'CIOT', dica: '0' },
  { chave: 'prop_conta_digito', id: 'txtContaCorrenteDigito', rotulo: 'Dígito Conta', tipo: 'digitos', max: 1, obrigatorio: true, grupo: 'CIOT', dica: '0' },
  { chave: 'prop_tipo_conta', id: 'txtTpConta', rotulo: 'Tipo de Conta', tipo: 'opcao', obrigatorio: true, grupo: 'CIOT', dica: 'Conta Corrente', opcoes: [['1', 'CC - Conta Corrente'], ['2', 'CP - Conta Poupança']] },
].map(c => ({ tela: 'proprietario', ia: false, ...c }));

const TIPOS_VEICULO = [['13', '3/4'], ['14', '710'], ['1', 'Caminhão'], ['4', 'Carreta'], ['5', 'Carreta6'], ['6', 'Carreta7'], ['7', 'Carreta9'],
  ['8', 'Cavalo'], ['9', 'Fiorino'], ['16', 'HR'], ['18', 'IVECO'], ['15', 'KOMBI'], ['17', 'MASTER'], ['11', 'Moto'], ['12', 'Side Car'],
  ['3', 'Toco'], ['2', 'Truck'], ['10', 'Utilit'], ['20', 'VAN'], ['19', 'VUC']];
const COMBUSTIVEIS = [['1', 'Álcool'], ['8', 'Biodisel'], ['2', 'Diesel'], ['9', 'Diesel S10'], ['10', 'Diesel S500'], ['3', 'Energia Elétrica'],
  ['7', 'Flex'], ['4', 'Gasolina'], ['5', 'GLP'], ['6', 'GNV'], ['11', 'Não aplicável']];

const VEICULO = [
  { chave: 'veic_placa', id: 'txtPlacaVeiculo', rotulo: 'Placa', tipo: 'placa', max: 8, obrigatorio: true, grupo: 'Veículo', dica: 'PLACA no CRV/CRLV', ia: true },
  { chave: 'veic_cpf_cnpj_prop', id: 'txtCpfCnpjProprietario', rotulo: 'CPF/CNPJ do Proprietário', tipo: 'cpf_cnpj', max: 18, obrigatorio: true, grupo: 'Veículo', dica: 'o do proprietário' },
  { chave: 'veic_tipo', id: 'txtTipoVeiculo', rotulo: 'Tipo do Veículo', tipo: 'opcao', obrigatorio: true, grupo: 'Veículo', dica: 'Tipo do veículo no Sitra, deduzido de ESPÉCIE/TIPO, CARROCERIA e eixos do CRV (ex.: CAMINHÃO TRATOR → Cavalo; SEMI-REBOQUE → Carreta)', opcoes: TIPOS_VEICULO, ia: true },
  { chave: 'veic_renavam', id: 'txtRenavam', rotulo: 'RENAVAM', tipo: 'digitos', max: 11, obrigatorio: true, grupo: 'Veículo', dica: 'CÓDIGO RENAVAM', ia: true },
  { chave: 'veic_marca', id: 'txtMarca', rotulo: 'Marca', tipo: 'texto', max: 30, obrigatorio: true, grupo: 'Veículo', dica: 'Marca (parte antes da / em MARCA/MODELO/VERSÃO)', ia: true },
  { chave: 'veic_modelo', id: 'txtModelo', rotulo: 'Modelo', tipo: 'texto', max: 30, obrigatorio: true, grupo: 'Veículo', dica: 'Modelo/versão (parte depois da / em MARCA/MODELO/VERSÃO)', ia: true },
  { chave: 'veic_tipo_propriedade', id: 'txtTipoPropriedade', rotulo: 'Tipo Propriedade', tipo: 'propriedade', obrigatorio: true, grupo: 'Veículo', dica: 'padrão da configuração', padrao: 'propriedade' },
  { chave: 'veic_combustivel', id: 'txtTipoCombustivel', rotulo: 'Combustível', tipo: 'opcao', obrigatorio: true, grupo: 'Veículo', dica: 'COMBUSTÍVEL no CRV', opcoes: COMBUSTIVEIS, ia: true },
  { chave: 'veic_ano_fab', id: 'txtAnoFabricacao', rotulo: 'Ano Fab.', tipo: 'ano', max: 4, obrigatorio: true, grupo: 'Veículo', dica: 'ANO FABRICAÇÃO', ia: true },
  { chave: 'veic_ano_modelo', id: 'txtAnoModelo', rotulo: 'Ano Modelo', tipo: 'ano', max: 4, obrigatorio: true, grupo: 'Veículo', dica: 'ANO MODELO', ia: true },
  { chave: 'veic_cor', id: 'txtCorVeiculo', rotulo: 'Cor', tipo: 'texto', max: 10, obrigatorio: true, grupo: 'Veículo', dica: 'COR PREDOMINANTE', ia: true },
  { chave: 'veic_chassi', id: 'txtChassi', rotulo: 'Chassi', tipo: 'chassi', max: 22, obrigatorio: true, grupo: 'Veículo', dica: 'CHASSI', ia: true },
  { chave: 'veic_certificado', id: 'txtCertificadoPropriedade', rotulo: 'Cert. Registro e Licenciamento', tipo: 'digitos', max: 15, obrigatorio: true, grupo: 'Veículo', dica: 'Número do CRV/CRLV (NÚMERO DO CRV ou número do documento)', ia: true },
  { chave: 'veic_uf_registro', id: 'txtUfRegistro', rotulo: 'Estado Registro', tipo: 'uf', obrigatorio: false, grupo: 'Veículo', dica: 'UF do LOCAL de registro no CRV', ia: true },
  { chave: 'veic_cidade_registro', id: 'txtCidadeRegistro', rotulo: 'Cidade Registro', tipo: 'texto', max: 40, obrigatorio: false, grupo: 'Veículo', dica: 'Cidade do LOCAL de registro no CRV', ia: true },
  { chave: 'veic_venc_licenciamento', id: 'txtVencimentoLicenciamento', rotulo: 'Venc. Licenciamento', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Veículo', dica: 'amanhã' },
  { chave: 'veic_venc_ipva', id: 'txtVencimentoIPVA', rotulo: 'Venc. IPVA', tipo: 'data', max: 10, obrigatorio: true, grupo: 'Veículo', dica: 'amanhã' },
].map(c => ({ tela: 'veiculo', ia: false, ...c }));

export const TELAS = {
  motorista: { rotulo: 'Motorista', caminho: '/motorista/cadastrodemotorista' },
  proprietario: { rotulo: 'Proprietário', caminho: '/proprietario/cadastrodeproprietario' },
  veiculo: { rotulo: 'Veículo', caminho: '/veiculo/cadastrodeveiculos' },
};

export const CAMPOS = [...MOTORISTA, ...PROPRIETARIO, ...VEICULO];

export const camposDaTela = (tela) => CAMPOS.filter(c => c.tela === tela);

export const CAMPO_POR_CHAVE = Object.fromEntries(CAMPOS.map(c => [c.chave, c]));
