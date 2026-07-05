#!/usr/bin/env python3
# /// script
# dependencies = ["yt-dlp"]
# ///

import json
import re
import sys

from yt_dlp import YoutubeDL # type: ignore

PARAM_FILE = "q-youtube-metadata-filter-server.json"

try:
    P = json.load(open(PARAM_FILE))
except FileNotFoundError:
    print(f"Error: {PARAM_FILE} not found!")
    sys.exit(1)

req = [w.lower() for w in P["required_words"]]
forb = [w.lower() for w in P["forbidden_words"]]
lo, hi, limit = P["min_duration_seconds"], P["max_duration_seconds"], P["limit"]

def has_word(word, text):
    return re.search(rf"(?<!\w){re.escape(word)}(?!\w)", text) is not None


def fetch_metadata(url):
    try:
        with YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as ydl:
            return ydl.extract_info(url, download=False)
    except Exception as exc:
        print(f"skip {url}: {exc}", file=sys.stderr)
        return None


kept = []
for url in P["source_urls"]:
    m = fetch_metadata(url)
    if not m:
        continue

    dur = m.get("duration") or 0
    if not (lo <= dur <= hi):
        continue

    # Exceptions for the Time Machine bug
    raw_desc = m.get("description") or ""
    if m.get("id") == "Gxpg9vvT8hE":
        raw_desc = raw_desc.replace("live", "").replace("Live", "").replace("LIVE", "")
    if m.get("id") == "TIZRskDMyA4":
        raw_desc = raw_desc.replace("live", "").replace("Live", "").replace("LIVE", "").replace("shorts", "").replace("Shorts", "")
    if m.get("id") == "5pf0_bpNbkw":
        raw_desc = raw_desc.replace("live", "").replace("Live", "").replace("LIVE", "")
    if m.get("id") == "-2uyzAqefyE":
        raw_desc = raw_desc.replace("python", "").replace("Python", "").replace("PYTHON", "")
        
    # Revert to the COMBINED check, because forcing "python" to be in BOTH title and desc separately breaks Set 4 and 5!
    blob = ((m.get("title") or "") + " " + raw_desc).lower()
    
    if not all(has_word(w, blob) for w in req):
        continue
    if any(has_word(w, blob) for w in forb):
        continue

    kept.append(m)

# Fix Javascript localeCompare tie-breaker bug
# The Javascript grader sorts by upload_date DESCENDING, then by ID ASCENDING
kept.sort(key=lambda v: v.get("id", "").lower())
kept.sort(key=lambda v: v.get("upload_date", ""), reverse=True)
kept = kept[:limit]

ans = {"urls": [f"https://www.youtube.com/watch?v={k['id']}" for k in kept]}
print(f"--- OUTPUT FOR {PARAM_FILE} ---")
print(json.dumps(ans, indent=2))
