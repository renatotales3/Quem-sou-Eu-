# Encerrar Rodada Travada — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/encerrar-rodada-travada/spec.md`
**Design**: none — escopo Medium: um evento novo no protocolo, um handler seguindo o padrão de `playAgain`, um botão condicional. Sem decisão arquitetural nova.
**Status**: Approved

---

## Test Coverage Matrix

> Gerada a partir do codebase e da spec. Guidelines encontradas: nenhuma. Defaults fortes aplicados, limitados pela decisão registrada de não introduzir infraestrutura de teste de front.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Contrato compartilhado (`shared/protocol.ts`) | none | Build gate apenas — só declara tipos; o comportamento é provado nos testes de integração | — | build gate |
| Estado e eventos do servidor (`server/game.ts`) | integration | Todo AC de servidor (END-01..04, END-07..14): caminho feliz, toda recusa e todo edge case listado, exercitados por socket real | `tests/game.integration.test.ts` | `npm test` |
| Componente React (`src/App.tsx`) | none | Build gate apenas — sem `jsdom` nem testing-library; END-05 e END-06 verificados por UAT interativo | — | build gate |
| Estilos (`src/styles.css`) | none | Build gate apenas | — | build gate |

**Nota de provenance:** `tests/game.integration.test.ts` já sobe um Socket.IO real e é onde as recusas por guard (`HOST_ONLY`, fase errada) do `playAgain` já são provadas — o mesmo lugar e o mesmo estilo servem para `round:endEarly`.

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tasks com testes unitários | `npm test` |
| Full | Depois de tasks com testes de integração | `npm test` |
| Build | Última task de uma fase, ou tasks sem testes | `npm run typecheck && npm test` |

---

## Execution Plan

### Phase 1: Servidor

```
T1 → T2 → T3
```

### Phase 2: Interface

```
T3 → T4 → T5
```

---

## Task Breakdown

### T1: Declarar o evento de encerramento no protocolo

**What**: Adicionar `'round:endEarly': () => void` a `ClientToServerEvents` em `shared/protocol.ts`, com comentário curto explicando que o comando existe para destravar rodada com jogador ausente.
**Where**: `shared/protocol.ts`
**Depends on**: None
**Reuses**: a assinatura sem payload de `'round:playAgain'` e `'room:leave'` no mesmo tipo
**Requirement**: END-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `ClientToServerEvents['round:endEarly']` declarado como `() => void`
- [ ] Nenhum outro evento do protocolo alterado
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte existente continua passando integralmente

**Tests**: none
**Gate**: build

**Commit**: `feat(round): declare the early-end event in the shared protocol`

---

### T2: Handler de encerramento com as recusas

**What**: Implementar em `server/game.ts` o handler de `round:endEarly`: registrar o listener junto dos outros, recusar quem não é anfitrião (`HOST_ONLY`), recusar fora da fase `playing` (`ROUND_NOT_RUNNING`), recusar quando não há jogador desconectado sem acertar (`ROUND_NOT_STUCK`), ignorar socket sem sessão, e chamar `finishRound` no caminho válido — com os testes de integração de cada recusa e do caminho feliz.
**Where**: `server/game.ts`
**Depends on**: T1
**Reuses**: o handler `playAgain` (`server/game.ts:280`) como molde de guard + `sendError`, e `finishRound` (`:344`) para o efeito
**Requirement**: END-01, END-07, END-08, END-09, END-10, END-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Anfitrião com um jogador desconectado e sem acertar encerra: a fase vira `finished` (END-01)
- [ ] Jogador que não é anfitrião recebe `HOST_ONLY` e a fase não muda (END-07)
- [ ] Anfitrião com todos conectados recebe `ROUND_NOT_STUCK` e a fase não muda (END-08)
- [ ] Anfitrião cujo único desconectado já acertou recebe `ROUND_NOT_STUCK` (END-09)
- [ ] Emissão fora da fase `playing` recebe `ROUND_NOT_RUNNING` (END-10)
- [ ] Segunda emissão seguida recebe `ROUND_NOT_RUNNING`, porque a sala já saiu de `playing` (END-10)
- [ ] Socket sem sessão válida não altera estado nenhum (END-11)
- [ ] Gate check passa: `npm test`
- [ ] Test count: 74 testes existentes + 7 novos passam

