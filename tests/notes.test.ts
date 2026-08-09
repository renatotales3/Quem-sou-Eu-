import { describe, expect, it } from 'vitest';
import { MAX_NOTE_LENGTH, notesStorageKey } from '../src/notes';

describe('notesStorageKey', () => {
  it('deriva a chave do prefixo, do código da sala e da rodada', () => {
    expect(notesStorageKey('ABC123', 1)).toBe('quem-sou-eu:notes:ABC123:1');
  });

  it('usa chaves distintas para rodadas diferentes na mesma sala', () => {
    expect(notesStorageKey('ABC123', 1)).not.toBe(notesStorageKey('ABC123', 2));
  });

  it('usa chaves distintas para salas diferentes na mesma rodada', () => {
    expect(notesStorageKey('ABC123', 1)).not.toBe(notesStorageKey('XYZ789', 1));
  });
});

describe('MAX_NOTE_LENGTH', () => {
  it('limita a nota em 2000 caracteres', () => {
    expect(MAX_NOTE_LENGTH).toBe(2000);
  });
});
