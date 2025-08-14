#!/bin/bash

while read -r ROW; do
	if (( ROW>89373457 )); then 
		printf "1"
	else
		printf "0"
	fi
done | tr -d '\n' | fold -b2 | grep -Ev "00|11" | while read -r ROW; do
	echo "${ROW:0:1}"
done | tr -d '\n' | fold -b100
