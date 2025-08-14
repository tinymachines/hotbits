#!/bin/bash

#cat timestamp.txt \

	cat logs/col14.txt \
	| fold -b16 \
	| ./transform -m 0 \
	| while read -r ROW; do
		pad="${ROW}0"
		echo "${pad:0:16}"
	done

	exit
	#\
	#| ./rng-extractor >./random.bin
	#printf "%064s\n" $(echo "obase=2; $I" | bc)
done
#| ./xor-groups 2 \
dieharder -a -f ./random.bin | tee results.txt

exit
	| ./transform -m 3 \
	| ./transform -m 2 \
	| ./transform -m 1 \
	| ./transform -m 0 \
	| ./rng-extractor \
	| 2>./random.bin

dieharder -a -f ./random.bin | tee results.txt
exit

cat timestamp.txt \
	| ./transform -m 3 \
	| ./transform -m 2 \
	| ./transform -m 1 \
	| ./transform -m 0 \
	| ./rng-extractor \
	| 2>./random.bin
dieharder -a  -f ./random.bin | tee results.txt

exit
	| ./transform -d 1000000 -w 10000000 -m 0 \
	| ./transform -d 1000000 -w 10000000 -m 1 \
	| ./transform -d 1000000 -w 10000000 -m 2 \
	| ./transform -d 1000000 -w 10000000 -m 3 \
	| ./rng-extractor -m 1 \
		2>./random.bin

#cat timestamp.txt | ./rng-extractor -m 0
#cat random.bin | dieharder -v -a
#cat ./debug.log
#cat timestamp.txt | ./transform -d 1000000 -w 10000000 -m 0 | ./rng-extractor -m 2 >./random.bin
#cat timestamp.txt | ./transform -d 1000000 -w 10000000 -m 	
#exit
#
#
#
#
#
