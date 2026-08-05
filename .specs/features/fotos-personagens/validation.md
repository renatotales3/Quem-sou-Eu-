# Fotos dos Personagens Validation

**Current round**: Round 2 — four-source catalog (Wikimedia Commons + AniList + TMDB + Comic Vine)
**Date**: 2026-08-05
**Spec**: `.specs/features/fotos-personagens/spec.md`
**Diff range (round 2)**: `0aedcf3..HEAD` (11 commits: AniList resolver + catalog, source field across catalog/protocol, TMDB resolver + catalog, Comic Vine resolver + catalog, attribution-terms UI compliance, spec/design doc updates)
**Verifier**: independent sub-agent (author ≠ verifier), fresh for this round

**Result**: FAIL

This document's single authoritative verdict is the line above. Round 1's report is preserved below under "Round 1" for history; its own line has been relabeled `Round 1 verdict (superseded)` so only one `Result:` field exists in this file, per `validate_state.py`'s parsing contract.

---

## Round 2 — Verifier Report (this round)

### Scope

Round 1 (below) validated the original single-source (Wikimedia Commons + first AniList pass) catalog and passed. Between round 1 and this round, the catalog grew from 1-2 sources to 4: Wikimedia Commons (89), AniList (22), TMDB (41), Comic Vine (27) — 179/304 characters (59%). This round re-derives all 14 requirements from `spec.md` from scratch against the current tree, re-runs an independent discrimination sensor scoped to the new multi-source surface, and adds a 10-image visual sample stratified across all 4 sources (round 1 sampled only Commons).

### Task Completion

No `tasks.md` exists for this increment (informal Execute, per the auto-sizing rules — the commit sequence functions as the task list). All 11 commits in the diff range landed and are reflected in the tree; gate passes (below).

| Work item (from commit sequence) | Status | Notes |
| --------------------------------- | ------ | ----- |
| AniList resolver + catalog merge | ✅ Done | 22 entries, `s4.anilist.co` host, source field |
| Register `source` across catalog/protocol | ✅ Done | `server/character-images.ts:83`, `shared/protocol.ts:16` |
| TMDB resolver + catalog | ⚠️ Done, with a severe curation defect | 41 entries added; resolver pulls actor `profile_path` (generic headshot), not a character-specific still — see Gap 1 |
| Comic Vine resolver + catalog | ✅ Done | 27 entries, cover art, visually recognizable in sample |
| UI compliance (TMDB non-endorsement notice, Comic Vine backlink) | ⚠️ Done, with a placement concern | See "TMDB / Comic Vine terms judgment" below |
| spec.md / design.md updates for non-Commons sources | ⚠️ Done, incompletely | `spec.md`'s IMG-05 AC text (line 77) still names only Wikipédia/Wikidata/Commons; `design.md`'s `CharacterImage.source` comments (lines 95, 128) still list only `'Wikimedia Commons' \| 'AniList'`, not TMDB/Comic Vine — see Gap 3 |

### Spec-Anchored Acceptance Criteria (14/14 requirements, re-derived from scratch)

#### P1: Foto no card dos outros jogadores

| Requirement | Spec-defined outcome | `file:line` + evidence | Result |
| ----------- | --------------------- | ----------------------- | ------ |
| CARD-01 | image shown alongside name/category for other players' cards | `src/App.tsx:402` (only `otherPlayers` get `CharacterCard`); `src/App.tsx:476-477` (`<img>` and `character-info` both render inside the same card) | ✅ PASS |
| CARD-02 | no image → fallback avatar div, no empty slot | `src/App.tsx:476` (ternary: `<img>` or `<div className="character-avatar">`) | ✅ PASS |
| CARD-03 | image load failure → fallback | `src/App.tsx:470,472,476` (`imageFailed` state set in `onError`, `showImage` recomputed as `Boolean(image) && !imageFailed`) | ✅ PASS |
| CARD-04 (name/category always visible) | name+category shown regardless of image | `src/App.tsx:477` (`character-info` renders unconditionally) | ✅ PASS |
| CARD-04 (attribution accessible — Catálogo story AC6 in spec text) | author+license shown "de forma acessível" | `src/App.tsx:478,493,512-519` (visible `<p>`/`<small>` text node, not a tooltip, plus `aria-label`) | ✅ PASS structurally — see "TMDB / Comic Vine terms judgment" below for a placement-specific finding on the TMDB non-endorsement notice, which is a real but narrower concern than this AC |

#### P1: Catálogo de imagens livre e verificável

