// Gera o modelo.ts da aba "Leitura de documentos" do CRM com as MESMAS regras de leitura (INSTRUCOES),
// schema e rótulos de campos da extensão: o CRM lê e a extensão importa, então os dois precisam bater.
// Uso: node scripts/exportar-modelo-crm.mjs ../CRM_BREVIIS/src/features/leitura-documentos/modelo.ts
import { writeFileSync } from 'node:fs';
import { INSTRUCOES, montarSchema } from '../src/lib/extrator.js';
import { CAMPOS } from '../src/lib/campos.js';

const destino = process.argv[2];
if (!destino) throw new Error('Informe o caminho do modelo.ts do CRM.');

const campos = CAMPOS.filter(c => c.ia).map(c => ({ chave: c.chave, rotulo: c.rotulo, grupo: c.grupo ?? '', veiculo: c.tela === 'veiculo' }));
writeFileSync(destino, `// GERADO a partir da extensão (cadastro_motorista/src/lib/extrator.js e campos.js) — mesmas regras
// de leitura e mesmo formato de campos que a extensão importa. Para mudar as regras, mude lá e gere de novo:
//   node scripts/exportar-modelo-crm.mjs (no repositório da extensão)
export const INSTRUCOES = ${JSON.stringify(INSTRUCOES)};

export const SCHEMA = ${JSON.stringify(montarSchema(), null, 2)} as const;

export const CAMPOS = ${JSON.stringify(campos, null, 2)} as const;
`);
console.log(`${destino}: ${campos.length} campos`);
