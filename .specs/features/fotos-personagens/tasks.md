# Fotos dos Personagens — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.**

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/fotos-personagens/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerada do codebase e do spec — confirmar antes do Execute. **Guidelines found: none** (sem `AGENTS.md`, `CONTRIBUTING.md`, config de cobertura ou CI). Defaults fortes aplicados, com a mesma exceção declarada da feature anterior: não há infraestrutura de teste de componente React (sem `jsdom`, sem `@testing-library`), então CARD-01..04 ficam no build gate + conferência manual.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Catálogo de imagens (`server/character-images.ts`, `server/wordlist.ts`) | unit | 1:1 com IMG-01..06; toda entrada casa com personagem, URL do Commons com largura limitada, autor e licença preenchidos | `tests/*.test.ts` | `npm test` |
| Fronteira de runtime (`server/`, `src/`) | unit | IMG-05: varredura garantindo que nenhum módulo de produção referencia domínio da Wikimedia | `tests/*.test.ts` | `npm test` |
| Orquestração de sala (`server/game.ts`) | integration | PRIV-01..03 via socket real: URL da imagem própria ausente durante a rodada, presente na revelação | `tests/*.integration.test.ts` | `npm test` |
| Script de curadoria (`scripts/*.mjs`) | none | — (dev-only, fora do build e de todo tsconfig) | — | execução manual |
| Interface React (`src/App.tsx`, `src/styles.css`) | none | — (build gate + conferência manual; ver exceção acima) | — | `npm run build` |

## Gate Check Commands

> Geradas do `package.json`. O `vitest` roda unit e integration no mesmo comando, então `quick` e `full` são o mesmo `npm test`; a distinção está no que a task precisa provar.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tasks com testes unitários | `npm test` |
| Full | Depois de tasks com testes de integração | `npm test` |
| Build | Fim de fase, e tasks de contrato ou de interface | `npm run build && npm test` |

---

## Execution Plan

Fases ordenadas, sequenciais. `Depends on` registra só o encadeamento dentro da fase.

### Phase 1: Curadoria

Produz o artefato humano. A revisão visual acontece aqui e é pré-requisito de tudo.

```
T1 → T2 → T3
```

### Phase 2: Catálogo e contrato

```
T4 → T5
```

### Phase 3: Privacidade e interface

```
T6 → T7 → T8
```

---

## Task Breakdown

### T1: Script de resolução de candidatos

**What**: Script dev-only que, para cada personagem, resolve o QID, busca `P18` no Wikidata, pega thumbnail de 320px, autor e licença no Commons, e grava `candidates.json`.
**Where**: `scripts/resolve-character-images.mjs`
**Depends on**: None
**Reuses**: Nomes do catálogo em `server/wordlist.ts`; `fetch` nativo do Node 22.
**Requirement**: IMG-01, IMG-02, IMG-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Resolve os 304 personagens em lote, com `User-Agent` identificando o projeto
- [x] Usa **apenas** Wikidata P18 (Commons), nunca `pageimages` da Wikipédia
- [x] Grava url do thumbnail ≤320px, autor e licença por candidato
- [x] Candidato sem autor declarado é marcado como rejeitado, não gravado em branco
- [x] Script não é importado por nada em `server/` nem `src/` (confirmado: `grep -rn "resolve-character-images" server/ src/` sem ocorrência)
- [x] Gate check passa: `npm test`
- [x] Test count: suíte permanece em 46 (script é dev-only, camada sem teste na matriz)

**Tests**: none
**Gate**: quick

**Commit**: `chore(images): add wikidata image resolution script`

**Execução real**: 304 personagens processados; 286 com QID, 179 com P18, 177 resolvidos com atribuição completa, 2 rejeitados por falta de autor/licença, 125 sem imagem. `TITLE_OVERRIDES` preenchido e verificado (via `list=search` + conferência do QID final) para `Mario`, `Luigi`, `Marta`, `Emília`; `Tom` e `Alice` investigados e deixados sem override — nenhum título de pt.wikipedia resolve para o QID certo do personagem nesses dois casos (ver comentário no script).

---

### T2: Triagem automática dos candidatos

**What**: Filtro por nome de arquivo e categoria do Commons que rejeita o que não representa o personagem — cosplay, estátua de cera, grafite, brinquedo, nose art, balão de parada.
**Where**: `scripts/resolve-character-images.mjs`
**Depends on**: T1
**Reuses**: Saída do T1.
**Requirement**: IMG-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Rejeita padrões conhecidos com motivo registrado por candidato
- [x] Casos medidos na amostra caem na triagem: `FB-111 Bugs Bunny Nose Art`, `Madame Tussauds`, `Cosplay` (confirmado na execução real; `Bushwick Brooklyn Art` não apareceu nesta consulta ao vivo — a amostra do Wikidata muda com o tempo — mas o padrão `graffiti`/`grafite` pegou outro caso real: `Don Ramón Graffiti in Managua.jpg`)
- [x] Emite `contact-sheet.html` com os sobreviventes, para revisão visual
- [x] Relatório final imprime aprovados, rejeitados e o motivo de cada rejeição
- [x] Gate check passa: `npm test`
- [x] Test count: suíte permanece em 46

