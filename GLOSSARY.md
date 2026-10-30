# Portaria x Checklist — Glossário

Termos usados no código, na interface e nos documentos. Registre termos novos aqui.

## Portarias e registros

**Portaria**:
Uma das 3 entradas da Tóliman: Machado (`MAC`), João Pessoa (`JP`) e Distrito (`DIS`). Cada computador do painel fica fixo numa portaria.
_Evitar_: unidade, filial (exceto no cabeçalho do REG LOG 04, que usa "Unidade")

**Permanência**:
Período entre a entrada e a saída de uma pessoa ou veículo numa portaria. Abre com a entrada e fecha com "Registrar saída".
_Evitar_: visita, movimento, linha

**No local agora**:
Permanências abertas, ou seja, com entrada e ainda sem saída.

**Saída avulsa**:
Saída registrada sem entrada correspondente no painel.

**Visitante / Prestador**:
Pessoa externa que entra na portaria. O Prestador presta serviço; o Visitante, não.

**Colaborador**:
Funcionário entrando ou saindo, a pé, com carro próprio ou com veículo da empresa.

**Chegada da frota**:
Entrada de um veículo da frota (cavalo + reboques) numa portaria. É o que conta para a regra do 5º veículo.
_Evitar_: entrada de caminhão

## Checklists

**REG LOG 03 / Checklist operacional**:
Ficha para Inspeção Veicular Operacional, preenchida em toda chegada da frota.

**REG LOG 04 / Vistoria 17 pontos**:
Ficha para Inspeção de Segurança de Veículos de 17 pontos, feita pelo GR.

**Vistoria pendente**:
REG LOG 04 que precisa ser feito, gerado pela regra do 5º veículo ou forçado, e ainda não concluído nem dispensado.

**Forçar / Dispensar**:
Exceções à regra do 5º veículo, sempre com justificativa. Forçar cria uma vistoria pendente fora da sequência. Dispensar (só o GR) encerra uma vistoria pendente sem fazê-la.

**Região**:
Parte do veículo onde se registram avarias no REG LOG 03. No cavalo: lado motorista, frente e lado carona. Em cada reboque: lado motorista, lado carona e traseira.

**Código de avaria**:
A amassado, R riscado, F faltando, Q quebrado, C cortado, M marcado guia.

## Pessoas e cadastros

**Pessoa**:
Quem opera o painel, escolhida por nome. Não é login.
_Evitar_: usuário

**Papel**:
Porteiro, GR ou Administrador. Uma pessoa pode ter vários.

**GR**:
Equipe de Gerenciamento de Risco, responsável pela vistoria 17 pontos.

**Funcionário**:
Registro do cadastro de funcionários, usado em Colaboradores e como Motorista. É diferente de Pessoa.

**Motorista**:
Funcionário marcado como motorista, com CNH e validade.

**Fora do cadastro**:
Placa ou funcionário registrado na portaria sem constar no cadastro, que fica pendente para o Administrador completar.

**Pasta de fotos de entrada**:
`fotos-entrada/<Portaria>/`, para onde o celular envia fotos pelo app OneDrive antes de serem vinculadas.
