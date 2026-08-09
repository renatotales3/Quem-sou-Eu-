import { readFileSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  PlayerSolvedPayload,
  RoomActionResult,
  RoomView,
  RoundFinishedPayload,
  ServerToClientEvents,
  SocketData,
} from '../shared/protocol';
import { createGameManager, MAX_PLAYERS, type GameManager } from '../server/game';
import { characters } from '../server/wordlist';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let ioServer: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
let manager: GameManager;
let address = '';
const managerClients: TestSocket[] = [];

/**
 * Acesso de teste ao estado privado da sala. `tests/` não está em nenhum
 * tsconfig (ver design.md Risks), então este cast só é validado pelo
 * transform do vitest, nunca pelo `tsc` do build.
 */
function getInternalRoom(roomCode: string): { usedCharacterIds: Set<string> } | undefined {
  const internalRooms = (manager as unknown as { rooms: Map<string, { usedCharacterIds: Set<string> }> }).rooms;
  return internalRooms.get(roomCode);
}

/**
 * Acesso de teste aos instantes de tempo (T8): `roundStartedAt` e
 * `solvedAt` ainda não são expostos pelo protocolo nesta task (isso é T9),
 * então o único jeito de observá-los é o mesmo cast usado por
 * `getInternalRoom` para `usedCharacterIds`.
 */
function getInternalRoomTiming(
  roomCode: string,
): { roundStartedAt: number | null; players: Map<string, { solvedAt: number | null }> } | undefined {
  const internalRooms = (manager as unknown as {
    rooms: Map<string, { roundStartedAt: number | null; players: Map<string, { solvedAt: number | null }> }>;
  }).rooms;
  return internalRooms.get(roomCode);
}

/**
 * Acesso de teste ao `roundPlayerCount` da sala (SCORE-02). O N congelado no
 * início da rodada é estado interno de propósito — o protocolo expõe só o
 * efeito dele (`score`), nunca o valor —, então observá-lo usa o mesmo cast de
 * `getInternalRoom`.
 */
function getInternalRoomScoring(roomCode: string): { roundPlayerCount: number } | undefined {
  const internalRooms = (manager as unknown as { rooms: Map<string, { roundPlayerCount: number }> }).rooms;
  return internalRooms.get(roomCode);
}

function waitForEvent<T>(socket: TestSocket, event: keyof ServerToClientEvents, predicate?: (payload: T) => boolean): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event as never, listener as never);
      reject(new Error(`Timeout esperando ${String(event)}`));
      // Folga generosa: ver o comentário em vitest.config.ts. Prazo aqui não é
      // asserção, só evita a suíte travar se o evento nunca chegar.
    }, 15_000);
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
    const timeout = setTimeout(() => reject(new Error('Timeout conectando cliente')), 15_000);
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

/**
 * Cria um cliente para reconectar como um jogador já existente, via o mesmo
 * handshake de sessão que o cliente real usa. Não conecta sozinho: o
 * chamador deve registrar os listeners de evento primeiro e só então chamar
 * `.connect()`, seguindo o mesmo idioma do resto do arquivo (o servidor pode
 * emitir `round:started` no mesmo instante da confirmação da conexão).
 */
function createAuthedClient(auth: { roomCode: string; playerId: string; sessionToken: string }): TestSocket {
  const client = createClient(address, { autoConnect: false, forceNew: true, auth });
  managerClients.push(client);
  return client;
}

/**
 * Toca uma rodada completa (ready -> revela personagem do outro -> ambos
 * acertam -> round:finished) e devolve os ids dos personagens de cada um,
 * descobertos via a visão do adversário (o próprio jogador nunca vê o seu).
 */
