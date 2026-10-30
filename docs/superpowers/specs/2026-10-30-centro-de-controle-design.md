# Centro de controle do GR e do coordenador — Especificação (v2)

Data: 30/10/2026 · Status: **aguardando revisão do usuário**

**Substitui** partes da especificação v1 (`2026-10-30-portaria-checklist-design.md`): a entrada de dados, as portarias, os cadastros e a regra do 5º veículo. O que não estiver aqui continua como na v1: fichas REG LOG 03 e 04, PDFs, fotos da vistoria, histórico e correções. Decisão registrada em `docs/adr/0003-lists-como-entrada-e-painel-como-centro-de-controle.md`.

## 1. Objetivo

Os porteiros **continuam registrando tudo no Microsoft Lists, sem nenhuma mudança**. O painel deixa de ser usado na portaria e vira o **centro de controle do GR e do coordenador**:

- acompanhar o fluxo de pessoas e a frota no pátio;
- **realizar as vistorias**: REG LOG 03 em toda chegada da frota e REG LOG 04 na regra do 5º veículo;
- gerar os PDFs e manter o histórico.

As automações ficam no **Power Automate**.

## 2. Portarias

| Portaria | O que registra no Lists | No painel |
|---|---|---|
| **Tóliman Distrito** (`DIS`) | Visitantes, colaboradores e **frota** | Fluxo de pessoas, frota no pátio, **todas as vistorias** |
| **Tóliman Machado** (`MAC`) | Visitantes e colaboradores | Fluxo de pessoas |

A **Tóliman João Pessoa sai do projeto**. A frota, a manutenção e o GR estão concentrados na Distrito.

## 3. Arquitetura

```
Porteiro ──► Microsoft Lists (5 listas, sem mudança)
                 │  gatilho por item
                 ▼
          Power Automate (6 fluxos, na conta do usuário + coproprietário)
                 │  grava arquivos
                 ▼
   Pasta do SharePoint do time (sincronizada pelo OneDrive)
                 ▲  lê e grava
                 │
          Painel (PC do GR e do coordenador, Edge/Chrome)
```

O painel continua no modelo do Raster: pasta sincronizada, File System Access e eventos do próprio painel em `eventos/` (ADR 0001). Ele passa a **ler também** os arquivos gravados pelos fluxos.

### 3.1 Listas existentes (lidas, nunca alteradas)

| Lista | Portarias | Colunas usadas (nomes reais) |
|---|---|---|
| Registro de Frota | DIS | `Placa_cavalo`, `Placa_reboque1`, `Placa_reboque2`, `Placa_reboque3`, `Motorista`, `Situacao` (Chegada/Saída, legados Entrada/Saida), `KM`, `Data`, `Hora`, `Minuto`, `CTRC_1` e `CTRC_2` (fotos, em anexos), `Criado` |
| Registro de Entrada e Saída (colaboradores) | DIS, MAC | `Nome`, `Situação` (Chegada Expediente, Saída Intervalo, Chegada Intervalo, Saída Expediente; legados Entrada/Saída), `Veículo` (Carro, Moto, Nenhum…), `Placa`, `Data`, `Hora`, `Minuto`, `Observação`, `Check-list`, `KM` |
| Registro de Visitantes | DIS, MAC | `Nome`, `RG/CNH`, `Placa_veiculo`, `Data`, `Entrada/Saída`, `Hora`, `Minuto`, `Setor_visita`, `cracha`, `hora_saida` |

As listas da Machado precisam ter as mesmas colunas. Isso será conferido na instalação com uma exportação de cada uma.

### 3.2 Fluxos do Power Automate (6, só conectores padrão)

Os fluxos ficam na conta do usuário (que é membro do site e só precisa ler as listas), com **um coproprietário** do GR ou da coordenação.

