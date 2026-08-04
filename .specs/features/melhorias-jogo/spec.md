# Melhorias do Jogo: Wordlist PT-BR, Pool sem Repetição e Cronômetro

## Problem Statement

O catálogo de personagens está majoritariamente em inglês (`Spider-Man`, `Bugs Bunny`, `Snow White`), o que quebra a experiência de um jogo falado em português. Além disso, `pickCharacters()` sorteia do catálogo inteiro a cada rodada sem memória, então a mesma sala pode receber o mesmo personagem em rodadas seguidas — o grupo já sabe a resposta. E não há nenhuma noção de tempo: ninguém sabe há quanto tempo a rodada corre nem quem foi rápido.

## Goals

- [ ] Todos os nomes exibidos em PT-BR, na forma que o brasileiro reconhece, com zero nome em inglês na tela
- [ ] Zero repetição de personagem entre rodadas da mesma sala, enquanto o catálogo não esgotar
- [ ] Tempo decorrido da rodada visível durante o jogo e duração de cada acerto visível no placar final

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Limite de tempo / contagem regressiva | O usuário pediu observabilidade ("ver a quanto tempo está acontecendo"), não pressão. Ninguém perde por estourar tempo. |
| Cronômetro total da sala (soma das rodadas) | Oferecido e não selecionado pelo usuário. |
| Ranking por tempo acumulado entre rodadas | Nenhuma persistência de placar entre rodadas foi pedida. |
| Persistir tempos ou personagens usados após restart do servidor | O estado das salas já é in-memory por decisão do projeto (README, seção Produção). |
| Adicionar novos personagens ao catálogo | O pedido é traduzir o catálogo existente, não expandi-lo. |
| Traduzir os nomes das categorias | São marcas e gêneros já usados em PT-BR (`Marvel`, `DC`, `Videogames`). |

---

## Assumptions & Open Questions

Toda ambiguidade resolvida ou registrada aqui.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Critério de tradução dos nomes | Nome oficial da localização brasileira: traduz o que tem versão consagrada (`Homem-Aranha`, `Pernalonga`, `Frodo Bolseiro`), mantém o que no Brasil já é assim (`Batman`, `Goku`, `Luke Skywalker`) | Traduzir à força produziria nomes que ninguém reconhece (`Homem-Morcego`), o oposto do objetivo do jogo | y |
| Nome em inglês após a tradução | Mantido como alias aceito no palpite, nunca exibido | Não punir quem conhece o personagem pelo nome original; o requisito "nada de inglês" é sobre a tela | y |
| O que o cronômetro mede | Tempo da rodada atual (zera por rodada) + duração de cada acerto | Selecionado pelo usuário; tempo total da sala foi oferecido e recusado | y |
| Comportamento quando o pool da sala esgota | Recicla o catálogo inteiro e avisa a sala | ~280 personagens: com 12 jogadores só esgota na 24ª rodada da mesma sala; travar o jogo do grupo seria pior que repetir | y |
| Cronômetro é crescente, sem limite | Contagem crescente, rodada nunca termina por tempo | Decorre do escopo acordado (limite de tempo está em Out of Scope) | y |
| Escopo do "sem repetição" | Por sala, não global entre salas | "Na mesma sessão" descreve a sala em que se está jogando; salas independentes não compartilham estado | y |
| Personagens de uma rodada abortada (jogador saiu no meio, `resetAfterDeparture`) | Continuam marcados como usados | Os outros jogadores já viram esses personagens; devolvê-los ao pool reintroduziria a repetição que a feature elimina | y |
| Fonte da verdade do tempo | Relógio do servidor; o cliente sincroniza uma defasagem e só faz a contagem visual | Relógio errado na máquina do jogador não pode alterar o tempo exibido nem o registrado | y |
| Nomes cuja forma brasileira eu não souber com certeza | Verificar na Wikipédia PT antes de escrever; se não houver forma brasileira estabelecida, manter o nome original | Regra 5 do CodeNavi: verificar contra a fonte, não contra a memória | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Catálogo em português brasileiro ⭐ MVP

