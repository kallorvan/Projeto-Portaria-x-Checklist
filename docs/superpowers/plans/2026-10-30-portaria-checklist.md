# Painel Portaria x Checklist — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Painel HTML sem servidor para as 3 portarias da Tóliman. Registra permanências de visitantes/prestadores, frota e colaboradores, preenche os checklists REG LOG 03 e REG LOG 04 (regra do 5º veículo com alerta ao GR no Teams) e mantém cadastros de veículos e funcionários.

**Architecture:**
- Modelo do projeto `kallorvan/raster`: um `painel.html` aberto por `file://` no Edge/Chrome, a partir de uma pasta do SharePoint sincronizada pelo OneDrive.
- Leitura e gravação pela File System Access API (OPFS no modo demonstração).
- Cada alteração é um JSON imutável em `eventos/`, e o estado é sempre recalculado por funções puras em `painel/lib/*.js`, testáveis no Node.

**Tech Stack:**
- HTML/CSS/JS sem build. Scripts clássicos, sem módulos ES, porque `file://` não os permite.
- Node 22 `node:test`.
- jsPDF 2.5.1 (UMD, vendorizado em `painel/lib/`).
- Playwright pré-instalado (`/opt/node22/lib/node_modules/playwright`, `executablePath: '/opt/pw-browsers/chromium'`).

**Spec:** `docs/superpowers/specs/2026-10-30-portaria-checklist-design.md`. Leia também `GLOSSARY.md` e `docs/adr/`. Referência de código: `/home/user/kallorvan/raster` (clone de leitura de `https://github.com/kallorvan/raster`): `painel/painel.html` e `painel/lib/checklist.js`.

## Global Constraints

- Interface, nomes de eventos, campos e mensagens em **português**, com os termos do `GLOSSARY.md` (Permanência, Chegada da frota, Vistoria pendente, Forçar/Dispensar, Fora do cadastro, Pessoa, Funcionário…).
- Cada `painel/lib/*.js` usa o padrão do Raster: IIFE `(function (root) { … })(typeof window !== 'undefined' ? window : globalThis)`, `module.exports = api` no Node e `root.<Nome> = api` no navegador.
- Funciona aberto por `file://`: sem `fetch` de arquivos locais, sem módulos ES, sem Web Worker e sem internet (todas as libs ficam em `painel/lib/`).
- Portarias:
  - `MAC` = "Tóliman Machado", pasta `Machado`;
  - `JP` = "Tóliman João Pessoa", pasta `JoaoPessoa`;
  - `DIS` = "Tóliman Distrito", pasta `Distrito`.
- **Nº do checklist:** `<PORTARIA>-<03|04>-<seq de 6 dígitos>`, sequencial por portaria e ficha.
- **Regra do 5º veículo:** a cada 5 chegadas da frota da portaria (5ª, 10ª…), ordenadas por `em` e depois por `id`. Forçar não altera a contagem, e dispensar não a reinicia.
- **Itens 12 a 17 do REG LOG 04** ficam travados em `NA` quando `tipoCarga === 'container_com_carga'`, ou quando `tipoCarga === 'container_vazio'` com `lacres.containerVazio` preenchido.
- **CNH:** vencida, ou vencendo em até **30 dias**, gera aviso, nunca bloqueio.
- **Fotos:** redução para no máximo **1600 px** no maior lado, JPEG com qualidade 0,85. Fotos há mais de **7 dias** em `fotos-entrada/` geram aviso ao Administrador. O painel nunca apaga fotos não vinculadas.
- **Ciclos:** releitura da pasta a cada **20 s** e ao focar a janela. Presença a cada **60 s**, e "no painel agora" mostra quem deu sinal nos últimos **3 min**.
- **Visual "Tóliman Painéis"**, copiado do `painel.html` do Raster:
  - variáveis `--ink #1C2543`, `--ink2 #363E58`, `--ink3 #5C6486`, `--coral #DD4663`, `--mauve #AE82B1`, `--sand #F4D38D`, `--rose #E88A9C`;
  - fontes Archivo (UI) e IBM Plex Mono (números e placas);
  - componentes `.tab`, `.kpi`, `.hero`, `.btn`, `.chip`, `table`, `dialog`.
- Eventos nunca são reescritos nem apagados. Correção é sempre um evento novo.
- Testes: `npm test` = `node --test tests/*.test.cjs`. E2E: `npm run e2e`.

## Formato do evento (todas as tasks)

```js
{ id: '<16 hex>', em: '<ISO>', pessoa: 'Nome', pc: '<id do PC>', portaria: 'MAC'|'JP'|'DIS'|null, tipo: '<tipo>', dados: { … } }
```

**Arquivo:** `eventos/<pasta da portaria | geral>/<em com : e . trocados por ->_<slug pessoa>_<id>.json`.

**Tipos de evento e `dados`:**

| tipo | dados |
|---|---|
| `admin_definido` | `{ salt, hash }` |
| `pessoa_adicionada` / `papeis_definidos` | `{ nome, papeis: ['porteiro'\|'gr'\|'admin'] }` |
| `pessoa_removida` | `{ nome }` |
| `veiculo_salvo` | `{ placa, tipo: 'cavalo'\|'reboque'\|'leve', modelo, vinculo: 'proprio'\|'terceiro', ativo }` |
| `funcionario_salvo` | `{ id, nome, matricula, setor, motorista, cnhNumero, cnhValidade: 'AAAA-MM-DD'\|null, ativo }` |
| `entrada_registrada` | `{ permanenciaId, categoria: 'visitante'\|'prestador'\|'frota'\|'colaborador', campos }` (abaixo) |
| `saida_registrada` | `{ permanenciaId, campos }`. Com `avulsa: true`, leva também `categoria` e não exige entrada |
| `registro_corrigido` | `{ permanenciaId, campos, motivo }` (mescla nos campos da entrada) |
| `vistoria17_forcada` | `{ permanenciaId, justificativa }` |
| `vistoria17_dispensada` | `{ permanenciaId, justificativa }` |
| `checklist_salvo` | `{ numero, ficha: '03'\|'04', permanenciaId, versao, dados, motivo?, pdf }` (versão 1 = conclusão, >1 = correção) |
| `foto_vinculada` | `{ origem, destino, alvo: { numero\|permanenciaId, ponto } }` |

