# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - When a test proves a room-scoped exclusion set by drawing from a large catalog, mock the RNG or assert directly against the internal set instead of relying on collision probability to prove exclusion.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server/game.ts` · harmful: 0
- features: melhorias-jogo
- evidence: server/game.ts:304-306 (mutant b) (server/game.ts)
- last seen: 2026-08-04T23:02:37Z

### L-002 - A cleanup-on-deletion acceptance criterion needs a test that observes the side effect (e.g. a lookup fails after deletion), not just a structural argument that the field lives inside the deleted object.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `server/game.ts` · harmful: 0
- features: melhorias-jogo
- evidence: POOL-07 (server/game.ts)
- last seen: 2026-08-04T23:02:37Z

### L-003 - A never-happens acceptance criterion (no timer-based side effect) must get its own row in the test coverage matrix, or it silently drops out of every task's scope.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `test-coverage-matrix` · harmful: 0
- features: melhorias-jogo
- evidence: TIME-09 (test-coverage-matrix)
- last seen: 2026-08-04T23:02:37Z

### L-004 - When a fix adds a deterministic assertion to one test that shared a statistically-weak collision-based pattern, re-run the sensor against every sibling test built on the same pattern before declaring that class of gap closed - fixing one instance does not fix the others.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server/game.ts` · harmful: 0
- features: melhorias-jogo
- evidence: server/game.ts:541 (mutant i, round 2) (server/game.ts)
- last seen: 2026-08-04T23:18:51Z

### L-005 - A test that proves a never-happens timing invariant by waiting a fixed observation window only disproves faults shorter than that window - size the window to the longest plausible real-world fault duration, not an arbitrary short wait.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server/game.ts` · harmful: 0
- features: melhorias-jogo
- evidence: server/game.ts:311 (mutant g, round 2) (server/game.ts)
- last seen: 2026-08-04T23:18:51Z

### L-006 - When a curated-data acceptance criterion depends on human visual judgment (e.g. 'not cosplay/statue/graffiti'), add an automatable metadata proxy check (e.g. scan source-platform category tags) instead of leaving it fully untested — filename-only triage misses cases the platform's own category metadata would catch.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `curation` · harmful: 0
- features: fotos-personagens
- evidence: IMG-02 (curation)
- last seen: 2026-08-05T01:47:25Z

### L-007 - When copying attribution text from an HTML-sourced API field (e.g. Commons extmetadata) into a JS string rendered as JSX text, decode HTML entities first — React does not re-decode entities inside already-parsed text nodes, so raw &amp; renders literally on screen.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `data-hygiene` · harmful: 0
- features: fotos-personagens
- evidence: server/character-images.ts:396 (data-hygiene)
- last seen: 2026-08-05T01:47:25Z

### L-008 - When a curated-image resolver matches a person (actor, voice actor) rather than a role, check for the same image URL reused across different characters before visual review — a duplicate hit is objective, code-checkable proof the resolver returned a person's generic photo instead of a role-specific one.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `curation` · harmful: 0
- features: fotos-personagens
- evidence: IMG-02 (curation)
- last seen: 2026-08-05T03:28:53Z

### L-009 - Assert that a frozen/snapshot value is the one consumed by the calculation, not merely that it was stored
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server` · harmful: 0
- features: placar-da-sessao
- evidence: validation.md M4 - server/game.ts:245 (server)
- last seen: 2026-08-09T00:58:25Z

### L-010 - Test the acceptance criterion under its own stated precondition, not a simpler state that happens to share the expected value
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: placar-da-sessao
- evidence: SCORE-07 - tests/game.integration.test.ts:826 (tests)
- last seen: 2026-08-09T00:58:25Z

### L-011 - When an Assumption fixes a field representation, restate that exact value in the acceptance criterion so AC and Assumption cannot disagree
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: placar-da-sessao
- evidence: SCORE-03 - .specs/features/placar-da-sessao/spec.md:38,57 (spec)
- last seen: 2026-08-09T00:58:25Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
