// Emissor de CIOT do Webrouter (Vue 2 + Quasar 1). Em vez de clicar em janelas e listas (que abrem/fecham e
// re-renderizam), a extensão preenche o próprio `formulario` do componente da tela, usando os mesmos métodos que a
// tela usa: busca de contratantes (filterCadastrosCiot + addCadastrosCiot), de cidades (filterCidade +
// aplicarCidadeNoLado) e o cálculo de distâncias. Nunca emite: valor do frete, pagamento e "Emitir" são do operador.
import { cnpjNoTextoTerminaEm, CONTRATANTES, ehHostWebrouter } from '../lib/ciot.js';

const comparavel = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^0-9A-Z]/g, '');
const digitos = (s) => String(s ?? '').replace(/\D/g, '');
const TIPO = { lotacao: 'CARGA_LOTACAO', fracionada: 'CARGA_FRACIONADA' };

// "1.152,00" → 1152; "1152.5" → 1152.5.
function numero(v) {
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const t = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

// Componente da tela que tem o formulário e os métodos de emissão. No Vue 2 só o elemento raiz de cada componente
// tem __vue__: sobe pelos elementos pais até achar um componente e daí pelos componentes pais.
function acharTela(doc) {
  for (const inicio of doc.querySelectorAll('.emissao-ciot-stepper-wrap, .emissao-ciot-form-campos')) {
    for (let el = inicio; el; el = el.parentElement) {
      if (!el.__vue__) continue;
      for (let vm = el.__vue__; vm; vm = vm.$parent) {
        if (vm.formulario && typeof vm.addCadastrosCiot === 'function') return vm;
      }
      break;
    }
  }
  return null;
}

export function criarPreenchedorCiot(win, { timeoutMs = 10000 } = {}) {
  const doc = win.document;

  function estado() {
    return { tela: ehHostWebrouter(win.location.hostname) && acharTela(doc) ? 'ciot' : null };
  }

  // Os métodos de busca da tela recebem um "update(fn)" do Quasar; aqui ele só roda fn e avisa quando acabou.
  const comLimite = (promessa, etapa) => Promise.race([
    promessa,
    new Promise((_, rejeitar) => win.setTimeout(() => rejeitar(new Error(`${etapa}: o Webrouter demorou demais para responder.`)), timeoutMs)),
  ]);
  const buscar = (etapa, chamar) => comLimite(new Promise((resolve, rejeitar) => {
    try {
      const r = chamar(async (fn) => { try { await fn?.(); resolve(); } catch (e) { rejeitar(e); } }, () => resolve());
      Promise.resolve(r).catch(rejeitar);
    } catch (e) { rejeitar(e); }
  }), etapa);

  async function preencher(d) {
    const avisos = [];
    const relatorio = [];
    const ok = (rotulo, obtido) => relatorio.push({ rotulo, status: 'ok', obtido: String(obtido ?? '') });
    const manual = (rotulo, motivo) => relatorio.push({ rotulo, status: 'vazio', obtido: '', ...(motivo ? { motivo } : {}) });
    const falha = (erro) => ({ ok: false, tela: 'ciot', erro, avisos, campos: relatorio });

    const vm = acharTela(doc);
    if (!ehHostWebrouter(win.location.hostname) || !vm) return falha('Abra no Webrouter o Emissor de CIOT (Novo CIOT).');
    const f = vm.formulario;
    const mascara = (v) => (typeof vm.documentoCadastroComMascaraCpfCnpj === 'function' ? vm.documentoCadastroComMascaraCpfCnpj(digitos(v)) : digitos(v));
    const proximo = () => (typeof vm.$nextTick === 'function' ? vm.$nextTick() : Promise.resolve());

    try {
      // Topo: tipo de operação e datas.
      f.tipoOperacao = TIPO[d.tipo];
      await proximo();
      ok('Tipo de operação', d.tipo === 'fracionada' ? 'CARGA FRACIONADA' : 'CARGA LOTAÇÃO');
      f.dataInicio = d.data_inicio;
      f.dataFim = d.data_fim;
      vm.onDataInicioViagemChange?.();
      ok('Data início da viagem', d.data_inicio);
      if (d.data_fim) ok('Data fim da viagem', d.data_fim); else manual('Data fim da viagem');

      // Contratante: a mesma busca da janela "Procurar contratante", escolhendo pelo final do CNPJ.
      const { rotulo: rotuloBreviis, final } = CONTRATANTES[d.contratante];
      const rotuloContratante = `Contratante (${rotuloBreviis})`;
      let breviis = null;
      try {
        for (const termo of ['', 'BREVIIS']) {
          await buscar('Contratante', (update, abort) => vm.filterCadastrosCiot(termo, update, abort));
          const opcoes = vm.select?.optionsCadastrosCiot ?? [];
          breviis = opcoes.find(o => digitos(o?.documento?.numero).endsWith(final) || cnpjNoTextoTerminaEm(o?.documento?.numero, final));
          if (breviis) break;
        }
      } catch (e) {
        avisos.push(e.message);
      }
      const escolherContratante = (fracionadaIdx) => {
        vm.dialogCadastrosCiot.tipo = 'contratante';
        vm.dialogCadastrosCiot.fracionadaIdx = fracionadaIdx;
        vm.cadastrosCiot = breviis;
        vm.addCadastrosCiot('contratante');
      };
      if (breviis) {
        escolherContratante(null);
        ok(rotuloContratante, f.contratante.documento);
      } else {
        manual(rotuloContratante, `nenhum contratante com CNPJ final ${final} na busca do Webrouter`);
      }
      if (d.tipo === 'fracionada') {
        vm.garantirContratantesCargaFracionadaMinimas?.();
        const primeiro = f.carga?.contratantesCargaFracionada?.[0];
        if (breviis && primeiro && !digitos(primeiro.documento)) {
          escolherContratante(0);
          ok('Contratante 1 (fracionada)', primeiro.documento);
        } else if (!breviis) manual('Contratante 1 (fracionada)');
      }

      // Contratado = transportador do cartão da ANTT; motorista opcional.
      if (digitos(d.contratado.cpf_cnpj)) {
        f.contratado.documento = mascara(d.contratado.cpf_cnpj);
        if (d.contratado.nome) f.contratado.nome = d.contratado.nome;
        f.contratado.rntrc = d.contratado.rntrc || f.contratado.rntrc;
        ok('CPF/CNPJ do contratado (ANTT)', f.contratado.documento);
        if (d.contratado.rntrc) ok('RNTRC do contratado', d.contratado.rntrc); else manual('RNTRC do contratado');
      } else {
        manual('Contratado (CPF/CNPJ do cartão da ANTT)');
      }
      if (f.motorista && (d.motorista.nome || d.motorista.cpf)) {
        f.motorista.nome = d.motorista.nome;
        f.motorista.documento = mascara(d.motorista.cpf);
        ok('Motorista', [d.motorista.nome, f.motorista.documento].filter(Boolean).join(' · '));
      }

      // Destinatário e carga (tipo de carga: sempre Carga geral).
      if (digitos(d.destinatario.cpf_cnpj)) {
        f.destinatario.documento = mascara(d.destinatario.cpf_cnpj);
        f.destinatario.nome = d.destinatario.nome || f.destinatario.nome;
        ok('Destinatário', [d.destinatario.nome, f.destinatario.documento].filter(Boolean).join(' · '));
        if (!d.destinatario.nome) manual('Nome do destinatário');
      } else manual('Destinatário');
      f.carga.codigoTipoCarga = 'CARGA_GERAL';
      ok('Tipo de carga', 'Carga geral');
      // Na fracionada o Webrouter fixa o código de natureza em 0001.
      if (d.tipo === 'fracionada') ok('NCM', `${f.carga.codigoNatureza || '0001'} (padrão do Webrouter na fracionada)`);
      else if (d.ncm) { f.carga.codigoNatureza = d.ncm; ok('NCM', d.ncm); } else manual('NCM');
      const peso = numero(d.peso);
      if (peso > 0) { f.carga.peso = peso; ok('Peso (kg)', d.peso); } else manual('Peso (kg)');

      // Viagem: origem e destino pela busca de cidades da tela; depois a distância.
      vm.garantirViagensMinimas?.();
      const viagem = f.viagens?.[0];
      let cidades = 0;
      for (const [lado, lugar, rotulo] of [['origem', d.origem, 'Origem'], ['destino', d.destino, 'Destino']]) {
        if (!viagem || !lugar.cidade) { manual(rotulo); continue; }
        try {
          await buscar(rotulo, (update, abort) => vm.filterCidade(lugar.cidade, update, abort, 'Brasil'));
          const opcoes = vm.select?.optionsCidades ?? [];
          const cidade = opcoes.find(o => comparavel(o?.cidade) === comparavel(lugar.cidade) && (!lugar.uf || comparavel(o?.uf) === comparavel(lugar.uf)));
          if (!cidade) {
            const vistas = opcoes.slice(0, 4).map(o => `${o?.cidade}/${o?.uf}`).join(' | ');
            manual(rotulo, `cidade não encontrada${vistas ? ` (apareceram: ${vistas})` : ''}`);
            continue;
          }
          vm.aplicarCidadeNoLado(cidade, viagem, lado, 0);
          cidades++;
          ok(rotulo, `${cidade.cidade}/${cidade.uf}`);
        } catch (e) {
          manual(rotulo, e.message);
        }
      }
      if (cidades === 2 && typeof vm.calcularDistanciasTodasViagens === 'function') {
        await proximo();
        try {
          await comLimite(Promise.resolve(vm.calcularDistanciasTodasViagens()), 'Distância');
          if (viagem.distanciaPercorrida) ok('Distância (km)', viagem.distanciaPercorrida);
          else manual('Distância (km)', 'clique em "Calcular distâncias"');
        } catch (e) {
          manual('Distância (km)', e.message);
        }
      }

      // Veículos: placa, RNTRC do contratado e eixos do CRLV.
      if (d.veiculos.length) {
        f.veiculos = d.veiculos.map(v => ({ placa: v.placa, rntrc: d.contratado.rntrc || null, numeroEixos: Number(v.eixos) || null }));
        for (const v of d.veiculos) {
          ok(`Placa ${v.placa}`, v.eixos ? `${v.eixos} eixos` : 'sem eixos');
          if (!v.eixos) manual(`Eixos (${v.placa})`);
        }
      } else manual('Placas');
      await proximo();

      manual('Valor do frete e forma de pagamento');
      avisos.push('Passe pelas etapas com "Avançar" conferindo cada uma, informe o valor do frete e a forma de pagamento e só então clique em "Emitir". A extensão não emite.');
      return { ok: true, tela: 'ciot', avisos, campos: relatorio };
    } catch (e) {
      return falha(e.message);
    }
  }

  return { estado, preencher };
}
