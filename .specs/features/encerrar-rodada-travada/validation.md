# Encerrar Rodada Travada — Validation

**Date**: 2026-08-09
**Spec**: `.specs/features/encerrar-rodada-travada/spec.md`
**Diff range**: `e980641..HEAD` (`fix/encerrar-rodada-travada`, 9 commits: `1cd01ef`, `537f498`, `662e3c8`, `6ac5186`, `f056276`, `bc698fe`, `b4ea22e`, `221adf4`, `25f9cc6`)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero

**Verdict: PASS ✅** — 22/22 ACs com evidência, 0 spec-precision gaps bloqueantes, 7/7 mutações mortas, gates verdes.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 Protocolo `round:endEarly` | ✅ Done | `shared/protocol.ts:146` |
| T2 Handler de encerramento + recusas | ✅ Done | `server/game.ts:293-312` |
| T3 Equivalência com encerramento natural | ✅ Done | `tests/game.integration.test.ts:1438-1537` |
| T4 Protocolo `room:removeAbsent` | ✅ Done | `shared/protocol.ts:76-78`, `:147` |
| T5 Handler de remoção | ✅ Done | `server/game.ts:326-352` |
| T6 Botão de encerrar (anfitrião) | ✅ Done | `src/App.tsx:409-414` |
| T7 Comando de remover no lobby | ✅ Done | `src/App.tsx:354`, `:492-493` |
| T8 Estilo dos comandos | ✅ Done | `src/styles.css` |

**Observação de processo (não bloqueia):** os checkboxes "Done when" de `tasks.md` seguem desmarcados e as tabelas de granularidade/cross-check ainda listam a numeração antiga (T1–T5, "T4: Botão"), defasada em relação às T1–T8 realmente executadas. Higiene de artefato, sem efeito sobre o código ou sobre a cobertura.

---

## Spec-Anchored Acceptance Criteria

