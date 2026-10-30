# Portaria x Checklist — Especificação (versão de testes)

Data: 30/10/2026 · Status: **aguardando revisão do usuário**

Origem: `docs/referencia/Projeto Portaria x Checklist.md` e as fichas REG LOG 03 e REG LOG 04 em `docs/referencia/`. As decisões abaixo foram fechadas em entrevista (formato *grilling*) com o usuário. Os termos seguem o [`GLOSSARY.md`](../../../GLOSSARY.md).

## 1. Objetivo

Substituir as Microsoft Lists usadas hoje nas portarias por um **painel HTML** compartilhado pela equipe. O painel registra a entrada e saída de **visitantes e prestadores**, **colaboradores** e da **frota** nas 3 portarias:

- Tóliman Machado (`MAC`)
- Tóliman João Pessoa (`JP`)
- Tóliman Distrito (`DIS`)

O painel também guarda o histórico dos checklists de veículos:

- **REG LOG 03 – Inspeção Veicular Operacional:** em toda chegada da frota.
- **REG LOG 04 – Inspeção de Segurança 17 pontos:** a cada 5 chegadas da frota em cada portaria, feita pela equipe de GR, que é avisada no Teams.

Sucesso para a versão de testes: as 3 portarias registram movimentações e checklists no painel durante o piloto, o GR recebe o alerta no Teams a cada 5ª chegada, e os dados ficam na pasta do SharePoint.

## 2. Restrições e arquitetura

- **Sem a TI.** O acesso condicional da Dinamo bloqueia o registro de aplicativos no Entra ID, então não há Microsoft Graph nem login Microsoft (ver ADR 0001).
- **No molde do projeto Raster** (`kallorvan/raster`):
  - `painel.html` numa pasta da biblioteca de um time do Teams, sincronizada pelo OneDrive em cada computador de portaria;
  - aberto no Edge ou Chrome por `file://`;
  - leitura e gravação pela File System Access API (`showDirectoryPicker`), com o handle da pasta guardado no IndexedDB.
- **Armazenamento por eventos:** cada alteração é um arquivo JSON imutável em `eventos/`. O estado é recalculado a partir de todos os eventos, e nunca existe um arquivo único reescrito (evita conflito do OneDrive).
- **Celular só para fotos**, enviadas pelo app OneDrive para uma pasta de entrada. O painel não roda no celular nem dentro da aba do Teams nesta fase.
- **Releitura** da pasta a cada 20 s e ao voltar para a janela. **Presença** gravada a cada 60 s.
- **Visual "Tóliman Painéis"**, o mesmo do Raster:
  - cores `--ink #1C2543`, `--coral #DD4663`, `--mauve #AE82B1`, `--sand #F4D38D`;
  - fontes Archivo e IBM Plex Mono;
  - abas com sublinhado tricolor, KPIs, hero e tabelas com cabeçalho `--ink`.
- **Fase 2 (fora deste escopo):** se a TI registrar um app no Entra ID, só a camada de gravação é trocada pelo Microsoft Graph, liberando celular, aba do Teams e login Microsoft. Por isso o acesso a arquivos fica isolado num módulo próprio (`armazenamento`).

### Estrutura da pasta

```
Portaria Tóliman/
  painel.html, LEIA-ME.md, lib/
  eventos/<portaria>/<AAAAMMDD-HHMMSS>_<pessoa>_<id>.json   ← não editar
  eventos/geral/...                                          ← cadastros e pessoas
  presenca/<pessoa>__<pc>.json
  fotos-entrada/<Machado|JoaoPessoa|Distrito>/               ← o celular envia para cá
  fotos/<portaria>/<AAAA-MM>/<nº checklist ou registro>_<região>_<n>.jpg
  checklists/<portaria>/<AAAA-MM>/<nº checklist>_<PLACA>.pdf
  alertas/<portaria>_<PLACA>_<AAAAMMDD-HHMM>_<id>.json      ← gatilho do Power Automate
```

## 3. Pessoas, papéis e computador

- **Pessoa:** quem opera o painel, escolhida por nome. Não é login. Tem um ou mais **papéis**:
  - **Porteiro:** registros de permanência e REG LOG 03.
  - **GR:** preenche e dispensa o REG LOG 04 e vê as pendências das 3 portarias.
  - **Administrador:** cadastros (pessoas, veículos, funcionários) e correções.
