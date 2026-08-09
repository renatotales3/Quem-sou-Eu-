# Power-up de Dica — Validation (rodada 2)

**Date**: 2026-08-09
**Spec**: `.specs/features/powerup-de-dica/spec.md`
**Diff range**: `c3c0985..ce4ad2c` (branch `feat/powerup-de-dica`, 14 commits — 3 de correção: `23fea84`, `a369208`, `ce4ad2c`)
**Verifier**: sub-agente independente (author ≠ verifier), evidence-or-zero, cobertura re-derivada do zero
**Verdict**: ✅ **PASS** — 8/8 mutantes mortos, gate verde em 4 de 4 execuções, 1 ⚠️ spec-precision gap registrado (não bloqueante)

Esta rodada re-deriva a cobertura por conta própria; o relatório da rodada 1 foi lido apenas para saber o que havia sido reprovado.

---

## Veredito sobre as três lacunas da rodada 1

### Lacuna 1 — HINT-21 sem cobertura efetiva → **RESOLVIDA** ✅

O mecanismo alegado foi confirmado no código, não aceito de palavra:

```
server/game.ts:568-575
    if (room.players.size === 0) { this.rooms.delete(room.code); return; }
    if (room.phase === 'playing') {
      this.resetAfterDeparture(room);
    }
```

`resetAfterDeparture` (`server/game.ts:778-794`) é o único outro escritor de `hintsUsed`/`hintRequestTargetId` no caminho de saída, e roda **apenas** sob `room.phase === 'playing'`. O teste novo (`tests/game.integration.test.ts:1939-1962`) encerra a rodada com `round:endEarly` antes da saída, ancora a fase com `expect(getInternalRoomPhase(roomCode)).toBe('finished')` (`:1951` e `:1958`) e ancora o estado pré-saída em `{hintsUsed: 1, hintRequestTargetId: guestId}` (`:1952`). Em `finished`, o único caminho que pode zerar `hintsUsed` do host é `releaseHintRequestsTargeting` na linha 563. `startRound` (`:529-530`) e `playAgain` (`:495-496`) também não estão no caminho.

Reexecutei o mutante M1 (remoção da chamada da linha 563): **morre**, e morre pelo teste certo — `× ... a saída do alvo pelo botão cancela o pedido e devolve o power-up (HINT-21)`, falha única na suíte.

### Lacuna 2 — clamp de `hintsUsed` não exercitado → **RESOLVIDA** ✅

`tests/game.integration.test.ts:1972-1991`. O primeiro `hint:cancel` (`:1977`) leva `hintsUsed` a 0 e `hintRequestTargetId` a `null`. O `seedHintState(roomCode, hostId, 0, guestId)` (`:1984`) repõe um alvo pendente com o gasto já em zero, de modo que o segundo `hint:cancel` (`:1986`) **passa** pela guarda `if (!player.hintRequestTargetId) return` (`server/game.ts:446`) e chega em `releaseHintRequest(player, true)` → `Math.max(0, player.hintsUsed - 1)` (`server/game.ts:456`) com `hintsUsed === 0`. Confirmado empiricamente: o mutante M2 (`Math.max(0, …)` → `player.hintsUsed - 1`) **morre**, e a única falha é `× ... hintsUsed nunca fica negativo sob cancelamentos repetidos (HINT-23)`.

**Nota (não bloqueante):** o estado `hintsUsed === 0` com pedido pendente é inalcançável em produção — `requestHint` sempre incrementa antes de gravar o alvo (`server/game.ts:410-411`). O clamp é uma defesa em profundidade, e o teste o exercita por um backdoor de teste. Isso é aceitável: HINT-23 é uma invariante ("nunca negativo"), e invariantes se testam justamente forçando o estado que a produção evita.

### Lacuna 3 — HINT-04 vazia + código morto → **RESOLVIDA com ressalva** ⚠️

Li `git diff c3c0985..HEAD -- .specs/features/powerup-de-dica/spec.md` com desconfiança máxima. A reescrita **não é cosmética**, por três razões verificáveis:

