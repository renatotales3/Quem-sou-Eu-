# Padrão: como depurar "Timeout esperando <evento>" na suíte de integração

**Tags:** #testes #socketio #depuracao

## O sintoma engana

`tests/game.integration.test.ts` sobe um Socket.IO real. Quando um teste falha
com `Timeout esperando <evento>`, o instinto é culpar lentidão, contenção de
CPU ou paralelismo do vitest. Na prática já foi, pelo menos uma vez, **o
servidor respondendo por outro canal**: o teste espera `guess:result`, o
servidor manda `error`, e a espera fica pendurada até o prazo de 15s.

## A técnica

`waitForEvent` só escuta o evento esperado, então descarta a resposta real.
Para descobrir o que o servidor de fato mandou, instrumente **temporariamente**
a função: registre um listener de `error` no mesmo socket, acumule os payloads
e inclua no texto da rejeição.

Isso transforma "Timeout esperando guess:result" em
"Timeout esperando guess:result :: erros recebidos: [{code: INVALID_GUESS...}]"
— e o diagnóstico deixa de ser adivinhação. Reverta a instrumentação depois.

## Antes de culpar o ambiente

1. Rode **só o arquivo de integração** várias vezes. Se falha sozinho, não é
   contenção com as outras suítes.
2. Anote **quais** testes falham. Se variam mas compartilham um traço (todos
   com sorteio de personagem, todos multi-rodada), o traço é a pista.
3. Só depois considere prazo, paralelismo ou recursos.

## Nota de contexto

Os clientes criados nos testes se acumulam em `managerClients` e só são
desconectados no `afterAll` — ao fim do arquivo há muitas conexões vivas contra
um servidor só. Isso foi investigado e **não** era a causa do flake conhecido,
mas segue sendo um candidato caso apareça lentidão real no futuro.
