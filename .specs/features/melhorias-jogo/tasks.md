# Melhorias do Jogo — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/melhorias-jogo/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerada a partir do codebase, das diretrizes do projeto e do spec — confirmar antes do Execute. **Guidelines found: none** — o repo não tem `AGENTS.md`, `CONTRIBUTING.md`, config de cobertura nem CI (`.github/` inexistente). Defaults fortes aplicados, com **uma exceção declarada**: não existe infraestrutura de teste de componente React (sem `jsdom`, sem `@testing-library`), e adicioná-la está fora do escopo desta feature. As ACs de interface (TIME-02, TIME-06 e a exibição de TIME-04) ficam no build gate + UAT manual, e isso está registrado como limite de verificação, não como cobertura.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Catálogo / domínio (`server/wordlist.ts`) | unit | Todas as branches; 1:1 com as ACs WORD-01..06; todo edge case listado do sorteio | `tests/*.test.ts` | `npm test` |
| Utilitário compartilhado (`shared/time.ts`) | unit | 1:1 com TIME-08 mais os limites (0, negativo, `NaN`, virada de minuto e de hora) | `tests/*.test.ts` | `npm test` |
| Orquestração de sala (`server/game.ts`) | integration | Todas as ACs POOL-01..07 e TIME-01/03/04/05/07 via socket real: happy path + esgotamento + rodada abortada + reconexão | `tests/*.integration.test.ts` | `npm test` |
| Contrato de tipos (`shared/protocol.ts`) | none | — (build gate) | — | `npm run build` |
| Interface React (`src/App.tsx`, `src/styles.css`) | none | — (build gate + UAT manual; ver exceção acima) | — | `npm run build` |

## Gate Check Commands

> Geradas a partir do `package.json` — confirmar antes do Execute. O runner é o `vitest` sem projetos separados, então unit e integration rodam no mesmo comando: `quick` e `full` são o mesmo `npm test`, e a distinção fica no que a task precisa provar. O projeto não tem script de lint; o papel de linter é do `typecheck`, que já está dentro do `build`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tasks com testes unitários | `npm test` |
| Full | Depois de tasks com testes de integração | `npm test` |
| Build | Fim de fase, e tasks de contrato ou de interface | `npm run build && npm test` |

---

## Execution Plan

As fases são ordenadas e rodam em sequência — cada fase termina antes da próxima começar, e as tasks dentro de uma fase rodam em ordem. Dependência entre fases é implícita na ordem; o campo `Depends on` registra apenas o encadeamento **dentro** da fase.

### Phase 1: Fundação (contrato e formatação)

Duas tasks independentes entre si; nenhuma depende da outra.

```
T1
T2
```

### Phase 2: Catálogo em PT-BR

Tradução do catálogo em duas fatias, na mesma ordem do arquivo.

```
T3 → T4
```

### Phase 3: Pool sem repetição

```
T5 → T6 → T7
```

### Phase 4: Tempo no servidor

```
T8 → T9
```

### Phase 5: Tempo na interface

```
T10 → T11 → T12 → T13
```

---

## Task Breakdown

### T1: Criar `formatDuration` em `shared/time.ts`

**What**: Função pura que formata duração em ms como `mm:ss`, ou `h:mm:ss` a partir de 1 hora, com entrada inválida virando `00:00`.
**Where**: `shared/time.ts`
**Depends on**: None
**Reuses**: Nada — primeiro módulo em `shared/` além do protocolo.
**Requirement**: TIME-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `formatDuration(ms: number): string` exportada, sem dependências
- [x] `mm:ss` abaixo de 3.600.000 ms; `h:mm:ss` a partir daí
- [x] Negativo, `NaN` e `Infinity` retornam `00:00`
- [x] `tests/time.test.ts` cobre: 0, 1s, 59s, 60s, 3.599.999 ms, 3.600.000 ms, negativo, `NaN`
- [x] Gate check passa: `npm test`
- [x] Test count: 2 arquivos de teste existentes continuam passando + 1 novo arquivo

**Tests**: unit
**Gate**: quick

**Commit**: `feat(time): add formatDuration helper for round timers`

---

### T2: Estender o contrato do protocolo com tempo e aviso de sala

