# Placar Acumulado da Sessão — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/placar-da-sessao/spec.md`
**Design**: none — escopo Large mas sem decisão arquitetural nova: dois campos em estruturas existentes, uma função pura nova, três pontos de render. As decisões estruturais estão registradas na tabela de Assumptions da spec.
**Status**: Approved

---

## Test Coverage Matrix

> Gerada a partir do codebase e da spec. Guidelines encontradas: nenhuma (`AGENTS.md` e `CONTRIBUTING.md` ausentes; `vitest.config.ts` só ajusta timeouts). Defaults fortes aplicados, limitados pela decisão registrada na spec `bloco-de-notas` de não introduzir infraestrutura de teste de front.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura de domínio (`server/scoring.ts`) | unit | Todos os ramos; 1:1 com SCORE-01; todo boundary listado (primeiro, último, sala mínima) tem teste dedicado | `tests/scoring.test.ts` | `npm test` |
| Estado e eventos do servidor (`server/game.ts`, `shared/protocol.ts`) | integration | Todo AC de servidor (SCORE-02..09, SCORE-15..18): caminho feliz, todo edge case listado e todo caminho de falha, exercitados por socket real | `tests/game.integration.test.ts` | `npm test` |
| Componente React (`src/App.tsx`) | none | Build gate apenas — sem `jsdom` nem testing-library no projeto; SCORE-10..14 verificados por UAT interativo | — | build gate |
| Estilos (`src/styles.css`) | none | Build gate apenas | — | build gate |

**Nota de provenance:** `tests/game.integration.test.ts` já sobe um servidor Socket.IO real e troca eventos por rede local — é o padrão do projeto para regra de servidor e onde os ACs de acumulação devem ser provados de ponta a ponta. `tests/scoring.test.ts` segue o estilo Node puro de `tests/time.test.ts`.

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tasks com testes unitários | `npm test` |
| Full | Depois de tasks com testes de integração | `npm test` |
| Build | Última task de uma fase, ou tasks sem testes | `npm run typecheck && npm test` |

---

## Execution Plan

### Phase 1: Contrato e estado

```
T1 → T3
T2 → T3
```

### Phase 2: Regras de pontuação

```
T3 → T4 → T5
```

### Phase 3: Interface

```
T5 → T6 → T7 → T8 → T9
```

---

## Task Breakdown

### T1: Expor pontuação no contrato compartilhado

**What**: Adicionar `score: number` e `roundPoints: number | null` a `PlayerView` em `shared/protocol.ts`, com comentário explicando por que `roundPoints` é anulável.
**Where**: `shared/protocol.ts`
**Depends on**: None
**Reuses**: os campos existentes `solved`, `rank` e `solveMs` do mesmo tipo
**Requirement**: SCORE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `PlayerView.score` declarado como `number`
- [ ] `PlayerView.roundPoints` declarado como `number | null`
- [ ] Nenhum tipo de entrada de cliente (`GuessInput`, `ReadyInput`, `JoinRoomInput`, `CreateRoomInput`) ganha campo de pontuação (SCORE-05)
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte existente continua passando integralmente

**Tests**: none
**Gate**: build

**Commit**: `feat(score): expose session score fields in the shared protocol`

---

### T2: Função pura de pontos por posição

**What**: Criar `server/scoring.ts` exportando `pointsForRank(rank, playerCount)` que devolve `playerCount - rank + 1`, mais os testes de fórmula e limites.
**Where**: `server/scoring.ts`
**Depends on**: None
**Reuses**: estilo de módulo puro de `server/normalization.ts`
**Requirement**: SCORE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `pointsForRank(1, 5)` devolve 5 e `pointsForRank(5, 5)` devolve 1 (SCORE-01)
- [ ] `pointsForRank(1, 2)` devolve 2 e `pointsForRank(2, 2)` devolve 1 — sala no mínimo de jogadores
- [ ] O último colocado de uma sala de `N` recebe exatamente 1, nunca 0, para `N` de 2 a 12
- [ ] A soma dos pontos de uma rodada com `N` jogadores todos acertando é `N * (N + 1) / 2`
- [ ] Gate check passa: `npm test`
- [ ] Test count: 5 testes passam em `tests/scoring.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(score): add rank-to-points scoring function`

---

### T3: Estado de placar na sala e no jogador