| Critério | Outcome definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| END-01 anfitrião encerra rodada travada | fase da sala vira `finished` | `tests/game.integration.test.ts:1347` — `expect(payloadHost.room.phase).toBe('finished')`; `:1348` — `expect(getInternalRoomPhase(roomCode)).toBe('finished')` | ✅ PASS |
| END-02 `round:finished` a todos os conectados, mesmo ranking do natural | ranking ordenado, `rank` nulo por último (assumption L36), idêntico para todos | `tests/game.integration.test.ts:1452` — `expect(payloadHost.ranking.map(e => e.playerId)).toEqual([hostId, guestId, absentId])`; `:1453` — `.map(e => e.rank)).toEqual([1, 2, null])`; `:1454` — `expect(payloadGuest.ranking).toEqual(payloadHost.ranking)` | ✅ PASS |
| END-03 preserva `rank`/`roundPoints`/`score` de quem acertou | valores do encerramento natural (`pointsForRank = N - rank + 1`, SCORE-01) | `tests/game.integration.test.ts:1470-1475` — `expect(hostView?.rank).toBe(1)`, `roundPoints).toBe(3)`, `score).toBe(3)`, `guestView?.rank).toBe(2)`, `roundPoints).toBe(2)`, `score).toBe(2)` | ✅ PASS |
| END-04 `rank`/`roundPoints` nulos e `score` inalterado para quem não acertou | `rank` null, `roundPoints` null, `score` inalterado (assumption L35-36) | `tests/game.integration.test.ts:1489-1491` — `expect(absentView?.rank).toBeNull()`, `roundPoints).toBeNull()`, `score).toBe(0)` | ✅ PASS |
| END-05 comando visível ao anfitrião quando a rodada está travada | botão exibido só em `playing` + travado + anfitrião | `src/App.tsx:149` — `roundIsStalled = Boolean(room?.players.some(p => !p.connected && !p.solved))`; `:409` — `{isHost && roundIsStalled && (...)}` dentro do ramo `playing` (após os early-returns `phase === 'lobby'` em `:317` e `phase === 'finished'` em `:363`) | ✅ PASS (inspeção + UAT) |
| END-06 comando oculto quando não há desconectado sem acertar | ausência do controle para todos | mesma expressão `src/App.tsx:409` — a conjunção `isHost && roundIsStalled` não renderiza nada quando qualquer termo é falso; não há caminho alternativo de render do botão (`grep 'end-round-button'` → só `:411`) | ✅ PASS (inspeção + UAT) |
| END-07 não anfitrião → `HOST_ONLY`, fase intacta | erro `HOST_ONLY`, fase segue `playing` | `tests/game.integration.test.ts:1359` — `expect(payload.code).toBe('HOST_ONLY')`; `:1360` — `expect(getInternalRoomPhase(roomCode)).toBe('playing')` | ✅ PASS |
| END-08 todos conectados → `ROUND_NOT_STUCK`, fase intacta | erro `ROUND_NOT_STUCK`, fase segue `playing` | `tests/game.integration.test.ts:1370-1371` — `expect(payload.code).toBe('ROUND_NOT_STUCK')`, `expect(getInternalRoomPhase(roomCode)).toBe('playing')` | ✅ PASS |
| END-09 desconectado já acertou → `ROUND_NOT_STUCK` | erro `ROUND_NOT_STUCK` | `tests/game.integration.test.ts:1383-1384` — mesmas asserções, com o ausente resolvido antes da queda (`:1376-1377`) | ✅ PASS |
| END-10 fora de `playing` → `ROUND_NOT_RUNNING` | erro `ROUND_NOT_RUNNING` | `tests/game.integration.test.ts:1400-1401` (lobby) — `expect(payload.code).toBe('ROUND_NOT_RUNNING')`, `...toBe('lobby')`; `:1416-1417` (segunda emissão) — `...toBe('ROUND_NOT_RUNNING')`, `...toBe('finished')` | ✅ PASS |
| END-11 socket sem sessão → ignora sem alterar estado | nenhuma mudança de estado | `tests/game.integration.test.ts:1434` — `expect(getInternalRoomPhase(roomCode)).toBe('playing')`, com barreira de ordenação em `:1431-1432` (`expect(barrier.ok).toBe(false)`) | ✅ PASS |
| END-12 `playAgain` funciona após o encerramento por comando | próxima rodada abrível pelo fluxo existente, sem erro | `tests/game.integration.test.ts:1506` — `expect(getInternalRoomPhase(roomCode)).toBe('lobby')`; `:1511` — `expect(lobby.players.map(p => p.ready)).toEqual([false, false, false])` | ✅ PASS (ver Ponto 2) |
| END-13 reconexão devolve estado corrente com o `score` que tinha | estado corrente + `score` preservado | `tests/game.integration.test.ts:1535-1536` — `expect(room.phase).toBe('finished')`, `expect(room.players.find(p => p.id === absentId)?.score).toBe(3)` | ✅ PASS |
| END-14 encerramento natural inalterado | `everyoneSolved` continua encerrando com o mesmo contrato | `tests/game.integration.test.ts:224-232` (pré-existente, intacto) — `expect(finishedA.room.phase).toBe('finished')`, `expect(finishedA.room.players.every(p => p.character)).toBe(true)`; `tests/game.integration.test.ts:911-915` (SCORE-01, pré-existente) — `expect(scores).toEqual([4, 3, 2, 1])`, `expect(roundPoints).toEqual([4, 3, 2, 1])`; guarda estrutural `:440` — `expect(source).toMatch(/everyoneSolved[\s\S]{0,120}this\.finishRound\(/)` | ✅ PASS (ver Ponto 3) |
| END-15 remove desconectado no lobby | jogador some da sala | `tests/game.integration.test.ts:1561-1563` — `expect(room.players).toHaveLength(2)`, `expect(room.players.some(p => p.id === absentId)).toBe(false)`, `expect(getInternalRoomPhase(roomCode)).toBe('lobby')` | ✅ PASS |
| END-16 descarta o `score` do removido | placar some junto; reentrar é entrar zerado | `tests/game.integration.test.ts:1577` — `expect(beforeRemoval.room.players.find(...)?.score).toBe(3)` (tinha placar); `:1590` — `expect(rejoined.room.players.find(p => p.id === rejoined.playerId)?.score).toBe(0)` | ✅ PASS |
| END-17 removido o ausente, a rodada seguinte começa | rodada inicia com os restantes | `tests/game.integration.test.ts:1606-1607` — `expect(next.room.phase).toBe('playing')`, `expect(next.room.players).toHaveLength(2)` | ✅ PASS |
| END-18 não anfitrião → `HOST_ONLY`, ninguém removido | erro `HOST_ONLY`, sala intacta | `tests/game.integration.test.ts:1617-1618` — `expect(payload.code).toBe('HOST_ONLY')`, `expect(getInternalRoomPlayerCount(roomCode)).toBe(3)` | ✅ PASS |
| END-19 alvo conectado → `PLAYER_CONNECTED`, ninguém removido | erro `PLAYER_CONNECTED`, sala intacta | `tests/game.integration.test.ts:1628-1629` — `expect(payload.code).toBe('PLAYER_CONNECTED')`, `...toBe(3)` | ✅ PASS |
| END-20 alvo inexistente → `PLAYER_NOT_FOUND` | erro `PLAYER_NOT_FOUND` | `tests/game.integration.test.ts:1639-1640` — `expect(payload.code).toBe('PLAYER_NOT_FOUND')`, `...toBe(3)` | ✅ PASS |
| END-21 fora do lobby → `ROOM_NOT_IN_LOBBY` | erro `ROOM_NOT_IN_LOBBY` | `tests/game.integration.test.ts:1651-1652` — `expect(payload.code).toBe('ROOM_NOT_IN_LOBBY')`, `...toBe(3)` | ✅ PASS |
| END-22 no lobby, comando de remover cada desconectado para o anfitrião | botão por linha de jogador desconectado, só para o anfitrião | `src/App.tsx:354` — `onRemove={isHost && !player.connected && player.id !== room.you.id ? () => removeAbsent(player.id) : undefined}`, dentro do bloco `if (room.phase === 'lobby')` de `:317`; `src/App.tsx:493` — `{onRemove && <button ... aria-label={`Remover ${player.nickname} da sala`}>Remover</button>}` | ✅ PASS (inspeção + UAT) |

