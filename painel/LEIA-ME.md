# Centro de controle da Portaria Tóliman: como instalar

Painel do **GR** e do **coordenador**. Nele, eles:
- acompanham o fluxo de pessoas da **Distrito** e da **Machado** e a frota no pátio da Distrito;
- fazem as vistorias **REG LOG 03** (toda chegada da frota) e **REG LOG 04** (17 pontos, a cada 5 chegadas).

Os porteiros continuam registrando tudo no **Microsoft Lists**, como hoje. O Power Automate copia os registros para a pasta do painel.

O painel funciona no **Microsoft Edge** ou no **Google Chrome**, no computador.

## 1. Preparar a pasta (uma vez)

1. No Teams, crie uma equipe **Portaria Tóliman** só com o GR e a coordenação. A pasta guarda cópias de documentos de visitantes.
2. Na aba **Arquivos**, crie a pasta **Portaria Tóliman** e copie para dentro dela `painel.html`, `LEIA-ME.md` e as pastas `lib/`, `js/` e `entrega/`.
3. Crie também as pastas `listas/`, `alertas/`, `fotos/Distrito/ctrc/` e `fotos-entrada/Distrito/`.
4. Monte os 6 fluxos seguindo `entrega/power-automate-fluxos.md`.
5. **Não edite nem apague** os arquivos de `listas/`, `alertas/` e `eventos/`.

## 2. Em cada computador do GR e da coordenação

1. No SharePoint, abra a pasta **Portaria Tóliman** e clique em **Sincronizar** (ou em **Adicionar atalho a Meus arquivos**).
2. Abra o `painel.html` dessa pasta no Edge ou no Chrome.
3. Clique em **Escolher pasta**, selecione a pasta **Portaria Tóliman** e permita leitura e gravação.
4. No primeiro acesso, quem administra cria a senha. Depois, na aba **Pessoas**, ele cadastra cada pessoa com o papel **GR** ou **Coordenador**.
5. Escolha o seu nome. O navegador lembra a pasta e o nome.

## 3. Fotos da vistoria (celular)

1. No app **OneDrive**, abra **Portaria Tóliman → fotos-entrada → Distrito** e use a câmera (deixe a câmera do celular em JPG).
2. No painel, dentro do checklist, use **Adicionar fotos** em cada região ou item. As fotos são reduzidas, renomeadas e vinculadas automaticamente.

As fotos do **CTRC** que o porteiro tira no Lists chegam sozinhas pelo fluxo 1 e aparecem na aba Frota e no REG LOG 03.

## Bom saber

- **Atraso:** um registro feito no Lists aparece no painel em 1 a 5 minutos (tempo do fluxo mais a sincronização do OneDrive).
- **Correções:** são feitas **no Lists** (o link "Ver no Lists" fica em cada registro). Um item excluído no Lists continua no painel: use **Ocultar registro**.
- **Regra do 5º veículo:** fica no fluxo 2. **Forçar** e **Dispensar** a vistoria são feitos no painel, com justificativa.
- **PDFs dos checklists:** ficam em `checklists/Distrito/<ano-mês>/`.
- **Modo demonstração:** sirva a pasta por `http://localhost` e abra `painel.html?demo=1`.
