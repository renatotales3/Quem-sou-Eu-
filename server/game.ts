import { randomBytes } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  CreateRoomInput,
  GameErrorPayload,
  GuessInput,
  InterServerEvents,
  JoinRoomInput,
  ReadyInput,
  RemoveAbsentInput,
  RoomActionResult,
  RoomView,
  ServerToClientEvents,
  SocketData,
} from '../shared/protocol';
import { normalizeNickname, normalizeRoomCode, normalizeText } from './normalization';
import { pointsForRank } from './scoring';
import { characterMatches, characters, type Character, pickCharacters } from './wordlist';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_ROOM_TTL_MINUTES = 30;
const MAX_GUESS_LENGTH = 100;

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameIo = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface PlayerState {
  id: string;
  nickname: string;
  normalizedNickname: string;
  sessionToken: string;
  socketId: string | null;
  connected: boolean;
  ready: boolean;
  character: Character | null;
  solved: boolean;
  rank: number | null;
  guesses: string[];
  disconnectedAt: number | null;
  solvedAt: number | null;
  /** Total acumulado da sessão. Só cresce; nunca é zerado por nova rodada. */
  score: number;
  /** Ganho da rodada corrente; null enquanto o jogador não acertou. */
  roundPoints: number | null;
}

interface RoomState {
  code: string;
  hostId: string;
  phase: RoomView['phase'];
  round: number;
  players: Map<string, PlayerState>;
  createdAt: number;
  updatedAt: number;
  usedCharacterIds: Set<string>;
  roundStartedAt: number | null;
  /**
   * Número de jogadores registrado quando a rodada começou (SCORE-02).
   * Congelado para toda a rodada: quem sai no meio não muda a escala de
   * pontos dos acertos seguintes (SCORE-15).
   */
  roundPlayerCount: number;
}

interface SessionAuth {
  roomCode?: unknown;
  playerId?: unknown;
  sessionToken?: unknown;
}

export class GameManager {
  private readonly rooms = new Map<string, RoomState>();
  private readonly roomTtlMs: number;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(private readonly io: GameIo, roomTtlMinutes = Number(process.env.ROOM_TTL_MINUTES) || DEFAULT_ROOM_TTL_MINUTES) {
    this.roomTtlMs = roomTtlMinutes * 60_000;
    this.cleanupTimer = setInterval(() => this.cleanupRooms(), 60_000);
    this.cleanupTimer.unref();
  }

