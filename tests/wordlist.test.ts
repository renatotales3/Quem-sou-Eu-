import { describe, expect, it } from 'vitest';
import { characterMatches, characters } from '../server/wordlist';
import { normalizeText } from '../server/normalization';

describe('wordlist', () => {
  it('tem uma lista grande e IDs únicos', () => {
    expect(characters.length).toBeGreaterThanOrEqual(250);
    expect(new Set(characters.map((character) => character.id)).size).toBe(characters.length);
    expect(new Set(characters.map((character) => normalizeText(character.name))).size).toBe(characters.length);
  });

  it('aceita nomes normalizados e aliases sem correspondência aproximada', () => {
    const spiderMan = characters.find((character) => character.name === 'Spider-Man');
    expect(spiderMan).toBeDefined();
    expect(characterMatches(spiderMan!, '  pÉtEr   pArKeR ')).toBe(true);
    expect(characterMatches(spiderMan!, 'Spider-Man!')).toBe(true);
    expect(characterMatches(spiderMan!, 'Spider Manx')).toBe(false);
  });
});