- **Senha do administrador:** guardada como SHA-256 de `salt:senha`, como no Raster. **Não é segurança forte:** quem tem acesso à pasta pode editar os arquivos.
- **Portaria do computador:** escolhida no primeiro acesso e lembrada (localStorage). A pessoa com papel GR pode alternar entre as 3 portarias.

## 4. Cadastros (únicos para as 3 portarias, mantidos só pelo Administrador)

**Veículo**
- placa;
- tipo: Cavalo, Reboque, Veículo leve;
- modelo/descrição;
- vínculo: Próprio ou Agregado/Terceiro;
- ativo ou inativo (desativar preserva o histórico).

**Funcionário**
- nome, matrícula, setor/função;
- motorista (sim/não) e, se for motorista, nº e validade da CNH;
- ativo ou inativo.

**Regras dos cadastros**
- **Fora do cadastro:** placa ou funcionário que não está no cadastro pode ser registrado normalmente na portaria. O registro fica marcado **"fora do cadastro"** e aparece numa lista para o Administrador completar. A portaria nunca para.
- **CNH:** vencida, ou vencendo em até 30 dias, gera aviso na chegada da frota, **sem bloquear**.
- **Importação inicial:** planilha CSV/Excel com modelo de colunas fornecido, para veículos e funcionários.

## 5. Registros de permanência

Cada entrada abre uma **permanência**. Na saída, o porteiro localiza a permanência aberta e clica em **Registrar saída** (data e hora automáticas). Uma saída sem entrada registrada pode ser lançada como **saída avulsa**.

Em todo registro, data, hora, portaria, "criado por" e "data de criação/modificação" são automáticos. Correções viram um novo evento, e o registro mostra o histórico.

| Tipo | Campos da entrada | Na saída |
|---|---|---|
| **Visitante/Prestador** | Nome, Documento, Placa do veículo (opcional), Setor a visitar, Nº do crachá, Foto do crachá (via fotos do celular), Observação, categoria Visitante ou Prestador | Data/hora. Crachá devolvido (sim/não) |
| **Frota** | Placa do cavalo, Reboques 1–3, Motorista, KM, CTRC 1, CTRC 2, Observação | Data/hora, KM de saída (opcional) |
| **Colaborador** | Funcionário, Veículo (Nenhum/Próprio/Empresa), Placa e KM (obrigatórios só com veículo da empresa, placa vinda do cadastro de veículos leves), Observação | Data/hora, KM (se for veículo da empresa) |

Não há checklist para carro da empresa nesta versão.

## 6. REG LOG 03 – Inspeção Veicular Operacional

Preenchido **em toda chegada da frota**, logo após registrar a entrada (só na chegada). Blocos:

1. **Cabeçalho automático:**
   - nº do checklist `<PORTARIA>-03-<seq 6 dígitos>`, por exemplo `MAC-03-000127` (sequência por portaria e tipo);
   - portaria, data e hora;
   - placas do cavalo e dos reboques, vindas da permanência.
2. **Limpeza e organização interna:** limpo e organizado, contém lixo espalhado, contém mau odor (Sim/Não cada).
3. **Avarias por região**, uma lista no lugar do desenho:
   - cavalo: lado motorista, frente, lado carona;
   - cada reboque informado: lado motorista, lado carona, traseira;
   - em cada região: "sem avarias" ou códigos **A** amassado, **R** riscado, **F** faltando, **Q** quebrado, **C** cortado, **M** marcado guia (vários por região), descrição e fotos.
4. **Preenchimento exclusivo do motorista:**
   - AET São Paulo, AET Minas Gerais, AET DENIT, CNH, CRLV;
   - verificar luzes, óleo do motor e água;
   - condição da cabine (Ótimo/Regular/Ruim);
   - CRLV do reboque 1 e do reboque 2;
   - verificar locks, eixos/suspensão e bater pneus.
5. **Carretas:** quantidade de estepes, carreta dianteira, carreta traseira.
6. **Container e lacre.**
7. **Assinaturas:**
   - o vistoriador/conferente é a pessoa do painel;
   - nomes do motorista, porteiro e líder;
   - o PDF sai com linhas de assinatura em branco para assinatura física opcional.

## 7. REG LOG 04 – Inspeção de Segurança 17 pontos

### 7.1 Regra do 5º veículo

