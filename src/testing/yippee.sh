#!/bin/bash


XOR_GROUPS=3000
for ATTEMPT in $(seq 0 10); do
	cp bits.txt bits_${XOR_GROUPS}_${ATTEMPT}.txt
	python trng_processor.py <<<$(cat bits_${XOR_GROUPS}_${ATTEMPT}.txt | ./xor-groups ${XOR_GROUPS} )> random.bin
	cat random.bin | dieharder -a | tee attempt_${XOR_GROUPS}_${ATTEMPT}.log
done



	#| ./debias.sh
	#| ./six4to8.sh \
	#| python trng_processor.py | tee prepared.txt
	#| dieharder -a

#python trng_processor.py <<<$(cat debias.txt)> random.bin
