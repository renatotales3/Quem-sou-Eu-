const NOTES_KEY_PREFIX = 'quem-sou-eu:notes';

export const MAX_NOTE_LENGTH = 2000;

/** Chave isolada por sala e por rodada, para que uma rodada nova comece vazia. */
export function notesStorageKey(roomCode: string, round: number): string {
  return `${NOTES_KEY_PREFIX}:${roomCode}:${round}`;
}