**`campos` da entrada por categoria:**
- visitante/prestador: `{ nome, documento, placa, setor, cracha, fotos: [destino], observacao }`;
- frota: `{ placaCavalo, reboques: [p1,p2,p3] (sem vazios), motoristaId|null, motoristaNome, km, ctrc1, ctrc2, observacao }`;
- colaborador: `{ funcionarioId|null, nome, veiculo: 'nenhum'|'proprio'|'empresa', placa, km, observacao }`.

**`campos` da saída:**
- visitante/prestador: `{ crachaDevolvido: bool }`;
- frota e colaborador da empresa: `{ km }`.

## Review Focus

1. **Placa em formatos diferentes** (`abc-1d23`, `ABC 1D23`, minúsculas): deve ser tratada como a mesma placa em cadastro, permanência, fora do cadastro e contagem. Teste na Task 2 (`normalizarPlaca`) e na Task 3 (fora do cadastro com hífen).
2. **Evento duplicado ou lido em dobro** (o OneDrive cria `nome-PC.json` em conflito; releitura): o estado deduplica por `id`. Teste na Task 3.
3. **Arquivo JSON parcial ou corrompido** durante a sincronização: é ignorado sem quebrar o painel e lido na próxima releitura. Teste na Task 3 (`montarEstado` ignora evento sem `id`/`tipo`/`em`) e na Task 6 (loader com `try/catch` por arquivo).
4. **Dois PCs registram saída da mesma permanência:** vale a primeira saída por `em`, a segunda fica só no histórico, e a permanência não "reabre". Teste na Task 3.
5. **Chegadas lidas fora de ordem** (o evento de uma chegada anterior sincroniza depois): a contagem usa `em`, não a ordem de leitura, e a vistoria derivada pode mudar de veículo. O alerta já gravado não é refeito: o painel só grava alerta para a chegada que ele mesmo registrou. Teste na Task 4 (eventos embaralhados dão o mesmo resultado).

---

### Task 1: Esqueleto do projeto e definições das fichas

**Files:**
- Create: `package.json`, `.gitignore`, `painel/lib/fichas.js`
- Test: `tests/fichas.test.cjs`

**Interfaces:**
- Produces `Fichas`:
  - `PORTARIAS`: `[{ id:'MAC', nome:'Tóliman Machado', pasta:'Machado' }, { id:'JP', nome:'Tóliman João Pessoa', pasta:'JoaoPessoa' }, { id:'DIS', nome:'Tóliman Distrito', pasta:'Distrito' }]`
  - `CODIGOS_AVARIA`: `[{id:'A',nome:'Amassado'},{id:'R',nome:'Riscado'},{id:'F',nome:'Faltando'},{id:'Q',nome:'Quebrado'},{id:'C',nome:'Cortado'},{id:'M',nome:'Marcado guia'}]`
  - `regioesDoVeiculo(reboques: string[]) -> [{ id, nome }]`
    - cavalo: `cavalo_motorista` "Cavalo – lado motorista", `cavalo_frente` "Cavalo – frente", `cavalo_carona` "Cavalo – lado carona";
    - para cada reboque `n` (1..3): `reboque<n>_motorista`, `reboque<n>_carona`, `reboque<n>_traseira`, com o nome "Reboque n (PLACA) – lado motorista" etc.
  - `ITENS_MOTORISTA_03`: ids e rótulos exatos:
    - `aet_sp` "AET São Paulo", `aet_mg` "AET Minas Gerais", `aet_denit` "AET DENIT", `cnh` "CNH", `crlv` "CRLV";
    - `luzes` "Verificar luzes geral", `oleo` "Verificar óleo motor", `agua` "Verificar água";
    - `crlv_reboque1` "CRLV placa reboque 1", `crlv_reboque2` "CRLV placa reboque 2";
    - `locks` "Verificar locks", `eixos` "Verificar eixos suspensão", `pneus` "Bater pneus".
  - `LIMPEZA_03`: `limpo` "Limpo e organizado", `lixo` "Contém lixo espalhado", `odor` "Contém mau odor (cigarro/comida)"
  - `CONDICAO_CABINE`: `['otimo','regular','ruim']`
  - `ITENS_17`: os 17 nomes, na ordem da spec §7.2, como `[{ n:1, nome:'Para-choque' }, …, { n:17, nome:'Piso do compartimento de carga' }]`
  - `TIPOS_CARGA`: `container_vazio` "Veículo carregado com container vazio", `container_com_carga` "Veículo carregado com container com carga", `vazio` "Veículo vazio (sem container)"
  - `LACRES_04`: `armador1`, `armador2`, `exportador1`, `exportador2`, `alfandegario`, `provisorioToliman`, `containerVazio`
  - `CABECALHO_FICHAS`:
    - `{ '03': { titulo:'Ficha para Inspeção Veicular Operacional', reg:'LOG 03', revisao:'05', data:'20/05/2026' },`
    - `'04': { titulo:'Ficha para Inspeção de Segurança de Veículos 17 Pontos', reg:'LOG 03', revisao:'05', data:'20/05/2026' } }`
    - O REG LOG 04 impresso traz "LOG 03" no cabeçalho. Copie como está e registre em HANDOFF como divergência a confirmar.

- [ ] **Step 1:** Crie `package.json` com `"private": true` e os scripts `"test": "node --test tests/*.test.cjs"` e `"e2e": "node tests/e2e/rodar.cjs"`. Crie `.gitignore` com `*.zip` e `node_modules/`.
- [ ] **Step 2: Teste que falha** (`tests/fichas.test.cjs`):
  - `regioesDoVeiculo([])` tem 3 regiões;
  - `regioesDoVeiculo(['AAA1A11','BBB2B22'])` tem 9 regiões, e a última é `reboque2_traseira`, com nome contendo `BBB2B22`;
  - `ITENS_17.length === 17`, `ITENS_17[11].nome === 'Portas'`;
  - `PORTARIAS.map(p=>p.id)` deep-equals `['MAC','JP','DIS']`.
