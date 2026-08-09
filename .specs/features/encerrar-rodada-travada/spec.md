# Encerrar Rodada Travada — Specification

## Problem Statement

A rodada só termina quando **todos** os jogadores da sala acertam: `everyoneSolved` em `server/game.ts:274` varre o mapa inteiro, incluindo quem está desconectado, e o handler de `disconnect` não reavalia essa condição. Se alguém fecha a aba ou perde a conexão sem ter descoberto o próprio personagem, a rodada congela para sempre — não existe encerramento por tempo, não existe exclusão automática e não existe comando manual. Os outros jogadores ficam presos numa tela de jogo que nunca revela nada, e a única saída é todo mundo abandonar a sala e recomeçar, perdendo o placar da sessão.

## Goals

- [ ] O anfitrião consegue encerrar uma rodada que travou por ausência de um jogador.
- [ ] O encerramento manual produz exatamente a mesma revelação e o mesmo ranking do encerramento natural.
- [ ] Nenhum jogador presente perde pontos já conquistados por causa do encerramento.
- [ ] Um jogador conectado que ainda está jogando não pode ser cortado pelo anfitrião.
- [ ] A sala volta a jogar depois do encerramento, sem depender do retorno de quem sumiu.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Encerramento automático por tempo de desconexão | Decisão do dono do projeto: o controle é humano, sem heurística de prazo. Fica registrado como alternativa recusada. |
| Exclusão automática de quem cai | Mesma decisão — um blip de conexão não deve revelar o personagem de todo mundo. |
| Remover jogador CONECTADO da sala | Expulsar quem está jogando é moderação de comportamento, outra decisão de produto. Aqui só o ausente pode ser removido. |
| Votação entre jogadores para encerrar | Um comando do anfitrião resolve; votação exige estado e interface novos para o mesmo efeito. |
| Corrigir o `finishRound` para não depender de todos | O gatilho natural continua igual; esta feature adiciona um segundo caminho, não substitui o primeiro. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quem pode encerrar | Apenas o anfitrião | Escolha do dono do projeto. O jogo já concentra no anfitrião o comando de abrir rodada (`playAgain`), então é o mesmo modelo mental. | y |
| Anfitrião é quem caiu | Já resolvido pelo código atual | `disconnect` promove outro jogador conectado a anfitrião (`server/game.ts:389-392`), então a sala nunca fica sem alguém apto a encerrar. | y |
| Quando o comando é aceito | Só quando existe ao menos um jogador desconectado que ainda não acertou | É exatamente a condição de travamento. Liberar o comando sempre permitiria ao anfitrião cortar uma rodada saudável e revelar o personagem de quem ainda está jogando. | n |
| Vazamento de informação pelo botão | A presença do botão revela que **alguém** caiu, sem dizer quem | Contradiz parcialmente a decisão anterior de não expor desconexão durante a rodada. O vazamento é bem mais fraco (existência, não identidade) e é o preço de o anfitrião saber que há algo a encerrar. Se for inaceitável, a alternativa é o botão sempre visível — que devolve ao anfitrião o poder de cortar rodada saudável. | n |
| Pontos de quem não acertou | 0, e o total da sessão fica inalterado | Já é o comportamento do encerramento natural; encerrar manualmente não deve inventar exceção. | y |
| Posição de quem não acertou | `rank` nulo, como hoje | `finishRound` já ordena nulos por último (`server/game.ts:348`). | y |
| Nome do evento | `round:endEarly`, sem payload | Segue o estilo dos eventos existentes sem payload (`round:playAgain`, `room:leave`). | n |
| Estado após o encerramento | Fase `finished`, idêntica ao encerramento natural | Permite ao anfitrião abrir a próxima rodada pelo `playAgain` que já existe, sem caminho novo. | y |
| Fase em que a remoção é permitida | Apenas `lobby` | É onde o travamento se manifesta (`everyoneReady`). Permitir durante `playing` recriaria o caminho de `resetAfterDeparture`, que aborta a rodada dos outros — efeito bem maior que o problema. | n |
| Alvo da remoção | Um jogador por comando, identificado por id | Remover todos os desconectados de uma vez tiraria também quem caiu há dois segundos e está voltando. | n |
| Placar do removido | Descartado junto do registro | Coerente com SCORE-09: sair da sala já apaga o placar. Reentrar é entrar zerado. | y |
| Nome do evento de remoção | `room:removeAbsent`, com payload `{ playerId }` | Único evento do protocolo que precisa identificar um terceiro; os demais agem sobre quem emite. | n |

**Open questions:** none — tudo resolvido ou registrado acima.

---

## User Stories

### P1: Encerrar a rodada travada ⭐ MVP

**User Story**: Como anfitrião de uma sala cuja rodada travou porque alguém caiu, quero encerrar a rodada por comando, para revelar os personagens e seguir para a próxima sem dissolver a sala.

**Why P1**: É a feature inteira. Sem o comando a sala continua sem saída.

**Acceptance Criteria**:

