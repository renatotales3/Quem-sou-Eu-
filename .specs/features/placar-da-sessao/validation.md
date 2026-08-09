# Placar da Sessão — Validation (rodada 2)

**Date**: 2026-08-09
**Spec**: `.specs/features/placar-da-sessao/spec.md`
**Diff range**: `94be07d..HEAD` (12 commits, branch `feat/placar-da-sessao`; HEAD `3c230bc`)
**Verifier**: independent sub-agent (author ≠ verifier), segunda rodada — cobertura re-derivada do zero, sem herdar o relatório da rodada 1

**Veredito: PASS ✅**

---

## Resolução das três lacunas da rodada 1

### 1. Mutante M4 (`room.roundPlayerCount` → `room.players.size`) — equivalente, confirmado por leitura independente

A alegação de equivalência **procede**. Re-derivada dos call sites, não do comentário:

- `room.players.delete` aparece em um único lugar: `server/game.ts:569`, dentro de `removePlayer`.
- `removePlayer` tem **um único call site**: `server/game.ts:367`, dentro de `leave`.
- `leave` durante `playing` cai em `server/game.ts:375-377` → `resetAfterDeparture`, que faz `room.phase = 'lobby'` (`server/game.ts:577`). Depois disso `guess` para na guarda `room.phase !== 'playing'` (`server/game.ts:202`) — nenhum acerto é pontuado com o roster já encolhido.
- Se a saída esvazia a sala, `server/game.ts:371-373` apaga a sala inteira e retorna antes; não sobra estado pontuável.
- `disconnect` (`server/game.ts:381-395`) só marca `connected: false` / `socketId: null`; **não** remove de `room.players`.
- `cleanupRooms` (`server/game.ts:601-609`) faz `this.rooms.delete(code)` — descarta a sala inteira, nunca encolhe um roster.
- `joinRoom` só pode crescer o roster com `room.phase === 'lobby'` (`server/game.ts:150-153`), e em `lobby` não há pontuação.

Logo, no ponto de leitura (`server/game.ts:254`) vale sempre `room.roundPlayerCount === room.players.size` enquanto `phase === 'playing'`. **Nenhum teste pode distinguir as duas leituras** — mutante equivalente por construção, não lacuna de sensor. Reexecutado nesta rodada e sobreviveu, como previsto (ver tabela do sensor, linha M-eq).

O comentário em `server/game.ts:241-253` **explica de fato o invariante**: nomeia os caminhos (`removePlayer`/`leave`/`resetAfterDeparture`/queda de conexão), afirma a igualdade das duas leituras hoje, e justifica a leitura congelada como defesa contra uma mudança futura que deixe a rodada seguir com roster menor. Auditado contra o código: correto e completo.

### 2. SCORE-07 — evidência agora é de valor, em sala com rodada concluída

`tests/game.integration.test.ts:806-847`. O cenário é o certo: a sala joga uma rodada inteira até o fim (`playRoundToFinish`, linha 815), volta ao lobby via `round:playAgain` (linha 820), e só então o terceiro cliente entra (linha 824). A asserção é sobre o valor:

- `tests/game.integration.test.ts:835` — `expect(lateJoiner?.score).toBe(0)`
- `tests/game.integration.test.ts:836` — `expect(lateJoiner?.roundPoints).toBeNull()`
- Contraste no mesmo teste, `:832` — `veterans.forEach((veteran) => expect(veteran?.score).toBeGreaterThan(0))`, que prova que a sala realmente já pontuou e o 0 do entrante não é um 0 trivial de sala nova.

O mutante M6 (`score: 0` → `score: 7` em `createPlayer`) mata este teste, confirmando que a asserção discrimina.

### 3. SCORE-03 — reescrita legítima, nenhuma outra AC tocada

`git diff 94be07d..HEAD -- .specs/features/placar-da-sessao/spec.md` mexe em exatamente três lugares:

| Mudança | Julgamento |
| --- | --- |
| AC SCORE-03: "manter em 0 o ganho da rodada" → "manter `roundPoints` em `null` … A interface apresenta essa ausência como 0" | **Legítima.** Não é enfraquecimento: a redação nova é *mais* estrita (fixa dois contratos verificáveis em vez de um vago) e resolve uma contradição **interna e pré-existente** da própria spec — a tabela de Assumptions já dizia, desde a versão original, que `roundPoints` é `null` enquanto o jogador não acertou. O código nasceu com esse contrato no primeiro commit da feature (`f3ad9d5`, `shared/protocol.ts:37`), não foi adaptado depois. As duas metades da nova redação estão verificadas: servidor `null` (`tests/game.integration.test.ts:803`, `:927`) e interface 0 (`src/App.tsx:371`, `+{player.roundPoints ?? 0}`). |
| Assumption "Superfície no protocolo": `Confirmed? n` → `y` | Bookkeeping. Não é AC, não afeta nenhum critério verificável, e descreve o contrato já implementado desde `f3ad9d5`. Registrado como observação, não como gap. |
| Tabela de Traceability: `Pending` → `Done`/`Verified` + linha de Coverage | Bookkeeping normal de fim de feature. |

**Nenhuma outra AC teve texto alterado.** SCORE-01, 02, 04..18 estão byte-a-byte iguais à versão de `94be07d`. Não há reescrita de spec para caber no código.

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero. `file:line` de `/home/orca/repos/Quem-sou-Eu-`.

### P1: Pontuar cada acerto por posição

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| SCORE-01 — acerto soma `N - rank + 1` | Sala de 4, todos acertando em ordem → totais 4, 3, 2, 1 | `tests/game.integration.test.ts:885` — `expect(scores).toEqual([4, 3, 2, 1])`; ganho por rodada em `:887` — `expect(roundPoints).toEqual([4, 3, 2, 1])`; fórmula pura em `tests/scoring.test.ts:7-8` — `expect(pointsForRank(1, 5)).toBe(5)` / `expect(pointsForRank(5, 5)).toBe(1)` | ✅ PASS |
| SCORE-02 — N registrado no início da rodada e usado a rodada toda | 0 antes de começar; 2 numa sala de 2; 3 na rodada seguinte com 3 | `tests/game.integration.test.ts:793` — `expect(getInternalRoomScoring(code)?.roundPlayerCount).toBe(0)`; `:801` — `.toBe(2)`; `:846` — `.toBe(3)`; `:1140` — `.toBe(3)` | ✅ PASS |
| SCORE-03 — `roundPoints` `null` para quem não acertou; UI mostra 0 | Servidor: `null`. Interface: 0 | Servidor: `tests/game.integration.test.ts:803` — `expect(roundHost.room.players.every((p) => p.roundPoints === null)).toBe(true)`; `:927` — `expect(thirdView?.roundPoints).toBeNull()` com total intacto em `:928` — `expect(thirdView?.score).toBe(0)`. Interface: `src/App.tsx:371` — `+{player.roundPoints ?? 0} na rodada` (inspeção) | ✅ PASS |
| SCORE-04 — acerto repetido não soma de novo | Total continua 2 numa sala de 2, 1º lugar | `tests/game.integration.test.ts:968` — `expect(...?.score).toBe(2)`; `:969` — `expect(...?.roundPoints).toBe(2)` após segundo `round:guess` idêntico (`:958`) | ✅ PASS |
| SCORE-05 — pontuação só no servidor, campo do cliente ignorado | Cliente emite `score: 999, roundPoints: 999` → totais seguem 2 e 1 | `tests/game.integration.test.ts:993` — `host.emit('round:guess', { text, score: 999, roundPoints: 999 } as never)`; `:1002` — `expect(...?.score).toBe(2)`; `:1003` — `roundPoints` `.toBe(2)`; `:1004` — convidado `.toBe(1)` | ✅ PASS |

### P1: Acumular ao longo das rodadas

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| SCORE-06 — nova rodada preserva total, zera só o ganho | Sala de 3, 2ª rodada com ordem invertida → totais 4, 4, 4 e ganhos 1, 2, 3 | `tests/game.integration.test.ts:1058` — `expect(afterFirst).toEqual([3, 2, 1])`; `:1070` — `expect(roundGains).toEqual([1, 2, 3])`; `:1071` — `expect(totals).toEqual([3 + 1, 2 + 2, 1 + 3])` | ✅ PASS |
| SCORE-07 — entrante em sala que já jogou começa em 0 | Total 0, `roundPoints` `null` | `tests/game.integration.test.ts:835` — `expect(lateJoiner?.score).toBe(0)`; `:836` — `.toBeNull()`; veteranos com total > 0 em `:832`. Jogador novo em sala nova: `:771` / `:780` | ✅ PASS |
| SCORE-08 — reconexão devolve o total anterior à queda | 2 para o anfitrião, 1 para o convidado | `tests/game.integration.test.ts:1096` — `expect(resumedPayload.room.players.find(...)?.score).toBe(2)`; `:1097` — `.toBe(1)` | ✅ PASS |
| SCORE-09 — sair descarta o total junto do registro | Jogador some do `RoomView` | `tests/game.integration.test.ts:1120` — `expect(state.players.find((p) => p.id === ids[2])).toBeUndefined()`; `:1121` — roster restante exatamente `[ids[0], ids[1]]`; total dele valia 1 antes (`:1114`) | ✅ PASS |

