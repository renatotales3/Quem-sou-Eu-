import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  RoomActionResult,
  RoomView,
  ServerToClientEvents,
  SocketData,
} from '../shared/protocol';
import { createGameManager, MAX_PLAYERS } from '../server/game';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let ioServer: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
let address = '';
const managerClients: TestSocket[] = [];

function waitForEvent<T>(socket: TestSocket, event: keyof ServerToClientEvents, predicate?: (payload: T) => boolean): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event as never, listener as never);
      reject(new Error(`Timeout esperando ${String(event)}`));
    }, 4_000);
    const listener = (payload: T): void => {
      if (predicate && !predicate(payload)) return;
      clearTimeout(timeout);
      socket.off(event as never, listener as never);
      resolve(payload);
    };
    socket.on(event as never, listener as never);
  });
}

function connectClient(): Promise<TestSocket> {
  const client = createClient(address, { autoConnect: false, forceNew: true });
  managerClients.push(client);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout conectando cliente')), 4_000);
    client.once('connect', () => {
      clearTimeout(timeout);
      resolve(client);
    });
    client.once('connect_error', reject);
    client.connect();
  });
}

function createRoom(client: TestSocket, nickname: string): Promise<RoomActionResult> {
  return new Promise((resolve) => client.emit('room:create', { nickname }, resolve));
}

function joinRoom(client: TestSocket, code: string, nickname: string): Promise<RoomActionResult> {
  return new Promise((resolve) => client.emit('room:join', { code, nickname }, resolve));
}

beforeAll(async () => {
  httpServer = createServer();
  ioServer = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, { cors: { origin: true } });
  const manager = createGameManager(ioServer, 1);
  ioServer.on('connection', (socket) => manager.bindSocket(socket));
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const serverAddress = httpServer.address() as AddressInfo;
  address = `http://127.0.0.1:${serverAddress.port}`;
});

afterAll(async () => {
  managerClients.forEach((client) => client.disconnect());
  await new Promise<void>((resolve) => ioServer.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe('fluxo protegido de uma rodada', () => {
  it('não envia o personagem secreto para o jogador, valida palpite e revela no fim', async () => {
    const playerA = await connectClient();
    const playerB = await connectClient();
    const created = await createRoom(playerA, 'Ana');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const joined = await joinRoom(playerB, created.roomCode, 'Bia');
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;

    const startedA = waitForEvent<{ room: RoomView }>(playerA, 'round:started');
    const startedB = waitForEvent<{ room: RoomView }>(playerB, 'round:started');
    playerA.emit('player:ready', { ready: true });
    playerB.emit('player:ready', { ready: true });
    const [roundA, roundB] = await Promise.all([startedA, startedB]);

    const ownA = roundB.room.players.find((player) => player.id === created.playerId)?.character;
    const ownB = roundA.room.players.find((player) => player.id === joined.playerId)?.character;
    expect(ownA).toBeDefined();
    expect(ownB).toBeDefined();
    expect(roundA.room.players.find((player) => player.id === created.playerId)?.character).toBeUndefined();
    expect(roundB.room.players.find((player) => player.id === joined.playerId)?.character).toBeUndefined();
    expect(JSON.stringify(roundA)).not.toContain(ownA!.name);
    expect(JSON.stringify(roundB)).not.toContain(ownB!.name);

    const wrongGuess = waitForEvent<{ correct: boolean; history: string[] }>(playerA, 'guess:result');
    playerA.emit('round:guess', { text: 'uma resposta que não existe' });
    const wrong = await wrongGuess;
    expect(wrong.correct).toBe(false);
    expect(wrong.history).toEqual(['uma resposta que não existe']);

    const solveA = waitForEvent<{ correct: boolean }>(playerA, 'guess:result');
    playerA.emit('round:guess', { text: ownA!.name });
    expect((await solveA).correct).toBe(true);

    const finishA = waitForEvent<{ room: RoomView }>(playerA, 'round:finished');
    const finishB = waitForEvent<{ room: RoomView }>(playerB, 'round:finished');
    const solveB = waitForEvent<{ correct: boolean }>(playerB, 'guess:result');
    playerB.emit('round:guess', { text: ownB!.name });
    expect((await solveB).correct).toBe(true);
    const [finishedA, finishedB] = await Promise.all([finishA, finishB]);
    expect(finishedA.room.phase).toBe('finished');
    expect(finishedA.room.players.every((player) => player.character)).toBe(true);
    expect(finishedB.room.players.find((player) => player.id === joined.playerId)?.character?.name).toBe(ownB!.name);
  });

  it('recusa a décima terceira pessoa', async () => {
    const clients = await Promise.all(Array.from({ length: MAX_PLAYERS + 1 }, () => connectClient()));
    const created = await createRoom(clients[0]!, 'Host');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    for (let index = 1; index < MAX_PLAYERS; index += 1) {
      const result = await joinRoom(clients[index]!, created.roomCode, `Pessoa ${index}`);
      expect(result.ok).toBe(true);
    }
    const tooMany = await joinRoom(clients[MAX_PLAYERS]!, created.roomCode, 'Pessoa extra');
    expect(tooMany).toEqual({ ok: false, code: 'ROOM_FULL', message: 'A sala já chegou ao limite de 12 pessoas.' });
  });
});
