#!/usr/bin/env node
/**
 * scripts/resolve-comicvine-images.mjs
 *
 * Script de curadoria dev-only (fora do build, fora de todo tsconfig).
 * Terceira fonte do catálogo de imagens: para cada personagem das categorias
 * "Marvel" e "DC" em server/wordlist.ts, resolve um retrato oficial via
 * Comic Vine (https://comicvine.gamespot.com/api/) e grava candidatos em
 * .image-candidates/comicvine.json para revisão humana posterior.
 *
 * Por que um script separado dos outros dois resolvers: a API é outra (REST
 * com api_key própria, não GraphQL nem MediaWiki), a origem do dado é outra
 * (arte de quadrinho creditada à editora via Comic Vine, não Wikidata P18 e
 * não o CDN de retrato do AniList) e o escopo é fixo (só "Marvel" e "DC",
 * não o catálogo inteiro). O contrato de saída (formato do candidato, pasta
 * .image-candidates/) é o mesmo dos outros dois.
 *
 * NUNCA importar este arquivo de server/ ou src/: ele fala com a rede do
 * Comic Vine, o que é proibido em runtime (IMG-05).
 *
 * Chave de API: lida de process.env.COMICVINE_API_KEY. O script tenta
 * carregar .env da raiz do repo só para preencher process.env quando a
 * variável ainda não está definida (ex.: rodando fora de um `source .env`);
 * a chave nunca é escrita em código nem em qualquer arquivo versionado — só
 * lida do ambiente.
 *
 * Termos de uso do Comic Vine que este script respeita:
 * - Uso estritamente NÃO COMERCIAL: uso comercial revoga a chave.
 * - Toda exibição dos dados exige LINK DE VOLTA para o Comic Vine — este
 *   script só resolve candidatos para revisão, não exibe nada ao jogador;
 *   quem integrar o catálogo (fora deste script) precisa refletir esse
 *   requisito no crédito da interface.
 * - Recomenda cache das respostas — por isso a saída deste script é um JSON
 *   gravado em disco, consultado depois, nunca uma chamada em runtime.
 * - Limite de 200 requisições por recurso por hora — este script usa só o
 *   recurso "search" e insere REQUEST_DELAY_MS entre chamadas para nunca se
 *   aproximar do limite (o catálogo-alvo tem ~34 personagens).
 *
 * Uso: node scripts/resolve-comicvine-images.mjs [--out DIR]
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

const USER_AGENT = 'QuemSouEu/1.0 (github.com/renatotales3/Quem-sou-Eu-)';
const COMICVINE_SEARCH_API = 'https://comicvine.gamespot.com/api/search/';
const SEARCH_LIMIT = 25;
const REQUEST_DELAY_MS = 1500; // Limite do Comic Vine: 200 req/recurso/hora. 34 personagens a 1.5s bem abaixo disso.

const CATEGORIES = ['Marvel', 'DC'];
const SOURCE = 'Comic Vine';

// Nome da editora que o Comic Vine devolve em publisher.name para cada
// categoria — usado para filtrar homônimos de outra editora (ex.: existe um
// "Batman" e um "Captain Marvel" catalogados sob a Marvel também, e um
// "Green Lantern" com 1 aparição sob a Marvel). Confirmado por amostragem em
// 2026-08-05: a Marvel aparece como "Marvel" (sem "Comics"), a DC como
// "DC Comics".
const EXPECTED_PUBLISHER_NAME = {
  Marvel: 'Marvel',
  DC: 'DC Comics',
};

// Nome de exibição da editora para crédito na interface — usado como author
// quando o Comic Vine não expõe um crédito de artista mais específico (ele
// não expõe; o campo mais próximo é publisher.name, e normalizamos para o
// nome completo da editora em vez do "Marvel" curto que a API devolve).
const PUBLISHER_DISPLAY_NAME = {
  Marvel: 'Marvel Comics',
  DC: 'DC Comics',
};

/**
 * Nome do catálogo -> termo de busca no Comic Vine, só para os casos em que
 * a forma esperada (englishOriginals, ou o próprio nome quando já é igual em
 * inglês) NÃO tem uma entrada com esse nome literal no Comic Vine, ou tem
 * uma entrada homônima que não é a versão principal. Cada override foi
 * confirmado manualmente contra a API antes de entrar aqui — nunca chutado.
 * Sem override, o algoritmo padrão (ver resolveOne) já resolve corretamente
 * a esmagadora maioria dos nomes (ex.: "Spider-Man", "Batman", "Wolverine",
 * "Thor" resolvem direto por correspondência exata de nome).
 *
 * - "Homem-Formiga" (Ant-Man): buscar "Ant-Man" não devolve NENHUM
 *   personagem chamado literalmente "Ant-Man" na Marvel — o Comic Vine
 *   indexa a página pelo nome civil. O maior count_of_issue_appearances
 *   dentro da Marvel para o termo é "Hank Pym" (3855), o Ant-Man original,
 *   muito acima de "Ant-Man (Lang)" (870, a variante do Scott Lang, que o
 *   próprio Comic Vine já desambigua no nome). Override para "Hank Pym".
 * - "Duende Verde" (Green Goblin): buscar "Green Goblin" também não devolve
 *   nenhum personagem chamado literalmente assim — mesmo padrão do Ant-Man.
 *   O maior count dentro da Marvel é "Norman Osborn" (2684), o Duende Verde
 *   original e mais reconhecido, muito acima de "Harry Osborn" (1326) e
 *   "Normie Osborn" (365). Override para "Norman Osborn".
 * - "Flash": buscar "Flash" devolve um personagem chamado literalmente
 *   "Flash" na DC, mas com count_of_issue_appearances = 74 — claramente não
 *   é o herói principal, e sim uma entrada secundária/derivada. O herói é
 *   indexado pelo nome civil: "Barry Allen" tem 5480 aparições, muito acima
 *   de "Wally West" (3441) e "Jay Garrick" (2112). Override para
 *   "Barry Allen".
 * - "Lanterna Verde" (Green Lantern): mesmo padrão do Flash — nenhuma
 *   entrada chamada literalmente "Green Lantern" na DC tem count relevante
 *   (todas são variantes: "Green Lantern (Tangent)", "... of the Milky
 *   Way" etc.). O nome civil do Lanterna Verde clássico, "Hal Jordan", tem
 *   5650 aparições, o maior entre todos os portadores do manto. Override
 *   para "Hal Jordan".
 * - "Robin": nenhuma entrada chamada literalmente "Robin" na DC tem count
 *   relevante (a maioria são personagens de outras editoras que só
 *   compartilham o nome). O Robin original, "Dick Grayson", tem 10212
 *   aparições, muito acima de qualquer outro portador do manto ("Tim Drake"
 *   3631, "Jason Todd" 2020, "Damian Wayne" 2258). Override para
 *   "Dick Grayson".
 * - "Shazam": nenhuma entrada chamada literalmente "Shazam" na DC tem count
 *   relevante. O personagem é indexado pelo nome civil "Billy Batson"
 *   (2732 aparições), o maior entre os que já usaram o nome de herói Shazam
 *   / Capitão Marvel Original. Override para "Billy Batson".
 * - "Capitã Marvel" (englishOriginals resolve para "Captain Marvel"): aqui
 *   existe sim uma entrada Marvel chamada literalmente "Captain Marvel"
 *   (951 aparições) — mas é Mar-Vell, o Capitão Marvel original e MASCULINO
 *   (real_name confirmado via API em 2026-08-05). O nome no nosso catálogo é
 *   "Capitã Marvel", forma feminina, que em português só faz sentido para
 *   Carol Danvers — a portadora atual do título e a única versão feminina
 *   do personagem, com 4674 aparições (maior que Mar-Vell). Override para
 *   "Carol Danvers": aqui a escolha não é "sem correspondência exata", e
 *   sim uma correção deliberada porque a correspondência exata era a
 *   identidade errada para o nome em português do catálogo.
 */