**What**: Adicionar `score` a `PlayerState` e `roundPlayerCount` a `RoomState` em `server/game.ts`, inicializando `score: 0` na criação do jogador, registrando `roundPlayerCount` em `startRound` e refletindo `score`/`roundPoints` em `viewRoom` — com os testes de integração de inicialização.
**Where**: `server/game.ts`
**Depends on**: T1, T2
**Reuses**: o padrão de campo por jogador de `solved`/`rank` e o mapeamento de `viewRoom` em `server/game.ts:429`
**Requirement**: SCORE-02, SCORE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Jogador recém-criado tem `score` 0 no `RoomView` (SCORE-07)
- [ ] `startRound` registra em `roundPlayerCount` o número de jogadores da sala naquele instante (SCORE-02)
- [ ] Duas rodadas com números de jogadores diferentes registram `roundPlayerCount` diferentes (SCORE-02)
- [ ] `roundPoints` é `null` para jogador que ainda não acertou
- [ ] Gate check passa: `npm test`
- [ ] Test count: testes de integração existentes + 3 novos passam

**Tests**: integration
**Gate**: full

**Commit**: `feat(score): track session score and round player count in room state`

---

### T4: Somar pontos no acerto

**What**: No fluxo de acerto de `server/game.ts` (junto da atribuição de `rank`, por volta da linha 225), somar `pointsForRank(rank, room.roundPlayerCount)` ao `score` do jogador e registrar o ganho da rodada — com os testes de integração da distribuição.
**Where**: `server/game.ts`
**Depends on**: T3
**Reuses**: o bloco que atribui `rank`, `solved` e `solvedAt` e emite `player:solved`
**Requirement**: SCORE-01, SCORE-03, SCORE-04, SCORE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Numa sala de 4 com todos acertando em ordem, os `score` finais são 4, 3, 2 e 1 (SCORE-01)
- [ ] Jogador que não acertou termina a rodada com ganho de rodada 0 e `score` inalterado (SCORE-03)
- [ ] Segundo acerto do mesmo jogador é rejeitado e não soma pontos de novo (SCORE-04)
- [ ] Um `guess` carregando campo extra de pontuação não altera o `score` — o servidor ignora (SCORE-05)
- [ ] Gate check passa: `npm test`
- [ ] Test count: testes existentes + 4 novos passam

**Tests**: integration
**Gate**: full

**Commit**: `feat(score): award points by solve position`

---

### T5: Preservar, herdar e descartar o placar

**What**: Garantir em `server/game.ts` que `playAgain`/`startRound` preservam `score` e zeram só o ganho da rodada, que a reconexão devolve o total, que `leaveRoom` descarta o placar junto do jogador e que a troca de anfitrião não mexe em nada — com os testes de integração de cada caminho.
**Where**: `server/game.ts`
**Depends on**: T4
**Reuses**: os laços de reset de `playAgain` (`server/game.ts:271`) e `startRound` (`server/game.ts:301`), e `players.delete` em `leaveRoom` (`server/game.ts:534`)
**Requirement**: SCORE-06, SCORE-08, SCORE-09, SCORE-15, SCORE-16, SCORE-17, SCORE-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Duas rodadas seguidas numa sala de 3: o `score` da segunda é a soma verificável das duas (SCORE-06)
- [ ] Reconectar com a mesma sessão devolve o `score` anterior à queda (SCORE-08)
- [ ] Sair pelo botão remove o jogador e o `score` dele do `RoomView` (SCORE-09)
- [ ] Jogador que sai no meio da rodada não altera os pontos dos demais, que seguem a escala do `roundPlayerCount` registrado (SCORE-15)
- [ ] Sala esvaziada e descartada não deixa placar órfão (SCORE-16)
- [ ] Troca de anfitrião por saída do anterior mantém todos os `score` inalterados (SCORE-17)
- [ ] Ao longo de 3 rodadas nenhum `score` fica negativo nem diminui entre rodadas (SCORE-18)
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: testes existentes + 7 novos passam

**Tests**: integration
**Gate**: build

**Commit**: `feat(score): preserve session score across rounds and reconnects`

---

### T6: Placar no painel do lobby

**What**: Em `src/App.tsx`, exibir o total de cada jogador no painel de participantes do lobby, ordenado por total decrescente com desempate alfabético, omitido enquanto `room.round === 0`.
**Where**: `src/App.tsx`
**Depends on**: T5
**Reuses**: o `PlayerRow` e o bloco `players-panel` do retorno de `lobby` (`src/App.tsx:333`)
**Requirement**: SCORE-10, SCORE-13, SCORE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O total aparece por jogador no painel de participantes quando `room.round > 0` (SCORE-10)
- [ ] Nada de placar é renderizado quando `room.round === 0` (SCORE-13)
- [ ] A ordenação é total decrescente, desempate por apelido em ordem alfabética (SCORE-14)
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(score): show session standings in the lobby panel`

---

### T7: Total da sessão durante a rodada

**What**: Em `src/App.tsx`, exibir o total da sessão do próprio jogador na tela da partida, junto do medidor de resolvidos, omitido na primeira rodada.
**Where**: `src/App.tsx`
**Depends on**: T6
**Reuses**: o bloco `solve-meter` do retorno de `playing` (`src/App.tsx:388`)
**Requirement**: SCORE-11, SCORE-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O total do próprio jogador aparece na tela da partida (SCORE-11)
- [ ] Nada de placar aparece durante a rodada 1 (SCORE-13)
- [ ] O ganho da rodada NÃO é exibido aqui — só o total, conforme a assumption da spec
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(score): show session total on the playing screen`

