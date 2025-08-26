#!/bin/bash

while read -r ROW; do
	echo "$ROW"
	IFS='/' read -ra PARTS <<<${ROW}
	BATCH="${PARTS[2]}"
	FILE="${PARTS[-1]}"
	#mkdir -p ./reports/${BATCH} &>/dev/null
	cp ${ROW} "./reports/${BATCH}-${FILE}"
done<<<$(find ./complete -type f | grep -E "final|dieharder")
