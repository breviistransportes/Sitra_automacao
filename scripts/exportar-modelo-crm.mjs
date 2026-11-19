// Gera o modelo.ts da aba "Leitura de documentos" do CRM com as MESMAS regras de leitura, schemas e
// rótulos de campos da extensão (cadastro, nota do CT-e e cartão da ANTT): o CRM lê e a extensão
// importa, então os dois precisam bater.
// Uso: node scripts/exportar-modelo-crm.mjs ../CRM_BREVIIS/src/features/leitura-documentos/modelo.ts
import { writeFileSync } from 'node:fs';
import { INSTRUCOES, montarSchema } from '../src/lib/extrator.js';
import { INSTRUCOES_CTE, montarSchemaCte } from '../src/lib/extrator-cte.js';
import { INSTRUCOES_ANTT, SCHEMA_ANTT } from '../src/lib/extrator-antt.js';
import { CAMPOS } from '../src/lib/campos.js';
import { CAMPOS_CTE } from '../src/lib/campos-cte.js';

const destino = process.argv[2];
if (!destino) throw new Error('Informe o caminho do modelo.ts do CRM.');

const campos = CAMPOS.filter(c => c.ia).map(c => ({ chave: c.chave, rotulo: c.rotulo, grupo: c.grupo ?? '', veiculo: c.tela === 'veiculo' }));
// cfop chega como a lista cfops; outros_cnpjs só aparece no CRM.
const camposCte = [
  ...CAMPOS_CTE.filter(c => c.ia).map(c => (c.chave === 'cfop' ? { chave: 'cfops', rotulo: 'CFOPs', grupo: c.grupo } : { chave: c.chave, rotulo: c.rotulo, grupo: c.grupo })),
  { chave: 'outros_cnpjs', rotulo: 'Outros CPFs/CNPJs', grupo: 'Participantes' },
];
const json = (v) => JSON.stringify(v, null, 2);
writeFileSync(destino, `// GERADO a partir da extensão (cadastro_motorista/src/lib/extrator*.js, campos.js e campos-cte.js) — mesmas
// regras de leitura e mesmo formato de campos que a extensão importa. Para mudar as regras, mude lá e gere de novo:
//   node scripts/exportar-modelo-crm.mjs (no repositório da extensão)
export const INSTRUCOES = ${JSON.stringify(INSTRUCOES)};

export const SCHEMA = ${json(montarSchema())} as const;

export const CAMPOS = ${json(campos)} as const;

export const INSTRUCOES_CTE = ${JSON.stringify(INSTRUCOES_CTE)};

export const SCHEMA_CTE = ${json(montarSchemaCte())} as const;

export const CAMPOS_CTE = ${json(camposCte)} as const;

export const INSTRUCOES_ANTT = ${JSON.stringify(INSTRUCOES_ANTT)};

export const SCHEMA_ANTT = ${json(SCHEMA_ANTT)} as const;
`);
console.log(`${destino}: ${campos.length} campos do cadastro, ${camposCte.length} da nota`);
