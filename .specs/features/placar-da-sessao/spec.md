# Placar Acumulado da Sessão — Specification

## Problem Statement

Cada rodada de "Quem Sou Eu?" termina, revela o ranking daquela rodada e some. Um grupo que joga cinco rodadas seguidas na mesma sala não tem como saber quem foi melhor no conjunto — a única memória é a de quem estava prestando atenção. Sem placar acumulado, cada rodada é um evento isolado e a sessão não tem arco: não há motivo para jogar a sexta rodada, porque não há nada em disputa além da rodada em si.

## Goals

- [ ] Cada acerto rende pontos proporcionais à posição, e o total de cada jogador acumula ao longo das rodadas da sala.
- [ ] O jogador enxerga o placar da sessão no lobby, durante a rodada e na tela de revelação.
- [ ] O total é sempre calculado pelo servidor; o cliente nunca envia nem calcula pontos.
- [ ] O placar sobrevive a queda de conexão e reconexão do jogador.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Placar entre salas / ranking global | Exigiria identidade persistente de jogador e banco de dados; hoje as salas vivem em memória e morrem com o processo. |
| Histórico rodada a rodada do placar | O total corrente e o ganho da rodada atual cobrem a necessidade; guardar a série inteira infla o `RoomView` sem uso claro. |
| Bônus por tempo de acerto | A posição já é função do tempo; pontuar as duas coisas premiaria o mesmo mérito duas vezes. |
| Penalidade por palpite errado | Mudaria o comportamento do jogo (desencorajar tentativa), não só a contagem. Decisão de game design separada. |
| Empates com tratamento especial | Rank é estritamente sequencial por ordem de acerto — não existe empate a resolver. |
| Persistir o placar após reinício do servidor | As salas já são perdidas no restart (documentado no README); o placar segue a mesma vida. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fórmula de pontos | `pontos = N - rank + 1`, onde N é o número de jogadores da sala | Escolha do dono do projeto: a vantagem do primeiro escala com o tamanho da sala. Numa sala de 5, o 1º leva 5 e o último a acertar leva 1. | y |
| Momento em que N é medido | Número de jogadores na sala no instante em que a rodada começou (`startRound`), congelado para toda a rodada | Se N fosse lido no instante de cada acerto, alguém saindo no meio mudaria o valor dos acertos seguintes e dois jogadores na mesma posição em rodadas iguais valeriam diferente. Congelar torna a pontuação auditável. Entrada no meio da rodada não é possível — `joinRoom` já exige `phase === 'lobby'`. | n |
| Quem não acerta a rodada | 0 pontos | Não há posição, não há pontuação. | y |
| Saída da sala | Sair pelo botão apaga o jogador e o placar dele; reentrar é entrar zerado | O jogador já é removido de `room.players` em `leaveRoom`; guardar placar fantasma exigiria casar por apelido e abriria disputa pelo mesmo total. | y |
| Queda de conexão | Preserva o placar | O jogador continua em `room.players` com `connected: false`; a sessão já sobrevive à reconexão. | y |
| Entrada no meio da sessão | Começa com 0 | Simples e legível no placar — fica claro quem chegou depois. | y |
| Momento da soma | No instante do acerto, junto da atribuição de `rank` | Permite que o total apareça atualizado durante a rodada, que é um dos lugares de exibição pedidos. A ordem de acerto já é pública (evento `player:solved`), então somar ao vivo não revela nada novo. | n |
| Superfície no protocolo | `PlayerView` ganha `score: number` (total da sessão) e `roundPoints: number \| null` (ganho na rodada corrente) | Ambos derivam de estado que só o servidor tem. `roundPoints` é `null` enquanto o jogador não acertou, o que distingue "ainda não acertou" de "acertou e levou 0" — caso que não existe hoje mas que uma mudança de fórmula criaria. | n |
| Exibição durante a rodada | Total da sessão junto do medidor de resolvidos, sem o ganho da rodada | O ganho individual só faz sentido depois que a posição está definida; durante a rodada o que interessa é a disputa acumulada. | n |

**Open questions:** none — tudo resolvido ou registrado acima.

---

## User Stories

### P1: Pontuar cada acerto por posição ⭐ MVP

**User Story**: Como jogador, quero que meu acerto valha pontos conforme a posição em que cheguei, para que chegar em primeiro tenha peso maior que chegar em último.

**Why P1**: É o motor da feature. Sem pontos atribuídos não há o que acumular nem o que exibir.

