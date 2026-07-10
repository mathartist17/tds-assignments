Semantic Deduplication Challenge

Embedding similarity alone is not safe for deduplication: two policy notices can be near-identical in
wording (and embedding space) while quoting two different fee amounts. Merge documents only when both
their embeddings AND their numeric facts agree within tolerance.