1. **A AC mudou de classe lógica.** A redação antiga ("o servidor SHALL parar de conceder power-ups a ele nas liberações seguintes") descrevia um efeito de estado armazenado que o desenho derivado nunca produz — não havia nada a observar. A nova ("SHALL impedir que ele obtenha ou gaste power-up em qualquer liberação posterior, pela mesma guarda de HINT-16") aponta para um comportamento de servidor real, executável e já testado: a recusa `ALREADY_SOLVED` em `server/game.ts:387-390`, asserida em `tests/game.integration.test.ts:1840-1841` com o código de erro exato **e** o estado preservado (`toEqual({hintsUsed: 0, hintRequestTargetId: null})`).
2. **A reescrita é declarada, não dissimulada.** Foi adicionada uma linha na tabela de premissas ("Redação de HINT-04", decidida pelo usuário com `y`) que explicita que a redação original descrevia um efeito inobservável e que a evidência agora é compartilhada com HINT-16. Uma reescrita para "caber no código" esconderia isso; esta a documenta.
3. **O código morto sumiu junto.** `ce4ad2c` remove o ternário `me?.solved ? me.solveMs : elapsedMs` de `src/App.tsx`. Hoje `src/App.tsx:157` é `availableHintPowerups(elapsedMs, me.hintsUsed)`, lido só dentro de `{!me?.solved && hintsAvailable > 0 && …}` (`:442`). A spec e o código passaram a concordar em vez de divergirem silenciosamente.

**Ressalva (⚠️ spec-precision gap, não bloqueante):** a nova AC é uma conjunção — "obtenha **ou** gaste". A metade "gaste" está implementada e coberta. A metade "obtenha" não: `earnedHintPowerups` (`shared/hints.ts:23-27`) é função pura do tempo decorrido e não conhece `solved`, então a concessão derivada de quem já acertou continua subindo. Isso é inócuo (nada consome esse valor para quem acertou, e a guarda `ALREADY_SOLVED` corta o gasto), mas a AC promete um pouco mais do que o sistema garante. Registrado, não reprovado.

**Nenhuma outra AC foi enfraquecida.** O diff da spec toca exatamente quatro pontos: a linha de premissa nova, o texto de HINT-04, a linha "State-transition integrity" da tabela de requisitos implícitos (reformulada para casar com a nova HINT-04), e a coluna Status da tabela de rastreabilidade (Pending → Done/Verified). O texto de HINT-01, 02, 03, 05..23 está byte a byte idêntico ao de `c3c0985`. Nenhuma AC foi apagada, fundida ou afrouxada.

---

## Spec-Anchored Acceptance Criteria — 23 ACs re-derivadas

