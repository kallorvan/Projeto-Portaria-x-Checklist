# Portaria Tóliman: como instalar

Painel das portarias (visitantes e prestadores, frota, colaboradores) com os checklists REG LOG 03 e REG LOG 04. Funciona no **Microsoft Edge** ou no **Google Chrome** do computador da portaria. Os dados ficam numa pasta do SharePoint.

## 1. Preparar a pasta (uma vez, pelo administrador)

1. No Teams, crie uma equipe (por exemplo, **"Portaria Tóliman"**) e coloque nela os porteiros, o GR e os administradores.
2. Na aba **Arquivos** do canal, crie a pasta **Portaria Tóliman**.
3. Copie para dentro dela o conteúdo deste pacote: `painel.html`, `LEIA-ME.md` e as pastas `lib/`, `js/` e `entrega/`.
4. Dentro da pasta, crie a pasta `fotos-entrada` e, dentro dela, uma pasta por portaria: `Machado`, `JoaoPessoa` e `Distrito`.
5. As pastas `eventos/`, `presenca/`, `fotos/`, `checklists/` e `alertas/` são criadas pelo próprio painel. **Não edite, não mova e não apague** os arquivos delas.

## 2. Em cada computador de portaria

1. No SharePoint (ou em "Abrir no SharePoint", pelo Teams), abra a pasta **Portaria Tóliman** e clique em **Sincronizar** ou em **Adicionar atalho a Meus arquivos**. Assim ela aparece no Explorador de Arquivos.
2. Abra o `painel.html` dessa pasta no **Edge** ou no **Chrome**. Dica: crie um atalho na área de trabalho.
3. Clique em **Escolher pasta** e selecione a mesma pasta **Portaria Tóliman**. Depois, permita a leitura e a gravação.
4. No primeiro acesso de todos, o administrador cria a senha.
5. Em cada computador, escolha **a portaria** desse computador e depois **o seu nome**.
6. O navegador lembra a pasta, a portaria e o nome. Em algumas aberturas, ele pede para confirmar o acesso à pasta com um clique.

## 3. Fotos pelo celular (app OneDrive)

1. Instale o app **Microsoft OneDrive** no celular e entre com a conta da empresa.
2. Abra **Compartilhado** (ou **Meus arquivos**, se usou o atalho) → **Portaria Tóliman** → **fotos-entrada** → a pasta da sua portaria.
3. Toque em **+** → **Tirar uma foto** (ou **Carregar**, para fotos já tiradas).
4. Deixe a câmera do celular em **JPG**. No iPhone, isso fica em **Ajustes → Câmera → Formatos → Mais compatível**, porque o painel não lê fotos HEIC.
5. No computador, em cada região de avaria, item do 17 pontos ou foto de crachá, clique em **Adicionar fotos**.
6. Marque as fotos que pertencem àquele ponto. O painel reduz o tamanho, renomeia e move cada foto para `fotos/`.

## 4. Alerta no Teams para o GR

Siga `entrega/power-automate-alerta-gr.md`. É um fluxo do Power Automate que publica no canal do GR a cada vistoria 17 pontos.

## 5. Cadastros

Na aba **Cadastros**, o administrador inclui veículos e funcionários, ou importa uma planilha CSV. Os modelos estão em `entrega/modelo-cadastro-veiculos.csv` e `entrega/modelo-cadastro-funcionarios.csv`. Para usar um modelo:
1. Abra no Excel e preencha.
2. Salve como **CSV (separado por vírgulas)** ou **CSV UTF-8**.
3. Importe na aba Cadastros.

## Bom saber

- **Gravação:** cada registro é salvo na hora, num arquivo próprio em `eventos/`. Isso evita que uma pessoa apague o trabalho de outra.
- **Sincronização:** registros de outras portarias aparecem quando o OneDrive sincroniza, normalmente em segundos a poucos minutos. O painel relê a pasta a cada 20 segundos e sempre que você volta para a janela.
- **Regra do 5º veículo:** cada portaria conta as suas chegadas da frota, e a 5ª, 10ª, 15ª… vai para a vistoria 17 pontos do GR. **Forçar** e **Dispensar** pedem justificativa e não mudam a contagem.
- **PDFs dos checklists:** ficam em `checklists/<portaria>/<ano-mês>/`.
- **Modo demonstração:** para testar ou treinar sem mexer na pasta real, sirva a pasta por `http://localhost` e abra `painel.html?demo=1`. Os dados ficam só naquele navegador.
- **Segurança:** o painel não tem login de verdade, e qualquer pessoa com acesso à pasta pode alterar os arquivos. Restrinja o acesso ao time.
