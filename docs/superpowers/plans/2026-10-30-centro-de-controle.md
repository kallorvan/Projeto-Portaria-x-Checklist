# Centro de controle (v2) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O painel deixa de receber registros e passa a ser o centro de controle do GR e do coordenador:
- **lê** as cópias dos itens do Microsoft Lists e os alertas gravados pelo Power Automate;
- mostra o fluxo de pessoas da Distrito e da Machado e a frota no pátio;
- é onde se fazem as vistorias REG LOG 03 e REG LOG 04, que existem só na Distrito.

**Architecture:**
- Os arquivos `listas/<Pasta>/<lista>/<ID>.json` (espelhos sobrescritos pelo fluxo) viram permanências por funções puras novas (`painel/lib/listas.js`).
- `alertas/DIS_<ID>.json` vira a fonte das vistorias automáticas.
- Os eventos do próprio painel (`eventos/`) continuam guardando checklists, forçar, dispensar, ocultar e pessoas.

**Tech Stack:** a mesma da v1 (HTML/JS clássico, `node:test`, Playwright, jsPDF).

**Spec:** `docs/superpowers/specs/2026-10-30-centro-de-controle-design.md`. Ela substitui partes de `2026-10-30-portaria-checklist-design.md`. Ver também `docs/adr/0003-…`.

## Global Constraints

- **Portarias:**
  - `DIS` = "Tóliman Distrito", pasta `Distrito`, com frota;
  - `MAC` = "Tóliman Machado", pasta `Machado`, sem frota.
  - João Pessoa sai do projeto.
- **Listas:**
  - **Pastas dos espelhos:** `listas/<Pasta>/frota/`, `listas/<Pasta>/visitantes/`, `listas/<Pasta>/colaboradores/`.
  - **Arquivo de espelho:** `{ lista, portaria, id, criado, modificado, autor, editor, link, campos, anexos }`, com `campos` pelos **nomes reais das colunas**:
    - frota: `Placa_cavalo`, `Placa_reboque1..3`, `Motorista`, `Situacao`, `KM`, `Data`, `Hora`, `Minuto`;
    - colaboradores: `Nome`, `Situação`, `Veículo`, `Placa`, `Data`, `Hora`, `Minuto`, `Observação`, `KM`;
    - visitantes: `Nome`, `RG/CNH`, `Placa_veiculo`, `Data`, `Entrada/Saída`, `Hora`, `Minuto`, `Setor_visita`, `cracha`, `hora_saida`.
  - **Alerta:** `alertas/DIS_<ID>.json` com `{ id, ordem, placaCavalo, reboques, motorista, chegada, mensagem }`.
- **Instante de cada movimento:** `Data` (`DD/MM/AAAA`) + `Hora` + `Minuto`, na hora local. Se faltar algum ou for inválido, usa `criado`.
- **Placas:** `Regras.normalizarPlaca`. `NENHUM` ou vazio contam como sem placa.
- **Situação → movimento:**
  - Frota: `Chegada`/`Entrada` = chegada; `Saída`/`Saida` = saída.
  - Colaboradores:
    - `Chegada Expediente`/`Entrada` = entrada;
    - `Chegada Intervalo` = entrada (vira "retorno" pelo estado);
    - `Saída Intervalo` = saída com `motivo:'intervalo'`;
    - `Saída Expediente`/`Saída` = saída com `motivo:'fim'`.
  - A comparação ignora maiúsculas e acentos.
- **Papéis:**
  - `gr` e `coordenador` têm as mesmas permissões: fazer, corrigir, forçar e dispensar vistorias, e ocultar registros.
  - `admin` cadastra pessoas.
  - O papel `porteiro` deixa de existir.
- **O painel nunca grava em `listas/` nem em `alertas/`.** Forçar uma vistoria **não** posta no Teams.
- **Sem portaria do PC:** um seletor de portaria (`DIS`/`MAC`) aparece só nas abas de pessoas. Vistorias e Frota são sempre da Distrito.
- Interface em português, com os termos do `GLOSSARY.md`, e o visual atual do painel.

## Review Focus

1. **Hora digitada vazia ou inválida** (`Hora` vazia, `"24"`, `Data` sem barras): usa `criado` e não quebra. Teste na Task 1.
2. **Placa da saída em formato diferente da chegada** (`'CUP-2J18 '` × `'CUP2J18'`): o pareamento acontece. Teste na Task 1.
3. **Visitante com `hora_saida` anterior à entrada** (saiu depois da meia-noite): a saída cai no dia seguinte. Teste na Task 1.
4. **Item editado no Lists** (arquivo sobrescrito com o mesmo nome): o painel relê o arquivo e mostra a versão nova. Teste na Task 3 (cache por nome **e** data de modificação).
5. **Alerta repetido para o mesmo item, ou forçar numa chegada que já tem alerta:** resulta em uma vistoria só. Teste na Task 2.