- Cada portaria conta **suas chegadas da frota**. A saída não conta, e as chegadas de visitantes ou colaboradores também não.
- A 5ª, 10ª, 15ª… chegada gera uma **vistoria 17 pontos pendente** e um **alerta**. A contagem é derivada dos eventos de chegada da frota da portaria, em ordem de data e hora.
- **Forçar 17 pontos:** disponível em qualquer chegada da frota, com justificativa obrigatória. **Não altera** a contagem.
- **Dispensar pendência:** só pessoa GR, com justificativa obrigatória. A contagem segue.
- **Na tela de chegada:**
  - aviso "faltam N veículos para a próxima vistoria de 17 pontos";
  - no 5º veículo, destaque **"Este veículo vai para vistoria GR"**.
- **O veículo entra normalmente:** o GR vistoria depois. A pendência fica na **fila do GR**, com o tempo de espera, até o REG LOG 04 ser concluído ou dispensado.

### 7.2 Ficha

Preenchida **só por pessoa GR**.

- **Cabeçalho:**
  - nº `<PORTARIA>-04-<seq>`, unidade, data da vistoria, motorista;
  - placa do cavalo e semirreboques 1–3, preenchidos a partir da chegada.
- **Lacres:**
  - armador (×2) e exportador (×2);
  - alfandegário e provisório Tóliman;
  - segurança/container vazio inspecionado e aprovado.
- **Containers:** nº dos containers 1 e 2.
- **Tipo de carga:** carregado com container vazio, carregado com container com carga, ou vazio (sem container).
- **17 itens:** Conforme, Não conforme ou Não aplicável, com observação e fotos por item.
  1. Para-choque
  2. Motor
  3. Pneus
  4. Piso da unidade tratora
  5. Tanque de combustível
  6. Cabine
  7. Reservatório de ar
  8. Eixo de transmissão
  9. Quinta roda
  10. Sistema de exaustão
  11. Chassi
  12. Portas
  13. Lateral direita
  14. Lateral esquerda
  15. Parede frontal
  16. Teto
  17. Piso do compartimento de carga
- **Itens 12 a 17 travados:** ficam em "Não aplicável" quando o veículo está carregado com container com carga, ou com container vazio já lacrado com lacre de segurança. O lacre de container vazio preenchido é o sinal de "já lacrado".
- **Não conforme:** exige observação, e o checklist fica **em vermelho** no histórico. Não há segundo alerta no Teams nesta versão.
- **Fechamento:** observações gerais, conferente (a pessoa GR) e nome do líder da Tóliman Matriz.

## 8. Checklists: comum aos dois

- **PDF automático** ao concluir:
  - layout da ficha, com logo, nº de registro (LOG 03/LOG 04), revisão e data da revisão;
  - salvo em `checklists/<portaria>/<AAAA-MM>/`, com as fotos vinculadas.
  - Gerado com uma biblioteca JS local em `lib/` (sem internet).
- **Correção** depois de concluído: por quem preencheu ou pelo Administrador, com motivo. Cria uma nova versão, regera o PDF (`…_v2.pdf`) e mostra o histórico de versões.
- **Aba Checklists:** histórico com filtro por portaria, tipo, placa e período. Abre o PDF e destaca os com Não conforme. A fila do GR fica no topo.

## 9. Fotos pelo celular

1. O vistoriador fotografa com o app OneDrive direto para `fotos-entrada/<Portaria>/`.
2. No painel, cada região de avaria, item do 17 pontos e cadastro de visitante tem **Adicionar fotos**, que mostra as miniaturas da pasta da portaria (mais recentes primeiro). A pessoa marca as fotos daquele ponto.
3. Ao vincular, o painel:
   - reduz a foto para no máximo 1600 px (JPEG);
   - grava em `fotos/…` com nome padronizado;
   - remove a original da pasta de entrada.
4. Fotos com mais de **7 dias** sem vínculo aparecem como aviso ao Administrador. O painel nunca apaga fotos sozinho.

## 10. Alerta no Teams (Power Automate)

- O painel grava `alertas/<…>.json` com portaria, placas, motorista, data e hora da chegada, nº da pendência e um campo `mensagem` pronto.
- **Fluxo do Power Automate** (só conectores padrão, criado pelo usuário):
  - gatilho SharePoint "Quando um arquivo é criado em uma pasta" (pasta `alertas`);
  - obter conteúdo do arquivo e analisar o JSON;
  - Teams "Postar mensagem em um chat ou canal", num **canal único do GR**.
