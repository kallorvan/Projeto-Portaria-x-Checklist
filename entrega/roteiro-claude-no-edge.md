# Roteiro para o Claude no Edge: montar os fluxos do Power Automate

Este roteiro é para colar no **Claude da extensão do Edge**, uma parte por vez. Ele monta os 6 fluxos descritos em `power-automate-fluxos.md`, que traz o porquê de cada passo.

**Como usar:**
1. Preencha a seção **Valores**: copie os endereços do navegador.
2. Abra o Edge já logado na conta da empresa.
3. Cole no Claude a seção **Regras + Valores** junto com **uma** das partes (A, B, C ou D). Comece pela A.
4. Acompanhe a tela. O Claude vai parar e perguntar antes de salvar, ligar ou compartilhar qualquer coisa.

Dica: depois de cada parte, abra o fluxo e confira os campos você mesmo. O seletor de "Conteúdo dinâmico" do Power Automate às vezes engana até humanos.

---

## Regras (cole sempre junto)

```
Você vai montar fluxos no Power Automate (https://make.powerautomate.com) para a Portaria Tóliman. Siga exatamente o roteiro abaixo.

REGRAS OBRIGATÓRIAS
1. NÃO altere, crie nem apague itens, colunas, modos de exibição ou configurações das listas do Microsoft Lists. Só leia.
2. NÃO apague nem edite fluxos que já existem e não fazem parte deste roteiro.
3. PARE e me pergunte antes de: clicar em Salvar, ligar ou desligar um fluxo, testar um fluxo, compartilhar ou adicionar proprietário, enviar mensagem no Teams, ou apagar qualquer arquivo ou pasta.
4. Use sempre o seletor de "Conteúdo dinâmico" para escolher colunas. Nunca digite nomes de colunas, exceto nas expressões que o roteiro manda colar.
5. Se uma coluna for do tipo escolha, o conteúdo dinâmico mostra a opção "<coluna> Value". Use essa.
6. Se algo na tela for diferente do roteiro (nome de lista, coluna que não existe, botão com outro nome), PARE e me descreva o que está vendo antes de continuar.
7. A interface pode estar em português ou em inglês. Os nomes em inglês estão entre parênteses.
8. No fim de cada parte, me mostre um resumo do que foi feito e do que ficou pendente.
```

## Valores (preencha e cole sempre junto)

```
SITE_LISTAS = https://<empresa>.sharepoint.com/sites/Portaria
LISTA_FROTA_DIS = Registro de Frota  Distrito
LISTA_VIS_DIS = Registro de Visitantes  Distrito
LISTA_COL_DIS = Registro de Entrada e Saída  Distrito
LISTA_VIS_MAC = <nome da lista de visitantes da Machado>
LISTA_COL_MAC = <nome da lista de entrada e saída da Machado>
SITE_PAINEL = https://<empresa>.sharepoint.com/sites/<site do time Portaria Tóliman>
PASTA_PAINEL = /Shared Documents/<canal>/Portaria Tóliman      (caminho dentro da biblioteca Documentos)
EQUIPE_TEAMS = Portaria Tóliman
CANAL_GR = <canal do GR>
DATA_ATIVACAO = 2026-11-03      (dia em que a contagem do 5º veículo começa)
```

> Nos nomes das listas da Distrito há **dois espaços** antes de "Distrito", como aparece na exportação. Confira no Lists e copie exatamente.

---

## Parte A: conferir as listas e preparar as pastas

```
PARTE A
1. Abra SITE_LISTAS e confira se as listas LISTA_FROTA_DIS, LISTA_VIS_DIS, LISTA_COL_DIS, LISTA_VIS_MAC e LISTA_COL_MAC existem. Só abra e olhe, não mude nada.
2. Em cada uma, anote as colunas visíveis e me diga quais são do tipo escolha (Choice). Para isso, passe o mouse no cabeçalho ou veja no formulário de um item, mas não abra configurações da lista para editar.
   Colunas esperadas:
   - Frota: Placa_cavalo, Placa_reboque1, Placa_reboque2, Placa_reboque3, Motorista, Situacao, KM, Data, Hora, Minuto, CTRC_1, CTRC_2.
   - Colaboradores: Nome, Situação, Veículo, Placa, Data, Hora, Minuto, Observação, KM.
   - Visitantes: Nome, RG/CNH, Placa_veiculo, Data, Entrada/Saída, Hora, Minuto, Setor_visita, cracha, hora_saida.
   Se alguma lista da Machado tiver colunas diferentes, PARE e me mostre a diferença.
3. Abra SITE_PAINEL, vá até PASTA_PAINEL e crie as pastas que faltarem (me pergunte antes de criar):
   listas/Distrito/frota
   listas/Distrito/visitantes
   listas/Distrito/colaboradores
   listas/Machado/visitantes
   listas/Machado/colaboradores
   alertas
   fotos/Distrito/ctrc
   fotos-entrada/Distrito
4. Mostre o resumo.
```

