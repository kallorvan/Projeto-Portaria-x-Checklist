# Portaria x Checklist

Centro de controle do GR e do coordenador da Tóliman: lê os registros do Microsoft Lists (copiados pelo Power Automate), acompanha as portarias Distrito e Machado e é onde se fazem os checklists REG LOG 03 e REG LOG 04. Painel HTML sem servidor, no modelo do projeto `kallorvan/raster`.

- Especificação: v2 em `docs/superpowers/specs/2026-10-30-centro-de-controle-design.md` (substitui partes da v1).
- Use os termos de [`GLOSSARY.md`](GLOSSARY.md) no código, na interface e nos documentos.
- Decisões de arquitetura ficam em `docs/adr/`. Documentos de origem (pedido e fichas em PDF) ficam em `docs/referencia/`.
- Converse com o usuário em português. Ele costuma responder "siga com o recomendado".
- Comece por `docs/HANDOFF.md`. Testes: `npm test` (regras) e `npm run e2e` (navegador, modo demonstração). Pacote: `bash scripts/empacotar.sh`.