---

### Task 1: `listas.js`: dos itens do Lists às permanências

**Files:**
- Create: `painel/lib/listas.js`, `tests/listas.test.cjs`, `tests/fixtures/listas/*.json` (itens anonimizados no formato do espelho, montados a partir de linhas reais das exportações)

**Interfaces:**
- Consumes: `Regras.normalizarPlaca`.
- Produces `Listas`:
  - `instante(campos, criado) -> string ISO`
  - `placa(v) -> string` (normalizada; `''` para vazio, `NENHUM` e `-`)
  - `permanencias(itens: Espelho[]) -> Permanencia[]`, no **mesmo formato** das permanências do `Estado` v1:
    - `{ id, portaria, categoria, entrada: { em, pessoa, campos } | null, saida: {…} | null, avulsa, retorno:false, foraDoCadastro: [], historico: [], origem: 'lists', itens: [ids], link }`
    - **ids:** frota `frota-<idChegada>` (avulsa: `frota-s<idSaida>`); colaborador `col-<idEntrada>` (avulsa: `col-s<id>`); visitante `vis-<id>`.
    - **campos da entrada:**
      - frota `{ placaCavalo, reboques, motoristaNome, km, anexos, itemId }`;
      - colaborador `{ nome, veiculo, placa, km, observacao }`;
      - visitante `{ nome, documento, placa, setor, cracha }`, com `categoria:'visitante'`.
    - **campos da saída:** frota `{ km, itemId }`; colaborador `{ motivo, km, observacao }`; visitante `{}`.
    - `entrada.pessoa` / `saida.pessoa` = `autor` / `editor` do item.
  - **Pareamento:**
    - **Frota e colaboradores:** os movimentos são ordenados por instante. Cada saída fecha a entrada aberta **mais recente** da mesma chave (placa do cavalo, ou nome em minúsculas sem espaços nas pontas) na mesma portaria, com instante ≤ ao da saída. Sem entrada aberta, vira avulsa.
    - **Visitante:** saída = `Entrada/Saída` igual a `Saída` com `hora_saida` `HH:MM` no dia da entrada. Se `hora_saida` for menor que a hora de entrada, soma 1 dia.

- [ ] **Step 1: Testes que falham** (`tests/listas.test.cjs`):
  - `instante({Data:'30/12/2025',Hora:'17',Minuto:'14'}, x)` corresponde a `new Date(2025,11,30,17,14).toISOString()`;
  - `instante({Data:'30/12/2025',Hora:'',Minuto:'5'}, '2025-12-30T20:15:48.000Z') === '2025-12-30T20:15:48.000Z'`;
  - `Hora:'24'` usa `criado`;
  - `placa(' cup-2j18 ') === 'CUP2J18'`; `placa('Nenhum') === ''`; `placa('-') === ''`;
  - **frota:** chegada `CUP-2J18 ` às 07:01 e saída `CUP2J18` às 16:00 → 1 permanência com saída; uma saída sem chegada → `avulsa:true`;
  - **duas chegadas do mesmo cavalo e uma saída:** fecha a mais recente; a anterior fica sem saída;
  - **colaborador** com os 4 itens (Chegada Expediente 07:02, Saída Intervalo 11:58, Chegada Intervalo 13:01, Saída Expediente 17:05) → 2 permanências, com motivos `intervalo` e `fim`;
  - **visitante** com entrada 22:30 e `hora_saida` `01:10` → a saída é no dia seguinte;
  - **visitante** com `Entrada/Saída` igual a `Entrada` → `saida === null`.
