# Fotos dos Personagens nos Cards

## Problem Statement

O card mostra nome e categoria do personagem dos outros jogadores, e nada mais. Quem não conhece o nome — "Satoru Gojo", "Beatrix Kiddo" — não consegue descrever nem ajudar, mesmo reconhecendo a cara. Uma foto no card resolve isso sem vazar resposta, porque o jogador nunca recebe o próprio personagem.

## Goals

- [ ] Foto no card do personagem dos outros jogadores, onde exista imagem livre e reconhecível
- [ ] Crédito de autor e licença exibido para toda imagem que exija atribuição
- [ ] Zero requisição à Wikipédia em runtime e zero asset hospedado por nós
- [ ] Card sem imagem continua exatamente como é hoje

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Cobertura de 100% do catálogo | Personagem de ficção quase não tem imagem livre boa; medição numa amostra de 28 deu 78% de cobertura bruta, e parte dela é cosplay, estátua de cera e grafite. O fallback é parte do desenho, não falha. |
| Imagens em fair use da Wikipédia local | Fair use não se estende a um site terceiro. Só entram arquivos do Commons com licença livre. |
| Hospedar ou fazer proxy das imagens | O pedido é justamente não servir assets; a URL final é do `upload.wikimedia.org`. |
| Upload de imagem pelo anfitrião | Não pedido, e abriria moderação de conteúdo. |
| Buscar imagem em runtime | Latência, limite de requisição e dependência externa durante a partida. Resolvido em curadoria. |
| Imagem para o próprio personagem | É a resposta que o jogador precisa descobrir. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Fonte das imagens | Wikidata P18 → arquivo no Wikimedia Commons | P18 sempre aponta para o Commons, então é livre por construção; `pageimages` da Wikipédia pode devolver arquivo local em fair use | y |
| Momento da resolução | Curadoria (script rodado à mão), URLs gravadas no repositório | Elimina dependência de runtime e, principalmente, permite revisar cada imagem antes de entrar | y |
| Critério de aprovação | Um brasileiro reconhece o personagem na imagem | A medição mostrou grafite do Vegeta e Pernalonga pintado em caça: cobertura não é qualidade | y |
| Quem revisa | Triagem automática por nome de arquivo e categoria do Commons, depois revisão visual das sobreviventes | Nome de arquivo já denuncia os piores casos (`FB-111 Bugs Bunny Nose Art`), mas só olhar resolve os ambíguos | y |
| Tamanho da imagem | Thumbnail de 320px de largura, via `iiurlwidth` | Card é pequeno; puxar o original desperdiça banda do Commons e do jogador | y |
| Atribuição | Autor e licença gravados por imagem e exibidos na interface | CC BY e CC BY-SA exigem atribuição; verificado na API que os metadados existem | y |
| Personagem sem imagem aprovada | Mantém o card atual, inicial e cor | Já é um visual desenhado e funcional; ausência de foto não pode virar espaço vazio | y |
| Licença de domínio público | Registrada como tal, crédito exibido de todo modo | Não é exigido, mas é barato e honesto | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Foto no card dos outros jogadores ⭐ MVP

**User Story**: Como jogador, quero ver a foto do personagem que está na testa dos outros, para conseguir descrever mesmo quando não reconheço o nome.

**Why P1**: É o pedido. Sem isso não há feature.

**Acceptance Criteria**:

1. WHEN o personagem de outro jogador tem imagem aprovada THEN o card SHALL exibir a imagem junto do nome e da categoria. <!-- event-driven -->
2. WHILE um personagem não tem imagem aprovada, o card SHALL manter o visual atual de inicial e cor, sem espaço reservado vazio. <!-- state-driven -->
3. IF a imagem falhar ao carregar THEN o card SHALL cair para o visual de inicial e cor. <!-- unwanted-behavior -->
4. The system SHALL continuar exibindo nome e categoria em todo card com imagem — a foto complementa, nunca substitui o texto. <!-- ubiquitous -->

**Independent Test**: Iniciar rodada com 2 jogadores e conferir que o card do outro mostra a foto quando o personagem sorteado tem imagem, e o visual atual quando não tem.

---

### P1: Catálogo de imagens livre e verificável ⭐ MVP

**User Story**: Como responsável pelo projeto, quero que as imagens sejam livres, creditadas e resolvidas fora do runtime, para não ter risco de licença nem dependência externa em partida.

