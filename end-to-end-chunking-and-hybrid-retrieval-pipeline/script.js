const fs = require('fs');

const DATA_DIR = '.';
const documents = fs.readFileSync(`${DATA_DIR}/documents.jsonl`, 'utf8')
    .trim().split('\n').map(JSON.parse);
const rules = JSON.parse(fs.readFileSync(`${DATA_DIR}/chunk_rules.json`, 'utf8'));
const chunkEmbeddings = JSON.parse(fs.readFileSync(`${DATA_DIR}/chunk_embeddings.json`, 'utf8'));
const queries = JSON.parse(fs.readFileSync(`${DATA_DIR}/queries.json`, 'utf8'));
const queryEmbeddings = JSON.parse(fs.readFileSync(`${DATA_DIR}/query_embeddings.json`, 'utf8'));

const { chunk_size, overlap, rrf_k, top_k } = rules;

// --- Step 1: Chunking ---
const chunks = [];
let globalIdx = 0;
for (const doc of documents) {
    const sentences = doc.text.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
    const step = chunk_size - overlap;
    for (let i = 0; i < sentences.length; i += step) {
        const chunkSents = sentences.slice(i, i + chunk_size);
        if (chunkSents.length > 0) {
            const chunkId = `${doc.doc_id}_CHUNK_${String(globalIdx).padStart(3, '0')}`;
            chunks.push({ id: chunkId, text: chunkSents.join(' ') });
            globalIdx++;
        }
    }
}

// --- Step 2: Tokenization & BM25 Setup ---
function tokenize(text) {
    return (text.toLowerCase().match(/[a-z0-9]+/g)) || [];
}

const N = chunks.length;
const corpusTokens = {};
const dfMap = {};
let totalDl = 0;

for (const chunk of chunks) {
    const tokens = tokenize(chunk.text);
    corpusTokens[chunk.id] = tokens;
    totalDl += tokens.length;
    for (const term of new Set(tokens)) {
        dfMap[term] = (dfMap[term] || 0) + 1;
    }
}
const avgdl = totalDl / N;

// --- Step 3: BM25 Score Function ---
function bm25Score(queryTokens, chunkId, k1 = 1.5, b = 0.75) {
    const docTokens = corpusTokens[chunkId];
    const dl = docTokens.length;
    const tfMap = {};
    for (const t of docTokens) tfMap[t] = (tfMap[t] || 0) + 1;

    let score = 0;
    const seen = new Set();
    for (const qt of queryTokens) {
        if (seen.has(qt)) continue;
        seen.add(qt);
        if (!(qt in tfMap)) continue;
        const tf = tfMap[qt];
        const df = dfMap[qt] || 0;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1.0);
        score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgdl));
    }
    return score;
}

// --- Step 4: Cosine Similarity ---
function cosineSim(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Step 5: Main Pipeline ---
const results = {};

for (const q of queries) {
    const qid = q.query_id;
    const qTokens = tokenize(q.text);
    const qEmb = queryEmbeddings[qid];

    // BM25 ranking (sort desc, tie-break localeCompare)
    const bm25Scores = chunks.map(c => ({ id: c.id, score: bm25Score(qTokens, c.id) }));
    bm25Scores.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const bm25Rank = {};
    bm25Scores.forEach((item, idx) => { bm25Rank[item.id] = idx + 1; });

    // Dense ranking (sort desc, tie-break localeCompare)
    const denseScores = chunks.map(c => ({ id: c.id, score: cosineSim(qEmb, chunkEmbeddings[c.id]) }));
    denseScores.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const denseRank = {};
    denseScores.forEach((item, idx) => { denseRank[item.id] = idx + 1; });

    // RRF fusion
    const rrfScores = chunks.map(c => ({
        id: c.id,
        score: 1.0 / (rrf_k + bm25Rank[c.id]) + 1.0 / (rrf_k + denseRank[c.id])
    }));
    rrfScores.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    results[qid] = rrfScores.slice(0, top_k).map(item => item.id);
}

// Output
console.log(JSON.stringify(results));