- [ ] **Step 2:** `npm test`. Esperado: FAIL.
- [ ] **Step 3:** Implemente `painel/lib/listas.js` (`root.Listas`) e as fixtures.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: leitura dos itens do Lists`.

### Task 2: Estado v2: fontes do Lists, vistorias por alerta, ocultar, papéis

**Files:**
- Modify: `painel/lib/estado.js`, `painel/lib/fichas.js`, `tests/vistoria.test.cjs` (reescrito), `tests/estado.test.cjs`, `tests/fichas.test.cjs`

**Interfaces:**
- Consumes: `Listas.permanencias`.
- Produces: `Estado.montarEstado(eventos, agora, fontes = { itens: [], alertas: [] })`.
  - **Permanências:** as de eventos (v1, mantidas) **mais** `Listas.permanencias(fontes.itens)`.
  - **Ocultar:** o evento `registro_ocultado { permanenciaId, motivo }` marca `p.oculto = { motivo, pessoa, em }`. `noLocal`, `jornadas` e `emIntervalo` ignoram as ocultas.
  - **Vistorias automáticas:** uma por alerta (deduplicado por `id`), com `{ permanenciaId: 'frota-<id>', portaria: 'DIS', origem: 'automatica', ordem: alerta.ordem, desde: alerta.chegada, … }`.
  - **Forçar:** cria uma vistoria só se a permanência ainda não tiver nenhuma. Situação e conclusão como na v1.
  - **Contadores:** a contagem do painel e `estado.contadores` são removidos. Fica `estado.ultimaOrdem` (maior `ordem` entre os alertas, ou 0).
- `Fichas.PORTARIAS` = `[{ id:'DIS', nome:'Tóliman Distrito', pasta:'Distrito', frota:true }, { id:'MAC', nome:'Tóliman Machado', pasta:'Machado', frota:false }]`.

- [ ] **Step 1: Testes que falham:**
  - **`tests/vistoria.test.cjs`** reescrito:
    - 2 alertas (`id` 10 com ordem 5, `id` 20 com ordem 10) mais as chegadas dos itens 10 e 20 → 2 vistorias automáticas com `permanenciaId` `frota-10` e `frota-20`;
    - o mesmo alerta repetido → 1 vistoria;
    - forçar `frota-10` → continua 1 vistoria;
    - forçar uma chegada sem alerta → `origem:'forcada'`;
    - dispensar e concluir como na v1;
    - `ultimaOrdem === 10`.
  - **`tests/estado.test.cjs`:**
    - com `fontes.itens` = fixture de frota com uma chegada aberta → `noLocal('DIS')` tem 1 item `origem:'lists'`;
    - `registro_ocultado` nessa permanência → `noLocal('DIS')` vazio.
  - **`tests/fichas.test.cjs`:** `PORTARIAS.map(p=>p.id)` deep-equals `['DIS','MAC']`.
- [ ] **Step 2:** `npm test`. Esperado: FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: estado a partir do Lists e alertas do fluxo`.

### Task 3: Leitura dos espelhos e casca do centro de controle

**Files:**
- Modify: `painel/lib/armazenamento.js`, `painel/js/nucleo.js`, `painel/js/tela-pessoas.js`, `painel/painel.html`, `tests/e2e/util.cjs`, `tests/e2e/casca.cjs`
- Delete: `painel/js/tela-cadastros.js`, `tests/e2e/cadastros.cjs`, `tests/e2e/permanencias.cjs`, `tests/e2e/colaborador-cadastrado-depois.cjs`, `entrega/modelo-cadastro-*.csv`, `painel/lib/csv.js` (**importação**; manter `gerarCsv`), e as partes de importação de `tests/csv.test.cjs`

**Interfaces:**
- Produces:
  - `Armazenamento.lerJsonDe(pastaRaiz: string) -> Promise<object[]>`: lê `listas/**` ou `alertas/*`, com cache por caminho **e** `lastModified` (relê arquivos sobrescritos).
  - Em `nucleo.js`, `recarregar` monta `fontes = { itens: await A.lerJsonDe('listas'), alertas: await A.lerJsonDe('alertas') }` e passa a `Estado.montarEstado`.
  - `P.podeVistoriar() -> bool` (papel `gr` ou `coordenador`).
  - `st.vista`: portaria das abas de pessoas, `'DIS'` por padrão.
  - Utilitário de teste: `util.espelho(page, item)` grava `listas/<Pasta>/<lista>/<id>.json`; `util.alerta(page, a)` grava `alertas/DIS_<id>.json`.

**Mudanças na casca:**
- O primeiro acesso cria o administrador e escolhe a pessoa. **Sem portaria do PC.**
- **Pessoas do painel:** os papéis são GR, Coordenador e Administrador.
- **Abas:** Centro de controle (`ini`), Vistorias (`ck`), Frota (`frota`), Visitantes (`vis`), Colaboradores (`col`), Pessoas (`pes`). Cadastros sai.
- **Seletor de portaria no topo:** visível só nas abas `vis` e `col`.

- [ ] **Step 1:** Reescreva `tests/e2e/casca.cjs`:
  - primeiro acesso → adiciona "Ana" com o papel `coordenador`;
  - grava um espelho de frota (chegada) → `estado.permanencias.length === 1`;
  - regrava o **mesmo arquivo** com `Placa_cavalo` diferente e chama `recarregar()` → a placa nova aparece (Review Focus 4);
  - não há elemento `#tab-cad` nem `#portaria-lista`.
