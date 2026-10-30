# Lists como entrada dos dados e painel como centro de controle

Os porteiros já registram visitantes, colaboradores e frota no Microsoft Lists, que funciona no celular e no Teams. O usuário é membro do site, não proprietário, e não quer nenhuma mudança nas listas.

Decidimos assim:
- as listas continuam sendo a única entrada de movimentos;
- fluxos do Power Automate copiam cada item para a pasta do painel e aplicam a regra do 5º veículo;
- o painel passa a ser o centro de controle do GR e do coordenador, e é nele que as vistorias REG LOG 03 e 04 são feitas.

Junto com isso:
- frota e vistorias ficam só na Tóliman Distrito;
- a Machado registra apenas pessoas;
- a João Pessoa sai do projeto.

## Opções consideradas

- **Painel como entrada de tudo** (v1): exige que os porteiros troquem de ferramenta e não roda no celular.
- **Lists para tudo, inclusive os checklists:** as fichas longas ficam ruins no formulário do Lists, e as regras dos itens 12 a 17 e da observação obrigatória ficam frágeis.
- **Regra do 5º veículo no painel:** só dispararia com algum painel aberto. No fluxo, ela roda sempre.

## Consequências

- **Fluxos simples:** só copiam o item. A interpretação das listas fica no painel, onde há testes.
- **Fonte da regra do 5º veículo:** são os arquivos em `alertas/` gravados pelo fluxo, com simultaneidade 1. Isso substitui a contagem do painel da ADR 0002.
- **Exclusões no Lists** não chegam ao painel. O painel permite ocultar um registro com justificativa.
- **Dono dos fluxos:** eles dependem da conta de quem os criou. Por isso deve haver um coproprietário.
