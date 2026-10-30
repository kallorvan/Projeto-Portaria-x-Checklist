# Fluxos do Power Automate: do Lists para o centro de controle

Seis fluxos levam os registros das portarias, feitos no Microsoft Lists, até a pasta do painel. Um deles também aplica a regra do 5º veículo e avisa o GR no Teams. **As listas não mudam e os porteiros não percebem nada.**

| # | Lista (gatilho) | O que faz | Pasta de destino |
|---|---|---|---|
| 1 | Registro de Frota · Distrito | Cópia do item e das fotos do CTRC | `listas/Distrito/frota/` e `fotos/Distrito/ctrc/` |
| 2 | Registro de Frota · Distrito | Regra do 5º veículo e mensagem no Teams | `alertas/` |
| 3 | Registro de Visitantes · Distrito | Cópia do item | `listas/Distrito/visitantes/` |
| 4 | Registro de Entrada e Saída · Distrito | Cópia do item | `listas/Distrito/colaboradores/` |
| 5 | Registro de Visitantes · Machado | Cópia do item | `listas/Machado/visitantes/` |
| 6 | Registro de Entrada e Saída · Machado | Cópia do item | `listas/Machado/colaboradores/` |

Todos usam só conectores padrão (SharePoint e Microsoft Teams). Basta ser **membro** do site Portaria para ler as listas e ter acesso à pasta do time **Portaria Tóliman**.

## Antes de começar

1. **Pastas:** na pasta **Portaria Tóliman** do time, crie `listas/Distrito/frota`, `listas/Distrito/visitantes`, `listas/Distrito/colaboradores`, `listas/Machado/visitantes`, `listas/Machado/colaboradores`, `alertas` e `fotos/Distrito/ctrc`.
2. **Data de ativação:** anote a data em que o fluxo 2 vai ser ligado (exemplo: `2026-11-03`). A contagem do 5º veículo começa nessa data.
3. **Canal do GR:** escolha o canal do Teams que vai receber a mensagem.

**Regra de ouro:** nos campos do fluxo, escolha sempre o valor pelo **Conteúdo dinâmico**, nunca digitando o nome da coluna. Colunas com acento ou barra (`Situação`, `RG/CNH`, `Entrada/Saída`) têm nomes internos diferentes, e o conteúdo dinâmico resolve isso sozinho. Se a coluna for de **escolha**, use a opção "… Value".

---

## Fluxo 1: cópia da Frota (Distrito)

1. Em **https://make.powerautomate.com**, abra **+ Criar** → **Fluxo da nuvem automatizado**. Nome: `Portaria · 1 · Frota Distrito → painel`.
2. **Gatilho:** SharePoint **"Quando um item é criado ou modificado"**.
   - **Endereço do Site:** o site *Portaria*.
   - **Nome da Lista:** *Registro de Frota  Distrito*.
3. **Inicializar variável:** nome `anexos`, tipo **Matriz**, valor `[]`.
4. **Obter anexos** (SharePoint): mesmo site e lista; **Id**: *ID* do gatilho.
5. **Aplicar a cada** sobre a saída de *Obter anexos*. Dentro do laço:
   1. **Obter conteúdo do anexo**: mesmo site e lista. **Id** = *ID* do gatilho. **Identificador do arquivo** = *Id* do anexo.
   2. **Criar arquivo** (SharePoint):
      - **Endereço do Site:** o site do time Portaria Tóliman.
      - **Caminho da Pasta:** `…/Portaria Tóliman/fotos/Distrito/ctrc`.
      - **Nome do arquivo:** `@{triggerBody()?['ID']}_@{items('Aplicar_a_cada')?['DisplayName']}`.
      - **Conteúdo do arquivo:** *Conteúdo do anexo*.
   3. **Acrescentar à variável de matriz** `anexos`: `fotos/Distrito/ctrc/@{triggerBody()?['ID']}_@{items('Aplicar_a_cada')?['DisplayName']}`.
6. **Compor:** cole o modelo abaixo e troque cada `‹…›` pelo **conteúdo dinâmico** indicado. Mantenha as aspas onde estão.

