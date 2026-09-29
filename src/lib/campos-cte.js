import { formatarCpf, formatarCpfCnpj, formatarData, somenteDigitos, textoSeguro } from './normalizar.js';

export const TOMADORES = [['remetente', 'Remetente'], ['destinatario', 'Destinatário'], ['expedidor', 'Expedidor'], ['recebedor', 'Recebedor']];

export const CAMPOS_CTE = [
  { chave: 'remetente_cnpj', id: 'txtRemetenteCpfCnpj', rotulo: 'CNPJ do remetente', tipo: 'cpfcnpj', obrigatorio: false, grupo: 'Participantes', ia: true },
  { chave: 'destinatario_cnpj', id: 'txtDestinatarioCpfCnpj', rotulo: 'CNPJ do destinatário', tipo: 'cpfcnpj', obrigatorio: false, grupo: 'Participantes', ia: true },
  { chave: 'expedidor_cnpj', id: 'txtExpedidorCpfCnpj', rotulo: 'CNPJ do expedidor', tipo: 'cpfcnpj', obrigatorio: false, grupo: 'Complementos manuais', ia: false },
  { chave: 'recebedor_cnpj', id: 'txtRecebedorCpfCnpj', rotulo: 'CNPJ do recebedor', tipo: 'cpfcnpj', obrigatorio: false, grupo: 'Complementos manuais', ia: false },
  { chave: 'tomador', id: 'txtTomadorCpfCnpj', rotulo: 'Tomador', tipo: 'tomador', obrigatorio: false, grupo: 'Complementos manuais', ia: false, opcoes: TOMADORES },
  // O Sitra só aceita em "Chave NF-e" a chave de acesso de 44 dígitos; o protocolo fica só para conferência.
  { chave: 'chave_acesso', id: 'txtNotasFiscaisChaveNfe', rotulo: 'Chave de acesso (44 dígitos)', tipo: 'chave', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'protocolo_autorizacao', id: null, rotulo: 'Protocolo de autorização de uso', tipo: 'digitos', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'numero_nota', id: 'txtNotasFiscaisNotaFiscal', rotulo: 'Número da nota', tipo: 'digitos', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'serie', id: 'txtNotasFiscaisSerie', rotulo: 'Série', tipo: 'digitos', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'cfop', id: 'txtNotasFiscaisCfop', rotulo: 'CFOP', tipo: 'cfop', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'valor_total', id: 'txtNotasFiscaisValorMerc', rotulo: 'Valor total', tipo: 'decimal', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'volume', id: 'txtNotasFiscaisVolume', rotulo: 'Volumes', tipo: 'digitos', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'peso_bruto', id: 'txtNotasFiscaisPeso', rotulo: 'Peso bruto', tipo: 'decimal', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'peso_liquido', id: null, rotulo: 'Peso líquido', tipo: 'decimal', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'data_emissao', id: 'txtNotasFiscaisDataEmissao', rotulo: 'Data de emissão', tipo: 'data', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'motorista_cpf', id: 'txtMotoristaCpf', rotulo: 'CPF do motorista', tipo: 'cpf', obrigatorio: false, grupo: 'Complementos manuais', ia: false },
  { chave: 'especie', id: 'txtMercadoriasTransportadasEspecie', rotulo: 'Espécie de embalagem', tipo: 'texto', obrigatorio: false, grupo: 'Detalhes', ia: false, fixo: 'VOL' },
];

export const CAMPO_CTE_POR_CHAVE = Object.fromEntries(CAMPOS_CTE.map(c => [c.chave, c]));

// O último separador é o decimal ("52,114.47" e "52.114,47"); só pontos em grupos de 3 são milhar ("1.152").
function decimal(v) {
  const s = String(v ?? '').replace(/[^0-9,.-]/g, '').trim();
  if (!s) return '';
  let t = s;
  if (s.includes(',') && s.includes('.')) t = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) t = s.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) t = s.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

// Dígito verificador da chave de acesso: módulo 11 com pesos 2..9 da direita para a esquerda.
export function chaveAcessoValida(chave) {
  const d = somenteDigitos(chave);
  if (d.length !== 44) return false;
  let soma = 0, peso = 2;
  for (let i = 42; i >= 0; i--) { soma += Number(d[i]) * peso; peso = peso === 9 ? 2 : peso + 1; }
  const resto = soma % 11;
  return Number(d[43]) === (resto < 2 ? 0 : 11 - resto);
}

export function normalizarCampoCte(campo, valor) {
  if (campo.fixo) return campo.fixo;
  if (campo.tipo === 'cpfcnpj') return formatarCpfCnpj(valor);
  if (campo.tipo === 'cpf') return formatarCpf(valor);
  if (campo.tipo === 'data') return formatarData(valor);
  if (campo.tipo === 'digitos') return somenteDigitos(valor);
  if (campo.tipo === 'chave') { const d = somenteDigitos(valor); return d.length === 44 ? d : ''; }
  if (campo.tipo === 'cfop') { const d = somenteDigitos(valor); return d.length === 4 ? d : ''; }
  if (campo.tipo === 'decimal') return decimal(valor);
  if (campo.tipo === 'tomador') return TOMADORES.some(([v]) => v === valor) ? valor : '';
  return textoSeguro(valor);
}
