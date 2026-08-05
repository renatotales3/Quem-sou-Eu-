#!/usr/bin/env node
/**
 * scripts/resolve-tmdb-images.mjs
 *
 * Script de curadoria dev-only (fora do build, fora de todo tsconfig).
 * Terceira fonte do catálogo de imagens: personagens LIVE-ACTION das
 * categorias "Cinema", "Séries" e "Fantasia e ficção científica" em
 * server/wordlist.ts que ainda não têm imagem em server/character-images.ts.
 * Resolve um retrato via TMDB (The Movie Database) e grava candidatos em
 * .image-candidates/tmdb.json para revisão visual humana posterior — este
 * script NÃO integra nada no catálogo e NÃO faz a revisão visual.
 *
 * === O problema central: TMDB não indexa personagens ===
 * A API do TMDB tem filmes, séries e pessoas — não tem um endpoint de
 * "personagem". Para achar o retrato de um personagem live-action o caminho
 * é sempre indireto:
 *   1. Buscar a obra (/search/movie ou /search/tv) — ver WORK_HINTS abaixo,
 *      porque o nome do personagem raramente é o título da obra (Walter
 *      White -> "Breaking Bad", não "Walter White").
 *   2. Pegar o elenco (/movie/{id}/credits ou /tv/{id}/aggregate_credits —
 *      o aggregate_credits é necessário para séries longas: o /credits de TV
 *      só devolve o elenco da temporada atual/mais recente e por isso perde
 *      gente como Steve Carell em "The Office", que saiu antes do final).
 *   3. Achar o membro do elenco cujo campo `character` casa com o nosso
 *      personagem — nunca por chute. WORK_HINTS grava o texto exato (ou os
 *      textos, quando mais de um precisa aparecer) que precisa estar contido
 *      no `character` devolvido pela API; se não achar, o candidato vira
 *      status 'none' em vez de inventar um casamento.
 *   4. Usar o `profile_path` do ator casado -> URL final com prefixo
 *      https://image.tmdb.org/t/p/w300 (300px de largura, coerente com o
 *      teto de 400px do IMG-06 — mesma lógica de thumbnail pequeno do
 *      Commons, aplicada à imagem de pessoa do TMDB).
 *
 * === Por que "Não force animação nem anime" também vale para máscara/CGI ===
 * Se o personagem é desenho, a foto do dublador não é o personagem — a
 * missão já pede para pular esses (ver NO_LIVE_ACTION_FORM). A mesma lógica
 * se aplica, por extensão, a personagens em que o rosto do ator nunca é
 * visível na tela: armadura fechada (Sauron), máscara (Darth Vader),
 * boneco/CGI (Yoda, R2-D2) ou maquiagem/CGI que altera o rosto a ponto de a
 * foto normal do ator não ser reconhecível como o personagem (Voldemort,
 * calvo e sem nariz nos filmes — Ralph Fiennes de terno não é reconhecível
 * como Voldemort). Esses entram em NO_LIVE_ACTION_FORM com o motivo
 * registrado, mesmo quando o TMDB tecnicamente devolve um `character` que
 * bate (ex.: Sala Baker está creditado como "Sauron") — o casamento de nome
 * está correto, o problema é que a foto não retrata o personagem.
 *
 * === Aviso de não-endosso (obrigatório na interface quando essas imagens
 * entrarem no catálogo) ===
 * "Este produto usa a API do TMDB mas não é endossado nem certificado pelo
 * TMDB." Quem integrar estes candidatos precisa exibir este aviso — os
 * termos da API do TMDB exigem isso como condição de uso.
 *
 * === Limitação conhecida: cache de 6 meses ===
 * Os termos do TMDB proíbem cache das imagens por mais de 6 meses. As URLs
 * gravadas em .image-candidates/tmdb.json (e depois em
 * server/character-images.ts, se um integrador aprovar) precisam ser
 * rerresolvidas periodicamente — um `profile_path` pode mudar ou a imagem
 * "principal" do ator no TMDB pode ser substituída por outra. Este script
 * não agenda essa rerresolução; é responsabilidade de quem mantiver o
 * catálogo depois de integrado.
 *
 * === Licença: não existe licença livre aqui ===
 * `license` em cada candidato registra a base de uso, não uma licença
 * Creative Commons: os termos da API do TMDB permitem uso não comercial da
 * API/dos dados, mas a fotografia do ator continua sendo direito do estúdio
 * ou fotógrafo profissional que a tirou. Hospedar via TMDB não concede
 * licença livre sobre a imagem — mesma postura já registrada para AniList em
 * scripts/resolve-anime-images.mjs.
 *
 * === Chave de API ===
 * Lida de process.env.TMDB_API_KEY (com fallback: se ausente, este script lê
 * TMDB_API_KEY de um arquivo .env na raiz do repo — já no .gitignore).
 * NUNCA grave a chave em código, log ou em qualquer arquivo versionado.
 *
 * NUNCA importar este arquivo de server/ ou src/: ele fala com a rede do
 * TMDB, o que é proibido em runtime (IMG-05).
 *
 * Uso: node scripts/resolve-tmdb-images.mjs [--out DIR]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const WORDLIST_PATH = path.join(REPO_ROOT, 'server', 'wordlist.ts');
const CHARACTER_IMAGES_PATH = path.join(REPO_ROOT, 'server', 'character-images.ts');
const ENV_PATH = path.join(REPO_ROOT, '.env');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, '.image-candidates');

const TARGET_CATEGORIES = ['Cinema', 'Séries', 'Fantasia e ficção científica'];
const TMDB_API = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';
const REQUEST_DELAY_MS = 350; // TMDB não documenta um limite fixo, mas pede uso razoável; ~3 req/s fica bem folgado.

const SOURCE = 'TMDB';
const NON_ENDORSEMENT_NOTICE =
  'Este produto usa a API do TMDB mas não é endossado nem certificado pelo TMDB.';
const LICENSE_TEXT =
  'Uso não comercial via API do TMDB (sujeito ao aviso de não-endosso do TMDB); a fotografia em si permanece sob direito do estúdio ou do fotógrafo profissional — TMDB licencia o acesso à API/aos dados para uso não comercial, não é licença livre da imagem. Cache acima de 6 meses é proibido pelos termos da API: a URL precisa ser rerresolvida periodicamente.';

/**
 * Personagem -> obra + evidência esperada no campo `character` do elenco.
 *
 * `character` pode ser uma string (precisa aparecer, normalizada) ou um
 * array de strings (todas precisam aparecer — usado quando o campo devolvido
 * mistura sobrenome e apelido, ex. "Tyrion 'The Halfman' Lannister": conferir
 * "Tyrion" e "Lannister" separadamente é mais robusto que casar a frase
 * inteira). `year`/`originCountry` desambiguam buscas com múltiplos
 * resultados plausíveis (remakes, versões internacionais).
 */