  bindSocket(socket: GameSocket): void {
    socket.on('room:create', (payload, ack) => this.createRoom(socket, payload, ack));
    socket.on('room:join', (payload, ack) => this.joinRoom(socket, payload, ack));
    socket.on('player:ready', (payload) => this.setReady(socket, payload));
    socket.on('round:guess', (payload) => this.guess(socket, payload));
    socket.on('round:playAgain', () => this.playAgain(socket));
    socket.on('round:endEarly', () => this.endEarly(socket));
    socket.on('room:removeAbsent', (payload) => this.removeAbsent(socket, payload));
    socket.on('room:leave', () => this.leave(socket));
    socket.on('disconnect', () => this.disconnect(socket));

    this.resumeFromHandshake(socket);
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  private createRoom(socket: GameSocket, payload: CreateRoomInput, ack: (result: RoomActionResult) => void): void {
    if (this.getPlayer(socket)) {
      ack(this.failure('ALREADY_IN_ROOM', 'Você já está em uma sala.'));
      return;
    }

    const nickname = this.validateNickname(payload?.nickname);
    if (!nickname) {
      ack(this.failure('INVALID_NICKNAME', 'Use um apelido com 2 a 24 caracteres.'));
      return;
    }

    const code = this.createRoomCode();
    const player = this.createPlayer(nickname, socket.id);
    const room: RoomState = {
      code,
      hostId: player.id,
      phase: 'lobby',
      round: 0,
      players: new Map([[player.id, player]]),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usedCharacterIds: new Set(),
      roundStartedAt: null,
      roundPlayerCount: 0,
    };

    this.rooms.set(code, room);
    this.attachPlayer(socket, room, player);
    ack(this.success(room, player));
    this.broadcastRoomState(room);
  }

  private joinRoom(socket: GameSocket, payload: JoinRoomInput, ack: (result: RoomActionResult) => void): void {
    if (this.getPlayer(socket)) {
      ack(this.failure('ALREADY_IN_ROOM', 'Você já está em uma sala.'));
      return;
    }

    const code = normalizeRoomCode(payload?.code ?? '');
    const room = this.rooms.get(code);
    if (!room) {
      ack(this.failure('ROOM_NOT_FOUND', 'Essa sala não existe mais.'));
      return;
    }
    if (room.phase !== 'lobby') {
      ack(this.failure('ROOM_STARTED', 'Essa rodada já começou.'));
      return;
    }
    if (room.players.size >= MAX_PLAYERS) {
      ack(this.failure('ROOM_FULL', 'A sala já chegou ao limite de 12 pessoas.'));
      return;
    }

    const nickname = this.validateNickname(payload?.nickname);
    if (!nickname) {
      ack(this.failure('INVALID_NICKNAME', 'Use um apelido com 2 a 24 caracteres.'));
      return;
    }
    const normalizedNickname = normalizeText(nickname);
    const duplicate = Array.from(room.players.values()).some((player) => player.normalizedNickname === normalizedNickname);
    if (duplicate) {
      ack(this.failure('NICKNAME_TAKEN', 'Esse apelido já está na sala.'));
      return;
    }

    const player = this.createPlayer(nickname, socket.id);
    room.players.set(player.id, player);
    this.touch(room);
    this.attachPlayer(socket, room, player);
    ack(this.success(room, player));
    this.broadcastRoomState(room);
  }

  private setReady(socket: GameSocket, payload: ReadyInput): void {
    const context = this.getContext(socket);
    if (!context) return;
    const { room, player } = context;
    if (room.phase !== 'lobby') {
      this.sendError(socket, 'ROUND_ALREADY_STARTED', 'A rodada já começou.');
      return;
    }

    player.ready = Boolean(payload?.ready);
    this.touch(room);
    this.broadcastRoomState(room);

    const everyoneReady = room.players.size >= MIN_PLAYERS && Array.from(room.players.values()).every((candidate) => candidate.connected && candidate.ready);
    if (everyoneReady) {
      this.startRound(room);
    }
  }

  private guess(socket: GameSocket, payload: GuessInput): void {
    const context = this.getContext(socket);
    if (!context) return;
    const { room, player } = context;
    if (room.phase !== 'playing' || !player.character) {
      this.sendError(socket, 'ROUND_NOT_PLAYING', 'A rodada ainda não está recebendo palpites.');
      return;
    }
    if (player.solved) {
      socket.emit('guess:result', {
        correct: true,
        alreadySolved: true,
        attempts: player.guesses.length,
        message: 'Você já acertou.',
        history: [...player.guesses],
      });
      return;
    }

    const text = String(payload?.text ?? '').trim().slice(0, MAX_GUESS_LENGTH);
    if (!text || normalizeText(text).length < 2) {
      this.sendError(socket, 'INVALID_GUESS', 'Digite um palpite com pelo menos 2 caracteres.');
      return;
    }

    player.guesses.push(text);
    const correct = characterMatches(player.character, text);
    if (!correct) {
      socket.emit('guess:result', {
        correct: false,
        alreadySolved: false,
        attempts: player.guesses.length,
        message: 'Ainda não bateu.',
        history: [...player.guesses],
      });
      this.touch(room);
      return;
    }

    const rank = Array.from(room.players.values()).filter((candidate) => candidate.solved).length + 1;
    player.solved = true;
    player.rank = rank;
    player.solvedAt = Date.now();
    // SCORE-01: os pontos usam o N congelado no início da rodada, não o
    // tamanho atual da sala. O guard de `player.solved` acima garante que a
    // soma acontece no máximo uma vez por rodada (SCORE-04).
    //
    // Hoje `roundPlayerCount` e `room.players.size` são sempre iguais aqui, e
    // por isso nenhum teste consegue distinguir as duas leituras: o roster não
    // encolhe durante `playing`. `players.delete` só acontece em `removePlayer`,
    // chamado apenas por `leave`, e `leave` durante `playing` dispara
    // `resetAfterDeparture`, que volta a sala para `lobby` e aborta a rodada;
    // uma queda de conexão marca `connected: false` sem remover o jogador. Ler o
    // valor congelado é defesa contra uma mudança futura que permita a rodada
    // seguir com o roster menor: aí as duas leituras divergem e só esta mantém
    // a escala de pontos que a rodada começou (SCORE-02, SCORE-15).
    player.roundPoints = pointsForRank(rank, room.roundPlayerCount);
    player.score += player.roundPoints;
    this.touch(room);

    socket.emit('guess:result', {
      correct: true,
      alreadySolved: false,
      attempts: player.guesses.length,
      message: 'Acertou. Sua identidade foi desbloqueada.',
      history: [...player.guesses],
    });
    this.io.to(room.code).emit('player:solved', {
      playerId: player.id,
      nickname: player.nickname,
      rank,
      // room.phase === 'playing' aqui garante roundStartedAt não-nulo (setado junto no startRound).
      solveMs: player.solvedAt - room.roundStartedAt!,
    });
    this.broadcastRoomState(room);

    const everyoneSolved = Array.from(room.players.values()).every((candidate) => candidate.solved);
    if (everyoneSolved) {
      this.finishRound(room);
    }
  }

  /**
   * Saída manual para a rodada travada. `finishRound` só dispara quando todos
   * acertam, então um jogador que cai antes de descobrir a própria identidade
   * congela a sala para sempre — não há encerramento por tempo.
   *
   * A guarda de travamento (existe alguém desconectado que ainda não acertou) é
   * o que separa conserto de sabotagem: sem ela o anfitrião poderia cortar uma
   * rodada saudável e revelar o personagem de quem ainda está jogando. Por isso
   * a condição é a da própria falha, não "quando o anfitrião quiser".
   */
  private endEarly(socket: GameSocket): void {
    const context = this.getContext(socket);
    if (!context) return;
    const { room, player } = context;
    if (room.hostId !== player.id) {
      this.sendError(socket, 'HOST_ONLY', 'Só quem criou a sala pode encerrar a rodada.');
      return;
    }
    if (room.phase !== 'playing') {
      this.sendError(socket, 'ROUND_NOT_RUNNING', 'Não há rodada em andamento para encerrar.');
      return;
    }
    const stalled = Array.from(room.players.values()).some((candidate) => !candidate.connected && !candidate.solved);
    if (!stalled) {
      this.sendError(socket, 'ROUND_NOT_STUCK', 'A rodada não está travada: todo mundo que falta ainda está na sala.');
      return;
    }

    this.finishRound(room);
  }

  /**
   * Tira da sala quem caiu e não voltou. Encerrar a rodada travada não bastava:
   * `everyoneReady` exige `connected && ready` de todos, então o ausente
   * continuava barrando o início da rodada seguinte — o travamento só andava um
   * passo, da rodada para o lobby.
   *
   * Só alvo desconectado, e só no lobby. As duas restrições existem pelo mesmo
   * motivo: sem elas isto deixa de ser conserto e vira expulsão. Remover alguém
   * conectado é moderação de comportamento, decisão de produto que a sala não
   * tomou; remover durante `playing` cairia em `resetAfterDeparture` e abortaria
   * a rodada de todo mundo.
   */
  private removeAbsent(socket: GameSocket, payload: RemoveAbsentInput): void {
    const context = this.getContext(socket);
    if (!context) return;
    const { room, player } = context;
    if (room.hostId !== player.id) {
      this.sendError(socket, 'HOST_ONLY', 'Só quem criou a sala pode remover um jogador ausente.');
      return;
    }
    if (room.phase !== 'lobby') {
      this.sendError(socket, 'ROOM_NOT_IN_LOBBY', 'Só dá para remover alguém entre as rodadas.');
      return;
    }
    const target = typeof payload?.playerId === 'string' ? room.players.get(payload.playerId) : undefined;
    if (!target) {
      this.sendError(socket, 'PLAYER_NOT_FOUND', 'Esse jogador não está mais na sala.');
      return;
    }
    if (target.connected) {
      this.sendError(socket, 'PLAYER_CONNECTED', 'Esse jogador está conectado — só dá para remover quem caiu.');
      return;
    }

    // `removePlayer` é o mesmo caminho da saída pelo botão, então o placar de
    // sessão do removido é descartado junto do registro (SCORE-09, END-16).
    this.removePlayer(room, target);
    this.broadcastRoomState(room);
  }

  private playAgain(socket: GameSocket): void {
    const context = this.getContext(socket);
    if (!context) return;
    const { room, player } = context;
    if (room.hostId !== player.id) {
      this.sendError(socket, 'HOST_ONLY', 'Só quem criou a sala pode abrir uma nova rodada.');
      return;
    }
    if (room.phase !== 'finished') {
      this.sendError(socket, 'ROUND_NOT_FINISHED', 'Espere a rodada terminar para jogar novamente.');
      return;
    }

    room.phase = 'lobby';
    room.roundStartedAt = null;
    for (const candidate of room.players.values()) {
      candidate.ready = false;
      candidate.character = null;
      candidate.solved = false;
      candidate.rank = null;
      candidate.guesses = [];
      candidate.solvedAt = null;
      // SCORE-06: só o ganho da rodada zera. `score` atravessa a sessão inteira.
      candidate.roundPoints = null;
    }
    this.touch(room);
    this.broadcastRoomState(room);
  }

  private startRound(room: RoomState): void {
    if (room.phase !== 'lobby') return;
    room.phase = 'playing';
    room.round += 1;
    room.roundStartedAt = Date.now();
    const players = Array.from(room.players.values());
    room.roundPlayerCount = players.length;

    const availableCount = characters.length - room.usedCharacterIds.size;
    if (availableCount < players.length) {
      room.usedCharacterIds.clear();
      this.io.to(room.code).emit('room:notice', {
        code: 'CATALOG_RECYCLED',
        message: 'Os personagens deram a volta: o catálogo foi liberado de novo.',
      });
    }

    const assignedCharacters = pickCharacters(players.length, room.usedCharacterIds);

    players.forEach((player, index) => {
      player.character = assignedCharacters[index] ?? null;
      player.ready = false;
      player.solved = false;
      player.rank = null;
      player.guesses = [];
      player.roundPoints = null;
      if (player.character) {
        room.usedCharacterIds.add(player.character.id);
      }
    });
    this.touch(room);
    this.broadcastRoomState(room);
    this.broadcastRoundStarted(room);
  }

  private finishRound(room: RoomState): void {
    room.phase = 'finished';
    this.touch(room);
    const ranking = Array.from(room.players.values())
      .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))
      .map((player) => ({ playerId: player.id, nickname: player.nickname, rank: player.rank, solveMs: this.deriveSolveMs(room, player) }));

