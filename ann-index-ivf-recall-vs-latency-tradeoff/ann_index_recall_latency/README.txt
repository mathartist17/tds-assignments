IVF Approximate Nearest Neighbor Challenge

Build a two-level IVF-style index: assign every item to its nearest centroid (the "inverted lists"),
then for each query probe only its nprobe nearest centroids' lists instead of scanning the whole
corpus. This trades recall for latency -- a small nprobe is fast but can miss the true nearest
neighbors sitting in an unprobed cluster.