---

### T8: Placar da sessão na revelação

**What**: Em `src/App.tsx`, exibir na tela de fim de rodada o total da sessão e os pontos ganhos na rodada que acabou, para cada jogador, ordenado por total decrescente com desempate alfabético.
**Where**: `src/App.tsx`
**Depends on**: T7
**Reuses**: o `ranking-card` do retorno de `finished` (`src/App.tsx:363`), que já lista posição, apelido e tempo
**Requirement**: SCORE-12, SCORE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cada jogador aparece com total da sessão e pontos ganhos na rodada (SCORE-12)
- [ ] A ordenação do placar acumulado é total decrescente, desempate alfabético (SCORE-14)
- [ ] O placar da rodada existente (posição e tempo) continua intacto ao lado
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(score): show session standings on the reveal screen`

---

### T9: Estilos do placar

**What**: Adicionar a `src/styles.css` as regras das três superfícies de placar, usando os tokens de cor e o vocabulário de classes já existentes.
**Where**: `src/styles.css`
**Depends on**: T8
**Reuses**: tokens e padrões de `.ranking-row`, `.rank-number` e `.micro-label` já definidos no arquivo
**Requirement**: SCORE-10, SCORE-11, SCORE-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] As três superfícies ficam legíveis em viewport de 360px de largura
- [ ] Nenhum token de cor novo inventado — só os já presentes no arquivo
- [ ] O placar não empurra nem cobre o campo de palpite na tela da partida
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `style(score): style the session standings surfaces`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T3
          T2 ------↗
Phase 2:  T3 ------→ T4 ------→ T5
Phase 3:  T5 ------→ T6 ------→ T7 ------→ T8 ------→ T9
```

**Packing em batches:** Phase 1 + Phase 2 = 5 tasks (batch 1, servidor e contrato); Phase 3 = 4 tasks (batch 2, interface). Dois workers sequenciais, corte numa fronteira de fase real — o seam natural entre regra de servidor provada por teste e render verificado por UAT.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Contrato | 1 arquivo, 2 campos | ✅ Granular |
| T2: Função de pontos | 1 função pura | ✅ Granular |
| T3: Estado | 1 arquivo, 2 campos + inicialização | ✅ Granular |
| T4: Soma no acerto | 1 arquivo, 1 ponto de mudança | ✅ Granular |
| T5: Ciclo de vida do placar | 1 arquivo, 4 caminhos coesos (preservar/reconectar/descartar/host) | ✅ Granular |
| T6: Lobby | 1 arquivo, 1 superfície | ✅ Granular |
| T7: Rodada | 1 arquivo, 1 superfície | ✅ Granular |
| T8: Revelação | 1 arquivo, 1 superfície | ✅ Granular |
| T9: Estilos | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — (raiz da Phase 1) | ✅ Match |
| T2 | None | — (raiz da Phase 1) | ✅ Match |
| T3 | T1, T2 | T1 → T3 e T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Contrato compartilhado (só tipos) | none | none | ✅ OK |
| T2 | Lógica pura de domínio | unit | unit | ✅ OK |
| T3 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T4 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T5 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T6 | Componente React | none | none | ✅ OK |
| T7 | Componente React | none | none | ✅ OK |
| T8 | Componente React | none | none | ✅ OK |
| T9 | Estilos | none | none | ✅ OK |

`Tests: none` em T1 é válido porque a task só declara tipos — o comportamento que esses campos carregam é provado nos testes de integração de T3/T4/T5, que falham se os campos não existirem ou vierem errados. `Tests: none` em T6..T9 segue a camada `none` da matriz, decisão registrada e confirmada na spec.

---

## Progress

| Task | Status | Commit |
| --- | --- | --- |
| T1 | Done | `feat(score): expose session score fields in the shared protocol` |
| T2 | Done | `feat(score): add rank-to-points scoring function` |
| T3 | Done | `feat(score): track session score and round player count in room state` |
| T4 | Done | `feat(score): award points by solve position` |
| T5 | Pending | — |
| T6 | Pending | — |
| T7 | Pending | — |
| T8 | Pending | — |
| T9 | Pending | — |
