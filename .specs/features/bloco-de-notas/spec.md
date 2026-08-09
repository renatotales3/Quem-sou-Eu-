# Bloco de Notas do Jogador — Specification

## Problem Statement

Durante a rodada o jogador acumula respostas faladas na call ("não sou homem", "sou desenho", "sou dos anos 90") e precisa segurar tudo de cabeça enquanto formula a próxima pergunta. Quem esquece uma resposta já dada repete a pergunta e queima a vez. Não existe hoje nenhum lugar dentro do jogo para registrar essas deduções, então o jogador recorre a papel ou a um app fora da aba — e sai do jogo para isso.

## Goals

- [ ] O jogador registra e consulta suas deduções sem sair da tela da partida.
- [ ] As anotações sobrevivem a um reload acidental da mesma rodada.
- [ ] Uma rodada nova começa com o bloco vazio, sem deduções do personagem anterior.
- [ ] Nenhuma anotação trafega para o servidor nem para outros jogadores.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Compartilhar notas entre jogadores | O bloco é o raciocínio privado de quem está adivinhando; expor entrega o jogo. |
| Notas estruturadas (pergunta + sim/não/talvez) | Decidido texto livre para zero atrito no meio da call. Pode virar feature futura. |
| Histórico de notas de rodadas anteriores | A rodada acabou e o personagem foi revelado; a nota perde a função. |
| Persistir notas no servidor / entre dispositivos | Exigiria protocolo, storage e autorização novos para um ganho marginal numa partida de minutos. |
| Formatação rica (negrito, listas, markdown) | Um `textarea` cobre o caso de uso; formatação é atrito. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo de persistência das notas | `sessionStorage`, chave por sala + rodada | Espelha o padrão já usado em `src/socket.ts` para a sessão; sobrevive ao reload e morre com a aba, o que é o tempo de vida certo para uma dedução. | y |
| Formato de entrada | Texto livre num `textarea` | Menor atrito possível enquanto o jogador está falando na call. | y |
| Cobertura de teste | Lógica pura em `src/notes.ts` testada em Node com storage falso; UI por UAT interativo | O projeto não tem `jsdom` nem testing-library, e todos os 4 testes existentes são Node puro. Manter o padrão evita 3 devDependencies e config nova. | y |
| Limite de tamanho da nota | 2000 caracteres | `sessionStorage` tem cota de poucos MB por origem e é compartilhado com a sessão do jogo; 2000 caracteres cobrem com folga as deduções de uma rodada sem risco de estourar a cota e derrubar a sessão. | n |
| Estado inicial do painel | Fechado | O jogo é a tela principal; o bloco é auxiliar e não deve cobrir os jogadores ao entrar na rodada. | n |
| Visibilidade do botão | Só na fase `playing` | No lobby não há personagem para deduzir e em `finished` a resposta já foi revelada. | n |
| Salvamento | A cada alteração do texto (sem botão "salvar") | Um botão de salvar cria um estado "digitado mas perdido"; salvar direto elimina a classe inteira de erro. | n |

**Open questions:** none — tudo resolvido ou registrado acima.

---

## User Stories

### P1: Anotar deduções durante a rodada ⭐ MVP

**User Story**: Como jogador numa partida, quero abrir um bloco de notas sobre a tela do jogo e escrever o que já descobri, para estruturar meu raciocínio sem sair da aba nem depender da memória.

**Why P1**: É a feature inteira. Sem escrever e reler o texto não há nada.

**Acceptance Criteria**:

1. WHILE a sala está na fase `playing`, o sistema SHALL exibir um botão flutuante de acesso ao bloco de notas sobre a tela da partida. <!-- NOTES-01 -->
2. WHILE a sala está nas fases `lobby` ou `finished`, o sistema SHALL NOT exibir o botão flutuante nem o painel de notas. <!-- NOTES-02 -->
3. WHEN o jogador aciona o botão flutuante com o painel fechado THEN o sistema SHALL abrir o painel de notas com o conteúdo salvo da rodada atual. <!-- NOTES-03 -->
4. WHEN o jogador aciona o botão flutuante com o painel aberto THEN o sistema SHALL fechar o painel preservando o conteúdo digitado. <!-- NOTES-04 -->
5. WHEN o jogador altera o texto do bloco THEN o sistema SHALL gravar o texto no `sessionStorage` sob uma chave derivada do código da sala e do número da rodada. <!-- NOTES-05 -->

**Independent Test**: Entrar numa sala, iniciar a rodada, abrir o bloco, digitar "não sou homem", fechar e reabrir — o texto continua lá.

---

### P1: Sobreviver ao reload e zerar a cada rodada ⭐ MVP

**User Story**: Como jogador, quero que minhas anotações resistam a um F5 acidental mas comecem em branco a cada rodada nova, para não perder o raciocínio da partida atual nem me confundir com deduções de um personagem que já acabou.

**Why P1**: Sem isso o bloco é menos confiável que um papel — um refresh apaga tudo e uma rodada nova herda deduções erradas.

**Acceptance Criteria**:

1. WHEN o jogador recarrega a página e volta para a mesma sala na mesma rodada THEN o sistema SHALL restaurar no bloco exatamente o texto gravado antes do reload. <!-- NOTES-06 -->
2. WHEN o número da rodada da sala avança THEN o sistema SHALL apresentar o bloco vazio, sem o texto da rodada anterior. <!-- NOTES-07 -->
3. WHEN o jogador aciona o comando de limpar THEN o sistema SHALL esvaziar o texto do bloco e remover a entrada correspondente do `sessionStorage`. <!-- NOTES-08 -->

