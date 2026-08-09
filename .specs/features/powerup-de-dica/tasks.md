# Power-up de Dica — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/powerup-de-dica/spec.md`
**Status**: Approved

---

## Decisão estrutural (vale para todas as tasks)

**A concessão de power-ups é derivada, nunca agendada.** `tests/game.integration.test.ts` tem uma guarda estrutural (TIME-09) que assere que o único agendador de `server/game.ts` é `setInterval(() => this.cleanupRooms(), 60_000)`. Um `setTimeout` ou `setInterval` para liberar power-ups quebraria essa guarda — e com razão: agendador que mexe em rodada é exatamente o que ela existe para impedir.

O desenho, portanto:

- Uma função pura em `shared/hints.ts` responde "quantos power-ups este jogador já ganhou" a partir do tempo decorrido.
- O servidor guarda apenas quantos foram **usados** (`hintsUsed`), e calcula o disponível no momento em que autoriza o pedido.
- O cliente importa a mesma função para **exibir** a contagem, derivando o tempo de `roundStartedAt` + `serverNow` como já faz `useRoundClock` (AD-003). Exibição é derivada; autorização é do servidor.
- O tempo decorrido de quem já acertou congela em `solvedAt`, o que faz HINT-04 cair de graça: quem acertou para de acumular sem precisar de nenhum código de parada.

Por isso a função vai em `shared/`, e não em `server/`: é o mesmo cálculo dos dois lados, e duplicá-lo criaria duas verdades sobre quando o power-up aparece.

---

## Test Coverage Matrix

> Gerada a partir do codebase e da spec. Guidelines encontradas: nenhuma. Defaults fortes aplicados, limitados pela decisão registrada de não introduzir infraestrutura de teste de front.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura compartilhada (`shared/hints.ts`) | unit | Todos os ramos; 1:1 com HINT-01 e HINT-03; todo limite listado (antes dos 30min, cada marco, teto de 3) tem teste dedicado | `tests/hints.test.ts` | `npm test` |
| Estado e eventos do servidor (`server/game.ts`, `shared/protocol.ts`) | integration | Todo AC de servidor (HINT-01, 03..05, 07, 10..23): caminho feliz, toda recusa e todo edge case listado, por socket real | `tests/game.integration.test.ts` | `npm test` |
| Componente React (`src/App.tsx`) | none | Build gate apenas — sem `jsdom` nem testing-library; HINT-06, 08, 09 verificados por UAT interativo | — | build gate |
| Estilos (`src/styles.css`) | none | Build gate apenas | — | build gate |

**Como testar os 30 minutos sem esperar 30 minutos:** `tests/game.integration.test.ts` já acessa estado interno da sala por cast (`getInternalRoomTiming`, `getInternalRoomScoring`, `getInternalRoomPhase`). O mesmo caminho permite recuar `roundStartedAt` da sala em 31, 41 ou 51 minutos e disparar o evento em seguida. **Não** use `vi.useFakeTimers` global: a suíte sobe um Socket.IO real e congelar o relógio do processo quebra os timeouts de rede.

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tasks com testes unitários | `npm test` |
| Full | Depois de tasks com testes de integração | `npm test` |
| Build | Última task de uma fase, ou tasks sem testes | `npm run typecheck && npm test` |

---

## Execution Plan

### Phase 1: Núcleo e contrato

```
T1 → T2 → T3
```

### Phase 2: Pedido, resposta e cancelamentos

```
T3 → T4 → T5 → T6
```

### Phase 3: Interface

```
T6 → T7 → T8 → T9 → T10 → T11
```

---

## Task Breakdown

### T1: Função pura de concessão por tempo

**What**: Criar `shared/hints.ts` exportando `HINT_UNLOCK_MS` (30, 40 e 50 minutos), `MAX_HINT_POWERUPS = 3`, `earnedHintPowerups(elapsedMs)` e `availableHintPowerups(elapsedMs, used)`, mais os testes de cada marco e limite.
**Where**: `shared/hints.ts`
**Depends on**: None
**Reuses**: o estilo de módulo puro compartilhado de `shared/time.ts`
**Requirement**: HINT-01, HINT-03, HINT-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `earnedHintPowerups` devolve 0 antes de 30min, 1 aos 30min, 2 aos 40min e 3 aos 50min (HINT-01)
- [ ] O valor exato do marco já concede: 30min cravados devolvem 1, não 0
- [ ] `earnedHintPowerups` nunca passa de 3, mesmo com tempo muito maior (HINT-03)
- [ ] `availableHintPowerups(elapsed, used)` devolve o ganho menos o usado, nunca negativo (HINT-23)
- [ ] Gate check passa: `npm test`
- [ ] Test count: 7 testes passam em `tests/hints.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(hints): add time-derived hint powerup grants`

