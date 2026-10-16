// CPF do motorista no CT-e manual: a nota não traz o motorista, então ele sai de uma viagem programada do CRM
// ou de um cadastro do Histórico, escolhido pelo operador. Só sugere sozinho quando uma única viagem tem o destino da nota.
import { formatarCpf } from './normalizar.js';
import { cidadeUfDoCrm } from './ciot.js';

const comparavel = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^0-9A-Z]/g, '');

// viagens: linhas de trips do CRM; historico: cadastros do Histórico; nota: valores da nota lida (destino_cidade/destino_uf).
export function opcoesMotoristaCte({ viagens, historico, nota }) {
  const opcoes = [];
  const vistos = new Set();
  const adicionar = (opcao) => {
    if (!opcao.cpf || vistos.has(opcao.cpf)) return;
    vistos.add(opcao.cpf);
    opcoes.push(opcao);
  };
  for (const t of Array.isArray(viagens) ? viagens : []) {
    adicionar({
      fonte: 'CRM', cpf: formatarCpf(t.motorista_doc), destino: cidadeUfDoCrm(t.destino),
      rotulo: [t.motorista || 'Motorista', [t.origem, t.destino].filter(Boolean).join(' → '), t.cliente_nome, t.placa].filter(Boolean).join(' · '),
    });
  }
  for (const r of Array.isArray(historico) ? historico : []) {
    const placas = (r.veiculos ?? []).map(v => v?.veic_placa?.valor).filter(Boolean).join(' + ');
    adicionar({ fonte: 'Histórico', cpf: formatarCpf(r.valores?.cpf?.valor), rotulo: [r.valores?.nome?.valor || '(sem nome)', placas].filter(Boolean).join(' · ') });
  }
  const cidade = comparavel(nota?.destino_cidade);
  const uf = comparavel(nota?.destino_uf);
  const mesmoDestino = cidade
    ? opcoes.map((o, i) => (o.fonte === 'CRM' && comparavel(o.destino.cidade) === cidade && (!uf || !o.destino.uf || comparavel(o.destino.uf) === uf) ? i : -1)).filter(i => i >= 0)
    : [];
  return { opcoes: opcoes.map(({ destino, ...o }) => o), sugerida: mesmoDestino.length === 1 ? mesmoDestino[0] : -1 };
}
