export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'EX', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

// Ordem = ordem de exibição na tela de conferência.
// ATENÇÃO: no Sitra, "Nº Registro CNH" é txtNumeroCnh e "Nº CNH" (espelho) é txtRegistroCNH.
export const CAMPOS = [
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
];

export const CAMPO_POR_CHAVE = Object.fromEntries(CAMPOS.map(c => [c.chave, c]));
