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

## Handoff

- **Feature**: bloco-de-notas (`.specs/features/bloco-de-notas/`) — **concluída**
- **Phase / Task**: 2 fases, 5 tasks (T1..T5) concluídas; 1 rodada de Verifier; veredito PASS
- **Completed**: T1..T5 (`9967dc9`, `e08c4d0`, `3c20f25`, `3373096`, `ec9cb51`), spec+tasks em `b429216`
- **In-progress** (file:line): none
- **Next step**: UAT interativo das 7 ACs de UI (NOTES-01, 02, 03, 04, 12, 13, 14) com o usuário — verificadas por inspeção, não por teste automatizado, conforme decisão registrada na spec. Depois disso, decidir sobre push/PR.
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: feat/bloco-de-notas (local, não enviada para origin)
- **Follow-up conhecido, fora de escopo**: `tests/game.integration.test.ts` falha por timeout de socket sob carga paralela (visto 1x pelo worker e 1x pelo Verifier, verde ao reexecutar). Pré-existente, não é regressão desta feature.
