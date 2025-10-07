#!/bin/bash

ROOT="${HOME}/projects/hotbits"

NIST="${ROOT}/repos/sts-2.1.2/sts-2.1.2"
DIEHARDER="/usr/bin/dieharder"

DATA="${ROOT}/data"
WORKING="${ROOT}/working"
LIVE="${ROOT}/live"
COMPLETE="${ROOT}/complete"
REPORTS="${ROOT}/reports"

REMOTE="tinmac@trng2:/home/tinmac/hotbits/data"

cd ${ROOT}

function setup() {

	rm -R ${WORKING}/* &>/dev/null

	mkdir -p ${WORKING} &>/dev/null
	mkdir -p ${LIVE} &>/dev/null
	mkdir -p ${COMPLETE} &>/dev/null
	mkdir -p ${REPORTS} &>/dev/null
}

function sync() {
	rsync -az ${REMOTE}/ ${DATA}/
}

function generate() {
	while read -ra ROW; do
		echo "$(basename ${ROW})	${ROW}"
	done<<<$(find ${DATA} -type f | grep -E "events[-][0-9]*.txt$" | sort) | sort
}

function concatenate() {
	rm ${WORKING}/concatenated.txt &>/dev/null
	generate | while read -r BASE FILE; do
		cat ${FILE} >>${WORKING}/concatenated.txt
	done
}

function extract() {
	${ROOT}/process_timeseries.sh \
		${WORKING}/concatenated.txt \
		${WORKING}/cleaned_random.bin \
			&>${WORKING}/extract.txt
}

function nist() {
	cd ${NIST}
./assess 1000000 <<EOF
0
../../../working/random-truncated.bin
1
0
1
1
EOF

cd -
}

function prepare() {
	
	# Sample size (Bits)
	SAMPLE_BITS=1000000

	# Sample size (Bytes)
	TARGET=$(( 0+(${SAMPLE_BITS}/8) ))

	# Adjust
	(( $(( ${SAMPLE_BITS}%8 ))==0 )) || TARGET=$(( TARGET+1 ))
	
	# Current binary size (Bits)
	SIZE=$(( $(stat -t --format=%s ${WORKING}/cleaned_random.bin)*8 ))

	# Needed bits vs actual (Bits)
	DIFF=$(( ${SAMPLE_BITS}-SIZE ))

	# Extra data needed
	CHUNKS=$(( DIFF/SIZE ))
	(( $(( DIFF%SIZE ))==0 )) || CHUNKS=$(( CHUNKS+1 ))

	echo "Target (bits)	= ${TARGET}"
	echo "File Size (bits)	= ${SIZE}"
	echo "Difference (bits)	= ${DIFF}"
	echo "Chunks needed	= ${CHUNKS}"

	cp ${WORKING}/cleaned_random.bin ${WORKING}/random.bin

	if (( CHUNKS>0 )); then
		#rm ./working/random.bin &>/dev/null
		for IDX in $(seq 1 ${CHUNKS}); do
			echo "${IDX}"
			cat ${WORKING}/cleaned_random.bin >>${WORKING}/random.bin
		done
	fi
	dd skip=0 count=${TARGET} if=${WORKING}/random.bin of=${WORKING}/random-truncated.bin bs=1 &>/dev/null

	stat ${WORKING}/random-truncated.bin
}

function evaluate() {
	#scripts/nist-template.sh
	nist

	cp -r ${ROOT}/repos/sts-2.1.2/sts-2.1.2/experiments/AlgorithmTesting \
		${WORKING}/nist.txt

	${DIEHARDER} -a -f ${WORKING}/random-truncated.bin \
		| tee ${WORKING}/dieharder.txt
}

function backup() {

	cp ${WORKING}/random-truncated.bin \
		${LIVE}/hotbits.bin

	mv ${WORKING} ${COMPLETE}/$(date +%s)

	find ${COMPLETE}/ -type f \
		| grep -E "final|dieharder" \
		| while read -r ROW; do \
			IFS="/" read -ra SRC<<<${ROW}
			cp "${ROW}" "${REPORTS}/${SRC[4]}-${SRC[-1]}"
		done
}

function main() {

	echo "Running Setup"
	setup

	echo "Syncing"
	sync

	echo "Running Concatenate"
	concatenate

	echo "Running Extract"
	extract

	echo "Running Prepare"
	prepare

	echo "Running Evaluate"
	evaluate

	echo "Running Backup"
	backup

	cd -

}

main 2>&1 | tee run.log