**Status**: ✅ 22/22 ACs cobertas. 0 gaps.

**Escopo de render (END-05, END-06, END-22):** verificados por inspeção de código + UAT interativo. O projeto não tem jsdom nem testing-library — decisão registrada, não lacuna de cobertura. A verificação por inspeção foi feita de forma independente: confirmei que o gating de fase vem dos early-returns de `App.tsx:317` (`lobby`) e `:363` (`finished`), e que não existe segundo caminho de render para nenhum dos dois controles (`end-round-button` e `remove-absent-button` aparecem uma única vez cada no arquivo).

**Spec-precision — notas menores, nenhuma bloqueante:**

- END-03: a spec diz "preservar", sem fixar os valores. O teste asserta `3` e `2` numa sala de 3, derivados de `pointsForRank = N - rank + 1` já fixado por SCORE-01. Ancoragem indireta, mas real.
- END-11: "sem alterar estado" é amplo; o teste prova a fase inalterada, que é o único estado que o handler poderia mudar. Suficiente para o handler em questão.
- END-12: "sem erro" é provado indiretamente — o `room:state` com `phase === 'lobby'` só é emitido no caminho de sucesso de `playAgain`. Não há listener de `error` explícito.

---

## Payload / Conjunction Rule

| Superfície | Campos asseridos em valor/estado | Veredito |
| --- | --- | --- |
| `round:finished` | `room.phase` (`:1347`), `ranking[].playerId` (`:1452`), `ranking[].rank` (`:1453`), igualdade entre destinatários (`:1454`), `room.players[].rank/roundPoints/score` (`:1470-1475`, `:1489-1491`) | ✅ valor, não "o evento chegou" |
| `RoomView` após remoção | `players.length` (`:1561`), ausência do id removido (`:1562`), fase (`:1563`), `score` do reentrante (`:1590`), contagem interna nas recusas (`:1618`, `:1629`, `:1640`, `:1652`) | ✅ valor/estado |
| Recusas (`error`) | `payload.code` comparado ao literal exato em todos os 7 casos, **sempre em conjunção** com uma asserção de que o estado não mudou | ✅ sem asserção de mera ocorrência |

Nenhum teste do escopo se limita a "o evento foi emitido".

---

## Discrimination Sensor

Scratch isolado via `git worktree add` em diretório temporário (`node_modules` por symlink). **Nunca `git stash`.** Baseline de `git status --porcelain` da árvore real capturada antes: **vazia**.