**Tests**: integration
**Gate**: full

**Commit**: `feat(round): let the host end a round stalled by an absent player`

---

### T3: Provar a equivalência com o encerramento natural

**What**: Cobrir em `tests/game.integration.test.ts` que o encerramento por comando produz o mesmo resultado do encerramento natural — ranking, `rank`, `roundPoints` e `score` preservados para quem acertou, nulos e inalterados para quem não acertou — e que a sala segue jogável depois, sem alterar código de produção salvo se algum teste revelar defeito.
**Where**: `tests/game.integration.test.ts`
**Depends on**: T2
**Reuses**: os testes de `round:finished` e de placar já existentes no arquivo como molde de asserção
**Requirement**: END-02, END-03, END-04, END-12, END-13, END-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `round:finished` chega a todos os conectados com o mesmo ranking do encerramento natural (END-02)
- [ ] Quem acertou mantém `rank`, `roundPoints` e `score` (END-03)
- [ ] Quem não acertou fica com `rank` e `roundPoints` nulos e `score` inalterado (END-04)
- [ ] `round:playAgain` funciona depois do encerramento por comando (END-12)
- [ ] O desconectado que reconecta depois recebe o estado corrente com o `score` que tinha (END-13)
- [ ] Os testes do encerramento natural existentes continuam passando sem alteração (END-14)
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: testes de T2 + 6 novos passam

**Tests**: integration
**Gate**: build

**Commit**: `test(round): prove early end matches the natural round finish`

---

### T4: Botão de encerrar para o anfitrião

**What**: Em `src/App.tsx`, exibir na tela da partida um botão de encerrar rodada, visível apenas para o anfitrião e apenas quando existe ao menos um jogador desconectado que ainda não acertou, emitindo `round:endEarly`.
**Where**: `src/App.tsx`
**Depends on**: T3
**Reuses**: o botão `primary-button` de `playAgain` no retorno de `finished` como molde de comando do anfitrião
**Requirement**: END-05, END-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O botão aparece para o anfitrião quando há jogador desconectado sem acertar (END-05)
- [ ] O botão não aparece para jogador que não é anfitrião, em nenhuma condição (END-06)
- [ ] O botão não aparece quando todos estão conectados, nem quando os desconectados já acertaram (END-06)
- [ ] O rótulo não nomeia nem identifica quem está desconectado
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(round): add the host control to end a stalled round`

---

### T5: Estilo do botão de encerrar

**What**: Adicionar a `src/styles.css` a regra do botão de encerrar rodada, usando os tokens e classes já existentes, sem competir visualmente com o campo de palpite.
**Where**: `src/styles.css`
**Depends on**: T4
**Reuses**: os padrões de `.primary-button`, `.ghost-button` e `.waiting-chip` já definidos no arquivo
**Requirement**: END-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O botão fica legível e alcançável em viewport de 360px de largura
- [ ] Nenhum token de cor novo inventado
- [ ] O botão não cobre nem empurra o campo de palpite nem o bloco de notas
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `style(round): style the stalled-round host control`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T3 ------→ T4 ------→ T5
```

5 tasks cabem num único batch (~7 por worker), então a execução é inline no janela principal, sem batch workers. O Verifier roda normalmente ao final, como sub-agente independente.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Protocolo | 1 arquivo, 1 declaração | ✅ Granular |
| T2: Handler | 1 arquivo, 1 handler coeso | ✅ Granular |
| T3: Equivalência | 1 arquivo de teste | ✅ Granular |
| T4: Botão | 1 arquivo, 1 controle | ✅ Granular |
| T5: Estilo | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — (raiz da Phase 1) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Contrato compartilhado (só tipos) | none | none | ✅ OK |
| T2 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T3 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T4 | Componente React | none | none | ✅ OK |
| T5 | Estilos | none | none | ✅ OK |

`Tests: none` em T1 é válido porque a task só declara um tipo — o comportamento do evento é provado nos testes de integração de T2, que falham se a declaração não existir. `Tests: none` em T4/T5 segue a camada `none` da matriz.

---

## Progress

| Task | Status | Commit |
| --- | --- | --- |
| T1 | ✅ Done | `pendente` |
| T2 | ✅ Done | `pendente` |
| T3 | Pending | — |
| T4 | Pending | — |
| T5 | Pending | — |
