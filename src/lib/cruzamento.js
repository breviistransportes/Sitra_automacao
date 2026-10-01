import { CAMPO_POR_CHAVE } from './campos.js';
import { normalizarCampo, somenteDigitos } from './normalizar.js';

// Cruza o que foi lido nos documentos com as viagens programadas do CRM. Só compara: nada é preenchido a partir daqui.

const alfanum = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const nomeComparavel = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]+/g, ' ').trim();
const cpfFormatado = (s) => normalizarCampo(CAMPO_POR_CHAVE.cpf, s ?? '') || String(s ?? '');
const placaFormatada = (p) => normalizarCampo(CAMPO_POR_CHAVE.veic_placa, p) || p;
const dataBr = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(iso ?? '') ? iso.slice(0, 10).split('-').reverse().join('/') : '');

// O campo placa do CRM pode trazer cavalo e carreta juntos ("ABC1D23 / XYZ9K87" ou "ABC1D23XYZ9K87").
export function placasDe(texto) {
  return alfanum(texto).match(/[A-Z]{3}\d[A-Z0-9]\d{2}/g) ?? [];
}

// dados: { cpf, nome, placas: [] } do painel. Devolve as viagens com o mesmo CPF ou alguma placa em comum.
export function cruzarComViagens(dados, viagens) {
  const cpf = somenteDigitos(dados.cpf);
  const placas = [...new Set((dados.placas ?? []).map(alfanum).filter(Boolean))];
  const resultado = [];
  for (const v of Array.isArray(viagens) ? viagens : []) {
    const cpfCrm = somenteDigitos(v.motorista_doc);
    const placasCrm = placasDe(v.placa);
    const mesmoCpf = !!cpf && cpf === cpfCrm;
    if (!mesmoCpf && !placasCrm.some(p => placas.includes(p))) continue;

    const comparar = (rotulo, crm, documento, iguais) => ({
      rotulo, crm, documento, status: !documento ? 'sem_dado' : iguais ? 'ok' : 'diferente',
    });
    const itens = [
      comparar('CPF', cpfCrm ? cpfFormatado(cpfCrm) : '', cpf ? cpfFormatado(cpf) : '', mesmoCpf),
      comparar('Nome', String(v.motorista ?? ''), String(dados.nome ?? ''), nomeComparavel(v.motorista) === nomeComparavel(dados.nome)),
      ...placasCrm.map(p => {
        const tem = placas.includes(p);
        return { rotulo: `Placa ${placaFormatada(p)}`, crm: placaFormatada(p), documento: tem ? placaFormatada(p) : '', status: tem ? 'ok' : 'so_crm' };
      }),
      ...placas.filter(p => !placasCrm.includes(p)).map(p => (
        { rotulo: `Placa ${placaFormatada(p)}`, crm: '', documento: placaFormatada(p), status: 'so_documento' })),
    ];
    resultado.push({
      mesmoCpf,
      viagem: {
        id: v.id,
        cliente: String(v.cliente_nome ?? ''),
        trajeto: [v.origem, v.destino].filter(Boolean).join(' → '),
        data: dataBr(v.data_coleta) || dataBr(v.data_viagem),
        veiculo: [v.veiculo_tipo, v.carroceria].filter(Boolean).join(' · '),
      },
      itens,
    });
  }
  // CPF igual primeiro (é o motorista da viagem); só placa em comum depois.
  return resultado.sort((a, b) => Number(b.mesmoCpf) - Number(a.mesmoCpf)).map(({ mesmoCpf, ...r }) => r);
}
