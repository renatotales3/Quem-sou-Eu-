# Melhorias do Jogo — Validation

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
