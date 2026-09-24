# v2 — Proprietário e Veículo — Implementation Plan

> Executor: superpowers:executing-plans (inline, mesma sessão). TDD em cada tarefa. O código commitado é a referência de detalhe.

**Goal:** Extrair e preencher também as telas de Proprietário e Veículo do Sitra.
**Spec:** `docs/superpowers/specs/2026-09-24-extensao-cadastro-motorista-design.md` §11.

## Global Constraints
- Tudo da v1 continua valendo (CPF/placa primeiro com espera, blur real, ViaCEP JSONP, foco, nunca clicar exceto `#btnPerguntaNao`).
- Cópias de teste das telas novas são geradas mecanicamente das páginas salvas (obs. #0009), com teste de paridade dos handlers.
- Chaves: motorista mantém as atuais (+ `placa`); proprietário `prop_*`; veículo `veic_*`. Cada campo tem `tela`.

## Review Focus
1. Proprietário novo que dispara a pergunta da Receita — sem responder, o formulário fica travado.
2. Proprietário CNPJ (18 caracteres, máscara) e CPF igual ao do motorista (cópia dos dados).
3. Veículo sem proprietário cadastrado — aviso claro, não falha silenciosa.
4. Tipo de veículo/combustível escritos de forma livre pelo CRV ("CAMINHAO TRATOR", "DIESEL") → id do Sitra.
5. Datas de vencimento do veículo não podem ser hoje.

### Task 1: Campos v2 + normalização
Files: `src/lib/campos.js`, `src/lib/normalizar.js`, tests. Adiciona `tela`, `ia` (extraído pela IA ou não), `opcoes`; novos tipos `cpf_cnpj`, `placa`, `ano`, `chassi`, `opcao`; `cnpjValido`. Testes: ids únicos por tela, formatos (CNPJ, placa Mercosul/antiga, ano, opção por id ou rótulo sem acento).

### Task 2: Regras derivadas
Files: `src/lib/regras.js`, test. `aplicarRegras(valores, { hoje, padroes })` com todas as regras da spec §11. Testes: cópia quando CPF igual, CNPJ não copia, CIOT zeros, amanhã/hoje, placa do motorista = do veículo.

### Task 3: Extrator v2
Files: `src/lib/extrator.js`, test. Schema com todos os campos `ia`; instruções para CRV/CRLV, cartão ANTT, tipo do veículo entre as opções do Sitra; `posProcessar` aplica regras e valida CPF/CNPJ. Validar com chamada real (dados fictícios).

### Task 4: Fixtures reais + preenchedor por tela
Files: `tests/fixtures/{proprietario,veiculo}.html` (geradas), `tests/fixtures/sitra.html` (+placa), `src/content/preenchedor.js`, tests. `estado()` → `{ tela, vazio }`; `preencher(valores)` despacha por tela. Testes por tela: novo, existente, pergunta da Receita, aviso do banco 0, proprietário ausente no veículo, cidade de registro, paridade de handlers.

### Task 5: Painel com abas + teste real
Files: `src/sidepanel/{formulario,main}.js`, `extensao/sidepanel/*`. Abas Motorista/Proprietário/Veículo; preencher usa só os valores da tela detectada. Build, suíte completa, revisão final, teste do operador.
