#!/usr/bin/env python3
import sys

count = 0
for line in sys.stdin:
    count += 1
    if count <= 5:
        print(f"Line {count}: {repr(line)}", file=sys.stderr)
    
print(f"Total lines read: {count}", file=sys.stderr)