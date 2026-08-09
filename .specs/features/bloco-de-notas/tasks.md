# Bloco de Notas — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/bloco-de-notas/spec.md`
**Design**: none — escopo Medium, sem decisões arquiteturais novas
**Status**: Approved

---

## Test Coverage Matrix

> Gerada a partir do codebase e da spec. Guidelines encontradas: nenhuma (`AGENTS.md`, `CONTRIBUTING.md` e limiares de cobertura ausentes; `vitest.config.ts` só ajusta timeouts). Defaults fortes aplicados, limitados pela decisão registrada na spec de não introduzir infraestrutura de teste de front.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura de cliente (`src/notes.ts`) | unit | Todos os ramos; 1:1 com as ACs de persistência (NOTES-05..11, NOTES-15); todo edge case listado tem teste dedicado | `tests/*.test.ts` | `npm test` |
| Componente React (`src/NotesPanel.tsx`, `src/App.tsx`) | none | Build gate apenas — o projeto não tem `jsdom` nem testing-library (assumption confirmada na spec); ACs de render/interação (NOTES-01..04, NOTES-12, NOTES-13, NOTES-14) verificadas por UAT interativo | — | build gate |
| Estilos (`src/styles.css`) | none | Build gate apenas | — | build gate |

**Nota de provenance:** os 4 testes existentes (`tests/game.integration.test.ts`, `origins.test.ts`, `time.test.ts`, `wordlist.test.ts`) são todos Node puro sobre módulos sem DOM. `tests/notes.test.ts` segue o mesmo padrão, injetando um `Storage` falso.

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tasks com testes unitários | `npm test` |
| Full | Depois de tasks com testes de integração | `npm test` |
| Build | Última task de uma fase, ou tasks sem testes | `npm run typecheck && npm test` |

---

## Execution Plan

### Phase 1: Núcleo de persistência

```
T1 → T2
```

### Phase 2: Interface

```
T2 → T3 → T4 → T5
```

---

## Task Breakdown

### T1: Derivar a chave de armazenamento por sala e rodada