async function playRoundToFinish(
  hostClient: TestSocket,
  guestClient: TestSocket,
  hostId: string,
  guestId: string,
): Promise<{ hostCharacterId: string; guestCharacterId: string }> {
  const startedHost = waitForEvent<{ room: RoomView }>(hostClient, 'round:started');
  const startedGuest = waitForEvent<{ room: RoomView }>(guestClient, 'round:started');
  hostClient.emit('player:ready', { ready: true });
  guestClient.emit('player:ready', { ready: true });
  const [roundHost, roundGuest] = await Promise.all([startedHost, startedGuest]);

  const hostCharacter = roundGuest.room.players.find((player) => player.id === hostId)?.character;
  const guestCharacter = roundHost.room.players.find((player) => player.id === guestId)?.character;
  if (!hostCharacter || !guestCharacter) {
    throw new Error('personagem do adversário não foi revelado');
  }

  const finishHost = waitForEvent<{ room: RoomView }>(hostClient, 'round:finished');
  const finishGuest = waitForEvent<{ room: RoomView }>(guestClient, 'round:finished');
  const solveHost = waitForEvent<{ correct: boolean }>(hostClient, 'guess:result');
  const solveGuest = waitForEvent<{ correct: boolean }>(guestClient, 'guess:result');
  hostClient.emit('round:guess', { text: hostCharacter.name });
  guestClient.emit('round:guess', { text: guestCharacter.name });
  await Promise.all([solveHost, solveGuest]);
  await Promise.all([finishHost, finishGuest]);

  return { hostCharacterId: hostCharacter.id, guestCharacterId: guestCharacter.id };
}