---

## Parte B: fluxo 1 (cópia da Frota da Distrito, com fotos do CTRC)

```
PARTE B — FLUXO 1
1. Em make.powerautomate.com: Criar (Create) → Fluxo da nuvem automatizado (Automated cloud flow).
   Nome: "Portaria · 1 · Frota Distrito → painel".
   Gatilho: SharePoint "Quando um item é criado ou modificado" (When an item is created or modified). Clique em Criar.
2. Gatilho: Endereço do Site = SITE_LISTAS; Nome da Lista = LISTA_FROTA_DIS.
3. Nova etapa: "Inicializar variável" (Initialize variable). Nome: anexos. Tipo: Matriz (Array). Valor: []
4. Nova etapa: SharePoint "Obter anexos" (Get attachments). Site = SITE_LISTAS, Lista = LISTA_FROTA_DIS, Id = conteúdo dinâmico "ID" do gatilho.
5. Nova etapa: "Aplicar a cada" (Apply to each), com a saída "body" de "Obter anexos". Renomeie para: Aplicar_a_cada. Dentro dele:
   5.1 SharePoint "Obter conteúdo do anexo" (Get attachment content): Site = SITE_LISTAS, Lista = LISTA_FROTA_DIS, Id = "ID" do gatilho, Identificador do Arquivo = "Id" do anexo (item atual).
   5.2 SharePoint "Criar arquivo" (Create file): Site = SITE_PAINEL, Caminho da Pasta = PASTA_PAINEL/fotos/Distrito/ctrc,
       Nome do Arquivo = expressão: concat(triggerBody()?['ID'], '_', items('Aplicar_a_cada')?['DisplayName'])
       Conteúdo do Arquivo = "Conteúdo do anexo" (Attachment Content).
   5.3 "Acrescentar à variável de matriz" (Append to array variable): nome anexos, valor = expressão:
       concat('fotos/Distrito/ctrc/', triggerBody()?['ID'], '_', items('Aplicar_a_cada')?['DisplayName'])
6. Fora do laço, nova etapa "Compor" (Compose), renomeie para: Compor_espelho. Na Entrada, cole o JSON abaixo. Depois, troque cada marcador ‹...› pelo conteúdo dinâmico indicado, mantendo as aspas que já estão lá. Para "anexos", use a variável anexos.
{
  "lista": "frota",
  "portaria": "DIS",
  "id": ‹ID›,
  "criado": "‹Criado (Created)›",
  "modificado": "‹Modificado (Modified)›",
  "autor": "‹Criado por DisplayName (Created By DisplayName)›",
  "editor": "‹Modificado por DisplayName (Modified By DisplayName)›",
  "link": "‹Link para o item (Link to item)›",
  "campos": {
    "Placa_cavalo": "‹Placa_cavalo›",
    "Placa_reboque1": "‹Placa_reboque1›",
    "Placa_reboque2": "‹Placa_reboque2›",
    "Placa_reboque3": "‹Placa_reboque3›",
    "Motorista": "‹Motorista›",
    "Situacao": "‹Situacao ou Situacao Value›",
    "KM": "‹KM›",
    "Data": "‹Data›",
    "Hora": "‹Hora›",
    "Minuto": "‹Minuto›"
  },
  "anexos": ‹variável anexos›
}
7. Nova etapa: SharePoint "Criar arquivo" (Create file), renomeie para: Criar_espelho.
   Site = SITE_PAINEL, Caminho da Pasta = PASTA_PAINEL/listas/Distrito/frota,
   Nome do Arquivo = expressão: concat(triggerBody()?['ID'], '.json')
   Conteúdo = Saídas (Outputs) de Compor_espelho.
8. Substituir o arquivo quando o item é editado:
   8.1 Nova etapa: SharePoint "Obter metadados do arquivo usando o caminho" (Get file metadata using path). Site = SITE_PAINEL.
       Caminho = expressão: concat('PASTA_PAINEL/listas/Distrito/frota/', triggerBody()?['ID'], '.json')
       (troque PASTA_PAINEL pelo valor real, sem barra no fim). Em "…" → Configurar execução após (Configure run after), marque SOMENTE "falhou" (has failed) para Criar_espelho.
   8.2 Nova etapa: SharePoint "Atualizar arquivo" (Update file). Site = SITE_PAINEL, Identificador do Arquivo = "Id" dos metadados, Conteúdo = Saídas de Compor_espelho.
9. PARE: me mostre o fluxo inteiro e pergunte se pode Salvar.
10. Depois de salvar, NÃO teste nem crie item de teste: o teste será feito com um registro real (ver Parte D, item final).
```

