# Painel HTML numa pasta do SharePoint sincronizada, sem a TI

O usuário queria o painel acessível no Teams e no celular, com login da empresa e dados no SharePoint, sem envolver a TI nesta fase. O login Microsoft e o acesso pelo Microsoft Graph exigem registrar um aplicativo no Entra ID. Ao tentar, o portal respondeu com bloqueio de Acesso Condicional ("Sua entrada teve êxito mas não corresponde aos critérios para acessar este recurso").

Decidimos seguir o modelo do projeto Raster, já em uso na Tóliman:
- `painel.html` numa pasta da biblioteca de um time do Teams, sincronizada pelo OneDrive em cada computador de portaria;
- aberto no Edge ou Chrome;
- gravação de um JSON imutável por alteração.

O celular entra só para enviar fotos pelo app OneDrive.

## Opções consideradas

- **Microsoft Graph com login Microsoft** (HTML hospedado, roda em computador, celular e Teams): bloqueado pela TI. Fica como fase 2.
- **App próprio com Supabase e login por código no e-mail corporativo:** funciona no celular, mas tira os dados (inclusive fotos de documentos de visitantes) do Microsoft 365 e tem custo.
- **Power Apps:** roda no celular sem TI, mas não é HTML e limita o visual e a lógica.

## Consequências

- O painel só roda no computador (Edge/Chrome), não na aba do Teams nem no celular.
- Alterações de outras portarias chegam com o atraso do OneDrive. A contagem do 5º veículo é por portaria (ADR 0002) para não depender disso.
- Não há login: a pessoa é escolhida por nome.
- O acesso a arquivos fica isolado num módulo, para a troca futura pelo Graph.