| # | Gatilho | Faz |
|---|---|---|
| 1 | Frota DIS: item criado ou alterado | Grava o espelho do item. Copia os anexos (fotos do CTRC) para `fotos/Distrito/ctrc/` |
| 2 | Frota DIS: **item criado** | Regra do 5º veículo (§5) |
| 3 | Visitantes DIS: item criado ou alterado | Grava o espelho do item |
| 4 | Colaboradores DIS: item criado ou alterado | Grava o espelho do item |
| 5 | Visitantes MAC: item criado ou alterado | Grava o espelho do item |
| 6 | Colaboradores MAC: item criado ou alterado | Grava o espelho do item |

**Espelho do item:** o fluxo grava `listas/<Portaria>/<lista>/<ID>.json`, sempre **sobrescrevendo o arquivo do mesmo ID**, de modo que o arquivo é a versão mais recente do item. O conteúdo é:

```json
{ "lista": "frota|visitantes|colaboradores", "portaria": "DIS|MAC", "id": 123,
  "criado": "<ISO>", "modificado": "<ISO>", "autor": "<nome>", "editor": "<nome>",
  "link": "<URL do item no Lists>",
  "campos": { "<nome real da coluna>": "<valor>" },
  "anexos": ["fotos/Distrito/ctrc/123_<arquivo>"] }
```

A lógica fica no painel. O fluxo só copia, para continuar simples e igual nas 6 cópias.

## 4. Como o painel interpreta as listas

**Instante de cada movimento:** `Data` + `Hora` + `Minuto`, que o porteiro digita. Se faltar algum desses campos, usa `criado`.

**Placas:** são normalizadas. `Nenhum`, `-` e vazio contam como sem placa.

**Frota**
- `Chegada`/`Entrada` é uma chegada; `Saída`/`Saida` é uma saída.
- Cada saída fecha a chegada aberta mais recente do **mesmo cavalo**, anterior a ela.
- Chegada sem saída = **no pátio**. Saída sem chegada = **saída avulsa**.

**Colaboradores**
- As chaves de pareamento usam o nome normalizado (minúsculas, sem espaços nas pontas). Uma matrícula digitada no lugar do nome vale como nome.
- Correspondência dos valores de `Situação`:

| Valor em `Situação` | Vira |
|---|---|
| Chegada Expediente / Entrada | entrada |
| Saída Intervalo | saída com motivo intervalo |
| Chegada Intervalo | retorno |
| Saída Expediente / Saída | saída com motivo fim do expediente |

- **Jornada do dia** e **Em intervalo** funcionam como na v1.

**Visitantes**
- Um item é uma visita.
- A entrada é `Data`/`Hora`/`Minuto`.
- A saída existe quando `Entrada/Saída` = Saída, no horário de `hora_saida` do mesmo dia. Se `hora_saida` for anterior à entrada, conta como o dia seguinte.

**Edições e exclusões**
- Um item editado no Lists substitui a versão anterior no painel, porque o arquivo é sobrescrito.
- Um item **excluído** no Lists **não é removido** do painel. Isso é uma limitação: o gatilho de exclusão exige administrador do site. O painel permite **ocultar** um registro com justificativa (evento `registro_ocultado`).

## 5. Regra do 5º veículo (no fluxo 2)

1. Gatilho: item criado na Frota DIS com `Situacao` = Chegada ou Entrada e `Criado` ≥ **data de ativação** (constante no fluxo).
2. O fluxo conta os itens da lista com `Situacao` Chegada/Entrada e `Criado` ≥ data de ativação, com paginação ligada.
3. Se a contagem for múltipla de 5:
   - grava `alertas/DIS_<ID>.json` com `{ id, ordem, placaCavalo, reboques, motorista, chegada, mensagem }`;
   - posta a `mensagem` no **canal do GR** no Teams.
4. O **controle de simultaneidade** fica em 1, para dois itens nunca receberem a mesma contagem.

O porteiro **não vê nada**: o fluxo não altera o item.

No painel, as vistorias automáticas vêm **dos arquivos em `alertas/`**, que são a fonte da regra, e a ordem é a contagem do fluxo. Forçar, dispensar e concluir continuam sendo eventos do painel. Isso substitui a contagem feita no painel (ADR 0002).

