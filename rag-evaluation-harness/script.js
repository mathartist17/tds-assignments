const fs = require('fs');

const DATA_DIR = 'rag_evaluation_data';
const traces = fs.readFileSync(`${DATA_DIR}/traces.jsonl`, 'utf8')
    .trim().split('\n').map(JSON.parse);
const groundTruth = fs.readFileSync(`${DATA_DIR}/ground_truth.jsonl`, 'utf8')
    .trim().split('\n').map(JSON.parse);
const answerEmbeddings = JSON.parse(fs.readFileSync(`${DATA_DIR}/answer_embeddings.json`, 'utf8'));
const questionEmbeddings = JSON.parse(fs.readFileSync(`${DATA_DIR}/question_embeddings.json`, 'utf8'));

// Build ground truth lookup
const gtMap = {};
for (const gt of groundTruth) gtMap[gt.trace_id] = gt;

// Tokenize
function tokenize(text) {
    return (text.toLowerCase().match(/[a-z0-9]+/g)) || [];
}

// Cosine similarity
function cosineSim(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Round to 2 decimal places
function r2(val) {
    return Math.round(val * 100) / 100;
}

const results = {};

for (const trace of traces) {
    const tid = trace.trace_id;
    const gt = gtMap[tid];
    
    // --- Faithfulness ---
    const ansSentences = trace.generated_answer.split(/[.!?]\s+/)
        .filter(s => s.trim().length > 5);
    let faithfulness = 1.0;
    if (ansSentences.length > 0) {
        let faithfulCount = 0;
        for (const sent of ansSentences) {
            const sentTokens = tokenize(sent);
            if (sentTokens.length === 0) { faithfulCount++; continue; }
            let maxOverlap = 0;
            for (const chunk of trace.retrieved_chunks) {
                const chunkTokens = new Set(tokenize(chunk.text));
                const overlap = sentTokens.filter(t => chunkTokens.has(t)).length;
                maxOverlap = Math.max(maxOverlap, overlap);
            }
            if (maxOverlap / sentTokens.length >= 0.5) faithfulCount++;
        }
        faithfulness = faithfulCount / ansSentences.length;
    }
    
    // --- Answer Relevance ---
    const answerRelevance = cosineSim(
        answerEmbeddings[tid],
        questionEmbeddings[tid]
    );
    
    // --- Context Recall ---
    const refSentences = gt.reference_answer.split(/[.!?]\s+/)
        .filter(s => s.trim().length > 5);
    let contextRecall = 1.0;
    if (refSentences.length > 0) {
        let supportedCount = 0;
        for (const sent of refSentences) {
            const sentTokens = tokenize(sent);
            if (sentTokens.length === 0) { supportedCount++; continue; }
            let maxOverlap = 0;
            for (const chunk of trace.retrieved_chunks) {
                const chunkTokens = new Set(tokenize(chunk.text));
                const overlap = sentTokens.filter(t => chunkTokens.has(t)).length;
                maxOverlap = Math.max(maxOverlap, overlap);
            }
            if (maxOverlap / sentTokens.length >= 0.5) supportedCount++;
        }
        contextRecall = supportedCount / refSentences.length;
    }
    
    // --- Context Precision (AP@K) ---
    const relevantSet = new Set(gt.relevant_chunk_ids);
    const retrieved = trace.retrieved_chunks.map(c => c.chunk_id);
    let hits = 0, sumPrecision = 0;
    for (let i = 0; i < retrieved.length; i++) {
        if (relevantSet.has(retrieved[i])) {
            hits++;
            sumPrecision += hits / (i + 1);
        }
    }
    const contextPrecision = relevantSet.size === 0 ? 1.0 : sumPrecision / relevantSet.size;
    
    // Store results
    results[tid] = {
        faithfulness: r2(faithfulness),
        answer_relevance: r2(answerRelevance),
        context_recall: r2(contextRecall),
        context_precision: r2(contextPrecision)
    };
}

console.log(JSON.stringify(results));