const WORK_HINTS = {
  // --- Cinema ---
  'Forrest Gump': { type: 'movie', title: 'Forrest Gump', character: 'Forrest Gump' },
  'James Bond': { type: 'movie', title: 'Skyfall', character: 'James Bond' },
  'Ethan Hunt': { type: 'movie', title: 'Mission: Impossible', year: 1996, character: 'Ethan Hunt' },
  'John Wick': { type: 'movie', title: 'John Wick', character: 'John Wick' },
  Rambo: { type: 'movie', title: 'First Blood', character: 'Rambo' },
  'Marty McFly': { type: 'movie', title: 'Back to the Future', character: 'Marty McFly' },
  'Doc Brown': { type: 'movie', title: 'Back to the Future', character: 'Emmett Brown' },
  'Jack Sparrow': {
    type: 'movie',
    title: 'Pirates of the Caribbean: The Curse of the Black Pearl',
    character: 'Jack Sparrow',
  },
  'Willy Wonka': { type: 'movie', title: 'Charlie and the Chocolate Factory', character: 'Willy Wonka' },
  'Mary Poppins': { type: 'movie', title: 'Mary Poppins', year: 1964, character: 'Mary Poppins' },
  'Kevin McCallister': { type: 'movie', title: 'Home Alone', year: 1990, character: 'Kevin' },
  'Elle Woods': { type: 'movie', title: 'Legally Blonde', character: 'Elle Woods' },
  'Vito Corleone': { type: 'movie', title: 'The Godfather', character: 'Vito Corleone' },
  'Michael Corleone': { type: 'movie', title: 'The Godfather', character: 'Michael Corleone' },
  'Tony Montana': { type: 'movie', title: 'Scarface', year: 1983, character: 'Tony Montana' },
  'Jules Winnfield': { type: 'movie', title: 'Pulp Fiction', character: 'Jules Winnfield' },
  'Beatrix Kiddo': { type: 'movie', title: 'Kill Bill: Vol. 2', character: 'Beatrix Kiddo' },
  Maximus: { type: 'movie', title: 'Gladiator', year: 2000, character: 'Maximus' },
  'William Wallace': { type: 'movie', title: 'Braveheart', character: 'William Wallace' },

  // --- Séries ---
  'Saul Goodman': { type: 'tv', title: 'Breaking Bad', character: 'Saul Goodman' },
  'John Watson': { type: 'tv', title: 'Sherlock', character: 'John Watson' },
  'Michael Scott': { type: 'tv', title: 'The Office', originCountry: 'US', character: 'Michael Scott' },
  'Jim Halpert': { type: 'tv', title: 'The Office', originCountry: 'US', character: 'Jim Halpert' },
  'Rachel Green': { type: 'tv', title: 'Friends', character: 'Rachel Green' },
  'Ross Geller': { type: 'tv', title: 'Friends', character: 'Ross Geller' },
  'Monica Geller': { type: 'tv', title: 'Friends', character: 'Monica Geller' },
  'Chandler Bing': { type: 'tv', title: 'Friends', character: 'Chandler Bing' },
  'Joey Tribbiani': { type: 'tv', title: 'Friends', character: 'Joey Tribbiani' },
  'Dexter Morgan': { type: 'tv', title: 'Dexter', character: 'Dexter Morgan' },
  'Daenerys Targaryen': { type: 'tv', title: 'Game of Thrones', character: 'Daenerys Targaryen' },
  'Jon Snow': { type: 'tv', title: 'Game of Thrones', character: 'Jon Snow' },
  'Arya Stark': { type: 'tv', title: 'Game of Thrones', character: 'Arya Stark' },
  'Tyrion Lannister': { type: 'tv', title: 'Game of Thrones', character: ['Tyrion', 'Lannister'] },
  Onze: { type: 'tv', title: 'Stranger Things', character: 'Eleven' }, // Onze -> englishOriginals 'Eleven'
  'Thomas Shelby': { type: 'tv', title: 'Peaky Blinders', character: 'Thomas Shelby' },

  // --- Fantasia e ficção científica ---
  'Frodo Bolseiro': {
    type: 'movie',
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    character: 'Frodo',
  },
  'Harry Potter': { type: 'movie', title: "Harry Potter and the Philosopher's Stone", character: 'Harry Potter' },
  'Hermione Granger': {
    type: 'movie',
    title: "Harry Potter and the Philosopher's Stone",
    character: 'Hermione Granger',
  },
  'Alvo Dumbledore': {
    type: 'movie',
    title: "Harry Potter and the Philosopher's Stone",
    character: 'Albus Dumbledore',
  },
  'Severo Snape': { type: 'movie', title: "Harry Potter and the Philosopher's Stone", character: 'Severus Snape' },
  'Katniss Everdeen': { type: 'movie', title: 'The Hunger Games', year: 2012, character: 'Katniss Everdeen' },
  'Leia Organa': { type: 'movie', title: 'Star Wars', year: 1977, character: ['Leia', 'Organa'] },
  'Obi-Wan Kenobi': { type: 'movie', title: 'Star Wars', year: 1977, character: ['Obi-Wan', 'Kenobi'] },
  Rey: { type: 'movie', title: 'Star Wars: The Force Awakens', character: 'Rey' },
  Neo: { type: 'movie', title: 'The Matrix', character: 'Neo' },
  Trinity: { type: 'movie', title: 'The Matrix', character: 'Trinity' },
};

