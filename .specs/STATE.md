# STATE

## Decisions

### AD-001
- **Decision**: Os nomes do catálogo usam a forma da localização oficial brasileira; o nome original em inglês vira alias de palpite e nunca é exibido.
- **Reason**: O jogo é falado em português, mas parte dos personagens é conhecida no Brasil pelo próprio nome em inglês (`Batman`, `Goku`, `Luke Skywalker`). Traduzir à força produziria nomes que ninguém reconhece e tornaria o jogo mais difícil sem ganho nenhum.
- **Trade-off**: A regra não é mecânica — exige julgamento caso a caso e verificação na Wikipédia PT quando a forma brasileira é incerta. Um script não consegue validar "é o nome que o brasileiro usa"; o teste automatizado só garante que nenhum original em inglês sobrou como nome exibido.
- **Scope**: `server/wordlist.ts` e qualquer feature futura que adicione personagens ao catálogo.
- **Date**: 2026-08-04
- **Status**: active

### AD-002
- **Decision**: Personagens já atribuídos são rastreados por sala (`RoomState.usedCharacterIds`) e o catálogo é reciclado quando os disponíveis não bastam para os jogadores presentes.
- **Reason**: Repetir um personagem na mesma sala entrega a resposta ao grupo. Rastrear por sala mantém salas independentes entre si, e reciclar evita travar o jogo de um grupo que jogou muitas rodadas.
- **Trade-off**: O estado da sala cresce um `Set` por sala e o "sem repetição" deixa de ser absoluto — após o esgotamento os personagens voltam a circular. Aceito porque esgotar exige ~24 rodadas na mesma sala com 12 jogadores.
- **Scope**: `server/game.ts` (`RoomState`, `startRound`), `server/wordlist.ts` (`pickCharacters`).
- **Date**: 2026-08-04
- **Status**: active

### AD-003
- **Decision**: Toda duração e todo instante exibidos derivam do relógio do servidor. O servidor envia `roundStartedAt` e `serverNow` em cada `RoomView`; o cliente calcula a defasagem uma vez por payload e só faz a contagem visual.
- **Reason**: O relógio da máquina do jogador pode estar errado em minutos ou horas. Se o cliente calculasse a duração com o próprio `Date.now()`, dois jogadores da mesma sala veriam tempos diferentes e o tempo de acerto registrado seria inauditável.
- **Trade-off**: `serverNow` viaja em todo payload de estado (8 bytes de JSON) e a defasagem carrega a latência de ida do pacote — erro de dezenas de milissegundos, muito abaixo do 1s exigido pelo spec.
- **Scope**: `shared/protocol.ts`, `server/game.ts`, `src/App.tsx` e qualquer feature futura que exiba tempo.
- **Date**: 2026-08-04
- **Status**: active

### AD-004
- **Decision**: O crédito de autor, fonte e licença das imagens deixa de ser exibido na interface. Removido do card da rodada (`character-credit`) e da tela de revelação (`reveal-credit`), junto de `creditLabel`, `ComicVineLink` e das regras de estilo correspondentes. Não há seção de créditos substituta.
- **Reason**: Decisão do dono do projeto por motivo visual — o bloco de três linhas em fonte mono dentro do card pesava demais. A alternativa de manter o crédito só na tela de revelação foi apresentada e recusada.
- **Trade-off**: Aceito com o risco declarado. As imagens do Wikimedia Commons sob CC BY e CC BY-SA **exigem** atribuição, e os termos da API do Comic Vine exigem link de volta ao site sempre que os dados aparecem na interface. Sem crédito exibido em lugar nenhum, o jogo passa a usar essas imagens fora das condições da licença. Isso também revoga na prática IMG-06 da spec `fotos-personagens` ("WHEN uma imagem aprovada exigir atribuição THEN a interface SHALL exibir autor e licença de forma acessível") — a spec fica desatualizada em relação ao código até que alguém a corrija. Os metadados de autor e licença continuam gravados em `server/character-images.ts`, então repor a exibição é barato se a decisão mudar.
- **Scope**: `src/App.tsx`, `src/styles.css`, e a spec `.specs/features/fotos-personagens/spec.md` (IMG-06 agora divergente).
- **Date**: 2026-08-09
- **Status**: active

## Handoff

- **Feature**: quatro features concluídas e mescladas em `main` nesta sessão (2026-08-09)
  - `bloco-de-notas` — bloco de notas privado do jogador. 5 tasks, Verifier PASS.
  - `placar-da-sessao` — pontos por posição acumulados na sessão. 9 tasks + 3 correções, Verifier PASS na 2ª rodada.
  - `encerrar-rodada-travada` — anfitrião encerra rodada travada e remove jogador ausente. 8 tasks, Verifier PASS.
  - Mais dois ajustes sem spec formal: ocultar desconexão durante a rodada e remover o crédito de imagem dos cards (AD-004).
- **Phase / Task**: nada em andamento
- **In-progress** (file:line): none
- **Next step**: **UAT interativo pendente de todas as ACs de render** — nenhuma delas tem teste automatizado, porque o projeto não tem jsdom nem testing-library. São elas: NOTES-01/02/03/04/12/13/14 (bloco de notas), SCORE-10..14 (placar nas três telas) e END-05/06/22 (comandos do anfitrião).
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: `main`, com as quatro branches mescladas e enviadas para origin
- **Follow-ups conhecidos, fora de escopo**:
  - `tests/game.integration.test.ts` tem flake de timeout de socket sob carga paralela — reexecutar antes de tratar como falha.
  - `createGameManager` aceita 1 parâmetro mas o teste passa 2; `tests/` não está em nenhum tsconfig, então o typecheck nunca cobre os testes.
  - Mutante equivalente conhecido em `server/game.ts:241-253`: trocar `roundPlayerCount` por `players.size` não quebra teste nenhum hoje, porque o roster não encolhe durante `playing`. Se isso mudar, o congelamento passa a precisar de teste.
  - AD-004 deixou `IMG-06` da spec `fotos-personagens` divergente do código: a spec ainda exige exibir atribuição, a interface não exibe mais.
