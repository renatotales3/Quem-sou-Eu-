# Quem Sou Eu?

Jogo multiplayer em tempo real para descobrir o personagem da sua própria testa.

## Catálogo de personagens

A wordlist é curada com mais de 500 nomes muito conhecidos de filmes, séries, quadrinhos, animações, anime, videogames, literatura, cultura brasileira, música, esportes e história. A seleção prioriza protagonistas e ícones populares, evitando personagens de nicho.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra <http://localhost:5173> em duas janelas ou dispositivos. O Vite serve a interface e encaminha o Socket.IO para o Node em `localhost:3001`.

## Produção

```bash
npm run build
npm start
```

O mesmo processo Node serve `dist/`, o endpoint `/healthz` e os WebSockets. As salas ficam em memória e são perdidas quando o processo reinicia.

## Deploy na Vercel + Render

A interface é estática e vai para a Vercel. O servidor precisa de um processo
Node vivo — Socket.IO mantém a conexão aberta e o estado das salas mora na
memória do processo — então ele vai para o Render, que tem plano gratuito.

**O servidor não pode rodar em mais de uma instância.** Salas, jogadores,
personagens já usados e os instantes da rodada vivem num `Map` em
`server/game.ts`. Com duas instâncias, quem cria a sala cai numa e quem entra
com o código cai na outra, que nunca ouviu falar dela — o convidado recebe
"Essa sala não existe mais". O plano gratuito do Render não escala além de uma
instância, o que aqui é uma vantagem. Escalar horizontalmente exigiria mover o
estado para Redis e adotar o adapter do Socket.IO. Pelo mesmo motivo o jogo não
roda em plataforma serverless.

### O que o plano gratuito custa

O Render hiberna um serviço gratuito após 15 minutos sem receber requisição
HTTP nem mensagem WebSocket, e voltar leva cerca de um minuto. Na prática:

- **Durante a partida ele não hiberna.** O Socket.IO troca ping/pong a cada
  ~25s, e desde fevereiro de 2026 mensagem WebSocket conta como atividade.
- **A primeira pessoa do dia espera ~1 min.** O cliente trata isso: bate no
  `/healthz` para acordar o servidor antes de abrir o socket, mostra "acordando
  servidor" e explica a espera na tela, em vez de acusar erro de conexão.
- **Sala parada 15+ min é perdida.** O estado é em memória. O TTL padrão de
  salas já é 30 min, então na prática pouco muda.
- São 750 horas de instância por mês, o que cobre um serviço rodando o mês
  inteiro.

### 1. Servidor no Render

Aponte o Render para o repositório. O `render.yaml` já define plano, build
(`npm ci && npm run build:server`), start (`npm start`) e healthcheck
(`/healthz`).

Variáveis:

| Variável | Valor |
| --- | --- |
| `PUBLIC_ORIGIN` | `https://SEU-APP.vercel.app,https://*.vercel.app` |
| `ROOM_TTL_MINUTES` | `30` |

Não defina `PORT` nem `HOST`: o Render injeta `PORT` e o servidor já escuta em
`0.0.0.0`. Guarde a URL `.onrender.com`.

Sem `dist/`, o servidor sobe em modo api-only: `/` responde um JSON de
identificação e só `/healthz` e `/socket.io` ficam de pé. É o esperado — a
interface está na Vercel.

### 2. Interface na Vercel

Importe o mesmo repositório. O `vercel.json` já define build
(`npm run build:web`) e saída (`dist`).

| Variável | Valor |
| --- | --- |
| `VITE_SERVER_URL` | `https://SEU-APP.onrender.com` |

`VITE_SERVER_URL` é lida em **tempo de build**, não em runtime: trocar o valor
exige um novo deploy da interface, não basta salvar a variável.

### 3. Fechar o círculo

A ordem tem uma dependência circular: a Vercel precisa da URL do Render, e o
`PUBLIC_ORIGIN` do Render precisa da URL da Vercel. Suba o Render primeiro,
depois a Vercel, e então volte no Render para ajustar `PUBLIC_ORIGIN` com o
domínio real. O curinga `https://*.vercel.app` cobre os preview deploys, que
ganham um subdomínio novo a cada branch.

Para conferir se ficou de pé:

```bash
curl https://SEU-APP.onrender.com/healthz
# {"ok":true,"rooms":0}
```

Se a interface abrir mas ficar em "desconectado", quase sempre é
`PUBLIC_ORIGIN` sem o domínio da Vercel — o navegador mostra o erro de CORS no
console.

> O `railway.json` continua no repositório e funciona do mesmo jeito, caso você
> queira voltar para a Railway. As variáveis são as mesmas.

## Docker

Também é possível publicar com Docker:

```bash
docker build -t quem-sou-eu .
docker run --rm -p 3001:3001 quem-sou-eu
```

Para subir o stack completo com Node, Nginx e um Cloudflare Quick Tunnel:

```bash
docker compose up --build -d
docker compose logs -f tunnel
```

O único endereço exposto no computador é `http://localhost:8080`. O log do serviço `tunnel` mostra uma URL `https://*.trycloudflare.com` para compartilhar com os amigos. O túnel é temporário e muda quando o serviço é recriado.

Para encerrar tudo:

```bash
docker compose down
```

Variáveis disponíveis estão em `.env.example`:

- `PORT`: porta HTTP/WebSocket, padrão `3001`.
- `HOST`: endereço de escuta, padrão `0.0.0.0`.
- `PUBLIC_ORIGIN`: origens permitidas pelo Socket.IO. Aceita lista separada por
  vírgula e `*` num rótulo de subdomínio (`https://*.vercel.app`). Vazio reflete
  qualquer origem — use só em desenvolvimento.
- `ROOM_TTL_MINUTES`: tempo de retenção de salas sem conexões.
- `VITE_SERVER_URL`: URL do servidor Socket.IO, lida em tempo de build da
  interface. Vazia quando um processo só serve tudo.

## Privacidade da rodada

O personagem atribuído fica somente na memória do servidor. Durante a rodada, o servidor cria uma visão diferente para cada socket: cada jogador recebe os personagens dos outros e não recebe o próprio. O quadro completo só é enviado no evento `round:finished`, depois que todos acertarem.

O `sessionStorage` do navegador guarda apenas código da sala, apelido, identificador do jogador e token de reconexão — nunca o personagem secreto.

## Verificações

```bash
npm test
npm run build
```