---

### T2: Expor power-up e pedido no contrato

**What**: Em `shared/protocol.ts`, adicionar a `PlayerView` os campos `hintsUsed: number` e `hintRequestTargetId: string | null`, mais os tipos de entrada e os eventos `hint:request` (`{ targetId }`), `hint:answer` (`{ askerId }`) e `hint:cancel` (sem payload).
**Where**: `shared/protocol.ts`
**Depends on**: T1
**Reuses**: o padrão de `RemoveAbsentInput` e dos eventos sem payload já existentes
**Requirement**: HINT-07, HINT-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `PlayerView.hintsUsed` e `PlayerView.hintRequestTargetId` declarados
- [ ] Os três eventos declarados em `ClientToServerEvents` com seus payloads
- [ ] Comentário explicando por que o contrato expõe `hintsUsed` e não o disponível: o disponível depende do relógio e é derivado dos dois lados por `shared/hints.ts`
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte existente continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(hints): expose hint powerup state in the shared protocol`

---

### T3: Estado de dica na sala

**What**: Em `server/game.ts`, adicionar `hintsUsed` e `hintRequestTargetId` a `PlayerState`, zerá-los em `startRound`, `playAgain` e `resetAfterDeparture`, e refleti-los em `viewRoom` — com os testes de integração de inicialização e reset.
**Where**: `server/game.ts`
**Depends on**: T2
**Reuses**: os laços de reset que já zeram `solved`, `rank` e `roundPoints`
**Requirement**: HINT-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Jogador novo aparece no `RoomView` com `hintsUsed` 0 e `hintRequestTargetId` nulo
- [ ] Uma rodada nova zera `hintsUsed` e `hintRequestTargetId` de todos (HINT-05)
- [ ] Gate check passa: `npm test`
- [ ] Test count: testes existentes + 3 novos passam

**Tests**: integration
**Gate**: full

**Commit**: `feat(hints): track hint powerup state in the room`

---

### T4: Handler do pedido de dica com as recusas

**What**: Implementar em `server/game.ts` o handler de `hint:request`: consumir um power-up e registrar o alvo no caminho válido, e recusar com `NO_SOLVER_YET`, `INVALID_HINT_TARGET`, `NO_HINT_AVAILABLE`, `ALREADY_SOLVED`, `HINT_ALREADY_PENDING` e `ROUND_NOT_RUNNING` nos demais — com os testes de integração de cada caminho.
**Where**: `server/game.ts`
**Depends on**: T3
**Reuses**: o molde de guard + `sendError` de `endEarly` e `removeAbsent`; `availableHintPowerups` de T1
**Requirement**: HINT-07, HINT-13, HINT-14, HINT-15, HINT-16, HINT-17, HINT-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com um solucionador na sala e power-up disponível, o pedido registra o alvo e incrementa `hintsUsed` (HINT-07)
- [ ] Sem ninguém resolvido na rodada: `NO_SOLVER_YET`, `hintsUsed` inalterado (HINT-13)
- [ ] Alvo que não acertou: `INVALID_HINT_TARGET`, `hintsUsed` inalterado (HINT-14)
- [ ] Antes dos 30 minutos: `NO_HINT_AVAILABLE` (HINT-15)
- [ ] Quem já acertou pedindo: `ALREADY_SOLVED` (HINT-16)
- [ ] Segundo pedido com um pendente: `HINT_ALREADY_PENDING` (HINT-17)
- [ ] Fora da fase `playing`: `ROUND_NOT_RUNNING` (HINT-18)
- [ ] Gate check passa: `npm test`
- [ ] Test count: testes de T3 + 7 novos passam

**Tests**: integration
**Gate**: full

**Commit**: `feat(hints): let a stuck player request a hint from a solver`

---

### T5: Resposta e cancelamento do pedido

**What**: Implementar em `server/game.ts` os handlers de `hint:answer` (só o alvo encerra o pedido) e `hint:cancel` (quem pediu encerra e recupera o power-up), com a recusa `NOT_HINT_TARGET` — mais os testes de integração.
**Where**: `server/game.ts`
**Depends on**: T4
**Reuses**: o handler de T4 como molde
**Requirement**: HINT-10, HINT-11, HINT-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O alvo marcando que respondeu limpa `hintRequestTargetId` de quem pediu (HINT-10)
- [ ] O power-up **não** volta quando o alvo responde — foi gasto (HINT-10)
- [ ] Quem pediu cancelando limpa o pedido e devolve o power-up: `hintsUsed` volta ao valor anterior (HINT-11)
- [ ] Quem não é o alvo tentando responder: `NOT_HINT_TARGET` e o pedido segue pendente (HINT-19)
- [ ] Gate check passa: `npm test`
- [ ] Test count: testes de T4 + 4 novos passam

**Tests**: integration
**Gate**: full

**Commit**: `feat(hints): resolve a hint request by answer or cancel`

---

### T6: Cancelamentos automáticos do pedido

**What**: Em `server/game.ts`, cancelar o pedido pendente devolvendo o power-up quando o alvo cai ou sai da sala, e cancelar sem devolver quando quem pediu acerta — mais os testes de integração e o teste de que o placar não é afetado por nada disso.
**Where**: `server/game.ts`
**Depends on**: T5
**Reuses**: os handlers `disconnect` e `leave` já existentes
**Requirement**: HINT-12, HINT-20, HINT-21, HINT-22, HINT-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Queda do alvo cancela o pedido e devolve o power-up (HINT-20)
- [ ] Saída do alvo pelo botão cancela o pedido e devolve o power-up (HINT-21)
- [ ] Quem pediu acertando cancela o pedido sem devolver o power-up (HINT-22)
- [ ] `hintsUsed` nunca fica negativo em nenhum desses caminhos (HINT-23)
- [ ] `score` e `roundPoints` ficam idênticos com e sem uso de power-up ao longo de uma rodada completa (HINT-12)
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: testes de T5 + 5 novos passam

**Tests**: integration
**Gate**: build

**Commit**: `feat(hints): cancel pending hint requests on departure or solve`

---

### T7: Power-up visível na tela da partida

**What**: Em `src/App.tsx`, exibir o power-up de dica com a quantidade disponível, derivada por `availableHintPowerups` a partir do relógio do servidor, só para quem ainda não acertou e só quando há ao menos um disponível.
**Where**: `src/App.tsx`
**Depends on**: T6
**Reuses**: `useRoundClock` (`src/App.tsx:448`), que já entrega o tempo decorrido pelo relógio do servidor
**Requirement**: HINT-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O power-up aparece com a contagem quando o disponível é maior que zero (HINT-06)
- [ ] Não aparece antes dos 30 minutos nem para quem já acertou
- [ ] A contagem atualiza sozinha ao cruzar 40 e 50 minutos, sem recarregar a página
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(hints): show the hint powerup on the playing screen`