    this.broadcastRoomState(room);
    for (const player of room.players.values()) {
      const socket = this.socketForPlayer(player);
      if (socket) {
        socket.emit('round:finished', {
          room: this.viewRoom(room, player.id),
          ranking,
        });
      }
    }
  }

  private leave(socket: GameSocket): void {
    const context = this.getContext(socket);
    if (!context) return;
    const { room, player } = context;
    this.removePlayer(room, player);
    socket.leave(room.code);
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
    if (room.players.size === 0) {
      this.rooms.delete(room.code);
      return;
    }
    if (room.phase === 'playing') {
      this.resetAfterDeparture(room);
    }
    this.broadcastRoomState(room);
  }

  private disconnect(socket: GameSocket): void {
    const context = this.getContext(socket);
    if (!context) return;
    const { room, player } = context;
    if (player.socketId !== socket.id) return;
    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = Date.now();
    if (room.hostId === player.id) {
      const replacement = Array.from(room.players.values()).find((candidate) => candidate.connected);
      if (replacement) room.hostId = replacement.id;
    }
    this.touch(room);
    this.broadcastRoomState(room);
  }

  private resumeFromHandshake(socket: GameSocket): void {
    const auth = (socket.handshake.auth ?? {}) as SessionAuth;
    if (typeof auth.roomCode !== 'string' || typeof auth.playerId !== 'string' || typeof auth.sessionToken !== 'string') return;

    const room = this.rooms.get(normalizeRoomCode(auth.roomCode));
    const player = room?.players.get(auth.playerId);
    if (!room || !player || player.sessionToken !== auth.sessionToken) {
      this.sendError(socket, 'SESSION_EXPIRED', 'A sessão desta sala não está mais disponível.');
      return;
    }

    player.connected = true;
    player.socketId = socket.id;
    player.disconnectedAt = null;
    this.attachPlayer(socket, room, player);
    this.broadcastRoomState(room);
    if (room.phase === 'playing') {
      this.emitRoundStartedToPlayer(room, player);
    } else if (room.phase === 'finished') {
      const ranking = Array.from(room.players.values())
        .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))
        .map((candidate) => ({ playerId: candidate.id, nickname: candidate.nickname, rank: candidate.rank, solveMs: this.deriveSolveMs(room, candidate) }));
      socket.emit('round:finished', { room: this.viewRoom(room, player.id), ranking });
    }
  }

  private broadcastRoomState(room: RoomState): void {
    for (const player of room.players.values()) {
      const socket = this.socketForPlayer(player);
      if (socket) socket.emit('room:state', this.viewRoom(room, player.id));
    }
  }

  private broadcastRoundStarted(room: RoomState): void {
    for (const player of room.players.values()) {
      this.emitRoundStartedToPlayer(room, player);
    }
  }

  private emitRoundStartedToPlayer(room: RoomState, player: PlayerState): void {
    const socket = this.socketForPlayer(player);
    if (socket) socket.emit('round:started', { room: this.viewRoom(room, player.id) });
  }

  private viewRoom(room: RoomState, viewerId: string): RoomView {
    const viewer = room.players.get(viewerId);
    if (!viewer) throw new Error('Viewer not found in room');

    return {
      code: room.code,
      phase: room.phase,
      round: room.round,
      hostId: room.hostId,
      you: { id: viewer.id, nickname: viewer.nickname },
      guessHistory: [...viewer.guesses],
      roundStartedAt: room.roundStartedAt,
      serverNow: Date.now(),
      players: Array.from(room.players.values()).map((player) => {
        const publicPlayer = {
          id: player.id,
          nickname: player.nickname,
          isHost: player.id === room.hostId,
          ready: player.ready,
          connected: player.connected,
          solved: player.solved,
          rank: player.rank,
          solveMs: this.deriveSolveMs(room, player),
          score: player.score,
          roundPoints: player.roundPoints,
        };

        if (player.character && (room.phase === 'finished' || (room.phase === 'playing' && player.id !== viewerId))) {
          return {
            ...publicPlayer,
            character: {
              id: player.character.id,
              name: player.character.name,
              category: player.character.category,
              ...(player.character.image ? { image: player.character.image } : {}),
            },
          };
        }
        return publicPlayer;
      }),
    };
  }

  private attachPlayer(socket: GameSocket, room: RoomState, player: PlayerState): void {
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    player.socketId = socket.id;
    player.connected = true;
    player.disconnectedAt = null;
    void socket.join(room.code);
  }

  private getContext(socket: GameSocket): { room: RoomState; player: PlayerState } | null {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;
    if (!roomCode || !playerId) return null;
    const room = this.rooms.get(roomCode);
    const player = room?.players.get(playerId);
    if (!room || !player || player.socketId !== socket.id) return null;
    return { room, player };
  }

  private getPlayer(socket: GameSocket): PlayerState | null {
    return this.getContext(socket)?.player ?? null;
  }

  private socketForPlayer(player: PlayerState): GameSocket | null {
    if (!player.socketId) return null;
    const socket = this.io.sockets.sockets.get(player.socketId);
    return (socket as GameSocket | undefined) ?? null;
  }

  private createPlayer(nickname: string, socketId: string): PlayerState {
    return {
      id: `player-${randomBytes(8).toString('hex')}`,
      nickname,
      normalizedNickname: normalizeText(nickname),
      sessionToken: randomBytes(24).toString('hex'),
      socketId,
      connected: true,
      ready: false,
      character: null,
      solved: false,
      rank: null,
      guesses: [],
      disconnectedAt: null,
      solvedAt: null,
      score: 0,
      roundPoints: null,
    };
  }

  private createRoomCode(): string {
    let code = '';
    do {
      code = Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)] ?? 'A').join('');
    } while (this.rooms.has(code));
    return code;
  }

  private validateNickname(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const nickname = normalizeNickname(value);
    const normalized = normalizeText(nickname);
    if (normalized.length < 2 || nickname.length > 24) return null;
    return nickname;
  }

  private success(room: RoomState, player: PlayerState): RoomActionResult {
    return {
      ok: true,
      roomCode: room.code,
      playerId: player.id,
      sessionToken: player.sessionToken,
      room: this.viewRoom(room, player.id),
    };
  }

  private failure(code: string, message: string): RoomActionResult {
    return { ok: false, code, message };
  }

  private sendError(socket: GameSocket, code: string, message: string): void {
    const payload: GameErrorPayload = { code, message };
    socket.emit('error', payload);
  }

  private removePlayer(room: RoomState, player: PlayerState): void {
    room.players.delete(player.id);
    if (room.hostId === player.id) {
      room.hostId = Array.from(room.players.values()).find((candidate) => candidate.connected)?.id ?? Array.from(room.players.keys())[0] ?? '';
    }
    this.touch(room);
  }

  private resetAfterDeparture(room: RoomState): void {
    room.phase = 'lobby';
    room.roundStartedAt = null;
    for (const candidate of room.players.values()) {
      candidate.ready = false;
      candidate.character = null;
      candidate.solved = false;
      candidate.rank = null;
      candidate.guesses = [];
      candidate.solvedAt = null;
      candidate.roundPoints = null;
    }
    this.touch(room);
  }

  private touch(room: RoomState): void {
    room.updatedAt = Date.now();
  }

  /** AD-003: solveMs é sempre derivado de roundStartedAt/solvedAt, nunca armazenado. */
  private deriveSolveMs(room: RoomState, player: PlayerState): number | null {
    if (room.roundStartedAt === null || player.solvedAt === null) return null;
    return player.solvedAt - room.roundStartedAt;
  }

  private cleanupRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const connectedCount = Array.from(room.players.values()).filter((player) => player.connected).length;
      if (connectedCount === 0 && now - room.updatedAt > this.roomTtlMs) {
        this.rooms.delete(code);
      }
    }
  }
}

export function createGameManager(io: GameIo): GameManager {
  return new GameManager(io);
}

export { characters };