| Critério | Outcome definido na spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| HINT-01 concede em 30/40/50 min | 1 power-up por marco | `tests/hints.test.ts:14` `expect(earnedHintPowerups(30*MINUTE_MS)).toBe(1)`; `:18-19` `.toBe(2)`/`.toBe(3)`; `:9-10` `.toBe(0)` antes | ✅ PASS |
| HINT-02 tempo de `roundStartedAt` do servidor | nunca relógio do cliente | `server/game.ts:405` `availableHintPowerups(Date.now() - room.roundStartedAt, …)`; `tests/game.integration.test.ts:1823-1831` recua `roundStartedAt` e obtém `NO_HINT_AVAILABLE` | ✅ PASS |
| HINT-03 acumula até 3 | teto 3 | `tests/hints.test.ts:28-30` `.toBe(MAX_HINT_POWERUPS)`, `expect(HINT_UNLOCK_MS).toHaveLength(3)` | ✅ PASS (cobertura estrutural do teto; ver nota M-equiv) |
| HINT-04 quem acertou sai do ciclo de dica | recusa a quem já acertou, estado intacto | `tests/game.integration.test.ts:1840-1841` `expect(code).toBe('ALREADY_SOLVED')` + `toEqual({hintsUsed:0, hintRequestTargetId:null})`; guarda em `server/game.ts:387-390` | ⚠️ PASS com spec-precision gap (metade "obtenha" não garantida) |
| HINT-05 rodada nova zera tudo | `hintsUsed=0`, `hintRequestTargetId=null` | `tests/game.integration.test.ts:1715-1747` (playAgain + rodada seguinte) e `:1750-1762` (rodada abortada por saída) | ✅ PASS |
| HINT-06 UI exibe quantidade | exibir contagem disponível | `src/App.tsx:442-446` render `{hintsAvailable}` sob `!me?.solved` | ⏭️ Render — inspeção + UAT (decisão registrada, sem jsdom) |
| HINT-07 consome 1 e registra alvo | `hintsUsed` +1, `hintRequestTargetId` = alvo | `tests/game.integration.test.ts:1798-1799` `.toBe(1)`, `.toBe(guestId)` | ✅ PASS |
| HINT-08 destaque do card | classe/estado de destaque | `src/App.tsx:558-560` `asking = player.hintRequestTargetId !== null` | ⏭️ Render |
| HINT-09 comando de responder ao alvo | botão para o alvo | `src/App.tsx:163,458-461` `hintAskers` + `Marcar que respondi` | ⏭️ Render |
| HINT-10 alvo responde encerra pedido | pedido encerrado, power-up **não** volta | `tests/game.integration.test.ts:1892` `.toBeNull()`; `:1903` `toEqual({hintsUsed:1, hintRequestTargetId:null})` | ✅ PASS |
| HINT-11 cancelar devolve power-up | pedido encerrado + `hintsUsed` −1 | `tests/game.integration.test.ts:1915` `toEqual({hintsUsed:0, hintRequestTargetId:null})` | ✅ PASS |
| HINT-12 `score`/`roundPoints` inalterados | idênticos com e sem power-up | `tests/game.integration.test.ts:2015` `.hintsUsed).toBe(1)` + comparação de ranking entre as duas rodadas | ✅ PASS |
| HINT-13 `NO_SOLVER_YET` | erro exato + power-up intacto | `:1809-1810` | ✅ PASS |
| HINT-14 `INVALID_HINT_TARGET` | erro exato + power-up intacto | `:1819-1820` | ✅ PASS |
| HINT-15 `NO_HINT_AVAILABLE` | erro exato + power-up intacto | `:1830-1831` | ✅ PASS |
| HINT-16 `ALREADY_SOLVED` | erro exato + power-up intacto | `:1840-1841` | ✅ PASS |
| HINT-17 `HINT_ALREADY_PENDING` | erro exato + estado preservado | `:1854-1855` `toEqual({hintsUsed:1, hintRequestTargetId:guestId})` | ✅ PASS |
| HINT-18 `ROUND_NOT_RUNNING` | erro exato + fase `lobby` | `:1869-1871` | ✅ PASS |
| HINT-19 `NOT_HINT_TARGET` + pedido mantido | erro exato, pedido pendente | `:1924-1925` `toEqual({hintsUsed:1, hintRequestTargetId:guestId})` | ✅ PASS |
| HINT-20 queda do alvo devolve | pedido cancelado + power-up de volta | `:1932` (pré) e `:1936` (pós) | ✅ PASS |
| HINT-21 saída do alvo devolve | pedido cancelado + power-up de volta | `:1951-1961` — fase ancorada em `finished`, pré-estado `{1, guestId}`, pós-estado `{0, null}`; discrimina (M1 morre) | ✅ PASS |
| HINT-22 quem pede acerta: sem devolução | pedido cancelado, `hintsUsed` mantido | `:1969` `toEqual({hintsUsed:1, hintRequestTargetId:null})` | ✅ PASS |
| HINT-23 `hintsUsed` entre 0 e 3 | nunca negativo | `tests/hints.test.ts:42-43` (lado puro); `tests/game.integration.test.ts:1984-1990` (lado servidor, clamp alcançado; M2 morre) | ✅ PASS |

**Status**: 20/23 ✅ PASS · 3 ⏭️ render (HINT-06, 08, 09 — inspeção + UAT, decisão registrada, não é lacuna) · 1 ⚠️ spec-precision gap sobreposto a HINT-04 · **0 GAP**.

---

## Payload / Conjunction Rule

| Campo | Asserção sobre valor? | Evidência |
| --- | --- | --- |
| `hintsUsed` | ✅ Valor numérico exato em todo caminho (0 ou 1) | `:1798`, `:1810`, `:1820`, `:1831`, `:1841`, `:1855`, `:1871`, `:1903`, `:1915`, `:1925`, `:1936`, `:1952`, `:1961`, `:1969`, `:1979`, `:1990`, `:2015` |
| `hintRequestTargetId` | ✅ Id concreto do alvo, nunca `toBeDefined()`/`toBeTruthy()` | `:1799` `.toBe(guestId)`, `:1855`, `:1925`, `:1952` |

Os dois campos são asseridos **em conjunção** via `toEqual({hintsUsed, hintRequestTargetId})` em 15 dos 17 pontos, o que impede passagem por acerto parcial. Regra satisfeita. Nenhuma asserção de mera existência foi encontrada nos testes de dica.

---

## Discrimination Sensor