- [ ] **Step 2:** `npm run e2e -- casca`. Esperado: FAIL.
- [ ] **Step 3:** Implemente e apague os arquivos listados.
- [ ] **Step 4:** `npm test && npm run e2e -- casca`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: centro de controle lê os espelhos do Lists`.

### Task 4: Telas somente leitura e Centro de controle

**Files:**
- Modify: `painel/js/registros-comum.js`, `painel/js/tela-visitantes.js`, `painel/js/tela-colaboradores.js`, `painel/js/tela-frota.js`, `painel/js/tela-inicio.js`
- Create: `tests/e2e/controle.cjs`

**Interfaces:**
- Consumes: `estado.noLocal`, `jornadas`, `emIntervalo`, `permanencias` (com `link`, `oculto`) e `vistorias`; `P.podeVistoriar`; `P.miniaturas`.
- Produces: `P.detalhe(p)` (somente leitura) com os botões **Ver no Lists** (`<a href=link target=_blank>`) e **Ocultar registro** (pede motivo e grava `registro_ocultado`; só aparece com `podeVistoriar`).

**Telas:**
- **Remover** os formulários de entrada, Registrar saída, Saída avulsa, registro rápido e Corrigir.
- **Visitantes e Colaboradores:**
  - mostram no local, jornada do dia (colaboradores) e histórico com Exportar CSV;
  - filtram pela portaria `st.vista`.
- **Frota** (sempre DIS):
  - no pátio e histórico;
  - situação dos checklists;
  - miniaturas das fotos do CTRC (`entrada.campos.anexos`).
- **Centro de controle:**
  - **um bloco por portaria:** visitantes no local, colaboradores no local, em intervalo, movimentos de hoje e, na DIS, frota no pátio;
  - **bloco Vistorias:** aguardando 03 (chegadas DIS sem checklist 03, com a maior espera), 17 pontos pendentes, não conformidades dos últimos 7 dias e última ordem do fluxo;
  - **Alertas de dados:**
    - saídas avulsas de hoje;
    - permanências abertas há mais de 12 h;
    - "espelho atrasado": lista sem arquivo novo há mais de 24 h, pelo maior `modificado` de cada lista.

- [ ] **Step 1:** `tests/e2e/controle.cjs`. Grava espelhos com:
  - 2 colaboradores DIS (um em intervalo);
  - 1 visitante MAC no local;
  - 2 chegadas de frota DIS (uma com anexo de foto gravado em `fotos/Distrito/ctrc/`);
  - 1 saída avulsa.

  Verifica:
  - o Centro de controle mostra `Distrito` e `Machado` com os números certos (seletores `#ctl-DIS-col`, `#ctl-DIS-intervalo`, `#ctl-MAC-vis`, `#ctl-DIS-frota`, `#ctl-03`);
  - o alerta de dados cita a saída avulsa;
  - na aba Frota, a linha da chegada com anexo tem `img`;
  - na aba Visitantes com `#vista`=`MAC`, aparece o visitante;
  - **Ocultar registro** num colaborador o tira do "no local";
  - não existe `#vis-registrar`, `#frota-registrar` nem `#col-acao`.
- [ ] **Step 2:** `npm run e2e -- controle`. Esperado: FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npm run e2e -- controle`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: centro de controle e telas somente leitura`.

### Task 5: Aba Vistorias

**Files:**
- Modify: `painel/js/tela-checklists.js`, `painel/js/ficha03.js`, `painel/js/ficha04.js`, `painel/js/tela-frota.js` (forçar)
- Modify: `tests/e2e/checklist03.cjs`, `tests/e2e/checklist04.cjs`, `tests/e2e/pdf.cjs`, `tests/e2e/fotos-outra-portaria.cjs` (vira `fotos-vistoria.cjs`), `tests/e2e/fotos.cjs`

**Interfaces:**
- Consumes: `estado.vistorias` e `checklists`, `P.podeVistoriar`, `abrirChecklist03(pid)`, `abrirChecklist04(pid)`.

**Aba Vistorias:**
- **Topo, Fila do 03:** chegadas DIS sem checklist 03, da mais antiga à mais nova, com o tempo de espera e o botão **Fazer checklist 03**.
- **Depois, Fila do 17 pontos:** como a fila do GR v1, com os botões **Fazer vistoria** e **Dispensar**.
- **Por fim, o Histórico**, como na v1.
- **Botões:** só aparecem com `podeVistoriar`.