**Why P1**: Sem isso a feature é um risco jurídico e um ponto de falha em produção.

**Acceptance Criteria**:

1. The system SHALL usar somente arquivos do Wikimedia Commons, nunca arquivos locais da Wikipédia em fair use. <!-- ubiquitous -->
2. The system SHALL registrar autor e licença de cada imagem aprovada. <!-- ubiquitous -->
3. The system SHALL NOT requisitar a Wikipédia, o Wikidata ou o Commons em tempo de execução, nem no servidor nem no cliente. <!-- ubiquitous -->
4. IF uma entrada do catálogo de imagens referenciar um personagem inexistente THEN a suíte de testes SHALL falhar. <!-- unwanted-behavior -->
5. The system SHALL apontar para thumbnail de no máximo 320px de largura, não para o arquivo original. <!-- ubiquitous -->
6. WHEN uma imagem aprovada exigir atribuição THEN a interface SHALL exibir autor e licença de forma acessível. <!-- event-driven -->

**Independent Test**: Rodar `npm test` — a suíte verifica que toda entrada casa com um personagem existente, que toda URL é do domínio do Commons com largura limitada, e que toda imagem tem autor e licença.

---

### P2: Privacidade preservada com o campo novo

**User Story**: Como jogador, quero que a foto do meu personagem nunca chegue ao meu navegador, para não descobrir a resposta por acidente.

**Why P2**: A invariante já existe para o nome; o campo novo é um vetor de vazamento novo e precisa da mesma proteção explícita.

**Acceptance Criteria**:

1. The system SHALL nunca incluir a imagem do próprio personagem no payload enviado ao jogador durante a rodada. <!-- ubiquitous -->
2. IF o payload de um jogador contiver a URL da imagem do próprio personagem THEN a suíte de testes SHALL falhar. <!-- unwanted-behavior -->
3. WHEN a rodada termina THEN o quadro revelado SHALL incluir a imagem de todos, inclusive a do próprio jogador. <!-- event-driven -->

**Independent Test**: Rodada com 2 jogadores; conferir que a URL da imagem do próprio personagem não aparece no payload durante a rodada e aparece depois do `round:finished`.

---

## Edge Cases

- IF o Commons devolver imagem sem autor declarado THEN a curadoria SHALL rejeitar a entrada em vez de creditar em branco. <!-- unwanted-behavior -->
- IF o nome do personagem for renomeado no catálogo THEN a entrada de imagem órfã SHALL quebrar a suíte, nunca sumir em silêncio. <!-- unwanted-behavior -->
- WHEN a imagem tem proporção muito diferente da do card THEN o card SHALL recortar sem distorcer. <!-- event-driven -->
- IF o jogador estiver com conexão lenta THEN o card SHALL exibir nome e categoria antes da imagem carregar. <!-- unwanted-behavior -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CARD-01 | P1: Foto no card dos outros jogadores | Design | Pending |
| CARD-02 | P1: Foto no card dos outros jogadores | Design | Pending |
| CARD-03 | P1: Foto no card dos outros jogadores | Design | Pending |
| CARD-04 | P1: Foto no card dos outros jogadores | Design | Pending |
| IMG-01 | P1: Catálogo de imagens livre e verificável | Design | Implementing |
| IMG-02 | P1: Catálogo de imagens livre e verificável | Design | Implementing |
| IMG-03 | P1: Catálogo de imagens livre e verificável | Design | Pending |
| IMG-04 | P1: Catálogo de imagens livre e verificável | Design | Pending |
| IMG-05 | P1: Catálogo de imagens livre e verificável | Design | Pending |
| IMG-06 | P1: Catálogo de imagens livre e verificável | Design | Implementing |
| PRIV-01 | P2: Privacidade preservada com o campo novo | Design | Pending |
| PRIV-02 | P2: Privacidade preservada com o campo novo | Design | Pending |
| PRIV-03 | P2: Privacidade preservada com o campo novo | Design | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 13 total, 0 mapped to tasks, 13 unmapped ⚠️

---

## Success Criteria

- [ ] `npm test` e `npm run build` passam
- [ ] Toda entrada de imagem casa com um personagem existente, com autor e licença preenchidos
- [ ] A URL da imagem do próprio personagem não aparece no payload do jogador durante a rodada
- [ ] Nenhuma requisição a domínio da Wikimedia no código de servidor ou de cliente
- [ ] Card sem imagem visualmente idêntico ao de hoje