---

## Parte C: fluxo 2 (regra do 5º veículo e mensagem no Teams)

```
PARTE C — FLUXO 2
1. Criar → Fluxo da nuvem automatizado. Nome: "Portaria · 2 · Vistoria 17 pontos".
   Gatilho: SharePoint "Quando um item é criado" (When an item is created). Atenção: NÃO é "criado ou modificado". Site = SITE_LISTAS, Lista = LISTA_FROTA_DIS.
2. No gatilho: "…" → Configurações (Settings) → Controle de simultaneidade (Concurrency control) = Ativado (On), Grau de paralelismo (Degree of parallelism) = 1. Concluído.
3. Nova etapa: "Condição" (Condition), com o modo de grupo "E" (And):
   - Linha 1: expressão
     or(equals(coalesce(triggerBody()?['Situacao']?['Value'], triggerBody()?['Situacao']), 'Chegada'), equals(coalesce(triggerBody()?['Situacao']?['Value'], triggerBody()?['Situacao']), 'Entrada'))
     é igual a  true
   - Linha 2: expressão  greaterOrEquals(triggerBody()?['Created'], 'DATA_ATIVACAOT03:00:00Z')   é igual a  true
     (troque DATA_ATIVACAO pela data, ex.: '2026-11-03T03:00:00Z')
4. No ramo "Se sim" (If yes):
   4.1 SharePoint "Obter itens" (Get items), renomeie para: Obter_itens. Site = SITE_LISTAS, Lista = LISTA_FROTA_DIS.
       Consulta de filtro (Filter Query): Created ge 'DATA_ATIVACAOT03:00:00Z' and (Situacao eq 'Chegada' or Situacao eq 'Entrada')
       Contagem superior (Top Count): 5000.
       Em "…" → Configurações: Paginação (Pagination) = Ativado, Limite (Threshold) = 100000.
   4.2 "Compor" (Compose), renomeie para: n. Entrada = expressão: length(body('Obter_itens')?['value'])
   4.3 "Condição": expressão  mod(outputs('n'), 5)  é igual a  0
   4.4 No "Se sim" dessa condição:
       a) "Compor", renomeie para: alerta. Entrada:
{
  "id": ‹ID do gatilho›,
  "ordem": ‹Saídas de n›,
  "placaCavalo": "‹Placa_cavalo›",
  "reboques": ["‹Placa_reboque1›", "‹Placa_reboque2›", "‹Placa_reboque3›"],
  "motorista": "‹Motorista›",
  "chegada": "‹Criado (Created)›",
  "mensagem": "@{concat('🚨 Vistoria 17 pontos — Portaria Distrito — Cavalo ', triggerBody()?['Placa_cavalo'], ' — Motorista ', triggerBody()?['Motorista'], ' — chegada ', triggerBody()?['Data'], ' ', triggerBody()?['Hora'], ':', triggerBody()?['Minuto'], ' (', outputs('n'), 'ª chegada)')}"
}
       b) SharePoint "Criar arquivo": Site = SITE_PAINEL, Caminho = PASTA_PAINEL/alertas,
          Nome = expressão: concat('DIS_', triggerBody()?['ID'], '.json'), Conteúdo = Saídas de alerta.
       c) Microsoft Teams "Postar mensagem em um chat ou canal" (Post message in a chat or channel): Postar como = Flow bot, Postar em = Canal,
          Equipe = EQUIPE_TEAMS, Canal = CANAL_GR, Mensagem = expressão: outputs('alerta')?['mensagem']
5. Se a Situacao NÃO for do tipo escolha, a expressão da linha 1 continua funcionando por causa do coalesce. Não mude.
6. PARE: me mostre o fluxo inteiro e pergunte se pode Salvar. NÃO ligue o fluxo antes da DATA_ATIVACAO sem a minha confirmação.
```

---

## Parte D: fluxos 3 a 6 (pessoas da Distrito e da Machado)