### P1: Ver o placar da sessão

Verificados por inspeção do diff + UAT interativo — decisão registrada e confirmada na spec; **não** conta como lacuna de cobertura automatizada.

| Critério | Resultado definido pela spec | `file:line` + expressão | Result |
| --- | --- | --- | --- |
| SCORE-10 — lobby com ≥1 rodada exibe o total no painel | Total por jogador no painel de participantes | `src/App.tsx:342` — `<PlayerRow ... showScore={room.round > 0} />`; render em `src/App.tsx:471` — `{showScore && <span className="player-score" ...><strong>{player.score}</strong>` | ✅ PASS (inspeção) |
| SCORE-11 — durante `playing` exibe o total do próprio jogador | Total da sessão do próprio jogador | `src/App.tsx:394` — `{room.round > 1 && me && <div className="session-meter" aria-label={\`Seu total na sessão: ${me.score} pontos\`}><strong>{me.score}</strong>` | ✅ PASS (inspeção) |
| SCORE-12 — em `finished` exibe total + ganho da rodada | Os dois valores, por jogador | `src/App.tsx:368-371` — bloco `session-standings` com `<span className="standings-gain">+{player.roundPoints ?? 0} na rodada</span>` e `<strong className="standings-total">{player.score}</strong>` | ✅ PASS (inspeção) |
| SCORE-13 — antes da 1ª rodada o placar some | Nenhum total renderizado | `src/App.tsx:342` — `showScore={room.round > 0}` e lista sem ordenação por placar quando `room.round === 0`; `src/App.tsx:394` — medidor de sessão gated por `room.round > 1` (durante a 1ª rodada nenhuma rodada foi concluída) | ✅ PASS (inspeção) |
| SCORE-14 — ordem por total decrescente, desempate por apelido | `b.score - a.score`, depois apelido A→Z | `src/App.tsx:479` — `[...players].sort((a, b) => b.score - a.score \|\| a.nickname.localeCompare(b.nickname, 'pt-BR'))`, aplicado em `:342` e `:371` | ✅ PASS (inspeção) |

### P2: Placar íntegro sob movimentação

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| SCORE-15 — saída no meio mantém pontos e o N registrado | Sala de 3, 1º lugar → 3 pontos (não 2) mesmo após a saída | `tests/game.integration.test.ts:1154` — `expect(state.players.find((p) => p.id === ids[0])?.score).toBe(3)`; `:1155` — quem não acertou segue em `.toBe(0)`; N congelado confirmado em `:1140` | ✅ PASS |
| SCORE-16 — sala descartada descarta o placar | Sala inexistente; sala nova nasce com todos em 0 | `tests/game.integration.test.ts:1177` — `expect(getInternalRoom(code)).toBeUndefined()`; `:1183` — `expect(again.room.players.every((p) => p.score === 0)).toBe(true)` | ✅ PASS |
| SCORE-17 — troca de anfitrião não altera totais | Totais idênticos aos de antes (2 e 1) | `tests/game.integration.test.ts:1209` — `expect(state.hostId).not.toBe(ids[0])`; `:1210` / `:1211` — `expect(...?.score).toBe(before.get(...))`, baseline fixada em `:1202-1203` (`.toBe(2)` / `.toBe(1)`) | ✅ PASS |
| SCORE-18 — total ≥ 0 e nunca decrescente na sessão | 3 rodadas de sala de 2, mesma ordem → 6 e 3 | `tests/game.integration.test.ts:1229` — `expect(total).toBeGreaterThanOrEqual(0)`; `:1230` — `expect(total).toBeGreaterThanOrEqual(previous[index]!)`; `:1237` — `expect(previous).toEqual([6, 3])` | ✅ PASS |

