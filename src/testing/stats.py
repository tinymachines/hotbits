import sys

handles=[open(f"./logs/{i}.txt", 'w') for i in range(0,16)]
with sys.stdin as fin:
    for row in fin:
        row = row.strip()
        for c in range(0, len(row)):
            handles[c].write(row[c])
        
