export type RoomPhase = 'lobby' | 'playing' | 'finished';

export interface CharacterPublic {
  id: string;
  name: string;
  category: string;
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
  }>;
}

export interface GameErrorPayload {
  code: string;
  message: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomInput, ack: (result: RoomActionResult) => void) => void;
  'room:join': (payload: JoinRoomInput, ack: (result: RoomActionResult) => void) => void;
  'player:ready': (payload: ReadyInput) => void;
  'round:guess': (payload: GuessInput) => void;
  'round:playAgain': () => void;
  'room:leave': () => void;
}

export interface ServerToClientEvents {
  'room:state': (room: RoomView) => void;
  'round:started': (payload: RoundStartedPayload) => void;
  'guess:result': (payload: GuessResultPayload) => void;
  'player:solved': (payload: PlayerSolvedPayload) => void;
  'round:finished': (payload: RoundFinishedPayload) => void;
  error: (payload: GameErrorPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  roomCode?: string;
  playerId?: string;
}