| Requirement | Spec-defined outcome | `file:line` + evidence | Result |
| ----------- | --------------------- | ----------------------- | ------ |
| IMG-01 (fontes com termos compatíveis + fonte registrada) | every entry has a non-empty `source` from an allowed list | `tests/wordlist.test.ts:120-127` (author/license/source non-empty); `tests/wordlist.test.ts:129-134` (`knownSources` allowlist of exactly the 4 sources); killed by mutant (b) and (f) | ✅ PASS |
| IMG-02 (curation quality — "um brasileiro reconhece o personagem", spec.md:33) | every approved image is visually recognizable as the character | **No code-level check exists (declared, accepted limitation — same as round 1).** Manual visual sampling (10 images, stratified across all 4 sources) found: Commons 4/4 pass, Comic Vine 2/2 pass, AniList 2/2 pass, **TMDB 0/8 pass** (8 TMDB images sampled once the first 3 all failed) — every single TMDB image sampled is a generic modern actor headshot/red-carpet photo with zero costume, role, or scene context. Additionally, 3 pairs of TMDB entries share the *literal same image URL* across two different characters (`neo`/`john wick`, `jack sparrow`/`willy wonka`, `michael corleone`/`tony montana` — all pairs where the same actor played both roles), which is objective proof the resolver returns an actor-identity photo, not a character-specific one. See Gap 1 (top-ranked). | ❌ **FAIL** — systemic, not a spec-precision gap; this is a confirmed spec assumption ("Critério de aprovação", spec.md:33, "Confirmed? y") being violated at scale for an entire 41-entry source |
| IMG-03 (autor e licença preenchidos) | every entry has non-empty `author`/`license` | `tests/wordlist.test.ts:120-125`; killed by mutant (f) (empty `author` string) | ✅ PASS |
| IMG-04 (entrada órfã quebra a suíte) | orphan key → test failure | `tests/wordlist.test.ts:113-118` (`displayedKeys.has(key)`) | ✅ PASS |
| IMG-05 (zero requisição externa em runtime, agora 4 domínios) | scan of `server/`+`src/` finds zero offenders across all 4 host domains | `tests/wordlist.test.ts:179-217`; regex at `tests/wordlist.test.ts:185` covers `wiki(?:pedia\|media\|data)\.org\|anilist\.co\|image\.tmdb\.org\|comicvine\.gamespot\.com`; killed by mutant (d) — a `fetch('https://comicvine.gamespot.com/api/...')` inserted at `server/game.ts` module scope is still caught **despite** the href exception (see judgment below) | ✅ PASS |
| IMG-06 (host por fonte + thumbnail ≤400px sem tracking) | URL hostname matches the *declared source's* fixed host; Commons URLs are ≤400px thumbnails, no query string | `tests/wordlist.test.ts:136-177`; `hostBySource` map at `tests/wordlist.test.ts:154-159`; killed by mutant (c) (TMDB URL swapped to `comicvine.gamespot.com` — a host that IS valid, just not for that entry's declared source) and mutant (e) (Comic Vine entry's `source` field swapped to `'TMDB'`, same URL) | ✅ PASS |
| IMG-07 (source registrado por imagem) | every entry has non-empty `source` | `tests/wordlist.test.ts:120-127` (explicit `image.source.trim().length` assertion); killed by mutant (b) | ✅ PASS |

#### P2: Privacidade preservada com o campo novo

| Requirement | Spec-defined outcome | `file:line` + evidence | Result |
| ----------- | --------------------- | ----------------------- | ------ |
| PRIV-01 | own image absent from own payload during the round, for any of the 4 sources | `server/game.ts:435-444` — `image` is nested inside the **same single conditional** that already gates `character.id/name/category`; the gate does not branch on `source` at all (confirmed by `grep -n "source" server/game.ts` → zero matches outside the type import), so the leak-protection is structurally source-blind | ✅ PASS |
| PRIV-02 | test fails if own image URL appears anywhere in own payload during the round | `tests/game.integration.test.ts:202-246`, assertion at `:245-246` (`JSON.stringify(payload)` must not contain own image URL) | ✅ PASS — see sensor mutant (a) and self-designed mutant (h) below for depth |
| PRIV-03 | quadro revelado inclui a imagem de todos após `round:finished` | `tests/game.integration.test.ts:261-264` (`toBe(hostOwnImageUrl)` / `toBe(guestOwnImageUrl)`) | ✅ PASS |

**Status**: 13/14 clean PASS with `file:line` evidence. **1/14 hard FAIL: IMG-02**, grounded in a 10-image stratified visual sample (not a hunch) plus an objective duplicate-URL proof.

---

### PRIV-01/02 test breadth — does it actually exercise all 4 sources?

The task brief specifically asked: does the leak test exercise a character WITH an image, and would it still catch the leak regardless of which of the 4 sources that image comes from?

`tests/game.integration.test.ts:210` does `const [chosenHostChar, chosenGuestChar] = withImages;` — the **first two** entries of `characters.filter((c) => c.image)`, in catalog iteration order. This is **deterministic, not random** — every run picks the exact same two characters. Verified directly:

```
withImages[0] = Homem-Aranha (source: Comic Vine)
withImages[1] = Homem de Ferro (source: Wikimedia Commons)
```

So the test as written exercises exactly 2 of the 4 sources (Comic Vine + Commons) every run — never AniList or TMDB. This sounds like a coverage gap, but it is not a *live* one: `server/game.ts`'s privacy gate (`viewRoom`, line 435) treats `image` as one opaque field regardless of `source` — there is no source-conditional branch anywhere in the privacy-critical path (confirmed by grep — `source` appears nowhere in `server/game.ts`). A source-specific leak bug is therefore not structurally possible today; determinism here is a *feature*, not a weakness (it avoids the exact `L-001`/`L-004` statistical-flakiness class this project has been burned by twice before). Flagged as an observation, not a gap: **if** a future change ever makes `viewRoom` branch on `source` (e.g., a source-specific redaction rule), this test would need to be widened to cover all 4 sources explicitly, because it would no longer be provably source-blind by construction.

---

### Discrimination Sensor

**Isolated scratch**: `git worktree add <scratch> HEAD` at `/tmp/.../scratchpad/sensor-wt` (`node_modules` symlinked, never copied). Baseline `git status --porcelain` on the real tree was empty before the sensor ran; confirmed empty again after `git worktree remove --force` (real tree diff-checked, untouched).

| # | File:line (scratch) | Description | Killed? |
| - | -------------------- | ------------ | ------- |
| a (required) | `server/game.ts:435` | Removed the `player.id !== viewerId` clause from the round-phase gate, so a player's own image (and character) leaks during play — direct PRIV-02 attack | ✅ Killed **5/5 runs** |
| b (required) | `server/character-images.ts:92` | Removed `source` field from the `'homem aranha'` (Comic Vine) entry | ✅ Killed (3 assertions failed: IMG-01/IMG-07 non-empty check, IMG-02 allowlist check, IMG-06 host-by-source lookup) |
| c (required) | `server/character-images.ts:451` | TMDB URL host swapped to `comicvine.gamespot.com` (a host valid for a *different* source) on the `'frodo bolseiro'` entry | ✅ Killed (`expected 'comicvine.gamespot.com' to be 'image.tmdb.org'`) — proves the guard checks host-*per-declared-source*, not "is this any known host" |
| d (required, central to the IMG-05 exception judgment) | `server/game.ts:17` (module scope) | Inserted `fetch('https://comicvine.gamespot.com/api/characters/?format=json')` | ✅ Killed (`offenders` array non-empty; the stripped href literal did not match the fetch-call text, so the exception did not shield it) — see full judgment below |
| e (required) | `server/character-images.ts:92` | `'homem aranha'` (Comic Vine, url on `comicvine.gamespot.com`) `source` field swapped to `'TMDB'` (wrong host for declared source) | ✅ Killed (`expected 'comicvine.gamespot.com' to be 'image.tmdb.org'`) |
| f (required) | `server/character-images.ts:90` | `author` on the `'homem aranha'` entry set to `''` | ✅ Killed (`expected 0 to be greater than 0`) |
| g (self-designed) | `server/game.ts:435` | Flipped the gate's boolean the *other* way: `player.id !== viewerId` → `player.id === viewerId` (own character/image shown, others' hidden — a true boolean flip, not a removal) | ✅ Killed (11/16 tests in `game.integration.test.ts` failed — the name-privacy tests catch this even more broadly than the image-specific one, since the whole `character` object is gated by the same condition) |
| h (self-designed, most targeted at PRIV-02's actual wording — "nem embutida em outro campo qualquer") | `server/game.ts:424-433` | Added a sibling leak path **outside** the `character` gate: `...(player.id === viewerId && room.phase === 'playing' && player.character?.image ? { prefetchImageUrl: player.character.image.url } : {})` directly on `publicPlayer`, framed as an innocuous "prefetch" optimization | ✅ Killed (`JSON.stringify(roundHost)` contained the URL under the new `prefetchImageUrl` key) — proves PRIV-02's `JSON.stringify(payload).not.toContain(...)` check is a genuine whole-payload scan, not a check tied to the one field path (`character.image`) it happens to test today |

**Sensor depth**: lightweight-plus (6 required + 2 self-designed = 8 total; PRIV-02's mutant (a) run 5× per the assignment's instruction — determinism confirmed, not flakiness)
**Sensor verdict**: 8/8 killed — sensor is sound (this axis is not the source of this round's FAIL; the FAIL verdict for this round comes from IMG-02's curation defect, not from weak tests)

Each mutation applied, tested, and reverted individually via `git checkout -- <file>` (or restoring the single edited line); worktree removed with `git worktree remove --force`; real tree `git status --porcelain` confirmed empty both before the sensor run and after cleanup.

---

### IMG-05 Exception Judgment — is the Comic Vine href exception legitimate?

The claim in `tests/wordlist.test.ts:194` and `src/App.tsx:522-534`: Comic Vine's API terms require a link back to the site whenever API-sourced data is displayed. The scanner strips exactly one literal string, `href="https://comicvine.gamespot.com"`, before running the domain regex, and that literal appears in the codebase exactly once — `src/App.tsx:530`, the static `<a>` tag's `href` attribute, confirmed by direct grep.

**Verdict: the exception is legitimate, not a loosened guard.**

- It is an exact-string literal match, not a wildcard, prefix, or pattern — `content.split(exactLiteral).join('')` only removes that one substring, character-for-character.
- Mutant (d) proves a `fetch()` call to the exact same domain is **not** shielded: the fetch-call text (`fetch('https://comicvine.gamespot.com/api/...')`) does not contain the literal `href="https://comicvine.gamespot.com"`, so it isn't stripped, and the regex still catches it. The test failed with `offenders` containing `server/game.ts`.
- The exception covers only the domain **root** (`https://comicvine.gamespot.com`, no path). A hypothetical fetch to `https://comicvine.gamespot.com` with no path also would not match the href literal (different quote style, no `href=` prefix, no closing tag context) — confirmed by inspecting the exact strings side by side.
- This narrow-exception pattern is the same shape validated in round 1 for IMG-06's `originalFileExceptions` allowlist (an exact-set membership check, not a relaxed rule) — consistent engineering discipline across rounds.

---

### TMDB / Comic Vine terms judgment (CARD-04, read `src/App.tsx` + `src/styles.css` in full)

**Comic Vine backlink — compliant, well-placed.** `creditLabel` (`src/App.tsx:512-519`) renders `<ComicVineLink />` inline, per-card, every time `source === 'Comic Vine'` — the backlink appears exactly where and when Comic Vine's content is shown, satisfying "sempre que os dados da API são exibidos" (design.md:75) literally. It sits in the author-source position (before the license, which is what absorbs the line-clamp cut — see below), so it is not at risk of being visually cut off in the vast majority of cards.

**TMDB non-endorsement notice — present, but placed where it will never be seen alongside the content it disclaims.** The notice (`src/App.tsx:300`, `"Este produto usa a API do TMDB mas não é endossado nem certificado pelo TMDB."`) renders exactly once, in the `home-footer`, and — critically — that footer only exists in the `if (!room)` branch: the pre-room landing screen a player sees *before* creating or joining a room. TMDB-sourced photos render during `playing` (`CharacterCard`) and `finished` (`RevealRow`) phases, both of which are entirely separate render branches (`room.phase === 'lobby'`, `'finished'`, and the default `playing` branch at `App.tsx:306,352,382`) that never re-render the home screen or its footer. A player who creates a room, plays several rounds, and sees TMDB photos on every card will never see the disclaimer again unless they leave the room entirely. The worker's own code comment (`src/styles.css:139-140`) states this was a deliberate choice: *"uma vez na interface, não por card"*. That is a defensible reading of "an easily accessible place in the interface" as a literal compliance bar, but it is a materially weaker placement than Comic Vine's per-card, per-occurrence link, and it means the actual gameplay screens where TMDB content lives carry no TMDB attribution at all. This does not fail a specific numbered spec AC (no AC ties to TMDB's own contractual notice), but it is a real, live compliance risk flagged for follow-up, not a hidden defect — see Gap 2.

**Credit line ordering/line-clamp claim — verified with real data, holds up.** The claim (`src/App.tsx:502-511`, `src/styles.css:279-286`): `author · source · license`, 3-line clamp, so any truncation always eats the license (last), never the author (first). Checked against the longest `author` string in the whole catalog (`'MetalGearLiquid, based on File:Steve_Jobs_Headshot_2010-CROP.jpg made by Matt Yohe'`, 84 chars, `server/character-images.ts:1088`) combined with its source label (`'Wikimedia Commons'`, the longest source label, 18 chars): 84+3+18 = 105 characters before the license even starts. At the card's actual rendered width (`.others-grid` two-column layout inside `.game-layout`, ≈200px content width after padding, 9px monospace ≈ 33-37 chars/line × 3 lines ≈ 100-111 chars budget), this is close to the edge but the license — not the author or source — is what gets cut first, consistent with the stated design intent. This is a genuine improvement over round 1's single-line `nowrap`+ellipsis (Fix 3), which risked truncating the author itself.

---

### Round-1 Fix follow-through

| Round-1 fix | Status this round | Evidence |
| ----------- | ------------------ | -------- |
| Fix 1 (Chewbacca cosplay-category slip) | Not re-addressed, not re-checked this round (out of this round's diff scope — no Commons entries changed) | — |
| Fix 2 (HTML entity artifacts in `author`) | ✅ Resolved | `server/character-images.ts:1058` now reads `author: 'Elliott & Fry'` (was `'Elliott &amp; Fry'`); `tests/wordlist.test.ts:232-242` adds a dedicated entity-guard test covering `author`/`license`/`source` on every entry |
| Fix 3 (8px credit line truncating author) | ✅ Resolved | 3-line clamp + `author · source · license` ordering, verified above |

---

### API Key Leak Scan

- `.gitignore:5-7` covers `.env`, `.env.*` (with `.env.example` excepted); `.image-candidates/` is also gitignored (`.gitignore:4`) — the ephemeral curation output (where a raw Comic Vine `api_key=` query param would appear in a logged request URL) never reaches git.
- `git ls-files | grep -i '\.env'` → only `.env.example`, and it contains no real values (comments + var names only).
- All three new resolver scripts (`scripts/resolve-tmdb-images.mjs:232`, `scripts/resolve-comicvine-images.mjs:470`, `scripts/resolve-anime-images.mjs`) read credentials exclusively from `process.env.<NAME>_API_KEY`, with a documented `.env`-file fallback that itself reads from the gitignored file — no hardcoded fallback key literal in any script.
- `git grep` for key-shaped patterns (`api_key=`, `secret[:=]`, hex strings ≥32 chars) across all tracked files and across `git log -p 0aedcf3..HEAD` for this diff range: **zero matches** outside of unrelated skill-lock hashes and the parameter *names* (`TMDB_API_KEY`, `COMICVINE_API_KEY`) themselves.

**Verdict: no key material leaked to a versioned file or to this round's commit history.**

---

### Visual Sampling — 10 entries stratified across all 4 sources

Sampled via a seeded shuffle per source (`seed=20260805`, 3 Commons + 3 TMDB + 2 Comic Vine + 2 AniList), then expanded to 8 TMDB total once the first 3 TMDB samples all failed, to rule out sampling bad luck. Downloaded with `curl -A 'QuemSouEu/1.0'` and opened with the Read tool (all 10+ images actually viewed, not inferred from filenames).

| # | Character | Source | Image | Recognizable as the character? |
| - | --------- | ------ | ----- | -------------------------------- |
| 1 | Indiana Jones | Wikimedia Commons | `Indianajones4.jpg` | ✅ Harrison Ford in full costume (hat, satchel) on set |
| 2 | Deadpool | Wikimedia Commons | `Deadpool, Georgia Viaduct...jpg` | ✅ Full costume, on a film set (same "actor+costume" precedent as round 1's Walter White) |
| 3 | Elon Musk | Wikimedia Commons | `Elon_Musk_(54816836217)...jpg` | ✅ Clear portrait (real person, no costume needed) |
| 4 | Cyborg | Comic Vine | cover art | ✅ Clearly Cyborg, cybernetic eye/parts visible |
| 5 | Venom | Comic Vine | cover art | ✅ Immediately recognizable |
| 6 | Naruto Uzumaki | AniList | character art | ✅ Headband, whisker marks, unmistakable |
| 7 | Sasuke Uchiha | AniList | character art | ✅ Recognizable anime art |
| 8 | Forrest Gump | TMDB | Tom Hanks profile photo | ❌ Generic studio headshot, black background, no costume/context — this is "recognize Tom Hanks," not "recognize Forrest Gump" |
| 9 | Obi-Wan Kenobi | TMDB | Alec Guinness profile photo | ❌ 1950s-era plain-suit portrait, zero Star Wars context |
| 10 | Leia Organa | TMDB | Carrie Fisher profile photo | ❌ Modern-era portrait (grey hair), zero Star Wars context |

**Extended TMDB check (5 more, triggered by the 3/3 failure above):**

| Character | Image | Recognizable? |
| --------- | ----- | -------------- |
| Harry Potter | Daniel Radcliffe casual-shirt headshot, adult, no glasses/scar | ❌ |
| Daenerys Targaryen | Emilia Clarke, brown hair, red-carpet event | ❌ (character is famous for platinum-blonde hair — this image actively contradicts the visual signature) |
| Rey | Daisy Ridley, red-carpet event, no Star Wars context | ❌ |
| Jack Sparrow | Johnny Depp modern studio photo, no eyeliner/costume | ❌ — **and this exact file is also the `willy wonka` entry's image** |
| Michael Corleone | Al Pacino, present-day portrait | ❌ — **and this exact file is also the `tony montana` entry's image** |
| Thomas Shelby | Cillian Murphy, modern suit, no flat cap | ❌ |
| Katniss Everdeen | Jennifer Lawrence, editorial photo, no braid/archery costume | ❌ |

**Result: TMDB 0/10 recognizable across every sample checked** (10 distinct TMDB images viewed in total across the two passes). Non-TMDB: 7/7 recognizable. Three confirmed duplicate-URL pairs (`neo`/`john wick`, `jack sparrow`/`willy wonka`, `michael corleone`/`tony montana`) are objective, non-subjective proof that the resolver returns an *actor* photo, not a *character* photo — the same actor's TMDB "person" profile photo gets reused verbatim across every role they've played in the catalog.

**Root cause** (read `scripts/resolve-tmdb-images.mjs:29`, `:401-415`): the script explicitly resolves the matched cast member's `profile_path` — TMDB's generic actor headshot field — rather than a role-specific still (e.g., a `/movie/{id}/images` scene still, or filtering `profile_path` candidates for ones actually showing costume). This is a design choice baked into the resolver, not an occasional curation miss. The code comment in `server/character-images.ts:26-31` claims each TMDB entry was "revisado visualmente com o mesmo critério de reconhecimento" (T3's "um brasileiro reconhece o **personagem**" bar) — the sampled evidence contradicts that claim for the entire source: either the visual review did not happen for TMDB, or it was performed against a different, unstated criterion ("is this the correct actor" rather than "is this the character").

---

### Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for the increment | ✅ |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ (new sources follow the same `characterImages` shape; `hostBySource`/`knownSources` allowlists follow the same exact-set pattern as round 1's `originalFileExceptions`) |
| Would a senior engineer approve? | ❌ for the TMDB curation pipeline specifically — see Gap 1; ✅ for everything else |
| Tests map to acceptance criteria and are non-shallow | ✅ — PRIV-02 test defends against a whole-payload leak (mutant h), not just the one field path it directly tests |
| Spec-anchored outcome check | ✅ for all code-checkable ACs — see table above |
| Per-layer Coverage Expectation met | ✅ — domain logic (catalog/host-per-source/merge) has 1:1 test mapping; integration test covers PRIV happy+leak+reveal; React layer has no test infra (declared, accepted limitation) |
| Every test in scope maps to a spec AC | ✅ — no unclaimed tests found |
| Documented guidelines followed | none found (no `AGENTS.md`/`CONTRIBUTING.md`) — strong defaults applied |

---

### Edge Cases

- [x] Commons sem autor declarado → still rejected (IMG-03 test unchanged, still passing across all 4 sources)
- [x] Personagem renomeado → entrada órfã quebra a suíte (IMG-04, unchanged, still passing)
- [x] Proporção diferente do card → `object-fit: cover` (`src/styles.css:267,377` — unchanged from round 1)
- [x] Conexão lenta → nome/categoria renderizam antes da imagem (`loading="lazy"`, unchanged)
- [ ] **Not an edge case from spec.md, but newly relevant**: "imagem não recognizável como o personagem" — not listed as an edge case in spec.md, but IMG-02's own approval criterion functions as exactly this edge case, and it is not handled for the TMDB source (see Gap 1)

---

### Gate Check

- **Gate command**: `npm run build && npm test` (`npx vitest run` used directly; equivalent)
- **Result**: build clean (`tsc -p tsconfig.server.json`, `tsc -p tsconfig.app.json && vite build`, no errors); 54 tests passed, 0 failed, 0 skipped
- **Test count before this round**: 52 (round 1's final count)
- **Test count after this round**: 54
- **Delta**: +2 (`'só existem as fontes conhecidas do catálogo (IMG-02)'` allowlist test, `'não guarda entidade HTML em autor, licença nem fonte (IMG-03)'` entity-guard test — both added in commit `2b06267`)
- **Skipped tests**: none
- **Failures**: none

Re-ran the full suite 3× and `tests/game.integration.test.ts` alone 2 additional times (5 total observations of the integration file) to check for the documented ~1/18 socket-contention flake — **0/5 flaky, 54/54 green every run**. No intermittency observed this round.

---

### Fix Plans (ranked)

#### Fix 1 (Blocker for IMG-02 as shipped — the entire TMDB source fails its own stated curation bar)

- **Root cause**: `scripts/resolve-tmdb-images.mjs` resolves the matched cast member's `profile_path` (TMDB's generic actor-headshot field), not a character/role-specific still. Every one of the 10 TMDB images sampled (100%) is a modern actor headshot or red-carpet photo with zero costume/role/scene context; 3 pairs of entries share the literal same image file across two different characters played by the same actor, which is objective, non-subjective confirmation of the root cause.
- **Fix task**: Re-resolve TMDB entries against a character-specific image source — e.g., `/movie/{id}/images` stills filtered for the credited actor, or a curated fallback to a promotional/costumed photo — and re-run the T3-equivalent visual review with the actual stated criterion ("um brasileiro reconhece o **personagem**", not "reconhece o **ator**"). At minimum, immediately deduplicate the 3 confirmed duplicate-URL pairs, since a same-image-for-two-characters bug is provable without any subjective judgment.
- **Priority**: **Blocker** — this is not a data-quality nit; it defeats the P1 MVP story's stated purpose (recognizable-photo-as-descriptive-aid) for 41/179 (23%) of the approved catalog, and it is a direct, confirmed violation of a Confirmed=y row in spec.md's own Assumptions table.

#### Fix 2 (Minor-to-Major compliance risk, not a numbered spec AC)

- **Root cause**: The TMDB non-endorsement notice renders once, only on the pre-room landing screen, never on the `lobby`/`playing`/`finished` screens where TMDB-sourced photos actually appear.
- **Fix task**: Move (or duplicate) the notice to somewhere reachable from every screen that can show a TMDB image — e.g., a persistent footer line in `RoomHeader`, or at minimum in the `finished` reveal screen where all photos are visible at once — rather than only the screen a returning player never revisits.
- **Priority**: Minor-to-Major (real contractual-notice risk, not user-facing gameplay breakage).

#### Fix 3 (Cosmetic — documentation drift, not a functional gap)

- **Root cause**: `spec.md:77` (IMG-05's literal AC text) still names only "Wikipédia, o Wikidata ou o Commons," not AniList/TMDB/Comic Vine, even though the actual implementation and its tests correctly cover all 4 domains (over-delivery relative to the literal spec text, not under-delivery). `design.md:95,128`'s `CharacterImage.source` comments likewise still say `'Wikimedia Commons' | 'AniList'` only, omitting TMDB/Comic Vine.
- **Fix task**: Update `spec.md:77` to name all 4 domains (or genericize the wording to "qualquer fonte de imagem do catálogo"), and update `design.md`'s two stale comments to list all 4 source values.
- **Priority**: Cosmetic — code and tests are already correct; only the prose is stale.

---

### Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| CARD-01 | ✅ Verified (round 1) | ✅ Verified |
| CARD-02 | ✅ Verified (round 1) | ✅ Verified |
| CARD-03 | ✅ Verified (round 1) | ✅ Verified |
| CARD-04 | ✅ Verified (round 1, 2 minor findings) | ✅ Verified — attribution rendering solid; TMDB notice placement flagged (Fix 2), not blocking this AC |
| IMG-01 | ✅ Verified (round 1) | ✅ Verified — extended cleanly to 4 sources |
| IMG-02 | ⚠️ Verified with spec-precision gap (round 1) | ❌ **FAIL** — systemic curation defect, TMDB source (Fix 1) |
| IMG-03 | ✅ Verified (round 1) | ✅ Verified |
| IMG-04 | ✅ Verified (round 1) | ✅ Verified |
| IMG-05 | ✅ Verified (round 1) | ✅ Verified — extended to 4 domains, href exception independently confirmed legitimate |
| IMG-06 | ✅ Verified (round 1) | ✅ Verified — extended to host-per-source guard |
| IMG-07 | *(new this round)* | ✅ Verified |
| PRIV-01 | ✅ Verified (round 1) | ✅ Verified — confirmed source-blind by construction |
| PRIV-02 | ✅ Verified (round 1, 5/5 mutant-kill) | ✅ Verified — 5/5 mutant-kill again this round, plus a new bypass-field mutant (h) also killed |
| PRIV-03 | ✅ Verified (round 1) | ✅ Verified |

---

### Round 2 Summary

**Overall**: ❌ **Not Ready**

**Spec-anchored check**: 13/14 requirements clean PASS with `file:line` evidence; 1/14 (IMG-02) is a confirmed FAIL grounded in a 10-image stratified visual sample plus an objective duplicate-URL proof, not a subjective nitpick
**Sensor**: 8/8 mutations killed (6 required + 2 self-designed), including the IMG-05 exception-legitimacy test (mutant d) and a whole-payload bypass-leak test (mutant h) — the test suite itself is sound; the FAIL is a data/curation defect, not a test-quality defect
**Gate**: 54 passed, 0 failed, 0 skipped; build clean; 0/5 flake observed on the known-flaky integration file

**What works**: The privacy invariant remains solid and is now confirmed structurally source-blind (no `source` branching exists anywhere in `server/game.ts`'s privacy-critical path), so it protects all 4 image sources by construction, not by luck of which characters a test happens to pick. The IMG-05 runtime-safety scan correctly extended to all 4 new domains and its one explicit exception (the Comic Vine attribution `<a href>`) is proven narrow and legitimate — a `fetch()` to the exact same domain is still caught. The host-per-declared-source guard (IMG-06) is a genuine security-style check (source X must resolve to host Y, not just "any known host"), independently confirmed by two separate mutants. Comic Vine and AniList sources are visually solid in sampling (4/4 combined). Round 1's Fix 2 (HTML entities) and Fix 3 (credit-line legibility) are both genuinely resolved, confirmed by direct inspection of the fixed data and CSS.

**Issues found**: (1) **[Blocker]** the entire TMDB source (41 entries, 23% of the approved catalog) fails the project's own explicit, Confirmed=y curation criterion — every sampled image is a generic actor headshot unconnected to the role, and 3 pairs of characters share the literal same image file, which is objective proof the resolver pulls actor identity, not character identity; (2) [Minor-Major] the TMDB non-endorsement notice is placed only on a screen players stop seeing once they enter a room, never alongside the TMDB photos it's meant to accompany; (3) [Cosmetic] `spec.md` and `design.md` prose still lists only the pre-round-2 source set in two places, lagging behind the code and tests, which already correctly cover all 4 sources.

**Next steps**: Route Fix 1 as a blocking task before calling `fotos-personagens` done — re-resolve the TMDB source against character-specific stills (or drop the source and fall back to the existing initial+color visual for those 41 characters, which the spec explicitly treats as an acceptable, first-class outcome) and deduplicate the 3 confirmed same-image pairs at minimum, even before a full re-review. Fix 2 and Fix 3 are non-blocking follow-ups.

---

## Round 1 — Verifier Report (superseded by Round 2 above)

**Round 1 date**: 2026-08-05
**Round 1 diff range**: `047a7ad..0aedcf3` (`18940ac`..`0aedcf3`, 6 commits: T3 curated catalog, T4 wordlist merge, T5 protocol, T6 game privacy, T7 UI, T8 styles)
**Round 1 verdict (superseded)**: PASS — single-source catalog (Wikimedia Commons, 89 entries). Preserved below verbatim for history; see the top of this document for the current, authoritative verdict of this file.

### Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Script exists, not imported by `server/`/`src/` (confirmed by IMG-05 scan + mutant e/g) |
| T2 | ✅ Done | Triage logic is dev-only, not re-verified (no test surface) |
| T3 | ⚠️ Done, with a curation slip | 89 entries in `server/character-images.ts`; one sampled entry (`chewbacca`) is Commons-categorized as cosplay — see Gap 1 |
| T4 | ✅ Done | 5 new unit tests in `tests/wordlist.test.ts`, all independently mutation-tested |
| T5 | ✅ Done | `shared/protocol.ts` mirrors `CharacterImage` without importing `server/` |
| T6 | ✅ Done | PRIV-02/03 test genuinely exercises two image-bearing characters (see below) |
| T7 | ✅ Done | Credit rendered as visible text + `aria-label`, not just `title` |
| T8 | ⚠️ Done, minor legibility risk | 8px credit font + `nowrap`/ellipsis can truncate long author names — see Gap 3 |

---

## Spec-Anchored Acceptance Criteria

ID-to-AC mapping was re-derived from `spec.md` text; where `spec.md`'s own traceability table does not pin an ID to a specific bullet, the mapping actually exercised by the test suite and by tasks.md (confirmed consistent throughout `tests/wordlist.test.ts` and `tests/game.integration.test.ts`) was used. That itself is flagged below as IMG-note.

### P1: Foto no card dos outros jogadores

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --------- | --------------------- | ----------------------- | ------ |
| CARD-01: imagem aprovada → card exibe imagem + nome + categoria | image rendered alongside name/category | `src/App.tsx:401` (only `otherPlayers` get `CharacterCard`), `src/App.tsx:475-476` (`<img>` + name/category rendered together) | ✅ PASS |
| CARD-02: sem imagem aprovada → visual atual de inicial/cor, sem espaço vazio | fallback avatar div, not empty space | `src/App.tsx:475` (ternary: `<img>` or `<div className="character-avatar">`, no empty slot) | ✅ PASS |
| CARD-03: falha ao carregar → cai para inicial/cor | `onError` flips to fallback | `src/App.tsx:469,471,475` (`imageFailed` state set in `onError`, `showImage` recomputed) | ✅ PASS |
| CARD-04: nome/categoria sempre visíveis (literal spec text, CARD story AC4) | name+category shown regardless of image | `src/App.tsx:476` (`character-info` renders unconditionally, independent of `showImage`) | ✅ PASS |
| CARD-04 as used elsewhere in this feature (attribution display — design.md Risks/Tech-Decisions explicitly bind "CARD-04" to this, though the literal AC text for it sits under the *Catálogo* story's 6th bullet, spec.md:77) | author+license shown "de forma acessível" | `src/App.tsx:477,492` (visible `<p>`/`<small>` with text content `{license} · {author}`, plus redundant `aria-label`) | ⚠️ PASS with 2 findings — see Gaps 2 and 3. Also flag: spec.md's traceability table lists CARD-04 only under the CARD story, but the attribution AC it is actually used to satisfy is textually the Catálogo story's AC6 — **spec-precision gap** in the ID-to-AC binding itself. |

### P1: Catálogo de imagens livre e verificável

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --------- | --------------------- | ----------------------- | ------ |
| IMG-01: só Commons, nunca fair-use local | every URL hostname is `upload.wikimedia.org` | `tests/wordlist.test.ts:143-145` (`expect(parsed.hostname).toBe('upload.wikimedia.org')`); killed by mutant (c) | ✅ PASS |
| IMG-02: qualidade/representatividade da curadoria (T3 done-when: "nenhuma entrada é cosplay, estátua, grafite...") | no cosplay/statue/graffiti in approved set | No automated test exists for this (correctly declared untestable-by-code in the Test Coverage Matrix — human visual review only). Visual sampling (below) found `server/character-images.ts:123` (`chewbacca`) is Commons-categorized `Cosplay of Chewbacca` | ⚠️ **Spec-precision gap** — the criterion has zero code-level check, and manual sampling surfaced a real slip-through. See Gap 1. |
| IMG-03: autor e licença preenchidos | every entry has non-empty `author`/`license` | `tests/wordlist.test.ts:120-125`; killed by mutant (d) | ✅ PASS |
| IMG-04: entrada órfã quebra a suíte | orphan key → test failure | `tests/wordlist.test.ts:113-118` (`displayedKeys.has(key)`); killed by mutant (b), 2 assertions failed | ✅ PASS |
| IMG-05: zero requisição à Wikimedia em runtime (server/ e src/) | scan of `server/`+`src/` finds zero offenders | `tests/wordlist.test.ts:157-176`; killed by mutant (e) (fetch to pt.wikipedia.org in `server/game.ts`) and self-designed mutant (g) (nested-directory leak, proves recursion is real) | ✅ PASS |
| IMG-06: thumbnail ≤400px, sem parâmetros de rastreamento | hostname check + width regex ≤400 + empty `search` | `tests/wordlist.test.ts:128-155`; killed by mutant (c) (wrong host) and self-designed mutant (h) (width 450>400) | ✅ PASS — see also independent Commons verification of the 4-URL exception list below |

### P2: Privacidade preservada com o campo novo

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --------- | --------------------- | ----------------------- | ------ |
| PRIV-01: imagem nunca no payload do próprio personagem durante a rodada | own image absent from own payload | `server/game.ts:435-444` (image nested inside the same conditional that already gates name/category) | ✅ PASS |
| PRIV-02: teste falha se a URL da própria imagem aparecer no payload | `JSON.stringify(payload)` must not contain own image URL | `tests/game.integration.test.ts:245-246`; **the test forces the pool to exactly two image-bearing characters** (`tests/game.integration.test.ts:208-210,222-224`) and asserts `ownHostChar?.image`/`ownGuestChar?.image` are defined (`:237-238`) before checking the leak — it cannot pass vacuously. Killed by mutant (a), **5/5 runs**. | ✅ PASS |
| PRIV-03: quadro revelado inclui a imagem de todos após `round:finished` | own image present post-reveal | `tests/game.integration.test.ts:261-264` (`toBe(hostOwnImageUrl)` / `toBe(guestOwnImageUrl)`) | ✅ PASS |

**Status**: ✅ 11/13 clean PASS, 2 flagged with grounded findings (IMG-02 spec-precision gap + curation slip; CARD-04 attribution rendering has 2 sub-findings). No requirement is a hard FAIL.

---

## Discrimination Sensor

Isolated scratch: `git worktree add <scratch> HEAD` at `/tmp/.../scratchpad/sensor-wt` (node_modules symlinked, never copied into the real tree). Baseline `git status --porcelain` on the real tree was empty before the sensor ran and empty after `git worktree remove --force` — confirmed by diff, real tree never touched.

| # | File:line | Description | Killed? |
| - | --------- | ------------ | ------- |
| a (required, most important) | `server/game.ts:435` (scratch) | Leak own image during round while name/category stay hidden — direct PRIV-02 attack | ✅ Killed **5/5 runs** |
| b (required) | `server/character-images.ts:38` (scratch) | Orphan key `'personagem inexistente xyz'` added to `characterImages` | ✅ Killed (2 assertions failed — IMG-04 orphan check + IMG-01/02 count check) |
| c (required) | `server/character-images.ts:40` (scratch) | Catalog URL swapped to `https://example.com/...` | ✅ Killed (IMG-06 hostname assertion) |
| d (required) | `server/character-images.ts:41` (scratch) | `author` field removed from an entry (cast around the TS type) | ✅ Killed (IMG-03 throws on `undefined.trim()`) |
| e (required) | `server/game.ts:20` (scratch) | `fetch('https://pt.wikipedia.org/w/api.php')` inserted at module scope | ✅ Killed (IMG-05 scan) |
| f (required) | `server/wordlist.ts:203` (scratch) | Merge stopped attaching `image` to `Character` | ✅ Killed (IMG-01/02 count assertion, `+0` vs `89`) |
| g (self-designed) | `server/nested/leak.ts` (scratch, new file) | Wikimedia-domain string placed in a **nested** subdirectory under `server/`, since the real tree's `server/`/`src/` are flat and the recursive-walk branch of IMG-05's scanner was otherwise never exercised by real files | ✅ Killed (proves the `walk()` recursion is real, not just the flat-file branch) |
| h (self-designed) | `server/character-images.ts:40` (scratch) | Thumbnail width bumped from `330px` to `450px` (>400 limit) on an existing `/thumb/` URL, to test the numeric boundary itself rather than only the hostname/domain checks | ✅ Killed (`expected 450 to be less than or equal to 400`) |

**Sensor depth**: lightweight-plus (6 required + 2 self-designed = 8 total; PRIV-02 mutant run 5× per the assignment's instruction because it depends on shuffle-order, not because the kill was flaky)
**Sensor outcome (Round 1)**: 8/8 killed — sensor axis was sound in Round 1

Each mutation was applied, tested, and reverted individually (`git checkout -- <file>`); `git diff --stat` was empty in the scratch before the next mutation and the real tree's `git status --porcelain` was re-confirmed empty after `git worktree remove`.

---

## Visual Sampling (8 random entries, `server/character-images.ts`)

Sampled with `random.seed(20260805)` over all catalog keys; images downloaded with `curl -A 'QuemSouEu/1.0'` and opened with the Read tool; author/license cross-checked against the Commons `imageinfo`/`extmetadata` API live.

| Character | File | Image shows the character? | Author/license matches Commons? | Note |
| --------- | ---- | --------------------------- | -------------------------------- | ---- |
| Diego Maradona | `Argentina_celebrando_copa_(cropped).jpg` | ✅ Yes — holding the 1986 World Cup trophy, clearly recognizable | ✅ Match (`Unknown author`, Public domain) | — |
| Chewbacca | `Solo-_A_Star_Wars_Story_...Chewbacca.jpg` | ✅ Visually recognizable as Chewbacca | ✅ Match (Dick Thomas Johnson, CC BY 2.0) | ⚠️ Commons categorizes this file as **"Cosplay of Chewbacca"** — see Gap 1 |
| Walter White | `Bryan_Cranston_(7598828512).jpg` | ✅ Bryan Cranston in the show's yellow hazmat suit at a Breaking Bad Comic-Con panel | ✅ Match (Gage Skidmore, CC BY-SA 2.0) | Actor + show costume, not fan cosplay — judged acceptable |
| Mahatma Gandhi | `Mahatma-Gandhi,_studio,_1931.jpg` | ✅ Clear studio portrait | ✅ Match (Elliott & Fry, Public domain) | Stored author string has a raw `&amp;` — see Gap 2 |
| Kobe Bryant | `Kobe_Bryant_2015.jpg` | ✅ Lakers jersey #24, clearly recognizable | ✅ Match (Keith Allison, CC BY-SA 2.0) | — |
| Amy Winehouse | `Amy_Winehouse_f4962007_crop.jpg` | ✅ Iconic beehive hair, recognizable on stage | ✅ Match (Rama, CC BY-SA 2.0 fr) | — |
| Jesse Pinkman | `Aaron_Paul_(7598828942).jpg` | ✅ Aaron Paul in the same yellow hazmat suit, same Comic-Con panel | ✅ Match (Gage Skidmore, CC BY-SA 2.0) | Same judgment as Walter White |
| Pac-Man | `Pac-Man_gameplay_(1x_pixel-perfect_recreation).png` | ✅ Clear gameplay screenshot, character unmistakable | ✅ Match (Bandai Namco Entertainment America, CC BY 3.0) | One of the 4 non-`/thumb/` exceptions — width independently confirmed 224px original |

**Result**: 7/8 clean, 1/8 (Chewbacca) flagged for a Commons cosplay category that the curation pipeline's own stated rejection criterion (T3 done-when) should have caught. 2/8 (Gandhi, and separately Nelson Mandela found while grepping — not in the random sample but caught while reviewing the file) have an HTML-entity artifact in `author`.

---

## IMG-06 Exception List — Independent Verdict

The claim: 4 approved entries (`pac man`, `luke skywalker`, `c 3po`, `rihanna`) lack `/thumb/` in their URL because the Commons original is already smaller than the requested width, so the `imageinfo` API returns the original file as "thumbnail."

Independently queried the Commons `imageinfo` API (`prop=imageinfo&iiprop=size`) for all 4 files:

| File | Claimed width | Live Commons width | Match? |
| ---- | -------------- | -------------------- | ------ |
| `Pac-Man_gameplay_(1x_pixel-perfect_recreation).png` | 141–262px range (per code comment) | 224px | ✅ |
| `Luke_Skywalker_-_Welcome_Banner_(Cropped).jpg` | 141–262px range | 254px | ✅ |
| `Star_Wars_-_A_New_Hope,...(cropped).jpg` (C-3PO) | 141–262px range | 141px | ✅ |
| `Rihanna_visits_U.S._Embassy_in_Barbados_2024_(cropped).jpg` | 141–262px range | 262px | ✅ |

All 4 author/license pairs also matched Commons `extmetadata` exactly (checked live, not just re-reading the catalog). The live `imageinfo` response even confirms the underlying mechanic the spec.md Assumptions table describes: the raw API URL carries `?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original` — and none of these tracking parameters appear in the catalog's stored URLs, confirming the tracking-parameter strip was actually done, not just claimed.

**Verdict: the exception list is legitimate**, not the test being loosened to fit a shortcut. It is a narrow, exact-string allowlist (not a wildcard/pattern relaxation) — mutant (h) confirmed that a width violation on a normal `/thumb/` URL still fails, and mutant (c) confirmed a non-Commons host still fails regardless of the allowlist. A 5th URL that lacked `/thumb/` and wasn't in the list would still fail the test (`originalFileExceptions.has(...)` is `false` for anything not in the exact set).

---

## Attribution Judgment (CARD-04)

Read `src/App.tsx:468-497` and `src/styles.css:256-370`.

**Verdict: attribution is genuinely displayed, not hidden**, with two caveats:

1. Credit is a real visible text node (`<p className="character-credit">{license} · {author}</p>` at `src/App.tsx:477`, `<small className="reveal-credit">` at `:492`) — not merely a `title` tooltip that requires hovering, which would have failed CC BY's "reasonable to the medium" bar for a game with no mouse-hover convention on mobile.
2. It also carries a redundant `aria-label` with the full text (`src/App.tsx:477,492`), so screen-reader users get it even if the visible line is truncated.

Caveats found:
- **Gap 2**: two entries (`server/character-images.ts:396,401` — Gandhi and Mandela) store `author` with a literal `&amp;` (e.g. `'Elliott &amp; Fry'`). Since this string is inserted as JSX text (not `dangerouslySetInnerHTML`), React will **not** decode the entity — the card will visibly render the literal text `Elliott &amp; Fry` instead of `Elliott & Fry`. This is a real, user-visible defect in the attribution text for 2/89 entries.
- **Gap 3**: `.character-credit`/`.reveal-credit` (`src/styles.css:272,368`) use `font: 8px`, `white-space: nowrap`, and `text-overflow: ellipsis`. 8px is very small, and a long "license · author" string in a ~150-250px-wide card column will silently truncate rather than wrap. This does not hide the attribution (it's still on-screen, and `aria-label` still carries the full text for assistive tech), but it is a legibility risk for the sighted-user credit line on longer names.

Neither caveat rises to "attribution is not displayed" — both are display-quality defects within a mechanism that does display it.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ (mirrors `englishOriginals`/`aliasesByName` pattern, reuses `viewRoom`'s existing conditional rather than adding new logic) |
| Would senior engineer approve? | ✅, with the two data-quality nits above |
| Tests map to acceptance criteria and are non-shallow | ✅ — PRIV-02 test in particular explicitly guards against the vacuous-pass failure mode called out in design.md's own Risks table (referencing the prior feature's POOL-06 mutant survival) |
| Spec-anchored outcome check | ✅ — see table above |
| Per-layer Coverage Expectation met | ✅ — domain logic (catalog/merge) has 1:1 test mapping; integration test covers PRIV happy+leak+reveal paths; React layer has no test infra, matches the project's declared limitation |
| Every test in scope maps to a spec AC | ✅ — no unclaimed tests found in the diff |
| Documented guidelines followed | none found (`AGENTS.md`/`CONTRIBUTING.md` absent) — strong defaults applied, consistent with the Test Coverage Matrix's own declaration |

---

## Edge Cases

- [x] Commons sem autor declarado → rejeitado na curadoria (enforced by IMG-03 test + T1's stated rejection of 2 candidates without attribution)
- [x] Personagem renomeado → entrada órfã quebra a suíte (IMG-04, mutant b killed)
- [x] Proporção diferente do card → `object-fit: cover` (`src/styles.css:260,360`)
- [x] Conexão lenta → nome/categoria renderizam antes da imagem (unconditional render at `src/App.tsx:476`, `loading="lazy"` on `<img>`)

---

## Gate Check

- **Gate command**: `npm run build && npm test`
- **Result**: build clean (tsc + vite, no errors); 52 tests passed, 0 failed, 0 skipped
- **Test count before feature**: 46 (per T1's stated baseline, carried from `melhorias-jogo`)
- **Test count after feature**: 52
- **Delta**: +6 (5 in T4's `catálogo de imagens` describe block, 1 in T6's PRIV-02/03 integration test)
- **Skipped tests**: none
- **Failures**: none

Re-ran full suite twice in the real tree at the start of validation (once before build, once after) — both runs 52/52 green, no intermittency observed.

---

## Fix Plans (ranked, not blocking)

### Fix 1: IMG-02 curation slip — cosplay entry approved (Minor)

- **Root cause**: T2's automated triage filters filenames for patterns like `cosplay`/`Cosplay` in the title, but this file's title (`Solo-_A_Star_Wars_Story_Japan_Premiere_Red_Carpet-_Chewbacca.jpg`) doesn't contain that word — only the file's Commons **category** metadata (`Cosplay of Chewbacca`) reveals it, which neither the automated triage nor apparently the visual reviewer checked.
- **Fix task**: Re-run the T2 triage (or a follow-up script) against Commons category metadata (not just filename) for all 89 approved entries; re-review any flagged as `Cosplay of *`.
- **Priority**: Minor — the image is still visually recognizable as Chewbacca and is validly CC-licensed; this is a curation-quality miss against the project's own stated rejection criterion, not a legal or privacy risk.

### Fix 2: HTML entity artifact in 2 author strings (Minor)

- **Root cause**: `author` values for Gandhi (`server/character-images.ts:396`) and Mandela (`:401`) were copied from Commons' HTML-escaped `extmetadata.Artist` field verbatim, keeping the `&amp;` escape that only makes sense inside raw HTML, not inside a JS string rendered as JSX text.
- **Fix task**: Replace `&amp;` with `&` (or run an HTML-entity decode pass) for these two entries; grep the rest of the catalog for other escaped entities (`&quot;`, `&#39;`, etc.) before closing.
- **Priority**: Minor — attribution is still visible, just cosmetically malformed for 2/89 entries.

### Fix 3: Credit line legibility at 8px (Cosmetic)

- **Root cause**: `.character-credit`/`.reveal-credit` fixed at `font: 8px` with `nowrap`+ellipsis; long "license · author" combinations will truncate on narrow cards.
- **Fix task**: Consider `white-space: normal` with a 2-line clamp, or bump to 9-10px, for the card credit line; not urgent since `aria-label` already carries the untruncated text.
- **Priority**: Cosmetic.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| CARD-01 | Implementing | ✅ Verified |
| CARD-02 | Implementing | ✅ Verified |
| CARD-03 | Implementing | ✅ Verified |
| CARD-04 | Implementing | ✅ Verified (2 minor display-quality findings, not blocking — Fix 2, Fix 3) |
| IMG-01 | Implementing | ✅ Verified |
| IMG-02 | Implementing | ⚠️ Verified with spec-precision gap (no automated check exists; 1/89 curation slip found by sampling — Fix 1) |
| IMG-03 | Implementing | ✅ Verified |
| IMG-04 | Implementing | ✅ Verified |
| IMG-05 | Implementing | ✅ Verified |
| IMG-06 | Implementing | ✅ Verified |
| PRIV-01 | Implementing | ✅ Verified |
| PRIV-02 | Implementing | ✅ Verified (5/5 mutant-kill runs) |
| PRIV-03 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues (non-blocking) — see Fix 1-3

**Spec-anchored check**: 13/13 requirements have `file:line` evidence; 11 clean, 2 flagged with grounded, non-blocking findings
**Sensor**: 8/8 mutations killed (6 required + 2 self-designed), including 5/5 repeat runs on the highest-risk PRIV-02 mutant
**Gate**: 52 passed, 0 failed, 0 skipped; build clean

**What works**: The privacy invariant (the feature's stated highest risk) is solid — the PRIV-02 test provably exercises two image-bearing characters (not a vacuous pass) and killed the "leak own image during round" mutant 5/5 times. IMG-05's runtime-safety scan is real (proven by both a direct-leak mutant and a nested-directory mutant testing the recursion itself). IMG-04's orphan guard and IMG-06's width/domain checks are all independently mutation-tested. The IMG-06 hardcoded exception list for 4 non-thumbnail URLs was independently verified against live Commons data and is legitimate, not a loosened test. CARD-04's attribution is real visible text with a screen-reader fallback, not a hidden tooltip.

**Issues found**: (1) one sampled catalog entry (Chewbacca) is Commons-categorized as cosplay, which the project's own curation criterion should reject — no code-level check exists for this, so it is also a spec-precision gap; (2) two author strings carry an unescaped HTML entity that will render literally; (3) the credit line's 8px+ellipsis styling risks truncating long attributions. None of these compromise privacy, licensing legality, or runtime safety — the licenses and Commons sourcing are all still valid CC/PD.

**Next steps**: Route Fix 1 (re-scan catalog by Commons category for cosplay/statue/etc, not just filename), Fix 2 (decode HTML entities in `author` strings), and Fix 3 (loosen credit-line truncation) as small follow-up tasks. None block calling this feature done.
