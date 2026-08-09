import { describe, expect, it } from 'vitest';
import { MAX_NOTE_LENGTH, clearNotes, notesStorageKey, readNotes, saveNotes } from '../src/notes';

function fakeStorage(overrides: Partial<Storage> = {}): Storage {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  };
  return Object.assign(storage, overrides);
}

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

describe('readNotes / saveNotes / clearNotes', () => {
  it('devolve exatamente o texto gravado na mesma sala e rodada (NOTES-06)', () => {
    const storage = fakeStorage();
    saveNotes(storage, 'ABC123', 1, 'não sou homem');
    expect(readNotes(storage, 'ABC123', 1)).toBe('não sou homem');
  });

  it('devolve string vazia numa rodada sem nada gravado (NOTES-07)', () => {
    const storage = fakeStorage();
    saveNotes(storage, 'ABC123', 1, 'não sou homem');
    expect(readNotes(storage, 'ABC123', 2)).toBe('');
  });

  it('esvazia a nota depois de clearNotes (NOTES-08)', () => {
    const storage = fakeStorage();
    saveNotes(storage, 'ABC123', 1, 'sou desenho');
    clearNotes(storage, 'ABC123', 1);
    expect(storage.getItem(notesStorageKey('ABC123', 1))).toBeNull();
    expect(readNotes(storage, 'ABC123', 1)).toBe('');
  });

  it('devolve string vazia, sem lançar, quando getItem lança (NOTES-09)', () => {
    const storage = fakeStorage({
      getItem: () => {
        throw new Error('storage bloqueado');
      },
    });
    expect(readNotes(storage, 'ABC123', 1)).toBe('');
  });

  it('devolve string vazia quando o valor gravado é de tipo inesperado (NOTES-09)', () => {
    const storage = fakeStorage({ getItem: () => 42 as unknown as string });
    expect(readNotes(storage, 'ABC123', 1)).toBe('');
  });

  it('devolve false quando setItem estoura a cota e true no caminho feliz (NOTES-10)', () => {
    const failing = fakeStorage({
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(saveNotes(failing, 'ABC123', 1, 'sou dos anos 90')).toBe(false);
    expect(saveNotes(fakeStorage(), 'ABC123', 1, 'sou dos anos 90')).toBe(true);
  });

  it('trunca em 2000 caracteres um texto de 2001 (NOTES-11)', () => {
    const storage = fakeStorage();
    saveNotes(storage, 'ABC123', 1, 'a'.repeat(2001));
    expect(readNotes(storage, 'ABC123', 1)).toBe('a'.repeat(2000));
  });
});
