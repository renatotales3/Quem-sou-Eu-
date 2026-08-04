import { describe, expect, it } from 'vitest';
import { characterMatches, characters, englishOriginals, totalSeedCount } from '../server/wordlist';
import { normalizeText } from '../server/normalization';

describe('wordlist', () => {
  it('tem uma lista grande e IDs únicos', () => {
    expect(characters.length).toBeGreaterThanOrEqual(250);
    expect(new Set(characters.map((character) => character.id)).size).toBe(characters.length);
    expect(new Set(characters.map((character) => normalizeText(character.name))).size).toBe(characters.length);
  });

  it('nenhuma colisão silenciosa de tradução encolheu o catálogo (guarda contra WORD-05)', () => {
    // uniqueSeeds descarta em silêncio qualquer entrada cujo nome normalizado
    // já apareceu antes. Se duas traduções colidirem (ex.: dois personagens
    // virando "Fera"), characters.length cai abaixo de totalSeedCount sem erro.
    expect(characters.length).toBe(totalSeedCount);
  });

  it('nenhum valor de englishOriginals aparece como nome exibido no catálogo (WORD-06)', () => {
    const displayedNames = new Set(characters.map((character) => character.name));
    for (const originalName of Object.values(englishOriginals)) {
      expect(displayedNames.has(originalName)).toBe(false);
    }
  });

  it('exibe o Homem-Aranha em PT-BR e aceita o nome original em inglês como palpite (WORD-01, WORD-02, WORD-03)', () => {
    const homemAranha = characters.find((character) => character.name === 'Homem-Aranha');
    expect(homemAranha).toBeDefined();
    expect(characters.some((character) => character.name === 'Spider-Man')).toBe(false);
    expect(characterMatches(homemAranha!, 'Spider-Man')).toBe(true);
    expect(characterMatches(homemAranha!, 'Peter Parker')).toBe(true);
  });

  it('aceita o palpite em PT-BR sem acentuação (WORD-04)', () => {
    const doutorEstranho = characters.find((character) => character.name === 'Doutor Estranho');
    expect(doutorEstranho).toBeDefined();
    expect(characterMatches(doutorEstranho!, 'doutor estranho')).toBe(true);

    const capitaoAmerica = characters.find((character) => character.name === 'Capitão América');
    expect(capitaoAmerica).toBeDefined();
    expect(characterMatches(capitaoAmerica!, 'capitao america')).toBe(true);
  });

  it('mantém nomes que já são a forma reconhecida no Brasil (AD-001)', () => {
    expect(characters.some((character) => character.name === 'Batman')).toBe(true);
    expect(characters.some((character) => character.name === 'Goku')).toBe(true);
    const superman = characters.find((character) => character.name === 'Superman');
    expect(superman).toBeDefined();
    expect(characterMatches(superman!, 'Super-Homem')).toBe(true);
  });

  it('aceita nomes normalizados e aliases sem correspondência aproximada', () => {
    const homemAranha = characters.find((character) => character.name === 'Homem-Aranha');
    expect(homemAranha).toBeDefined();
    expect(characterMatches(homemAranha!, '  pÉtEr   pArKeR ')).toBe(true);
    expect(characterMatches(homemAranha!, 'Homem-Aranha!')).toBe(true);
    expect(characterMatches(homemAranha!, 'Homem Aranhax')).toBe(false);
  });

  it('corrige só a acentuação de pessoas reais e ainda aceita o palpite em inglês quando a grafia difere (WORD-02, WORD-03)', () => {
    const napoleao = characters.find((character) => character.name === 'Napoleão Bonaparte');
    expect(napoleao).toBeDefined();
    expect(characters.some((character) => character.name === 'Napoleon Bonaparte')).toBe(false);
    // "Napoleão" x "Napoleon" não é só diferença de acento (ão x on), então
    // sem o alias em englishOriginals o palpite em inglês não bateria.
    expect(characterMatches(napoleao!, 'Napoleon Bonaparte')).toBe(true);

    const cleopatra = characters.find((character) => character.name === 'Cleópatra');
    expect(cleopatra).toBeDefined();
    expect(characterMatches(cleopatra!, 'Cleopatra')).toBe(true);
  });

  it('traduz nomes de fantasia/ficção com forma consagrada e mantém o catálogo com pelo menos 250 personagens (WORD-01, WORD-05)', () => {
    expect(characters.length).toBeGreaterThanOrEqual(250);
    const frodo = characters.find((character) => character.name === 'Frodo Bolseiro');
    expect(frodo).toBeDefined();
    expect(characterMatches(frodo!, 'Frodo Baggins')).toBe(true);

    const dumbledore = characters.find((character) => character.name === 'Alvo Dumbledore');
    expect(dumbledore).toBeDefined();
    expect(characterMatches(dumbledore!, 'Albus Dumbledore')).toBe(true);
  });
});
