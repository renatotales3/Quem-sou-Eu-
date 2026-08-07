#!/usr/bin/env node
/**
 * scripts/resolve-anime-images.mjs
 *
 * Script de curadoria dev-only (fora do build, fora de todo tsconfig).
 * Segunda fonte do catálogo de imagens: para cada personagem da categoria
 * "Anime e mangá" em server/wordlist.ts, resolve um retrato oficial via
 * AniList GraphQL (https://graphql.anilist.co) e grava candidatos em
 * .image-candidates/anilist.json para revisão humana posterior.
 *
 * Por que um script separado de resolve-character-images.mjs: a API é outra
 * (GraphQL em vez de MediaWiki REST), o dado de origem é outro (arte de
 * estúdio via AniList, não Wikidata P18 -> Commons) e o escopo é fixo (só a
 * categoria "Anime e mangá", não o catálogo inteiro) — misturar os dois no
 * mesmo arquivo obrigaria a bifurcar quase toda função por fonte. O contrato
 * de saída (formato do candidato, pasta .image-candidates/) é o mesmo.
 *
 * NUNCA importar este arquivo de server/ ou src/: ele fala com a rede do
 * AniList, o que é proibido em runtime (IMG-05).
 *
 * Uso: node scripts/resolve-anime-images.mjs [--out DIR]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const WORDLIST_PATH = path.join(REPO_ROOT, 'server', 'wordlist.ts');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, '.image-candidates');

const CATEGORY = 'Anime e mangá';
const ANILIST_API = 'https://graphql.anilist.co';
const REQUEST_DELAY_MS = 800; // AniList permite ~90 req/min; 800ms de intervalo fica bem abaixo disso.

const SOURCE = 'AniList';
const AUTHOR = 'Estúdio detentor dos direitos';
const LICENSE = 'Uso não comercial via API do AniList';

/**
 * Nome do catálogo (forma brasileira/ocidental) -> termo de busca no AniList.
 *
 * AniList indexa a maioria dos personagens por nome romanizado do japonês em
 * ordem "nome próprio + sobrenome" e casa bem com busca por nome parcial, mas
 * dois casos do catálogo não resolvem pela forma completa do nosso nome:
 *
 * - "Levi Ackerman": busca por "Levi Ackerman" devolve 404 (Not Found). O
 *   sobrenome Ackerman é revelado tarde na trama e o AniList registra o
 *   personagem só como "Levi" (native リヴァイ). Buscar "Levi" resolve para
 *   id 45627, com alternative ["Levi Heichou", "Captain Levi", "Jinrui
 *   Saikyou no Heishi / Humanity's Strongest Soldier", ...] — inequívoco,
 *   é o Levi de Attack on Titan. Confirmado em 2026-08-05 via GraphQL.
 * - "Tanjiro Kamado": busca pela forma completa devolve 404. O AniList grafa
 *   o nome completo como "Tanjirou Kamado" (com o "u" longo transliterado),
 *   mas buscar só "Tanjiro" já resolve para id 126071, native 竈門炭治郎,
 *   com alternative incluindo variações cômicas de Zenitsu ("Gonpachiro
 *   Kamaboko" etc.) que só existem na trama de Demon Slayer — inequívoco.
 *   Confirmado em 2026-08-05 via GraphQL.
 *
 * Os outros 21 nomes do catálogo resolvem direto pela forma já usada em
 * server/wordlist.ts (inclusive "Luffy" sozinho, sem precisar de "Monkey D.
 * Luffy": o AniList também acha o id 40 pela forma curta). Cada resultado foi
 * conferido manualmente contra native/alternative antes de entrar aqui — ver
 * verifyMatch() abaixo, que grava a confirmação no candidato para auditoria.
 */
const SEARCH_TERM_OVERRIDES = {
  'Levi Ackerman': 'Levi',
  'Tanjiro Kamado': 'Tanjiro',
};

/**
 * Trecho de native/alternative que confirma a identidade de cada
 * personagem do catálogo — não é usado para filtrar a busca, só para deixar
 * gravado no candidato *por que* o resultado foi aceito como o personagem
 * certo (a mesma preocupação do TITLE_OVERRIDES em
 * resolve-character-images.mjs: nunca chutar, sempre citar a evidência).
 */
