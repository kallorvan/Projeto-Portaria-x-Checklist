# Alerta da vistoria 17 pontos no Teams (Power Automate)

A cada vistoria 17 pontos (o 5º veículo da frota numa portaria, ou uma vistoria forçada), o painel grava um arquivo `.json` na pasta `alertas/`. Este fluxo detecta o arquivo novo e publica uma mensagem no canal do GR.

Usa só conectores padrão do Microsoft 365: SharePoint e Microsoft Teams. Não precisa de licença premium nem da TI. Leva uns 10 minutos.

## Antes de começar

- **Pasta `alertas`:** ela precisa existir dentro da pasta **Portaria Tóliman** no SharePoint. Se ainda não existe, crie-a vazia.
- **Canal do GR:** escolha onde a mensagem vai aparecer, por exemplo o canal "GR – Vistorias" na equipe Portaria Tóliman.

## Passo a passo

1. Acesse **https://make.powerautomate.com** com a conta da empresa.
2. Clique em **+ Criar** → **Fluxo da nuvem automatizado**.
3. Nome: `Portaria – alerta vistoria 17 pontos`. Gatilho: busque **"Quando um arquivo é criado em uma pasta"** do **SharePoint** (não o do OneDrive). Clique em **Criar**.
4. Configure o gatilho:
   - **Endereço do Site:** o site do SharePoint da equipe Portaria Tóliman.
   - **Identificador da Pasta:** clique no ícone de pasta e navegue até `Documentos Compartilhados / … / Portaria Tóliman / alertas`.
5. **+ Nova etapa** → SharePoint **"Obter conteúdo do arquivo"**:
   - **Endereço do Site:** o mesmo.
   - **Identificador de Arquivo:** o conteúdo dinâmico **"Identificador"** do gatilho.
6. **+ Nova etapa** → **"Analisar JSON"** (Operação de Dados):
   - **Conteúdo:** a expressão `json(body('Obter_conteúdo_do_arquivo'))`. Se o nome da etapa for outro, use o conteúdo dinâmico **"Conteúdo do arquivo"** dentro de `json(...)`.
   - **Esquema:** cole o esquema abaixo.
7. **+ Nova etapa** → Microsoft Teams **"Postar mensagem em um chat ou canal"**:
   - **Postar como:** Flow bot.
   - **Postar em:** Canal.
   - **Equipe / Canal:** escolha o canal do GR.
   - **Mensagem:** o conteúdo dinâmico **`mensagem`** (do Analisar JSON).
   - Opcional: acrescente uma linha com **`portariaNome`** e **`chegada`**.
8. Clique em **Salvar**.

## Esquema JSON (para o passo 6)

```json
{
  "type": "object",
  "properties": {
    "tipo": { "type": "string" },
    "portaria": { "type": "string" },
    "portariaNome": { "type": "string" },
    "placaCavalo": { "type": "string" },
    "reboques": { "type": "array", "items": { "type": "string" } },
    "motorista": { "type": "string" },
    "chegada": { "type": "string" },
    "origem": { "type": "string" },
    "justificativa": { "type": ["string", "null"] },
    "mensagem": { "type": "string" }
  }
}
```

## Testar

1. Crie no computador um arquivo `teste.json` com o conteúdo abaixo e copie para a pasta `alertas` (pelo Explorador de Arquivos sincronizado, ou com **Carregar** no SharePoint):

```json
{
  "tipo": "vistoria17",
  "portaria": "MAC",
  "portariaNome": "Tóliman Machado",
  "placaCavalo": "ABC1D23",
  "reboques": ["XYZ9K87"],
  "motorista": "Teste",
  "chegada": "2026-10-30T14:32:00.000Z",
  "origem": "automatica",
  "justificativa": null,
  "mensagem": "🚨 Vistoria 17 pontos — Portaria Machado — Cavalo ABC1D23 / Reb. XYZ9K87 — Motorista Teste — chegada 30/10 14:32 (TESTE)"
}
```

2. Em 1 a 5 minutos, a mensagem aparece no canal.
3. Apague o `teste.json` depois.

## Bom saber

- **Atraso:** a mensagem chega com o atraso da sincronização do OneDrive mais o do gatilho, normalmente de 1 a 5 minutos.
- **Painel:** o próprio painel também mostra a vistoria pendente na aba **Checklists** (fila do GR) e no **Início**.
- **Fluxo parado:** se ele parar, confira o histórico de execuções no Power Automate. O dono do fluxo precisa continuar com acesso à pasta e ao canal.