**Tests**: none
**Gate**: quick

**Commit**: `chore(images): triage candidates that do not depict the character`

**Execução real**: 157 aprovados na triagem, 22 rejeitados (10 cosplay, 2 sem atribuição, 2 statue, 1 tussauds, 1 nose art, 1 parade, 1 comic-con, 1 sculpture, 1 wax, 1 wax museum, 1 graffiti), 125 sem imagem. `contact-sheet.html` com 157 figuras gravado em `.image-candidates/`.

---

### T3: Revisão visual e catálogo curado

**What**: Revisar visualmente os sobreviventes da triagem e escrever `server/character-images.ts` só com os aprovados.
**Where**: `server/character-images.ts`
**Depends on**: T2
**Reuses**: Forma de `englishOriginals` em `server/wordlist.ts`.
**Requirement**: IMG-01, IMG-02, IMG-03

**Tools**:

- MCP: NONE
- Skill: NONE
- Revisão: subagentes que **abrem** as imagens e julgam "um brasileiro reconhece isto?"; ambíguos vão para o usuário no contact sheet

**Done when**:

- [x] Toda entrada aprovada tem `url`, `author` e `license` preenchidos
- [x] Nenhuma entrada aprovada é cosplay, estátua, grafite ou objeto que não represente o personagem
- [x] Rejeitados não entram no arquivo — ausência é o fallback previsto
- [x] Relatório de cobertura por categoria registrado no commit
- [x] Gate check passa: `npm test`
- [x] Test count: suíte permanece em 46

**Tests**: none
**Gate**: quick

**Commit**: `feat(images): add curated free-licensed character image catalog`

**Execução real**: 6 subagentes abriram as 157 sobreviventes da triagem automática e julgaram "um brasileiro reconhece isto?"; 89 aprovadas, 68 rejeitadas. `server/character-images.ts` escrito com as 89 entradas, chave por nome normalizado, ordenado pela mesma ordem de categoria/personagem de `characterSets`. Cobertura por categoria: Música 20/20, Esportes 19/20, História/ciência/cultura 18/20, Fantasia e ficção científica 9/25, Literatura e mitologia 5/20, Séries 5/21, Videogames 3/22, Disney e Pixar 3/30, DC 2/18, Marvel 2/20, Cinema 2/25, Ficção brasileira 1/20, Animação 0/20, Anime e mangá 0/23.

---

### T4: Fundir imagens no catálogo de personagens

**What**: `Character` ganha `image?: CharacterImage`, preenchido na montagem dos seeds a partir de `characterImages`.
**Where**: `server/wordlist.ts`
**Depends on**: None
**Reuses**: `normalizeText`, montagem de `seeds`, guarda `totalSeedCount`.
**Requirement**: IMG-04, IMG-05, IMG-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `Character.image` opcional, ausente para quem não tem imagem aprovada
- [x] Teste: toda chave de `characterImages` casa com um personagem existente (pega rename órfão, IMG-04)
- [x] Teste: toda URL é de `upload.wikimedia.org` e tem largura ≤400 no caminho do thumbnail (IMG-06)
- [x] Teste: toda entrada tem autor e licença não vazios (IMG-03)
- [x] Teste: nenhum arquivo de `server/` ou `src/` referencia domínio da Wikimedia fora de `character-images.ts` (IMG-05)
- [x] Gate check passa: `npm test`
- [x] Test count: ≥ 50 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(wordlist): attach curated images to catalog characters`

**Execução real**: IMG-06 usa 400px (spec corrigido, não 320 — Commons não aceita largura arbitrária). 4 das 89 entradas aprovadas não têm `/thumb/` no caminho: o arquivo original já é menor que o limite pedido (141px-262px, medido via imageinfo em 2026-08-05), então a API devolve o próprio original como thumbnail. O teste trata isso como exceção explícita e nomeada (allowlist de URL), não como brecha silenciosa — qualquer URL nova fora do padrão de thumbnail e fora da lista quebra o teste. 51 testes (46 + 5 novos).

---

### T5: Expor a imagem no contrato

**What**: `CharacterPublic` ganha `image?`, e `viewRoom` passa a incluí-la junto de nome e categoria.
**Where**: `shared/protocol.ts`
**Depends on**: T4
**Reuses**: `CharacterPublic` existente.
**Requirement**: CARD-01, PRIV-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `image?: { url, author, license }` declarado sem importar código de `server/`
- [x] Estrutura espelha `CharacterImage`, sem acoplar as camadas
- [x] Gate check passa: `npm run build && npm test`
- [x] Test count: ≥ 50 testes

**Tests**: none
**Gate**: build

**Commit**: `feat(protocol): expose character image in the public view`

**Execução real**: `npm run build && npm test` passam; 51 testes (inalterado, T5 é contrato de tipos, camada sem teste na matriz).

---

### T6: Blindar a privacidade do campo novo

**What**: Incluir a imagem em `viewRoom` respeitando a regra existente, e provar por teste que a URL da imagem própria não vaza durante a rodada.
**Where**: `server/game.ts`
**Depends on**: None
**Reuses**: `viewRoom` e sua condição de revelação — **não alterar a lógica condicional**.
**Requirement**: PRIV-01, PRIV-02, PRIV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `viewRoom` inclui `image` no mesmo bloco que já monta nome e categoria
- [ ] Condição de revelação inalterada
- [ ] Teste de integração: a URL da imagem do próprio personagem não aparece no payload durante a rodada (PRIV-02)
- [ ] Teste de integração: a imagem aparece para todos após `round:finished` (PRIV-03)
- [ ] O teste de privacidade existente continua passando
- [ ] Gate check passa: `npm test`
- [ ] Test count: ≥ 52 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(game): include character image without leaking the viewer own`

