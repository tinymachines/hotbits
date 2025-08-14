#!/bin/bash

#while read -r ROW; do
#	echo "obase=2; ${ROW}" | bc
#done \
tr -d '\n' \
| fold -b2 \
| grep -Ev "00|11" \
| while read -r ROW; do
	echo "${ROW:0:1}"
done \
| tr -d '\n' \
| fold -b64 \
| while read -r ROW; do
	ROW=$((2#${ROW})) | tr -d '[:space:]'
	#if [ "${ROW}" -lt 0 ]; then
	#	ROW=$(echo "2^64 + ${ROW}" | bc)
	#fi
	echo "${ROW}"
done
