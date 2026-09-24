import { CAMPO_POR_CHAVE } from './campos.js';
import { normalizarCampo } from './normalizar.js';

// Distância de edição com transposição (dois dígitos invertidos = 1 erro).
function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const alfanum = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Campos do veículo que o CRV/CRLV digital traz como TEXTO no PDF (leitura exata, sem IA).
const NO_TEXTO_DO_PDF = {
  veic_placa: /(?<![A-Z0-9])[A-Z]{3}-?\d[A-Z0-9]\d{2}(?![A-Z0-9])/g,
  veic_renavam: /(?<!\d)\d{9,11}(?!\d)/g,
  veic_chassi: /(?<![A-Z0-9])[A-Z0-9]{17}(?![A-Z0-9])/g,
  veic_certificado: /(?<!\d)\d{9,15}(?!\d)/g,
};

// Confere os campos do veículo com o texto exato do PDF: confirma, corrige 1–2 dígitos lidos errado, ou marca para conferir.
export function conferirComTextoPdf(valores, textoPdf, avisos) {
  const texto = String(textoPdf ?? '').toUpperCase();
  if ((texto.match(/\d/g) ?? []).length < 40) return valores; // PDF sem texto (imagem): nada a conferir
  const compacto = alfanum(texto);
  const v = { ...valores };
  for (const [chave, padrao] of Object.entries(NO_TEXTO_DO_PDF)) {
    const atual = v[chave];
    if (!atual?.valor) continue;
    const campo = CAMPO_POR_CHAVE[chave];
    const alvo = alfanum(atual.valor);
    if (compacto.includes(alvo)) {
      v[chave] = { ...atual, certeza: 'alta', fonte: `${atual.fonte} (conferido no texto do PDF)` };
      continue;
    }
    const candidatos = [...new Set([...texto.matchAll(padrao)].map(m => alfanum(m[0])))]
      .map(c => ({ c, d: distancia(alvo, c) }))
      .sort((a, b) => a.d - b.d);
    const melhor = candidatos[0];
    const unico = melhor && (candidatos.length === 1 || candidatos[1].d > melhor.d);
    if (melhor && melhor.d <= 2 && unico) {
      const novo = normalizarCampo(campo, melhor.c);
      avisos.push(`${campo.rotulo}: corrigido pelo texto do PDF (${atual.valor} → ${novo})`);
      v[chave] = { valor: novo, certeza: 'alta', fonte: 'texto exato do PDF' };
    } else {
      avisos.push(`${campo.rotulo}: não confere com o texto do PDF — confira`);
      v[chave] = { ...atual, certeza: 'conferir' };
    }
  }
  return v;
}

// Números da CNH lidos numa segunda leitura independente (modelo mais forte).
export const CAMPOS_DUPLA_LEITURA = ['cpf', 'rg', 'registro_cnh', 'data_nascimento', 'data_primeira_cnh', 'data_validade_cnh', 'data_emissao_cnh'];

// Compara com a segunda leitura: iguais confirmam; diferentes ficam em amarelo com as duas opções.
export function compararLeituras(valores, segunda, avisos) {
  if (!segunda) return valores;
  const v = { ...valores };
  for (const chave of CAMPOS_DUPLA_LEITURA) {
    const campo = CAMPO_POR_CHAVE[chave];
    const outra = normalizarCampo(campo, segunda[chave] ?? '');
    const atual = v[chave];
    if (!outra || !atual) continue;
    if (!atual.valor) {
      v[chave] = { valor: outra, certeza: 'conferir', fonte: 'segunda leitura' };
    } else if (atual.valor === outra) {
      // Duas leituras independentes iguais: o registro deixa de precisar de conferência obrigatória.
      v[chave] = { ...atual, certeza: chave === 'registro_cnh' ? 'alta' : atual.certeza, fonte: `${atual.fonte} (2 leituras iguais)` };
    } else {
      avisos.push(`${campo.rotulo}: as duas leituras não batem (${atual.valor} / ${outra}) — confira na CNH`);
      v[chave] = { ...atual, certeza: 'conferir' };
    }
  }
  return v;
}

const normalizada = (chave, valor) => normalizarCampo(CAMPO_POR_CHAVE[chave], valor ?? '');

// Números da CNH em que a primeira e a segunda leitura discordam (aceita valores brutos ou já normalizados).
export function camposDivergentes(valores, segunda) {
  if (!segunda) return [];
  return CAMPOS_DUPLA_LEITURA.filter(k => {
    const a = normalizada(k, valores?.[k]?.valor), b = normalizada(k, segunda[k]);
    return a && b && a !== b;
  });
}

// Terceira leitura desempata: o valor que aparece em 2 de 3 leituras vem preenchido (ainda em amarelo).
export function desempatar(valores, segunda, terceira, avisos) {
  const v = { ...valores };
  for (const chave of camposDivergentes(valores, segunda)) {
    const rotulo = CAMPO_POR_CHAVE[chave].rotulo;
    const a = v[chave].valor, b = normalizada(chave, segunda[chave]), c = normalizada(chave, terceira?.[chave]);
    const maioria = c && (c === a ? a : c === b ? b : null);
    if (maioria) {
      const outra = maioria === a ? b : a;
      avisos.push(`${rotulo}: 2 de 3 leituras deram ${maioria} (a outra deu ${outra}) — confira na CNH`);
      v[chave] = { valor: maioria, certeza: 'conferir', fonte: '2 de 3 leituras' };
    } else {
      avisos.push(`${rotulo}: 3 leituras diferentes (${[a, b, c].filter(Boolean).join(' / ')}) — confira na CNH`);
      v[chave] = { ...v[chave], certeza: 'conferir' };
    }
  }
  return v;
}