**User Story**: Como jogador brasileiro, quero ver os personagens com o nome que eu uso no dia a dia, para não precisar traduzir de cabeça durante a rodada.

**Why P1**: É o pedido central. Um jogo em português com cartas em inglês é incoerente e atrapalha o palpite.

**Acceptance Criteria**:

1. The system SHALL exibir todo `Character.name` na forma da localização oficial brasileira, sem nome em inglês. <!-- ubiquitous -->
2. WHEN um personagem tem nome oficial brasileiro distinto do original THEN o catálogo SHALL usar a forma brasileira como `name` e o nome original em inglês como alias. <!-- event-driven -->
3. WHEN o jogador digita o nome original em inglês de um personagem traduzido THEN o servidor SHALL aceitar o palpite como correto. <!-- event-driven -->
4. WHEN o jogador digita o nome brasileiro sem acentuação THEN o servidor SHALL aceitar o palpite como correto. <!-- event-driven -->
5. The system SHALL manter no mínimo 250 entradas no catálogo, com `id` único e `name` normalizado único. <!-- ubiquitous -->
6. IF um nome em inglês do mapa de tradução aparecer como `name` exibido THEN a suíte de testes SHALL falhar. <!-- unwanted-behavior -->

**Independent Test**: Rodar `npm test` — a suíte verifica que nenhum nome em inglês do mapa de tradução sobrou como nome exibido, e que palpites em inglês e sem acento acertam.

---

### P2: Sem personagem repetido na mesma sala

**User Story**: Como jogador em uma sala com várias rodadas, quero que nenhum personagem apareça duas vezes, para que ninguém já saiba a resposta de antemão.

**Why P2**: Depende do P1 estar estável (mexe no mesmo módulo), mas é independente dele em comportamento e testável sozinho.

**Acceptance Criteria**:

1. WHEN uma rodada inicia THEN o servidor SHALL atribuir somente personagens ainda não atribuídos em rodadas anteriores daquela sala. <!-- event-driven -->
2. WHILE uma rodada está em andamento, o servidor SHALL garantir que dois jogadores da sala não tenham o mesmo personagem. <!-- state-driven -->
3. The system SHALL manter o registro de personagens usados por sala, de forma que salas distintas possam sortear os mesmos personagens. <!-- ubiquitous -->
4. IF os personagens disponíveis na sala forem menos que o número de jogadores THEN o servidor SHALL liberar o catálogo inteiro novamente antes de sortear. <!-- unwanted-behavior -->
5. WHEN o catálogo é reciclado por esgotamento THEN o servidor SHALL informar a sala com o evento `room:notice` e a mensagem `Os personagens deram a volta: o catálogo foi liberado de novo.` <!-- event-driven -->
6. WHEN uma rodada é abortada porque um jogador saiu THEN o servidor SHALL manter os personagens daquela rodada marcados como usados. <!-- event-driven -->
7. WHEN a sala é removida THEN o servidor SHALL descartar o registro de personagens usados junto com ela. <!-- event-driven -->

**Independent Test**: Criar uma sala com 2 jogadores, jogar 3 rodadas seguidas e verificar que os 6 personagens atribuídos são todos distintos.

---

### P3: Cronômetro da rodada e tempo de cada acerto

**User Story**: Como jogador, quero ver há quanto tempo a rodada corre e quanto cada pessoa levou para acertar, para saber o ritmo do jogo e comparar desempenho.

**Why P3**: Feature de acompanhamento — o jogo funciona sem ela, mas ela é o que dá noção de ritmo e disputa.

**Acceptance Criteria**:

1. WHEN uma rodada inicia THEN o servidor SHALL registrar o instante de início da rodada e enviá-lo a todos os jogadores. <!-- event-driven -->
2. WHILE a rodada está em andamento, a interface SHALL exibir o tempo decorrido no formato `mm:ss`, atualizado a cada segundo. <!-- state-driven -->
3. WHEN um jogador acerta o palpite THEN o servidor SHALL registrar a duração em milissegundos entre o início da rodada e o acerto. <!-- event-driven -->
4. WHEN a rodada termina THEN o placar final SHALL exibir a duração do acerto de cada jogador ao lado do nome. <!-- event-driven -->
5. The system SHALL derivar toda duração do relógio do servidor, nunca do relógio do cliente. <!-- ubiquitous -->
6. WHEN um jogador reconecta durante uma rodada em andamento THEN a interface SHALL retomar o cronômetro no tempo decorrido correto, sem reiniciar de zero. <!-- event-driven -->
7. WHEN o anfitrião abre uma nova rodada THEN o servidor SHALL zerar o instante de início e as durações de acerto da rodada anterior. <!-- event-driven -->
8. IF a duração a exibir for igual ou maior que 3.600.000 ms THEN a interface SHALL formatá-la como `h:mm:ss`. <!-- unwanted-behavior -->
9. The system SHALL nunca encerrar uma rodada por decurso de tempo. <!-- ubiquitous -->

**Independent Test**: Iniciar uma rodada, acertar após um intervalo conhecido e verificar que a duração registrada corresponde ao intervalo e aparece no placar final.

---

## Edge Cases

- IF um jogador nunca acertar e a rodada for abortada THEN o sistema SHALL exibir `—` como duração dele no placar. <!-- unwanted-behavior -->
- IF o relógio do cliente estiver adiantado ou atrasado em relação ao servidor THEN a interface SHALL exibir o tempo do servidor, com erro máximo de 1 segundo. <!-- unwanted-behavior -->
- WHEN a rodada é reiniciada por saída de jogador THEN o cronômetro SHALL desaparecer da interface até a próxima rodada iniciar. <!-- event-driven -->
- IF `pickCharacters` for chamado com um número maior que o catálogo inteiro THEN a função SHALL retornar no máximo o catálogo inteiro, sem repetir entradas. <!-- unwanted-behavior -->
- WHEN um personagem tem alias que colide com o alias de outro personagem THEN o servidor SHALL continuar avaliando o palpite apenas contra o personagem do próprio jogador. <!-- event-driven -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| WORD-01 | P1: Catálogo em português brasileiro | Design | Pending |
| WORD-02 | P1: Catálogo em português brasileiro | Design | Pending |
| WORD-03 | P1: Catálogo em português brasileiro | Design | Pending |
| WORD-04 | P1: Catálogo em português brasileiro | Design | Pending |
| WORD-05 | P1: Catálogo em português brasileiro | Design | Pending |
| WORD-06 | P1: Catálogo em português brasileiro | Design | Pending |
| POOL-01 | P2: Sem personagem repetido na mesma sala | Design | Pending |
| POOL-02 | P2: Sem personagem repetido na mesma sala | Design | Pending |
| POOL-03 | P2: Sem personagem repetido na mesma sala | Design | Pending |
| POOL-04 | P2: Sem personagem repetido na mesma sala | Design | Pending |
| POOL-05 | P2: Sem personagem repetido na mesma sala | Design | Pending |
| POOL-06 | P2: Sem personagem repetido na mesma sala | Design | Pending |
| POOL-07 | P2: Sem personagem repetido na mesma sala | Design | Pending |
| TIME-01 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |
| TIME-02 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |
| TIME-03 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |
| TIME-04 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |
| TIME-05 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |
| TIME-06 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |
| TIME-07 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |
| TIME-08 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |
| TIME-09 | P3: Cronômetro da rodada e tempo de cada acerto | Design | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 22 total, 0 mapped to tasks, 22 unmapped ⚠️

---

## Success Criteria

- [ ] `npm test` passa, incluindo os novos testes de tradução, de pool sem repetição e de duração de acerto
- [ ] `npm run build` passa (typecheck do app + do servidor + bundle)
- [ ] Nenhum nome em inglês do mapa de tradução aparece como nome exibido no catálogo
- [ ] Três rodadas seguidas na mesma sala com 2 jogadores produzem 6 personagens distintos
- [ ] O privacy check existente continua passando: o personagem do próprio jogador nunca aparece no payload dele durante a rodada