```
PARTE D — FLUXOS 3 A 6
Para cada linha da tabela, faça os passos 1 a 6:

| Fluxo | Nome do fluxo | Lista do gatilho | "lista" | "portaria" | Pasta de destino |
| 3 | Portaria · 3 · Visitantes Distrito → painel | LISTA_VIS_DIS | visitantes | DIS | listas/Distrito/visitantes |
| 4 | Portaria · 4 · Colaboradores Distrito → painel | LISTA_COL_DIS | colaboradores | DIS | listas/Distrito/colaboradores |
| 5 | Portaria · 5 · Visitantes Machado → painel | LISTA_VIS_MAC | visitantes | MAC | listas/Machado/visitantes |
| 6 | Portaria · 6 · Colaboradores Machado → painel | LISTA_COL_MAC | colaboradores | MAC | listas/Machado/colaboradores |

1. Abra o fluxo 1 → "…" → Salvar como (Save As), com o nome da tabela. Abra a cópia em Editar.
2. Apague as etapas "Inicializar variável", "Obter anexos" e "Aplicar a cada".
3. No gatilho, troque a Lista pela lista da tabela (o Site continua SITE_LISTAS). Depois disso, os conteúdos dinâmicos antigos vão ficar inválidos: é esperado.
4. Em Compor_espelho, apague a Entrada e cole o JSON do tipo da lista. Troque cada ‹...› pelo conteúdo dinâmico, "lista" e "portaria" conforme a tabela, e "anexos": [] (fixo).
   Para visitantes:
{
  "lista": "visitantes", "portaria": "DIS ou MAC", "id": ‹ID›, "criado": "‹Criado›", "modificado": "‹Modificado›",
  "autor": "‹Criado por DisplayName›", "editor": "‹Modificado por DisplayName›", "link": "‹Link para o item›",
  "campos": {
    "Nome": "‹Nome›", "RG/CNH": "‹RG/CNH›", "Placa_veiculo": "‹Placa_veiculo›", "Data": "‹Data›",
    "Entrada/Saída": "‹Entrada/Saída ou Value›", "Hora": "‹Hora›", "Minuto": "‹Minuto›",
    "Setor_visita": "‹Setor_visita ou Value›", "cracha": "‹cracha›", "hora_saida": "‹hora_saida›"
  },
  "anexos": []
}
   Para colaboradores:
{
  "lista": "colaboradores", "portaria": "DIS ou MAC", "id": ‹ID›, "criado": "‹Criado›", "modificado": "‹Modificado›",
  "autor": "‹Criado por DisplayName›", "editor": "‹Modificado por DisplayName›", "link": "‹Link para o item›",
  "campos": {
    "Nome": "‹Nome›", "Situação": "‹Situação ou Value›", "Veículo": "‹Veículo ou Value›", "Placa": "‹Placa›",
    "Data": "‹Data›", "Hora": "‹Hora›", "Minuto": "‹Minuto›", "Observação": "‹Observação›", "KM": "‹KM›"
  },
  "anexos": []
}
5. Em Criar_espelho, troque o Caminho da Pasta para PASTA_PAINEL/<pasta de destino>. Em "Obter metadados do arquivo usando o caminho", troque o trecho listas/Distrito/frota/ pela mesma pasta de destino.
6. PARE: me mostre o fluxo e pergunte se pode Salvar.

DEPOIS DOS 6 FLUXOS
7. Me pergunte se posso ligar os fluxos 1, 3, 4, 5 e 6. O 2 só liga na DATA_ATIVACAO.
8. Teste sem criar itens: espere um porteiro registrar algo real (ou peça para eu avisar quando houver um registro). Depois, abra o histórico de execuções (28 dias) de cada fluxo e me diga se a execução teve êxito, e se o arquivo <ID>.json apareceu na pasta de destino.
9. Me pergunte o nome da pessoa que será coproprietária. Só depois da minha confirmação, adicione-a como proprietária em cada fluxo (Compartilhar / Share).
10. Mostre o resumo final: fluxos criados, ligados ou desligados, e pendências.
```

---

## Se der errado

- **"Criar arquivo" falhou e "Atualizar arquivo" também falhou:** confira se o caminho em "Obter metadados" começa igual ao caminho da pasta, com a mesma barra inicial.
- **Fotos do CTRC não aparecem:** abra uma execução do fluxo 1 e veja se "Obter anexos" retornou itens. Se veio vazio, as fotos não são anexos do item. Me avise, porque o fluxo precisa ler a coluna de imagem.
- **Erro no "Obter itens" do fluxo 2:** o filtro usa o nome interno da coluna `Situacao`. Se a coluna tiver outro nome interno, copie-o da URL de configuração da coluna (`Field=...`) e troque no filtro.
