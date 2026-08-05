#!/usr/bin/env node
/**
 * scripts/resolve-character-images.mjs
 *
 * Script de curadoria dev-only (fora do build, fora de todo tsconfig). Para cada
 * personagem do catálogo em server/wordlist.ts, resolve um candidato de imagem
 * livre no Wikimedia Commons via Wikidata (P18) e grava candidates.json com os
 * metadados de licenciamento para revisão humana posterior.
 *
 * NUNCA importar este arquivo de server/ ou src/: ele fala com a rede da
 * Wikimedia, o que é proibido em runtime (IMG-05).
 *
 * Uso: node scripts/resolve-character-images.mjs [--out DIR]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const WORDLIST_PATH = path.join(REPO_ROOT, 'server', 'wordlist.ts');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, '.image-candidates');

const USER_AGENT = 'QuemSouEu/1.0 (github.com/renatotales3/Quem-sou-Eu-)';
const WIKIPEDIA_API = 'https://pt.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

const TITLE_BATCH_SIZE = 50;
const QID_BATCH_SIZE = 40;
const FILE_BATCH_SIZE = 40;
const BATCH_DELAY_MS = 200;
const THUMB_WIDTH = 320;

/**
 * Nome do catálogo -> título exato da Wikipédia em pt.
 *
 * Só entra aqui um nome cujo título homônimo direto resolve para a página
 * errada (nome próprio, verbete genérico, desambiguação). Cada par foi
 * confirmado antes de ser escrito, via list=search e via conferência do QID
 * final com wbgetentities — nunca chutado:
 *
 * - Mario / Luigi: "Mario"/"Luigi" sozinhos resolvem para páginas de nome
 *   próprio ("Mário", "Luís (prenome)"); "(personagem)" resolve para o QID da
 *   Nintendo (Q12379 / Q210593).
 * - Marta: "Marta" sozinho cai numa página homônima; "(futebolista)" resolve
 *   para Q228616, com P18 de uma foto de jogo.
 * - Emília: "Emília" sozinho não bate no personagem de Sítio do Picapau
 *   Amarelo; "(personagem)" resolve para Q10272595, com P18 de uma atriz no
 *   papel.
 *
 * "Tom" e "Alice" foram investigados e ficaram de fora: não existe título em
 * pt.wikipedia que resolva para o QID certo do personagem. Para "Tom", o
 * título homônimo do Tom & Jerry na Wikipédia em pt é um redirecionamento
 * para a página da franquia (QID da franquia, não do gato), e o QID correto
 * do personagem (Q1839152) não tem sitelink de pt.wikipedia utilizável. Para
 * "Alice", o QID do personagem de Wonderland (Q1269082) também não tem
 * sitelink de pt.wikipedia; o título "Alice no País das Maravilhas" resolve
 * para o QID do livro, não da personagem. Os dois ficam sem override e
 * resolvem pelo nome simples, que hoje não tem P18 — resultado `none`.
 */