beforeAll(async () => {
  httpServer = createServer();
  ioServer = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, { cors: { origin: true } });
  manager = createGameManager(ioServer, 1);
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

  it('a URL da imagem do próprio personagem não vaza durante a rodada e aparece na revelação (PRIV-02, PRIV-03)', async () => {
    // Herdar a proteção de viewRoom para o campo `image` sem testar é
    // exatamente como o mutante de POOL-06 sobreviveu na feature anterior
    // (ver design.md Risks). Este teste força o sorteio para dois
    // personagens com imagem aprovada — do contrário, sem imagem sorteada,
    // a asserção de URL passaria vazia e não provaria nada.
    const withImages = characters.filter((character) => character.image);
    expect(withImages.length).toBeGreaterThanOrEqual(2);
    const [chosenHostChar, chosenGuestChar] = withImages;

    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Rui');
    const joined = await joinRoom(guest, created.roomCode, 'Zoe');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    const room = getInternalRoom(created.roomCode);
    expect(room).toBeDefined();
    room!.usedCharacterIds = new Set(
      characters.filter((character) => character.id !== chosenHostChar!.id && character.id !== chosenGuestChar!.id).map((character) => character.id),
    );

    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    const [roundHost, roundGuest] = await Promise.all([startedHost, startedGuest]);

    // O pool tem só os dois personagens escolhidos, mas o sorteio embaralha
    // qual jogador recebe qual — descobre-se o próprio personagem pela visão
    // do adversário, do mesmo jeito que o teste de privacidade do nome já faz.
    const ownHostChar = roundGuest.room.players.find((player) => player.id === created.playerId)?.character;
    const ownGuestChar = roundHost.room.players.find((player) => player.id === joined.playerId)?.character;
    expect(ownHostChar?.image).toBeDefined();
    expect(ownGuestChar?.image).toBeDefined();
    const hostOwnImageUrl = ownHostChar!.image!.url;
    const guestOwnImageUrl = ownGuestChar!.image!.url;
    expect(new Set([chosenHostChar!.image!.url, chosenGuestChar!.image!.url])).toEqual(new Set([hostOwnImageUrl, guestOwnImageUrl]));

    // PRIV-02: a própria imagem não aparece no payload de ninguém durante a
    // rodada, nem embutida em outro campo qualquer.
    expect(JSON.stringify(roundHost)).not.toContain(hostOwnImageUrl);
    expect(JSON.stringify(roundGuest)).not.toContain(guestOwnImageUrl);

    // A imagem do adversário, em contrapartida, chega íntegra.
    expect(roundGuest.room.players.find((player) => player.id === created.playerId)?.character?.image).toEqual(ownHostChar!.image);
    expect(roundHost.room.players.find((player) => player.id === joined.playerId)?.character?.image).toEqual(ownGuestChar!.image);

    const finishHost = waitForEvent<{ room: RoomView }>(host, 'round:finished');
    const finishGuest = waitForEvent<{ room: RoomView }>(guest, 'round:finished');
    const solveHost = waitForEvent<{ correct: boolean }>(host, 'guess:result');
    const solveGuest = waitForEvent<{ correct: boolean }>(guest, 'guess:result');
    host.emit('round:guess', { text: ownHostChar!.name });
    guest.emit('round:guess', { text: ownGuestChar!.name });
    await Promise.all([solveHost, solveGuest]);
    const [finishedHost, finishedGuest] = await Promise.all([finishHost, finishGuest]);

    // PRIV-03: depois de round:finished, o quadro revelado inclui a imagem
    // de todos, inclusive a do próprio jogador.
    expect(finishedHost.room.players.find((player) => player.id === created.playerId)?.character?.image?.url).toBe(hostOwnImageUrl);
    expect(finishedGuest.room.players.find((player) => player.id === joined.playerId)?.character?.image?.url).toBe(guestOwnImageUrl);
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

describe('pool de personagens sem repetição na mesma sala', () => {
  it('3 rodadas seguidas na mesma sala com 2 jogadores produzem 6 personagens distintos (POOL-01, POOL-02)', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Ana');
    const joined = await joinRoom(guest, created.roomCode, 'Bia');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    const usedIds: string[] = [];
    for (let round = 0; round < 3; round += 1) {
      const { hostCharacterId, guestCharacterId } = await playRoundToFinish(host, guest, created.playerId, joined.playerId);
      usedIds.push(hostCharacterId, guestCharacterId);

      // Asserção determinística sobre o registro, não sobre o sorteio: com 304
      // personagens, 6 sorteios só colidem por acaso em ~5% das vezes, então
      // `new Set(usedIds).size === 6` sozinho passaria mesmo com a exclusão
      // quebrada. Conferir o próprio `usedCharacterIds` falha sempre que
      // `startRound` deixa de registrar os sorteados.
      const internal = getInternalRoom(created.roomCode);
      expect(internal).toBeDefined();
      expect(internal!.usedCharacterIds.size).toBe(usedIds.length);
      for (const id of usedIds) {
        expect(internal!.usedCharacterIds.has(id)).toBe(true);
      }

      if (round < 2) {
        const lobbyHost = waitForEvent<RoomView>(host, 'room:state', (room) => room.phase === 'lobby');
        const lobbyGuest = waitForEvent<RoomView>(guest, 'room:state', (room) => room.phase === 'lobby');
        host.emit('round:playAgain');
        await Promise.all([lobbyHost, lobbyGuest]);
      }
    }

    expect(usedIds.length).toBe(6);
    expect(new Set(usedIds).size).toBe(6);
  });

  it('sorteia somente entre os disponíveis: pool reduzido a 2 entrega exatamente esses 2 (POOL-01)', async () => {
    // Contraparte determinística do teste acima. Reduzir o disponível a
    // exatamente o número de jogadores torna o resultado do sorteio único:
    // se `excludeIds` for ignorado, os jogadores recebem 2 dos 304 e a
    // asserção falha praticamente sempre, em vez de depender de colisão.
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Ivo');
    const joined = await joinRoom(guest, created.roomCode, 'Lia');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    const remaining = characters.slice(-2);
    const room = getInternalRoom(created.roomCode);
    expect(room).toBeDefined();
    room!.usedCharacterIds = new Set(characters.slice(0, characters.length - 2).map((character) => character.id));

    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    const [roundHost, roundGuest] = await Promise.all([startedHost, startedGuest]);

    const hostCharacterId = roundGuest.room.players.find((player) => player.id === created.playerId)?.character?.id;
    const guestCharacterId = roundHost.room.players.find((player) => player.id === joined.playerId)?.character?.id;
    expect(new Set([hostCharacterId, guestCharacterId])).toEqual(new Set(remaining.map((character) => character.id)));
  });

  it('não encerra a rodada por decurso de tempo (TIME-09)', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Théo');
    const joined = await joinRoom(guest, created.roomCode, 'Vera');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    await Promise.all([startedHost, startedGuest]);

    // Observação limitada, que é a forma testável do invariante: ninguém
    // palpita durante a janela e nenhum `round:finished` pode chegar. Um
    // limite de tempo implementado por engano encerraria a rodada aqui.
    let finished = false;
    const markFinished = (): void => {
      finished = true;
    };
    host.on('round:finished', markFinished);
    guest.on('round:finished', markFinished);
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    host.off('round:finished', markFinished);
    guest.off('round:finished', markFinished);

    expect(finished).toBe(false);

    // E a rodada segue viva, não apenas "não terminou": um palpite errado
    // ainda é aceito e respondido. Se a rodada tivesse encerrado por tempo,
    // o servidor responderia `error` com ROUND_NOT_PLAYING.
    const stillAccepting = waitForEvent<{ correct: boolean }>(host, 'guess:result');
    host.emit('round:guess', { text: 'palpite depois da espera' });
    expect((await stillAccepting).correct).toBe(false);
  });

  it('nenhum agendador pode encerrar rodada: só o acerto alcança finishRound (TIME-09)', () => {
    // Guarda estrutural, e não comportamental, de propósito. O teste acima
    // observa 1,2s, então por construção não detecta um limite de tempo mais
    // longo que a janela — e um limite realista seria de minutos. Asserir a
    // AUSÊNCIA do mecanismo pega a regressão em qualquer duração.
    const source = readFileSync(new URL('../server/game.ts', import.meta.url), 'utf8');

    // O único agendador do módulo é o de limpeza de salas ociosas.
    const schedulers = source.match(/set(?:Timeout|Interval)\s*\(/g) ?? [];
    expect(schedulers).toEqual(['setInterval(']);
    expect(source).toContain('setInterval(() => this.cleanupRooms(), 60_000)');

    // E finishRound é alcançável de um único ponto: o acerto do palpite.
    const callSites = source.split('\n').filter((line) => /this\.finishRound\(/.test(line));
    expect(callSites).toHaveLength(1);
  });

  it('descarta o registro de personagens usados junto com a sala (POOL-07)', async () => {
    const host = await connectClient();
    const created = await createRoom(host, 'Zeca');
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(getInternalRoom(created.roomCode)).toBeDefined();
    host.emit('room:leave');
    await new Promise((resolve) => setTimeout(resolve, 150));

    // A sala sai do Map, então o Set de usados sai com ela: não há registro
    // global de personagens usados que sobreviva ao fim da sala.
    expect(getInternalRoom(created.roomCode)).toBeUndefined();
  });

  it('mantém os personagens de uma rodada abortada por saída de jogador como usados (POOL-06)', async () => {
    const host = await connectClient();
    const guestB = await connectClient();
    const created = await createRoom(host, 'Carla');
    const joinedB = await joinRoom(guestB, created.roomCode, 'Duda');
    expect(created.ok).toBe(true);
    expect(joinedB.ok).toBe(true);
    if (!created.ok || !joinedB.ok) return;

    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuestB = waitForEvent<{ room: RoomView }>(guestB, 'round:started');
    host.emit('player:ready', { ready: true });
    guestB.emit('player:ready', { ready: true });
    const [roundHost, roundGuestB] = await Promise.all([startedHost, startedGuestB]);

    const abortedHostCharacterId = roundGuestB.room.players.find((player) => player.id === created.playerId)?.character?.id;
    const abortedGuestCharacterId = roundHost.room.players.find((player) => player.id === joinedB.playerId)?.character?.id;
    expect(abortedHostCharacterId).toBeDefined();
    expect(abortedGuestCharacterId).toBeDefined();

    const lobbyAfterDeparture = waitForEvent<RoomView>(host, 'room:state', (room) => room.phase === 'lobby');
    guestB.emit('room:leave');
    await lobbyAfterDeparture;

    // Asserção determinística: os dois personagens da rodada abortada
    // continuam registrados como usados. Comparar apenas os ids da rodada
    // seguinte (abaixo) é fraco — são 2 sorteios em 304 personagens, então
    // `resetAfterDeparture` limpando o Set passaria por acaso na maioria das
    // execuções. Aqui, limpar o Set falha sempre.
    const abortedRoom = getInternalRoom(created.roomCode);
    expect(abortedRoom).toBeDefined();
    expect(abortedRoom!.usedCharacterIds.has(abortedHostCharacterId!)).toBe(true);
    expect(abortedRoom!.usedCharacterIds.has(abortedGuestCharacterId!)).toBe(true);
    expect(abortedRoom!.usedCharacterIds.size).toBe(2);

    const guestC = await connectClient();
    const joinedC = await joinRoom(guestC, created.roomCode, 'Elis');
    expect(joinedC.ok).toBe(true);
    if (!joinedC.ok) return;

    const startedHost2 = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuestC = waitForEvent<{ room: RoomView }>(guestC, 'round:started');
    host.emit('player:ready', { ready: true });
    guestC.emit('player:ready', { ready: true });
    const [roundHost2, roundGuestC] = await Promise.all([startedHost2, startedGuestC]);

    const newHostCharacterId = roundGuestC.room.players.find((player) => player.id === created.playerId)?.character?.id;
    const newGuestCharacterId = roundHost2.room.players.find((player) => player.id === joinedC.playerId)?.character?.id;
    expect(newHostCharacterId).toBeDefined();
    expect(newGuestCharacterId).toBeDefined();

    expect(newHostCharacterId).not.toBe(abortedHostCharacterId);
    expect(newHostCharacterId).not.toBe(abortedGuestCharacterId);
    expect(newGuestCharacterId).not.toBe(abortedHostCharacterId);
    expect(newGuestCharacterId).not.toBe(abortedGuestCharacterId);
  });

  it('salas distintas podem sortear os mesmos personagens (POOL-03)', async () => {
    // usedCharacterIds é um Set por sala (não global): duas salas novas, cada
    // uma com o pool inteiro disponível e o mesmo algoritmo de sorteio, devem
    // poder chegar aos mesmos personagens. Fixar Math.random em 0 torna o
    // shuffle determinístico só durante o start de cada rodada, provando que
    // o pool da sala B não herdou nenhuma exclusão da sala A.
    const a1 = await connectClient();
    const a2 = await connectClient();
    const createdA = await createRoom(a1, 'Rita');
    const joinedA = await joinRoom(a2, createdA.roomCode, 'Sara');
    expect(createdA.ok).toBe(true);
    expect(joinedA.ok).toBe(true);
    if (!createdA.ok || !joinedA.ok) return;

    const startedA1 = waitForEvent<{ room: RoomView }>(a1, 'round:started');
    const startedA2 = waitForEvent<{ room: RoomView }>(a2, 'round:started');
    const randomSpyA = vi.spyOn(Math, 'random').mockReturnValue(0);
    a1.emit('player:ready', { ready: true });
    a2.emit('player:ready', { ready: true });
    const [roundA1, roundA2] = await Promise.all([startedA1, startedA2]);
    randomSpyA.mockRestore();

    const charactersA = new Set([
      roundA2.room.players.find((player) => player.id === createdA.playerId)?.character?.id,
      roundA1.room.players.find((player) => player.id === joinedA.playerId)?.character?.id,
    ]);

    const b1 = await connectClient();
    const b2 = await connectClient();
    const createdB = await createRoom(b1, 'Tais');
    const joinedB = await joinRoom(b2, createdB.roomCode, 'Uma');
    expect(createdB.ok).toBe(true);
    expect(joinedB.ok).toBe(true);
    if (!createdB.ok || !joinedB.ok) return;

    const startedB1 = waitForEvent<{ room: RoomView }>(b1, 'round:started');
    const startedB2 = waitForEvent<{ room: RoomView }>(b2, 'round:started');
    const randomSpyB = vi.spyOn(Math, 'random').mockReturnValue(0);
    b1.emit('player:ready', { ready: true });
    b2.emit('player:ready', { ready: true });
    const [roundB1, roundB2] = await Promise.all([startedB1, startedB2]);
    randomSpyB.mockRestore();

    const charactersB = new Set([
      roundB2.room.players.find((player) => player.id === createdB.playerId)?.character?.id,
      roundB1.room.players.find((player) => player.id === joinedB.playerId)?.character?.id,
    ]);

    expect(charactersA.size).toBe(2);
    expect(charactersB).toEqual(charactersA);
  });

  it('recicla o catálogo antes do sorteio e avisa a sala quando os disponíveis são menos que os jogadores (POOL-04, POOL-05)', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Word1');
    const joined = await joinRoom(guest, created.roomCode, 'Word2');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    // Simula o esgotamento sem jogar centenas de rodadas: marca todos os
    // personagens menos um como usados, deixando menos disponíveis que
    // jogadores na sala.
    const room = getInternalRoom(created.roomCode);
    expect(room).toBeDefined();
    room!.usedCharacterIds = new Set(characters.slice(0, characters.length - 1).map((character) => character.id));

    const notice = waitForEvent<{ code: string; message: string }>(host, 'room:notice');
    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });

    const receivedNotice = await notice;
    expect(receivedNotice).toEqual({
      code: 'CATALOG_RECYCLED',
      message: 'Os personagens deram a volta: o catálogo foi liberado de novo.',
    });

    const [roundHost, roundGuest] = await Promise.all([startedHost, startedGuest]);
    expect(roundGuest.room.players.find((player) => player.id === created.playerId)?.character).toBeDefined();
    expect(roundHost.room.players.find((player) => player.id === joined.playerId)?.character).toBeDefined();
  });
});

