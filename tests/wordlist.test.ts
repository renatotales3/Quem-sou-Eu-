import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { characterMatches, characters, englishOriginals, pickCharacters, totalSeedCount } from '../server/wordlist';
import { characterImages } from '../server/character-images';
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

  it('pickCharacters sem excludeIds mantém o comportamento atual (POOL-01)', () => {
    const picked = pickCharacters(5);
    expect(picked.length).toBe(5);
    expect(new Set(picked.map((character) => character.id)).size).toBe(5);
    for (const character of picked) {
      expect(characters.some((candidate) => candidate.id === character.id)).toBe(true);
    }
  });

  it('pickCharacters nunca retorna um id excluído (POOL-01)', () => {
    const excludeIds = new Set(characters.slice(0, 10).map((character) => character.id));
    const picked = pickCharacters(20, excludeIds);
    expect(picked.length).toBe(20);
    for (const character of picked) {
      expect(excludeIds.has(character.id)).toBe(false);
    }
  });

  it('pickCharacters com amount maior que o disponível retorna só o disponível, sem repetir', () => {
    const excludeIds = new Set(characters.slice(3).map((character) => character.id));
    const picked = pickCharacters(characters.length, excludeIds);
    expect(picked.length).toBe(3);
    expect(new Set(picked.map((character) => character.id)).size).toBe(3);
  });
});

describe('catálogo de imagens', () => {
  it('toda chave de characterImages casa com um personagem existente (guarda contra rename órfão, IMG-04)', () => {
    const displayedKeys = new Set(characters.map((character) => normalizeText(character.name)));
    for (const key of Object.keys(characterImages)) {
      expect(displayedKeys.has(key)).toBe(true);
    }
  });

  it('toda entrada aprovada tem autor, licença e fonte preenchidos (IMG-03, IMG-07)', () => {
    expect(Object.keys(characterImages).length).toBeGreaterThan(0);
    for (const image of Object.values(characterImages)) {
      expect(image.author.trim().length).toBeGreaterThan(0);
      expect(image.license.trim().length).toBeGreaterThan(0);
      expect(image.source.trim().length).toBeGreaterThan(0);
    }
  });

  it('só existem as fontes conhecidas do catálogo (IMG-02)', () => {
    const knownSources = new Set(['Wikimedia Commons', 'AniList', 'TMDB', 'Comic Vine']);
    for (const image of Object.values(characterImages)) {
      expect(knownSources.has(image.source)).toBe(true);
    }
  });

  it('toda URL bate com o host esperado da própria fonte, e a do Commons é um thumbnail de no máximo 400px sem parâmetros de rastreamento (IMG-06)', () => {
    // Quatro entradas do Commons não têm "/thumb/" no caminho: o arquivo
    // original já é menor que o limite pedido, então a API do Commons
    // devolve o próprio original como thumbnail (ver comentário no topo de
    // server/character-images.ts). Medido via imageinfo em 2026-08-05
    // (141px-262px de largura) - dentro do limite, só sem o segmento
    // "/thumb/" no caminho. Uma URL nova fora do padrão de thumbnail e fora
    // desta lista quebra o teste, em vez de escapar em silêncio.
    const originalFileExceptions = new Set([
      'https://upload.wikimedia.org/wikipedia/commons/1/15/Star_Wars_-_A_New_Hope%2C_filming_in_Death_Valley_%28cropped%29.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/1/16/Rihanna_visits_U.S._Embassy_in_Barbados_2024_%28cropped%29.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/6/67/Luke_Skywalker_-_Welcome_Banner_%28Cropped%29.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/c/c0/Pac-Man_gameplay_%281x_pixel-perfect_recreation%29.png',
    ]);

    // Host esperado por fonte: cada provedor externo tem um domínio fixo, e
    // uma URL que não bate com o da própria fonte quebra o teste em vez de
    // colar num host qualquer.
    const hostBySource: Record<string, string> = {
      'Wikimedia Commons': 'upload.wikimedia.org',
      AniList: 's4.anilist.co',
      TMDB: 'image.tmdb.org',
      'Comic Vine': 'comicvine.gamespot.com',
    };

    for (const image of Object.values(characterImages)) {
      const parsed = new URL(image.url);
      const expectedHost = hostBySource[image.source];
      expect(expectedHost).toBeDefined();
      expect(parsed.hostname).toBe(expectedHost);
      expect(parsed.search).toBe('');

      if (image.source !== 'Wikimedia Commons') continue;

      const thumbMatch = image.url.match(/\/thumb\/.*\/(\d+)px-[^/]+$/);
      if (thumbMatch) {
        expect(Number(thumbMatch[1])).toBeLessThanOrEqual(400);
      } else {
        expect(originalFileExceptions.has(image.url)).toBe(true);
      }
    }
  });

  it('nenhum arquivo de server/ ou src/ fora de character-images.ts referencia domínio da Wikimedia, AniList, TMDB ou Comic Vine (IMG-05)', () => {
    // IMG-05 proíbe chamada a qualquer fonte externa de imagem em runtime.
    // Com quatro fontes (Commons, AniList, TMDB, Comic Vine), a varredura
    // precisa cobrir os quatro domínios: um código que passasse a falar com
    // qualquer um deles em runtime reintroduziria a mesma dependência
    // externa que a Wikimedia já proibia.
    const externalImageDomain = /wiki(?:pedia|media|data)\.org|anilist\.co|image\.tmdb\.org|comicvine\.gamespot\.com/i;
    const roots = [new URL('../server/', import.meta.url), new URL('../src/', import.meta.url)];
    const offenders: string[] = [];

    function walk(dirUrl: URL): void {
      for (const entry of readdirSync(dirUrl, { withFileTypes: true })) {
        if (entry.name === 'character-images.ts') continue;
        const entryUrl = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, dirUrl);
        if (entry.isDirectory()) {
          walk(entryUrl);
        } else if (externalImageDomain.test(readFileSync(entryUrl, 'utf8'))) {
          offenders.push(entryUrl.pathname);
        }
      }
    }

    for (const root of roots) walk(root);
    expect(offenders).toEqual([]);
  });

  it('Character.image só existe para quem tem entrada aprovada, e reflete url/author/license/source (IMG-01, IMG-02)', () => {
    const withImage = characters.filter((character) => character.image);
    expect(withImage.length).toBe(Object.keys(characterImages).length);
    for (const character of withImage) {
      const curated = characterImages[normalizeText(character.name)];
      expect(character.image).toEqual(curated);
    }

    const withoutImage = characters.filter((character) => !character.image);
    expect(withoutImage.length).toBe(characters.length - withImage.length);
    expect(withoutImage.length).toBeGreaterThan(0);
  });

  it('não guarda entidade HTML em autor, licença nem fonte (IMG-03)', () => {
    // A API do Commons devolve o autor em HTML, então `&amp;` chega no lugar de
    // `&`. React não decodifica entidade em texto de JSX: o card mostraria
    // literalmente "Elliott &amp;amp; Fry" e o crédito ficaria errado. Guarda
    // relevante agora, porque cada provedor novo traz autores em HTML.
    const entidade = /&[a-zA-Z]+;|&#\d+;/;
    const sujas = Object.entries(characterImages)
      .filter(([, image]) => entidade.test(image.author) || entidade.test(image.license) || entidade.test(image.source))
      .map(([key]) => key);
    expect(sujas).toEqual([]);
  });
});
