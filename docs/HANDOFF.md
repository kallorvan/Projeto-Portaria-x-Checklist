# Handoff: Portaria x Checklist

Estado do projeto para quem continuar numa sessão nova. Última atualização: 30/10/2026.

## O que é

Painel HTML das 3 portarias da Tóliman (Machado, João Pessoa, Distrito), sem servidor. Ele cobre:
- registro de permanências (entrada → saída) de visitantes e prestadores, frota e colaboradores;
- checklist REG LOG 03 em toda chegada da frota;
- vistoria 17 pontos (REG LOG 04) do GR a cada 5 chegadas da frota por portaria, com alerta no Teams;
- cadastros de veículos e funcionários.

Especificação: `docs/superpowers/specs/2026-10-30-portaria-checklist-design.md`. Plano executado: `docs/superpowers/plans/2026-10-30-portaria-checklist.md`. Vocabulário: `GLOSSARY.md`. Decisões: `docs/adr/`.

## Como funciona

- **Modelo do projeto `kallorvan/raster`.** O `painel.html` fica numa pasta do SharePoint do time, sincronizada pelo OneDrive, e é aberto no Edge ou Chrome por `file://`. O acesso à pasta é feito pela File System Access API, com o handle guardado no IndexedDB `portaria-toliman`.
- **Eventos:** cada alteração é um JSON imutável em `eventos/<Machado|JoaoPessoa|Distrito|geral>/`. O estado é recalculado por `Estado.montarEstado` (`painel/lib/estado.js`). O formato e os tipos de evento estão no plano, na seção "Formato do evento".
- **Regra do 5º veículo:** derivada das chegadas da frota da portaria, ordenadas por `em` e `id` (ADR 0002). Só forçar, dispensar e concluir viram eventos.
- **Alerta:** o painel que registrou a chegada grava `alertas/<…>.json` (`Alerta.montarAlerta`). Um fluxo do Power Automate posta no Teams (`entrega/power-automate-alerta-gr.md`).
- **Fotos:** o celular envia pelo app OneDrive para `fotos-entrada/<Portaria>/`. O painel reduz cada foto para 1600 px, grava em `fotos/<Portaria>/<AAAA-MM>/` e remove a original da entrada.
- **PDF:** jsPDF 2.5.1 vendorizado (`painel/lib/jspdf.umd.min.js`) e layout em `painel/lib/pdf-fichas.js`. Os PDFs são gravados em `checklists/<Portaria>/<AAAA-MM>/<nº>_<PLACA>[_vN].pdf`, com o logo da Tóliman em `lib/logos.js`.
- **Modo demonstração:** `painel.html?demo=1` servido por http, usando o OPFS do navegador.

### Arquivos

| Caminho | O que é |
|---|---|
| `painel/lib/fichas.js` | Portarias, regiões, códigos de avaria, itens das fichas e cabeçalhos |
| `painel/lib/regras.js` | Placa, numeração, 5º veículo, itens 12–17 travados, validações, CNH |
| `painel/lib/estado.js` | `montarEstado`: pessoas, cadastros, permanências, jornada, checklists, vistorias, contadores |
| `painel/lib/alerta.js`, `csv.js`, `fotos.js` | Alerta do Teams; CSV (exportação e importação de cadastros); fotos (nomes, pastas, redução) |
| `painel/lib/armazenamento.js` | **Única camada que toca arquivos.** A fase 2 (Microsoft Graph) troca só ela |
| `painel/lib/pdf-fichas.js` | PDF das fichas |
| `painel/js/nucleo.js` | Conexão, gravação, pessoa/portaria/admin, abas, presença, utilitários de interface (`Painel`) |
| `painel/js/tela-*.js`, `registros-comum.js` | Abas Início, Visitantes, Frota, Colaboradores, Checklists, Cadastros, Pessoas |
| `painel/js/ficha03.js`, `ficha04.js`, `checklists-comum.js`, `fotos-ui.js`, `pdf-ui.js` | Formulários dos checklists, vínculo de fotos e PDF |
| `tests/*.test.cjs` | Testes das regras (`npm test`) |
| `tests/e2e/*.cjs` | Testes no navegador (`npm run e2e`). Os PDFs gerados ficam em `tests/e2e/saida/` |
| `entrega/` | Modelos CSV de cadastro e o passo a passo do Power Automate |
| `scripts/empacotar.sh` | Gera `portaria-toliman.zip` (fora do git) |

## Como testar

```bash
npm test
npm run e2e            # sobe http.server em 127.0.0.1:8765 e roda tests/e2e/*.cjs
npm run e2e -- pdf     # só os arquivos que contêm "pdf"
bash scripts/empacotar.sh
```

- **Playwright:** já instalado em `/opt/node22/lib/node_modules/playwright`, com `executablePath: '/opt/pw-browsers/chromium'`.
- **Controle pelo teste:** `window.__painel = { st, gravar, recarregar, Armazenamento }` e `window.Painel` (telas e utilitários).

## Pendências e pontos a confirmar com o usuário

- **Cabeçalho do REG LOG 04:** a ficha em papel traz "LOG 03" no Nº Reg., e isso foi copiado como está (`Fichas.CABECALHO_FICHAS`). Confirmar se o certo é "LOG 04".
- **"Já lacrado" no REG LOG 04:** o painel considera o veículo lacrado quando o campo "lacre de segurança / container vazio" está preenchido (`Regras.itensTravados`).
- **Fase 2:** se a TI registrar um app no Entra ID, trocar `armazenamento.js` pelo Microsoft Graph. Isso libera o celular, a aba do Teams e o login Microsoft.
- **LGPD:** definir a política de retenção das fotos e dos documentos de visitantes.
- **Fora desta versão:** manual ilustrado para os porteiros, importação do histórico das Lists, checklist de carro da empresa, desenho clicável de avarias e segundo alerta para "Não conforme".
- **Push:** a sessão que criou o projeto não conseguiu enviar ao GitHub (a checagem automática de permissões bloqueou o `git push`).
