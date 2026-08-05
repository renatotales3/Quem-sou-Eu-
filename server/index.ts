import path from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../shared/protocol';
import { createGameManager } from './game';
import { parseAllowedOrigins } from './origins';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: parseAllowedOrigins(process.env.PUBLIC_ORIGIN),
    credentials: true,
  },
});
const gameManager = createGameManager(io);

app.disable('x-powered-by');
app.get('/healthz', (_request, response) => {
  response.json({ ok: true, rooms: gameManager.getRoomCount() });
});

// Num deploy dividido (interface na Vercel, servidor na Railway) o servidor é
// buildado sem `dist/`. Servir estático nesse caso faria a raiz responder erro
// ao tentar enviar um index.html inexistente, então a interface só entra na
// rota quando de fato foi buildada junto — o caso do Docker e do `npm start`
// local, em que um processo serve as duas coisas.
const clientDist = path.resolve(process.cwd(), 'dist');
const servesClient = existsSync(path.join(clientDist, 'index.html'));

if (servesClient) {
  app.use(express.static(clientDist));
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/socket.io')) {
      next();
      return;
    }
    response.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_request, response) => {
    response.json({ service: 'quem-sou-eu', mode: 'api-only', healthz: '/healthz' });
  });
}

io.on('connection', (socket) => {
  gameManager.bindSocket(socket);
});

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';
httpServer.listen(port, host, () => {
  console.log(`Quem Sou Eu ouvindo em http://${host}:${port}`);
});

const shutdown = (): void => {
  gameManager.dispose();
  io.close();
  httpServer.close(() => process.exit(0));
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