## 6. Pessoas do painel e papéis

| Papel | Pode |
|---|---|
| **GR** | Ver tudo; fazer, corrigir, forçar e dispensar vistorias (03 e 04); ocultar registros |
| **Coordenador** | O mesmo que o GR |
| **Administrador** | Cadastrar pessoas do painel e seus papéis |

O painel não tem mais o papel Porteiro. A senha do administrador funciona como na v1.

O painel **não fica preso a uma portaria**: GR e coordenador veem Distrito e Machado. Os filtros de portaria aparecem só nas telas de pessoas.

## 7. Telas

1. **Centro de controle** (início):
   - **Distrito e Machado lado a lado:** visitantes no local, colaboradores no local, em intervalo e movimentos de hoje;
   - **Distrito:** frota no pátio;
   - **Vistorias:** aguardando checklist 03 (com o tempo de espera), 17 pontos pendentes e não conformidades recentes;
   - **Alertas de dados:** saídas sem entrada, permanências acima de 12 h e atraso do espelho (último arquivo recebido de cada lista).
2. **Vistorias** (Distrito):
   - **fila do 03:** toda chegada sem checklist 03;
   - **fila do 04:** vistorias pendentes;
   - histórico de checklists, PDFs e correções, como na v1.
   - O REG LOG 03 mostra as **fotos do CTRC** da chegada e o link "ver no Lists".
3. **Frota** (Distrito): no pátio e histórico, com placas, motorista, KM, fotos do CTRC, link para o Lists, situação dos checklists e Exportar CSV.
4. **Visitantes** e **Colaboradores** (filtro Distrito/Machado): no local, jornada do dia (colaboradores), histórico, link para o Lists e Exportar CSV. São **somente leitura**.
5. **Pessoas do painel** (administrador).

**Saem do painel:** os formulários de entrada e saída, a saída avulsa, o registro rápido, a correção de registros (que agora é feita no Lists) e a aba Cadastros (que não é usada).

## 8. Fotos

- **Fotos do CTRC:** copiadas pelo fluxo 1 a partir dos anexos do item. No piloto, conferir se o formulário do Lists grava `CTRC_1` e `CTRC_2` como anexos. As exportações indicam que sim (`Reserved_ImageAttachment_…`), e `appres://resources/SampleImage` significa sem foto.
- **Fotos das vistorias:** continuam como na v1, enviadas pelo app OneDrive para `fotos-entrada/Distrito/` e vinculadas no painel.

## 9. Testes e entrega

- **Funções puras novas, com testes no Node:**
  - leitura dos espelhos;
  - pareamento de frota, colaboradores e visitantes, usando linhas reais das exportações (anonimizadas) como fixtures;
  - instante digitado;
  - normalização de placas e valores legados;
  - vistorias a partir de `alertas/`.
- **Testes de navegador** no modo demonstração, com espelhos e alertas de exemplo.
- **Entrega:**
  - pacote do painel;
  - passo a passo dos 6 fluxos (um completo, mais o que muda em cada cópia);
  - instruções de instalação.

## 10. Fora do escopo

- João Pessoa.
- Qualquer mudança nas listas.
- Importação do histórico anterior à ativação.
- Cadastros de veículos e funcionários.
- Sincronizar exclusões de itens.
- Uso no celular.

## 11. Riscos

- **Dono dos fluxos:** eles param se a conta do usuário for desativada. Por isso o coproprietário.
- **Horas digitadas erradas** no Lists afetam o pareamento e a jornada. O painel aponta inconsistências (saída antes da entrada, saída sem entrada).
- **Limite diário de ações** do Power Automate. O volume estimado é de cerca de 20 itens por dia por portaria, bem abaixo do limite, mas convém acompanhar.
- **Dados pessoais:** documentos de visitantes passam a ter uma cópia na pasta do painel. Restringir a pasta ao GR e à coordenação.
