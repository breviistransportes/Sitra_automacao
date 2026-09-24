import { CAMPO_POR_CHAVE } from './campos.js';
import { normalizarCampo, somenteDigitos } from './normalizar.js';

const ENDERECO = [['prop_cep', 'cep'], ['prop_endereco', 'endereco'], ['prop_numero', 'numero'], ['prop_complemento', 'complemento'],
  ['prop_bairro', 'bairro'], ['prop_uf', 'uf'], ['prop_cidade', 'cidade']];
const DADOS_PESSOAIS = [['prop_nome', 'nome'], ['prop_rg', 'rg'], ['prop_org_exp', 'org_exp'], ['prop_data_nascimento', 'data_nascimento'],
  ['prop_uf_naturalidade', 'uf_naturalidade'], ['prop_naturalidade', 'naturalidade']];
const FIXOS = { prop_ie: 'ISENTO', prop_dependentes: '0', prop_banco: '0', prop_agencia: '0', prop_agencia_digito: '0',
  prop_conta: '0', prop_conta_digito: '0', prop_tipo_conta: '1' };

const data = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

// Regras da spec §11: o que não vem dos documentos é derivado aqui, de forma determinística.
export function aplicarRegras(valores, { hoje = new Date() } = {}) {
  const v = { ...valores };
  const definir = (chave, valor, fonte, certeza = 'alta') => {
    v[chave] = { valor: normalizarCampo(CAMPO_POR_CHAVE[chave], valor), certeza, fonte };
  };
  const copiar = (destino, origem) => {
    if (v[origem]?.valor) definir(destino, v[origem].valor, 'motorista', v[origem].certeza);
  };

  // Motorista: estado civil é sempre CASADO (regra do operador); expedição do RG = emissão da CNH se não houver RG.
  definir('estado_civil', 'CASADO', 'regra');
  if (!v.data_expedicao_rg?.valor && v.data_emissao_cnh?.valor) {
    definir('data_expedicao_rg', v.data_emissao_cnh.valor, 'CNH (data de emissão)', v.data_emissao_cnh.certeza);
  }

  // Proprietário: endereço sempre o do motorista.
  for (const [destino, origem] of ENDERECO) copiar(destino, origem);

  // Mesma pessoa (CPF do proprietário = CPF do motorista): dados pessoais do motorista.
  const cpfProp = somenteDigitos(v.prop_cpf_cnpj?.valor);
  if (cpfProp && cpfProp === somenteDigitos(v.cpf?.valor)) {
    for (const [destino, origem] of DADOS_PESSOAIS) copiar(destino, origem);
  }
  if (!v.prop_email?.valor) copiar('prop_email', 'email');
  if (!v.prop_telefone?.valor) copiar('prop_telefone', 'celular');

  for (const [chave, valor] of Object.entries(FIXOS)) definir(chave, valor, 'regra');
  if (!v.prop_venc_rntrc?.valor) definir('prop_venc_rntrc', data(hoje), 'regra (hoje)');

  // Veículo.
  if (v.prop_cpf_cnpj?.valor) definir('veic_cpf_cnpj_prop', v.prop_cpf_cnpj.valor, 'proprietário', v.prop_cpf_cnpj.certeza);
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  definir('veic_venc_licenciamento', data(amanha), 'regra (amanhã)');
  definir('veic_venc_ipva', data(amanha), 'regra (amanhã)');

  // Motorista: placa do veículo.
  if (v.veic_placa?.valor) definir('placa', v.veic_placa.valor, 'veículo', v.veic_placa.certeza);

  return v;
}
