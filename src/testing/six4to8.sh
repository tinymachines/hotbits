#!/bin/bash

while read -r ROW; do
	I=${ROW}
	binary=$(printf "%064s\n" $(echo "obase=2; $I" | bc))
	for i in {0..7}; do
		CONVERTED=$(echo "${binary:i*8:8}" | grep -v ' ')
		if [[ ! -z ${CONVERTED} ]]; then
			echo "${CONVERTED}"
		fi
	done
done<<<$([[ ! -z ${1} ]] && echo ${1} || cat - 2> /dev/null)
