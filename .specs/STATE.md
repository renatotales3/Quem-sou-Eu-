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

- **Feature**: melhorias-jogo (`.specs/features/melhorias-jogo/`) — **concluída**
- **Phase / Task**: todas as 5 fases e 13 tasks concluídas; 3 rodadas de Verifier; veredito final PASS
- **Completed**: T1..T13, mais 3 commits de correção (grafia PT-BR, lacunas de POOL/TIME rodada 1, lacunas de POOL-06/TIME-09 rodada 2)
- **In-progress** (file:line): none
- **Next step**: nada pendente nesta feature. Follow-up conhecido e fora de escopo: `createGameManager` aceita 1 parâmetro mas o teste passa 2 (`server/game.ts`, `tests/game.integration.test.ts`), e `tests/` não está em nenhum tsconfig — o typecheck nunca cobre os testes.
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: claude/repo-contextualization-yzxld1 (enviada para origin)