const IDENTITY_HINTS = {
  Goku: 'Dragon Ball: native 孫悟空, alternative inclui "Goku Son"',
  Vegeta: 'Dragon Ball: native ベジータ, alternative inclui "Prince of All Saiyans"',
  Gohan: 'Dragon Ball: native 孫悟飯, alternative inclui "The Great Saiyaman"',
  Piccolo: 'Dragon Ball: native ピッコロ, alternative inclui "King Piccolo"',
  'Naruto Uzumaki': 'Naruto: native うずまきナルト, alternative inclui "Nine-Tails Jinchuuriki"',
  'Sasuke Uchiha': 'Naruto: native うちはサスケ, alternative inclui "The Last Uchiha"',
  'Kakashi Hatake': 'Naruto: native はたけカカシ, alternative inclui "The Copy Ninja"',
  Luffy: 'One Piece: native モンキー・D・ルフィ, alternative inclui "Straw Hat", "Mugiwara"',
  'Roronoa Zoro': 'One Piece: native ロロノア・ゾロ, alternative inclui "Pirate Hunter"',
  Nami: 'One Piece: native ナミ, alternative inclui "Cat Burglar"',
  Sanji: 'One Piece: native サンジ, alternative inclui "Black Leg"',
  'Eren Yeager': 'Attack on Titan: native エレン・イェーガー, alternative inclui "Eren Jaeger"',
  'Mikasa Ackerman': 'Attack on Titan: native ミカサ・アッカーマン (nome completo já bate)',
  'Levi Ackerman': 'Attack on Titan: native リヴァイ, alternative inclui "Captain Levi", "Humanity\'s Strongest Soldier"',
  'Light Yagami': 'Death Note: native 夜神月, alternative inclui "Kira"',
  L: 'Death Note: full "L Lawliet", native エル・ローライト, alternative inclui "Ryuzaki"',
  'Tanjiro Kamado': 'Demon Slayer: native 竈門炭治郎, full "Tanjirou Kamado"',
  'Nezuko Kamado': 'Demon Slayer: native 竈門禰豆子 (nome completo já bate)',
  'Satoru Gojo': 'Jujutsu Kaisen: native 五条悟, full "Satoru Gojou", alternative inclui "Satoru Gojo"',
  'Sailor Moon': 'Sailor Moon: full "Usagi Tsukino", alternative inclui "Sailor Moon"',
  'Ash Ketchum': 'Pokémon: full "Satoshi", alternative inclui "Ash Ketchum"',
  Pikachu: 'Pokémon: native ピカチュウ (nome completo já bate, sem ambiguidade)',
  Totoro: 'My Neighbor Totoro (Ghibli): native トトロ (nome completo já bate, sem ambiguidade)',
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

/** Lê nome+categoria só da categoria "Anime e mangá" de server/wordlist.ts. */
function readAnimeCatalog() {
  const src = fs.readFileSync(WORDLIST_PATH, 'utf8');
  const start = src.indexOf('const characterSets');
  if (start === -1) {
    throw new Error('Não encontrei "const characterSets" em server/wordlist.ts');
  }
  const end = src.indexOf('\n};', start);
  if (end === -1) {
    throw new Error('Não encontrei o fim do bloco characterSets em server/wordlist.ts');
  }
  const block = src.slice(start, end);
  const lines = block.split('\n').slice(1);

  const lineRe = /^\s*(?:'([^']+)'|([^:]+)):\s*`([^`]+)`,?\s*$/;
  for (const line of lines) {
    const match = line.match(lineRe);
    if (!match) continue;
    const category = (match[1] ?? match[2]).trim();
    if (category !== CATEGORY) continue;
    return match[3]
      .split('|')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, category }));
  }
  throw new Error(`Categoria "${CATEGORY}" não encontrada em server/wordlist.ts`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SEARCH_QUERY = `query ($search: String) {
  Character(search: $search) {
    id
    name { full native alternative }
    image { large }
  }
}`;

async function searchCharacter(term) {
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: term } }),
  });
  const json = await res.json();
  if (json.errors) {
    const notFound = json.errors.some((e) => e.status === 404);
    if (notFound) return null;
    throw new Error(`AniList devolveu erro para "${term}": ${JSON.stringify(json.errors)}`);
  }
  return json.data?.Character ?? null;
}