**Acceptance Criteria**:

1. WHEN um jogador acerta o próprio personagem THEN o servidor SHALL somar ao total dele `N - rank + 1` pontos, onde `rank` é a posição de acerto e `N` é o número de jogadores registrado no início da rodada. <!-- SCORE-01 -->
2. WHEN a rodada começa THEN o servidor SHALL registrar o número de jogadores da sala naquele instante e usar esse valor para toda a rodada. <!-- SCORE-02 -->
3. WHILE a rodada corre, o servidor SHALL manter em 0 o ganho da rodada de todo jogador que ainda não acertou. <!-- SCORE-03 -->
4. IF um jogador tentar acertar de novo depois de já ter acertado THEN o servidor SHALL rejeitar a tentativa sem somar pontos outra vez. <!-- SCORE-04 -->
5. The system SHALL calcular todo ponto no servidor, sem aceitar valor de pontuação vindo do cliente em nenhum evento. <!-- SCORE-05 -->

**Independent Test**: Numa sala de 4, fazer os quatro acertarem em ordem e conferir os totais 4, 3, 2, 1.

---

### P1: Acumular ao longo das rodadas ⭐ MVP

**User Story**: Como jogador de uma sessão de várias rodadas, quero que meus pontos somem de rodada em rodada, para que a sessão tenha um vencedor e não só a rodada.

**Why P1**: É a diferença entre um placar de rodada, que já existe, e um placar de sessão, que é o pedido.

**Acceptance Criteria**:

1. WHEN o anfitrião abre uma nova rodada THEN o servidor SHALL preservar o total de cada jogador e zerar apenas o ganho da rodada. <!-- SCORE-06 -->
2. WHEN um jogador entra numa sala que já jogou rodadas THEN o servidor SHALL registrá-lo com total 0. <!-- SCORE-07 -->
3. WHEN um jogador perde a conexão e reconecta na mesma sala com a mesma sessão THEN o servidor SHALL devolver a ele o total que tinha antes da queda. <!-- SCORE-08 -->
4. WHEN um jogador sai da sala pelo botão de sair THEN o servidor SHALL descartar o total dele junto com o registro do jogador. <!-- SCORE-09 -->

**Independent Test**: Jogar duas rodadas seguidas numa sala de 3 e conferir que o total da segunda é a soma das duas.

---

### P1: Ver o placar da sessão ⭐ MVP

**User Story**: Como jogador, quero enxergar o placar acumulado no lobby, durante a rodada e na revelação, para saber onde estou na disputa sem depender de memória.

**Why P1**: Pontuação que ninguém vê não é feature. Os três pontos de exibição foram pedidos explicitamente.

**Acceptance Criteria**:

1. WHILE a sala está na fase `lobby` e já houve ao menos uma rodada, a interface SHALL exibir o total de cada jogador no painel de participantes. <!-- SCORE-10 -->
2. WHILE a sala está na fase `playing`, a interface SHALL exibir o total da sessão do próprio jogador. <!-- SCORE-11 -->
3. WHILE a sala está na fase `finished`, a interface SHALL exibir, para cada jogador, o total da sessão e os pontos ganhos na rodada que acabou. <!-- SCORE-12 -->
4. WHILE a sala ainda não completou nenhuma rodada, a interface SHALL omitir o placar acumulado. <!-- SCORE-13 -->
5. The system SHALL ordenar o placar acumulado por total decrescente, com desempate pelo apelido em ordem alfabética. <!-- SCORE-14 -->

**Independent Test**: Jogar uma rodada, voltar ao lobby e confirmar que os totais aparecem no painel de participantes, ordenados.

---

### P2: Placar íntegro sob movimentação de jogadores

**User Story**: Como anfitrião, quero que o placar continue coerente quando gente entra, sai ou cai no meio da sessão, para não ter que reabrir a sala por causa de um número errado.

**Why P2**: Não é o caminho feliz, mas é o que decide se o placar é confiável numa sessão real de call, onde sempre cai alguém.

**Acceptance Criteria**:

1. IF um jogador sair da sala no meio de uma rodada THEN o servidor SHALL manter a pontuação já atribuída aos demais e continuar usando o `N` registrado no início da rodada. <!-- SCORE-15 -->
2. IF todos os jogadores saírem e a sala for descartada THEN o servidor SHALL descartar o placar junto, sem deixar estado órfão. <!-- SCORE-16 -->
3. IF o anfitrião mudar por saída do anterior THEN o servidor SHALL manter todos os totais inalterados. <!-- SCORE-17 -->
4. The system SHALL manter o total de cada jogador sempre maior ou igual a zero e nunca decrescente dentro de uma sessão. <!-- SCORE-18 -->

