import json
import math
import os

data_dir = os.path.join(os.path.dirname(__file__), "data")

# Load rules
with open(os.path.join(data_dir, "cache_rules.json"), "r") as f:
    rules = json.load(f)

ttl_minutes = rules["ttl_minutes"]
similarity_threshold = rules["similarity_threshold"]

# Load expansion map
with open(os.path.join(data_dir, "expansion_map.json"), "r") as f:
    expansion_map = json.load(f)

# Load requests
with open(os.path.join(data_dir, "requests.json"), "r") as f:
    requests = json.load(f)

# Load cache entries
cache_entries = []
with open(os.path.join(data_dir, "cache_entries.jsonl"), "r") as f:
    for line in f:
        if line.strip():
            cache_entries.append(json.loads(line))

print(f"Loaded {len(requests)} requests and {len(cache_entries)} cache entries.")

# Helper to tokenize
import re
def tokenize(text):
    return re.findall(r"\b[a-z0-9]+\b", text.lower())

# Compute true cosine similarity
def cosine_similarity(v1, v2):
    dot = sum(x * y for x, y in zip(v1, v2))
    norm1 = math.sqrt(sum(x * x for x in v1))
    norm2 = math.sqrt(sum(x * x for x in v2))
    return dot / (norm1 * norm2)

min_candidates = 999
results = {}

for req in requests:
    req_tokens = tokenize(req["query"])
    added_set = set()
    for tok in req_tokens:
        if tok in expansion_map:
            for exp in expansion_map[tok]:
                if exp not in req_tokens:
                    added_set.add(exp)
    added_terms = sorted(list(added_set))
    
    # Filter candidates
    candidates = []
    for c in cache_entries:
        if c["tenant"] == req["tenant"] and c["channel"] == req["channel"] and c["language"] == req["language"]:
            age = req["at_minute"] - c["created_minute"]
            if 0 <= age <= ttl_minutes:
                candidates.append(c)
                
    if len(candidates) == 0:
        print(f"Req: {req['request_id']} has 0 candidates!")
    min_candidates = min(min_candidates, len(candidates))
    
    # Calculate similarities
    nearest_sim = -1.0
    nearest_cache_id = None
    
    for c in candidates:
        sim = cosine_similarity(req["embedding"], c["embedding"])
        if sim > nearest_sim:
            nearest_sim = sim
            nearest_cache_id = c["cache_id"]
            
    has_candidates = len(candidates) > 0
    final_nearest_sim = nearest_sim if has_candidates else 0.0
    decision = "HIT" if (has_candidates and nearest_sim >= similarity_threshold) else "MISS"
    
    # If MISS, cache_id should be null
    cache_id_to_report = nearest_cache_id if decision == "HIT" else None
    
    results[req["request_id"]] = {
        "decision": decision,
        "cache_id": cache_id_to_report,
        "nearest_similarity": round(final_nearest_sim, 4),
        "added_terms": added_terms
    }

print("Min candidates count across all requests:", min_candidates)
# Print first 5 results
for r_id in sorted(results.keys())[:5]:
    print(r_id, results[r_id])

# Save output
with open(os.path.join(os.path.dirname(__file__), "output_q7.json"), "w") as f:
    json.dump(results, f, indent=2)
