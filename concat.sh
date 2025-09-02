#!/bin/bash

cd /home/tinmac/hotbits
DATA="/mnt/hotbits"

function setup() {
	rm -R ${DATA}/working/* &>/dev/null
	mkdir -p ${DATA}/working &>/dev/null
}

function generate() {
	while read -ra ROW; do
		echo "$(basename ${ROW})	${ROW}"
	done<<<$(find ${DATA}/data -type f | grep -E "events[-][0-9]*.txt" | sort) | sort
}

function concatenate() {
	rm ./working/concatenated.txt
	generate | while read -r BASE FILE; do
		cat ${FILE} >> ${DATA}/working/concatenated.txt
	done
}

function extract() {
	./process_timeseries.sh \
		${DATA}/working/concatenated.txt \
		${DATA}/working/cleaned_random.bin \
			&>${DATA}/working/extract.txt
}

function prepare() {
	
	# Sample size (Bits)
	SAMPLE_BITS=1000000

	# Sample size (Bytes)
	TARGET=$(( 0+(${SAMPLE_BITS}/8) ))

	# Adjust
	(( $(( ${SAMPLE_BITS}%8 ))==0 )) || TARGET=$(( TARGET+1 ))
	
	# Current binary size (Bits)
	SIZE=$(( $(stat -t --format=%s ${DATA}/working/cleaned_random.bin)*8 ))

	# Needed bits vs actual (Bits)
	DIFF=$(( ${SAMPLE_BITS}-SIZE ))

	# Extra data needed
	CHUNKS=$(( DIFF/SIZE ))
	(( $(( DIFF%SIZE ))==0 )) || CHUNKS=$(( CHUNKS+1 ))

	echo "Target (bits)	= ${TARGET}"
	echo "File Size (bits)	= ${SIZE}"
	echo "Difference (bits)	= ${DIFF}"
	echo "Chunks needed	= ${CHUNKS}"

	cp ${DATA}/working/cleaned_random.bin ${DATA}/working/random.bin

	if (( CHUNKS>0 )); then
		#rm ./working/random.bin &>/dev/null
		for IDX in $(seq 1 ${CHUNKS}); do
			echo "${IDX}"
			cat ${DATA}/working/cleaned_random.bin >>${DATA}/working/random.bin
		done
	fi
	dd skip=0 count=${TARGET} if=${DATA}/working/random.bin of=${DATA}/working/random-truncated.bin bs=1 &>/dev/null

	stat ${DATA}/working/random-truncated.bin
}

function evaluate() {
	scripts/nist-template.sh
	cp -r repos/sts-2.1.2/sts-2.1.2/experiments/AlgorithmTesting ${DATA}/working/nist.txt
	dieharder -a -f ${DATA}/working/random-truncated.bin | tee ${DATA}/working/dieharder.txt
}

function backup() {
	mv ${DATA}/working ${DATA}/complete/$(date +%s)
	find ${DATA}/complete/ -type f \
		| grep -E "final|dieharder" \
		| while read -r ROW; do \
			IFS="/" read -ra SRC<<<${ROW}
			cp "${ROW}" "${DATA}/reports/${SRC[1]}-${SRC[-1]}"
		done
}

setup
concatenate
extract
prepare
evaluate
backup

cd -