1. WHEN o anfitrião emite `round:endEarly` e existe ao menos um jogador desconectado que ainda não acertou THEN o servidor SHALL encerrar a rodada, mudando a fase da sala para `finished`. <!-- END-01 -->
2. WHEN o servidor encerra a rodada por esse comando THEN ele SHALL emitir `round:finished` para todos os jogadores conectados, com o mesmo ranking que o encerramento natural produziria. <!-- END-02 -->
3. WHEN a rodada é encerrada por comando THEN o servidor SHALL preservar o `rank`, os `roundPoints` e o `score` de cada jogador que já havia acertado. <!-- END-03 -->
4. WHEN a rodada é encerrada por comando THEN o servidor SHALL manter `rank` e `roundPoints` nulos e o `score` inalterado para cada jogador que não acertou. <!-- END-04 -->
5. WHILE a sala está na fase `playing` e existe ao menos um jogador desconectado que ainda não acertou, a interface SHALL exibir ao anfitrião um comando de encerrar a rodada. <!-- END-05 -->
6. WHILE não existe jogador desconectado sem acertar, a interface SHALL ocultar esse comando de todos os jogadores, inclusive do anfitrião. <!-- END-06 -->

**Independent Test**: Numa sala de 3, derrubar um jogador antes de ele acertar, fazer os outros dois acertarem e confirmar que o anfitrião consegue encerrar e ver a revelação.

---

### P1: Recusar encerramento indevido ⭐ MVP

**User Story**: Como jogador que ainda está tentando descobrir meu personagem, quero que ninguém possa encerrar a rodada por baixo de mim, para não ter a resposta revelada antes da hora.

**Why P1**: Sem essas recusas o comando deixa de ser conserto e vira uma forma de estragar a rodada dos outros.

**Acceptance Criteria**:

1. IF um jogador que não é o anfitrião emitir `round:endEarly` THEN o servidor SHALL recusar com o erro `HOST_ONLY` e não alterar a fase da sala. <!-- END-07 -->
2. IF o anfitrião emitir `round:endEarly` enquanto todos os jogadores estão conectados THEN o servidor SHALL recusar com o erro `ROUND_NOT_STUCK` e não alterar a fase da sala. <!-- END-08 -->
3. IF o anfitrião emitir `round:endEarly` quando todos os jogadores desconectados já acertaram THEN o servidor SHALL recusar com o erro `ROUND_NOT_STUCK`. <!-- END-09 -->
4. IF `round:endEarly` for emitido enquanto a sala não está na fase `playing` THEN o servidor SHALL recusar com o erro `ROUND_NOT_RUNNING`. <!-- END-10 -->
5. IF `round:endEarly` for emitido por um socket sem sessão válida THEN o servidor SHALL ignorar o evento sem alterar estado. <!-- END-11 -->

**Independent Test**: Com todos conectados, o anfitrião emite o comando e recebe `ROUND_NOT_STUCK`; a rodada continua.

---

### P1: Remover o jogador ausente da sala ⭐ MVP

**User Story**: Como anfitrião, quero tirar da sala um jogador que caiu e não voltou, para que o grupo consiga começar a próxima rodada sem esperar por alguém que não está mais lá.

**Why P1**: Encerrar a rodada sozinho não destrava a sala. `everyoneReady` (`server/game.ts:180`) exige `connected && ready` de **todos**, então o ausente continua barrando o início da rodada seguinte. Sem esta história, a correção só adia o travamento em um passo.

**Acceptance Criteria**:

1. WHEN o anfitrião comanda a remoção de um jogador desconectado estando a sala na fase `lobby` THEN o servidor SHALL remover esse jogador da sala. <!-- END-15 -->
2. WHEN o servidor remove o jogador ausente THEN ele SHALL descartar o `score` de sessão dele junto do registro, como já acontece na saída pelo botão. <!-- END-16 -->
3. WHEN o jogador ausente é removido e os demais estão prontos THEN o servidor SHALL permitir que a rodada seguinte comece normalmente. <!-- END-17 -->
4. IF um jogador que não é o anfitrião comandar a remoção THEN o servidor SHALL recusar com o erro `HOST_ONLY` e não remover ninguém. <!-- END-18 -->
5. IF o alvo da remoção estiver conectado THEN o servidor SHALL recusar com o erro `PLAYER_CONNECTED` e não remover ninguém. <!-- END-19 -->
6. IF o alvo da remoção não existir na sala THEN o servidor SHALL recusar com o erro `PLAYER_NOT_FOUND`. <!-- END-20 -->
7. IF o comando for emitido fora da fase `lobby` THEN o servidor SHALL recusar com o erro `ROOM_NOT_IN_LOBBY`. <!-- END-21 -->
8. WHILE a sala está na fase `lobby` e existe ao menos um jogador desconectado, a interface SHALL exibir ao anfitrião um comando de remover cada jogador desconectado. <!-- END-22 -->

**Independent Test**: Numa sala de 3, derrubar um jogador, encerrar a rodada, remover o ausente e confirmar que a rodada seguinte começa com os dois restantes.

---

