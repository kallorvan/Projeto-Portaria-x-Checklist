Projeto Portaria x Checklist



Criar para ser compartilhado por uma equipe dentro do SharePoint, uma aplicação em HTML que gerencie a entrada e saída dos colaboradores, visitantes e prestadores de serviço, e nossa frota.



Para a nossa Frota teremos uma regra: Todos os nossos veículos da frota ao entrar são vistoriados, mas a cada 5 que entram o quinto recebe uma vistoria mais profunda com 17 pontos de verificação, e para esses precisamos que um alerta seja disparado para a equipe de GR, responsáveis por essas verificações.



Precisamos colocar dentro dessa aplicação um modulo com esses checklists, tanto o feito em todos os veículos da frota como o de 17 pontos, para manter um histórico. 

Para o checklist de todos os veículos temos o PDF "REG LOG 03 - Ficha para Inspeção Veicular Operacional rev 20Agosto. pdf" e para o checklist de 17 pontos temos o checklist "REG LOG 04 - Ficha para Inspeção de Segurança de Veiculos 17 pontos rev 20Agosto2025". PDFs estarão em anexo.



Hoje utilizamos o "Lists" da Microsoft, vamos usar a mesma base, o SharePoint, para armazenar essa aplicação e seus dados.



Temos 3 portarias diferentes



Portaria Tóliman Machado, Portaria Tóliman João Pessoa, e Portaria Tóliman Distrito.



Para as Portarias temos 3 segmentos distintos, segue:



* Registro de Visitantes e Prestadores 
* Registro de Frota.
* Registro de Entrada e Saída de Colaboradores. 



Cabeçalho para o registro de visitantes e prestadores:



|Nome|Documento|Placa Veículo|Entrada/Saída|Data|Hora|Setor a visitar|N° Crachá|Data Criação/Modificação|Criado por:|Foto Crachá|
|-|-|-|-|-|-|-|-|-|-|-|



Cabeçalho para o registro de Frota:



|Placa Cavalo|Placa Reboque\_1|Placa Reboque\_2|Placa Reboque\_3|Motorista|Situação|KM|Data|Horas|CTRC\_1|CTRC\_2|Data Criação/Modificação|
|-|-|-|-|-|-|-|-|-|-|-|-|



Cabeçalho para o registro de Entrada e Saída de Colaboradores:



|Nome|Situação|Veiculo|Placa|Data|Hora|Observação|Checklist|KM|
|-|-|-|-|-|-|-|-|-|



Todos os cabeçalhos podem ser modificados conforme a aplicação for sendo criada.



Visual da aplicação, seguir o Design systems "Tóliman Painéis".



Skills para ser utilizada na criação inicial da aplicação:



grill-me (mattpocock)
find-skills (Vercel-labs)









