# Gotcha: a validação de palpite e o catálogo são acoplados

**Tags:** #gotcha #servidor #catalogo #testes

## O problema

`server/game.ts:guess()` recusa palpite cujo texto normalizado seja menor que
`MIN_GUESS_LENGTH`. `server/wordlist.ts` define os nomes dos personagens. Nada
no código ligava os dois — e o catálogo tem **"L"** (`character-0104`), de uma
letra só.

Com o piso em 2, quem recebia o "L" digitava o nome certo, levava
`INVALID_GUESS` ("Digite um palpite com pelo menos 2 caracteres") e **nunca
conseguia acertar**. Como `finishRound` só dispara com `everyoneSolved`, a
rodada inteira travava — para todo mundo, não só para quem tinha o "L".

## Como isso se disfarçava

Na suíte, aparecia como **flake intermitente**: `Timeout esperando guess:result`
em testes variados e sem relação entre si (POOL-01, SCORE-01, SCORE-03,
SCORE-06, SCORE-18, HINT-17...). O motivo é estatístico: são ~70 sorteios de
personagem por execução num acervo de 304, então a chance de o "L" sair em
algum ponto é ≈20%. Medido: 2 falhas em 6 execuções, 3 em 8.

A pista decisiva foi instrumentar `waitForEvent` em `tests/game.integration.test.ts`
para incluir os eventos `error` recebidos na mensagem de timeout. O teste
esperava `guess:result`, mas o servidor tinha respondido `error` — dois canais
diferentes, então a espera nunca resolvia.

## A regra

**O piso do palpite não pode ser maior que o menor nome do catálogo.** Qualquer
nome que normalize abaixo de `MIN_GUESS_LENGTH` vira personagem insolúvel.

O guard-rail está em `tests/wordlist.test.ts`, no teste
"todo nome e alias do catálogo é aceitável como palpite": ele importa
`MIN_GUESS_LENGTH` de `server/game.ts` e falha se qualquer nome ou alias ficar
abaixo. Adicionar um "V" ou "Q" ao acervo quebra a suíte em vez de virar bug
silencioso em produção.

## Ver também

- `server/game.ts` — `MIN_GUESS_LENGTH` e `guess()`
- `server/normalization.ts:normalizeText()` — remove tudo que não é `[a-z0-9]`,
  então nome de símbolos também zeraria
- `tests/game.integration.test.ts` — "palpite de uma letra (MIN_GUESS_LENGTH)"