const TITLE_OVERRIDES = {
  Mario: 'Mario (personagem)',
  Luigi: 'Luigi (personagem)',
  Marta: 'Marta (futebolista)',
  Emília: 'Emília (personagem)',
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

/** Lê nome+categoria de cada personagem direto do texto de server/wordlist.ts. */
function readCatalog() {
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
    for (const rawName of match[3].split('|')) {
      const name = rawName.trim();
      if (name) entries.push({ name, category });
    }
  }
  return entries;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao chamar ${url}`);
  }
  return res.json();
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function titleFor(entry) {
  return TITLE_OVERRIDES[entry.name] ?? entry.name;
}

/** Passo 1: nome do catálogo -> QID do Wikidata, via pageprops da Wikipédia em pt. */
async function resolveQids(entries) {
  const qidByName = new Map();
  const batches = chunk(entries, TITLE_BATCH_SIZE);

  for (const batch of batches) {
    const requestedTitles = batch.map(titleFor);
    const url = `${WIKIPEDIA_API}?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(requestedTitles.join('|'))}`;
    const json = await fetchJson(url);

    const normalizedMap = new Map((json.query?.normalized ?? []).map((n) => [n.from, n.to]));
    const redirectMap = new Map((json.query?.redirects ?? []).map((r) => [r.from, r.to]));
    const pageByTitle = new Map(Object.values(json.query?.pages ?? {}).map((p) => [p.title, p]));

    for (const entry of batch) {
      const requested = titleFor(entry);
      const normalized = normalizedMap.get(requested) ?? requested;
      const finalTitle = redirectMap.get(normalized) ?? normalized;
      const page = pageByTitle.get(finalTitle);
      const qid = page?.pageprops?.wikibase_item;
      if (qid) qidByName.set(entry.name, qid);
    }

    await sleep(BATCH_DELAY_MS);
  }

  return qidByName;
}

/** Passo 2: QID -> nome de arquivo do Commons declarado em P18. */
async function resolveFilesByQid(qidByName) {
  const uniqueQids = [...new Set(qidByName.values())];
  const fileByQid = new Map();
  const batches = chunk(uniqueQids, QID_BATCH_SIZE);

  for (const batch of batches) {
    const url = `${WIKIDATA_API}?action=wbgetentities&format=json&props=claims&ids=${batch.join('|')}`;
    const json = await fetchJson(url);

    for (const qid of batch) {
      const claim = json.entities?.[qid]?.claims?.P18?.[0];
      const file = claim?.mainsnak?.datavalue?.value;
      if (file) fileByQid.set(qid, file);
    }

    await sleep(BATCH_DELAY_MS);
  }

  return fileByQid;
}

/** Passo 3: arquivo -> thumbnail ≤320px, autor, licença e categorias do Commons. */
async function resolveImageInfo(fileNames) {
  const infoByFile = new Map();
  const batches = chunk(fileNames, FILE_BATCH_SIZE);

  for (const batch of batches) {
    const titles = batch.map((name) => `File:${name}`);
    const url = `${COMMONS_API}?action=query&format=json&prop=imageinfo|categories&iiprop=url|extmetadata&iiurlwidth=${THUMB_WIDTH}&cllimit=50&titles=${encodeURIComponent(titles.join('|'))}`;
    const json = await fetchJson(url);

    for (const page of Object.values(json.query?.pages ?? {})) {
      const fileName = page.title?.replace(/^File:/, '');
      if (!fileName) continue;
      const info = page.imageinfo?.[0];
      const categories = (page.categories ?? []).map((c) => c.title.replace(/^Category:/, ''));
      infoByFile.set(fileName, {
        thumbUrl: info?.thumburl ?? null,
        width: info?.thumbwidth ?? null,
        author: stripHtml(info?.extmetadata?.Artist?.value) || null,
        license: info?.extmetadata?.LicenseShortName?.value || null,
        categories,
      });
    }

    await sleep(BATCH_DELAY_MS);
  }

  return infoByFile;
}

/** Monta um candidato por personagem a partir dos três mapas resolvidos. */
function buildCandidate(entry, qidByName, fileByQid, infoByFile) {
  const base = { name: entry.name, category: entry.category };

  const qid = qidByName.get(entry.name) ?? null;
  if (!qid) {
    return {
      ...base,
      qid: null,
      file: null,
      url: null,
      width: null,
      author: null,
      license: null,
      status: 'none',
      reason: 'sem QID no Wikidata para o título pesquisado',
    };
  }

  const file = fileByQid.get(qid) ?? null;
  if (!file) {
    return {
      ...base,
      qid,
      file: null,
      url: null,
      width: null,
      author: null,
      license: null,
      status: 'none',
      reason: 'QID sem P18 (imagem) declarado',
    };
  }

  const info = infoByFile.get(file);
  if (!info || !info.thumbUrl) {
    return {
      ...base,
      qid,
      file,
      url: null,
      width: null,
      author: null,
      license: null,
      status: 'none',
      reason: 'arquivo do Commons sem thumbnail disponível',
    };
  }

  if (!info.author || !info.license) {
    return {
      ...base,
      qid,
      file,
      url: info.thumbUrl,
      width: info.width,
      author: info.author,
      license: info.license,
      status: 'rejected',
      reason: 'sem atribuição',
    };
  }

  return {
    ...base,
    qid,
    file,
    url: info.thumbUrl,
    width: info.width,
    author: info.author,
    license: info.license,
    status: 'found',
    reason: null,
    _categories: info.categories,
  };
}

function printReport(candidates) {
  const total = candidates.length;
  const found = candidates.filter((c) => c.status === 'found');
  const rejected = candidates.filter((c) => c.status === 'rejected');
  const none = candidates.filter((c) => c.status === 'none');

  console.log('\n=== Relatório de resolução ===');
  console.log(`Total de personagens: ${total}`);
  console.log(`Candidatos resolvidos (com atribuição): ${found.length}`);
  console.log(`Rejeitados: ${rejected.length}`);
  console.log(`Sem imagem: ${none.length}`);

  const reasonCounts = new Map();
  for (const c of rejected) {
    reasonCounts.set(c.reason, (reasonCounts.get(c.reason) ?? 0) + 1);
  }
  if (reasonCounts.size > 0) {
    console.log('\nRejeitados por motivo:');
    for (const [reason, count] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}x — ${reason}`);
    }
  }

  console.log('\nCobertura por categoria (resolvidos / total):');
  for (const category of [...new Set(candidates.map((c) => c.category))]) {
    const catTotal = candidates.filter((c) => c.category === category).length;
    const catFound = found.filter((c) => c.category === category).length;
    console.log(`  ${category}: ${catFound}/${catTotal}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });

  const entries = readCatalog();
  console.error(`Catálogo: ${entries.length} personagens.`);

  console.error('Passo 1/3: resolvendo QID por nome (Wikipédia pt -> Wikidata)...');
  const qidByName = await resolveQids(entries);
  console.error(`  ${qidByName.size}/${entries.length} com QID encontrado.`);

  console.error('Passo 2/3: resolvendo P18 (arquivo no Commons) por QID...');
  const fileByQid = await resolveFilesByQid(qidByName);
  console.error(`  ${fileByQid.size}/${qidByName.size} com P18 declarado.`);

  const uniqueFiles = [...new Set(fileByQid.values())];
  console.error('Passo 3/3: resolvendo thumbnail, autor e licença por arquivo...');
  const infoByFile = await resolveImageInfo(uniqueFiles);
  console.error(`  ${infoByFile.size}/${uniqueFiles.length} arquivos com imageinfo.`);

  const candidates = entries.map((entry) => buildCandidate(entry, qidByName, fileByQid, infoByFile));

  const candidatesPath = path.join(args.out, 'candidates.json');
  fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2));
  console.error(`\nGravado: ${candidatesPath}`);

  printReport(candidates);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