**Mudanças nas fichas e na frota:**
- `ficha03` mostra as fotos do CTRC (anexos) no resumo do veículo, com um link "Ver no Lists".
- `ficha04` passa a checar `podeVistoriar` no lugar de `temPapel('gr')`.
- **Forçar 17 pontos** na aba Frota: grava `vistoria17_forcada` e **não** grava em `alertas/`.

- [ ] **Step 1:** Adapte os testes:
  - os cenários passam a usar `util.espelho`/`util.alerta` no lugar de formulários;
  - **checklist03:** a fila mostra 2 chegadas; faz o 03 de uma e a fila cai para 1; números `DIS-03-000001` e `DIS-03-000002`;
  - **checklist04:** um alerta com `id` 10 e ordem 5 cria a pendência. Uma pessoa sem `gr`/`coordenador` (só `admin`) não vê os botões; o coordenador vê e conclui (`DIS-04-000001`). Forçar outra chegada e dispensar com justificativa → `dispensada`;
  - **pdf:** como na v1, com `DIS-…`;
  - **fotos-vistoria:** as fotos vêm de `fotos-entrada/Distrito/`.
- [ ] **Step 2:** `npm run e2e`. Esperado: FAIL nos testes adaptados.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npm test && npm run e2e`. Esperado: tudo PASS.
- [ ] **Step 5:** Commit `feat: aba Vistorias com filas do 03 e do 17 pontos`.

### Task 6: Fluxos do Power Automate, instalação e documentação

**Files:**
- Create: `entrega/power-automate-fluxos.md`
- Delete: `entrega/power-automate-alerta-gr.md`
- Modify: `painel/LEIA-ME.md`, `docs/HANDOFF.md`, `GLOSSARY.md`, `CLAUDE.md`, `scripts/empacotar.sh`

**`power-automate-fluxos.md`:**
1. **Fluxo 1, completo** (Frota DIS, espelho):
   - gatilho SharePoint "Quando um item é criado ou modificado";
   - "Compor" com o JSON do espelho, usando o modelo com cada chave e o conteúdo dinâmico a escolher;
   - "Criar arquivo" em `listas/Distrito/frota/` com o nome `@{triggerOutputs()?['body/ID']}.json`, em modo de substituir. Se a ação recusar arquivo existente, usar "Atualizar arquivo" no ramo de falha;
   - anexos: "Obter anexos", depois, para cada anexo, "Obter conteúdo do anexo" e "Criar arquivo" em `fotos/Distrito/ctrc/<ID>_<nome>`. Os caminhos entram em `anexos`.
2. **Fluxo 2, completo** (contagem):
   - gatilho "Quando um item é criado";
   - **simultaneidade 1**;
   - condição `Situacao` Chegada ou Entrada e `Criado` ≥ data de ativação;
   - "Obter itens" com o filtro OData `Created ge '<data>' and (Situacao eq 'Chegada' or Situacao eq 'Entrada')`, paginação ligada até 5000;
   - `length(...)`; se `mod(n,5) == 0`: "Criar arquivo" `alertas/DIS_<ID>.json` com `{ id, ordem: n, placaCavalo, reboques, motorista, chegada, mensagem }`, e Teams "Postar mensagem" com `mensagem`.
3. **Fluxos 3 a 6:** cópias do 1, sem anexos, com a lista e a pasta de cada um.
4. **Teste de instalação:**
   - criar um item de teste em cada lista e ver o arquivo aparecer;
   - exportar as listas da Machado e conferir as colunas;
   - adicionar o coproprietário.
- **Nomes internos:** cada coluna com acento ou barra tem um nome interno diferente (ex.: `Situa_x00e7__x00e3_o`). O guia manda escolher sempre pelo **conteúdo dinâmico**, nunca digitar o nome.

**Demais documentos:**
- **LEIA-ME:** a instalação passa a ser para o GR e o coordenador, sem fotos de crachá e sem cadastros.
- **HANDOFF, GLOSSARY e CLAUDE.md:** v2 (espelho, alerta, coordenador, centro de controle; Porteiro e Cadastro saem).
- **`empacotar.sh`:** sem os CSVs e com o novo guia.

- [ ] **Step 1:** Escreva os documentos e ajuste o script.
- [ ] **Step 2:** `npm test && npm run e2e && bash scripts/empacotar.sh && unzip -l portaria-toliman.zip`. Esperado: tudo PASS, e o zip lista `entrega/power-automate-fluxos.md` e nenhum `modelo-cadastro`.
- [ ] **Step 3:** Commit `docs: fluxos do Power Automate e instalação v2`.
