#!/bin/bash

function generate() {
	while read -ra ROW; do
		echo "$(basename ${ROW})	${ROW}"
	done<<<$(find ./data -type f | grep -E "events[-][0-9]*.txt" | sort) | sort
}

function concatenate() {
	rm ./working/concatenated.txt
	generate | while read -r BASE FILE; do
		cat ${FILE} >> ./working/concatenated.txt
	done
}

function extract() {
	cat ./working/concatenated.txt \
		| python ./src/analysis/extract.py \
			>./working/extracted.bin
}

function prepare() {
	TARGET=$(( 1+(1000000/8) )) # 1MM bits = 1MM*8 bytes
	(( $(( 1000000%8 ))==0 )) || TARGET=$(( TARGET+1 ))

	SIZE=$(( $(stat -t --format=%s working/extracted.bin)*8 ))
	DIFF=$(( 1000000-SIZE ))
	CHUNKS=$(( DIFF/SIZE ))
	(( $(( DIFF%SIZE ))==0 )) || CHUNKS=$(( CHUNKS+1 ))

	echo "Target (bits)	= ${TARGET}"
	echo "File Size	= ${SIZE}"
	echo "Difference	= ${DIFF}"
	echo "Chunks needed	= ${CHUNKS}"

	cp ./working/extracted.bin ./working/random.bin

	if (( CHUNKS>0 )); then
		#rm ./working/random.bin &>/dev/null
		for IDX in $(seq 1 ${CHUNKS}); do
			echo "${IDX}"
			cat ./working/extracted.bin >>./working/random.bin
		done
	fi
	dd skip=0 count=${TARGET} if=./working/random.bin of=./working/random-truncated.bin bs=1 &>/dev/null

	stat ./working/random-truncated.bin
}

function evaluate() {
	scripts/nist-template.sh
	cp -r repos/sts-2.1.2/sts-2.1.2/experiments/AlgorithmTesting ./working/nist.txt
	dieharder -a -f ./working/random-truncated.bin | tee ./working/dieharder.txt
}

rm -R ./working/*

concatenate
extract
prepare
evaluate
