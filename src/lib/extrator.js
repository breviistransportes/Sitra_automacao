import { CAMPOS } from './campos.js';
import { normalizarCampo, cpfValido } from './normalizar.js';

export const MODELO = 'gemini-3.8-flash';
const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

export const CAMPOS_IA = CAMPOS.filter(c => !c.soPadrao);

export class ErroExtracao extends Error {}

export const INSTRUCOES = `Você extrai dados de documentos de motoristas brasileiros para o cadastro no sistema Sitra.
Você recebe fotos e PDFs (CNH ou CNH-e, RG, comprovante de endereço, CRLV e outros) e, às vezes, o texto de uma conversa de WhatsApp.

Regras gerais:
- Preencha cada campo só com o que está escrito nos documentos ou na conversa. Nunca invente nem deduza. Se não encontrar, use valor "" e certeza "conferir".
- certeza "alta" apenas quando o texto está nítido e não há dúvida. Qualquer dúvida (foto borrada, dígito ambíguo, informação indireta) → "conferir".
- fonte: nome do arquivo de onde veio o valor (ex.: "CNH-e.pdf"), ou "conversa" se veio do texto do WhatsApp.
- Datas sempre no formato DD/MM/AAAA.

CNH / CNH-e:
- "Nº REGISTRO" (11 dígitos) → registro_cnh. O número do espelho (impresso na lateral ou no verso, diferente do registro) → numero_espelho_cnh.
- "1ª HABILITAÇÃO" → data_primeira_cnh. "DATA EMISSÃO" → data_emissao_cnh. "VALIDADE" → data_validade_cnh. "CAT. HAB." → categoria_cnh.
- "FILIAÇÃO": em geral o primeiro nome é o pai e o segundo a mãe. Se houver um só nome ou não der para distinguir, marque os dois como "conferir".
- "DATA, LOCAL E UF DE NASCIMENTO" → data_nascimento, naturalidade (cidade) e uf_naturalidade.
- "DOC. IDENTIDADE / ÓRG. EMISSOR / UF" → rg, org_exp, uf_exp.

Outros documentos:
- data_expedicao_rg só existe no próprio RG; nunca use datas da CNH para ele.
- Endereço vem do comprovante de endereço (conta de luz, água, telefone etc.): endereco = só o logradouro, sem número; numero; complemento; bairro; cidade; uf; cep. Se o comprovante estiver em nome de outra pessoa, use o endereço e registre isso em avisos.
- CRLV é documento do veículo: não use para dados pessoais.
- celular, fone_residencial e email: da conversa (inclusive o número de quem enviou, se aparecer no cabeçalho das mensagens) ou de documentos. Telefones com DDD.
- estado_civil e nacionalidade: só se estiverem escritos em algum documento ou na conversa.

Mensagens do motorista (texto colado pelo operador, se houver):
- Use para os campos que não estão nos documentos: celular, fone_residencial, email, estado_civil, complemento e outros. fonte = "mensagem".
- Se a mensagem contradisser um documento (nome, CPF, datas, CNH, RG), o documento prevalece: use o valor do documento e registre a divergência em avisos. Exceção: telefones, e-mail e estado civil podem vir da mensagem.
- Se não houver nenhum documento, extraia tudo o que estiver escrito nas mensagens.

documentos_encontrados: lista curta dos tipos identificados (ex.: "CNH-e", "Comprovante de endereço", "CRLV").
avisos: problemas úteis para quem vai conferir — documento ilegível, CNH ou comprovante de endereço ausente, CNH vencida, nomes diferentes entre documentos.`;

export function montarSchema() {
  const campo = {
    type: 'object',
    properties: {
      valor: { type: 'string' },
      certeza: { type: 'string', enum: ['alta', 'conferir'] },
      fonte: { type: 'string' },
    },
    required: ['valor', 'certeza', 'fonte'],
    additionalProperties: false,
  };
  return {
    type: 'object',
    properties: {
      campos: {
        type: 'object',
        properties: Object.fromEntries(CAMPOS_IA.map(c => [c.chave, { ...campo, description: c.dica }])),
        required: CAMPOS_IA.map(c => c.chave),
        additionalProperties: false,
      },
      documentos_encontrados: { type: 'array', items: { type: 'string' } },
      avisos: { type: 'array', items: { type: 'string' } },
    },
    required: ['campos', 'documentos_encontrados', 'avisos'],
    additionalProperties: false,
  };
}