**Independent Test**: Numa sala de 4, derrubar um jogador no meio da rodada, terminar a rodada com os outros três e conferir que os pontos deles seguem a escala de 4.

---

## Edge Cases

- WHEN a rodada tem `N` jogadores e todos acertam THEN os pontos distribuídos SHALL ser exatamente `N, N-1, …, 1` — coberto por SCORE-01.
- IF o último colocado acertar numa sala de `N` jogadores THEN ele SHALL receber 1 ponto, nunca 0 — coberto por SCORE-01.
- IF um jogador cair antes de acertar e a rodada terminar sem ele THEN o total dele SHALL permanecer inalterado — coberto por SCORE-03 e SCORE-08.
- WHEN duas rodadas seguidas têm números de jogadores diferentes THEN cada rodada SHALL usar o próprio `N` — coberto por SCORE-02.
- IF o cliente emitir um evento contendo um campo de pontuação THEN o servidor SHALL ignorá-lo — coberto por SCORE-05.

**Dimensões de requisito implícito:**

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | SCORE-05 (cliente não envia pontos), SCORE-18 (total nunca negativo nem decrescente) |
| Failure / partial-failure states | SCORE-08 (reconexão devolve o total) |
| Idempotency / retry / duplicate | SCORE-04 (acerto repetido não pontua de novo) |
| Auth boundaries & rate limits | SCORE-05 — pontuação é exclusivamente server-side; N/A quanto a rate limit, o jogo não tem throttle e a feature não adiciona endpoint |
| Concurrency / ordering | SCORE-01 e SCORE-02 — a soma deriva de `rank`, atribuído em sequência no laço de eventos single-threaded do Node; a feature não introduz concorrência nova |
| Data lifecycle / expiry | SCORE-09 (saída descarta), SCORE-16 (sala descartada descarta o placar) |
| Observability | N/A — o projeto não tem infraestrutura de log, métrica ou tracing, e a feature não introduz uma |
| External-dependency failure | N/A — a feature não faz nenhuma chamada externa; o cálculo é aritmética sobre estado em memória |
| State-transition integrity | SCORE-06 (nova rodada preserva total), SCORE-17 (troca de anfitrião não altera totais) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SCORE-01 | P1: Pontuar por posição | Tasks | In progress (T2) |
| SCORE-02 | P1: Pontuar por posição | Tasks | Pending |
| SCORE-03 | P1: Pontuar por posição | Tasks | Pending |
| SCORE-04 | P1: Pontuar por posição | Tasks | Pending |
| SCORE-05 | P1: Pontuar por posição | Tasks | In progress (T1) |
| SCORE-06 | P1: Acumular entre rodadas | Tasks | Pending |
| SCORE-07 | P1: Acumular entre rodadas | Tasks | Pending |
| SCORE-08 | P1: Acumular entre rodadas | Tasks | Pending |
| SCORE-09 | P1: Acumular entre rodadas | Tasks | Pending |
| SCORE-10 | P1: Ver o placar | Tasks | Pending |
| SCORE-11 | P1: Ver o placar | Tasks | Pending |
| SCORE-12 | P1: Ver o placar | Tasks | Pending |
| SCORE-13 | P1: Ver o placar | Tasks | Pending |
| SCORE-14 | P1: Ver o placar | Tasks | Pending |
| SCORE-15 | P2: Integridade sob movimentação | Tasks | Pending |
| SCORE-16 | P2: Integridade sob movimentação | Tasks | Pending |
| SCORE-17 | P2: Integridade sob movimentação | Tasks | Pending |
| SCORE-18 | P2: Integridade sob movimentação | Tasks | Pending |

**ID format:** `SCORE-[NUMBER]`

**Coverage:** 18 total, 0 mapeados para tasks ainda.

---

## Success Criteria

- [ ] Numa sala de 4 com todos acertando, a rodada distribui exatamente 4, 3, 2 e 1 pontos.
- [ ] Após 3 rodadas, o total de cada jogador é igual à soma verificável das 3 rodadas.
- [ ] Uma queda e reconexão no meio da sessão preserva 100% do total.
- [ ] O placar aparece nas três fases pedidas e some antes da primeira rodada.
- [ ] `npm test` e `npm run typecheck` continuam verdes.
