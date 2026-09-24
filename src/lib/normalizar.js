import { UFS } from './campos.js';

export function somenteDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

export function maiusculas(v) {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function semAcento(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function formatarCpf(v) {
  const d = somenteDigitos(v);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : '';
}

export function cpfValido(v) {
  const d = somenteDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function formatarCep(v) {
  const d = somenteDigitos(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : '';
}

// Máscara do Sitra: "(00)00000-0000" / "(00)0000-0000" — sem espaço (maxlength 14).
export function formatarTelefone(v) {
  let d = somenteDigitos(v);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)})${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)})${d.slice(2, 6)}-${d.slice(6)}`;
  return '';
}

export function formatarData(v) {
  const s = String(v ?? '').trim();
  let dia, mes, ano, m;
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, dia, mes, ano] = m;
  else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) [, ano, mes, dia] = m;
  else return '';
  const dt = new Date(Number(ano), Number(mes) - 1, Number(dia));
  if (dt.getFullYear() !== Number(ano) || dt.getMonth() !== Number(mes) - 1 || dt.getDate() !== Number(dia)) return '';
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
}

export function formatarUf(v) {
  const u = maiusculas(v);
  return UFS.includes(u) ? u : '';
}

export function formatarEstadoCivil(v) {
  const s = semAcento(maiusculas(v));
  if (!s) return '';
  if (s.startsWith('SOLT')) return 'SOLTEIRO';
  if (s.startsWith('CAS')) return 'CASADO';
  if (s.startsWith('DIVOR')) return 'DIVORC.';
  if (s.startsWith('VIUV')) return 'VIUVO';
  if (s.startsWith('SEPAR')) return 'SEPARADO';
  if (s.includes('UNIAO') || s.includes('ESTAVEL')) return 'UNIAO EST';
  return s.slice(0, 9);
}

// O Sitra remove pontuação do RG no blur/keyup.
export function formatarRg(v) {
  return maiusculas(v).replace(/[^0-9A-Z]/g, '');
}

export function formatarCategoria(v) {
  return maiusculas(v).replace(/[^A-E]/g, '').slice(0, 4);
}

export function formatarEmail(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(s) ? s : '';
}

// Texto livre vai para o formulário do Sitra: só letras, números e pontuação comum.
// Remove < > & # = ; " etc. para que conteúdo hostil nos documentos não vire HTML/script lá.
const FORA_DO_TEXTO_SEGURO = /[^0-9A-ZÀ-ÖØ-Ý .,'/()ºª-]/g;
export function textoSeguro(v) {
  return maiusculas(v).replace(FORA_DO_TEXTO_SEGURO, '').replace(/\s+/g, ' ').trim();
}
export const TEM_CARACTERE_SUSPEITO = /[<>&#=;"{}`\\]/;

export function formatarCnpj(v) {
  const d = somenteDigitos(v);
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : '';
}

export function cnpjValido(v) {
  const d = somenteDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (n) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

// Máscara cpfCnpj do Sitra: 14 caracteres = CPF, 18 = CNPJ.
export function formatarCpfCnpj(v) {
  const d = somenteDigitos(v);
  if (d.length === 11) return formatarCpf(d);
  if (d.length === 14) return formatarCnpj(d);
  return '';
}

export function cpfCnpjValido(v) {
  const d = somenteDigitos(v);
  return d.length === 14 ? cnpjValido(d) : cpfValido(d);
}

// Máscara do Sitra "SSS-0A00": placa antiga (ABC-1234) e Mercosul (ABC-1D23).
export function formatarPlaca(v) {
  const s = maiusculas(v).replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(s) ? `${s.slice(0, 3)}-${s.slice(3)}` : '';
}

export function formatarAno(v) {
  const s = String(v ?? '').trim();
  const n = Number(s);
  return /^\d{4}$/.test(s) && n >= 1950 && n <= new Date().getFullYear() + 1 ? s : '';
}

// Aceita o id do <select> do Sitra ou o rótulo (sem diferenciar maiúsculas/acentos).
function formatarOpcao(campo, v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const chave = (x) => semAcento(maiusculas(x));
  const achada = campo.opcoes.find(([id, rotulo]) => id === s || chave(rotulo) === chave(s));
  return achada ? achada[0] : '';
}

export function normalizarCampo(campo, valor) {
  const cortar = (s) => (campo.max ? s.slice(0, campo.max) : s);
  switch (campo.tipo) {
    case 'cpf': return formatarCpf(valor);
    case 'cep': return formatarCep(valor);
    case 'telefone': return formatarTelefone(valor);
    case 'data': return formatarData(valor);
    case 'uf': return formatarUf(valor);
    case 'estado_civil': return formatarEstadoCivil(valor);
    case 'rg': return cortar(formatarRg(valor));
    case 'categoria': return formatarCategoria(valor);
    case 'email': return cortar(formatarEmail(valor));
    case 'digitos': return cortar(somenteDigitos(valor));
    case 'rntrc': return somenteDigitos(valor).slice(-9); // o Sitra pede os 9 últimos dígitos
    case 'cpf_cnpj': return formatarCpfCnpj(valor);
    case 'placa': return formatarPlaca(valor);
    case 'ano': return formatarAno(valor);
    case 'chassi': return cortar(maiusculas(valor).replace(/[^0-9A-Z]/g, ''));
    case 'opcao': return formatarOpcao(campo, valor);
    case 'propriedade': return ['1', '2', '3'].includes(String(valor ?? '').trim()) ? String(valor).trim() : '';
    default: return cortar(textoSeguro(valor));
  }
}