**Scratch isolado**: `git worktree add <tmp> HEAD` (`ce4ad2c`), `node_modules` por symlink, mutações aplicadas só na cópia, `git worktree remove --force` + `git worktree prune` ao fim. **Nunca `git stash`.**
**Baseline** de `git status --porcelain` antes: `?? .specs/features/powerup-de-dica/validation.md` (único item). Depois da limpeza: idêntico. HEAD confirmado em `ce4ad2c`. Isolamento OK.
**Comando por mutação**: `npx vitest run tests/hints.test.ts tests/game.integration.test.ts` (75 testes). Cada patch foi verificado como efetivamente aplicado (`git diff` não vazio) antes de rodar — um patch no-op contaria como falso "sobreviveu".

| # | Mutação | File:line | Novo? | Resultado |
| --- | --- | --- | --- | --- |
| M1 | Remover `releaseHintRequestsTargeting` do caminho `leave()` | `server/game.ts:563` | rodada 1 (sobreviveu) | ✅ **Killed** — 1 falha, exatamente o teste de HINT-21 |
| M2 | `Math.max(0, hintsUsed - 1)` → `hintsUsed - 1` | `server/game.ts:456` | rodada 1 (sobreviveu) | ✅ **Killed** — 1 falha, exatamente o teste de HINT-23 |
| M3 | Fronteira do marco: `elapsedMs >= unlockMs` → `>` | `shared/hints.ts:25` | **inédita** | ✅ Killed (3 falhas — o marco cravado deixa de conceder) |
| M4 | Remover o consumo `player.hintsUsed += 1` no pedido | `server/game.ts:410` | **inédita** | ✅ Killed (10 falhas — HINT-07, 11, 17, 19, 20, 21, 22, 23) |
| M5 | Devolver o power-up a quem acerta: `releaseHintRequest(player, false)` → `true` | `server/game.ts:275` | **inédita** | ✅ Killed (3 falhas — HINT-22 em cheio) |
| M6 | Remover o reset de dica em `startRound` | `server/game.ts:529-530` | **inédita** | ✅ Killed (1 falha — HINT-05) |
| M7 | Devolver o power-up ao responder: `asker.hintRequestTargetId = null` → `releaseHintRequest(asker, true)` | `server/game.ts:433` | **inédita** | ✅ Killed (1 falha — HINT-10) |
| M8 | Remover o reset de dica em `resetAfterDeparture` | `server/game.ts:790-791` | **inédita** | ✅ Killed (2 falhas — HINT-05) |

**Sensor depth**: expandido (8 mutações, 6 inéditas nesta rodada)
**Result**: **8/8 killed, 0 sobreviventes** — ✅ **PASS**

**Nota sobre o mutante equivalente da rodada 1.** A mutação "remover `Math.min(earned, MAX_HINT_POWERUPS)`" (`shared/hints.ts:26`) segue sendo *equivalente*, não uma lacuna de teste: com exatamente 3 marcos, `earned` nunca excede 3, então o `min` é inalcançável. `expect(HINT_UNLOCK_MS).toHaveLength(3)` (`tests/hints.test.ts:30`) guarda estruturalmente a premissa que a torna equivalente — se um quarto marco entrar, esse teste quebra primeiro. Por isso ela não foi reinjetada nesta rodada. M3 cobre a mesma função por uma fronteira que é de fato alcançável.

---

## Gate Check

- **Comandos**: `npm run typecheck` e `npm test` (`vitest run`)
- **`npm run typecheck`**: ✅ exit 0 (`tsconfig.app.json` + `tsconfig.server.json`)
- **`npm test` — 4 execuções sequenciais**:

| Execução | Test Files | Tests | Exit |
| --- | --- | --- | --- |
| 1 | 7 passed (7) | **130 passed (130)** | 0 |
| 2 | 7 passed (7) | **130 passed (130)** | 0 |
| 3 | 7 passed (7) | **130 passed (130)** | 0 |
| 4 | 7 passed (7) | **130 passed (130)** | 0 |