**What**: Adicionar `roundStartedAt`/`serverNow` a `RoomView`, `solveMs` a `PlayerView`, `solveMs` a `PlayerSolvedPayload` e ao `ranking` de `RoundFinishedPayload`, e o evento `room:notice` com `RoomNoticePayload`.
**Where**: `shared/protocol.ts`
**Depends on**: None
**Reuses**: Interfaces existentes `RoomView`, `PlayerView`, `RoundFinishedPayload`, `ServerToClientEvents`.
**Requirement**: TIME-01, TIME-04, TIME-05, POOL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Campos novos declarados exatamente como no design (`Data Models`)
- [x] `'room:notice'` adicionado a `ServerToClientEvents`
- [x] Gate check passa: `npm run build && npm test` (o build falha de propósito até T8/T9 preencherem os campos — nesta task o critério é o `tsc` apontar **somente** os pontos de preenchimento previstos em `server/game.ts`, e nenhum outro) — confirmado: 4 erros, todos em `server/game.ts` (linhas 232, 302, 364, 397), `tsconfig.app.json` limpo
- [x] Test count: suíte existente inalterada (13 testes, 3 arquivos)

**Tests**: none
**Gate**: build

**Commit**: `feat(protocol): add round timing fields and room notice event`

---

### T3: Traduzir para PT-BR as categorias de quadrinhos, animação e anime

**What**: Reescrever em PT-BR os nomes de Marvel, DC, Disney e Pixar, Animação e Anime e mangá, e criar o mapa exportado `englishOriginals` com os originais em inglês desses personagens.
**Where**: `server/wordlist.ts`
**Depends on**: None
**Reuses**: `normalizeText`, `aliasesByName`, montagem de `seeds`, guard `MIN_CURATED_CHARACTERS`.
**Requirement**: WORD-01, WORD-02, WORD-03, WORD-04, WORD-06

**Tools**:

- MCP: NONE
- Skill: NONE
- Pesquisa: Wikipédia PT (`pt.wikipedia.org`) para toda forma brasileira que eu não souber com certeza — verificar antes de escrever, nunca pela memória

**Done when**:

- [x] Nomes dessas 5 categorias em PT-BR conforme AD-001 (traduz o que tem forma consagrada, mantém o que no Brasil já é o original)
- [x] `englishOriginals` exportado, registrando **só** os pares em que a forma brasileira difere do original
- [x] Aliases fundem `aliasesByName` + `englishOriginals`, sem duplicata
- [x] `tests/wordlist.test.ts` reescrito: nenhum valor de `englishOriginals` aparece como nome exibido; palpite em inglês acerta; palpite sem acento acerta; `seeds.length === characters.length` (guarda contra colisão silenciosa de tradução) — exposto via `totalSeedCount` já que `seeds` não é exportado
- [x] Gate check passa: `npm test`
- [x] Test count: 7 testes passando em `tests/wordlist.test.ts` (≥ 6)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(wordlist): translate comics, animation and anime names to pt-BR`

---

### T4: Traduzir para PT-BR as categorias restantes

**What**: Reescrever em PT-BR os nomes de Videogames, Fantasia e ficção científica, Cinema, Séries, Ficção brasileira, Música, Esportes, História/ciência/cultura e Literatura e mitologia, estendendo `englishOriginals`.
**Where**: `server/wordlist.ts`
**Depends on**: T3
**Reuses**: `englishOriginals` e a suíte de testes criados em T3.
**Requirement**: WORD-01, WORD-02, WORD-03, WORD-04, WORD-05, WORD-06

**Tools**:

- MCP: NONE
- Skill: NONE
- Pesquisa: Wikipédia PT para as formas brasileiras incertas (nomes de tradução literária são o caso mais arriscado: Tolkien, Narnia, Harry Potter, Dickens)

**Done when**:

- [x] Nomes das 9 categorias restantes em PT-BR conforme AD-001
- [x] Pessoas reais mantêm o nome próprio, corrigindo só acentuação quando o PT-BR exige (Napoleão Bonaparte, Cleópatra; demais mantidos)
- [x] Catálogo continua com ≥ 250 entradas, `id` único e nome normalizado único
- [x] Nenhum valor de `englishOriginals` aparece como nome exibido (teste de T3 cobre o catálogo inteiro)
- [x] Gate check passa: `npm test`
- [x] Test count: 9 testes passando em `tests/wordlist.test.ts` (≥ 6)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(wordlist): translate remaining catalog categories to pt-BR`

---

### T5: Aceitar exclusão de ids em `pickCharacters`