---

### T8: Escolha do alvo e envio do pedido

**What**: Em `src/App.tsx`, ao acionar o power-up, apresentar os jogadores que já acertaram como alvos possíveis e emitir `hint:request` com o escolhido.
**Where**: `src/App.tsx`
**Depends on**: T7
**Reuses**: a lista `room.players` e o padrão de emissão dos outros comandos do componente
**Requirement**: HINT-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Só jogadores com `solved` aparecem como alvo possível
- [ ] Escolher um alvo emite `hint:request` com o `playerId` dele
- [ ] Com ninguém resolvido, a escolha comunica que ainda não há de quem pedir, em vez de oferecer lista vazia
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(hints): pick which solver to ask for a hint`

---

### T9: Destaque do card de quem pediu

**What**: Em `src/App.tsx`, destacar visualmente o card do jogador com pedido pendente, para todos os jogadores da sala, deixando claro que ele está pedindo uma dica.
**Where**: `src/App.tsx`
**Depends on**: T8
**Reuses**: `CharacterCard`, que já aplica classes condicionais como `character-solved`
**Requirement**: HINT-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O card de quem tem `hintRequestTargetId` não nulo recebe o destaque, para todos (HINT-08)
- [ ] O destaque some quando o pedido é encerrado
- [ ] O destaque não revela nem sugere o personagem de ninguém
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(hints): highlight the card of a player asking for a hint`

---

### T10: Comando de responder para o alvo