| # | `file:line` | Mutação | Resultado |
| --- | --- | --- | --- |
| 1 | `server/game.ts:296` | Inverte a guarda de anfitrião em `endEarly` (`hostId !== player.id` → `===`) | ✅ Morta (17 falhas) |
| 2 | `server/game.ts:300` | Remove a guarda de fase em `endEarly` (`room.phase !== 'playing'` → `false`) | ✅ Morta (2 falhas) |
| 3 | `server/game.ts:306` | Remove a checagem `stalled` (`if (!stalled)` → `if (false)`) | ✅ Morta (2 falhas) |
| 4 | `server/game.ts:344` | `removeAbsent` passa a aceitar alvo conectado (`if (target.connected)` → `if (false)`) | ✅ Morta (1 falha) |
| 5 | `server/game.ts:350` | Troca `removePlayer` por só marcar desconectado (`this.removePlayer(room, target)` → `target.connected = false`) | ✅ Morta (3 falhas) |
| 6 | `server/game.ts:311` | `endEarly` muda a fase sem emitir `round:finished` (`this.finishRound(room)` → `room.phase = 'finished'; this.broadcastRoomState(room)`) | ✅ Morta (14 falhas) |
| 7 | `server/game.ts:329` | Inverte a guarda de anfitrião em `removeAbsent` | ✅ Morta (7 falhas) |

**Sensor depth**: expandido (7 mutações, todos os ramos novos de guarda e ambos os efeitos colaterais exigidos pela spec).
**Result**: 7/7 mortas — **PASS ✅**, 0 sobreviventes.

**Probes adicionais da guarda TIME-09** (não são mutações de comportamento; medem a precisão da própria asserção):

- Probe A — `setTimeout(() => this.finishRound(room), 300_000)` inserido em `server/game.ts`: **TIME-09 falha**. O invariante "nenhum agendador encerra rodada" continua efetivamente protegido.
- Probe B — chamada de `finishRound` movida de dentro de `endEarly` para um método auxiliar declarado logo abaixo (comportamento idêntico): **TIME-09 passa**. Documenta a folga da regex descrita no Ponto 1.

**Isolamento verificado**: worktree removida com `git worktree remove --force` + `git worktree prune`; `git status --porcelain` da árvore real após o sensor = vazio, idêntico à baseline. Branch e HEAD inalterados (`fix/encerrar-rodada-travada` @ `25f9cc6`).

---

## Os quatro pontos de julgamento independente

### 1. A guarda estrutural TIME-09 foi enfraquecida? **Não.**

`tests/game.integration.test.ts:421-442`. O que protege o invariante de TIME-09 ("nenhum agendador pode encerrar rodada") são as linhas `:429-431`, e elas estão **intactas e inalteradas** neste range:

```
const schedulers = source.match(/set(?:Timeout|Interval)\s*\(/g) ?? [];
expect(schedulers).toEqual(['setInterval(']);
expect(source).toContain('setInterval(() => this.cleanupRooms(), 60_000)');
```

`toEqual` sobre a lista inteira significa que **qualquer** `setTimeout`/`setInterval` novo em `server/game.ts` quebra o teste — verificado empiricamente pelo Probe A. Logo, um `finishRound` dentro de callback de timer é impossível de introduzir sem falhar, porque exige um agendador. Um terceiro call site também quebra, por `toHaveLength(2)` em `:439`.

A mudança `1 → 2` é a consequência necessária de um segundo caminho legítimo e previsto pela spec (END-01), não um afrouxamento — e veio acompanhada de duas asserções que **não existiam antes**, sendo a de `:440` (`everyoneSolved[\s\S]{0,120}this.finishRound\(`, janela limitada a 120 caracteres) genuinamente mais estrita do que a contagem sozinha. O saldo é mais estrito.

**Ressalva honesta, registrada e não bloqueante:** a segunda asserção de identidade, `:441` — `expect(source).toMatch(/private endEarly[\s\S]*?this\.finishRound\(/)` — usa quantificador ilimitado e portanto **não fixa de fato** o call site dentro de `endEarly`: ela casa com qualquer `finishRound` que apareça textualmente depois da declaração de `endEarly` (que está em `server/game.ts:293`, abaixo do call site de `everyoneSolved` em `:279`). O Probe B confirma: mover a chamada para um método auxiliar declarado abaixo mantém o teste verde. Isso enfraquece apenas a *alegação de identidade* dessa linha específica — não o invariante TIME-09, que sobrevive inteiro pelas linhas `:429-431`. Uma janela limitada (por exemplo `{0,400}`) alinharia a asserção à intenção declarada no comentário. Sugestão de melhoria, não gap de requisito.

