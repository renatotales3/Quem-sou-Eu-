# Fotos dos Personagens Validation

**Date**: 2026-08-05
**Spec**: `.specs/features/fotos-personagens/spec.md`
**Diff range**: `047a7ad..HEAD` (`18940ac`..`0aedcf3`, 6 commits: T3 curated catalog, T4 wordlist merge, T5 protocol, T6 game privacy, T7 UI, T8 styles)
**Verifier**: independent sub-agent (author ≠ verifier)

**Result**: PASS

---

## Task Completion

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
**Result**: 8/8 killed — **PASS**

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