**What**: Em `src/App.tsx`, exibir a quem foi escolhido como alvo um comando de marcar que respondeu, emitindo `hint:answer` com o id de quem pediu, e a quem pediu um comando de cancelar, emitindo `hint:cancel`.
**Where**: `src/App.tsx`
**Depends on**: T9
**Reuses**: o padrão de comando condicional já usado no controle de encerrar rodada
**Requirement**: HINT-09, HINT-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Só o alvo vê o comando de responder, e ele nomeia quem está pedindo (HINT-09)
- [ ] Quem pediu vê o comando de cancelar enquanto o pedido está pendente (HINT-11)
- [ ] Nenhum dos dois comandos aparece para quem não é parte do pedido
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(hints): add the answer and cancel controls for a hint request`

---

### T11: Estilos do power-up e do destaque

**What**: Adicionar a `src/styles.css` as regras do power-up, da escolha de alvo, do destaque do card e dos comandos de responder e cancelar, usando só tokens já existentes.
**Where**: `src/styles.css`
**Depends on**: T10
**Reuses**: os tokens e o vocabulário de classes já definidos no arquivo
**Requirement**: HINT-06, HINT-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Tudo legível em viewport de 360px de largura
- [ ] Nenhum token de cor novo inventado
- [ ] O destaque do card é distinguível do estado `character-solved`, que já existe
- [ ] O power-up não cobre o campo de palpite nem o botão flutuante do bloco de notas
- [ ] Gate check passa: `npm run typecheck && npm test`
- [ ] Test count: suíte inteira continua passando

**Tests**: none
**Gate**: build

**Commit**: `style(hints): style the hint powerup and request highlight`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T3 ------→ T4 ------→ T5 ------→ T6
Phase 3:  T6 ------→ T7 ------→ T8 ------→ T9 ------→ T10 ------→ T11
```

**Packing em batches:** Phase 1 + Phase 2 = 7 tasks (batch 1, núcleo e servidor, tudo provado por teste); Phase 3 = 5 tasks (batch 2, interface, verificada por UAT). Dois workers sequenciais, corte numa fronteira de fase real.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Função pura | 1 módulo, 2 funções coesas | ✅ Granular |
| T2: Contrato | 1 arquivo, 2 campos + 3 eventos | ✅ Granular |
| T3: Estado | 1 arquivo, 2 campos + resets | ✅ Granular |
| T4: Pedido | 1 arquivo, 1 handler | ✅ Granular |
| T5: Resposta e cancelamento | 1 arquivo, 2 handlers irmãos | ✅ Granular |
| T6: Cancelamentos automáticos | 1 arquivo, 3 caminhos coesos | ✅ Granular |
| T7: Power-up visível | 1 arquivo, 1 superfície | ✅ Granular |
| T8: Escolha de alvo | 1 arquivo, 1 interação | ✅ Granular |
| T9: Destaque | 1 arquivo, 1 estado visual | ✅ Granular |
| T10: Responder e cancelar | 1 arquivo, 2 comandos irmãos | ✅ Granular |
| T11: Estilos | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — (raiz da Phase 1) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Lógica pura compartilhada | unit | unit | ✅ OK |
| T2 | Contrato compartilhado (só tipos) | none | none | ✅ OK |
| T3 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T4 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T5 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T6 | Estado e eventos do servidor | integration | integration | ✅ OK |
| T7 | Componente React | none | none | ✅ OK |
| T8 | Componente React | none | none | ✅ OK |
| T9 | Componente React | none | none | ✅ OK |
| T10 | Componente React | none | none | ✅ OK |
| T11 | Estilos | none | none | ✅ OK |

`Tests: none` em T2 é válido porque a task só declara tipos — o comportamento é provado nos testes de integração de T3 a T6, que falham se os campos ou eventos não existirem. `Tests: none` em T7..T11 segue a camada `none` da matriz, decisão registrada e confirmada.

---

## Progress

| Task | Status | Commit |
| --- | --- | --- |
| T1 | Done | feat(hints): add time-derived hint powerup grants |
| T2 | Done | feat(hints): expose hint powerup state in the shared protocol |
| T3 | Done | feat(hints): track hint powerup state in the room |
| T4 | Done | feat(hints): let a stuck player request a hint from a solver |
| T5 | Pending | — |
| T6 | Pending | — |
| T7 | Pending | — |
| T8 | Pending | — |
| T9 | Pending | — |
| T10 | Pending | — |
| T11 | Pending | — |