**What**: Adicionar o parâmetro opcional `excludeIds` a `pickCharacters`, sorteando apenas entre os personagens fora do conjunto e nunca retornando mais que o disponível.
**Where**: `server/wordlist.ts`
**Depends on**: None
**Reuses**: Embaralhamento Fisher-Yates já existente na função.
**Requirement**: POOL-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pickCharacters(amount: number, excludeIds?: ReadonlySet<string>): Character[]`
- [x] Chamada sem o segundo argumento mantém o comportamento atual
- [x] Nenhum id excluído aparece no resultado
- [x] `amount` maior que o disponível retorna o disponível inteiro, sem repetir entrada
- [x] Gate check passa: `npm test`
- [x] Test count: 12 testes passando em `tests/wordlist.test.ts` (≥ 9)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(wordlist): let pickCharacters exclude already used ids`

---

### T6: Registrar personagens usados por sala

**What**: Adicionar `usedCharacterIds` ao `RoomState`, fazer `startRound` sortear excluindo os usados e marcar os sorteados, preservando o conjunto em `playAgain` e `resetAfterDeparture`.
**Where**: `server/game.ts`
**Depends on**: T5
**Reuses**: `pickCharacters` de T5, `touch`, ciclo de vida da sala em `createRoom`/`leave`/`cleanupRooms`.
**Requirement**: POOL-01, POOL-02, POOL-03, POOL-06, POOL-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `usedCharacterIds: Set<string>` inicializado vazio na criação da sala
- [x] `startRound` sorteia com `excludeIds` e adiciona os sorteados ao conjunto
- [x] `playAgain` e `resetAfterDeparture` **não** limpam o conjunto (nenhuma das duas funções toca no campo; teste de POOL-06 comprova para o caso de saída)
- [x] Conjunto descartado junto com a sala (`rooms.delete`) sem estado global residual — garantido estruturalmente: o `Set` vive no próprio `RoomState`, não há registro global paralelo (sem teste dedicado; não exigido pelo Done-when)
- [x] Teste de integração: 3 rodadas seguidas com 2 jogadores produzem 6 personagens distintos
- [x] Teste de integração: duas salas distintas podem receber o mesmo personagem
- [x] Gate check passa: `npm test`
- [x] Test count: 5 testes passando em `tests/game.integration.test.ts` (≥ 4)

**Tests**: integration
**Gate**: full

**Commit**: `feat(game): never repeat a character within the same room`

---

### T7: Reciclar o catálogo ao esgotar e avisar a sala

**What**: Quando os disponíveis forem menos que os jogadores, limpar `usedCharacterIds` antes do sorteio e emitir `room:notice` com `CATALOG_RECYCLED` para a sala.
**Where**: `server/game.ts`
**Depends on**: T6
**Reuses**: `usedCharacterIds` de T6, `RoomNoticePayload` de T2, `io.to(room.code).emit` já usado em `player:solved`.
**Requirement**: POOL-04, POOL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Reciclagem acontece **antes** do sorteio, então a rodada nunca começa com jogador sem personagem
- [ ] `room:notice` emitido com `code: 'CATALOG_RECYCLED'` e a mensagem exata do spec (POOL-05)
- [ ] Aviso emitido só na rodada em que a reciclagem ocorre
- [ ] Teste de integração: com o conjunto de usados pré-carregado até o esgotamento, a rodada inicia, todos recebem personagem e o `room:notice` chega
- [ ] Gate check passa: `npm test`
- [ ] Test count: ≥ 5 testes passando em `tests/game.integration.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(game): recycle catalog and notify room when characters run out`

---

### T8: Registrar os instantes da rodada e do acerto

**What**: Gravar `roundStartedAt` no `RoomState` em `startRound`, `solvedAt` no `PlayerState` no acerto, e zerar os dois em `playAgain` e `resetAfterDeparture`.
**Where**: `server/game.ts`
**Depends on**: None
**Reuses**: `guess`, `startRound`, `playAgain`, `resetAfterDeparture`, `touch`.
**Requirement**: TIME-01, TIME-03, TIME-07, TIME-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `roundStartedAt: number | null` gravado com `Date.now()` no início da rodada, `null` no lobby
- [ ] `solvedAt: number | null` gravado no acerto, `null` para quem não acertou
- [ ] `playAgain` e `resetAfterDeparture` zeram ambos
- [ ] Nenhum timer, `setTimeout` ou limite encerra rodada por tempo (TIME-09)
- [ ] Teste de integração: acerto após intervalo conhecido registra duração ≥ o intervalo
- [ ] Gate check passa: `npm test`
- [ ] Test count: ≥ 6 testes passando em `tests/game.integration.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(game): record round start and solve timestamps`