**Status**: ✅ 18/18 ACs cobertas com evidência `file:line`. 13 por teste automatizado, 5 (SCORE-10..14) por inspeção do diff de render + UAT interativo, conforme decisão registrada na spec. **0 spec-precision gaps** — nenhuma AC ficou com resultado vago; onde a spec fixa valor exato, a asserção mira esse valor.

---

## Payload / Conjunction Rule — `score` e `roundPoints`

Os dois campos são asseridos **por valor**, nunca por presença ou por "a chamada aconteceu", e nunca só em conjunção um com o outro:

- `score` isolado por valor: `:885` (`[4,3,2,1]`), `:928` (`0`), `:968` (`2`), `:1002-1004`, `:1058`, `:1071`, `:1084`, `:1096-1097`, `:1114`, `:1154-1155`, `:1168`, `:1183`, `:1202-1203`, `:1210-1211`, `:1237`.
- `roundPoints` isolado por valor: `:772`, `:781`, `:803`, `:836`, `:887`, `:927`, `:969`, `:1003`, `:1070`.
- Distinção `null` × `0` preservada: `toBeNull()` onde a spec pede ausência de ganho e `toBe(0)` onde pede total zerado — as duas nunca são confundidas.
- Nenhuma asserção do tipo `toBeDefined()` / `toHaveProperty` isolada sustenta um AC.

Os mutantes M2, M3 e M6 confirmam empiricamente que essas asserções discriminam.

---

## Discrimination Sensor

Scratch isolado: `git worktree add /tmp/.../scratchpad/mut HEAD` (nunca `git stash`). Cada mutação foi revertida com `git checkout --` antes da seguinte; ao final o worktree foi removido com `git worktree remove --force`.

| # | File:line | Mutação | Rodada 1? | Resultado |
| --- | --- | --- | --- | --- |
| M1 | `server/scoring.ts:11` | `playerCount - rank + 1` → `playerCount - rank` (off-by-one na fórmula) | repetida | ✅ Killed — 17 falhas |
| M2 | `server/game.ts:255` | `player.score += player.roundPoints` → `player.score = player.roundPoints` (acumulação vira atribuição) | **nova** | ✅ Killed — 3 falhas |
| M3 | `server/game.ts:303` | `playAgain` passa a zerar também o total (`candidate.score = 0`) | **nova** | ✅ Killed — 3 falhas |
| M4 | `server/game.ts:206` | `if (player.solved)` → `if (false)` (remove a guarda de acerto repetido, SCORE-04) | **nova** | ✅ Killed — 2 falhas |
| M5 | `server/game.ts:315` | `room.roundPlayerCount = players.length` → `= MAX_PLAYERS` (congela N errado) | **nova** | ✅ Killed — 13 falhas |
| M6 | `server/game.ts:528` | `createPlayer` → `score: 7` (jogador novo não nasce zerado, SCORE-07) | **nova** | ✅ Killed — 13 falhas |
| M-eq | `server/game.ts:254` | `pointsForRank(rank, room.roundPlayerCount)` → `(rank, room.players.size)` | repetida | ⚪ Sobreviveu — **mutante equivalente**, provado por análise de call sites (ver seção 1). Não é lacuna. |

**Sensor depth**: expandido (6 mutações efetivas + 1 recheck de equivalência), 5 delas inéditas nesta rodada.
**Result**: 6/6 mutações não-equivalentes mortas — **PASS ✅**.

**Isolamento verificado**: `git status --porcelain` da árvore real, antes e depois do sensor, idêntico à baseline (` M .specs/LESSONS.md`, ` M .specs/lessons.json`, `?? .specs/features/placar-da-sessao/validation.md`). Nenhuma mutação vazou para a árvore real.

---

## Gate Check

- **Comandos**: `npm run typecheck` (`tsc -p tsconfig.app.json && tsc -p tsconfig.server.json`) e `npx vitest run`
- **Typecheck**: ✅ exit 0, sem erros
- **Testes**: **74 passed, 0 failed, 0 skipped** (5 arquivos), duração 4.27s
  - `tests/game.integration.test.ts` 30 · `tests/wordlist.test.ts` 20 · `tests/origins.test.ts` 10 · `tests/time.test.ts` 9 · `tests/scoring.test.ts` 5