/**
 * Personagens do escopo que não têm forma live-action fotografável: ou são
 * desenho (dublador != personagem), ou a forma reconhecível na tela esconde
 * o rosto do ator (armadura, máscara, boneco/CGI) ou o altera tanto que a
 * foto de elenco comum não é reconhecível como o personagem. Ver cabeçalho.
 * Não fazem chamada de rede — o motivo já é conhecido de antemão.
 */
const NO_LIVE_ACTION_FORM = {
  // Cinema — desenho, mesmo quando existe versão live-action do estúdio
  // (ex. Grinch com Jim Carrey): a forma pela qual o personagem é
  // reconhecido é a de desenho, e ali só existe pôster ou foto do dublador.
  Grinch: 'personagem de animação (Dr. Seuss); TMDB só devolveria pôster do filme ou foto do dublador/ator em fantasia, nenhum dos dois é o visual reconhecível do personagem',
  Shrek: 'personagem de animação; TMDB só devolveria pôster do filme ou foto do dublador, nenhum dos dois é o personagem',
  Gru: 'personagem de animação; TMDB só devolveria pôster do filme ou foto do dublador, nenhum dos dois é o personagem',
  'Jack Skellington': 'personagem de animação (stop-motion); TMDB só devolveria pôster do filme ou foto do dublador, nenhum dos dois é o personagem',

  // Fantasia e ficção científica — live-action, mas rosto do ator nunca é o
  // visual reconhecível do personagem na tela.
  Sauron: 'na tela é armadura fechada ou o olho em CGI; o ator (Sala Baker, LOTR) nunca aparece de rosto visível como Sauron — a foto de elenco não retrata o personagem',
  'Darth Vader': 'na tela é uma máscara/armadura fechada (performer David Prowse, voz James Earl Jones); o rosto do ator não é o visual reconhecível do personagem',
  Yoda: 'boneco/CGI (interpretado e dublado por Frank Oz); não há rosto humano na tela para fotografar como o personagem',
  'R2-D2': 'é um droide/prop fechado (ator Kenny Baker por dentro); não há rosto do personagem para fotografar — a foto de elenco é do ator, não do droide',
  Voldemort: 'na tela o ator (Ralph Fiennes) tem o rosto alterado por CGI/maquiagem (calvo, sem nariz); a foto de elenco comum não é reconhecível como o personagem visto nos filmes',
};

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT_DIR };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out' && argv[i + 1]) {
      args.out = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