---

### T9: Expor tempo no estado enviado a cada socket

**What**: Preencher `roundStartedAt`, `serverNow` e `solveMs` em `viewRoom`, e incluir `solveMs` em `player:solved` e no `ranking` de `round:finished`.
**Where**: `server/game.ts`
**Depends on**: T8
**Reuses**: `viewRoom` (única porta de saída de estado), `finishRound`, `resumeFromHandshake`.
**Requirement**: TIME-04, TIME-05, TIME-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `viewRoom` devolve `roundStartedAt`, `serverNow: Date.now()` e `solveMs` por jogador
- [ ] `solveMs` derivado de `solvedAt - roundStartedAt`, nunca armazenado
- [ ] `ranking` de `round:finished` e `player:solved` carregam `solveMs`
- [ ] O privacy check existente continua passando: o personagem do próprio jogador não aparece no payload dele durante a rodada
- [ ] Teste de integração: reconexão no meio da rodada devolve `roundStartedAt` igual ao da rodada em curso
- [ ] Gate check passa: `npm run build && npm test`
- [ ] Test count: ≥ 7 testes passando em `tests/game.integration.test.ts`

**Tests**: integration
**Gate**: build

**Commit**: `feat(game): expose round timing to each socket view`

---

### T10: Exibir o cronômetro da rodada

**What**: Hook local `useRoundClock` que sincroniza a defasagem com o servidor e tica a cada segundo enquanto a rodada corre, exibindo o tempo no cabeçalho da tela de jogo.
**Where**: `src/App.tsx`
**Depends on**: None
**Reuses**: `formatDuration` de T1, `RoomHeader`, `solve-meter`.
**Requirement**: TIME-02, TIME-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `offset` recalculado a cada `RoomView` recebido (`serverNow - Date.now()`)
- [ ] Intervalo de 1s ativo **somente** com `phase === 'playing'`, e limpo no unmount
- [ ] Cronômetro exibido em `mm:ss`, sem exibir nada no lobby
- [ ] Foco e cursor do campo de palpite preservados durante o tick
- [ ] Gate check passa: `npm run build && npm test`
- [ ] Test count: suíte inalterada (camada sem teste automatizado, ver matriz)

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): show live round timer`

---

### T11: Exibir a duração de cada acerto no placar

**What**: Mostrar o tempo de acerto ao lado de cada nome no placar final, com `—` para quem não acertou.
**Where**: `src/App.tsx`
**Depends on**: T10
**Reuses**: `formatDuration`, estrutura `ranking-row` e `finalRanking` já existentes.
**Requirement**: TIME-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cada linha do placar mostra a duração formatada
- [ ] `solveMs` nulo exibe `—`
- [ ] Ordem do placar continua a de resolução (que já é a ordem de tempo)
- [ ] Gate check passa: `npm run build && npm test`
- [ ] Test count: suíte inalterada

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): show per-player solve time in the round scoreboard`

---

### T12: Exibir o aviso de catálogo reciclado

**What**: Ouvir `room:notice` e exibir a mensagem com o componente de aviso existente, sem tratá-la como erro.
**Where**: `src/App.tsx`
**Depends on**: T11
**Reuses**: `InlineNotice`, padrão de registro/desregistro de listeners do `useEffect` existente.
**Requirement**: POOL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Listener de `room:notice` registrado e removido junto com os demais
- [ ] Mensagem exibida como aviso neutro, sem acionar o fluxo de erro nem limpar a sessão
- [ ] Aviso não persiste na rodada seguinte
- [ ] Gate check passa: `npm run build && npm test`
- [ ] Test count: suíte inalterada

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): surface catalog recycled notice`

---

### T13: Estilizar cronômetro e coluna de tempo

**What**: Estilos do cronômetro no cabeçalho e da duração no placar, seguindo as variáveis e o vocabulário visual já usados no arquivo.
**Where**: `src/styles.css`
**Depends on**: T12
**Reuses**: Tokens e classes existentes (`micro-label`, `panel-mark`, `ranking-row`).
**Requirement**: TIME-02, TIME-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cronômetro legível no cabeçalho, com largura estável para não "pular" a cada segundo (fonte tabular)
- [ ] Coluna de tempo alinhada no placar, sem quebrar o layout em tela estreita
- [ ] Nenhuma classe existente redefinida com efeito colateral fora do escopo
- [ ] Gate check passa: `npm run build && npm test`
- [ ] Test count: suíte inalterada

**Tests**: none
**Gate**: build

**Commit**: `style(ui): style round timer and solve time column`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
```

