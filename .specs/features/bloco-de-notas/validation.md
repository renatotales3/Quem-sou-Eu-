# Bloco de Notas — Validation

**Date**: 2026-08-09
**Spec**: `.specs/features/bloco-de-notas/spec.md`
**Diff range**: `b429216..HEAD` (`9967dc9`, `e08c4d0`, `3c20f25`, `3373096`, `ec9cb51`) na branch `feat/bloco-de-notas`
**Verifier**: sub-agente independente (autor ≠ verificador)
**Veredito**: **PASS ✅** (com 7 ACs de UI verificadas por inspeção de código e pendentes de UAT interativo, conforme decisão registrada na tabela de Assumptions)

---

## Estratégia de cobertura (contexto registrado na spec)

A spec registra, confirmada pelo usuário (`spec.md:32`), que o projeto não tem infraestrutura de teste de front (sem `jsdom`, sem testing-library). A estratégia acordada é: lógica pura em `src/notes.ts` coberta por teste unitário; ACs de render/interação verificadas por UAT interativo. Este relatório trata essas ACs como **verificadas por inspeção + pendentes de UAT**, não como lacuna de cobertura — e também não as declara comprovadas por teste automatizado.

---

## Spec-Anchored Acceptance Criteria

| AC | Resultado definido pela spec | Evidência `file:line` | Result |
| --- | --- | --- | --- |
| NOTES-01 — botão flutuante visível em `playing` | botão renderizado sobre a tela da partida | `src/App.tsx:413` — `<NotesPanel roomCode={room.code} round={room.round} />` dentro do bloco de render de `playing` (os retornos de `lobby` em `src/App.tsx:306` e de `finished` em `src/App.tsx:352` antecedem esse ponto); botão em `src/NotesPanel.tsx:60-69` | ✅ Inspeção + pendente UAT |
| NOTES-02 — nada visível em `lobby` / `finished` | botão e painel ausentes | `src/App.tsx:306` (`if (room.phase === 'lobby') return ...`) e `src/App.tsx:352` (`if (room.phase === 'finished') return ...`) retornam antes da montagem em `:413` | ✅ Inspeção + pendente UAT |
| NOTES-03 — abrir com conteúdo salvo da rodada | painel abre com o texto persistido | `src/NotesPanel.tsx:63` — `onClick={() => setOpen((current) => !current)}`; carga em `src/NotesPanel.tsx:18-20` — `setText(readNotes(sessionStorage, roomCode, round))`; render condicional `src/NotesPanel.tsx:43` | ✅ Inspeção + pendente UAT |
| NOTES-04 — fechar preservando o conteúdo | texto não é perdido ao fechar | `src/NotesPanel.tsx:43` — o `open &&` desmonta apenas o painel; `text` vive no estado do `NotesPanel` (`src/NotesPanel.tsx:16`), que permanece montado | ✅ Inspeção + pendente UAT |
| NOTES-05 — gravar em `sessionStorage` sob chave sala+rodada | chave derivada de `roomCode` e `round` | `tests/notes.test.ts:21` — `expect(notesStorageKey('ABC123', 1)).toBe('quem-sou-eu:notes:ABC123:1')`; `tests/notes.test.ts:25` (rodadas distintas) e `:29` (salas distintas); gravação em `src/NotesPanel.tsx:33` — `saveNotes(sessionStorage, roomCode, round, value)` no `onChange` (`src/NotesPanel.tsx:54`) | ✅ PASS ⚠️ ver nota de precisão 1 |
| NOTES-06 — reload restaura exatamente o texto gravado | texto lido == texto gravado | `tests/notes.test.ts:43` — `expect(readNotes(storage, 'ABC123', 1)).toBe('não sou homem')`; re-hidratação no mount em `src/NotesPanel.tsx:18-20` | ✅ PASS |
| NOTES-07 — rodada nova começa vazia | `''` na rodada seguinte | `tests/notes.test.ts:49` — `expect(readNotes(storage, 'ABC123', 2)).toBe('')`; efeito com dep `[roomCode, round]` em `src/NotesPanel.tsx:20` re-lê ao avançar a rodada | ✅ PASS |
| NOTES-08 — limpar esvazia e remove a entrada | textarea vazio **e** entrada removida do storage | `tests/notes.test.ts:56` — `expect(storage.getItem(notesStorageKey('ABC123', 1))).toBeNull()` **e** `:57` — `expect(readNotes(storage, 'ABC123', 1)).toBe('')`; conjunção também no código: `src/NotesPanel.tsx:37-38` — `setText('')` + `clearNotes(...)` | ✅ PASS (conjunção coberta nos dois lados) |
| NOTES-09 — leitura falha/ inválida ⇒ bloco vazio, sem lançar | retorna `''`, sem exceção | `tests/notes.test.ts:66` — `expect(readNotes(storage, 'ABC123', 1)).toBe('')` com `getItem` que lança; `tests/notes.test.ts:71` — mesmo `toBe('')` com valor de tipo inesperado (`42`); implementação `src/notes.ts:16-20` | ✅ PASS |
| NOTES-10 — gravação falha ⇒ texto continua na sessão em memória, sem interromper | `saveNotes` não lança; texto permanece visível | `tests/notes.test.ts:80` — `expect(saveNotes(failing, 'ABC123', 1, 'sou dos anos 90')).toBe(false)` e `:81` — caminho feliz `toBe(true)`; a permanência em memória vem de `src/NotesPanel.tsx:32-33` (`setText(value)` ocorre **antes** e independentemente de `saveNotes`) | ✅ PASS (retorno testado; permanência em memória por inspeção + UAT) |
| NOTES-11 — texto > 2000 ⇒ grava truncado em 2000 | valor gravado com exatamente 2000 chars | `tests/notes.test.ts:87` — `expect(readNotes(storage, 'ABC123', 1)).toBe('a'.repeat(2000))` após gravar 2001; constante em `tests/notes.test.ts:35` — `expect(MAX_NOTE_LENGTH).toBe(2000)`; implementação `src/notes.ts:26` | ✅ PASS |
| NOTES-12 — `Escape` fecha preservando conteúdo | painel fecha, texto intacto | `src/NotesPanel.tsx:22-29` — listener de `keydown` ativo só com `open`, `if (event.key === 'Escape') setOpen(false)`; `text` não é tocado | ✅ Inspeção + pendente UAT |
| NOTES-13 — rótulos acessíveis (`aria-label` + estado de expansão) | botão e painel com `aria-label`; botão com estado de expansão | `src/NotesPanel.tsx:64` — `aria-label={open ? 'Fechar bloco de notas' : 'Abrir bloco de notas'}`; `:65` — `aria-expanded={open}`; `:66` — `aria-controls="notes-panel"`; painel `:44` — `role="dialog" aria-label="Bloco de notas"`; botão limpar `:47` — `aria-label="Limpar notas"` | ✅ Inspeção + pendente UAT |
| NOTES-14 — nenhuma emissão de socket/HTTP com o texto | zero `emit`/`fetch` carregando a nota | `grep -n "emit\|fetch(" src/NotesPanel.tsx src/notes.ts` → nenhuma ocorrência; os únicos sinks são `sessionStorage` (`src/NotesPanel.tsx:19,33,38`). `src/App.tsx:413` passa apenas `room.code` e `room.round` para dentro do componente — nada sai | ✅ Inspeção (estática) + pendente UAT em DevTools |
| NOTES-15 — chave inclui o código da sala; salas diferentes não compartilham | chaves distintas por sala | `tests/notes.test.ts:29` — `expect(notesStorageKey('ABC123', 1)).not.toBe(notesStorageKey('XYZ789', 1))`; `tests/notes.test.ts:21` fixa o valor exato com a sala embutida | ✅ PASS |