- **Piso exigido**: 74 — atingido exatamente
- **Delta da feature**: +11 testes de placar (5 em `tests/scoring.test.ts`, 6 novos blocos em `tests/game.integration.test.ts`); nenhum teste pré-existente removido ou enfraquecido
- **Flake de timeout de socket**: **não ocorreu** nesta rodada; a suíte passou na primeira execução, sem reexecução necessária

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo (`pointsForRank` é uma linha; nenhuma abstração de uso único) | ✅ |
| Mudanças cirúrgicas (9 arquivos, 3 de produção: `server/game.ts`, `server/scoring.ts`, `shared/protocol.ts`) | ✅ |
| Sem scope creep (nada além dos 18 requisitos; Out of Scope respeitado — sem histórico por rodada, sem ranking global) | ✅ |
| Segue os padrões do projeto (estado em memória, `RoomView` como única superfície, comentários com ID de requisito) | ✅ |
| Spec-anchored outcome check (valores asseridos batem com o que a spec define) | ✅ |
| Cobertura por camada (domínio 1:1 com ACs; integração cobre caminho feliz, saída, queda, reconexão, sala vazia) | ✅ |
| Todo teste em escopo mapeia para um requisito (todos os `describe` citam SCORE-NN) | ✅ |
| Sem `// SPEC_DEVIATION` no diff | ✅ |
| Diretrizes documentadas seguidas: nenhuma no projeto — defaults fortes aplicados | ✅ |

---

## Edge Cases

- [x] N jogadores todos acertando distribuem exatamente `N..1` — `tests/scoring.test.ts:28-36` (soma `N(N+1)/2` para N de 2 a 12) e `tests/game.integration.test.ts:885`
- [x] Último colocado recebe 1, nunca 0 — `tests/scoring.test.ts:16-20`
- [x] Quem cai antes de acertar mantém o total inalterado — `tests/game.integration.test.ts:928`, `:1096-1097`
- [x] Rodadas seguidas com N diferentes usam cada uma o próprio N — `tests/game.integration.test.ts:816` (2) e `:846` (3)
- [x] Campo de pontuação vindo do cliente é ignorado — `tests/game.integration.test.ts:993, 1002-1004`

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| SCORE-01..09 | Done / Verified | ✅ Verified |
| SCORE-10..14 | Done | ✅ Verified (inspeção + UAT, conforme decisão da spec) |
| SCORE-15..18 | Done / Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 18/18 ACs com evidência `file:line` e valor conferido contra a spec · 0 spec-precision gaps
**Sensor**: 6/6 mutações não-equivalentes mortas (5 inéditas nesta rodada); 1 mutante equivalente comprovado
**Gate**: typecheck ✅ · 74 passed, 0 failed, 0 skipped

**As três lacunas da rodada 1 estão fechadas:**

1. **M4 é genuinamente equivalente** — verificado de forma independente pelos call sites, não pela palavra do autor: `players.delete` só existe em `removePlayer`, que só é chamado por `leave`, que durante `playing` devolve a sala ao `lobby` antes de qualquer pontuação seguinte. O comentário em `server/game.ts:241-253` descreve esse invariante com precisão.
2. **SCORE-07 tem evidência de valor** — `tests/game.integration.test.ts:835`, em sala com rodada concluída, com veteranos pontuados como contraste. Mutante M6 confirma que a asserção discrimina.
3. **A reescrita de SCORE-03 é legítima** — endurece a AC em vez de afrouxá-la e resolve uma contradição interna pré-existente da spec, cujo contrato `roundPoints: null` já constava das Assumptions originais e do primeiro commit da feature. As demais 17 ACs estão intocadas no diff. **Não há reescrita de spec para caber na implementação.**

**Observação menor (não é gap)**: o commit `dd3780c` também virou `Confirmed? n → y` na linha "Superfície no protocolo" da tabela de Assumptions. É bookkeeping — não é AC, não altera nenhum critério verificável, e descreve o contrato já implementado em `f3ad9d5`. Registrado por transparência.

**Next steps**: nenhum bloqueio. A feature está pronta para merge; resta apenas o UAT interativo de SCORE-10..14 com o dono do projeto, já previsto na spec como forma de verificação dessas cinco ACs de render.
