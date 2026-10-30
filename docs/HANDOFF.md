# Handoff: Portaria x Checklist (v2, centro de controle)

Estado do projeto para quem continuar numa sessão nova. Última atualização: 30/10/2026.

## O que é

O **centro de controle do GR e do coordenador** da Tóliman. Ele:
- acompanha o fluxo de pessoas da Distrito e da Machado e a frota no pátio da Distrito;
- é onde se fazem as vistorias REG LOG 03 (toda chegada da frota) e REG LOG 04 (17 pontos, a cada 5 chegadas).

Os porteiros continuam no **Microsoft Lists**, sem mudança. O **Power Automate** copia cada item para a pasta do painel e aplica a regra do 5º veículo.

**Documentos de referência:**
- **Especificação:** v2 em `docs/superpowers/specs/2026-10-30-centro-de-controle-design.md`. Ela substitui partes da v1, `2026-10-30-portaria-checklist-design.md`.
- **Decisões:** `docs/adr/` (0001 pasta sincronizada sem TI; 0002 substituída; 0003 Lists como entrada).
- **Planos:** `docs/superpowers/plans/`.
- **Vocabulário:** `GLOSSARY.md`.

## Como funciona

- **Pasta:** o painel é um `painel.html` numa pasta do time do Teams, sincronizada pelo OneDrive, aberta no Edge ou Chrome por `file://` com a File System Access API (modelo do projeto `kallorvan/raster`).
- **Entrada pelo Lists:** o fluxo grava `listas/<Distrito|Machado>/<frota|visitantes|colaboradores>/<ID>.json`, sobrescrevendo o arquivo quando o item é editado. `Armazenamento.lerJsonDe` relê por caminho e data de modificação. `painel/lib/listas.js` transforma os itens em permanências:
  - instante digitado (Data, Hora, Minuto);
  - pareamento de entrada e saída por placa do cavalo ou nome;
  - visitante em item único;
  - colunas de escolha `{Value}`.
- **5º veículo:** o fluxo 2 conta as chegadas desde a ativação e grava `alertas/DIS_<ID>.json`, que vira vistoria automática no `Estado`. Forçar, dispensar, concluir checklists, ocultar registros e pessoas são eventos do painel em `eventos/` (um JSON imutável por alteração).
- **Fotos do CTRC:** o fluxo 1 copia os anexos do item para `fotos/Distrito/ctrc/`.
- **Fotos da vistoria:** o celular envia pelo app OneDrive para `fotos-entrada/Distrito/`, e o painel vincula.
- **PDFs:** jsPDF com o layout das fichas, em `checklists/Distrito/<AAAA-MM>/DIS-0x-NNNNNN_<PLACA>[_vN].pdf`.

### Arquivos

| Caminho | O que é |
|---|---|
| `painel/lib/listas.js` | Itens do Lists → permanências |
| `painel/lib/estado.js` | `montarEstado(eventos, agora, { itens, alertas })`: permanências, jornada, ocultos, vistorias, checklists |
| `painel/lib/regras.js`, `fichas.js` | Regras das fichas, numeração, portarias (DIS, MAC) |
| `painel/lib/armazenamento.js` | Única camada que toca arquivos (a fase 2 com o Microsoft Graph troca só ela) |
| `painel/lib/pdf-fichas.js`, `fotos.js`, `csv.js`, `logos.js` | PDF, fotos, exportação CSV, logos |
| `painel/js/nucleo.js` | Conexão, leitura das fontes, pessoa, papéis (`podeVistoriar`), abas |
| `painel/js/tela-inicio.js` | Centro de controle |
| `painel/js/tela-checklists.js` | Vistorias: fila do 03, fila do 17 pontos, histórico |
| `painel/js/tela-frota.js`, `tela-visitantes.js`, `tela-colaboradores.js`, `registros-comum.js` | Telas somente leitura, detalhe e ocultar |
| `painel/js/ficha03.js`, `ficha04.js`, `checklists-comum.js`, `fotos-ui.js`, `pdf-ui.js` | Fichas e PDFs |
| `entrega/power-automate-fluxos.md` | Passo a passo dos 6 fluxos |
| `tests/*.test.cjs`, `tests/fixtures/listas/` | Testes das regras (`npm test`) |
| `tests/e2e/*.cjs` | Testes no navegador (`npm run e2e`). `util.espelho` e `util.alerta` simulam os fluxos |

## Como testar

```bash
npm test
npm run e2e
npm run e2e -- controle
bash scripts/empacotar.sh
```

- **Playwright:** `/opt/node22/lib/node_modules/playwright`, com `executablePath: '/opt/pw-browsers/chromium'`.
- **Acesso no teste:** `window.__painel = { st, gravar, recarregar, Armazenamento }` e `window.Painel`.

## Pendências e pontos a confirmar

- **Machado:** conferir as colunas das listas com uma exportação antes de criar os fluxos 5 e 6.
- **Comportamento real do "Criar arquivo" do SharePoint** com arquivo existente. O guia já prevê o ramo de "Atualizar arquivo".
- **Fotos do CTRC:** confirmar com um item real que elas chegam como anexos do item. As exportações indicam que sim (`Reserved_ImageAttachment_…`).
- **Coproprietário** dos fluxos.
- **Fora desta versão:**
  - histórico anterior à ativação;
  - exclusões do Lists (use **Ocultar registro**);
  - uso no celular;
  - alinhar o visual ao design system "Tóliman Painéis" (Barlow Condensed e IBM Plex, marinho `#112346`, cartões quadrados). Hoje o painel usa o visual do Raster.
- **LGPD:** prazo de retenção das cópias com documentos de visitantes.