```json
{
  "lista": "frota",
  "portaria": "DIS",
  "id": ‹ID›,
  "criado": "‹Criado›",
  "modificado": "‹Modificado›",
  "autor": "‹Criado por DisplayName›",
  "editor": "‹Modificado por DisplayName›",
  "link": "‹Link para o item›",
  "campos": {
    "Placa_cavalo": "‹Placa_cavalo›",
    "Placa_reboque1": "‹Placa_reboque1›",
    "Placa_reboque2": "‹Placa_reboque2›",
    "Placa_reboque3": "‹Placa_reboque3›",
    "Motorista": "‹Motorista›",
    "Situacao": "‹Situacao (ou Situacao Value)›",
    "KM": "‹KM›",
    "Data": "‹Data›",
    "Hora": "‹Hora›",
    "Minuto": "‹Minuto›"
  },
  "anexos": ‹variável anexos›
}
```

7. **Criar arquivo** (SharePoint), no site do time:
   - **Caminho da Pasta:** `…/Portaria Tóliman/listas/Distrito/frota`.
   - **Nome do arquivo:** `@{triggerBody()?['ID']}.json`.
   - **Conteúdo:** a *Saída* do Compor.
8. **Quando o item é editado no Lists, o arquivo precisa ser substituído.** Se o "Criar arquivo" do passo 7 falhar por já existir um arquivo com o mesmo nome:
   1. Adicione, logo depois dele, **Obter metadados do arquivo usando o caminho**, com o caminho `/…/listas/Distrito/frota/@{triggerBody()?['ID']}.json`.
   2. Em seguida, adicione **Atualizar arquivo**: **Identificador do arquivo** = *Id* dos metadados; **Conteúdo** = Saída do Compor.
   3. Nas duas ações, abra **"…" → Configurar execução após** e marque **"falhou"** no passo anterior.

   Assim, um item novo cria o arquivo e um item editado atualiza o mesmo arquivo.
9. **Salve.** Teste criando um item de teste na lista e confira se `<ID>.json` aparece em `listas/Distrito/frota`. Depois, apague o item de teste no Lists e use **Ocultar registro** no painel.

---

## Fluxo 2: regra do 5º veículo (Distrito)

1. Crie o fluxo `Portaria · 2 · Vistoria 17 pontos`. **Gatilho:** SharePoint **"Quando um item é criado"** (só criado, nunca modificado), na lista *Registro de Frota  Distrito*.
2. **Simultaneidade igual a 1:** no gatilho, abra **"…" → Configurações → Controle de simultaneidade: Ativado, Grau de paralelismo = 1**. Assim, duas chegadas ao mesmo tempo nunca recebem o mesmo número.
3. **Condição** (todas devem ser verdadeiras):
   - *Situacao* (ou *Situacao Value*) **é igual a** `Chegada`, **ou** é igual a `Entrada`;
   - expressão `greaterOrEquals(triggerBody()?['Created'], '2026-11-03T03:00:00Z')` **é igual a** `true`. Troque a data pela sua data de ativação; `03:00Z` é meia-noite em Brasília.
4. **No ramo "Sim"**, faça os passos 5 a 10.
5. **Obter itens** (SharePoint), na mesma lista:
   - **Consulta de filtro:** `Created ge '2026-11-03T03:00:00Z' and (Situacao eq 'Chegada' or Situacao eq 'Entrada')`;
   - **Contagem superior:** `5000`;
   - em **Configurações**, ative **Paginação** com limite `100000`.
6. **Compor** com o nome `n` e a expressão `length(body('Obter_itens')?['value'])`.
7. **Condição:** expressão `mod(outputs('n'), 5)` **é igual a** `0`.
8. **No ramo "Sim"**, use **Compor** com o nome `alerta`:

```json
{
  "id": ‹ID›,
  "ordem": ‹Saídas de n›,
  "placaCavalo": "‹Placa_cavalo›",
  "reboques": ["‹Placa_reboque1›", "‹Placa_reboque2›", "‹Placa_reboque3›"],
  "motorista": "‹Motorista›",
  "chegada": "‹Criado›",
  "mensagem": "@{concat('🚨 Vistoria 17 pontos — Portaria Distrito — Cavalo ', triggerBody()?['Placa_cavalo'], ' — Motorista ', triggerBody()?['Motorista'], ' — chegada ', triggerBody()?['Data'], ' ', triggerBody()?['Hora'], ':', triggerBody()?['Minuto'], ' (', outputs('n'), 'ª chegada)')}"
}
```