- [ ] **Step 3:** `npm test`. Esperado: FAIL (módulo inexistente).
- [ ] **Step 4:** Implemente `painel/lib/fichas.js`, exportando como `root.Fichas`.
- [ ] **Step 5:** `npm test`. Esperado: PASS.
- [ ] **Step 6:** Commit `feat: definições das fichas REG LOG 03 e 04`.

### Task 2: Regras puras

**Files:**
- Create: `painel/lib/regras.js`
- Test: `tests/regras.test.cjs`

**Interfaces:**
- Consumes: `Fichas` (no Node, `require('./fichas.js')`; no navegador, `root.Fichas`).
- Produces `Regras`:
  - `normalizarPlaca(p: string) -> string` (maiúsculas, só `A-Z0-9`)
  - `numeroChecklist(portaria: string, ficha: '03'|'04', seq: number) -> string`, por exemplo `('MAC','03',127)` → `'MAC-03-000127'`
  - `proximaSequencia(numerosExistentes: string[], portaria, ficha) -> number`: maior seq com o mesmo prefixo + 1, ou 1
  - `indicesVistoria(n: number) -> boolean`: `n % 5 === 0` (n começa em 1)
  - `faltamParaVistoria(chegadasAteAgora: number) -> number`: `5 - (chegadasAteAgora % 5)`, que vale 5 logo após uma vistoria
  - `itensTravados({ tipoCarga, lacres }) -> number[]`: `[12..17]` ou `[]` (Global Constraints)
  - `validarChecklist04(dados) -> string[]` (mensagens de erro em português). `dados.itens` é um objeto `{ [n]: { resposta:'C'|'NC'|'NA', obs, fotos } }`. Erros:
    - item sem resposta;
    - `NC` sem `obs`;
    - item travado diferente de `NA`;
    - `tipoCarga` ausente.
  - `validarChecklist03(dados, regioes) -> string[]`: cada região precisa de `semAvarias: true` ou ao menos um código. Mensagem: `"Região <nome>: marque 'Sem avarias' ou um código"`.
  - `temNaoConforme(dados04) -> boolean`
  - `avisoCnh(cnhValidade: 'AAAA-MM-DD'|null, hoje: Date) -> null|'vencida'|'vence_em_breve'`. `vence_em_breve` quando faltam ≤ 30 dias, e o dia da validade ainda conta como válido.

- [ ] **Step 1: Testes que falham:**
  - `normalizarPlaca(' abc-1d23 ') === 'ABC1D23'`;
  - `numeroChecklist('JP','04',12) === 'JP-04-000012'`;
  - `proximaSequencia(['MAC-03-000009','MAC-03-000010','JP-03-000050','MAC-04-000099'],'MAC','03') === 11`;
  - `proximaSequencia([],'DIS','04') === 1`;
  - `faltamParaVistoria(0) === 5`, `faltamParaVistoria(3) === 2`, `faltamParaVistoria(5) === 5`;
  - `itensTravados({tipoCarga:'container_com_carga', lacres:{}})` deep-equals `[12,13,14,15,16,17]`;
  - `itensTravados({tipoCarga:'container_vazio', lacres:{containerVazio:'L123'}})` tem 6 itens;
  - `itensTravados({tipoCarga:'container_vazio', lacres:{containerVazio:' '}})` deep-equals `[]`;
  - `itensTravados({tipoCarga:'vazio', lacres:{}})` deep-equals `[]`;
  - `validarChecklist04` com os 17 itens `C` e `tipoCarga:'vazio'` → `[]`;
  - com o item 3 `NC` sem obs → 1 erro contendo `"3"`;
  - com `container_com_carga` e o item 12 `C` → erro;
  - `avisoCnh('2026-10-29', new Date('2026-10-30T12:00')) === 'vencida'`;
  - `avisoCnh('2026-10-30', …) === 'vence_em_breve'`;
  - `avisoCnh('2026-12-31', …) === null`;
  - `avisoCnh(null, …) === null`.
- [ ] **Step 2:** `npm test`. Esperado: FAIL.
- [ ] **Step 3:** Implemente `painel/lib/regras.js` (`root.Regras`).
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: regras de checklist, numeração e CNH`.

### Task 3: `montarEstado`: pessoas, cadastros e permanências

**Files:**
- Create: `painel/lib/estado.js`
- Test: `tests/estado.test.cjs`

**Interfaces:**
- Consumes: `Regras.normalizarPlaca`.
- Produces `Estado.montarEstado(eventos: Evento[], agora: Date) -> estado`:

```js
{
  admin: { salt, hash } | null,                 // último admin_definido
  pessoas: [{ nome, papeis: string[] }],        // ordenadas por nome, sem as removidas
  veiculos: Map<placaNormalizada, { placa, tipo, modelo, vinculo, ativo }>,   // último veiculo_salvo
  funcionarios: Map<id, { id, nome, matricula, setor, motorista, cnhNumero, cnhValidade, ativo }>,
  permanencias: [{ id, portaria, categoria, entrada: { em, pessoa, campos } | null,
                   saida: { em, pessoa, campos } | null, avulsa: bool,
                   foraDoCadastro: string[],   // ex.: ['placa:ABC1D23', 'motorista', 'funcionario']
                   historico: Evento[] }],
  noLocal(portaria) -> permanência[]           // entrada sem saída
  checklists, vistorias, contadores            // preenchidos na Task 4
}
```

**Regras de `montarEstado`:**
- Deduplica por `id`.
- Ignora eventos sem `id`, `tipo` ou `em`.
- Ordena por `em` e depois por `id`.
- A **primeira** `saida_registrada` de uma permanência vale. As seguintes vão só para o `historico`.
- `registro_corrigido` mescla `campos` na entrada e entra no `historico`.
- **Fora do cadastro** (só se houver ao menos 1 veículo/funcionário cadastrado, para não poluir o início):
  - frota: `placa:<cavalo>` e `placa:<reboque>` quando a placa normalizada não está em `veiculos`; `motorista` quando `motoristaId` é nulo;
  - colaborador: `funcionario` quando `funcionarioId` é nulo; `placa:<placa>` quando `veiculo === 'empresa'` e a placa não está em `veiculos`.

- [ ] **Step 1: Testes que falham:**
  - dois eventos com o mesmo `id` resultam em 1 permanência;
  - evento `{tipo:'entrada_registrada'}` sem `id` é ignorado sem lançar exceção;
  - entrada de visitante + saída → `noLocal('MAC')` vazio, e `saida.campos.crachaDevolvido === true`;
  - duas saídas (`em` 10:00 e 10:05) → `saida.em` é o das 10:00 e `historico.length === 3`;
  - saída avulsa → permanência com `entrada === null` e `avulsa === true`;
  - `registro_corrigido` troca `campos.nome`;
  - com o veículo `ABC1D23` cadastrado, a chegada da frota com `placaCavalo:'abc-1d23'` e o reboque `ZZZ9Z99` dá `foraDoCadastro` deep-equal `['placa:ZZZ9Z99','motorista']`;
  - `pessoa_adicionada` + `papeis_definidos` + `pessoa_removida` refletem em `pessoas`;
  - `funcionario_salvo` repetido com o mesmo `id` → vale o último.
- [ ] **Step 2:** `npm test`. Esperado: FAIL.
- [ ] **Step 3:** Implemente `painel/lib/estado.js` (`root.Estado`). Deixe `checklists: []`, `vistorias: []` e `contadores: {}` para a Task 4.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: estado de pessoas, cadastros e permanências`.

