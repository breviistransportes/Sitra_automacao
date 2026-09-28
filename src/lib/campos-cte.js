import { formatarCpf, formatarCnpj, formatarData, somenteDigitos, textoSeguro } from './normalizar.js';

export const TOMADORES = [['remetente', 'Remetente'], ['destinatario', 'Destinatário'], ['expedidor', 'Expedidor'], ['recebedor', 'Recebedor']];

export const CAMPOS_CTE = [
  { chave: 'remetente_cnpj', id: 'txtRemetenteCpfCnpj', rotulo: 'CNPJ do remetente', tipo: 'cnpj', obrigatorio: true, grupo: 'Participantes', ia: true },
  { chave: 'destinatario_cnpj', id: 'txtDestinatarioCpfCnpj', rotulo: 'CNPJ do destinatário', tipo: 'cnpj', obrigatorio: true, grupo: 'Participantes', ia: true },
  { chave: 'expedidor_cnpj', id: 'txtExpedidorCpfCnpj', rotulo: 'CNPJ do expedidor', tipo: 'cnpj', obrigatorio: false, grupo: 'Complementos manuais', ia: false },
  { chave: 'recebedor_cnpj', id: 'txtRecebedorCpfCnpj', rotulo: 'CNPJ do recebedor', tipo: 'cnpj', obrigatorio: false, grupo: 'Complementos manuais', ia: false },
  { chave: 'tomador', id: 'txtTomadorCpfCnpj', rotulo: 'Tomador', tipo: 'tomador', obrigatorio: true, grupo: 'Complementos manuais', ia: false, opcoes: TOMADORES },
  { chave: 'protocolo_autorizacao', id: 'txtNotasFiscaisChaveNfe', rotulo: 'Protocolo de autorização de uso', tipo: 'digitos', obrigatorio: true, grupo: 'Nota fiscal', ia: true },
  { chave: 'numero_nota', id: 'txtNotasFiscaisNotaFiscal', rotulo: 'Número da nota', tipo: 'digitos', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'serie', id: 'txtNotasFiscaisSerie', rotulo: 'Série', tipo: 'digitos', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'cfop', id: 'txtNotasFiscaisCfop', rotulo: 'CFOP', tipo: 'cfop', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'valor_total', id: 'txtNotasFiscaisValorMerc', rotulo: 'Valor total', tipo: 'decimal', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'volume', id: 'txtNotasFiscaisVolume', rotulo: 'Volumes', tipo: 'digitos', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'peso_bruto', id: 'txtNotasFiscaisPeso', rotulo: 'Peso bruto', tipo: 'decimal', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'peso_liquido', id: null, rotulo: 'Peso líquido', tipo: 'decimal', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'data_emissao', id: 'txtNotasFiscaisDataEmissao', rotulo: 'Data de emissão', tipo: 'data', obrigatorio: false, grupo: 'Nota fiscal', ia: true },
  { chave: 'motorista_cpf', id: 'txtMotoristaCpf', rotulo: 'CPF do motorista', tipo: 'cpf', obrigatorio: false, grupo: 'Complementos manuais', ia: false },
  { chave: 'especie', id: 'txtMercadoriasTransportadasEspecie', rotulo: 'Espécie de embalagem', tipo: 'texto', obrigatorio: true, grupo: 'Detalhes', ia: false, fixo: 'VOL' },
];

export const CAMPO_CTE_POR_CHAVE = Object.fromEntries(CAMPOS_CTE.map(c => [c.chave, c]));

function decimal(v) {
  const s = String(v ?? '').replace(/[^0-9,.-]/g, '').trim();
  if (!s) return '';
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

export function normalizarCampoCte(campo, valor) {
  if (campo.fixo) return campo.fixo;
  if (campo.tipo === 'cnpj') return formatarCnpj(valor);
  if (campo.tipo === 'cpf') return formatarCpf(valor);
  if (campo.tipo === 'data') return formatarData(valor);
  if (campo.tipo === 'digitos') return somenteDigitos(valor);
  if (campo.tipo === 'cfop') { const d = somenteDigitos(valor); return d.length === 4 ? d : ''; }
  if (campo.tipo === 'decimal') return decimal(valor);
  if (campo.tipo === 'tomador') return TOMADORES.some(([v]) => v === valor) ? valor : '';
  return textoSeguro(valor);
}
