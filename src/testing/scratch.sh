#!/bin/bash

#cat timestamp.txt | ./transform -d 1000000 -w 10000000 -m 0 | ./rng-extractor -m 2 >./random.bin
cat timestamp.txt | ./transform -d 1000000 -w 10000000 -m 0 | ./transform -m 1 | ./transform -m 2 | ./transform -m 3 | ./rng-extractor  -m 2>./random.bin
dieharder -a  -f ./random.bin | tee results.txt

#cat timestamp.txt | ./rng-extractor -m 0
#cat random.bin | dieharder -v -a
#cat ./debug.log
#cat timestamp.txt | ./transform -d 1000000 -w 10000000 -m 0
