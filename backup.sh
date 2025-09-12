#!/bin/bash

cd /home/tinmac/hotbits
DATA="/mnt/hotbits"

function backup() {
	mv ${DATA}/working ${DATA}/complete/$(date +%s)
	find ${DATA}/complete/ -type f \
		| grep -E "final|dieharder" \
		| while read -r ROW; do \
			IFS="/" read -ra SRC<<<${ROW}
			echo "${ROW}	=>	${DATA}/reports/${SRC[4]}-${SRC[-1]}"
			cp "${ROW}" "${DATA}/reports/${SRC[4]}-${SRC[-1]}"
		done
}

backup

cd -