describe('instantes de rodada e de acerto (TIME-01, TIME-03, TIME-07, TIME-09)', () => {
  it('registra roundStartedAt no início da rodada e solvedAt >= intervalo conhecido no acerto, null para quem não acertou', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Fefe');
    const joined = await joinRoom(guest, created.roomCode, 'Gigi');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    const beforeStart = Date.now();
    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    const [, roundGuest] = await Promise.all([startedHost, startedGuest]);
    const afterStart = Date.now();

    const timingAtStart = getInternalRoomTiming(created.roomCode);
    expect(timingAtStart).toBeDefined();
    expect(timingAtStart!.roundStartedAt).not.toBeNull();
    expect(timingAtStart!.roundStartedAt!).toBeGreaterThanOrEqual(beforeStart);
    expect(timingAtStart!.roundStartedAt!).toBeLessThanOrEqual(afterStart);

    const hostCharacter = roundGuest.room.players.find((player) => player.id === created.playerId)?.character;
    expect(hostCharacter).toBeDefined();

    const KNOWN_DELAY_MS = 120;
    await new Promise((resolve) => setTimeout(resolve, KNOWN_DELAY_MS));

    const solveHost = waitForEvent<{ correct: boolean }>(host, 'guess:result');
    host.emit('round:guess', { text: hostCharacter!.name });
    expect((await solveHost).correct).toBe(true);

    const timingAfterSolve = getInternalRoomTiming(created.roomCode);
    expect(timingAfterSolve).toBeDefined();
    const hostSolvedAt = timingAfterSolve!.players.get(created.playerId)?.solvedAt;
    expect(hostSolvedAt).not.toBeNull();
    expect(hostSolvedAt! - timingAfterSolve!.roundStartedAt!).toBeGreaterThanOrEqual(KNOWN_DELAY_MS);

    const guestSolvedAt = timingAfterSolve!.players.get(joined.playerId)?.solvedAt;
    expect(guestSolvedAt).toBeNull();
  });

  it('zera roundStartedAt e solvedAt de todos ao reabrir uma nova rodada com playAgain', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Hiro');
    const joined = await joinRoom(guest, created.roomCode, 'Ivi');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    await playRoundToFinish(host, guest, created.playerId, joined.playerId);

    const timingBeforePlayAgain = getInternalRoomTiming(created.roomCode);
    expect(timingBeforePlayAgain).toBeDefined();
    expect(timingBeforePlayAgain!.roundStartedAt).not.toBeNull();
    expect(timingBeforePlayAgain!.players.get(created.playerId)?.solvedAt).not.toBeNull();
    expect(timingBeforePlayAgain!.players.get(joined.playerId)?.solvedAt).not.toBeNull();

    const lobbyHost = waitForEvent<RoomView>(host, 'room:state', (room) => room.phase === 'lobby');
    host.emit('round:playAgain');
    await lobbyHost;

    const timingAfterPlayAgain = getInternalRoomTiming(created.roomCode);
    expect(timingAfterPlayAgain).toBeDefined();
    expect(timingAfterPlayAgain!.roundStartedAt).toBeNull();
    expect(timingAfterPlayAgain!.players.get(created.playerId)?.solvedAt).toBeNull();
    expect(timingAfterPlayAgain!.players.get(joined.playerId)?.solvedAt).toBeNull();
  });

  it('zera roundStartedAt e solvedAt ao abortar a rodada por saída de jogador', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Jade');
    const joined = await joinRoom(guest, created.roomCode, 'Kiko');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    const [, roundGuest] = await Promise.all([startedHost, startedGuest]);

    const hostCharacter = roundGuest.room.players.find((player) => player.id === created.playerId)?.character;
    expect(hostCharacter).toBeDefined();
    const solveHost = waitForEvent<{ correct: boolean }>(host, 'guess:result');
    host.emit('round:guess', { text: hostCharacter!.name });
    expect((await solveHost).correct).toBe(true);

    const timingBeforeDeparture = getInternalRoomTiming(created.roomCode);
    expect(timingBeforeDeparture!.roundStartedAt).not.toBeNull();
    expect(timingBeforeDeparture!.players.get(created.playerId)?.solvedAt).not.toBeNull();

    const lobbyAfterDeparture = waitForEvent<RoomView>(host, 'room:state', (room) => room.phase === 'lobby');
    guest.emit('room:leave');
    await lobbyAfterDeparture;

    const timingAfterDeparture = getInternalRoomTiming(created.roomCode);
    expect(timingAfterDeparture).toBeDefined();
    expect(timingAfterDeparture!.roundStartedAt).toBeNull();
    expect(timingAfterDeparture!.players.get(created.playerId)?.solvedAt).toBeNull();
  });
});

