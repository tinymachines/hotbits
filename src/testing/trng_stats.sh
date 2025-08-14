#!/bin/bash

while read -r ROW; do
	echo "${ROW:0:6}"
done<<<$(cat "timestamp.txt") \
	| uniq -c \
	| while read -ra ROW; do
		echo "${ROW[0]}";
	done 
	#| sort -n | uniq -c | sed "s/^[ ]*//g"

exit
while read -r ROW; do
	echo "${ROW:0:9}"
done<<<$(cat "timestamp.txt") \
	| while read -r T; do
		echo "${T:8:1}"
	done \
	| while read -r NUM; do
		echo $(( ${NUM}%2 ))
	done

	#| sort | uniq -c | sed "s/^[ ]*//g"

exit
LAST=0
while read -r ROW; do
	DELTA=$(( ROW-LAST ))
	[[ DELTA -le 1 ]] && echo "${ROW}"
	LAST=${ROW}
done<<<$(cat "bintime.txt") \
	| uniq -c \
	| while read -ra ROW; do
		echo "${ROW[0]}";
	done | sort -n | uniq -c | sed "s/^[ ]*//g"
