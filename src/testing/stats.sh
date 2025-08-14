#!/bin/bash

cp ./timestamp.txt ./timestamp.tmp

function foldit() {
	dieharder -a -f .logs/out-${1}.txt | tee ./logs/stats-${1}.txt
	#cat ./logs/${1}.txt | fold -b16 | ./rng-extractor > ./logs/out-${1}.txt
}

PIDS=($!)

for COL in $(seq 1 15); do
	echo "${COL}"
	foldit "${COL}"
	PIDS+=($!)
done

for PID in ${PIDS}; do
	echo "Waiting for PID"
	wait ${PID}
done