describe('tempo exposto por socket (TIME-04, TIME-05, TIME-06)', () => {
  it('reconexão no meio da rodada devolve roundStartedAt igual ao da rodada em curso', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Lia');
    const joined = await joinRoom(guest, created.roomCode, 'Mel');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    const [roundHost] = await Promise.all([startedHost, startedGuest]);

    expect(roundHost.room.roundStartedAt).not.toBeNull();
    expect(roundHost.room.serverNow).toBeGreaterThanOrEqual(roundHost.room.roundStartedAt!);
    const originalRoundStartedAt = roundHost.room.roundStartedAt;

    host.disconnect();
    const reconnectedHost = createAuthedClient({
      roomCode: created.roomCode,
      playerId: created.playerId,
      sessionToken: created.sessionToken,
    });
    const resumed = waitForEvent<{ room: RoomView }>(reconnectedHost, 'round:started');
    reconnectedHost.connect();

    expect((await resumed).room.roundStartedAt).toBe(originalRoundStartedAt);
  });

  it('player:solved e o ranking final carregam solveMs derivado do intervalo desde roundStartedAt; null antes do acerto', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Nina');
    const joined = await joinRoom(guest, created.roomCode, 'Oto');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    const [roundHost, roundGuest] = await Promise.all([startedHost, startedGuest]);

    expect(roundHost.room.players.every((player) => player.solveMs === null)).toBe(true);

    const hostCharacter = roundGuest.room.players.find((player) => player.id === created.playerId)?.character;
    const guestCharacter = roundHost.room.players.find((player) => player.id === joined.playerId)?.character;
    expect(hostCharacter).toBeDefined();
    expect(guestCharacter).toBeDefined();

    const KNOWN_DELAY_MS = 80;
    await new Promise((resolve) => setTimeout(resolve, KNOWN_DELAY_MS));

    const solvedEvent = waitForEvent<PlayerSolvedPayload>(guest, 'player:solved');
    const solveHost = waitForEvent<{ correct: boolean }>(host, 'guess:result');
    host.emit('round:guess', { text: hostCharacter!.name });
    expect((await solveHost).correct).toBe(true);
    const solvedPayload = await solvedEvent;
    expect(solvedPayload.playerId).toBe(created.playerId);
    expect(solvedPayload.solveMs).toBeGreaterThanOrEqual(KNOWN_DELAY_MS);

    const finishHost = waitForEvent<RoundFinishedPayload>(host, 'round:finished');
    const finishGuest = waitForEvent<RoundFinishedPayload>(guest, 'round:finished');
    const solveGuest = waitForEvent<{ correct: boolean }>(guest, 'guess:result');
    guest.emit('round:guess', { text: guestCharacter!.name });
    expect((await solveGuest).correct).toBe(true);
    const [finishedHost] = await Promise.all([finishHost, finishGuest]);

    const hostRankingEntry = finishedHost.ranking.find((entry) => entry.playerId === created.playerId);
    const guestRankingEntry = finishedHost.ranking.find((entry) => entry.playerId === joined.playerId);
    expect(hostRankingEntry?.solveMs).toBeGreaterThanOrEqual(KNOWN_DELAY_MS);
    expect(guestRankingEntry?.solveMs).not.toBeNull();
    expect(guestRankingEntry?.solveMs).toBeGreaterThanOrEqual(0);
  });
});