9. **Criar arquivo** no site do time:
   - **Caminho da Pasta:** `…/Portaria Tóliman/alertas`;
   - **Nome:** `DIS_@{triggerBody()?['ID']}.json`;
   - **Conteúdo:** Saída de `alerta`.
10. **Postar mensagem em um chat ou canal** (Microsoft Teams):
    - **Postar como:** Flow bot;
    - **Postar em:** Canal;
    - **Equipe e Canal:** o canal do GR;
    - **Mensagem:** a expressão `outputs('alerta')?['mensagem']`.
11. **Salve.** Para testar sem esperar 5 chegadas, troque temporariamente o `5` do passo 7 por `1`, crie um item de teste, confira o arquivo em `alertas/` e a mensagem no canal, e depois volte para `5`. Apague o arquivo de teste de `alertas/`.

O fluxo **não altera** o item no Lists, então o porteiro não vê nada. A fila do 17 pontos no painel é montada a partir dos arquivos em `alertas/`.

---

## Fluxos 3 a 6: cópia das listas de pessoas

Os fluxos 3 a 6 são cópias do fluxo 1 **sem os passos 3 a 5** (anexos). Para criar cada um:
1. No fluxo 1, use **"…" → Salvar como**.
2. Apague a variável de anexos, o *Obter anexos* e o *Aplicar a cada*.
3. Troque a lista do gatilho, o modelo do Compor e a pasta de destino conforme a tabela abaixo.

| Fluxo | Lista do gatilho | `lista` / `portaria` no Compor | Pasta |
|---|---|---|---|
| 3 | Registro de Visitantes  Distrito | `visitantes` / `DIS` | `listas/Distrito/visitantes` |
| 4 | Registro de Entrada e Saída  Distrito | `colaboradores` / `DIS` | `listas/Distrito/colaboradores` |
| 5 | Registro de Visitantes  Machado | `visitantes` / `MAC` | `listas/Machado/visitantes` |
| 6 | Registro de Entrada e Saída  Machado | `colaboradores` / `MAC` | `listas/Machado/colaboradores` |

**`campos` para Visitantes:**

```json
"campos": {
  "Nome": "‹Nome›", "RG/CNH": "‹RG/CNH›", "Placa_veiculo": "‹Placa_veiculo›",
  "Data": "‹Data›", "Entrada/Saída": "‹Entrada/Saída (ou Value)›", "Hora": "‹Hora›", "Minuto": "‹Minuto›",
  "Setor_visita": "‹Setor_visita (ou Value)›", "cracha": "‹cracha›", "hora_saida": "‹hora_saida›"
}
```

**`campos` para Colaboradores:**

```json
"campos": {
  "Nome": "‹Nome›", "Situação": "‹Situação (ou Value)›", "Veículo": "‹Veículo (ou Value)›", "Placa": "‹Placa›",
  "Data": "‹Data›", "Hora": "‹Hora›", "Minuto": "‹Minuto›", "Observação": "‹Observação›", "KM": "‹KM›"
}
```

Nos fluxos 3 a 6, `"anexos"` fica como `[]`.

**Machado:** exporte as duas listas para o Excel antes de criar os fluxos 5 e 6, e confira se as colunas têm os mesmos nomes da Distrito. Se algum nome for diferente, a chave no `campos` continua igual à da Distrito; só o conteúdo dinâmico escolhido é que muda.

---

## Depois de criar

1. **Coproprietário:** em cada fluxo, abra **Compartilhar** e adicione uma pessoa do GR ou o coordenador como **proprietário**. Sem isso, os fluxos param se a sua conta for desativada.
2. **Acompanhamento:** no painel, **Centro de controle → Alertas de dados** avisa quando uma lista passa mais de 24 h sem enviar registros. Se isso acontecer, abra o histórico de execuções do fluxo.
3. **Limites:** cada registro gasta poucas ações. O volume estimado, de cerca de 20 registros por dia por portaria, fica bem abaixo do limite diário do Microsoft 365.
4. **Exclusões:** um item **excluído** no Lists não some do painel. Use **Ocultar registro** no detalhe do registro.