/** Normalização ASCII simples para comparar texto vindo da API (sem acentuação/pontuação). */
function normalizeAscii(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Lê a chave da API do ambiente; se ausente, tenta um .env local (nunca a grava em lugar nenhum). */
function loadApiKey() {
  if (process.env.TMDB_API_KEY) return process.env.TMDB_API_KEY;
  if (fs.existsSync(ENV_PATH)) {
    const src = fs.readFileSync(ENV_PATH, 'utf8');
    for (const line of src.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key === 'TMDB_API_KEY') {
        return trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return null;
}

/** Lê nome+categoria das categorias em TARGET_CATEGORIES a partir de server/wordlist.ts. */
function readCatalog() {
  const src = fs.readFileSync(WORDLIST_PATH, 'utf8');
  const start = src.indexOf('const characterSets');
  if (start === -1) throw new Error('Não encontrei "const characterSets" em server/wordlist.ts');
  const end = src.indexOf('\n};', start);
  if (end === -1) throw new Error('Não encontrei o fim do bloco characterSets em server/wordlist.ts');
  const block = src.slice(start, end);
  const lines = block.split('\n').slice(1);

  const lineRe = /^\s*(?:'([^']+)'|([^:]+)):\s*`([^`]+)`,?\s*$/;
  const entries = [];
  for (const line of lines) {
    const match = line.match(lineRe);
    if (!match) continue;
    const category = (match[1] ?? match[2]).trim();
    if (!TARGET_CATEGORIES.includes(category)) continue;
    for (const name of match[3].split('|').map((n) => n.trim()).filter(Boolean)) {
      entries.push({ name, category });
    }
  }
  return entries;
}

/** Lê as chaves já cobertas em server/character-images.ts (normalizadas). */
function readCoveredKeys() {
  const src = fs.readFileSync(CHARACTER_IMAGES_PATH, 'utf8');
  const start = src.indexOf('export const characterImages');
  if (start === -1) throw new Error('Não encontrei "export const characterImages" em server/character-images.ts');
  const block = src.slice(start);
  const keyRe = /^\s*(?:'([^']+)'|([a-zA-Z0-9_]+)):\s*\{/gm;
  const covered = new Set();
  let match;
  while ((match = keyRe.exec(block)) !== null) {
    covered.add((match[1] ?? match[2]).trim());
  }
  return covered;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tmdbGet(apiKey, endpoint, params) {
  const url = new URL(`${TMDB_API}${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB devolveu ${res.status} para ${endpoint}: ${await res.text()}`);
  }
  return res.json();
}

/** Busca a obra (filme ou série) e devolve o melhor resultado batendo year/originCountry quando informado. */
async function findWork(apiKey, hint) {
  const endpoint = hint.type === 'movie' ? '/search/movie' : '/search/tv';
  const params = { query: hint.title };
  if (hint.type === 'movie' && hint.year) params.year = hint.year;
  const json = await tmdbGet(apiKey, endpoint, params);
  const results = json.results ?? [];
  if (results.length === 0) return null;

  if (hint.type === 'tv' && hint.originCountry) {
    const match = results.find((r) => (r.origin_country ?? []).includes(hint.originCountry));
    if (match) return match;
  }
  return results[0];
}

/** Junta o(s) papel(is) de um membro do elenco em uma única string de character. */
function castCharacterText(castMember) {
  if (Array.isArray(castMember.roles)) {
    return castMember.roles.map((r) => r.character).join(' / ');
  }
  return castMember.character ?? '';
}

/** Confere se characterText contém todas as substrings esperadas por hint.character. */
function characterMatches(characterText, expected) {
  const normalizedText = normalizeAscii(characterText);
  const needles = Array.isArray(expected) ? expected : [expected];
  return needles.every((needle) => normalizedText.includes(normalizeAscii(needle)));
}

async function findCastMatch(apiKey, work, hint) {
  const endpoint =
    hint.type === 'movie' ? `/movie/${work.id}/credits` : `/tv/${work.id}/aggregate_credits`;
  const json = await tmdbGet(apiKey, endpoint, {});
  const cast = json.cast ?? [];
  return cast.find((member) => characterMatches(castCharacterText(member), hint.character)) ?? null;
}

function workLabel(hint, work) {
  const year = hint.type === 'movie' ? (work.release_date ?? '').slice(0, 4) : (work.first_air_date ?? '').slice(0, 4);
  return `${work.title ?? work.name}${year ? ` (${year})` : ''}`;
}

async function resolveOne(apiKey, entry) {
  const base = { name: entry.name, category: entry.category, source: SOURCE };

  const skipReason = NO_LIVE_ACTION_FORM[entry.name];
  if (skipReason) {
    return { ...base, url: null, author: null, license: null, status: 'none', reason: skipReason, evidence: null };
  }

  const hint = WORK_HINTS[entry.name];
  if (!hint) {
    return {
      ...base,
      url: null,
      author: null,
      license: null,
      status: 'none',
      reason: 'sem WORK_HINTS mapeado para este personagem',
      evidence: null,
    };
  }

  const work = await findWork(apiKey, hint);
  await sleep(REQUEST_DELAY_MS);
  if (!work) {
    return {
      ...base,
      url: null,
      author: null,
      license: null,
      status: 'none',
      reason: `obra "${hint.title}" não encontrada no TMDB (${hint.type})`,
      evidence: null,
    };
  }

  const castMatch = await findCastMatch(apiKey, work, hint);
  await sleep(REQUEST_DELAY_MS);
  if (!castMatch) {
    return {
      ...base,
      url: null,
      author: null,
      license: null,
      status: 'none',
      reason: `personagem não encontrado no elenco de "${workLabel(hint, work)}" (TMDB ${hint.type}/${work.id})`,
      evidence: null,
    };
  }

  const characterText = castCharacterText(castMatch);
  const evidence = `${workLabel(hint, work)} — TMDB ${hint.type}/${work.id} — elenco: ${castMatch.name} como "${characterText}"`;

  if (!castMatch.profile_path) {
    return {
      ...base,
      url: null,
      author: castMatch.name,
      license: null,
      status: 'none',
      reason: `ator "${castMatch.name}" casado com o personagem, mas sem profile_path no TMDB`,
      evidence,
    };
  }

  return {
    ...base,
    url: `${IMAGE_BASE}${castMatch.profile_path}`,
    author: castMatch.name,
    license: LICENSE_TEXT,
    status: 'survivor',
    reason: null,
    evidence,
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Grava um contact sheet HTML com os candidatos resolvidos, para revisão visual humana. */
function writeContactSheet(survivors, outPath) {
  const cards = survivors
    .map(
      (c) => `    <figure class="card">
      <img src="${escapeHtml(c.url)}" alt="${escapeHtml(c.name)}" loading="lazy" />
      <figcaption>
        <strong>${escapeHtml(c.name)}</strong>
        <span class="category">${escapeHtml(c.category)}</span>
        <span class="evidence">${escapeHtml(c.evidence)}</span>
        <span class="credit">${escapeHtml(c.author)}</span>
      </figcaption>
    </figure>`,
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Contact sheet — candidatos TMDB (live-action)</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #111; color: #eee; }
  h1 { font-size: 1.25rem; margin-bottom: 4px; }
  p.meta { color: #999; margin-top: 0; max-width: 70ch; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 24px; padding: 0; }
  .card { background: #1c1c1c; border: 1px solid #333; border-radius: 8px; padding: 8px; margin: 0; }
  .card img { width: 100%; height: 180px; object-fit: cover; border-radius: 4px; display: block; background: #000; }
  figcaption { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; font-size: 0.8rem; }
  figcaption strong { font-size: 0.95rem; }
  .category { color: #9ad; }
  .evidence { color: #888; font-size: 0.7rem; }
  .credit { color: #bbb; font-style: italic; }
</style>
</head>
<body>
  <h1>Contact sheet — candidatos TMDB (categorias: Cinema, Séries, Fantasia e ficção científica)</h1>
  <p class="meta">${survivors.length} candidatos resolvidos e com identidade confirmada pelo campo "character" do elenco, pendentes de revisão visual. A foto é do ATOR, não do personagem — confira se o rosto/traje é reconhecível como o personagem antes de aprovar. Este produto usa a API do TMDB mas não é endossado nem certificado pelo TMDB. Gerado por scripts/resolve-tmdb-images.mjs.</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>
`;

  fs.writeFileSync(outPath, html);
}

function printReport(candidates, skippedCovered) {
  const survivors = candidates.filter((c) => c.status === 'survivor');
  const none = candidates.filter((c) => c.status === 'none');

  console.log('\n=== Relatório de resolução TMDB (live-action) ===');
  console.log(`Categorias: ${TARGET_CATEGORIES.join(', ')}`);
  console.log(`Já cobertos em character-images.ts (pulados): ${skippedCovered}`);
  console.log(`Personagens tentados: ${candidates.length}`);
  console.log(`Resolvidos com identidade confirmada: ${survivors.length}`);
  console.log(`Sem resultado: ${none.length}`);
  for (const c of none) {
    console.log(`  ${c.name}: ${c.reason}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });

  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('TMDB_API_KEY não encontrada em process.env nem em .env na raiz do repo.');
  }

  const allEntries = readCatalog();
  const covered = readCoveredKeys();
  const coveredNormalized = new Set([...covered].map((k) => normalizeAscii(k)));

  const entries = allEntries.filter((e) => !coveredNormalized.has(normalizeAscii(e.name)));
  const skippedCovered = allEntries.length - entries.length;
  console.error(`Categorias ${TARGET_CATEGORIES.join(', ')}: ${allEntries.length} personagens, ${skippedCovered} já cobertos, ${entries.length} a tentar.`);

  const candidates = [];
  for (const entry of entries) {
    console.error(`Resolvendo "${entry.name}" (${entry.category})...`);
    candidates.push(await resolveOne(apiKey, entry));
  }

  const candidatesPath = path.join(args.out, 'tmdb.json');
  fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2));
  console.error(`Gravado: ${candidatesPath}`);

  const survivors = candidates.filter((c) => c.status === 'survivor');
  const contactSheetPath = path.join(args.out, 'tmdb-contact-sheet.html');
  writeContactSheet(survivors, contactSheetPath);
  console.error(`Gravado: ${contactSheetPath}`);

  printReport(candidates, skippedCovered);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
