#!/bin/bash

function generate() {
	find /mnt/hotbits/${1} -maxdepth 1 -type f -name "*.txt" | sort -r | tail -n+3
}

function filter() {
	while read -r ROW; do
		read -ra STATS<<<$(stat -t ${ROW})
		(( STATS[1]==0 ))&&echo "${STATS[@]}"&&rm "${ROW}"
	done
}
generate "data" | filter
generate "reports" | filter
