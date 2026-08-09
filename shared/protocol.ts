export type RoomPhase = 'lobby' | 'playing' | 'finished';

export interface CharacterPublic {
  id: string;
  name: string;
  category: string;
  // Espelha CharacterImage de server/character-images.ts sem importar
  // código de servidor: shared/ não deve depender de server/, mesmo motivo
  // pelo qual name e category já são redeclarados aqui.
  image?: {
    url: string;
    author: string;
    license: string;
    // Fonte da imagem: 'Wikimedia Commons' (licença livre) ou 'AniList' (arte
    // de estúdio, uso não comercial tolerado) — IMG-02, IMG-07.
    source: string;
  };
}

export interface PlayerView {
  id: string;
  nickname: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  solved: boolean;
  rank: number | null;
  character?: CharacterPublic;
  solveMs: number | null;
  /** Total acumulado da sessão, sempre calculado pelo servidor (SCORE-05). */
  score: number;
  /**
   * Pontos ganhos na rodada corrente. `null` enquanto o jogador não acertou:
   * distingue "ainda não acertou" de "acertou e levou 0", caso que a fórmula
   * atual não produz mas que uma mudança de fórmula criaria.
   */
  roundPoints: number | null;
}

export interface RoomView {
  code: string;
  phase: RoomPhase;
  round: number;
  hostId: string;
  players: PlayerView[];
  you: {
    id: string;
    nickname: string;
  };
  guessHistory: string[];
  roundStartedAt: number | null;
  serverNow: number;
}

export interface CreateRoomInput {
  nickname: string;
}

export interface JoinRoomInput {
  code: string;
  nickname: string;
}

export interface ReadyInput {
  ready: boolean;
}

export interface GuessInput {
  text: string;
}

/**
 * Único payload do protocolo que identifica um terceiro: todos os outros
 * eventos agem sobre quem os emite. É o anfitrião tirando da sala alguém que
 * caiu e não voltou — sem isso, `everyoneReady` nunca fecha e a sala não
 * consegue começar a rodada seguinte.
 */
export interface RemoveAbsentInput {
  playerId: string;
}

export interface RoomActionSuccess {
  ok: true;
  roomCode: string;
  playerId: string;
  sessionToken: string;
  room: RoomView;
}

export interface RoomActionFailure {
  ok: false;
  code: string;
  message: string;
}

export type RoomActionResult = RoomActionSuccess | RoomActionFailure;

export interface GuessResultPayload {
  correct: boolean;
  alreadySolved: boolean;
  attempts: number;
  message: string;
  history: string[];
}

export interface PlayerSolvedPayload {
  playerId: string;
  nickname: string;
  rank: number;
  solveMs: number;
}

export interface RoundStartedPayload {
  room: RoomView;
}

export interface RoundFinishedPayload {
  room: RoomView;
  ranking: Array<{
    playerId: string;
    nickname: string;
    rank: number | null;
    solveMs: number | null;
  }>;
}

export interface GameErrorPayload {
  code: string;
  message: string;
}

export interface RoomNoticePayload {
  code: string;
  message: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomInput, ack: (result: RoomActionResult) => void) => void;
  'room:join': (payload: JoinRoomInput, ack: (result: RoomActionResult) => void) => void;
  'player:ready': (payload: ReadyInput) => void;
  'round:guess': (payload: GuessInput) => void;
  'round:playAgain': () => void;
  // A rodada só termina sozinha quando todo mundo acerta, então um jogador que
  // cai antes de descobrir a própria identidade a congela para sempre. Este
  // comando é a saída manual: o anfitrião encerra a rodada travada e a sala
  // segue para a próxima sem precisar ser dissolvida.
  'round:endEarly': () => void;
  'room:removeAbsent': (payload: RemoveAbsentInput) => void;
  'room:leave': () => void;
}

export interface ServerToClientEvents {
  'room:state': (room: RoomView) => void;
  'round:started': (payload: RoundStartedPayload) => void;
  'guess:result': (payload: GuessResultPayload) => void;
  'player:solved': (payload: PlayerSolvedPayload) => void;
  'round:finished': (payload: RoundFinishedPayload) => void;
  'room:notice': (payload: RoomNoticePayload) => void;
  error: (payload: GameErrorPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  roomCode?: string;
  playerId?: string;
}
