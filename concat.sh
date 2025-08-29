#!/bin/bash

cd /home/tinmac/hotbits

function setup() {
	rm -R ./working/* &>/dev/null
	mkdir -p ./working &>/dev/null
}

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
	./process_timeseries.sh \
		working/concatenated.txt \
		working/cleaned_random.bin \
			&>./working/extract.txt
}

function prepare() {
	
	# Sample size (Bits)
	SAMPLE_BITS=1000000

	# Sample size (Bytes)
	TARGET=$(( 0+(${SAMPLE_BITS}/8) ))

	# Adjust
	(( $(( ${SAMPLE_BITS}%8 ))==0 )) || TARGET=$(( TARGET+1 ))
	
	# Current binary size (Bits)
	SIZE=$(( $(stat -t --format=%s working/cleaned_random.bin)*8 ))

	# Needed bits vs actual (Bits)
	DIFF=$(( ${SAMPLE_BITS}-SIZE ))

	# Extra data needed
	CHUNKS=$(( DIFF/SIZE ))
	(( $(( DIFF%SIZE ))==0 )) || CHUNKS=$(( CHUNKS+1 ))

	echo "Target (bits)	= ${TARGET}"
	echo "File Size (bits)	= ${SIZE}"
	echo "Difference (bits)	= ${DIFF}"
	echo "Chunks needed	= ${CHUNKS}"

	cp ./working/cleaned_random.bin ./working/random.bin

	if (( CHUNKS>0 )); then
		#rm ./working/random.bin &>/dev/null
		for IDX in $(seq 1 ${CHUNKS}); do
			echo "${IDX}"
			cat ./working/cleaned_random.bin >>./working/random.bin
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

function backup() {
	mv working complete/$(date +%s)
	find complete/ -type f | grep -E "final|dieharder" | while read -r ROW; do IFS="/" read -ra SRC<<<${ROW}; cp "${ROW}" "reports/${SRC[1]}-${SRC[-1]}"; done
}

setup
concatenate
extract
prepare
evaluate
backup

cd -
