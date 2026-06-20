#!/bin/bash

# Step 1: Extract categories and create directories
find . -type f -name "*.txt" |
while IFS= read -r file; do
    # -m in grep is max count which limits the number of matching lines returned from a file
    category=$(grep -m 1 "^category:" "$file" | cut -d' ' -f2-)
    mkdir -p "$category"
done

# Step 2: Move and rename files
find . -type f -name "*.txt" |
while IFS= read -r file; do
    # echo "$file"
    category=$(grep -m 1 "^category:" "$file" | cut -d' ' -f2-)
    relpath=$(echo "$file" | sed 's|^./||') # Remove leading ./
    newname=$(echo "$relpath" | tr '/' '-') # Replace / with -
    # echo "$file" "$category/$newname"
    mv "$file" "$category/$newname"
done

# Step 3: Clean up empty directories
find . -type d -empty -delete

# Step 4: Generate and display hash
find . -type f | LC_ALL=C sort | sha256sum