**Independent Test**: Digitar uma nota, dar F5 e confirmar que voltou; jogar a rodada até o fim, começar a próxima e confirmar que o bloco está vazio.

---

### P2: Bloco confiável e acessível

**User Story**: Como jogador, quero que o bloco nunca quebre a partida e funcione por teclado, para poder confiar nele no meio de uma call.

**Why P2**: Não é o caminho feliz, mas é o que separa uma feature usável de uma que derruba o jogo num navegador com storage bloqueado.

**Acceptance Criteria**:

1. IF a leitura do `sessionStorage` falhar ou devolver conteúdo inválido THEN o sistema SHALL abrir o bloco vazio e manter o restante do jogo funcionando, sem lançar erro para a interface. <!-- NOTES-09 -->
2. IF a gravação no `sessionStorage` falhar THEN o sistema SHALL manter o texto digitado visível na sessão em memória e não interromper a partida. <!-- NOTES-10 -->
3. IF o texto informado exceder 2000 caracteres THEN o sistema SHALL truncar o valor gravado em 2000 caracteres. <!-- NOTES-11 -->
4. WHEN o painel está aberto e o jogador pressiona `Escape` THEN o sistema SHALL fechar o painel preservando o conteúdo. <!-- NOTES-12 -->
5. O sistema SHALL expor o botão flutuante e o painel com rótulos acessíveis (`aria-label` e estado de expansão), coerentes com os controles já existentes em `src/App.tsx`. <!-- NOTES-13 -->

**Independent Test**: Bloquear cookies/storage do site no navegador e jogar uma rodada — o bloco abre vazio, aceita digitação e o jogo não quebra.

---

### P1: Privacidade das anotações ⭐ MVP

**User Story**: Como jogador, quero certeza de que minhas anotações são só minhas, para poder escrever palpites sem medo de entregar o jogo.

**Why P1**: O jogo já promete privacidade na tela inicial ("Seu personagem nunca é enviado para a sua tela durante a rodada"). Uma nota vazando por evento de socket quebraria essa promessa.

**Acceptance Criteria**:

1. O sistema SHALL manter as anotações exclusivamente no cliente, sem emitir nenhum evento de socket nem requisição HTTP contendo o texto das notas. <!-- NOTES-14 -->
2. O sistema SHALL gravar as notas sob chave que inclui o código da sala, de modo que salas diferentes na mesma aba não compartilhem conteúdo. <!-- NOTES-15 -->

**Independent Test**: Abrir a aba de rede/websocket do DevTools, digitar no bloco e confirmar que nenhum frame carrega o texto.

---

## Edge Cases

- IF `sessionStorage` estiver indisponível (modo restrito do navegador) THEN o sistema SHALL degradar para estado em memória — coberto por NOTES-09 e NOTES-10.
- IF a entrada gravada contiver JSON inválido ou tipo inesperado THEN o sistema SHALL tratar como bloco vazio — coberto por NOTES-09.
- WHEN o jogador entra numa segunda sala pela mesma aba THEN o bloco SHALL começar vazio — coberto por NOTES-15.
- WHEN o jogador acerta o personagem e continua na rodada THEN o bloco SHALL continuar acessível até a fase mudar — coberto por NOTES-01.

**Dimensões de requisito implícito:** input validation (NOTES-11), failure states (NOTES-09, NOTES-10), data lifecycle (NOTES-07, NOTES-08), state-transition integrity (NOTES-01, NOTES-02). Demais dimensões — idempotência, auth/rate limit, concorrência, observabilidade, dependência externa — N/A: a feature é local ao navegador de um único jogador, sem servidor, sem rede e sem estado compartilhado.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| NOTES-01 | P1: Anotar deduções | Tasks | Pending |
| NOTES-02 | P1: Anotar deduções | Tasks | Pending |
| NOTES-03 | P1: Anotar deduções | Tasks | Pending |
| NOTES-04 | P1: Anotar deduções | Tasks | Pending |
| NOTES-05 | P1: Anotar deduções | Tasks | Pending |
| NOTES-06 | P1: Reload e reset por rodada | Tasks | Pending |
| NOTES-07 | P1: Reload e reset por rodada | Tasks | Pending |
| NOTES-08 | P1: Reload e reset por rodada | Tasks | Pending |
| NOTES-09 | P2: Confiável e acessível | Tasks | Pending |
| NOTES-10 | P2: Confiável e acessível | Tasks | Pending |
| NOTES-11 | P2: Confiável e acessível | Tasks | Pending |
| NOTES-12 | P2: Confiável e acessível | Tasks | Pending |
| NOTES-13 | P2: Confiável e acessível | Tasks | Pending |
| NOTES-14 | P1: Privacidade | Tasks | Pending |
| NOTES-15 | P1: Privacidade | Tasks | Pending |

**ID format:** `NOTES-[NUMBER]`

**Coverage:** 15 total, 0 mapeados para tasks ainda.

---

## Success Criteria

- [ ] O jogador registra uma dedução em menos de 5 segundos a partir da tela da partida (um clique, digitar, sem confirmar).
- [ ] Um reload no meio da rodada preserva 100% do texto anotado.
- [ ] Uma rodada nova apresenta o bloco vazio em 100% dos casos.
- [ ] Zero frames de socket ou requisições HTTP contendo texto de nota.
- [ ] `npm test` e `npm run typecheck` continuam verdes.