function buildCandidate(entry) {
  const searchTerm = SEARCH_TERM_OVERRIDES[entry.name] ?? entry.name;
  return { entry, searchTerm };
}

async function resolveOne({ entry, searchTerm }) {
  const base = { name: entry.name, category: entry.category, source: SOURCE, searchTerm };
  const character = await searchCharacter(searchTerm);

  if (!character || !character.image?.large) {
    return {
      ...base,
      anilistId: character?.id ?? null,
      matchedName: character?.name?.full ?? null,
      url: null,
      author: null,
      license: null,
      status: 'none',
      reason: character ? 'personagem encontrado, sem image.large' : 'AniList não encontrou o termo de busca',
    };
  }

  return {
    ...base,
    anilistId: character.id,
    matchedName: character.name.full,
    identityEvidence: IDENTITY_HINTS[entry.name] ?? null,
    url: character.image.large,
    author: AUTHOR,
    license: LICENSE,
    status: 'survivor',
    reason: null,
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
        <span class="file">AniList #${escapeHtml(c.anilistId)} — ${escapeHtml(c.matchedName)}</span>
        <span class="credit">${escapeHtml(c.author)} — ${escapeHtml(c.license)}</span>
      </figcaption>
    </figure>`,
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Contact sheet — candidatos AniList</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #111; color: #eee; }
  h1 { font-size: 1.25rem; margin-bottom: 4px; }
  p.meta { color: #999; margin-top: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 24px; padding: 0; }
  .card { background: #1c1c1c; border: 1px solid #333; border-radius: 8px; padding: 8px; margin: 0; }
  .card img { width: 100%; height: 180px; object-fit: cover; border-radius: 4px; display: block; background: #000; }
  figcaption { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; font-size: 0.8rem; }
  figcaption strong { font-size: 0.95rem; }
  .category { color: #9ad; }
  .file { color: #888; word-break: break-all; font-size: 0.7rem; }
  .credit { color: #bbb; font-style: italic; }
</style>
</head>
<body>
  <h1>Contact sheet — candidatos AniList (categoria "${escapeHtml(CATEGORY)}")</h1>
  <p class="meta">${survivors.length} candidatos resolvidos e com identidade confirmada, pendentes de revisão visual. Gerado por scripts/resolve-anime-images.mjs.</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>
`;

  fs.writeFileSync(outPath, html);
}

function printReport(candidates) {
  const survivors = candidates.filter((c) => c.status === 'survivor');
  const none = candidates.filter((c) => c.status === 'none');

  console.log('\n=== Relatório de resolução AniList ===');
  console.log(`Total de personagens (categoria "${CATEGORY}"): ${candidates.length}`);
  console.log(`Resolvidos com identidade confirmada: ${survivors.length}`);
  console.log(`Sem resultado: ${none.length}`);
  for (const c of none) {
    console.log(`  ${c.name}: ${c.reason} (termo de busca: "${c.searchTerm}")`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });

  const entries = readAnimeCatalog();
  console.error(`Categoria "${CATEGORY}": ${entries.length} personagens.`);

  const candidates = [];
  for (const entry of entries) {
    const candidate = buildCandidate(entry);
    console.error(`Resolvendo "${entry.name}" (termo: "${candidate.searchTerm}")...`);
    candidates.push(await resolveOne(candidate));
    await sleep(REQUEST_DELAY_MS);
  }

  const candidatesPath = path.join(args.out, 'anilist.json');
  fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2));
  console.error(`Gravado: ${candidatesPath}`);

  const survivors = candidates.filter((c) => c.status === 'survivor');
  const contactSheetPath = path.join(args.out, 'anilist-contact-sheet.html');
  writeContactSheet(survivors, contactSheetPath);
  console.error(`Gravado: ${contactSheetPath}`);

  printReport(candidates);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
