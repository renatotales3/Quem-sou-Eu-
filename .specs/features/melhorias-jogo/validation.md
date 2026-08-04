# Melhorias do Jogo — Validation

## Round 1 (2026-08-04) — ❌ FAIL

Kept verbatim below as the historical record. Round 2 (independent re-verification after fix commit `1b229f8`) follows at the end of this document and is the current standing verdict.

## Result: ❌ FAIL

**Date**: 2026-08-04
**Spec**: `.specs/features/melhorias-jogo/spec.md`
**Diff range**: `699dd12..HEAD` (`699dd12` is the planning commit; 14 commits after it are the implementation)
**Verifier**: independent sub-agent (author ≠ verifier)

The build is clean and the stated 32/32 tests pass reliably (3 runs, no jitter). The privacy invariant — the single most important behavior in this codebase — is proven by the strongest mutant in the sensor. But the discrimination sensor found a **surviving mutant** in the pool-exclusion mechanism (mutant b, see below), and two requirements (POOL-07, TIME-09) have **zero automated test evidence**. Per protocol, a surviving mutant means the tests are not discriminating for that behavior, and the feature is not done until that is fixed. Verdict is FAIL, not "issues" — this is a real, sensor-confirmed gap in the feature's own P2 acceptance criteria, not a cosmetic nitpick.

---

## Task Completion

All 13 tasks (T1–T13) are marked done in `tasks.md`, plus one unplanned fix commit (`958e9f4`, PT-BR spelling correction for `Sancho Pança`/`Sr. Darcy`) not tracked as a task but consistent with the feature's scope.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T13 | ✅ Done | One commit each, in order, matching `tasks.md` commit messages |

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero applied: an AC without a `file:line` citation to a test whose asserted value matches the spec-defined outcome is not counted as PASS.