- Exemplo de mensagem: *"🚨 Vistoria 17 pontos — Portaria Machado — Cavalo ABC1D23 / Reb. XYZ9K87 — Motorista Fulano — chegada 30/10 14:32"*.
- Atraso esperado: 1 a 5 minutos. O passo a passo vai junto com a entrega.

## 11. Abas do painel

1. **Início:**
   - KPIs da portaria: no local agora (visitantes, prestadores, colaboradores, frota), entradas do dia, crachás não devolvidos, vistorias 17 pontos pendentes;
   - contador para o próximo 17 pontos;
   - fotos aguardando vínculo;
   - quem está no painel agora.
2. **Visitantes e Prestadores:** nova entrada, lista "no local agora" com Registrar saída, e histórico.
3. **Frota:** nova chegada (que abre o REG LOG 03), no local agora, saída e histórico.
4. **Colaboradores:** entrada e saída, no local agora, histórico.
5. **Checklists:** fila do GR e histórico do REG LOG 03 e 04.
6. **Cadastros** (Administrador): veículos, funcionários, fora do cadastro, importar planilha.
7. **Pessoas** (Administrador): pessoas e papéis.

Cada aba de registro tem **Exportar CSV** por período.

## 12. Eventos (rascunho)

Este rascunho é refinado no plano de implementação.

| Grupo | Eventos |
|---|---|
| Pessoas | `pessoa_adicionada`, `pessoa_removida`, `papeis_definidos`, `admin_definido` |
| Cadastros | `veiculo_cadastrado`, `veiculo_alterado`, `veiculo_desativado`, `veiculo_reativado`, e os equivalentes para `funcionario_*` |
| Permanências | `entrada_registrada` (tipo visitante/frota/colaborador), `saida_registrada`, `saida_avulsa_registrada`, `registro_corrigido` |
| Checklists | `checklist03_concluido`, `checklist03_corrigido`, `vistoria17_pendente_criada` (automática ou forçada), `vistoria17_dispensada`, `checklist04_concluido`, `checklist04_corrigido` |
| Fotos | `foto_vinculada` |

Cada evento tem `id`, `tipo`, `portaria`, `pessoa`, `pc`, `em` (ISO) e `dados`.

**A pendência automática do 17 pontos não é um evento gravado:** ela é derivada da contagem. Só forçar, dispensar e concluir geram eventos. Isso evita duplicidade quando dois painéis da mesma portaria estão abertos.

## 13. Testes e entrega

- **Regras em `painel/lib/*.js`**, carregáveis no Node, com testes `node --test`:
  - contagem do 5º veículo por portaria, com forçar e dispensar;
  - travamento dos itens 12–17;
  - Não conforme exige observação;
  - abertura e fechamento de permanência, e saída avulsa;
  - sequência do nº de checklist;
  - fora do cadastro e aviso de CNH.
- **Modo demonstração** `painel.html?demo=1` (OPFS do navegador), para testes e treinamento.
- **Teste de ponta a ponta com Playwright** no modo demonstração.
- **Entrega:**
  - `portaria-toliman.zip` (painel + lib + LEIA-ME);
  - passo a passo do Power Automate;
  - modelo de planilha para a importação de cadastros.
  - O manual ilustrado fica para depois da validação.
- **Documentação:** `GLOSSARY.md`, `docs/adr/`, `docs/HANDOFF.md`.

## 14. Fora do escopo desta versão

- Uso no celular ou na aba do Teams.
- Login Microsoft.
- Checklist de carro da empresa.
- Desenho clicável de avarias.
- Segundo alerta por Não conforme.
- Importação do histórico das Lists.
- Manual ilustrado.

## 15. Limitações conhecidas

- **Atraso de sincronização:** alterações de outra portaria chegam com o atraso do OneDrive (segundos a minutos). A contagem do 5º veículo é por portaria, então não é afetada entre portarias. Com dois computadores na mesma portaria, chegadas simultâneas podem ser contadas um pouco depois.
- **Sem segurança de acesso real:** qualquer pessoa com acesso à pasta pode editar os arquivos.
- **Fotos de visitantes e documentos são dados pessoais (LGPD):** ficam restritas ao time do Teams. A política de retenção fica a definir com a empresa.
