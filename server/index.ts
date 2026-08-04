import path from 'node:path';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../shared/protocol';
import { createGameManager } from './game';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: process.env.PUBLIC_ORIGIN || true,
    credentials: true,
  },
});
const gameManager = createGameManager(io);

app.disable('x-powered-by');
app.get('/healthz', (_request, response) => {
  response.json({ ok: true, rooms: gameManager.getRoomCount() });
});

const clientDist = path.resolve(process.cwd(), 'dist');
app.use(express.static(clientDist));
app.get('*', (request, response, next) => {
  if (request.path.startsWith('/socket.io')) {
    next();
    return;
  }
  response.sendFile(path.join(clientDist, 'index.html'));
});

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