| Requirement | Spec-defined outcome | `file:line` + assertion | Result |
| ----------- | --------------------- | ------------------------ | ------ |
| WORD-01 | Todo `name` exibido em PT-BR reconhecível, zero inglês | `tests/wordlist.test.ts:26-32`, `:73-82` (spot checks) + manual full-catalog audit (see §4) | ✅ PASS (spot-checked automatically; ubiquitous claim over the whole catalog is not mechanically testable per AD-001's own trade-off — confirmed by manual audit, 1 content-quality flag raised in §4, not an AC violation) |
| WORD-02 | Nome BR distinto → BR é `name`, original é alias | `tests/wordlist.test.ts:26-32` — `characterMatches(homemAranha, 'Spider-Man')` → `true`, `'Homem-Aranha'` is the exhibited name | ✅ PASS |
| WORD-03 | Palpite em inglês original é aceito | `tests/wordlist.test.ts:30-31` | ✅ PASS |
| WORD-04 | Palpite BR sem acento é aceito | `tests/wordlist.test.ts:34-42` (`doutor estranho`, `capitao america`) | ✅ PASS |
| WORD-05 | ≥250 entradas, `id` único, `name` normalizado único | `tests/wordlist.test.ts:6-10` | ✅ PASS |
| WORD-06 | Nome do mapa de tradução exibido → suíte falha | `tests/wordlist.test.ts:19-24` — `displayedNames.has(originalName)` checked against **every** value of `englishOriginals` over the **whole** `characters` array | ✅ PASS — oracle confirmed to cover the entire catalog and the entire map (verified by direct read of `server/wordlist.ts:109-162` and the test, not by trusting the design doc) |
| POOL-01 | Rodada atribui só personagens não usados na sala | `tests/wordlist.test.ts:93-100` (unit, deterministic) for the pure function; `tests/game.integration.test.ts:216-240` (integration, **statistical**) for the room wiring | ⚠️ **PARTIAL** — unit-level exclusion is solid, but the integration wiring (`startRound` actually adding picks to `usedCharacterIds` across rounds) is only checked by a test that can pass by chance. **Discrimination sensor confirms this: mutant (b) survived** — see §Sensor. |
| POOL-02 | Dois jogadores da mesma rodada não têm o mesmo personagem | `tests/wordlist.test.ts:84-91` (pickCharacters always returns distinct ids — structural, not statistical, since it slices a shuffled array with no duplicate source ids) | ✅ PASS |
| POOL-03 | Salas distintas podem sortear os mesmos personagens | `tests/game.integration.test.ts:288-338` — `Math.random` mocked to `0` for **both** rooms independently, `charactersB` deterministically equals `charactersA` despite room A's `usedCharacterIds` | ✅ PASS (deterministic, not statistical) |
| POOL-04 | Disponíveis < jogadores → libera catálogo antes do sorteio | `tests/game.integration.test.ts:340-371` — internal `usedCharacterIds` pre-loaded to leave 1 available for 2 players; round starts, both get a character | ✅ PASS |
| POOL-05 | `room:notice` com `CATALOG_RECYCLED` e mensagem exata | `tests/game.integration.test.ts:362-366` — exact object match | ✅ PASS (confirmed by sensor mutant f) |
| POOL-06 | Personagens de rodada abortada continuam marcados como usados | `tests/game.integration.test.ts:242-286` — captures aborted ids, asserts new-round ids differ | ⚠️ **PARTIAL** — same statistical weakness as POOL-01/02 (comparing only 2 old vs 2 new picks out of 304 characters). Not independently re-run against the sensor, but shares the exact mechanism that mutant (b) proved insufficient. |
| POOL-07 | Sala removida → registro de usados descartado com ela | **None** — `tasks.md` T6 explicitly states this is "garantido estruturalmente... sem teste dedicado; não exigido pelo Done-when" | ❌ **GAP (evidence-or-zero)** — true by code inspection (`usedCharacterIds` lives inside `RoomState`, deleted via `rooms.delete()` in `leave()`, `server/game.ts:341`), but zero automated test. Declared as a known, deliberate omission in `tasks.md`, not a silent gap — still counts as 0 under evidence-or-zero. |
| TIME-01 | Início de rodada registra e envia o instante a todos | `tests/game.integration.test.ts:392-396` (registered), `:498-500` (sent to both) | ✅ PASS |
| TIME-02 | Interface exibe `mm:ss`, atualizado a cada segundo | UI layer, declared no test infra in `tasks.md`'s Test Coverage Matrix | ⚠️ Declared out-of-scope for automated coverage (accepted limit, not a failure) — verified only by code read (`src/App.tsx:397-420`) and build gate |
| TIME-03 | Acerto registra duração em ms desde o início | `tests/game.integration.test.ts:401-412` — `KNOWN_DELAY_MS = 120`, asserts `hostSolvedAt - roundStartedAt >= 120` | ✅ PASS |
| TIME-04 | Placar final exibe a duração ao lado do nome | Server data: `tests/game.integration.test.ts:554-558` (ranking carries `solveMs`) | ✅ PASS for data; UI rendering (`src/App.tsx:341`) confirmed by code read only (declared limit) |
| TIME-05 | Toda duração deriva do relógio do servidor, nunca do cliente | Server-authoritative `solveMs`: `tests/game.integration.test.ts:404-412`, `:554-558` + **sensor mutant (c) killed** | ⚠️ **PARTIAL** — the server-computed value is solidly tested. The client-side half of the claim (offset calculated from `serverNow`, never from the client's own clock — `src/App.tsx:404-406`) has **zero automated test**; verified by code read only. This is exactly the AD-003 guarantee and it is UI-layer, so it inherits the declared UI limit — but the AC's wording is ubiquitous over "the system," so flagging explicitly rather than silently passing it. |
| TIME-06 | Reconexão retoma o cronômetro sem reiniciar | Server half: `tests/game.integration.test.ts:483-512` (reconnect returns same `roundStartedAt`) | ✅ PASS for server data; UI retoma (`useRoundClock`) confirmed by code read only (declared limit) |
| TIME-07 | Nova rodada zera início e durações da anterior | `tests/game.integration.test.ts:418-444` | ✅ PASS |
| TIME-08 | Duração ≥ 1h formatada como `h:mm:ss` | `tests/time.test.ts:21-27` — exact boundary (`3.599.999` → `59:59`, `3.600.000` → `1:00:00`) | ✅ PASS (confirmed by sensor mutant e) |
| TIME-09 | Nunca encerra rodada por decurso de tempo | **None** — no `setTimeout`/timer that finishes a round exists in `server/game.ts` (confirmed by full read), but **no test asserts this absence**, and this AC is not even listed in the Test Coverage Matrix's `server/game.ts` row (`tasks.md:24` lists TIME-01/03/04/05/07 only, omitting TIME-09) | ❌ **GAP (evidence-or-zero + matrix omission)** — true by code inspection, zero test, and the coverage matrix itself never claimed it |

**Status**: ❌ Gaps present (POOL-01, POOL-06, POOL-07, TIME-05 partial, TIME-09; ranked below)

---

## Discrimination Sensor

Isolated `git worktree` at `/tmp/.../scratchpad/sensor-worktree` (never the real tree). Baseline `git status --porcelain` of the real tree was empty before and after; confirmed identical post-cleanup (see final section).

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ------------ | ------- |
| a | `pickCharacters` ignores `excludeIds` | `server/wordlist.ts:209` (worktree copy) | `const pool = [...characters];` regardless of `excludeIds` | ✅ Killed — `tests/wordlist.test.ts:102-107` fails deterministically (`expected 304 to be 3`) |
| b | `startRound` doesn't add picks to `usedCharacterIds` | `server/game.ts:304-306` (worktree copy) | Removed the `room.usedCharacterIds.add(player.character.id)` side effect | ❌ **SURVIVED** — all 32 tests still pass, reproduced across 4 independent runs. Root cause: POOL-01/02/06 integration tests draw from a 304-entry catalog without mocking `Math.random`, so the probability of an accidental collision within 2-6 picks is too low to reliably detect a completely broken exclusion mechanism. **→ fix task: strengthen POOL-01/02/06 tests to either mock `Math.random` deterministically (like POOL-03 already does) or assert `usedCharacterIds` membership directly via the existing `getInternalRoom` test helper.** |
| c | `solveMs` computed with a fixed instant (`deriveSolveMs` returns `0`) | `server/game.ts:561` (worktree copy) | `return 0;` instead of `player.solvedAt - room.roundStartedAt` | ✅ Killed — `tests/game.integration.test.ts:556` fails (`expected 0 to be greater than or equal to 80`) |
| d | `viewRoom` reveals the viewer's own character during the round (privacy inversion) | `server/game.ts:435` (worktree copy) | `player.id !== viewerId` → `player.id === viewerId` | ✅ **Killed decisively** — 9 of 32 tests fail, including the explicit privacy assertions (`expect(...character).toBeUndefined()`, `not.toContain(ownA!.name)`) in the pre-existing privacy test. This is the most important invariant in the repo and it is robustly protected. |
| e | `formatDuration` never switches to `h:mm:ss` | `shared/time.ts:15` (worktree copy) | `if (false)` instead of `if (ms >= ONE_HOUR_MS)` | ✅ Killed — `tests/time.test.ts:26` fails (`expected '00:00' to be '1:00:00'`) |
| f | Catalog recycling stops emitting `room:notice` | `server/game.ts:290-293` (worktree copy) | Removed the `io.to(room.code).emit('room:notice', ...)` call | ✅ Killed — `tests/game.integration.test.ts` POOL-04/05 test times out after 4s waiting for `room:notice` |

**Sensor depth**: lightweight (6 targeted mutations, as requested)
**Result**: 5/6 killed — 1 survived (mutant b) → **FAIL** for that mutation; routed to a fix task, not to a code fix by this Verifier

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ — each task touches only the files its `Where` names |
| No scope creep | ✅ — `createGameManager(io)` bug (design.md Risks) correctly left alone as declared out-of-scope |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec-defined outcome) | ⚠️ Mostly yes; POOL-01/02/06 assert distinctness but not the underlying mechanism deterministically (see sensor) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ TIME-09 omitted from the matrix entirely; POOL-07 explicitly declared uncovered |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | `tasks.md` Test Coverage Matrix — no `AGENTS.md`/`CONTRIBUTING.md` in repo, strong defaults applied as declared |

---

## Edge Cases

- [ ] `—` para quem nunca acertou no placar de rodada abortada: UI-only, no test infra; also structurally unreachable as written today — `finishRound` only runs when `everyoneSolved` is true, so a `finished` scoreboard with an unsolved player cannot currently occur. Not a defect, but the edge case as literally stated may be dead code in the current design.
- [ ] Erro máx. 1s de defasagem do relógio do cliente: no simulated-clock-skew test exists; verified only by design reasoning (network RTT bound), not by a test.
- [x] Cronômetro desaparece após saída de jogador: server truth tested (`tests/game.integration.test.ts:446-479`, `roundStartedAt` → `null`); UI hiding (`elapsedMs === null` when `phase !== 'playing'`) is code-read only.
- [x] `pickCharacters(amount > catálogo)` retorna só o disponível, sem repetir: `tests/wordlist.test.ts:102-107` — deterministic, and this is the exact test that kills sensor mutant (a).
- [ ] Alias colidindo entre dois personagens continua avaliando só contra o personagem do próprio jogador: **zero dedicated test**. Structurally guaranteed by `characterMatches(player.character, text)` never doing a cross-character alias lookup (confirmed by code read, `server/game.ts:212`), and a real collision exists in production data today (`'Steve'` is an alias of both `Steve Jobs` and `Steve (Minecraft)`) — untested but pre-existing behavior, not introduced by this feature.

---

## Gate Check

- **Gate command**: `npm run build && npm test`
- **Build result**: clean (`tsc -p tsconfig.app.json && tsc -p tsconfig.server.json && vite build` — 0 errors)
- **Test result**: 32 passed, 0 failed, 0 skipped — run 3 times independently, identical result each time (no jitter observed)
- **Test count before feature**: 13 tests, 3 files (per `tasks.md` T2 baseline note)
- **Test count after feature**: 32 tests, 3 files
- **Delta**: +19 new tests
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| WORD-01 | Implementing | ✅ Verified |
| WORD-02 | Implementing | ✅ Verified |
| WORD-03 | Implementing | ✅ Verified |
| WORD-04 | Implementing | ✅ Verified |
| WORD-05 | Implementing | ✅ Verified |
| WORD-06 | Implementing | ✅ Verified |
| POOL-01 | Implementing | ⚠️ Needs Fix (test strengthening — sensor mutant survived) |
| POOL-02 | Implementing | ✅ Verified |
| POOL-03 | Implementing | ✅ Verified |
| POOL-04 | Implementing | ✅ Verified |
| POOL-05 | Implementing | ✅ Verified |
| POOL-06 | Implementing | ⚠️ Needs Fix (same statistical weakness as POOL-01) |
| POOL-07 | Implementing | ❌ Needs Fix (zero test evidence) |
| TIME-01 | Implementing | ✅ Verified |
| TIME-02 | Implementing | ⚠️ Declared limit (UI, no test infra) |
| TIME-03 | Implementing | ✅ Verified |
| TIME-04 | Implementing | ✅ Verified (data layer) |
| TIME-05 | Implementing | ⚠️ Partial (server half verified; client half code-read only) |
| TIME-06 | Implementing | ✅ Verified (server data layer) |
| TIME-07 | Implementing | ✅ Verified |
| TIME-08 | Implementing | ✅ Verified |
| TIME-09 | Implementing | ❌ Needs Fix (zero test evidence, omitted from coverage matrix) |

---

## §4: Catálogo em PT-BR — Revisão de Conteúdo

Todas as 304 entradas de `characterSets` foram lidas e conferidas categoria por categoria (não apenas os pares em `englishOriginals`). Nomes verificados contra `pt.wikipedia.org` e busca web quando a forma brasileira não era óbvia de memória.

**Achado único**: `DC: ... Super-Moça ...` (`server/wordlist.ts:19`) exibe **"Super-Moça"** como nome, com `"Supergirl"` como alias apenas (`server/wordlist.ts:123`). Isso inverte o padrão que o resto do catálogo segue para a mesma família de personagens: `Superman` e `Batman` são exibidos em inglês (a forma que o brasileiro usa hoje), com as traduções antigas (`Super-Homem`) só como alias. Busca confirmou que as publicações atuais da Panini no Brasil chamam a personagem de **"Supergirl"**, não "Super-Moça" (ex.: "Supergirl: Mulher do Amanhã", Panini, 2022) — "Super-Moça" é a tradução antiga da EBAL, hoje pouco reconhecida. **Recomendação**: inverter — exibir `"Supergirl"`, mover `"Super-Moça"` para alias, espelhando o tratamento de `Superman`/`Batman`. Não é um nome em inglês vazando (não viola WORD-06 literalmente, já que "Super-Moça" é português), mas viola o espírito de AD-001 ("a forma que o brasileiro reconhece").

**Já corrigido antes desta verificação**: `Sancho Panza` → `Sancho Pança` e `Mr Darcy` → `Sr. Darcy` (commit `958e9f4`, fora das 13 tasks mas dentro do diff verificado).

**Confirmados corretos via Wikipédia/busca** (nomes que poderiam parecer suspeitos mas estão certos): `Jasmine` (Aladdin, mantido em inglês na dublagem BR), `Jake, o Cão` e `Finn, o Humano` (Adventure Time, dublagem BR oficial), `Scar` (O Rei Leão, nome não traduzido na dublagem BR).

**Nenhum outro nome em inglês do mapa de tradução** aparece como nome exibido (confirmado por script: interseção entre `Object.values(englishOriginals)` e os 304 nomes exibidos é vazia).

---

## §3: Conformidade com Decisões (AD-001/002/003)

| Decisão | Verificado | Evidência |
| ------- | ---------- | --------- |
| AD-001 (tradução PT-BR) | ✅ Sim, com 1 ressalva de conteúdo (Super-Moça, §4) | `server/wordlist.ts:17-32` |
| AD-002 (`usedCharacterIds` por sala, não global) | ✅ Sim | `server/game.ts:53` (campo em `RoomState`, não em módulo top-level); `tests/game.integration.test.ts:288-338` prova salas distintas não compartilham exclusão |
| AD-003 (`solveMs` derivado, não armazenado) | ✅ Sim | `server/game.ts:559-562` (`deriveSolveMs`, sem campo `solveMs` em `PlayerState`); único ponto que recalcula inline em vez de chamar o helper é `server/game.ts:243` (`player:solved`), duplicação sem impacto funcional mas não usa a função nomeada — nota de qualidade, não de conformidade |
| AD-003 (cliente calcula offset a partir de `serverNow`) | ✅ Sim por leitura de código | `src/App.tsx:404-406` (`offsetRef.current = serverNow - Date.now()`); **sem teste automatizado** (camada UI, limite declarado) |

---

## Fix Plans

### Fix 1: Sensor mutant (b) survived — POOL-01/02/06 tests are statistical, not deterministic

- **Root cause**: `tests/game.integration.test.ts` POOL-01/02 (`:216-240`) and POOL-06 (`:242-286`) draw distinct-id evidence from a 304-entry live catalog without mocking `Math.random`, unlike POOL-03 (`:288-338`) which does. A completely broken `usedCharacterIds` tracking mechanism (mutant b) still passes because collisions are statistically rare with only 2-6 draws from 304 characters.
- **Fix task**: In each of those three tests, additionally assert against the internal `usedCharacterIds` set via the existing `getInternalRoom` helper (already used by the POOL-04/05 test) — e.g., after each round, assert the picked ids are a subset of `room.usedCharacterIds`, and that the set's size grows monotonically as expected. This makes the assertion deterministic instead of probabilistic.
- **Priority**: Major (the exact behavior POOL-01/02 exist to prove is not reliably enforced by the current tests)

### Fix 2: TIME-09 has zero test evidence and is missing from the coverage matrix

- **Root cause**: `tasks.md`'s Test Coverage Matrix row for `server/game.ts` lists "TIME-01/03/04/05/07" and omits TIME-09, so no task was ever asked to cover it.
- **Fix task**: Add a test (or a static assertion, e.g. grep-based lint, if a runtime test is impractical for a negative property) that fails if a timer-based auto-finish is introduced — e.g., start a round, wait past a short simulated duration using `vi.useFakeTimers()` and advance well past any plausible timeout, then assert `phase` is still `'playing'`.
- **Priority**: Minor (true today by inspection, but unprotected against regression)

### Fix 3: POOL-07 has zero test evidence

- **Root cause**: Declared and accepted in `tasks.md` T6 as "not required by Done-when."
- **Fix task**: Add a test that creates a room, has all players leave (`room:leave`), confirms the room is deleted (e.g., a subsequent join to that code returns `ROOM_NOT_FOUND`), which structurally implies `usedCharacterIds` was discarded with it.
- **Priority**: Minor (structurally true, declared limitation, low risk)

### Fix 4: `Super-Moça` inconsistent with sibling character treatment

- **Root cause**: Content/judgment call in T3, inconsistent with how `Superman`/`Batman` were handled in the same category.
- **Fix task**: Swap displayed name to `Supergirl`, move `Super-Moça` to alias in `englishOriginals`/`aliasesByName` as appropriate.
- **Priority**: Minor (cosmetic content quality, not a functional break; does not violate WORD-06 literally)

---

## Summary

**Overall**: ⚠️ Issues — build and stated test count are exactly as claimed (32/32, clean build, 3 stable runs), and the most safety-critical invariant in the codebase (character privacy during a round) is proven by the single strongest mutant in the sensor. But the discrimination sensor found one **survived mutant** in the pool-exclusion mechanism that POOL-01/02/06's own tests are supposed to prove, and two requirements (POOL-07, TIME-09) have zero automated evidence despite being testable server-side domain logic (not UI).

**Spec-anchored check**: 17/22 clean PASS, 4 partial/declared-limit (POOL-01, POOL-06, TIME-02, TIME-05), 1 clean gap counted twice for POOL-07/TIME-09 (zero evidence)
**Sensor**: 5/6 mutations killed, 1 survived
**Gate**: 32 passed, 0 failed, 3 stable runs

**What works**: Catalog translation (WORD-01..06) is solidly and deterministically tested including the tricky WORD-06 oracle-scope check; the recycling/notice flow (POOL-03/04/05) is deterministic via `Math.random` mocking; the timing derivation and formatting (TIME-01/03/07/08) are deterministic; the privacy invariant is the best-protected behavior in the repo.

**Issues found**:
1. POOL-01/02/06 integration tests are statistically weak (survived a real mutation) — needs deterministic assertions against `usedCharacterIds`.
2. TIME-09 and POOL-07 have no automated test at all.
3. `Super-Moça` should be `Supergirl` (alias swap) to match sibling character treatment and current Brazilian usage.

**Next steps**: Route Fix 1–4 above as fix tasks; re-verify after Fix 1 in particular, since it addresses a sensor-confirmed gap in the feature's own P2 acceptance criteria.

---

## Sensor Isolation Confirmation

- Baseline `git status --porcelain` of the real tree: empty, captured before any sensor work.
- Sensor ran entirely inside `git worktree add <scratch> HEAD` at a path under the session scratchpad; `git stash` was never used.
- All 6 mutations were applied, tested, and reverted with `git checkout -- <file>` inside the worktree only.
- Worktree removed with `git worktree remove --force` after cleanup.
- Post-sensor `git status --porcelain` of the real tree: empty — identical to the pre-sensor baseline. `git worktree list` confirms only the real tree remains.

---
---

# Round 2 (2026-08-04) — ❌ FAIL

**Verifier**: independent sub-agent, second and different session (author of the fix commit ≠ this verifier, and ≠ round-1 verifier)
**Diff range re-verified**: `699dd12..HEAD` (`HEAD` = `1b229f8`); fix commit under review: `1b229f8` (4 files: `server/wordlist.ts`, `tests/game.integration.test.ts`, `.specs/LESSONS.md`, `.specs/lessons.json`)

**Verdict rationale**: 2 of the 4 round-1 gaps are cleanly closed (POOL-07, Supergirl). The other 2 are **only partially closed** — the fix commit's own sensor claim ("mutante (b) mata o teste") is true and independently reproduced (5/5 kills), but re-deriving the spec-anchored table from scratch surfaced that the fix did not cover every mechanism the original gaps named: POOL-06's specific claim (departure does **not** clear `usedCharacterIds`) still rests on the same statistically-weak comparison as before, and TIME-09's new test only discriminates within its own 1.2s observation window, not against a realistic round-timer duration. Both are demonstrated with reproducible sensor runs below, not speculation. Per evidence-or-zero and the sensor's own rule ("surviving mutants → feature not done"), the verdict stays **FAIL**, though the gap set is narrower and better-characterized than round 1's.

---

## Round 2: Task / Fix Commit Completion

| Item | Status | Notes |
| ---- | ------ | ----- |
| T1–T13 | ✅ Done | Unchanged from round 1; re-confirmed against current `tasks.md` checkboxes |
| Fix commit `1b229f8` | ✅ Present, addresses all 4 named gaps | Not tracked as a numbered task (like `958e9f4` in round 1), consistent with the feature's pattern of unplanned fix commits for verifier follow-up |

---

## Round 2: Spec-Anchored Acceptance Criteria (re-derived from scratch)

Evidence-or-zero re-applied independently; round-1 citations were not trusted and were re-checked line-by-line against the current tree.

| Requirement | Spec-defined outcome | `file:line` + assertion | Result |
| ----------- | --------------------- | ------------------------ | ------ |
| WORD-01 | Todo `name` exibido em PT-BR reconhecível, zero inglês | `tests/wordlist.test.ts:26-32`, `:73-82` (spot checks); manual audit re-confirmed the one content flag from round 1 is now resolved (see WORD-content note below) | ✅ PASS |
| WORD-02 | Nome BR distinto → BR é `name`, original é alias | `tests/wordlist.test.ts:26-32` — `characterMatches(homemAranha, 'Spider-Man')` → `true`, `'Homem-Aranha'` is the exhibited name | ✅ PASS |
| WORD-03 | Palpite em inglês original é aceito | `tests/wordlist.test.ts:30-31` | ✅ PASS |
| WORD-04 | Palpite BR sem acento é aceito | `tests/wordlist.test.ts:34-41` (`doutor estranho`, `capitao america`) | ✅ PASS |
| WORD-05 | ≥250 entradas, `id` único, `name` normalizado único | `tests/wordlist.test.ts:6-10`, guarded by `:12-17` (silent-collision guard against `totalSeedCount`) | ✅ PASS |
| WORD-06 | Nome do mapa de tradução exibido → suíte falha | `tests/wordlist.test.ts:19-24` — checked against **every** value of `englishOriginals` over the **whole** `characters` array; independently re-run as a standalone script (`Object.values(englishOriginals).includes('Supergirl')` → `false`) since the fix commit removed the `'super moca'` entry (`server/wordlist.ts:120`, diff-confirmed) | ✅ PASS |
| POOL-01 | Rodada atribui só personagens não usados na sala | `tests/game.integration.test.ts:235-240` (per-round assertion against `usedCharacterIds` membership, inside the 3-round loop) **and** `:254-280` (new dedicated test: pool reduced to exactly 2 available, exclusion must hold or the draw is provably wrong) | ✅ PASS — closed. Sensor mutant (a) killed; mutant (b) killed **5/5** independent runs (was 0/4 in round 1) |
| POOL-02 | Dois jogadores da mesma rodada não têm o mesmo personagem | `tests/wordlist.test.ts:84-91` (structural, `pickCharacters` slices a shuffled array with no duplicate source ids) | ✅ PASS (unchanged) |
| POOL-03 | Salas distintas podem sortear os mesmos personagens | `tests/game.integration.test.ts:382-431` — `Math.random` mocked to `0` for both rooms independently | ✅ PASS (unchanged, deterministic) |
| POOL-04 | Disponíveis < jogadores → libera catálogo antes do sorteio | `tests/game.integration.test.ts:434-465` | ✅ PASS (unchanged) |
| POOL-05 | `room:notice` com `CATALOG_RECYCLED` e mensagem exata | `tests/game.integration.test.ts:456-460` — exact object match; sensor mutant (f) killed | ✅ PASS (unchanged) |
| POOL-06 | Personagens de rodada abortada continuam marcados como usados | `tests/game.integration.test.ts:336-380` — **this specific test was not touched by the fix commit.** It still infers correctness by comparing 2 old vs 2 new character ids drawn from a 304-entry catalog (same shape as the round-1 weak pattern), not by asserting `usedCharacterIds` directly | ⚠️ **PARTIAL — gap not fully closed.** See Round 2 Discrimination Sensor, mutant (i): injecting `room.usedCharacterIds.clear()` into `resetAfterDeparture` (which would violate this exact AC) survived 3 of 5 independent runs. The fix commit closed the *startRound-adds-to-set* mechanism (mutant b) but never touched the *departure-does-not-clear* mechanism, which is what POOL-06 actually asserts. |
| POOL-07 | Sala removida → registro de usados descartado com ela | `tests/game.integration.test.ts:321-334` — creates a room, leaves, asserts `getInternalRoom(code)` (a direct read of the `GameManager.rooms` Map) is `undefined` after `room:leave` | ✅ PASS — closed. Sensor mutant (h): removing the `rooms.delete(room.code)` call on last-player-leave is killed |
| TIME-01 | Início de rodada registra e envia o instante a todos | `tests/game.integration.test.ts:486-490` (registered, bounded between `beforeStart`/`afterStart`); `:592-594` (both the reconnect test's original and resumed client observe the same non-null `roundStartedAt`, proving it reaches every player) | ✅ PASS (unchanged) |
| TIME-02 | Interface exibe `mm:ss`, atualizado a cada segundo | UI layer, no test infra (declared limit in `tasks.md`'s Test Coverage Matrix, unchanged) | ⚠️ Declared limit — verified only by code read (`src/App.tsx:397-423`) and build gate |
| TIME-03 | Acerto registra duração em ms desde o início | `tests/game.integration.test.ts:495-506` — `KNOWN_DELAY_MS = 120`, asserts `hostSolvedAt - roundStartedAt >= 120` | ✅ PASS (unchanged) |
| TIME-04 | Placar final exibe a duração ao lado do nome | Server data: `tests/game.integration.test.ts:648-652` (ranking carries `solveMs`); UI rendering `src/App.tsx:341` confirmed by code read only (declared limit) | ✅ PASS for data layer (unchanged) |
| TIME-05 | Toda duração deriva do relógio do servidor, nunca do cliente | Server-authoritative `solveMs`: `tests/game.integration.test.ts:639`, `:650-652` + sensor mutant (c) killed (`deriveSolveMs` returning `0` fails `:650`). Client-side offset (`src/App.tsx:404-406`) still has zero automated test | ⚠️ PARTIAL (unchanged from round 1) — server half solid, client half code-read only; UI-layer, inherits declared limit, flagged because the AC's wording is ubiquitous |
| TIME-06 | Reconexão retoma o cronômetro sem reiniciar | `tests/game.integration.test.ts:577-606` (reconnect returns identical `roundStartedAt`) for server data; UI `useRoundClock` code-read only | ✅ PASS for server data (unchanged) |
| TIME-07 | Nova rodada zera início e durações da anterior | `tests/game.integration.test.ts:512-538` | ✅ PASS (unchanged) |
| TIME-08 | Duração ≥ 1h formatada como `h:mm:ss` | `tests/time.test.ts:21-27` — exact boundary; sensor mutant (e) killed | ✅ PASS (unchanged) |
| TIME-09 | Nunca encerra rodada por decurso de tempo | `tests/game.integration.test.ts:283-319` — **new test, was zero evidence in round 1.** Starts a round, listens for `round:finished` for 1.2s, asserts it never fires, then confirms the round is still accepting guesses (`guess:result`, not `error:ROUND_NOT_PLAYING`) | ⚠️ **PARTIAL — evidence now exists, but the test's discriminating power is narrow.** See Round 2 Discrimination Sensor, mutant (g): a round-ending timer injected at 300ms is killed, but the **same test structurally cannot catch a timer set to any delay ≥ the 1.2s window** — a 5s auto-finish (a far more realistic "someone added a round time limit" mistake than a 300ms one) survives every run, deterministically, because the test simply stops watching after 1.2s. The AC is an absolute/ubiquitous claim ("nunca"); the test only enforces it up to ~1.2s. |

**Status**: ❌ Gaps present (POOL-06 partial, TIME-09 partial, TIME-05 partial — carried unchanged from round 1 as a declared UI limit, not a new gap)

### WORD-content note (Supergirl)

Re-verified independently, not by trusting the commit message:

- `server/wordlist.ts:19` — displayed name in `characterSets.DC` is now `Supergirl` (was `Super-Moça`).
- `server/wordlist.ts:47` — `aliasesByName['supergirl'] = ['Kara Zor-El', 'Super-Moça']`; `characterMatches` confirmed live (`npx tsx` script) to accept both `'Super-Moça'` and unaccented `'super moca'` as correct guesses.
- `server/wordlist.ts:120-160` — the `'super moca': 'Supergirl'` entry was **removed** from `englishOriginals` (diff-confirmed against `1b229f8`). This is the correct move, not just a cosmetic swap: had it stayed, `mergeAliases` would still work, but `Supergirl` would now be a value in `englishOriginals` while also being the displayed `name` — which is exactly the false-positive the design doc warns about (`design.md` Risks table, last row) and would make the WORD-06 test fail on a name that is now correct. Confirmed empirically: `Object.values(englishOriginals).includes('Supergirl')` → `false`.
- Matches the `Superman`/`Batman` treatment (English form displayed, old PT-BR translation as alias only), closing the round-1 content flag.

---

## Round 2: Discrimination Sensor

Isolated `git worktree` at a fresh path under the session scratchpad (`sensor-worktree`, then `sensor-worktree2` for the supplementary check), created from `HEAD` = `1b229f8`. `git stash` was never used. Baseline `git status --porcelain` of the real tree was empty before any sensor work.

**Same 6 mutants as round 1, re-run against the fix commit:**

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ------------ | ------- |
| a | `pickCharacters` ignores `excludeIds` | `server/wordlist.ts:209` (worktree copy) | `const pool = [...characters];` regardless of `excludeIds` | ✅ Killed — 3 tests fail across `wordlist.test.ts` and `game.integration.test.ts` |
| b | `startRound` doesn't add picks to `usedCharacterIds` | `server/game.ts:303-306` (worktree copy) | Removed the `room.usedCharacterIds.add(player.character.id)` side effect | ✅ **Killed 5/5 independent runs** (was 0/4 in round 1) — `tests/game.integration.test.ts:237` (`internal!.usedCharacterIds.size`) fails deterministically every time. This is the fix that closes the round-1 headline finding. |
| c | `solveMs` computed with a fixed instant (`deriveSolveMs` returns `0`) | `server/game.ts:561` (worktree copy) | `return 0;` instead of `player.solvedAt - room.roundStartedAt` | ✅ Killed — `tests/game.integration.test.ts:650` fails (`expected 0 to be greater than or equal to 80`) |
| d | `viewRoom` reveals the viewer's own character during the round (privacy inversion) | `server/game.ts:435` (worktree copy) | `player.id !== viewerId` → `player.id === viewerId` | ✅ **Killed decisively** — 10 of 35 tests fail |
| e | `formatDuration` never switches to `h:mm:ss` | `shared/time.ts:15` (worktree copy) | `if (false)` instead of `if (ms >= ONE_HOUR_MS)` | ✅ Killed — `tests/time.test.ts:26` fails |
| f | Catalog recycling stops emitting `room:notice` | `server/game.ts:289-293` (worktree copy) | Removed the `io.to(room.code).emit('room:notice', ...)` call | ✅ Killed — POOL-04/05 test times out waiting for `room:notice` |

**This verifier's own 2 mutants** (chosen where round-2 re-derivation found the coverage still thinnest):

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ------------ | ------- |
| g | Inject a round-ending timer into `startRound` (violates TIME-09) | `server/game.ts:311` (worktree copy, after `broadcastRoundStarted`) | `setTimeout(() => { if (room.phase === 'playing') this.finishRound(room); }, DELAY)` | **Delay-dependent — see below.** At `DELAY = 300ms`: ✅ Killed (`finished` becomes `true` inside the 1.2s window). At `DELAY = 5000ms`: ❌ **Survived** — deterministically, every run, because the test only watches for 1.2s. This is the realistic case: a round time limit added by mistake is far more likely to be tens of seconds than a fraction of a second. |
| h | Room not removed from the Map on last-player-leave (violates POOL-07) | `server/game.ts:340-342` (worktree copy) | Commented out `this.rooms.delete(room.code)` inside `leave()`'s `room.players.size === 0` branch | ✅ Killed — `tests/game.integration.test.ts:333` fails (`getInternalRoom` still returns the room object) |

**Supplementary check (not one of the 2 required, run because round-2 re-derivation of POOL-06 looked thin — reported for completeness):**

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ------------ | ------- |
| i | `resetAfterDeparture` clears `usedCharacterIds` (violates POOL-06) | `server/game.ts:541` (worktree copy, `sensor-worktree2`) | Added `room.usedCharacterIds.clear();` at the top of `resetAfterDeparture` | ❌ **Survived 3 of 5 independent runs** (killed in runs 2 and 5 only, by chance collision) — reproduces the exact statistical weakness round 1 flagged for mutant (b), now isolated to the one mechanism the fix commit did not touch |

**Sensor depth**: lightweight-plus (6 required + 2 own + 1 supplementary = 9 mutations run; mutant (b) alone re-run 5×, mutant (i) re-run 5×)
**Result**: 7/9 distinct mutations killed cleanly; 1 (`g` at realistic delay) structurally cannot be killed by the current test; 1 (`i`) killed only by chance (3/5 survived) → **sensor verdict: FAIL** for TIME-09's discriminating power and for POOL-06's departure-preserves-ids mechanism specifically

**Isolation**: both worktrees created from `HEAD` at scratchpad paths, never `git stash`. All mutations applied and reverted with `git checkout -- <file>` inside the worktrees only. Both worktrees removed with `git worktree remove --force` after use. Post-sensor `git status --porcelain` of the real tree matches the pre-sensor baseline exactly (see confirmation at the end of this section).

---

## Round 2: Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — fix commit touches only `server/wordlist.ts` (2-line swap) and `tests/game.integration.test.ts` (additive) |
| Surgical changes | ✅ — no unrelated file touched |
| No scope creep | ✅ |
| Matches patterns | ✅ — new tests reuse `getInternalRoom`, `waitForEvent`, existing helpers |
| Spec-anchored outcome check (asserted values match spec-defined outcome) | ⚠️ POOL-06's own test still asserts distinctness, not the mechanism it names; TIME-09's test asserts absence-within-a-window, not absence |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ TIME-09 and POOL-07 now have rows/evidence, but TIME-09's is narrow |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | `tasks.md` Test Coverage Matrix — unchanged, no `AGENTS.md`/`CONTRIBUTING.md` in repo |

---

## Round 2: Gate Check

- **Gate command**: `npm run build && npm test`
- **Build result**: clean (0 errors) — re-run once, matches round 1
- **Test result**: 35 passed, 0 failed, 0 skipped — run twice on the real tree (baseline before sensor work, and again after `git worktree remove`), identical both times; no jitter observed
- **Test count before this fix commit**: 32 tests, 3 files (round-1 baseline)
- **Test count after this fix commit**: 35 tests, 3 files
- **Delta**: +3 new tests (POOL-01 deterministic pool-of-2 test, TIME-09 test, POOL-07 test) + strengthened assertions inside the existing 3-round POOL-01/02 test (no new `it` block for that one)
- **Skipped tests**: none
- **Failures**: none

---

## Round 2: Requirement Traceability Update

| Requirement | Round-1 Status | Round-2 Status |
| ----------- | --------------- | ----------- |
| WORD-01 | ✅ Verified (1 content flag) | ✅ Verified (content flag resolved) |
| WORD-02 | ✅ Verified | ✅ Verified |
| WORD-03 | ✅ Verified | ✅ Verified |
| WORD-04 | ✅ Verified | ✅ Verified |
| WORD-05 | ✅ Verified | ✅ Verified |
| WORD-06 | ✅ Verified | ✅ Verified |
| POOL-01 | ⚠️ Needs Fix | ✅ Verified |
| POOL-02 | ✅ Verified | ✅ Verified |
| POOL-03 | ✅ Verified | ✅ Verified |
| POOL-04 | ✅ Verified | ✅ Verified |
| POOL-05 | ✅ Verified | ✅ Verified |
| POOL-06 | ⚠️ Needs Fix | ⚠️ **Still Needs Fix** (different mechanism than mutant (b); see mutant (i)) |
| POOL-07 | ❌ Needs Fix | ✅ Verified |
| TIME-01 | ✅ Verified | ✅ Verified |
| TIME-02 | ⚠️ Declared limit | ⚠️ Declared limit (unchanged) |
| TIME-03 | ✅ Verified | ✅ Verified |
| TIME-04 | ✅ Verified (data layer) | ✅ Verified (data layer) |
| TIME-05 | ⚠️ Partial | ⚠️ Partial (unchanged) |
| TIME-06 | ✅ Verified (server data layer) | ✅ Verified (server data layer) |
| TIME-07 | ✅ Verified | ✅ Verified |
| TIME-08 | ✅ Verified | ✅ Verified |
| TIME-09 | ❌ Needs Fix | ⚠️ **Needs Fix (narrower)** — evidence exists now, window too short for realistic threat |

---

## Round 2: Fix Plans

### Fix 1 (carried forward, narrowed): POOL-06's departure-preserves-ids mechanism is still statistically weak

- **Root cause**: The fix commit strengthened the 3-round POOL-01/02 test (added a direct `usedCharacterIds` assertion) and added a brand-new deterministic POOL-01 test, but never touched the POOL-06 test itself (`tests/game.integration.test.ts:336-380`), which still proves its claim only by comparing 2 old vs 2 new character ids out of a 304-entry catalog.
- **Fix task**: In the POOL-06 test, after the departure and the second round starts, assert directly that the two aborted-round character ids are still members of `getInternalRoom(...).usedCharacterIds` (they should never have left the set), the same pattern already used for POOL-01/02. This makes the assertion deterministic instead of relying on a ~99% collision-avoidance probability.
- **Priority**: Major — this is the same class of gap the round-1 sensor already flagged; round 2 shows it survives specifically because the fix targeted a different (though related) mechanism.

### Fix 2 (carried forward, narrowed): TIME-09's test window doesn't discriminate against a realistic timer

- **Root cause**: The new test observes for a fixed 1.2s and asserts no `round:finished` arrived. Any timer-based auto-finish set to ≥ 1.2s (i.e., anything a real "round time limit" feature would plausibly use) passes through undetected, every time, not by chance.
- **Fix task**: Either (a) make the observation window a documented, generous multiple of any plausible round-timer constant the team would ever add (e.g., tie it to a named constant search / lint rule that fails the build if a `setTimeout`/timer literal appears in `startRound`'s call graph), or (b) accept the current test only as a "no *obviously* fast timer" guard and downgrade the AC's coverage claim in the Test Coverage Matrix accordingly, rather than listing it as equivalent coverage to the other server-side ACs.
- **Priority**: Minor-to-Major — true today by full-file inspection (still zero real timer in `server/game.ts`), but the regression guard is weaker than its own test name implies.

### Fix 3 — CLOSED: POOL-07

- Test now exists and the sensor confirms it discriminates (mutant h killed). No further action.

### Fix 4 — CLOSED: Supergirl

- Displayed name swapped, alias correctly moved, `englishOriginals` entry correctly removed (not just left stale), confirmed live that `Super-Moça` and `super moca` still resolve as correct guesses. No further action.

---

## Round 2: Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 19/22 clean PASS, 3 partial (POOL-06, TIME-09 — both narrowed from round 1's "zero evidence"; TIME-05 — unchanged declared UI limit)
**Sensor**: 7/9 distinct mutations killed cleanly; 1 structural miss (g at realistic delay), 1 chance-dependent survival (i, 3/5)
**Gate**: 35 passed, 0 failed, re-run twice, no jitter

**What works**: Both mutant-b (POOL-01/02's core exclusion-registration mechanism) and POOL-07 (room disposal) are now deterministically proven and independently reproduced killing their sensor mutants (5/5 and 1/1 respectively). The Supergirl swap is correct and complete, not just cosmetic — verified live, not just by diff-reading. The privacy invariant remains the best-protected behavior in the repo (mutant d: 10/35 tests fail).

**Issues found**:
1. POOL-06 still names a mechanism (departure preserves `usedCharacterIds`) that its own test cannot deterministically prove — confirmed by a supplementary mutant surviving 3/5 runs.
2. TIME-09's new test has a hard structural ceiling: it cannot catch any auto-finish timer ≥ its own 1.2s observation window, which is the realistic failure mode, not the unrealistic one it does catch.

**Next steps**: Route Fix 1 and Fix 2 above as fix tasks. Both are narrower and more precisely characterized than round 1's findings, but neither is closed — a third round of fix→re-verify is authorized under the skill's 3-iteration bound (round 1 → round 2 is iteration 1 of that bound, having closed 2 of 4 gaps; this would be iteration 2).

---

## Round 2: Sensor Isolation Confirmation

- Baseline `git status --porcelain` of the real tree: empty, captured before any round-2 sensor work.
- Two scratch worktrees used in sequence (`sensor-worktree` for mutants a/b/c/d/e/f/g/h, `sensor-worktree2` for supplementary mutant i), both created via `git worktree add <scratch> HEAD`, both removed via `git worktree remove --force` after use. `git stash` was never used in either.
- All mutations were applied via `git checkout -- <file>` reverts inside the worktrees only; the real tree was never edited by sensor work.
- Post-sensor `git status --porcelain` of the real tree matches the pre-sensor baseline exactly (empty) — confirmed after both worktrees were removed. `git worktree list` shows only the real tree.
- The only change made to the real tree during this validation round is this file, `validation.md` itself (adding the round-1 marker heading and this round-2 section), plus (if committed) `.specs/LESSONS.md` / `.specs/lessons.json` for any new distilled lessons — never source or test files.

---
---

# Round 3 (2026-08-04) — ✅ PASS

**Verifier**: independent sub-agent, third and final session (author of fix commit `8c3dabd` ≠ this verifier, and ≠ round-1/round-2 verifiers)
**Diff range re-verified**: `699dd12..HEAD` (`HEAD` = `8c3dabd`); fix commit under review: `8c3dabd` (1 file: `tests/game.integration.test.ts`, +29/-0)

**Verdict rationale**: Round 2 left exactly two named gaps open — POOL-06's statistically-weak departure assertion, and TIME-09's 1.2s observation window that structurally cannot detect a realistic timer. Commit `8c3dabd` closes both. Re-deriving the full 22-requirement spec-anchored table from scratch (not trusting round 1/2 citations) finds 21/22 clean PASS and 1 unchanged, previously-accepted declared limit (TIME-02, UI layer with no test infra — not a new gap, not counted against the verdict). The discrimination sensor re-ran all 9 mutants from rounds 1–2 plus 2 new ones of this verifier's own choosing: **11/11 killed**, with the two previously-fragile mutants re-run at the rigor this round's brief demanded — mutant (i) 5/5 kills (was 3/5 survived in round 2), mutant (g) killed at all three tested durations (300ms, 5s, 300s — was survived at 5s in round 2). No survivors. Gate is clean (36/36 tests, build passes, 2 stable runs). Verdict is **PASS**.

---

## Round 3: Task / Fix Commit Completion

| Item | Status | Notes |
| ---- | ------ | ----- |
| T1–T13 | ✅ Done | Unchanged; re-confirmed against current `tasks.md` checkboxes |
| Fix commit `1b229f8` (round-2 subject) | ✅ Present | Unchanged from round 2 |
| Fix commit `8c3dabd` (round-3 subject) | ✅ Present, addresses both named round-2 gaps | Test-only change: `tests/game.integration.test.ts` +29 lines, 0 source files touched |

---

## Round 3: Spec-Anchored Acceptance Criteria (re-derived from scratch)

Evidence-or-zero re-applied independently against current `HEAD` (`8c3dabd`); round-1/round-2 citations were not trusted and every line number below was re-read from the current tree.

| Requirement | Spec-defined outcome | `file:line` + assertion | Result |
| ----------- | --------------------- | ------------------------ | ------ |
| WORD-01 | Todo `name` exibido em PT-BR reconhecível, zero inglês | `tests/wordlist.test.ts:26-32`, `:34-42` (spot checks); `server/wordlist.ts:19,47` confirms Supergirl swap still holds (no regression since round 2) | ✅ PASS |
| WORD-02 | Nome BR distinto → BR é `name`, original é alias | `tests/wordlist.test.ts:26-32` — `characterMatches(homemAranha, 'Spider-Man')` → `true`, `'Homem-Aranha'` is the exhibited name | ✅ PASS |
| WORD-03 | Palpite em inglês original é aceito | `tests/wordlist.test.ts:30-31` | ✅ PASS |
| WORD-04 | Palpite BR sem acento é aceito | `tests/wordlist.test.ts:34-42` (`doutor estranho`, `capitao america`) | ✅ PASS |
| WORD-05 | ≥250 entradas, `id` único, `name` normalizado único | `tests/wordlist.test.ts:6-10`, guarded against silent collision by `:12-17` (`characters.length === totalSeedCount`) | ✅ PASS |
| WORD-06 | Nome do mapa de tradução exibido → suíte falha | `tests/wordlist.test.ts:19-24` — checked against every value of `englishOriginals` over the whole `characters` array; sensor mutant (j) on a related function (`characterMatches`) killed cleanly, confirming the oracle's discriminating power on this module is still solid | ✅ PASS |
| POOL-01 | Rodada atribui só personagens não usados na sala | `tests/game.integration.test.ts:236-241` (per-round `usedCharacterIds` membership assertion inside the 3-round loop) and `:255-282` (deterministic pool-of-2 test) | ✅ PASS — sensor mutant (b) killed 5/5 (re-confirmed this round, see Sensor) |
| POOL-02 | Dois jogadores da mesma rodada não têm o mesmo personagem | `tests/wordlist.test.ts:84-91` (`pickCharacters` returns structurally distinct ids — slices a shuffled array with no duplicate source ids) | ✅ PASS |
| POOL-03 | Salas distintas podem sortear os mesmos personagens | `tests/game.integration.test.ts:411-461` — `Math.random` mocked to `0` independently for room A and room B, `charactersB` deterministically equals `charactersA` | ✅ PASS |
| POOL-04 | Disponíveis < jogadores → libera catálogo antes do sorteio | `tests/game.integration.test.ts:463-494` — `usedCharacterIds` pre-loaded to leave 1 available for 2 players; round starts, both get a character | ✅ PASS |
| POOL-05 | `room:notice` com `CATALOG_RECYCLED` e mensagem exata | `tests/game.integration.test.ts:485-489` — exact object match (`{ code: 'CATALOG_RECYCLED', message: 'Os personagens deram a volta: o catálogo foi liberado de novo.' }`) | ✅ PASS — sensor mutant (f) killed |
| POOL-06 | Personagens de rodada abortada continuam marcados como usados | `tests/game.integration.test.ts:383-387` — **the exact fix from `8c3dabd`.** Direct assertion against `getInternalRoom(...).usedCharacterIds` immediately after the departure: both aborted-round character ids are members, and `size === 2`. This is a deterministic assertion against the mechanism itself, not an inference from the next round's draw | ✅ PASS — **closed.** Sensor mutant (i), `resetAfterDeparture` clearing the set, killed **5/5** independent runs this round (was 3/5 survived in round 2) |
| POOL-07 | Sala removida → registro de usados descartado com ela | `tests/game.integration.test.ts:339-352` — creates a room, leaves, asserts `getInternalRoom(code)` is `undefined` afterward | ✅ PASS — sensor mutant (h) killed |
| TIME-01 | Início de rodada registra e envia o instante a todos | `tests/game.integration.test.ts:507-519` (registered, bounded between `beforeStart`/`afterStart`); `:508-512` (both host and guest clients independently await and receive `round:started`, proving delivery to every player) | ✅ PASS |
| TIME-02 | Interface exibe `mm:ss`, atualizado a cada segundo | UI layer, no test infra (declared limit, unchanged since round 1) — verified only by code read `src/App.tsx:397-423`, `:435-436` and the build gate | ⚠️ Declared limit (accepted — see Rules; not counted as a gap) |
| TIME-03 | Acerto registra duração em ms desde o início | `tests/game.integration.test.ts:524-535` — `KNOWN_DELAY_MS = 120`, asserts `hostSolvedAt - roundStartedAt >= 120` | ✅ PASS |
| TIME-04 | Placar final exibe a duração ao lado do nome | Server data: `tests/game.integration.test.ts:677-681` (ranking carries `solveMs`, both entries checked); UI rendering `src/App.tsx:341` confirmed by code read only (declared limit) | ✅ PASS for data layer |
| TIME-05 | Toda duração deriva do relógio do servidor, nunca do cliente | Server-authoritative `solveMs`: `tests/game.integration.test.ts:668`, `:677-681` + sensor mutant (c) killed (`deriveSolveMs` forced to `0` fails at line 679). Client-side offset (`src/App.tsx:404-406`, `offsetRef.current = serverNow - Date.now()`) has zero automated test — UI-layer, inherits the declared limit, but the AC's wording is ubiquitous over "the system" so flagged rather than silently passed | ⚠️ PARTIAL (unchanged since round 1 — declared UI limit, not a regression) |
| TIME-06 | Reconexão retoma o cronômetro sem reiniciar | `tests/game.integration.test.ts:606-634` — reconnect returns identical `roundStartedAt` (`expect((await resumed).room.roundStartedAt).toBe(originalRoundStartedAt)`) for server data; UI `useRoundClock` (`src/App.tsx:397-423`) code-read only | ✅ PASS for server data layer |
| TIME-07 | Nova rodada zera início e durações da anterior | `tests/game.integration.test.ts:541-567` — `playAgain` zeroes `roundStartedAt` and both players' `solvedAt` | ✅ PASS |
| TIME-08 | Duração ≥ 1h formatada como `h:mm:ss` | `tests/time.test.ts:21-27` — exact boundary (`3.599.999` → `59:59`, `3.600.000` → `1:00:00`) | ✅ PASS — sensor mutant (e) killed |
| TIME-09 | Nunca encerra rodada por decurso de tempo | `tests/game.integration.test.ts:284-320` (behavioral, 1.2s observation window, still-alive follow-up guess) **and** `:322-337` (structural guard added by `8c3dabd`: exactly one `setTimeout`/`setInterval` in `server/game.ts`, exactly matching the idle-room cleanup interval, and exactly one call site reaching `finishRound`) | ✅ PASS — **closed.** Sensor mutant (g) re-run at three durations this round (300ms, 5s, 300s): **killed at all three** — the structural test catches the 5s and 300s cases the behavioral test alone cannot (see Round 3 Discrimination Sensor and the critical assessment below) |

**Status**: ✅ All 22 requirements covered; 21 clean PASS, 1 unchanged declared UI limit (TIME-02) not counted as a gap, 1 unchanged partial (TIME-05, client-half UI code-read only, declared limit). No requirement regressed relative to round 2. Both round-2 gaps (POOL-06, TIME-09) are closed with reproducible sensor evidence.

---

## Round 3: Discrimination Sensor

Isolated `git worktree add <scratch> HEAD` at a fresh path under the session scratchpad (`sensor-worktree`), created from `HEAD` = `8c3dabd`, with `node_modules` symlinked in (not copied) so the real tree's install is never touched. `git stash` was never used. Baseline `git status --porcelain` of the real tree was empty before any sensor work, confirmed again identical after full cleanup (see isolation confirmation below).

**The 6 original mutants (rounds 1–2), re-run against `8c3dabd`:**

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ------------ | ------- |
| a | `pickCharacters` ignores `excludeIds` | `server/wordlist.ts:209` (worktree copy) | `const pool = [...characters];` regardless of `excludeIds` | ✅ Killed — 3 tests fail (`wordlist.test.ts` + `game.integration.test.ts`) |
| b | `startRound` doesn't add picks to `usedCharacterIds` | `server/game.ts:304-306` (worktree copy) | `if (false) { room.usedCharacterIds.add(...) }` | ✅ Killed — 2 tests fail deterministically (`game.integration.test.ts:238`, `:385-387`) |
| c | `solveMs` computed with a fixed instant | `server/game.ts:561` (worktree copy) | `deriveSolveMs` returns `0` instead of `player.solvedAt - room.roundStartedAt` | ✅ Killed — `tests/game.integration.test.ts:679` fails |
| d | `viewRoom` reveals the viewer's own character during the round (privacy inversion) | `server/game.ts:435` (worktree copy) | `player.id !== viewerId` → `player.id === viewerId` | ✅ **Killed decisively** — 10 of 15 tests in `game.integration.test.ts` fail, including the explicit privacy assertions |
| e | `formatDuration` never switches to `h:mm:ss` | `shared/time.ts:15` (worktree copy) | `if (false)` instead of `if (ms >= ONE_HOUR_MS)` | ✅ Killed — `tests/time.test.ts:26` fails |
| f | Catalog recycling stops emitting `room:notice` | `server/game.ts:288-293` (worktree copy) | Removed the `io.to(room.code).emit('room:notice', ...)` call | ✅ Killed — POOL-04/05 test times out (4s) waiting for `room:notice` |

**The 3 mutants round 2 added, re-run against `8c3dabd` at this round's required rigor:**

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ------------ | ------- |
| g | Round-ending timer injected into `startRound` (violates TIME-09) | `server/game.ts:310` (worktree copy, after `broadcastRoundStarted`) | `setTimeout(() => { if (room.phase === 'playing') this.finishRound(room); }, DELAY)` | **Tested at 3 durations per this round's brief — killed at all 3.** `DELAY = 300`: ✅ killed (both the behavioral test at 1.2s and the structural guard fail). `DELAY = 5000`: ✅ killed — behavioral test now *passes* (correctly, since 5s > 1.2s window — this is expected, not a false negative in the behavioral test's design) but the **structural guard fails** (`schedulers` array gains `'setTimeout('`, callSites stays fine but scheduler-count assertion breaks), so the overall file still fails. `DELAY = 300000` (5 min): ✅ killed — same mechanism as 5s, structural guard fails identically regardless of the delay value, confirming the guard's duration-independence claim from the `8c3dabd` commit message |
| h | Room not removed from the Map on last-player-leave (violates POOL-07) | `server/game.ts:340-342` (worktree copy) | Removed `this.rooms.delete(room.code)` from `leave()`'s `room.players.size === 0` branch | ✅ Killed — `tests/game.integration.test.ts:351` fails (`getInternalRoom` still returns the room) |
| i | `resetAfterDeparture` clears `usedCharacterIds` (violates POOL-06) | `server/game.ts:541` (worktree copy) | Added `room.usedCharacterIds.clear();` at the top of `resetAfterDeparture` | **Re-run 5 times per this round's brief — killed 5/5** (was 3/5 survived in round 2). `tests/game.integration.test.ts:385-387` now asserts the `usedCharacterIds` set directly right after the departure, so the mutation fails deterministically every run — no more dependence on a 2-in-304 collision |

**This verifier's own 2 new mutants** (chosen at points judged fragile — the two functions with the widest surface area and the least direct test-of-the-mechanism coverage):

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ------------ | ------- |
| j | `characterMatches` stops checking aliases (only exact `name` match) | `server/wordlist.ts:221` (worktree copy) | `return [character.name].some(...)` instead of `[character.name, ...character.aliases].some(...)` | ✅ Killed — 5 of 36 tests fail across `wordlist.test.ts` (WORD-02/03/04 alias-acceptance assertions) |
| k | `pickCharacters` ignores its `amount` cap | `server/wordlist.ts:216` (worktree copy) | `return pool;` instead of `return pool.slice(0, amount);` | ✅ Killed — 2 of 36 tests fail (`wordlist.test.ts:96`: expected picked-array length to equal the requested amount, got the full remaining pool instead) |

**Sensor depth**: lightweight-plus — 11 distinct mutations, with the two round-2 survivors re-run at the rigor this round's brief specifically required (mutant `i`: 5 independent runs; mutant `g`: 3 distinct durations spanning 3 orders of magnitude).
**Result**: **11/11 mutations killed. Zero survivors.** No fix task generated by this round's sensor.

---

## Round 3: Critical Assessment of the TIME-09 Structural Guard

The commit `8c3dabd` added `tests/game.integration.test.ts:322-337`: it reads the raw source text of `server/game.ts` and asserts (a) exactly one `setTimeout`/`setInterval` call exists in the file and it is the idle-room cleanup interval, and (b) exactly one line in the file calls `this.finishRound(`.

**Does it catch the regression at any duration?** Yes, empirically confirmed this round at 300ms, 5s, and 300s (5 min) — the guard's assertions are about the *presence* of a scheduling primitive and a *second call site* to `finishRound`, neither of which depends on the delay value passed to `setTimeout`. This is the correct fix for the specific defect round 2 found: the behavioral test's 1.2s window is a real, un-fixable ceiling for a wall-clock-based test, and a text-presence check has no such ceiling.

**Is it frail in a bad way?** Partially, yes — it is a textual/structural check, not a semantic one, and it will false-positive (fail) on legitimate refactors that do not change TIME-09 behavior at all:
- Renaming `cleanupTimer`/`cleanupRooms`, or moving idle-room cleanup into a separate class/module, breaks the hardcoded string match `'setInterval(() => this.cleanupRooms(), 60_000)'` (`tests/game.integration.test.ts:332`).
- Extracting `finishRound`'s single call site into a differently-named wrapper (e.g., a future `maybeAdvanceRound()` helper) breaks the `this.finishRound(` line-count regex even with zero behavior change.
- Adding a second, legitimate call site to `finishRound` for an unrelated feature (e.g., a future "host ends round early" button) would break this test even though it has nothing to do with a time-based auto-finish — this is arguably *correct* conservatism (any new path to `finishRound` deserves a second look), but it does mean the test's failure message ("guarda estrutural quebrou") will not by itself tell a future engineer whether the change is the regression it's designed to catch or an unrelated legitimate addition; they'd have to read the diff to know.
- A regression that avoids the literal substrings the regex looks for — e.g. a timer imported from a helper module and invoked as `scheduleFinish(room, this)`, or `this['finishRound'](room)`, or a bound reference stored in a variable and passed to `setTimeout` from a *different* file — would not be caught by this guard at all. This is a real blind spot, not just theoretical: the guard only inspects `server/game.ts`'s own text, so any timer-based regression that lives one function call away (in `server/wordlist.ts`, a new `server/scheduler.ts`, etc.) or that reaches `finishRound` through anything other than the literal string `this.finishRound(` slips through undetected by this specific guard (though a mutation of that shape would very likely also change other observable behavior and get caught by something else in the suite — this was not separately tested this round and should not be assumed).

**Is the trade-off acceptable?** Yes, on balance, given the constraints actually in play here. The integration suite uses a real HTTP server and real `socket.io` sockets (`server/game.ts`'s own dependency), and `socket.io` relies on real timers internally for its own heartbeat/ping-pong mechanics; swapping in `vi.useFakeTimers()` globally for a long-duration behavioral test risks breaking the socket connection lifecycle unless carefully scoped, which nothing else in this test file currently attempts (checked: no existing use of `vi.useFakeTimers` anywhere in `tests/` or `server/`). Given that constraint, a textual guard is a reasonable, low-cost second line of defense specifically for the one behavior (absence of a time-based auto-finish) that a real-clock behavioral test cannot bound. The brittleness is a real, ongoing maintenance cost — not free — but it is a narrow, single-purpose test whose failure is cheap to diagnose (one file, one clearly-commented assertion block) and it does close a genuine, previously-open regression gap.

**Is there a better approach available in this project?** Two, both left as a suggestion, not implemented (out of scope for this Verifier role):
1. **Fake-timer behavioral test, scoped narrowly.** Vitest's `vi.useFakeTimers({ shouldAdvanceTime: true })` mode advances real time alongside the virtual clock, which is specifically designed to keep I/O (including socket.io's heartbeats) alive while `vi.advanceTimersByTime()` fast-forwards application-level timers. If this mode works with this project's socket.io setup (not verified by this Verifier — would need its own spike), it would let the existing behavioral test (`tests/game.integration.test.ts:284-320`) advance past any plausible duration (e.g. 24h) in test-wall-clock milliseconds, killing mutant (g) at any delay through *behavior*, not text-matching — immune to the renaming/refactoring false-positives above, because it doesn't read source text at all.
2. **A dedicated static-analysis script**, e.g. `scripts/check-no-round-timer.mjs` under the project root (parallel to how this skill ships its own `scripts/validate_*.py`), run as part of `npm run build` or a new `npm run lint` step, with the intent ("this file must never introduce a call that finishes a round on a timer") stated as a named, documented gate rather than buried inside an integration test's `it()` block. This doesn't fix the brittleness, but it separates "this is an intentional architectural invariant" from "this is a test asserting behavior," which reads more honestly to a future engineer who hits the failure.

Neither is implemented by this Verifier — both are reported as options for whoever owns this codebase next.

---

## Round 3: Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — fix commit touches only `tests/game.integration.test.ts`, +29/-0, no source files |
| Surgical changes | ✅ — no unrelated file touched |
| No scope creep | ✅ |
| Matches patterns | ✅ — reuses `getInternalRoom`, existing `describe`/`it` structure |
| Spec-anchored outcome check (asserted values match spec-defined outcome) | ✅ — POOL-06 now asserts the named mechanism directly; TIME-09's structural half asserts the named mechanism's absence directly (see critical assessment above for the trade-off this brings) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — all server-side ACs (POOL-01..07, TIME-01/03/04/05/07/09) now have deterministic evidence; TIME-02/TIME-05-client remain the same declared UI limit as round 1 |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | `tasks.md` Test Coverage Matrix — unchanged, no `AGENTS.md`/`CONTRIBUTING.md` in repo |

---

## Round 3: Gate Check

- **Gate command**: `npm run build && npm test`
- **Build result**: clean (0 errors), re-run once on the real tree
- **Test result**: 36 passed, 0 failed, 0 skipped — run twice on the real tree (before and after sensor work), identical both times; no jitter observed
- **Test count before this fix commit**: 35 tests, 3 files (round-2 baseline)
- **Test count after this fix commit**: 36 tests, 3 files
- **Delta**: +1 test (the TIME-09 structural guard); POOL-06's existing test was strengthened in place (assertions added, no new `it` block)
- **Skipped tests**: none
- **Failures**: none

---

## Round 3: Requirement Traceability Update

| Requirement | Round-2 Status | Round-3 Status |
| ----------- | --------------- | ----------- |
| WORD-01 | ✅ Verified | ✅ Verified |
| WORD-02 | ✅ Verified | ✅ Verified |
| WORD-03 | ✅ Verified | ✅ Verified |
| WORD-04 | ✅ Verified | ✅ Verified |
| WORD-05 | ✅ Verified | ✅ Verified |
| WORD-06 | ✅ Verified | ✅ Verified |
| POOL-01 | ✅ Verified | ✅ Verified |
| POOL-02 | ✅ Verified | ✅ Verified |
| POOL-03 | ✅ Verified | ✅ Verified |
| POOL-04 | ✅ Verified | ✅ Verified |
| POOL-05 | ✅ Verified | ✅ Verified |
| POOL-06 | ⚠️ Still Needs Fix | ✅ **Verified (closed)** |
| POOL-07 | ✅ Verified | ✅ Verified |
| TIME-01 | ✅ Verified | ✅ Verified |
| TIME-02 | ⚠️ Declared limit | ⚠️ Declared limit (unchanged) |
| TIME-03 | ✅ Verified | ✅ Verified |
| TIME-04 | ✅ Verified (data layer) | ✅ Verified (data layer) |
| TIME-05 | ⚠️ Partial | ⚠️ Partial (unchanged, declared UI limit) |
| TIME-06 | ✅ Verified (server data layer) | ✅ Verified (server data layer) |
| TIME-07 | ✅ Verified | ✅ Verified |
| TIME-08 | ✅ Verified | ✅ Verified |
| TIME-09 | ⚠️ Needs Fix (narrower) | ✅ **Verified (closed)** |

---

## Round 3: Remaining Items (not gaps — informational)

Neither item below blocks the PASS verdict; both are pre-existing, declared, and unchanged since round 1.

1. **TIME-02 / TIME-05 client half / TIME-06 UI half / TIME-04 UI half**: React component layer has no test infrastructure in this project (no `jsdom`, no `@testing-library`) — declared and accepted in `tasks.md`'s Test Coverage Matrix as a scope limit, not a task deferral. Verified only by code read and the build gate, per the rules this round operated under.
2. **TIME-09 structural guard brittleness**: see the critical assessment above — accepted as a reasonable trade-off given the project's real-socket test architecture, with two concrete alternatives suggested for whoever owns this codebase next, neither implemented by this Verifier.

---

## Round 3: Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 21/22 clean PASS, 1 unchanged declared UI limit (TIME-02), 1 unchanged partial declared UI limit (TIME-05 client half) — neither is a new gap, both carried unchanged from round 1
**Sensor**: 11/11 mutations killed (6 original + 3 from round 2 + 2 new this round); mutant (i) re-run 5/5, mutant (g) re-run at 3 durations (300ms/5s/300s), all killed
**Gate**: 36 passed, 0 failed, build clean, 2 stable runs

**What works**: Every server-side domain requirement (WORD-01..06, POOL-01..07, TIME-01/03/04/05-server/06-server/07/08/09) now has deterministic, sensor-confirmed test evidence. The privacy invariant remains the most robustly protected behavior in the repo (mutant d: 10/15 integration tests fail). POOL-06's departure-preserves-ids mechanism and TIME-09's timer-absence claim — the two gaps that survived two prior rounds — are both closed with reproducible, non-statistical evidence: POOL-06 via a direct `Set` assertion, TIME-09 via a duration-independent structural guard layered on top of the existing 1.2s behavioral test.

**Issues found**: None that block this verdict. One informational note carried forward: the TIME-09 structural guard is a textual/heuristic check with a documented false-positive risk on legitimate refactors and a documented blind spot for timer mechanisms that avoid its literal string matches (see Critical Assessment above) — accepted as the best available trade-off given the project's real-socket integration-test architecture, with two concrete alternatives on record for future work.

**Next steps**: None required to close this feature. Optional, non-blocking follow-up for a future iteration: evaluate `vi.useFakeTimers({ shouldAdvanceTime: true })` compatibility with this project's socket.io integration tests as a way to replace the textual TIME-09 guard with a behavioral one immune to refactor false-positives.

---

## Round 3: Sensor Isolation Confirmation

- Baseline `git status --porcelain` of the real tree: empty, captured before any round-3 sensor work.
- One scratch worktree used (`sensor-worktree`), created via `git worktree add <scratch> HEAD` at `8c3dabd`, with `node_modules` symlinked (not copied) into the worktree so dependencies didn't need reinstalling. `git stash` was never used.
- All 11 mutations were applied directly to files inside the worktree and reverted with `git checkout -- <file>` inside the worktree only; the real tree was never edited by sensor work.
- Worktree removed with `git worktree remove --force` after all mutations completed.
- Post-sensor `git worktree list` shows only the real tree (`/home/user/Quem-sou-Eu-`).
- Post-sensor `git status --porcelain` of the real tree: empty — identical to the pre-sensor baseline.
- The only changes made to the real tree during this validation round are this file (`validation.md`, this round-3 section) and, if committed, `.specs/LESSONS.md` / `.specs/lessons.json` for any newly distilled lessons — never source or test files.