---

### T7: Exibir a foto no card

**What**: `CharacterCard` renderiza a imagem com `onError` caindo para inicial e cor, mantendo nome, categoria e crédito.
**Where**: `src/App.tsx`
**Depends on**: T6
**Reuses**: `CharacterCard`, classes `character-color-*`, tela de revelação.
**Requirement**: CARD-01, CARD-02, CARD-03, CARD-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Imagem exibida quando presente; nome e categoria sempre visíveis
- [ ] `onError` troca para o visual atual, sem espaço vazio
- [ ] Card sem imagem visualmente idêntico ao de hoje
- [ ] Crédito de autor e licença acessível (atributo de acessibilidade ou legenda)
- [ ] `alt` descritivo, nunca a resposta para quem não pode vê-la
- [ ] Gate check passa: `npm run build && npm test`
- [ ] Test count: suíte inalterada (camada sem teste na matriz)

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): show character photo on the card with graceful fallback`

---

### T8: Estilos da foto no card

**What**: Estilos da imagem e do crédito, com recorte sem distorção e sem quebrar o layout em tela estreita.
**Where**: `src/styles.css`
**Depends on**: T7
**Reuses**: Tokens e classes existentes de `character-card`.
**Requirement**: CARD-01, CARD-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `object-fit: cover` — recorta sem distorcer
- [ ] Altura reservada estável, para o card não "pular" quando a imagem carrega
- [ ] Crédito discreto e legível nos dois temas do card
- [ ] Layout íntegro em ~375px de largura
- [ ] Gate check passa: `npm run build && npm test`
- [ ] Test count: suíte inalterada

**Tests**: none
**Gate**: build

**Commit**: `style(ui): style character photo and image credit`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3
```

```
Fase 1:  T1 → T2 → T3
Fase 2:  T4 → T5
Fase 3:  T6 → T7 → T8
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: script de resolução | 1 arquivo novo | ✅ Granular |
| T2: triagem | mesmo arquivo, 1 etapa coesa | ✅ Granular |
| T3: catálogo curado | 1 arquivo | ✅ Granular |
| T4: fundir no catálogo | 1 arquivo | ✅ Granular |
| T5: contrato | 1 arquivo, só declarações | ✅ Granular |
| T6: privacidade | 1 arquivo, 1 função | ✅ Granular |
| T7: card | 1 arquivo, 1 componente | ✅ Granular |
| T8: estilos | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | sem seta de entrada | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | None | sem seta de entrada | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | None | sem seta de entrada | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

Nenhuma dependência aponta para fase posterior. T4 depende do artefato da Fase 1 e T7 do contrato da Fase 2 pela ordem das fases, não por `Depends on`.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | -------------------------- | --------------- | --------- | ------ |
| T1 | Script de curadoria | none | none | ✅ OK |
| T2 | Script de curadoria | none | none | ✅ OK |
| T3 | Script de curadoria (dado curado) | none | none | ✅ OK |
| T4 | Catálogo de imagens + fronteira de runtime | unit | unit | ✅ OK |
| T5 | Contrato de tipos | none | none | ✅ OK |
| T6 | Orquestração de sala | integration | integration | ✅ OK |
| T7 | Interface React | none | none | ✅ OK |
| T8 | Interface React | none | none | ✅ OK |

Os `Tests: none` são legítimos pela matriz: T1–T3 produzem dado curado por script dev-only fora do build, T5 é contrato de tipos, T7–T8 são interface React sem infraestrutura de teste no projeto. **Não é diferimento**: o dado que T1–T3 produzem é validado pelos testes de T4, que é onde ele entra em código de produção.

---

## Requirement Coverage

| Requirement | Task(s) |
| ----------- | ------- |
| IMG-01, IMG-02 | T1, T2, T3 |
| IMG-03 | T3, T4 |
| IMG-04, IMG-05 | T4 |
| IMG-06 | T1, T4 |
| CARD-01 | T5, T7, T8 |
| CARD-02, CARD-03 | T7 |
| CARD-04 | T7, T8 |
| PRIV-01 | T5, T6 |
| PRIV-02, PRIV-03 | T6 |

**Coverage**: 13 requisitos, 13 mapeados, 0 sem mapeamento.
