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

- **Feature**: encerrar-rodada-travada (`.specs/features/encerrar-rodada-travada/`) — **concluída**
- **Phase / Task**: 3 fases, 8 tasks (T1..T8); 1 rodada de Verifier; veredito PASS, 0 lacunas, 7/7 mutantes mortos
- **Completed**: T1 `1cd01ef`, T2 `537f498`, T3 `662e3c8`, T4 `f056276`, T5 `bc698fe`, T6 `b4ea22e`, T7 `221adf4`, T8 `25f9cc6`; spec+tasks `e980641` e extensão `6ac5186`
- **In-progress** (file:line): none
- **Next step**: UAT interativo de todas as ACs de render acumuladas — END-05/06/22 (comandos do anfitrião), SCORE-10..14 (placar) e NOTES-01..04/12/13/14 (bloco de notas). Depois, push e ordem de merge das quatro branches.
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: fix/encerrar-rodada-travada (local; parte de feat/placar-da-sessao → fix/ocultar-desconexao-na-rodada → main)
- **Conflito de merge previsto**: `feat/bloco-de-notas` saiu de `main` e não conhece nenhuma mudança das outras três branches. Vai conflitar em `src/App.tsx` e `src/styles.css`. Mesclar por último, ou rebasear sobre esta linha antes.
- **Escopo ampliado durante a execução**: a feature nasceu só com o botão de encerrar; o teste de END-12 expôs que `everyoneReady` também trava o início da rodada seguinte, e o dono do projeto aprovou a história de remoção do ausente (END-15..22) para fechar o bug de verdade.