const SEARCH_TERM_OVERRIDES = {
  'Homem-Formiga': 'Hank Pym',
  'Duende Verde': 'Norman Osborn',
  Flash: 'Barry Allen',
  'Lanterna Verde': 'Hal Jordan',
  Robin: 'Dick Grayson',
  Shazam: 'Billy Batson',
  'Capitã Marvel': 'Carol Danvers',
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

/** Só preenche process.env a partir de .env quando a variável ainda não está
 * definida — nunca sobrescreve o ambiente real, e nunca loga o conteúdo. */
function loadEnvFileIfNeeded() {
  if (process.env.COMICVINE_API_KEY) return;
  if (!fs.existsSync(ENV_PATH)) return;

  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Replica server/normalization.ts#normalizeText (não importado por ser TS e
// este script rodar direto via node, fora do build).
function normalizeText(value) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Lê nome+categoria só das categorias "Marvel" e "DC" de server/wordlist.ts. */
function readComicsCatalog() {
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

  const entries = [];
  const lineRe = /^\s*(?:'([^']+)'|([^:]+)):\s*`([^`]+)`,?\s*$/;
  for (const line of lines) {
    const match = line.match(lineRe);
    if (!match) continue;
    const category = (match[1] ?? match[2]).trim();
    if (!CATEGORIES.includes(category)) continue;
    for (const rawName of match[3].split('|')) {
      const name = rawName.trim();
      if (name) entries.push({ name, category });
    }
  }
  return entries;
}

/** Lê o mapa nome PT-BR normalizado -> nome original em inglês de
 * server/wordlist.ts (englishOriginals), sem importar o módulo TS. */
function readEnglishOriginals() {
  const src = fs.readFileSync(WORDLIST_PATH, 'utf8');
  const start = src.indexOf('export const englishOriginals');
  if (start === -1) {
    throw new Error('Não encontrei "export const englishOriginals" em server/wordlist.ts');
  }
  const end = src.indexOf('\n};', start);
  if (end === -1) {
    throw new Error('Não encontrei o fim do bloco englishOriginals em server/wordlist.ts');
  }
  const block = src.slice(start, end);

  const map = {};
  // Chave pode vir entre aspas ('homem aranha') ou como identificador solto
  // (demolidor, ciborgue) quando o nome normalizado já é uma palavra só.
  const lineRe = /^\s*(?:'([^']+)'|([a-zA-Z][a-zA-Z0-9]*)):\s*'([^']+)',?\s*$/;
  for (const line of block.split('\n')) {
    const match = line.match(lineRe);
    if (!match) continue;
    const key = match[1] ?? match[2];
    map[key] = match[3];
  }
  return map;
}

/** Lê as chaves (nome normalizado) já presentes em
 * server/character-images.ts, para pular quem já tem imagem aprovada. */
function readExistingImageKeys() {
  const src = fs.readFileSync(CHARACTER_IMAGES_PATH, 'utf8');
  const start = src.indexOf('export const characterImages');
  if (start === -1) {
    throw new Error('Não encontrei "export const characterImages" em server/character-images.ts');
  }
  const block = src.slice(start);

  const keys = new Set();
  const lineRe = /^\s*(?:'([^']+)'|([a-zA-Z][a-zA-Z0-9]*)):\s*\{\s*$/;
  for (const line of block.split('\n')) {
    const match = line.match(lineRe);
    if (!match) continue;
    keys.add(match[1] ?? match[2]);
  }
  return keys;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchCharacters(term, apiKey) {
  const url = `${COMICVINE_SEARCH_API}?api_key=${apiKey}&format=json&query=${encodeURIComponent(term)}&resources=character&limit=${SEARCH_LIMIT}&field_list=id,name,image,count_of_issue_appearances,publisher`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao buscar "${term}" no Comic Vine`);
  }
  const json = await res.json();
  if (json.status_code !== 1) {
    throw new Error(`Comic Vine devolveu status_code ${json.status_code} (${json.error}) para "${term}"`);
  }
  return json.results ?? [];
}

/** Resolve um personagem: busca, filtra pela editora esperada, exige
 * correspondência exata de nome com o termo buscado, e desempata pelo maior
 * count_of_issue_appearances entre os que têm thumbnail (medium_url). */
function pickBestMatch(results, searchTerm, expectedPublisher) {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  const samePublisher = results.filter(
    (r) => r.publisher?.name === expectedPublisher,
  );
  if (samePublisher.length === 0) {
    return { candidate: null, reason: `Comic Vine não devolveu nenhum personagem da editora "${expectedPublisher}" para o termo` };
  }

  const exactName = samePublisher.filter(
    (r) => (r.name ?? '').trim().toLowerCase() === normalizedTerm,
  );
  if (exactName.length === 0) {
    return {
      candidate: null,
      reason: `nenhum personagem da editora "${expectedPublisher}" com nome exatamente "${searchTerm}"`,
    };
  }

  const withImage = exactName
    .filter((r) => r.image?.medium_url)
    .sort((a, b) => (b.count_of_issue_appearances ?? 0) - (a.count_of_issue_appearances ?? 0));

  if (withImage.length === 0) {
    return {
      candidate: null,
      reason: `correspondência exata de nome encontrada, mas sem thumbnail (medium_url)`,
    };
  }

  return { candidate: withImage[0], reason: null, tieBreak: withImage.length > 1 };
}

async function resolveOne(entry, englishOriginals, apiKey) {
  const key = normalizeText(entry.name);
  const overridden = SEARCH_TERM_OVERRIDES[entry.name];
  const searchTerm = overridden ?? englishOriginals[key] ?? entry.name;
  const expectedPublisher = EXPECTED_PUBLISHER_NAME[entry.category];

  const base = { name: entry.name, category: entry.category, source: SOURCE, searchTerm };

  let results;
  try {
    results = await searchCharacters(searchTerm, apiKey);
  } catch (err) {
    return {
      ...base,
      url: null,
      author: null,
      license: null,
      status: 'none',
      reason: `erro na chamada ao Comic Vine: ${err.message}`,
      evidence: null,
    };
  }

  const { candidate, reason, tieBreak } = pickBestMatch(results, searchTerm, expectedPublisher);

  if (!candidate) {
    return {
      ...base,
      url: null,
      author: null,
      license: null,
      status: 'none',
      reason,
      evidence: null,
    };
  }

  const overrideNote = overridden
    ? ` (override manual de termo de busca: catálogo diz "${entry.name}", buscado como "${overridden}" — ver comentário de SEARCH_TERM_OVERRIDES para a razão)`
    : '';
  const tieBreakNote = tieBreak
    ? '; havia mais de um personagem com esse nome exato na mesma editora, desempatado pelo maior count_of_issue_appearances (versão principal)'
    : '';
  const evidence =
    `Comic Vine #${candidate.id} "${candidate.name}" (editora: ${candidate.publisher?.name}, ` +
    `count_of_issue_appearances: ${candidate.count_of_issue_appearances}); termo de busca: "${searchTerm}"${overrideNote}${tieBreakNote}.`;

  return {
    ...base,
    comicvineId: candidate.id,
    matchedName: candidate.name,
    url: candidate.image.medium_url,
    author: PUBLISHER_DISPLAY_NAME[entry.category],
    license: 'Uso não comercial via API do Comic Vine (arte pertence à editora, não é licença livre)',
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

/** Grava um contact sheet HTML com os candidatos resolvidos, para revisão
 * visual humana. Inclui link de volta para o Comic Vine em cada card,
 * conforme os termos de uso da API exigem sempre que os dados são exibidos. */
function writeContactSheet(survivors, outPath) {
  const cards = survivors
    .map(
      (c) => `    <figure class="card">
      <img src="${escapeHtml(c.url)}" alt="${escapeHtml(c.name)}" loading="lazy" />
      <figcaption>
        <strong>${escapeHtml(c.name)}</strong>
        <span class="category">${escapeHtml(c.category)}</span>
        <span class="file">
          <a href="https://comicvine.gamespot.com/character/4005-${escapeHtml(c.comicvineId)}/" target="_blank" rel="noopener">Comic Vine #${escapeHtml(c.comicvineId)} — ${escapeHtml(c.matchedName)}</a>
        </span>
        <span class="credit">${escapeHtml(c.author)} — ${escapeHtml(c.license)}</span>
      </figcaption>
    </figure>`,
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Contact sheet — candidatos Comic Vine</title>
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
  .file a { color: #7ac6ff; }
  .credit { color: #bbb; font-style: italic; }
</style>
</head>
<body>
  <h1>Contact sheet — candidatos Comic Vine (categorias "Marvel" e "DC")</h1>
  <p class="meta">${survivors.length} candidatos resolvidos e com identidade confirmada, pendentes de revisão visual. Dados via Comic Vine (comicvine.gamespot.com) — uso não comercial, link de volta obrigatório ao exibir. Gerado por scripts/resolve-comicvine-images.mjs.</p>
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

  console.log('\n=== Relatório de resolução Comic Vine ===');
  console.log(`Total de personagens tentados (Marvel + DC, sem os que já têm imagem): ${candidates.length}`);
  console.log(`Resolvidos com identidade confirmada: ${survivors.length}`);
  console.log(`Sem resultado: ${none.length}`);

  for (const category of CATEGORIES) {
    const catCandidates = candidates.filter((c) => c.category === category);
    const catSurvivors = survivors.filter((c) => c.category === category);
    console.log(`  ${category}: ${catSurvivors.length}/${catCandidates.length}`);
  }

  if (none.length > 0) {
    console.log('\nSem resultado, por motivo:');
    for (const c of none) {
      console.log(`  ${c.name} (termo: "${c.searchTerm}"): ${c.reason}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });

  loadEnvFileIfNeeded();
  const apiKey = process.env.COMICVINE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'COMICVINE_API_KEY não está definida no ambiente nem em .env. Defina a variável antes de rodar este script.',
    );
  }

  const englishOriginals = readEnglishOriginals();
  const existingImageKeys = readExistingImageKeys();
  const allEntries = readComicsCatalog();
  const entries = allEntries.filter((entry) => !existingImageKeys.has(normalizeText(entry.name)));

  console.error(
    `Categorias Marvel+DC: ${allEntries.length} personagens; ${allEntries.length - entries.length} já têm imagem aprovada, pulados; ${entries.length} a resolver.`,
  );

  const candidates = [];
  for (const entry of entries) {
    console.error(`Resolvendo "${entry.name}" (${entry.category})...`);
    candidates.push(await resolveOne(entry, englishOriginals, apiKey));
    await sleep(REQUEST_DELAY_MS);
  }

  const candidatesPath = path.join(args.out, 'comicvine.json');
  fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2));
  console.error(`Gravado: ${candidatesPath}`);

  const survivors = candidates.filter((c) => c.status === 'survivor');
  const contactSheetPath = path.join(args.out, 'comicvine-contact-sheet.html');
  writeContactSheet(survivors, contactSheetPath);
  console.error(`Gravado: ${contactSheetPath}`);

  printReport(candidates);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
