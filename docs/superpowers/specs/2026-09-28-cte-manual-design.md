# Automação da digitação manual de CT-e — Design

**Data:** 2026-09-28  
**Status:** aprovado; revisado em 2026-09-29 após a revisão final e o teste no Sitra real (chave de acesso, campos opcionais, frete combinado)  
**Projeto:** extensão Cadastro de Motorista — Sitra Web Revolution

## 1. Objetivo

Adicionar à extensão existente um modo separado chamado **CT-e manual**. O modo lê uma foto ou PDF de nota fiscal, extrai as informações disponíveis, permite ao operador conferir e complementar os dados e preenche a tela **Digitação de CT-e** do Sitra.

A automação reduz a digitação repetitiva, mas não conclui a operação fiscal. Ela nunca clica em **Cadastrar**. O operador continua responsável por conferir os dados, preencher os campos manuais e cadastrar o CT-e.

## 2. Escopo da primeira versão

A primeira versão deve:

- aceitar imagens e PDFs pelo mesmo mecanismo de entrada já usado pela extensão;
- usar a configuração existente da API do Gemini;
- extrair todos os dados úteis e legíveis do documento;
- exibir uma conferência específica de CT-e antes do preenchimento;
- preencher somente a tela `https://2323.aleff.com.br/DigitacaoCte2/DigitacaoCte2`;
- adicionar a nota à grade de **Notas Fiscais / Outros**;
- marcar **Frete Combinado** ao final;
- mostrar um relatório do que foi preenchido, deixado vazio ou marcado para conferência.

Não fazem parte desta versão:

- escolher o Tipo de Frete;
- preencher placas de veículo ou carreta;
- preencher automaticamente o responsável pelo frete combinado;
- clicar em **Cadastrar**;
- emitir, enviar ou autorizar o CT-e.

## 3. Fluxo do operador

1. O operador abre o painel da extensão e escolhe o modo **CT-e manual**.
2. Anexa a foto ou o PDF da nota e solicita a leitura.
3. A extensão mostra os dados extraídos para conferência.
4. O operador digita manualmente o CPF do motorista.
5. Expedidor e recebedor permanecem vazios por padrão; o operador pode informar seus CNPJs quando forem necessários.
6. O operador escolhe o tomador entre remetente, destinatário, expedidor ou recebedor.
7. No Sitra, o operador escolhe manualmente o Tipo de Frete.
8. O operador clica em **Preencher CT-e**.
9. A extensão preenche a tela, adiciona a nota à grade e marca **Frete Combinado**.
10. O Sitra abre a solicitação de responsável pelo frete combinado. A extensão para nesse ponto para o operador continuar manualmente.
11. O operador confere a tela, completa os campos restantes e decide se deve clicar em **Cadastrar**.

## 4. Regras de extração

### 4.1 Participantes

- O **primeiro CNPJ legível** no documento é o remetente.
- O **segundo CNPJ legível** no documento é o destinatário.
- CNPJs posteriores, como o da transportadora, não substituem os dois primeiros.
- A ordem dos CNPJs é a regra vinculante, ainda que os títulos do documento variem.
- Cada CNPJ passa pela validação matemática já usada pela extensão. Um valor inválido fica em amarelo e gera aviso; a extensão não inventa uma correção.

### 4.2 Nota fiscal

Extrair quando estiverem presentes e legíveis:

- protocolo de autorização de uso;
- número da nota;
- série;
- CFOP;
- valor total da mercadoria ou do documento;
- quantidade de volumes;
- peso bruto;
- peso líquido;
- data de emissão.

O **protocolo de autorização de uso** é o dado prioritário. Ele será enviado ao campo **Chave NF-e** do pop-up do Sitra, conforme o processo manual da empresa.

Se existirem vários CFOPs, usar o primeiro CFOP claramente identificado e marcar o campo para conferência. Se nenhum CFOP puder ser identificado com segurança, deixar o campo vazio.

Para o peso, preferir o peso bruto. Usar o peso líquido somente quando o peso bruto estiver ausente ou ilegível.

Campos ausentes ou ilegíveis permanecem vazios. A IA não deve inferir, completar ou fabricar valores.

## 5. Dados manuais e escolhas do operador

A conferência de CT-e terá estes campos adicionais:

- **CPF do motorista:** vazio inicialmente e preenchido manualmente;
- **CNPJ do expedidor:** vazio inicialmente;
- **CNPJ do recebedor:** vazio inicialmente;
- **Tomador:** seletor obrigatório com remetente, destinatário, expedidor e recebedor.

Ao escolher expedidor ou recebedor como tomador, o respectivo CNPJ deve estar preenchido na conferência. Caso contrário, a extensão impede o preenchimento e informa exatamente qual CNPJ está faltando.

A extensão não altera o Tipo de Frete. Quando o campo de tomador do Sitra estiver editável, ela preenche o CNPJ da parte escolhida. Quando o Sitra derivar o tomador do Tipo de Frete e mantiver o campo desabilitado, a extensão compara o tomador resultante com a escolha do painel e mostra um aviso se houver divergência, sem alterar o Tipo de Frete.

## 6. Mapeamento para o Sitra

| Origem | Destino no Sitra | Regra |
|---|---|---|
| Primeiro CNPJ | `txtRemetenteCpfCnpj` | Preencher e aguardar a consulta do Sitra |
| Segundo CNPJ | `txtDestinatarioCpfCnpj` | Preencher e aguardar a consulta do Sitra |
| CNPJ manual do expedidor | `txtExpedidorCpfCnpj` | Preencher somente se informado |
| CNPJ manual do recebedor | `txtRecebedorCpfCnpj` | Preencher somente se informado |
| Parte escolhida como tomador | `txtTomadorCpfCnpj` | Preencher quando editável; validar quando derivado |
| Valor fixo | `txtMercadoriasTransportadasProduto` | Selecionar `CONFORME NOTA` |
| Valor fixo `VOL` | `txtMercadoriasTransportadasEspecie` | Sempre preencher |
| CPF manual | `txtMotoristaCpf` | Preencher se informado |
| Chave de acesso (44 dígitos) | `txtNotasFiscaisChaveNfe` | Manter `NF-e/NF` selecionado; o blur consulta a chave e o Sitra preenche nº/série. **Revisado em 2026-09-29:** o Sitra recusa o protocolo ("Favor informar uma chave de nota fiscal válida!"); o protocolo fica só na conferência |
| Número da nota | `txtNotasFiscaisNotaFiscal` | Preencher quando legível |
| Série | `txtNotasFiscaisSerie` | Preencher quando legível |
| Primeiro CFOP legível | `txtNotasFiscaisCfop` | Avisar quando houver mais de um |
| Valor total | `txtNotasFiscaisValorMerc` | Formatar conforme a máscara do Sitra |
| Quantidade de volumes | `txtNotasFiscaisVolume` | Preencher quando legível |
| Peso bruto ou líquido | `txtNotasFiscaisPeso` | Preferir bruto |
| Data de emissão | `txtNotasFiscaisDataEmissao` | Formato `DD/MM/AAAA` |
| Ação | `btnNotasFiscaisAdd` | Clicar para inserir a nota na grade |
| Seleção final | `chkFreteCombinado` | Marcar. **Revisado em 2026-09-29:** o JS real não abre o modal do responsável ao marcar; a extensão avisa o operador para informá-lo e repassa a pergunta de ICMS, se houver |

A opção **Descrição** do pop-up não será preenchida. A automação usa exclusivamente o tipo **NF-e/NF**.

## 7. Arquitetura

O fluxo de CT-e reaproveita infraestrutura da extensão, mas mantém domínio e regras separados do cadastro de motorista.

### 7.1 Componentes novos

- `src/lib/campos-cte.js`: catálogo dos campos, metadados, limites e regras de apresentação;
- `src/lib/extrator-cte.js`: instruções do Gemini, schema estruturado e pós-processamento;
- `src/content/preenchedor-cte.js`: preenchimento sequencial e interação com os controles do Sitra;
- componentes de conferência do CT-e no painel lateral;
- fixture da tela de CT-e derivada da página salva no projeto de trabalho;
- testes unitários e de integração do novo fluxo.

### 7.2 Reutilização

O modo reutiliza:

- entrada e limites de arquivo de `src/lib/entrada.js`;
- leitura de imagem e PDF;
- configuração da chave do Gemini;
- padrões de normalização e validação já existentes;
- execução do content script no mundo principal;
- relatório de preenchimento e proteção contra tela errada.