### Task 4: Vistorias 17 pontos e checklists no estado

**Files:**
- Modify: `painel/lib/estado.js`
- Create: `painel/lib/alerta.js`
- Test: `tests/vistoria.test.cjs`

**Interfaces:**
- Consumes: Task 3 e `Regras.indicesVistoria`, `faltamParaVistoria` e `temNaoConforme`.
- Produces, em `estado`:
  - `checklists: [{ numero, ficha, portaria, permanenciaId, versao, dados, pdf, em, pessoa, naoConforme: bool, versoes: Evento[] }]`: a última versão por `numero`, mais recentes primeiro.
  - `vistorias: [{ permanenciaId, portaria, origem: 'automatica'|'forcada', ordem: number|null, situacao: 'pendente'|'concluida'|'dispensada', justificativa, checklistNumero, desde: em da chegada }]`
  - `contadores: { [portaria]: { chegadas: number, faltam: number } }`
- Produces `Alerta.montarAlerta(permanencia, vistoria, portariaNome) -> { nome: string, conteudo: object }`:
  - `nome = '<PORTARIA>_<PLACA>_<AAAAMMDD-HHMM>_<permanenciaId>.json'`;
  - `conteudo = { tipo:'vistoria17', portaria, portariaNome, placaCavalo, reboques, motorista, chegada: em, origem, mensagem }`;
  - `mensagem` exata: `"🚨 Vistoria 17 pontos — Portaria <portariaNome sem 'Tóliman '> — Cavalo <PLACA>[ / Reb. <P1>, <P2>] — Motorista <nome> — chegada <DD/MM HH:MM>"`, mais `" (forçada: <justificativa>)"` quando for forçada.

**Regras:**
- **Chegadas da frota** são as permanências `categoria === 'frota'` com entrada, por portaria, ordenadas por `entrada.em` e depois por `id`. A posição `n` com `indicesVistoria(n)` gera `origem:'automatica'`.
- `vistoria17_forcada` gera `origem:'forcada'` com `ordem:null`. Se a chegada já for automática, mantém a automática e ignora o forçar.
- **Situação da vistoria:**
  - `concluida` se existe `checklist_salvo` de ficha `04` com o mesmo `permanenciaId`;
  - senão `dispensada` se existe `vistoria17_dispensada`;
  - senão `pendente`.
  - Valem o primeiro evento de dispensa e o primeiro de conclusão.

- [ ] **Step 1: Testes que falham:**
  - 12 chegadas na MAC e 3 na JP → vistorias automáticas MAC nas ordens 5 e 10; nenhuma na JP; `contadores.MAC` deep-equals `{chegadas:12, faltam:3}`;
  - os mesmos eventos embaralhados dão o mesmo resultado (Review Focus 5);
  - visitante e colaborador não contam;
  - forçar a 2ª chegada → vistoria `forcada`, e as automáticas continuam em 5 e 10;
  - dispensar a 5ª → `situacao:'dispensada'`, com a justificativa;
  - `checklist_salvo` ficha 04 para a 10ª → `concluida`, `checklistNumero` preenchido;
  - `checklist_salvo` com `versao:2` para o mesmo `numero` → `checklists` tem 1 item com `versao:2` e `versoes.length === 2`;
  - checklist 04 com o item 3 `NC` → `naoConforme === true`;
  - `montarAlerta` com reboques `['BBB2B22']`, chegada `2026-10-30T14:32:00` (horário local) e portaria `'Tóliman Machado'` → `mensagem` contém `"Portaria Machado — Cavalo ABC1D23 / Reb. BBB2B22"` e `"chegada 30/10 14:32"`.
