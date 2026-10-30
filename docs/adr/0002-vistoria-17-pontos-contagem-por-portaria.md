# Vistoria 17 pontos: contagem por portaria, derivada dos eventos

A cada 5 chegadas da frota, uma recebe a vistoria de 17 pontos (REG LOG 04) feita pelo GR. A contagem é **por portaria** e considera só as chegadas da frota. A pendência automática **não é gravada como evento**: ela é recalculada a partir das chegadas, em ordem de data e hora. Só as exceções (forçar, dispensar) e a conclusão viram eventos.

## Opções consideradas

- **Contagem geral das 3 portarias:** sujeita ao atraso do OneDrive, com duas portarias podendo "pegar" o mesmo número.
- **Contagem por placa:** não é o que a operação pede.
- **Gravar a pendência como evento no momento da chegada:** dois painéis abertos na mesma portaria poderiam gravar a mesma pendência duas vezes.

## Consequências

- Forçar não altera a contagem, e dispensar não a reinicia.
- O alerta no Teams é um arquivo em `alertas/`. Para não haver alerta duplicado, quem grava é o painel que registrou a chegada.
