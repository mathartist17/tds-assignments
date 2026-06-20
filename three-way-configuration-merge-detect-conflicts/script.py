import json
from pathlib import Path

repo = Path("config_merge")

with open(repo / "base.json") as f:
    base = json.load(f)

with open(repo / "branch_a.json") as f:
    branch_a = json.load(f)

with open(repo / "branch_b.json") as f:
    branch_b = json.load(f)

conflicts = 0

for key in base:
    base_val = base.get(key, {}).get("value")
    a_val = branch_a.get(key, {}).get("value")
    b_val = branch_b.get(key, {}).get("value")

    if (
        base_val != a_val
        and base_val != b_val
        and a_val != b_val
    ):
        conflicts += 1

print(f"Conflicts: {conflicts}")
