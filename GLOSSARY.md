# Portaria x Checklist — Glossário

Termos usados no código, na interface e nos documentos. Registre termos novos aqui.

## Portarias e registros

**Portaria**:
Uma das entradas da Tóliman no projeto: **Distrito** (`DIS`), com frota, pessoas e vistorias, e **Machado** (`MAC`), só com pessoas.
_Evitar_: unidade, filial (exceto no cabeçalho do REG LOG 04, que usa "Unidade")

**Lists / Registro**:
Item de uma das listas do Microsoft Lists onde os porteiros registram os movimentos: Registro de Frota, Registro de Visitantes, Registro de Entrada e Saída. O painel só lê esses itens; correções são feitas no Lists.

**Cópia do item (espelho)**:
Arquivo `listas/<Pasta>/<lista>/<ID>.json` que o Power Automate grava (e sobrescreve) a cada item criado ou alterado no Lists.
_Evitar_: sincronização, importação

**Permanência**:
Período entre a entrada e a saída de uma pessoa ou veículo numa portaria, montado pelo painel a partir dos itens do Lists.
_Evitar_: visita, movimento, linha

**No local agora**:
Permanências abertas, ou seja, com entrada e ainda sem saída. Para a frota: **no pátio**.

**Saída sem entrada (saída avulsa)**:
Saída registrada no Lists sem uma entrada correspondente. Aparece nos alertas de dados.

**Ocultar registro**:
Tirar do painel um registro errado ou excluído no Lists, com motivo. O item no Lists não é alterado.

**Visitante**:
Pessoa externa registrada na lista de visitantes. Um item por visita, editado na saída.

**Colaborador**:
Funcionário registrado na lista de entrada e saída: Chegada Expediente, Saída Intervalo, Chegada Intervalo, Saída Expediente.

**Jornada do dia**:
Marcações de um colaborador num dia, em ordem: entrada, saída (intervalo), retorno, saída. Não é ponto eletrônico.
_Evitar_: ponto, folha de ponto

**Retorno / Em intervalo**:
Retorno é a entrada do colaborador depois de uma saída por intervalo no mesmo dia. Em intervalo é quem saiu para o intervalo e ainda não voltou.

**Chegada da frota**:
Item "Chegada" na lista Registro de Frota da Distrito. Toda chegada pede um REG LOG 03; elas são contadas pelo fluxo para a regra do 5º veículo.
_Evitar_: entrada de caminhão

**Alerta (5º veículo)**:
Arquivo `alertas/DIS_<ID>.json` gravado pelo fluxo 2 na 5ª, 10ª, 15ª… chegada desde a data de ativação. É a fonte das vistorias 17 pontos automáticas.

## Checklists

**REG LOG 03 / Checklist operacional**:
Ficha para Inspeção Veicular Operacional, feita pelo GR ou coordenador em toda chegada da frota.

**REG LOG 04 / Vistoria 17 pontos**:
Ficha para Inspeção de Segurança de Veículos de 17 pontos, feita pelo GR ou coordenador.

**Vistoria pendente**:
REG LOG 04 que precisa ser feito, gerado por um alerta do fluxo ou forçado, e ainda não concluído nem dispensado.

**Forçar / Dispensar**:
Exceções à regra do 5º veículo, sempre com justificativa, feitas no painel. Forçar cria uma vistoria pendente fora da sequência (sem mensagem no Teams). Dispensar encerra uma vistoria pendente sem fazê-la.

**Região**:
Parte do veículo onde se registram avarias no REG LOG 03. No cavalo: lado motorista, frente e lado carona. Em cada reboque: lado motorista, lado carona e traseira.

**Código de avaria**:
A amassado, R riscado, F faltando, Q quebrado, C cortado, M marcado guia.

**Fotos do CTRC**:
Fotos que o porteiro anexa no Lists (colunas CTRC_1 e CTRC_2), copiadas pelo fluxo 1 para `fotos/Distrito/ctrc/`.

## Pessoas

**Pessoa**:
Quem usa o painel, escolhida por nome. Não é login.
_Evitar_: usuário

**Papel**:
GR, Coordenador ou Administrador. Uma pessoa pode ter vários.

**GR / Coordenador**:
Gerenciamento de Risco e coordenação. Têm as mesmas permissões no painel: acompanhar, fazer, corrigir, forçar e dispensar vistorias e ocultar registros.

**Administrador**:
Cadastra as pessoas do painel e seus papéis.

**Pasta de fotos de entrada**:
`fotos-entrada/Distrito/`, para onde o celular do GR envia as fotos da vistoria pelo app OneDrive antes de serem vinculadas.