**Status**: 15/15 ACs com evidência `file:line`. 8 comprovadas por asserção automatizada com valor batendo o resultado da spec (NOTES-05..11, 15); 7 verificadas por inspeção de código e **pendentes de UAT interativo** (NOTES-01, 02, 03, 04, 12, 13, 14) — conforme a estratégia registrada e confirmada na spec.

### Notas de precisão da spec

1. **NOTES-05 (menor)**: a spec exige "chave derivada do código da sala e do número da rodada" mas não define o literal da chave. O teste em `tests/notes.test.ts:21` fixa `'quem-sou-eu:notes:ABC123:1'`, um valor definido pela implementação e não pela spec. A propriedade que a spec *define* (derivação de sala + rodada) está coberta pelos testes de distinção (`:25`, `:29`), então não é lacuna — mas o teste de igualdade literal é um contrato de implementação, não de spec. Aceitável e desejável aqui (mata a mutação de ordem da chave), apenas registrado.
2. **NOTES-14 (menor)**: a spec define ausência de tráfego, um invariante negativo. A verificação é estática (ausência de sinks de rede no módulo de notas) mais UAT em DevTools. Nenhum teste automatizado pode fechar isso na infraestrutura atual.

---

## Payload / Conjunction Rule

- **NOTES-08** é uma conjunção ("esvaziar o texto **e** remover a entrada"): ambos os lados são asseridos separadamente em `tests/notes.test.ts:56` e `:57`. ✅
- **NOTES-10** é uma conjunção ("manter o texto visível **e** não interromper"): o retorno `false` é asserido em `tests/notes.test.ts:80`; a permanência do texto é garantida pela ordem em `src/NotesPanel.tsx:32-33` (inspeção). ⚠️ metade da conjunção não é automatizável na infraestrutura atual — vai para UAT.
- Nenhuma asserção do escopo se limita a "a função foi chamada": todas asserem valor/estado (`toBe` sobre o texto lido, o booleano de retorno, o item do storage).

---

## Discrimination Sensor

Executado em **git worktree isolado** (`git worktree add ... HEAD` em diretório temporário, `node_modules` por symlink), nunca com `git stash`, nunca mutando a árvore real. Baseline `git status --porcelain` antes: **vazio**; depois da remoção do worktree: **vazio** — isolamento confirmado.

