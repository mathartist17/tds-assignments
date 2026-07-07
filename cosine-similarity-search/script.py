# /// script
# dependencies = []
# ///

import json
import functools
import math

DATASET_FILE = "q-cosine-similarity-server.json"


def cmp(a, b):
    if abs(a["sim"] - b["sim"]) > 1e-12:
        return -1 if a["sim"] > b["sim"] else 1
    return -1 if a["id"] < b["id"] else (1 if a["id"] > b["id"] else 0)


def main():
    try:
        with open(DATASET_FILE, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {DATASET_FILE} not found.")
        return

    docs = data["documents"]
    queries = data["queries"]
    res = {}

    for q in queries:
        sims = []
        norm_q = math.sqrt(sum(v * v for v in q["embedding"]))

        for doc in docs:
            dot_product = sum(
                q["embedding"][k] * doc["embedding"][k]
                for k in range(len(q["embedding"]))
            )
            norm_doc = math.sqrt(sum(v * v for v in doc["embedding"]))

            cosine_sim = (
                0
                if norm_q == 0 or norm_doc == 0
                else dot_product / (norm_q * norm_doc)
            )

            sims.append({"id": doc["doc_id"], "sim": cosine_sim})

        sims.sort(key=functools.cmp_to_key(cmp))
        res[q["query_id"]] = [x["id"] for x in sims[:5]]

    print(json.dumps(res))


if __name__ == "__main__":
    main()
