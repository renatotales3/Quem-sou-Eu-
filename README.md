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

## Deploy na Vercel + Railway

A interface é estática e vai para a Vercel. O servidor precisa de um processo
Node vivo — Socket.IO mantém a conexão aberta e o estado das salas mora na
memória do processo — então ele vai para a Railway.

**O servidor não pode rodar em mais de uma réplica.** Salas, jogadores,
personagens já usados e os instantes da rodada vivem num `Map` em
`server/game.ts`. Com duas réplicas, quem cria a sala cai numa e quem entra com
o código cai na outra, que nunca ouviu falar dela — o convidado recebe "Essa
sala não existe mais". Por isso `railway.json` fixa `numReplicas: 1`. Escalar
horizontalmente exigiria mover o estado para Redis e adotar o adapter do
Socket.IO. Pelo mesmo motivo o jogo não roda em plataforma serverless.

### 1. Servidor na Railway

Aponte a Railway para o repositório. O `railway.json` já define build
(`npm run build:server`), start (`npm start`) e healthcheck (`/healthz`).

Variáveis:

| Variável | Valor |
| --- | --- |
| `PUBLIC_ORIGIN` | `https://SEU-APP.vercel.app,https://*.vercel.app` |
| `ROOM_TTL_MINUTES` | `30` |

Não defina `PORT` nem `HOST`: a Railway injeta `PORT` e o servidor já escuta em
`0.0.0.0`. Gere o domínio público e guarde a URL.

Sem `dist/`, o servidor sobe em modo api-only: `/` responde um JSON de
identificação e só `/healthz` e `/socket.io` ficam de pé. É o esperado — a
interface está na Vercel.

### 2. Interface na Vercel

Importe o mesmo repositório. O `vercel.json` já define build
(`npm run build:web`) e saída (`dist`).

| Variável | Valor |
| --- | --- |
| `VITE_SERVER_URL` | `https://SEU-APP.up.railway.app` |

`VITE_SERVER_URL` é lida em **tempo de build**, não em runtime: trocar o valor
exige um novo deploy da interface, não basta salvar a variável.

### 3. Fechar o círculo

A ordem tem uma dependência circular: a Vercel precisa da URL da Railway, e o
`PUBLIC_ORIGIN` da Railway precisa da URL da Vercel. Suba a Railway primeiro,
depois a Vercel, e então volte na Railway para ajustar `PUBLIC_ORIGIN` com o
domínio real. O curinga `https://*.vercel.app` cobre os preview deploys, que
ganham um subdomínio novo a cada branch.

Para conferir se ficou de pé:

```bash
curl https://SEU-APP.up.railway.app/healthz
# {"ok":true,"rooms":0}
```

Se a interface abrir mas ficar em "desconectado", quase sempre é `PUBLIC_ORIGIN`
sem o domínio da Vercel — o navegador mostra o erro de CORS no console.

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