| # | Alvo | Mutação | Killed? |
| --- | --- | --- | --- |
| 1 | `src/notes.ts:7` | Inverter a ordem da chave: `:${roomCode}:${round}` → `:${round}:${roomCode}` | ✅ Killed (1 failed / 10 passed) |
| 2 | `src/notes.ts:26` | Remover a truncagem: `text.slice(0, MAX_NOTE_LENGTH)` → `text` | ✅ Killed |
| 3 | `src/notes.ts:18-20` | `catch` de `readNotes` relança em vez de devolver `''` | ✅ Killed |
| 4 | `src/notes.ts:26` | Off-by-one: `slice(0, MAX_NOTE_LENGTH)` → `slice(0, MAX_NOTE_LENGTH - 1)` | ✅ Killed |
| 5 | `src/notes.ts:35` | `clearNotes` deixa de chamar `storage.removeItem` | ✅ Killed |
| 6 | `src/notes.ts:29` | `saveNotes` devolve `true` mesmo quando o storage recusa | ✅ Killed |

**Profundidade**: expandida (6 mutações, cobrindo todas as funções e ramos de `src/notes.ts`).
**Resultado**: 6/6 mortos — **PASS ✅**. Nenhum mutante sobrevivente, nenhuma fix task de cobertura.

---

## Gate Check

- `npm run typecheck` (`tsc -p tsconfig.app.json && tsc -p tsconfig.server.json`): ✅ exit 0, zero erros.
- `npm test`: ✅ **66 passed, 0 failed** (5 arquivos de teste). Testes novos em `tests/notes.test.ts`: **11**.
- **Flakiness observada (não relacionada à feature)**: a primeira execução de `npm test` falhou 1 teste em `tests/game.integration.test.ts` ("player:solved e o ranking final carregam solveMs...") com `Timeout esperando round:finished`. Reexecutado isoladamente (`npx vitest run tests/game.integration.test.ts`): 16/16 verdes; reexecução da suíte completa: 66/66 verdes. É um timeout de socket sob carga paralela, em código pré-existente fora do range do diff — **não** é regressão desta feature. Registrado como flake conhecido a observar.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo (4 funções puras, sem abstração extra) | ✅ |
| Mudanças cirúrgicas (1 linha em `App.tsx`, 2 arquivos novos + CSS) | ✅ |
| Sem scope creep (nada de notas estruturadas, sync ou histórico) | ✅ |
| Segue os padrões do projeto (storage por chave prefixada como `src/socket.ts`; testes Node puros) | ✅ |
| Spec-anchored: valores asseridos batem o resultado da spec | ✅ (2 notas de precisão menores registradas) |
| Cobertura por camada: lógica de domínio 1:1 com as ACs testáveis | ✅ |
| Todo teste mapeia para uma AC — nenhum teste órfão | ✅ (11 testes → NOTES-05..11, 15) |
| Diretrizes documentadas do projeto | nenhuma além da spec — defaults fortes aplicados |

---

## Edge Cases

- [x] `sessionStorage` indisponível ⇒ degrada para memória — `src/notes.ts:18,29,37`; `tests/notes.test.ts:60,74`.
- [x] Valor gravado de tipo inesperado ⇒ bloco vazio — `src/notes.ts:17`; `tests/notes.test.ts:69`.
- [x] Segunda sala na mesma aba ⇒ bloco vazio — chave por sala, `tests/notes.test.ts:29`; efeito com dep `roomCode` em `src/NotesPanel.tsx:20`.
- [x] Jogador acerta e continua na rodada ⇒ bloco acessível até a fase mudar — a montagem depende só da fase (`src/App.tsx:413`), não de `me.solved`.

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| NOTES-05, 06, 07, 08, 09, 10, 11, 15 | Done | ✅ Verified (teste automatizado + sensor) |
| NOTES-01, 02, 03, 04, 12, 13, 14 | Done | ✅ Verified por inspeção — ⏳ pendente de UAT interativo |

---

## Summary

**Overall**: ✅ Ready (sujeito ao UAT interativo das 7 ACs de UI)

**Spec-anchored check**: 15/15 ACs com evidência; 8 comprovadas por asserção automatizada com valor batendo a spec, 7 por inspeção + UAT pendente; 2 notas de precisão menores (NOTES-05, NOTES-14).
**Sensor**: 6/6 mutantes mortos.
**Gate**: typecheck ✅; 66 passed, 0 failed.

**O que funciona**: chave isolada por sala+rodada, persistência e restauração em `sessionStorage`, truncagem em 2000, degradação silenciosa com storage bloqueado, limpeza que remove a entrada, painel com `Escape`, rótulos ARIA e zero sinks de rede.

**Nada a corrigir.** Próximo passo: rodar o UAT interativo das ACs NOTES-01, 02, 03, 04, 12, 13, 14 com o usuário; e observar o flake de `tests/game.integration.test.ts` em execuções futuras (fora do escopo desta feature).