describe('estado de placar na sala e no jogador (SCORE-02, SCORE-07)', () => {
  it('jogador recém-criado entra com score 0 e roundPoints null no RoomView (SCORE-07)', async () => {
    const host = await connectClient();
    const created = await createRoom(host, 'Alba');
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const hostInCreate = created.room.players.find((player) => player.id === created.playerId);
    expect(hostInCreate?.score).toBe(0);
    expect(hostInCreate?.roundPoints).toBeNull();

    const guest = await connectClient();
    const joined = await joinRoom(guest, created.roomCode, 'Bento');
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;

    const guestInJoin = joined.room.players.find((player) => player.id === joined.playerId);
    expect(guestInJoin?.score).toBe(0);
    expect(guestInJoin?.roundPoints).toBeNull();
  });

  it('startRound congela o número de jogadores da sala naquele instante (SCORE-02)', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Cauê');
    const joined = await joinRoom(guest, created.roomCode, 'Dara');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    expect(getInternalRoomScoring(created.roomCode)?.roundPlayerCount).toBe(0);

    const startedHost = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const startedGuest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    const [roundHost] = await Promise.all([startedHost, startedGuest]);

    expect(getInternalRoomScoring(created.roomCode)?.roundPlayerCount).toBe(2);
    // roundPoints segue null para quem ainda não acertou.
    expect(roundHost.room.players.every((player) => player.roundPoints === null)).toBe(true);
  });

  it('duas rodadas com números de jogadores diferentes registram roundPlayerCount diferentes (SCORE-02)', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const created = await createRoom(host, 'Elvis');
    const joined = await joinRoom(guest, created.roomCode, 'Fátima');
    expect(created.ok).toBe(true);
    expect(joined.ok).toBe(true);
    if (!created.ok || !joined.ok) return;

    await playRoundToFinish(host, guest, created.playerId, joined.playerId);
    expect(getInternalRoomScoring(created.roomCode)?.roundPlayerCount).toBe(2);

    const lobbyHost = waitForEvent<RoomView>(host, 'room:state', (room) => room.phase === 'lobby');
    const lobbyGuest = waitForEvent<RoomView>(guest, 'room:state', (room) => room.phase === 'lobby');
    host.emit('round:playAgain');
    await Promise.all([lobbyHost, lobbyGuest]);

    const third = await connectClient();
    const joinedThird = await joinRoom(third, created.roomCode, 'Gael');
    expect(joinedThird.ok).toBe(true);
    if (!joinedThird.ok) return;

    const started2Host = waitForEvent<{ room: RoomView }>(host, 'round:started');
    const started2Guest = waitForEvent<{ room: RoomView }>(guest, 'round:started');
    const started2Third = waitForEvent<{ room: RoomView }>(third, 'round:started');
    host.emit('player:ready', { ready: true });
    guest.emit('player:ready', { ready: true });
    third.emit('player:ready', { ready: true });
    await Promise.all([started2Host, started2Guest, started2Third]);

    expect(getInternalRoomScoring(created.roomCode)?.roundPlayerCount).toBe(3);
  });
});