- **Flake de socket: 0 de 4 execuções.** Na rodada 1 foi 1 de 4 (25%). O flake não reapareceu em nenhuma das quatro execuções desta rodada nem nas 10 execuções da suíte de integração durante o sensor (as falhas ali foram todas atribuíveis à mutação injetada, sem vítima colateral por timeout). Não houve mudança de código que explique a diferença — os três commits de correção só tocam testes e removem uma linha morta de `src/App.tsx` —, então o flake continua **latente**, não corrigido. Recomendação preservada da rodada 1: `tests/game.integration.test.ts` roda 68 testes contra um Socket.IO real no mesmo processo com `waitForEvent` de timeout fixo em 15s; vale serializar/isolar ou escalar o timeout com a carga. Como item de higiene, não bloqueante desta feature.
- **Test count antes da feature**: 104 · **depois**: 130 · **Delta**: +26 · **Skipped**: nenhum · **Falhas**: nenhuma

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ os 3 commits de correção tocam 2 arquivos e removem 1 linha de produção |
| Sem scope creep | ✅ |
| Segue os padrões existentes | ✅ |
| Sem duplicação da regra de negócio | ✅ marcos e teto só em `shared/hints.ts`; `server/game.ts:405` e `src/App.tsx:157` chamam `availableHintPowerups` |
| Spec-anchored outcome check | ✅ (1 ⚠️ spec-precision gap em HINT-04, registrado) |
| Coverage Expectation por camada | ✅ domínio 1:1 com ACs; servidor cobre feliz + 7 recusas + 4 cancelamentos automáticos |
| Todo teste mapeia para um requisito | ✅ sem testes órfãos |
| Código morto | ✅ eliminado em `ce4ad2c` |
| Guidelines documentadas seguidas | ✅ nenhuma no projeto — defaults fortes aplicados |

---

## Edge Cases

- [x] Rodada termina com pedido pendente → zerado por HINT-05 (`:1715-1762`)
- [x] Dois jogadores pedem ao mesmo alvo → pedidos independentes; `hintAskers` (`src/App.tsx:163`) renderiza um comando por pedido
- [x] Saída do alvo em `finished` (sem `resetAfterDeparture` no caminho) → devolução observada isoladamente (`:1939-1962`)
- [x] Cancelamento repetido com gasto já em zero → clamp alcançado, sem valor negativo (`:1972-1991`)
- [x] Quem pediu cai com pedido pendente → o pedido permanece; `disconnect` só solta pedidos *dirigidos* a quem caiu (`server/game.ts:586`)
- [ ] Acumular 3 e cruzar um quarto marco → não testado comportamentalmente (não existe quarto marco; guardado estruturalmente por `HINT_UNLOCK_MS.toHaveLength(3)`)

---

## Requirement Traceability Update

| Requirement | Anterior (rodada 1) | Novo |
| --- | --- | --- |
| HINT-01, 02, 03, 05, 07, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22 | ✅ Verified | ✅ Verified |
| HINT-04 | ❌ Needs Fix (AC vacuosa) | ✅ Verified — ⚠️ spec-precision gap na metade "obtenha" |
| HINT-21 | ❌ Needs Fix (M1 sobrevivia) | ✅ Verified — M1 morre |
| HINT-23 | ⚠️ Parcial (M2 sobrevivia) | ✅ Verified — M2 morre |
| HINT-06, 08, 09 | ⏭️ Render | ⏭️ Render — verificado por inspeção, pendente de UAT (decisão registrada) |

---

## Itens abertos (nenhum bloqueante)

1. **⚠️ HINT-04, metade "obtenha"** — a AC promete impedir a *obtenção*; o sistema só impede o *gasto*. Inócuo hoje. Ajustar a redação para "impedir que gaste" fecharia a lacuna sem tocar em código.
2. **Flake de socket latente** — 0/4 nesta rodada, 1/4 na anterior, sem mudança de código que explique. Tratar como item próprio de higiene da suíte de integração.
3. **Clamp defensivo** — `hintsUsed === 0` com pedido pendente é inalcançável em produção; o teste chega lá por `seedHintState`. Correto para uma invariante, registrado por transparência.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 20/23 ✅ · 3 ⏭️ render (decisão registrada) · 1 ⚠️ spec-precision gap · **0 GAP**
**Sensor**: 8/8 mutações mortas (6 inéditas; as 2 sobreviventes da rodada 1 agora morrem pelo teste certo)
**Gate**: typecheck ✅ · `npm test` 130/130 em **4 de 4** execuções · flake em 0 de 4

**O que funciona**: as três lacunas da rodada 1 foram fechadas com correções substantivas, não cosméticas. O teste de HINT-21 agora isola a devolução do reset ancorando a fase em `finished` — verificado no código (`resetAfterDeparture` só roda em `playing`) e no mutante. O teste de HINT-23 alcança de fato o `Math.max(0, …)`. A reescrita de HINT-04 troca um efeito inobservável por uma guarda de servidor real e testada, declara a mudança numa premissa aprovada, e vem acompanhada da remoção do código morto que a sustentava — nenhuma outra AC foi enfraquecida no diff da spec.

**Problemas**: nenhum bloqueante. Três itens abertos acima, todos de higiene.

**Next steps**: UAT das três ACs de render (HINT-06, 08, 09) e, opcionalmente, ajustar a redação de HINT-04 para "gaste". A feature está pronta.