Os campos de CT-e não entram no array global dos cadastros de motorista, proprietário e veículo. Isso evita que uma alteração em um fluxo afete o outro.

## 8. Sequenciamento do preenchimento

O Sitra executa consultas assíncronas e habilita campos conforme respostas do servidor. O preenchedor deve operar em etapas:

1. confirmar que a URL e os elementos identificam a tela de CT-e;
2. confirmar que o operador já escolheu um Tipo de Frete;
3. preencher remetente, disparar os eventos esperados e aguardar o retorno visual do Sitra;
4. repetir o processo para destinatário;
5. preencher expedidor e recebedor somente quando informados;
6. preencher ou validar o tomador;
7. selecionar `CONFORME NOTA` e preencher `VOL`;
8. abrir **Notas/Outros**;
9. manter **NF-e/NF**, preencher os dados disponíveis e clicar em **Inserir**;
10. confirmar que a nota apareceu na grade antes de continuar;
11. preencher o CPF do motorista;
12. marcar **Frete Combinado**;
13. parar com o modal do responsável aberto e apresentar o relatório.

Cada espera terá limite de tempo. Se o Sitra não responder, a extensão interrompe a etapa dependente, mantém os dados já preenchidos e explica onde parou.

## 9. Segurança e tratamento de erros

- A extensão só atua no domínio e na rota definidos para o Sitra.
- Nenhum dado é enviado à página antes da conferência do operador.
- Valores textuais passam pelas mesmas regras de caracteres seguros do fluxo existente.
- A extensão não contorna validações do Sitra.
- Se um campo não existir, estiver desabilitado inesperadamente ou rejeitar o valor, o relatório registra a falha.
- Campos não reconhecidos nunca são preenchidos por aproximação de seletor ou posição visual.
- O botão `btnCadastrar` não é acionado em nenhuma circunstância.
- O documento e os dados pessoais continuam sujeitos às orientações de LGPD já descritas no projeto.

## 10. Interface

O painel terá uma escolha clara entre os modos atuais e **CT-e manual**. O modo de CT-e preserva o visual existente e contém:

- área de upload;
- ação **Ler documento**;
- agrupamento **Participantes**;
- agrupamento **Nota fiscal**;
- agrupamento **Complementos manuais**;
- avisos de leitura e validação;
- botão **Preencher CT-e**.

Campos de baixa confiança, CFOP múltiplo e CNPJ inválido ficam destacados em amarelo. A origem do valor permanece visível para facilitar a conferência.

## 11. Testes e critérios de aceitação

### 11.1 Extração

- O documento de exemplo produz o primeiro CNPJ como remetente e o segundo como destinatário.
- O protocolo de autorização é extraído sem confusão com número da nota, CNPJ ou outros números.
- Número, série, valor, volumes, peso e data são extraídos quando legíveis.
- Vários CFOPs resultam no primeiro valor e em aviso de conferência.
- Um campo ausente permanece vazio.

### 11.2 Preenchimento

- O preenchedor rejeita uma página que não seja a tela de CT-e.
- Remetente e destinatário são preenchidos na ordem e com espera entre consultas.
- Expedidor e recebedor vazios não são alterados.
- Tomador editável recebe o CNPJ da parte escolhida.
- Tomador derivado divergente produz aviso e não altera o Tipo de Frete.
- `CONFORME NOTA` e `VOL` são aplicados.
- O pop-up permanece em `NF-e/NF` e recebe protocolo, CFOP e demais dados disponíveis.
- A nota é inserida na grade.
- O CPF manual é preenchido.
- **Frete Combinado** é marcado e o modal do responsável permanece para o usuário.
- Tipo de Frete, placas e botão **Cadastrar** nunca são alterados ou acionados.

### 11.3 Verificação final

- Toda a suíte Vitest passa.
- O build gera os bundles da extensão sem erro.
- Um teste manual na tela real do Sitra usa o documento de exemplo.
- O operador confirma que o relatório corresponde ao estado final da tela.

## 12. Resultado esperado

Com uma nota semelhante ao exemplo fornecido, o operador deve conseguir revisar os dados extraídos, informar CPF e escolhas manuais e preencher a maior parte da Digitação de CT-e com uma ação. Ao final, o Sitra deve estar aguardando o responsável pelo frete combinado e a conferência humana, sem cadastro automático.
