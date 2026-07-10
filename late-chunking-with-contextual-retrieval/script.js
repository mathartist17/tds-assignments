#!/usr/bin/env node
/**
 * Late Chunking + Contextual Retrieval (BM25) solver
 *
 * Usage:
 *   node solve.js <dataDir> [outFile]
 *
 * Expects in <dataDir>:
 *   - retrieval_rules.json
 *   - documents.jsonl   (one JSON document per line)
 *   - queries.json      (array of query objects)
 *
 * Writes the submission JSON object to [outFile] (default: submission.json)
 * and also prints it to stdout.
 */

const fs = require('fs');
const path = require('path');

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadJSONL(p) {
  return fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

// ---- Template filling ----
function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = values[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

// ---- Tokenizer ----
function tokenize(text) {
  const lower = text.toLowerCase();
  const matches = lower.match(/\b[a-z0-9_]+\b/g);
  return matches ? matches : [];
}

// ---- Sliding window chunking over sentences ----
function makeWindows(sentences, size, overlap) {
  const windows = [];
  if (sentences.length === 0) return windows;
  const step = Math.max(1, size - overlap);
  let start = 0;
  while (start < sentences.length) {
    const end = Math.min(start + size, sentences.length);
    windows.push(sentences.slice(start, end));
    if (end >= sentences.length) break;
    start += step;
  }
  return windows;
}

function padWindowIndex(i) {
  return String(i).padStart(2, '0');
}

// ---- Build all chunks from documents ----
function buildChunks(documents, rules) {
  const chunks = []; // { chunk_id, tokens, length }
  for (const doc of documents) {
    const docLevel = {
      title: doc.title,
      region: doc.region,
      release: doc.release,
    };
    for (const section of doc.sections) {
      const windows = makeWindows(
        section.sentences,
        rules.chunk_sentence_count,
        rules.chunk_sentence_overlap
      );
      windows.forEach((sentList, idx) => {
        const chunk_id = `${doc.doc_id}:${section.section_id}:w${padWindowIndex(idx)}`;
        const chunk_text = sentList.join(' ');
        const contextualText = fillTemplate(rules.contextual_template, {
          ...docLevel,
          heading: section.heading,
          service: section.service,
          owner: section.owner,
          priority: section.priority,
          chunk_text,
        });
        const tokens = tokenize(contextualText);
        chunks.push({ chunk_id, tokens });
      });
    }
  }
  return chunks;
}

// ---- BM25 index ----
function buildBM25Index(chunks) {
  const N = chunks.length;
  const df = new Map(); // token -> number of chunks containing it
  let totalLen = 0;
  const chunkData = chunks.map((c) => {
    const tf = new Map();
    for (const tok of c.tokens) {
      tf.set(tok, (tf.get(tok) || 0) + 1);
    }
    for (const tok of tf.keys()) {
      df.set(tok, (df.get(tok) || 0) + 1);
    }
    totalLen += c.tokens.length;
    return { chunk_id: c.chunk_id, tf, len: c.tokens.length };
  });
  const avgdl = N > 0 ? totalLen / N : 0;

  function idf(term) {
    const n = df.get(term) || 0;
    return Math.log((N - n + 0.5) / (n + 0.5) + 1);
  }

  function score(queryTokens, doc, k1, b) {
    let s = 0;
    // IMPORTANT: do NOT dedupe query tokens. If a term occurs multiple times
    // in the query, its contribution is added once per occurrence (this
    // matches the standard rank_bm25-style implementation and effectively
    // weights by query term frequency).
    for (const qt of queryTokens) {
      const f = doc.tf.get(qt) || 0;
      if (f === 0) continue;
      const numerator = f * (k1 + 1);
      const denominator = f + k1 * (1 - b + (b * doc.len) / avgdl);
      s += idf(qt) * (numerator / denominator);
    }
    return s;
  }

  return { chunkData, score };
}

function main() {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  const positional = args.filter((a) => !a.startsWith('--'));
  const dataDir = positional[0] || '.';
  const outFile = positional[1] || 'submission.json';

  const rules = loadJSON(path.join(dataDir, 'retrieval_rules.json'));
  const documents = loadJSONL(path.join(dataDir, 'documents.jsonl'));
  const queries = loadJSON(path.join(dataDir, 'queries.json'));

  const chunks = buildChunks(documents, rules);

  if (debug) {
    console.error(`\n=== DEBUG: built ${chunks.length} chunks ===`);
    chunks.slice(0, 3).forEach((c) => {
      console.error(`\nchunk_id: ${c.chunk_id}`);
      console.error(`tokens (${c.tokens.length}): ${c.tokens.join(' ')}`);
    });
  }

  const { chunkData, score } = buildBM25Index(chunks);

  const k1 = rules.bm25_k1;
  const b = rules.bm25_b;
  const top_k = rules.top_k;

  const result = {};

  for (const q of queries) {
    const queryText = fillTemplate(rules.query_template, {
      text: q.text,
      service: q.service,
      region: q.region,
      release: q.release,
      priority: q.priority,
    });
    const qTokens = tokenize(queryText);

    const scored = chunkData.map((doc) => ({
      chunk_id: doc.chunk_id,
      s: score(qTokens, doc, k1, b),
    }));

    scored.sort((a, b2) => {
      if (b2.s !== a.s) return b2.s - a.s; // score descending
      return a.chunk_id < b2.chunk_id ? -1 : a.chunk_id > b2.chunk_id ? 1 : 0; // id ascending
    });

    if (debug) {
      console.error(`\n--- ${q.query_id} ---`);
      console.error(`query text: ${queryText}`);
      console.error(`query tokens: ${qTokens.join(' ')}`);
      console.error('top 6 scores:');
      scored.slice(0, 6).forEach((x) => console.error(`  ${x.chunk_id}  ${x.s.toFixed(4)}`));
    }

    result[q.query_id] = scored.slice(0, top_k).map((x) => x.chunk_id);
  }

  const jsonOut = JSON.stringify(result, null, 2);
  fs.writeFileSync(path.join(dataDir, outFile), jsonOut);
  console.log(jsonOut);
}

main();