### P2: Sala segue jogável depois do encerramento

**User Story**: Como anfitrião, quero que a sala continue normal depois de um encerramento manual, para que a sessão não precise ser recomeçada.

**Why P2**: Não é o ato de encerrar, mas é o que decide se a correção resolve ou só troca um travamento por outro.

**Acceptance Criteria**:

1. WHEN a rodada é encerrada por comando THEN o anfitrião SHALL conseguir abrir a próxima rodada pelo fluxo `round:playAgain` existente, sem erro. <!-- END-12 -->
2. WHEN o jogador desconectado reconecta depois do encerramento THEN o servidor SHALL entregar a ele o estado corrente da sala, com o `score` de sessão que ele tinha. <!-- END-13 -->
3. The system SHALL manter o encerramento natural por `everyoneSolved` funcionando sem alteração de comportamento. <!-- END-14 -->

**Independent Test**: Encerrar por comando, abrir nova rodada e confirmar que a sala volta a `playing` com todos os presentes.

---

## Edge Cases

- IF todos os jogadores restantes já tiverem acertado e só o desconectado faltar THEN o comando SHALL encerrar normalmente — é o caso central, coberto por END-01.
- IF o jogador desconectado reconectar antes do anfitrião apertar o botão THEN o comando SHALL passar a ser recusado com `ROUND_NOT_STUCK` — coberto por END-08.
- IF o anfitrião cair e outro assumir THEN o novo anfitrião SHALL poder encerrar — coberto por END-07 combinado com a promoção já existente.
- IF o comando for emitido duas vezes seguidas THEN a segunda emissão SHALL ser recusada com `ROUND_NOT_RUNNING`, porque a sala já saiu de `playing` — coberto por END-10.

**Dimensões de requisito implícito:**

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | END-11 — o evento não tem payload; socket sem sessão é ignorado |
| Failure / partial-failure states | END-13 (reconexão após o encerramento) |
| Idempotency / retry / duplicate | END-10 — segunda emissão cai na guarda de fase |
| Auth boundaries & rate limits | END-07 (só anfitrião), END-08/09 (só quando travado). N/A quanto a rate limit: o projeto não tem throttle e a feature não adiciona endpoint |
| Concurrency / ordering | N/A — o handler roda no laço single-threaded do Node e só muda a fase da sala, sem espera assíncrona entre a checagem e a mudança |
| Data lifecycle / expiry | END-03, END-04 — nenhum dado de placar é criado ou destruído pelo encerramento |
| Observability | N/A — o projeto não tem infraestrutura de log, métrica ou tracing |
| External-dependency failure | N/A — a feature não faz chamada externa |
| State-transition integrity | END-01 (`playing` → `finished`), END-10 (bloqueia fora de `playing`), END-12 (`finished` → nova rodada), END-14 (caminho natural intacto) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| END-01 | P1: Encerrar a rodada travada | Implementing | Implementing |
| END-02 | P1: Encerrar a rodada travada | Implementing | Implementing |
| END-03 | P1: Encerrar a rodada travada | Implementing | Implementing |
| END-04 | P1: Encerrar a rodada travada | Implementing | Implementing |
| END-05 | P1: Encerrar a rodada travada | Tasks | Pending |
| END-06 | P1: Encerrar a rodada travada | Tasks | Pending |
| END-07 | P1: Recusar encerramento indevido | Implementing | Implementing |
| END-08 | P1: Recusar encerramento indevido | Implementing | Implementing |
| END-09 | P1: Recusar encerramento indevido | Implementing | Implementing |
| END-10 | P1: Recusar encerramento indevido | Implementing | Implementing |
| END-11 | P1: Recusar encerramento indevido | Implementing | Implementing |
| END-15 | P1: Remover o jogador ausente | Tasks | Pending |
| END-16 | P1: Remover o jogador ausente | Tasks | Pending |
| END-17 | P1: Remover o jogador ausente | Tasks | Pending |
| END-18 | P1: Remover o jogador ausente | Tasks | Pending |
| END-19 | P1: Remover o jogador ausente | Tasks | Pending |
| END-20 | P1: Remover o jogador ausente | Tasks | Pending |
| END-21 | P1: Remover o jogador ausente | Tasks | Pending |
| END-22 | P1: Remover o jogador ausente | Tasks | Pending |
| END-12 | P2: Sala segue jogável | Implementing | Implementing |
| END-13 | P2: Sala segue jogável | Implementing | Implementing |
| END-14 | P2: Sala segue jogável | Implementing | Implementing |

**ID format:** `END-[NUMBER]`

**Coverage:** 22 total.

---

## Success Criteria

- [ ] Uma sala travada por queda de jogador volta a ser jogável sem ninguém precisar sair.
- [ ] O ranking e o placar produzidos pelo encerramento manual são idênticos aos do encerramento natural para todos que acertaram.
- [ ] Nenhum jogador conectado tem a rodada encerrada por baixo dele.
- [ ] `npm test` e `npm run typecheck` continuam verdes, com o encerramento natural ainda coberto.
