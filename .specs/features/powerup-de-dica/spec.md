# Power-up de Dica — Specification

## Problem Statement

Uma rodada sem limite de tempo pode travar: quem já acertou fica esperando, e quem não acertou continua fazendo as mesmas perguntas sem chegar a lugar nenhum. Hoje não existe nenhuma válvula — o jogo não oferece dica (decisão de design registrada no README) e o único desfecho é o anfitrião encerrar a rodada, que revela tudo e frustra quem estava perto. Falta um caminho intermediário: pedir ajuda a quem já saiu, sem que o jogo entregue a resposta.

## Goals

- [ ] Quem está preso há muito tempo ganha o direito de pedir uma dica a quem já acertou.
- [ ] O direito é escasso e chega tarde, para a dica não virar atalho da rodada.
- [ ] O app nunca gera nem sugere a dica; ele distribui o direito de pedir e mostra o pedido.
- [ ] Não existe dica enquanto ninguém tiver acertado — não há de quem pedir.

## Out of Scope

| Feature | Reason |
| --- | --- |
| O app gerar o texto da dica | O README declara "Sem dicas automáticas" como postura de design. A dica é falada na call por outro jogador; o app só medeia o pedido. |
| Dica escrita dentro do app | O jogo é jogado numa call; digitar a dica seria mais lento que falar e criaria um canal de texto que o jogo não tem. |
| Custo em pontos por pedir dica | Pedir dica já custa tempo e posição no ranking. Penalizar de novo puniria duas vezes o mesmo atraso. |
| Encerramento automático da rodada por tempo | Decisão registrada anteriormente: o controle é humano. O power-up usa o tempo como gatilho, não como fim. |
| Dica entre rodadas ou acumulada na sessão | O direito nasce e morre na rodada; um estoque de sessão viraria outro sistema, com outro equilíbrio. |
| Escolher como alvo quem ainda não acertou | Quem não acertou não sabe nada que sirva de dica. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Momentos de liberação | 30, 40 e 50 minutos de rodada | Escolha do dono do projeto. A dica é para rodada realmente travada, não para rodada difícil. | y |
| Acúmulo | Até 3 power-ups guardados, usáveis em sequência | Quem segurou não perde o direito por não ter usado na hora. | y |
| Fim do pedido | Quem foi escolhido marca que respondeu | Fecha o ciclo dentro do app e registra quem deu a dica. | y |
| Alvo do pedido | Um jogador específico, escolhido por quem pede | Escolha do dono do projeto. | y |
| Alvo escolhido cai antes de responder | O pedido é cancelado e o power-up volta para quem pediu | Perder o direito por queda alheia seria punir o jogador por algo fora do controle dele. | n |
| Cancelar o próprio pedido | Permitido, e o power-up volta | Escolher a pessoa errada é erro barato de cometer e caro de não poder desfazer. | n |
| Pedidos simultâneos do mesmo jogador | No máximo um pedido pendente por jogador | Dois destaques do mesmo jogador não significam nada para quem olha a tela. | n |
| Quem pede acerta com pedido pendente | O pedido é cancelado e o power-up **não** volta | Ele já não precisa mais da dica; devolver o direito a quem saiu da rodada não faz sentido. | n |
| Efeito no placar | Nenhum: pedir e responder não alteram `score` nem `roundPoints` | Registrado como fora de escopo acima; o placar continua função exclusiva da posição de acerto. | y |
| Origem do tempo | `roundStartedAt` do servidor, como manda AD-003 | O relógio da máquina do jogador pode estar errado em horas; dois jogadores veriam power-ups em momentos diferentes. | y |
| Quem recebe power-up | Apenas jogadores que ainda não acertaram | Quem já acertou não tem o que perguntar. | n |
| Estado entre rodadas | Power-ups e pedidos zerados no início de cada rodada | O direito é da rodada, não da sessão — coerente com o item de escopo acima. | y |

**Open questions:** none — tudo resolvido ou registrado acima.

---

## User Stories

### P1: Ganhar o direito de pedir dica ⭐ MVP

**User Story**: Como jogador preso há muito tempo na mesma rodada, quero ganhar um power-up de dica conforme o tempo passa, para ter uma saída quando as perguntas pararam de me levar a algum lugar.

**Why P1**: É a fonte do recurso. Sem concessão não há o que gastar.

**Acceptance Criteria**:

1. WHEN a rodada completa 30, 40 e 50 minutos THEN o servidor SHALL conceder um power-up de dica a cada jogador que ainda não acertou naquele instante. <!-- HINT-01 -->
2. The system SHALL derivar o tempo decorrido de `roundStartedAt` do servidor, nunca do relógio do cliente. <!-- HINT-02 -->
3. WHILE o jogador não usa os power-ups recebidos, o servidor SHALL acumulá-los até o máximo de 3. <!-- HINT-03 -->
4. WHEN um jogador acerta THEN o servidor SHALL parar de conceder power-ups a ele nas liberações seguintes. <!-- HINT-04 -->
5. WHEN uma rodada começa THEN o servidor SHALL zerar os power-ups e os pedidos pendentes de todos os jogadores. <!-- HINT-05 -->
6. WHILE o jogador tem ao menos um power-up e ainda não acertou, a interface SHALL exibir o power-up com a quantidade disponível. <!-- HINT-06 -->

**Independent Test**: Começar uma rodada, avançar o relógio do servidor para 30 minutos e conferir que quem não acertou recebe exatamente um power-up.

---

### P1: Pedir a dica a quem já acertou ⭐ MVP

**User Story**: Como jogador com um power-up, quero apontar para alguém que já acertou e sinalizar que quero uma dica, para que essa pessoa saiba que é comigo e me ajude na call.

**Why P1**: É o uso do recurso e o coração da mecânica.

**Acceptance Criteria**:

1. WHEN o jogador usa um power-up escolhendo como alvo alguém que já acertou THEN o servidor SHALL consumir um power-up e registrar o pedido pendente com o alvo escolhido. <!-- HINT-07 -->
2. WHILE existe um pedido pendente, a interface SHALL destacar o card de quem pediu para todos os jogadores da sala. <!-- HINT-08 -->
3. WHILE existe um pedido pendente dirigido a ele, a interface SHALL exibir ao alvo um comando de marcar que respondeu. <!-- HINT-09 -->
4. WHEN o alvo marca que respondeu THEN o servidor SHALL encerrar o pedido e remover o destaque. <!-- HINT-10 -->
5. WHEN quem pediu cancela o próprio pedido THEN o servidor SHALL encerrar o pedido e devolver o power-up. <!-- HINT-11 -->
6. The system SHALL manter `score` e `roundPoints` inalterados ao conceder, usar, responder ou cancelar um power-up. <!-- HINT-12 -->

**Independent Test**: Com um jogador já resolvido e outro com power-up, pedir a dica a ele e conferir que o card fica destacado até ele marcar que respondeu.

---

### P1: Recusar pedido indevido ⭐ MVP

**User Story**: Como jogador, quero que o pedido de dica só funcione nas condições combinadas, para que ninguém consiga dica antes da hora nem de quem não pode dar.

**Why P1**: Sem as recusas o power-up vira um botão de pedir resposta a qualquer momento, e a raridade que dá sentido à mecânica desaparece.

**Acceptance Criteria**:

1. IF nenhum jogador tiver acertado na rodada corrente THEN o servidor SHALL recusar o pedido com o erro `NO_SOLVER_YET` e não consumir power-up. <!-- HINT-13 -->
2. IF o alvo escolhido ainda não tiver acertado THEN o servidor SHALL recusar com o erro `INVALID_HINT_TARGET` e não consumir power-up. <!-- HINT-14 -->
3. IF o jogador não tiver nenhum power-up disponível THEN o servidor SHALL recusar com o erro `NO_HINT_AVAILABLE`. <!-- HINT-15 -->
4. IF o jogador que pede já tiver acertado THEN o servidor SHALL recusar com o erro `ALREADY_SOLVED`. <!-- HINT-16 -->
5. IF o jogador já tiver um pedido pendente THEN o servidor SHALL recusar um segundo pedido com o erro `HINT_ALREADY_PENDING`. <!-- HINT-17 -->
6. IF o pedido for feito fora da fase `playing` THEN o servidor SHALL recusar com o erro `ROUND_NOT_RUNNING`. <!-- HINT-18 -->
7. IF alguém que não é o alvo marcar que respondeu THEN o servidor SHALL recusar com o erro `NOT_HINT_TARGET` e manter o pedido pendente. <!-- HINT-19 -->

**Independent Test**: Antes de qualquer acerto na rodada, usar o power-up e conferir a recusa `NO_SOLVER_YET` com o power-up intacto.

---

### P2: Pedido resistente à movimentação de jogadores

**User Story**: Como jogador que pediu dica, quero não perder meu power-up por causa de algo fora do meu controle, para que o recurso escasso continue justo.

**Why P2**: Não é o caminho feliz, mas define se o jogador confia em gastar o power-up.

**Acceptance Criteria**:

1. IF o alvo do pedido perder a conexão antes de responder THEN o servidor SHALL cancelar o pedido e devolver o power-up a quem pediu. <!-- HINT-20 -->
2. IF o alvo do pedido sair da sala antes de responder THEN o servidor SHALL cancelar o pedido e devolver o power-up a quem pediu. <!-- HINT-21 -->
3. WHEN quem pediu acerta o próprio personagem com um pedido pendente THEN o servidor SHALL cancelar o pedido sem devolver o power-up. <!-- HINT-22 -->
4. The system SHALL manter a quantidade de power-ups de cada jogador entre 0 e 3, nunca negativa. <!-- HINT-23 -->