- [ ] **Step 2:** `npm test`. Esperado: FAIL.
- [ ] **Step 3:** Implemente em `estado.js` e crie `alerta.js` (`root.Alerta`).
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: regra do 5º veículo, vistorias e alerta`.

### Task 5: CSV: exportação e importação de cadastros

**Files:**
- Create: `painel/lib/csv.js`, `entrega/modelo-cadastro-veiculos.csv`, `entrega/modelo-cadastro-funcionarios.csv`
- Test: `tests/csv.test.cjs`

**Interfaces:**
- Produces `Csv`:
  - `gerarCsv(colunas: [{ titulo, valor: (linha)=>any }], linhas) -> string`: separador `;`, BOM `﻿` no início (Excel pt-BR), aspas quando houver `;`, `"` ou quebra de linha.
  - `lerCsv(texto) -> string[][]`: aceita `;` ou `,` (detecta pela 1ª linha), aspas e BOM.
  - `importarVeiculos(texto) -> { itens: dadosVeiculoSalvo[], erros: string[] }`:
    - colunas `Placa;Tipo;Modelo;Vinculo`, sem diferenciar maiúsculas/acentos;
    - Tipo aceita `Cavalo|Reboque|Leve`; Vinculo aceita `Próprio|Terceiro`;
    - placa normalizada, `ativo:true`;
    - os erros citam a linha, como `"Linha 3: tipo 'Carreta' inválido"`.
  - `importarFuncionarios(texto) -> { itens, erros }`:
    - colunas `Nome;Matricula;Setor;Motorista;CNH;ValidadeCNH`;
    - Motorista aceita `Sim|Não`;
    - ValidadeCNH aceita `DD/MM/AAAA` e é convertida para `AAAA-MM-DD`;
    - `id` = matrícula, se houver, senão `slug(nome)`.
- Os arquivos-modelo trazem o cabeçalho e 2 linhas de exemplo.

- [ ] **Step 1: Testes que falham:**
  - `gerarCsv` com o valor `'a;b'` produz `"a;b"` entre aspas e começa com `﻿`;
  - `lerCsv('Placa,Tipo\nABC1D23,Cavalo')` → 2 linhas;
  - `importarVeiculos` com 1 válida e 1 com tipo `Carreta` → 1 item e erros deep-equal `["Linha 3: tipo 'Carreta' inválido"]`;
  - `importarFuncionarios` com `ValidadeCNH` `05/01/2027` → `cnhValidade:'2027-01-05'` e `motorista:true`.