export function montarPartes({ textos, imagens, pdfs, mensagens }) {
  return [
    ...pdfs.flatMap(p => [
      { text: `Arquivo: ${p.nome}` },
      { inlineData: { mimeType: 'application/pdf', data: p.base64 } },
    ]),
    ...imagens.flatMap(i => [
      { text: `Arquivo: ${i.nome}` },
      { inlineData: { mimeType: i.mediaType, data: i.base64 } },
    ]),
    ...textos.map(t => ({ text: `Conversa do WhatsApp (${t.nome}):\n${t.conteudo}` })),
    ...(mensagens?.trim() ? [{ text: `Mensagens do motorista (coladas pelo operador):\n${mensagens.trim()}` }] : []),
    { text: 'Extraia os campos do cadastro conforme as instruções.' },
  ];
}

function mensagemHttp(status, detalhe) {
  if (status === 400 && /api key/i.test(detalhe)) return 'Chave da API do Gemini inválida. Confira nas configurações.';
  if (status === 401 || status === 403) return 'A chave do Gemini não tem permissão para usar este modelo. Confira nas configurações.';
  if (status === 429) return 'Limite de uso da API do Gemini atingido. Espere um pouco e tente de novo.';
  if (status >= 500) return 'O Gemini está instável agora. Tente de novo em instantes.';
  return `Erro da API do Gemini (${status}): ${detalhe || 'sem detalhes'}`;
}

export async function chamarGemini(apiKey, docs, fetchFn = fetch) {
  let resposta;
  try {
    resposta = await fetchFn(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCOES }] },
        contents: [{ role: 'user', parts: montarPartes(docs) }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: montarSchema() },
      }),
    });
  } catch {
    throw new ErroExtracao('Sem conexão com a API do Gemini. Verifique a internet.');
  }
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ErroExtracao(mensagemHttp(resposta.status, corpo?.error?.message ?? ''));

  const bloqueio = corpo.promptFeedback?.blockReason;
  if (bloqueio) throw new ErroExtracao(`O Gemini bloqueou estes documentos (${bloqueio}). Preencha manualmente.`);
  const candidato = corpo.candidates?.[0];
  if (candidato?.finishReason === 'MAX_TOKENS') throw new ErroExtracao('A resposta da IA foi cortada. Tente de novo.');
  if (candidato?.finishReason && candidato.finishReason !== 'STOP') {
    throw new ErroExtracao(`O Gemini não concluiu a leitura (${candidato.finishReason}). Tente de novo ou preencha manualmente.`);
  }
  const texto = (candidato?.content?.parts ?? [])
    .filter(p => typeof p.text === 'string' && !p.thought)
    .map(p => p.text)
    .join('');
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErroExtracao('A resposta da IA veio num formato inesperado. Tente de novo.');
  }
}

export function posProcessar(bruto, padroes) {
  const valores = {};
  const avisos = [...(bruto?.avisos ?? [])];
  for (const campo of CAMPOS) {
    const b = bruto?.campos?.[campo.chave];
    let valor = normalizarCampo(campo, b?.valor ?? '');
    let certeza = b?.certeza === 'alta' ? 'alta' : 'conferir';
    let fonte = b?.fonte ?? '';
    if (b?.valor && !valor) avisos.push(`${campo.rotulo}: valor lido "${b.valor}" não está num formato válido`);
    if (!valor && campo.padrao && padroes?.[campo.padrao]) {
      valor = normalizarCampo(campo, padroes[campo.padrao]);
      certeza = 'alta';
      fonte = 'padrão';
    }
    if (!valor) certeza = 'conferir';
    valores[campo.chave] = { valor, certeza, fonte };
  }
  if (!valores.fone_residencial.valor && valores.celular.valor) {
    valores.fone_residencial = { ...valores.celular, fonte: 'igual ao celular' };
  }
  if (valores.cpf.valor && !cpfValido(valores.cpf.valor)) {
    valores.cpf.certeza = 'conferir';
    avisos.push('CPF lido não passa na validação — confira');
  }
  return { valores, avisos, documentos: bruto?.documentos_encontrados ?? [] };
}