**Independent Test**: Pedir dica a alguém, derrubar essa pessoa e conferir que o pedido some e o power-up volta.

---

## Edge Cases

- IF a rodada terminar com um pedido pendente THEN o pedido SHALL desaparecer junto com a rodada — coberto por HINT-05, que zera tudo no início da rodada seguinte.
- WHEN dois jogadores diferentes pedem dica ao mesmo alvo THEN o alvo SHALL ver os dois pedidos, cada um com seu comando de resposta — os pedidos são independentes, por HINT-17 o limite é um por jogador que pede.
- IF o jogador acumular 3 power-ups e a rodada chegar a um quarto momento de liberação THEN o servidor SHALL manter o total em 3 — coberto por HINT-03 e HINT-23. Não existe quarto momento hoje; o teto é a proteção.
- WHEN quem pediu perde a conexão com pedido pendente THEN o pedido SHALL permanecer, porque ele volta como o mesmo jogador — coberto por HINT-20 pela ausência: só a queda do alvo cancela.

**Dimensões de requisito implícito:**

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | HINT-14 (alvo válido), HINT-23 (0 a 3) |
| Failure / partial-failure states | HINT-20, HINT-21 (queda e saída do alvo) |
| Idempotency / retry / duplicate | HINT-17 (um pedido pendente por jogador), HINT-19 (só o alvo responde) |
| Auth boundaries & rate limits | HINT-16, HINT-19 — quem pode pedir e quem pode responder. O racionamento por tempo (HINT-01) é o próprio rate limit da feature |
| Concurrency / ordering | N/A — concessão e consumo rodam no laço single-threaded do Node; a feature não introduz espera assíncrona entre checagem e escrita |
| Data lifecycle / expiry | HINT-05 (zerado a cada rodada), HINT-22 (cancelamento ao acertar) |
| Observability | N/A — o projeto não tem infraestrutura de log, métrica ou tracing |
| External-dependency failure | N/A — a feature não faz chamada externa |
| State-transition integrity | HINT-04 (parar de conceder após acertar), HINT-18 (só na fase `playing`), HINT-10 e HINT-11 (pendente → encerrado) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| HINT-01 | P1: Ganhar o direito | Tasks | Pending |
| HINT-02 | P1: Ganhar o direito | Tasks | Pending |
| HINT-03 | P1: Ganhar o direito | Tasks | Pending |
| HINT-04 | P1: Ganhar o direito | Tasks | Pending |
| HINT-05 | P1: Ganhar o direito | Tasks | Pending |
| HINT-06 | P1: Ganhar o direito | Tasks | Pending |
| HINT-07 | P1: Pedir a dica | Tasks | Pending |
| HINT-08 | P1: Pedir a dica | Tasks | Pending |
| HINT-09 | P1: Pedir a dica | Tasks | Pending |
| HINT-10 | P1: Pedir a dica | Tasks | Pending |
| HINT-11 | P1: Pedir a dica | Tasks | Pending |
| HINT-12 | P1: Pedir a dica | Tasks | Pending |
| HINT-13 | P1: Recusar pedido indevido | Tasks | Pending |
| HINT-14 | P1: Recusar pedido indevido | Tasks | Pending |
| HINT-15 | P1: Recusar pedido indevido | Tasks | Pending |
| HINT-16 | P1: Recusar pedido indevido | Tasks | Pending |
| HINT-17 | P1: Recusar pedido indevido | Tasks | Pending |
| HINT-18 | P1: Recusar pedido indevido | Tasks | Pending |
| HINT-19 | P1: Recusar pedido indevido | Tasks | Pending |
| HINT-20 | P2: Resistente à movimentação | Tasks | Pending |
| HINT-21 | P2: Resistente à movimentação | Tasks | Pending |
| HINT-22 | P2: Resistente à movimentação | Tasks | Pending |
| HINT-23 | P2: Resistente à movimentação | Tasks | Pending |

**ID format:** `HINT-[NUMBER]`

**Coverage:** 23 total.

---

## Success Criteria

- [ ] Nenhum power-up é concedido antes dos 30 minutos de rodada.
- [ ] Nenhum pedido é aceito enquanto ninguém tiver acertado na rodada.
- [ ] Um jogador que não usa nada até os 50 minutos tem exatamente 3 power-ups.
- [ ] O destaque do pedido só some quando o alvo marca que respondeu, ou quando o pedido é cancelado.
- [ ] `score` e `roundPoints` continuam idênticos com e sem uso de power-up.
- [ ] `npm test` e `npm run typecheck` continuam verdes.