### 2. END-12 tem cobertura estreita demais? **Não — a leitura da AC está correta e a lacuna real está coberta.**

A AC END-12 (`spec.md:116`) diz literalmente: "o anfitrião SHALL conseguir **abrir a próxima rodada pelo fluxo `round:playAgain` existente, sem erro**". O efeito definido de `playAgain` é devolver a sala ao lobby — não iniciar rodada. Iniciar é `everyoneReady` (`server/game.ts:195`), que exige `connected && ready` de todos e portanto ainda é barrado pelo ausente. O teste `:1495-1512` asserta exatamente o escopo da AC (fase `lobby` em `:1506`, ninguém pronto em `:1511`).

A lacuna real — "a rodada seguinte de fato começa" — não foi varrida para debaixo do tapete: é a razão de existir da história P1 "Remover o jogador ausente" (`spec.md:91` justifica isso explicitamente) e está coberta por **END-17** com asserção positiva forte em `tests/game.integration.test.ts:1606-1607` (`phase === 'playing'`, 2 jogadores). O comentário no teste de END-12 (`:1508-1510`) declara a limitação em vez de escondê-la. Julgamento confirmado.

### 3. END-14 tem evidência? **Sim, localizada.**

Não há teste dedicado, e não é necessário — a AC é "manter o encerramento natural funcionando **sem alteração de comportamento**", que é por definição provada por testes pré-existentes que continuam passando sem edição:

- `tests/game.integration.test.ts:224-232` — encerramento natural pelo último acerto: `expect(finishedA.room.phase).toBe('finished')`, `expect(finishedA.room.players.every(p => p.character)).toBe(true)`, revelação verificada em ambos os clientes.
- `tests/game.integration.test.ts:901-915` (SCORE-01) — sala de 4 com todos acertando: `expect(scores).toEqual([4, 3, 2, 1])`, `expect(roundPoints).toEqual([4, 3, 2, 1])`.
- `tests/game.integration.test.ts:316-353` (POOL-01/02) — 3 rodadas naturais seguidas na mesma sala.
- Guarda estrutural adicional: `tests/game.integration.test.ts:440` fixa o call site de `everyoneSolved → finishRound` numa janela de 120 caracteres.

`git diff e980641..HEAD -- tests/game.integration.test.ts` confirma que nenhuma dessas linhas foi tocada: as únicas alterações em testes pré-existentes são as três linhas de TIME-09 (Ponto 1). Não é lacuna.

### 4. Regressão do escopo anterior? **Nenhuma.**

- Contagem base em `e980641`: 30 (game.integration) + 10 (origins) + 5 (scoring) + 9 (time) + 20 (wordlist) = **74**. Agora: **93**. Delta **+19**, todos em `game.integration.test.ts` (30 → 49). Nenhum teste removido, nenhum `skip`, nenhuma suíte desativada.
- `tests/scoring.test.ts` e `tests/time.test.ts` não aparecem no diff do range — intocados.
- `git diff e980641..HEAD -- server/ shared/ src/ | grep -E '^[-+].*(score|roundPoints)'` retorna apenas: a linha de render de `PlayerRow` (o trecho `{showScore && <span className="player-score" ...>}` é **idêntico** antes e depois; só se acrescentou o botão de remover ao lado) e uma regra CSS de opacidade `.player-away .player-score`. **Nenhuma lógica de placar foi alterada.** A única interação da feature com placar é deliberada e especificada: `removeAbsent` reutiliza `removePlayer` (`server/game.ts:350`), o mesmo caminho da saída pelo botão, por SCORE-09 / END-16.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ dois handlers, ~35 linhas de lógica no servidor |
| Mudanças cirúrgicas | ✅ 4 arquivos de produção, todos exigidos pelas ACs |
| Sem scope creep | ✅ nada fora do que a spec pede; os itens de Out of Scope (encerramento por tempo, exclusão automática, remover conectado, votação) seguem ausentes — a guarda de `target.connected` em `:344` reforça o terceiro no código |
| Segue os padrões existentes | ✅ mesma forma de `playAgain`/`leave`: `getContext` → guardas → `sendError` → efeito → broadcast |
| Spec-anchored outcome check | ✅ |
| Cobertura por camada (domínio 1:1 com ACs) | ✅ 19/19 ACs de servidor com teste dedicado |
| Todo teste mapeia a um requisito — nenhum teste órfão | ✅ os 19 novos citam END-NN no título |
| Guidelines documentados seguidos | `.specs` + convenções do repositório |