- [ ] **Step 2:** `npm test`. Esperado: FAIL.
- [ ] **Step 3:** Implemente `csv.js` (`root.Csv`) e os modelos.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: exportação CSV e importação de cadastros`.

### Task 6: Painel: casca, armazenamento, pessoas e portaria

**Files:**
- Create: `painel/painel.html`, `painel/lib/armazenamento.js`, `tests/e2e/rodar.cjs`, `tests/e2e/casca.cjs`

**Interfaces:**
- Consumes: `Fichas`, `Regras`, `Estado`, `Alerta` e `Csv`, carregados por `<script src="lib/…">`.
- Produces `Armazenamento` (só navegador, `root.Armazenamento`). É a única camada que toca arquivos; a fase 2 troca só ela:
  - `iniciar({ demo }) -> Promise<'ok'|'escolher'|'reconectar'|'sem-suporte'>`
  - `escolherPasta()` / `permitir()`
  - `lerEventos() -> Promise<Evento[]>`: percorre `eventos/**`; arquivo que falha no parse é ignorado nesta leitura e cacheado por nome só quando lido com sucesso
  - `gravarEvento(ev)`
  - `gravarArquivo(caminho: string[], nome: string, conteudo: Blob|string)`
  - `listar(caminho: string[]) -> Promise<[{ nome, handle, modificado: Date, tamanho }]>`
  - `lerArquivo(caminho, nome) -> Promise<File>`
  - `remover(caminho, nome)`
  - `urlDe(caminho, nome) -> Promise<string>` (object URL)
  - Modo demo: `navigator.storage.getDirectory()` (OPFS). Modo real: `showDirectoryPicker({ id:'portaria-toliman', mode:'readwrite' })`, com o handle no IndexedDB `portaria-toliman`, store `kv`, chave `pasta`.
- Produces, em `painel.html`:
  - `window.__painel = { st, gravar(tipo, portaria, dados), recarregar(), Armazenamento }`
  - `st = { estado, pessoa, portaria, pc, demo }`
  - `gravar` monta o evento (formato acima), grava, relê e renderiza.

**Telas desta task:**
- **Portão:** escolher ou reconectar a pasta, com os textos do Raster adaptados para "pasta da Portaria".
- **Primeiro acesso:**
  - criar a senha do administrador, quando não houver `admin_definido`; quem cria vira a primeira pessoa com papel `admin`;
  - escolher a **portaria do PC** (localStorage `portaria.portaria`) e a **pessoa** (localStorage `portaria.pessoa`); `pc` é um id aleatório em `portaria.pc`.
- **Topo:** nome da portaria, pessoa (com trocar) e "No painel agora" (presença em `presenca/`).
  - Quem tem papel `gr` vê um seletor de portaria no topo, que muda só a visão, não o `localStorage`.
- **Abas** (só os cabeçalhos e o roteamento por enquanto): Início, Visitantes e Prestadores, Frota, Colaboradores, Checklists, Cadastros (admin), Pessoas (admin).
  - Abas de admin só aparecem depois de desbloquear com a senha, que vale só para a aba aberta, como no Raster.
- **Aba Pessoas:** adicionar ou remover pessoa e marcar os papéis Porteiro/GR/Administrador.
- **Ciclos:** releitura a cada 20 s e no `focus`, presença a cada 60 s.

- [ ] **Step 1:** Escreva `tests/e2e/rodar.cjs`. Ele:
  - sobe `npx http-server painel -p 8765 -s` (ou `python3 -m http.server`);
  - roda cada `tests/e2e/*.cjs` exceto ele mesmo, com Playwright `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`;
  - encerra o servidor;
  - termina com código ≠ 0 se algum falhar.
- [ ] **Step 2:** Escreva `tests/e2e/casca.cjs`. Abre `painel.html?demo=1`, cria a senha `1234`, escolhe a portaria Machado e a pessoa criada, adiciona a pessoa "Ana" com o papel GR e verifica:
  - `window.__painel.st.estado.pessoas` contém Ana com `['gr']`;
  - o topo mostra "Tóliman Machado".
- [ ] **Step 3:** `npm run e2e`. Esperado: FAIL.
- [ ] **Step 4:** Implemente `armazenamento.js` e `painel.html`, partindo do CSS e dos padrões do `painel.html` do Raster (`idb*`, `iniciar`, `portao`, `presenca`, `hashSenha`).
- [ ] **Step 5:** `npm run e2e` e `npm test`. Esperado: PASS.
- [ ] **Step 6:** Commit `feat: casca do painel, armazenamento, pessoas e portaria`.

### Task 7: Aba Cadastros

**Files:**
- Modify: `painel/painel.html`
- Create: `tests/e2e/cadastros.cjs`

**Interfaces:**
- Consumes: `gravar`, `Csv.importarVeiculos`/`importarFuncionarios`, `estado.veiculos`/`funcionarios`/`permanencias[].foraDoCadastro` e `Regras.avisoCnh`.

**Telas:**
- **Veículos e Funcionários:**
  - tabela com busca e filtro ativo/inativo;
  - diálogo de incluir/editar, que grava `veiculo_salvo`/`funcionario_salvo`;
  - ação Desativar/Reativar, que grava o mesmo evento com `ativo` invertido;
  - a coluna CNH mostra um chip "vencida"/"vence em breve".
- **Importar planilha:**
  - escolhe o arquivo, mostra a prévia (itens + erros) e confirma;
  - grava um evento por item.
- **Fora do cadastro:** lista as permanências com `foraDoCadastro` não vazio e o botão "Cadastrar", que abre o diálogo já preenchido.

- [ ] **Step 1:** Escreva `tests/e2e/cadastros.cjs`:
  - importa `entrega/modelo-cadastro-veiculos.csv` via `setInputFiles` e confirma → `estado.veiculos.size === 2`;
  - inclui o funcionário motorista com CNH vencida → a tabela mostra "vencida".
- [ ] **Step 2:** `npm run e2e`. Esperado: FAIL.
- [ ] **Step 3:** Implemente a aba.
- [ ] **Step 4:** `npm run e2e`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: cadastros de veículos e funcionários`.

### Task 8: Fotos pelo celular

**Files:**
- Create: `painel/lib/fotos.js`
- Modify: `painel/painel.html`
- Test: `tests/fotos.test.cjs`, `tests/e2e/fotos.cjs`

**Interfaces:**
- Produces `Fotos`:
  - `nomeDestino({ alvo, ponto, n, em }) -> string`: `'<alvo>_<ponto>_<n>.jpg'`, sem caracteres inválidos. Exemplo: `('MAC-03-000127','cavalo_frente',2)` → `'MAC-03-000127_cavalo_frente_2.jpg'`. Pura e testável no Node.
  - `pastaDestino(portariaPasta, em: Date) -> string[]`: `['fotos', portariaPasta, 'AAAA-MM']`. Pura.
  - `esquecidas(lista: [{ nome, modificado }], agora, dias = 7) -> lista`. Pura.
  - `reduzir(file: File, max = 1600, qualidade = 0.85) -> Promise<Blob>` (canvas, só navegador)
- Produces, em `painel.html`: `escolherFotos({ alvo, ponto }) -> Promise<string[]>`, que devolve os caminhos de destino gravados. Ele:
  - abre um diálogo com as miniaturas de `fotos-entrada/<pasta da portaria>/` (`.jpg/.jpeg/.png/.heic`; HEIC sem miniatura mostra "formato não suportado, ajuste o celular para JPG"), mais recentes primeiro;
  - para cada foto marcada: `reduzir` → `gravarArquivo(pastaDestino, nomeDestino)` → `remover` a original → `gravar('foto_vinculada', …)`.
- A aba Início do Administrador mostra o aviso "N fotos há mais de 7 dias sem vínculo" (`esquecidas`).

- [ ] **Step 1: Testes que falham** (`tests/fotos.test.cjs`):
  - `nomeDestino`, com o exemplo acima;
  - `pastaDestino('Machado', new Date('2026-10-30T10:00'))` deep-equals `['fotos','Machado','2026-10']`;
  - `esquecidas` com fotos de 8 e 2 dias → 1.
- [ ] **Step 2:** `npm test`. Esperado: FAIL.
- [ ] **Step 3:** Implemente `fotos.js` (`root.Fotos`) e `escolherFotos`.
- [ ] **Step 4:** `tests/e2e/fotos.cjs`: grava um JPG 3000×2000 em OPFS `fotos-entrada/Machado/` (canvas → blob), chama `escolherFotos`, marca a foto e confirma. Verifica:
  - o arquivo em `fotos/Machado/<AAAA-MM>/` tem o maior lado ≤ 1600;
  - a original saiu da pasta de entrada.
- [ ] **Step 5:** `npm test` e `npm run e2e`. Esperado: PASS.
- [ ] **Step 6:** Commit `feat: vínculo de fotos enviadas pelo celular`.

### Task 9: Abas de permanência e Início

**Files:**
- Modify: `painel/painel.html`
- Create: `tests/e2e/permanencias.cjs`

**Interfaces:**
- Consumes: `estado.noLocal`, `permanencias`, `contadores`, `vistorias`, `veiculos`, `funcionarios`; `escolherFotos`; `Alerta.montarAlerta`; `Csv.gerarCsv`; `Regras.avisoCnh`.
- Produces `abrirChecklist03(permanenciaId)` (stub nesta task, que a Task 10 implementa). Depois de gravar uma chegada da frota, chama `abrirChecklist03`.

**Por aba (Visitantes e Prestadores, Frota, Colaboradores):**
- **Nova entrada:** formulário com os `campos` da tabela de formato.
  - Placas com `datalist` do cadastro.
  - Motorista e funcionário com busca no cadastro; texto livre é aceito e vira fora do cadastro.
  - Visitante: botão "Foto do crachá" → `escolherFotos({ alvo: permanenciaId, ponto: 'cracha' })`.
  - Colaborador: Placa e KM aparecem e são obrigatórios só com `veiculo === 'empresa'`, e a placa vem dos veículos de tipo `leve`.
- **No local agora:** tabela com entrada, tempo de permanência e o botão **Registrar saída**.
  - Visitante: pergunta "Crachá devolvido?". Frota e colaborador da empresa: KM.
- **Saída avulsa** e **Histórico** com filtro por período e busca, mais **Exportar CSV** do período.
- **Detalhe do registro:** campos, histórico e "Corrigir", que pede o motivo e grava `registro_corrigido`.

**Frota, na tela de nova chegada:**
- "Faltam N veículos para a próxima vistoria de 17 pontos" (`contadores[portaria]`).
- Se a próxima chegada for a 5ª: destaque `.hero` **"Este veículo vai para vistoria GR"**.
- Aviso de CNH (`avisoCnh`) do motorista escolhido.
- Checkbox **Forçar 17 pontos** + justificativa obrigatória.
- **Ao gravar:**
  1. grava `entrada_registrada`;
  2. se marcado, grava `vistoria17_forcada`;
  3. relê o estado;
  4. se a nova permanência tem vistoria, grava `alertas/<montarAlerta.nome>`;
  5. chama `abrirChecklist03`.

**Início:**
- KPIs: no local agora por categoria, entradas de hoje, crachás não devolvidos (saída com `crachaDevolvido:false` ou visitante no local há mais de 12 h), vistorias pendentes;
- contador para o próximo 17 pontos;
- fotos aguardando vínculo (contagem de `fotos-entrada/<portaria>`);
- quem está no painel agora.

- [ ] **Step 1:** Escreva `tests/e2e/permanencias.cjs`:
  - registra um visitante e dá saída com o crachá devolvido → `noLocal('MAC').length === 0`;
  - registra 5 chegadas da frota (fechando o diálogo do checklist 03 que abre, que ainda é stub). Na 5ª, antes de gravar, o destaque "Este veículo vai para vistoria GR" está visível. Depois existe 1 arquivo em `alertas/` cujo JSON tem `mensagem` contendo `"Vistoria 17 pontos"`;
  - colaborador com `veiculo:'empresa'` sem placa → mensagem de campo obrigatório e nada gravado;
  - Exportar CSV de Visitantes → o download começa com `﻿` e contém o nome.
- [ ] **Step 2:** `npm run e2e`. Esperado: FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npm run e2e` e `npm test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: registros de permanência, contador do 17 pontos e início`.

### Task 10: Formulário REG LOG 03

**Files:**
- Modify: `painel/painel.html`
- Create: `tests/e2e/checklist03.cjs`

**Interfaces:**
- Consumes: `Fichas` (regiões, códigos, itens do motorista, limpeza, cabine), `Regras.validarChecklist03`/`proximaSequencia`/`numeroChecklist`, `escolherFotos` e `gerarPdfChecklist` (Task 12; até lá, `pdf: null`).
- Produces `abrirChecklist03(permanenciaId, { corrigir: numero }?)`. Ao concluir, grava `checklist_salvo` com `ficha:'03'`, `versao:1` e:
  - `dados = { limpeza:{limpo,lixo,odor}, regioes:{ [id]: { semAvarias, codigos:[], descricao, fotos:[] } }, motorista:{ [id]: bool }, cabine, estepes, carretaDianteira, carretaTraseira, container, lacre, nomes:{ motorista, porteiro, lider } }`
  - o vistoriador é `ev.pessoa`;
  - `nomes.motorista` vem preenchido da chegada.
- **Rascunho:** fechar o diálogo sem concluir guarda o rascunho em `localStorage['portaria.rascunho.<permanenciaId>']`, e a chegada mostra "Checklist 03 pendente" na lista "No local agora" e no histórico, com o botão para retomar.

- [ ] **Step 1:** Escreva `tests/e2e/checklist03.cjs`:
  - chegada com 1 reboque → o diálogo mostra 6 regiões;
  - concluir sem marcar nada → erro listando a região;
  - marcar "Sem avarias" em todas e o código A + descrição na `cavalo_frente`, e concluir → `estado.checklists[0].numero === 'MAC-03-000001'`, `dados.regioes.cavalo_frente.codigos` deep-equals `['A']`;
  - uma segunda conclusão gera `MAC-03-000002`.
- [ ] **Step 2:** `npm run e2e`. Esperado: FAIL.
- [ ] **Step 3:** Implemente o diálogo seguindo os blocos da spec §6, na ordem.
- [ ] **Step 4:** `npm run e2e`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: checklist operacional REG LOG 03`.

### Task 11: REG LOG 04, fila do GR e aba Checklists

**Files:**
- Modify: `painel/painel.html`
- Create: `tests/e2e/checklist04.cjs`

**Interfaces:**
- Consumes: `estado.vistorias`/`checklists`, `Fichas.ITENS_17`/`TIPOS_CARGA`/`LACRES_04`, `Regras.itensTravados`/`validarChecklist04` e `escolherFotos`.
- Produces `abrirChecklist04(permanenciaId, { corrigir: numero }?)`. Grava `checklist_salvo` com `ficha:'04'` e:
  - `dados = { unidade, dataVistoria, motorista, placas:{ cavalo, reboques }, lacres:{…LACRES_04}, containers:[c1,c2], tipoCarga, itens:{ [n]: { resposta, obs, fotos } }, observacoes, lider }`.

**Telas:**
- **Aba Checklists, topo "Fila do GR":** vistorias `pendente` de todas as portarias, para quem tem papel GR; as demais pessoas veem só a da sua portaria.
  - Mostra a placa, a origem (automática nº N / forçada + justificativa) e há quanto tempo está pendente.
  - Botões **Fazer vistoria** e **Dispensar** (pede a justificativa). Os dois só aparecem para o papel GR.
- **Formulário:**
  - trocar `tipoCarga` ou `lacres.containerVazio` recalcula `itensTravados`; os itens travados ficam `NA` e desabilitados;
  - `NC` destaca o campo de observação como obrigatório;
  - cada item tem "Adicionar fotos".
- **Histórico:**
  - filtros de portaria, ficha (03/04), placa e período;
  - linha vermelha (`--coral`) quando `naoConforme`;
  - clique abre o detalhe com as versões e o link do PDF (`Armazenamento.urlDe`);
  - **Corrigir** aparece para quem preencheu ou para o admin desbloqueado: pede o motivo, reabre o formulário preenchido e grava `versao + 1`.

- [ ] **Step 1:** Escreva `tests/e2e/checklist04.cjs`:
  - com 5 chegadas e a pessoa sem papel GR → o botão "Fazer vistoria" não aparece;
  - troca para a pessoa GR → abre, escolhe `container_com_carga` → os itens 12 a 17 ficam desabilitados e `NA`;
  - marca o item 3 `NC` sem obs → erro;
  - preenche a obs e conclui → a vistoria fica `concluida`, a linha do histórico tem a classe de não conforme e `numero === 'MAC-04-000001'`;
  - forçar na 6ª chegada e dispensar com justificativa → `situacao:'dispensada'`.
- [ ] **Step 2:** `npm run e2e`. Esperado: FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npm run e2e`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: vistoria 17 pontos, fila do GR e histórico de checklists`.

### Task 12: PDFs das fichas

**Files:**
- Create: `painel/lib/jspdf.umd.min.js` (jsPDF 2.5.1, de `npm pack jspdf@2.5.1` → `package/dist/jspdf.umd.min.js`), `painel/lib/jspdf-LICENSE`, `painel/lib/pdf-fichas.js`
- Modify: `painel/painel.html`
- Test: `tests/e2e/pdf.cjs`

**Interfaces:**
- Consumes: `window.jspdf.jsPDF`, `Fichas.CABECALHO_FICHAS` e as listas das fichas.
- Produces:
  - `PdfFichas.gerar(checklist: { numero, ficha, portariaNome, em, pessoa, dados, versao }, fotos: [{ ponto, dataUrl }]) -> Blob` (A4 retrato);
  - `nomePdf(numero, placa, versao) -> '<numero>_<PLACA>.pdf'` ou `'<numero>_<PLACA>_v<versao>.pdf'` quando `versao > 1`.

**Layout do PDF:**
- **Cabeçalho em tabela, como nas fichas:**
  - texto "TÓLIMAN" em `--ink` no lugar do logo (o logo vai quando o usuário enviar o arquivo; registre em HANDOFF);
  - título; Nº Checklist; Elaboração/Revisão/Aprovação; Nº Reg., Revisão, Data e Página.
- **Corpo:**
  - 03: limpeza, tabela das regiões (região, códigos, descrição), itens do motorista (✓/✗), cabine, carretas, container/lacre;
  - 04: dados, lacres, containers, tipo de carga e tabela dos 17 itens (Nº, Item, C, NC, NA, Observações), com o rodapé "ATENÇÃO" da ficha.
- **Fotos** em grade de 2 colunas, com a legenda do ponto.
- **Assinaturas** com linhas em branco e os nomes impressos abaixo.
- **Integração:**
  - ao concluir ou corrigir: gera, grava em `checklists/<pasta portaria>/<AAAA-MM>/`, e o evento `checklist_salvo` leva `pdf: [...caminho, nome]`;
  - a ordem é gravar o PDF primeiro e o evento depois; se o PDF falhar, o evento não é gravado e aparece o erro.

- [ ] **Step 1:** Rode `npm pack jspdf@2.5.1` no scratchpad e copie o arquivo UMD e a LICENSE. Se o npm estiver indisponível, pare e reporte.
- [ ] **Step 2:** Escreva `tests/e2e/pdf.cjs`. Conclui um 03 e um 04 com 1 foto cada e verifica:
  - existem `checklists/Machado/<AAAA-MM>/MAC-03-000001_<PLACA>.pdf` e o do 04, com tamanho > 5 KB e começando com `%PDF`;
  - corrigir o 04 gera `…_v2.pdf`.
- [ ] **Step 3:** `npm run e2e`. Esperado: FAIL.
- [ ] **Step 4:** Implemente `pdf-fichas.js` (`root.PdfFichas`) e a integração.
- [ ] **Step 5:** `npm run e2e`. Esperado: PASS. Abra um PDF gerado como imagem (`pdftoppm -png`) e compare visualmente com `docs/referencia/`.
- [ ] **Step 6:** Commit `feat: PDFs das fichas REG LOG 03 e 04`.

### Task 13: Entrega e documentação

**Files:**
- Create: `painel/LEIA-ME.md`, `entrega/power-automate-alerta-gr.md`, `docs/HANDOFF.md`, `scripts/empacotar.sh`

**Conteúdo:**
- **`LEIA-ME.md`:** instalação no time do Teams, no molde do Raster:
  - pasta "Portaria Tóliman" e sincronizar em cada PC;
  - abrir no Edge e escolher a pasta, a portaria e a pessoa;
  - criar `fotos-entrada/<Portaria>` e enviar fotos pelo app OneDrive (passo a passo no celular: abrir a pasta → câmera → salvar como JPG);
  - não editar `eventos/`;
  - modo demonstração.
- **`power-automate-alerta-gr.md`:** passo a passo:
  1. gatilho SharePoint "Quando um arquivo é criado em uma pasta", com o site, a biblioteca e a pasta `alertas`;
  2. "Obter conteúdo do arquivo";
  3. "Analisar JSON", com o esquema do `conteudo` de `montarAlerta`;
  4. Teams "Postar mensagem em um chat ou canal" (Postar como: Flow bot; canal do GR; mensagem = `mensagem`).
  - Inclui o esquema JSON e um teste (copiar um alerta de exemplo para a pasta).
- **`HANDOFF.md`:** estado, arquitetura, eventos, como testar e pendências:
  - logo da Tóliman;
  - divergência "LOG 03" no cabeçalho do REG LOG 04;
  - fase 2 com o Graph;
  - política de retenção (LGPD).
- **`scripts/empacotar.sh`:** gera `portaria-toliman.zip` com `painel.html`, `LEIA-ME.md`, `lib/` e `entrega/*.csv`.

- [ ] **Step 1:** Escreva os documentos e o script.
- [ ] **Step 2:** Rode `npm test && npm run e2e && bash scripts/empacotar.sh && unzip -l portaria-toliman.zip`. Esperado: tudo PASS, e o zip lista `painel.html`, `LEIA-ME.md`, `lib/jspdf.umd.min.js`, `lib/estado.js` e os 2 CSVs.
- [ ] **Step 3:** Commit `docs: instalação, alerta no Teams e handoff`.