**What**: Criar `src/notes.ts` exportando `notesStorageKey(roomCode, round)` e a constante `MAX_NOTE_LENGTH = 2000`, mais os testes que provam o isolamento por sala e por rodada.
**Where**: `src/notes.ts`
**Depends on**: None
**Reuses**: padrão de constante de chave `SESSION_KEY` em `src/socket.ts`
**Requirement**: NOTES-05, NOTES-07, NOTES-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `notesStorageKey('ABC123', 1)` devolve string estável com prefixo `quem-sou-eu:notes:`, o código da sala e o número da rodada
- [ ] Chaves de rodadas diferentes na mesma sala são distintas (NOTES-07)
- [ ] Chaves de salas diferentes na mesma rodada são distintas (NOTES-15)
- [ ] `MAX_NOTE_LENGTH` exportado com valor 2000
- [ ] Gate check passa: `npm test`
- [ ] Test count: 4 testes passam (sem deleções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(notes): derive per-room per-round storage key`

---

### T2: Ler, gravar e limpar notas com tolerância a falhas

**What**: Adicionar a `src/notes.ts` as funções `readNotes(storage, roomCode, round)`, `saveNotes(storage, roomCode, round, text)` e `clearNotes(storage, roomCode, round)`, recebendo o `Storage` por parâmetro, com truncagem em `MAX_NOTE_LENGTH` e degradação silenciosa quando o storage falha — mais os testes de cada ramo.
**Where**: `src/notes.ts` (modify)
**Depends on**: T1
**Reuses**: o `try/catch` que devolve `null` em `readSession()` de `src/socket.ts`
**Requirement**: NOTES-06, NOTES-08, NOTES-09, NOTES-10, NOTES-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `saveNotes` seguido de `readNotes` na mesma sala e rodada devolve exatamente o texto gravado (NOTES-06)
- [ ] `readNotes` numa rodada sem nada gravado devolve string vazia (NOTES-07)
- [ ] `clearNotes` remove a entrada e faz `readNotes` devolver string vazia (NOTES-08)
- [ ] `readNotes` devolve string vazia, sem lançar, quando `getItem` lança ou devolve valor de tipo inesperado (NOTES-09)
- [ ] `saveNotes` devolve `false` sem lançar quando `setItem` lança quota exceeded; devolve `true` no caminho feliz (NOTES-10)
- [ ] Texto com 2001 caracteres é gravado truncado em exatamente 2000 (NOTES-11)
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: 11 testes passam no total em `tests/notes.test.ts` (sem deleções silenciosas)

**Tests**: unit
**Gate**: build

**Commit**: `feat(notes): read, save and clear notes with storage fallbacks`

---

### T3: Componente do bloco de notas

**What**: Criar `src/NotesPanel.tsx` — botão flutuante que alterna um painel com `textarea`, recebendo `roomCode` e `round` por prop, gravando a cada alteração via `saveNotes`, restaurando via `readNotes` na montagem e ao mudar de rodada, com botão de limpar, fechamento por `Escape` e rótulos acessíveis.
**Where**: `src/NotesPanel.tsx`
**Depends on**: T2
**Reuses**: padrões de `aria-label`, `micro-label` e `paper-card` já usados em `src/App.tsx`
**Requirement**: NOTES-01, NOTES-03, NOTES-04, NOTES-08, NOTES-12, NOTES-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Botão flutuante com `aria-label` e `aria-expanded` refletindo o estado do painel (NOTES-13)
- [ ] Clicar no botão abre o painel com o conteúdo salvo da rodada atual (NOTES-03)
- [ ] Clicar de novo fecha preservando o conteúdo (NOTES-04)
- [ ] `Escape` com o painel aberto fecha preservando o conteúdo (NOTES-12)
- [ ] Alterar o `textarea` chama `saveNotes`; `maxLength` do campo é `MAX_NOTE_LENGTH` (NOTES-11)
- [ ] Botão de limpar esvazia o campo e chama `clearNotes` (NOTES-08)
- [ ] Mudança da prop `round` recarrega o conteúdo da nova chave (NOTES-07)
- [ ] Componente não importa `socket` nem faz `fetch` (NOTES-14)
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: 11 testes continuam passando (nenhum novo — camada `none` na matriz)

**Tests**: none
**Gate**: build

**Commit**: `feat(notes): add floating notes panel component`

---

### T4: Montar o bloco na tela da partida

**What**: Renderizar `<NotesPanel>` em `src/App.tsx` apenas no retorno da fase `playing`, passando `room.code` e `room.round`.
**Where**: `src/App.tsx` (modify)
**Depends on**: T3
**Reuses**: o bloco `return (<main className="app-shell room-shell game-shell">…)` no fim de `App`
**Requirement**: NOTES-01, NOTES-02, NOTES-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `NotesPanel` aparece no retorno da fase `playing` (NOTES-01)
- [ ] `NotesPanel` não aparece nos retornos de home, `lobby` e `finished` (NOTES-02)
- [ ] Nenhum handler de socket novo e nenhuma mudança em `shared/protocol.ts` (NOTES-14)
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: 11 testes continuam passando

**Tests**: none
**Gate**: build

**Commit**: `feat(notes): mount notes panel on the playing screen`

---

### T5: Estilos do botão flutuante e do painel

**What**: Adicionar a `src/styles.css` as regras do botão flutuante e do painel, seguindo a paleta e o vocabulário de classes já existentes, sem cobrir o campo de palpite em telas estreitas.
**Where**: `src/styles.css` (modify)
**Depends on**: T4
**Reuses**: tokens de cor, sombra e `paper-card` já definidos no arquivo
**Requirement**: NOTES-01, NOTES-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Botão flutuante posicionado sobre a tela da partida sem sobrepor o botão de enviar palpite
- [ ] Painel legível em viewport de 360px de largura
- [ ] Nenhum token de cor novo inventado — só os já presentes no arquivo
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: 11 testes continuam passando

**Tests**: none
**Gate**: build

**Commit**: `style(notes): style the floating button and notes panel`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2
Phase 2:  T2 ------→ T3 ------→ T4 ------→ T5
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Chave de armazenamento | 1 função + 1 constante, mesmo arquivo | ✅ Granular |
| T2: read/save/clear | 3 funções coesas, mesmo arquivo | ✅ Granular |
| T3: NotesPanel | 1 componente | ✅ Granular |
| T4: Montagem em App | 1 arquivo, 1 ponto de render | ✅ Granular |
| T5: Estilos | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — (início da Phase 1) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Lógica pura de cliente | unit | unit | ✅ OK |
| T2 | Lógica pura de cliente | unit | unit | ✅ OK |
| T3 | Componente React | none | none | ✅ OK |
| T4 | Componente React | none | none | ✅ OK |
| T5 | Estilos | none | none | ✅ OK |

`Tests: none` em T3/T4/T5 é válido porque a matriz marca essas camadas como `none` — decisão registrada e confirmada na tabela de Assumptions da spec, não deferimento de teste.

---

## Progress

| Task | Status | Commit |
| --- | --- | --- |
| T1 | Done | feat(notes): derive per-room per-round storage key |
| T2 | Done | feat(notes): read, save and clear notes with storage fallbacks |
| T3 | Done | feat(notes): add floating notes panel component |
| T4 | Done | feat(notes): mount notes panel on the playing screen |
| T5 | Done | style(notes): style the floating button and notes panel |