```
Fase 1:  T1    T2
Fase 2:  T3 → T4
Fase 3:  T5 → T6 → T7
Fase 4:  T8 → T9
Fase 5:  T10 → T11 → T12 → T13
```

Execução estritamente sequencial: uma task por vez, em ordem, com um commit atômico por task.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: `formatDuration` | 1 função, 1 arquivo novo | ✅ Granular |
| T2: campos do protocolo | 1 arquivo, só declarações | ✅ Granular |
| T3: traduzir 5 categorias | 1 arquivo, 1 fatia coesa | ✅ Granular |
| T4: traduzir 9 categorias | 1 arquivo, fatia restante | ✅ Granular |
| T5: `excludeIds` | 1 função | ✅ Granular |
| T6: `usedCharacterIds` | 1 arquivo, 1 conceito (pool da sala) | ✅ Granular |
| T7: reciclagem + aviso | 1 arquivo, 1 caminho de exceção | ✅ Granular |
| T8: instantes | 1 arquivo, 1 conceito (registro de tempo) | ✅ Granular |
| T9: expor tempo | 1 arquivo, 1 função de saída | ✅ Granular |
| T10: cronômetro | 1 arquivo, 1 hook + 1 ponto de exibição | ✅ Granular |
| T11: tempo no placar | 1 arquivo, 1 ponto de exibição | ✅ Granular |
| T12: aviso | 1 arquivo, 1 listener | ✅ Granular |
| T13: estilos | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | sem seta de entrada | ✅ Match |
| T2 | None | sem seta de entrada | ✅ Match |
| T3 | None | sem seta de entrada | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | None | sem seta de entrada | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | None | sem seta de entrada | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | None | sem seta de entrada | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |

Nenhuma dependência aponta para fase posterior. A dependência de T7 em `RoomNoticePayload` (T2) e de T10 em `formatDuration` (T1) é satisfeita pela ordem das fases, não por `Depends on` — a Fase 1 termina antes da Fase 3 e da Fase 5.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | -------------------------- | --------------- | --------- | ------ |
| T1 | Utilitário compartilhado | unit | unit | ✅ OK |
| T2 | Contrato de tipos | none | none | ✅ OK |
| T3 | Catálogo / domínio | unit | unit | ✅ OK |
| T4 | Catálogo / domínio | unit | unit | ✅ OK |
| T5 | Catálogo / domínio | unit | unit | ✅ OK |
| T6 | Orquestração de sala | integration | integration | ✅ OK |
| T7 | Orquestração de sala | integration | integration | ✅ OK |
| T8 | Orquestração de sala | integration | integration | ✅ OK |
| T9 | Orquestração de sala | integration | integration | ✅ OK |
| T10 | Interface React | none | none | ✅ OK |
| T11 | Interface React | none | none | ✅ OK |
| T12 | Interface React | none | none | ✅ OK |
| T13 | Interface React | none | none | ✅ OK |

Os quatro `Tests: none` são legítimos pela matriz: T2 é contrato de tipos (build gate) e T10–T13 são interface React, camada sem infraestrutura de teste de componente no projeto. **Não é diferimento de teste** — nenhuma outra task assume a cobertura dessas; elas simplesmente não têm cobertura automatizada, e isso está declarado como limite de verificação na provenance da matriz.

---

## Requirement Coverage

| Requirement | Task(s) |
| ----------- | ------- |
| WORD-01, WORD-02, WORD-03, WORD-04 | T3, T4 |
| WORD-05 | T4 |
| WORD-06 | T3, T4 |
| POOL-01 | T5, T6 |
| POOL-02, POOL-03, POOL-06, POOL-07 | T6 |
| POOL-04, POOL-05 | T2, T7, T12 |
| TIME-01, TIME-03, TIME-07, TIME-09 | T8 |
| TIME-02 | T10, T13 |
| TIME-04 | T2, T9, T11, T13 |
| TIME-05 | T2, T9 |
| TIME-06 | T9, T10 |
| TIME-08 | T1 |

**Coverage**: 22 requisitos, 22 mapeados para tasks, 0 sem mapeamento.