**Nota de estilo (não bloqueante):** `tests/game.integration.test.ts:1385`, `:1492` e `:1512` contêm asserções de preenchimento (`expect(guest).toBeDefined()`, `expect(guestId).toBeDefined()`) que existem só para consumir variáveis desestruturadas e não provam nada. Ruído, não risco.

---

## Edge Cases

- [x] Todos os restantes já acertaram e só falta o desconectado → encerra normalmente (`:1338-1349`)
- [x] Desconectado reconecta antes do comando → `ROUND_NOT_STUCK` (`:1363-1372`, e `:1374-1386` para o caso "já acertou")
- [x] Anfitrião cai e outro assume → coberto pela promoção existente + END-07 (`:1351-1361`); a promoção já é coberta por SCORE-17 (`:1213`)
- [x] Comando emitido duas vezes → segunda recusada com `ROUND_NOT_RUNNING` (`:1404-1418`)

---

## Gate Check

- **Gate command**: `npm run typecheck && npm test`
- **`npm run typecheck`**: ✅ exit 0 (`tsc -p tsconfig.app.json && tsc -p tsconfig.server.json`), sem diagnóstico
- **`npm test`**: ✅ **93 passed, 0 failed, 0 skipped** — 5 arquivos de teste, 5.64s
- **Test count antes da feature** (`e980641`): 74
- **Test count depois**: 93
- **Delta**: +19
- **Skipped**: nenhum
- **Flake de timeout de socket**: **não ocorreu** nesta validação. A suíte de integração rodou 8 vezes ao todo (1 gate + 7 mutações no scratch) e o único teste lento foi `TIME-09` por espera deliberada de 1,2s. Nenhuma reexecução foi necessária.

---

## Requirement Traceability Update

| Requirement | Previous | New |
| --- | --- | --- |
| END-01 .. END-04 | Implementing | ✅ Verified |
| END-05, END-06 | Implementing | ✅ Verified (inspeção + UAT) |
| END-07 .. END-14 | Implementing | ✅ Verified |
| END-15 .. END-21 | Implementing | ✅ Verified |
| END-22 | Implementing | ✅ Verified (inspeção + UAT) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 22/22 ACs com evidência `file:line` e valor asserido conferido contra a spec; 0 spec-precision gaps bloqueantes (3 notas menores registradas).
**Sensor**: 7/7 mutações mortas, 0 sobreviventes; isolamento confirmado (porcelain vazio antes e depois).
**Gate**: typecheck exit 0; 93 passed, 0 failed.

**O que funciona**: o anfitrião encerra a rodada travada e a revelação/ranking saem idênticos ao encerramento natural; as cinco recusas de `endEarly` e as quatro de `removeAbsent` estão todas provadas com o código de erro exato **em conjunção com** a prova de que o estado não mudou; o ciclo completo — travar, encerrar, voltar ao lobby, remover o ausente, começar a próxima rodada com os restantes — está coberto ponta a ponta (END-17); o placar da sessão anterior segue intacto.

**Pontos julgados**: (1) TIME-09 não foi enfraquecida — o invariante é sustentado pelas asserções de scheduler intactas, confirmado por probe empírico; a folga é apenas na regex de identidade de `endEarly` e é uma melhoria sugerida, não um gap. (2) A leitura estreita de END-12 está correta e a lacuna real é END-17, coberta com asserção positiva. (3) END-14 tem evidência pré-existente localizada em `:224-232` e `:901-915`. (4) Sem regressão: 74 → 93 testes, nenhuma lógica de placar tocada.

**Melhorias sugeridas** (nenhuma bloqueia a entrega):

1. Limitar o quantificador em `tests/game.integration.test.ts:441` (`[\s\S]*?` → `[\s\S]{0,400}?`) para que a asserção fixe o call site dentro de `endEarly`, como o comentário promete.
2. Remover as asserções de preenchimento em `:1385`, `:1492`, `:1512`.
3. Marcar as tasks concluídas e atualizar as tabelas defasadas em `tasks.md`.

**Next steps**: nenhuma fix task obrigatória. UAT interativo de END-05/06/22 no navegador fecha o ciclo da camada de render.
