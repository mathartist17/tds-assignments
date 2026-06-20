## Notes

- For Mac Users, use the following command to get the hash
```
find . -type f |
python3 -c 'import sys, unicodedata; sys.stdout.writelines(unicodedata.normalize("NFC", line) for line in sys.stdin)' |
LC_ALL=C sort |
sha256sum
```
- The given script might not work because the nested directories or files might have name with spaces and the original script has not handled it properly. So, I have added while loop with the IFS as null character, hence, the entire string will be considered as the file name