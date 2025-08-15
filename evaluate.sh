#!/bin/bash

rm -R ./working/* &>/dev/null
rm -R ./evaluate/* &>/dev/null

TMP="./working/evaluate-$(date +%s).txt"
DST="./evaluate"

cat ./data/events*.txt >${TMP}

cat ${TMP} | tee \
	>(python src/analysis/analyze.py >${DST}/analyze.txt) \
	>(python src/analysis/test_randomness.py >${DST}/test_randomness.txt) \
	>(python src/analysis/extract.py >${DST}/extract.bin) \
		&> /dev/null

mv ${TMP} ${DST}/data.txt
gzip ${DST}/data.txt

exit

while IFS="/" read -r ROW; do
	FILE="${ROW[-1]}"
	echo "${FILE}"
	DST="./evaluate/${FILE}"
	mkdir -p "${DST}" &>/dev/null
	cp "${ROW}" "${DST}"
	
	cat "${ROW}/${DST}" | tee \
		>(python src/analysis/analyze.py >${DST}/analyze.txt) \
		>(python src/analysis/test_randomness.py >${DST}/test_randomness.txt) \
		>(python src/analysis/extract.py >${DST}/extract.bin) |
			&> /dev/null
	
	gzip "${ROW}/${DST}"

done<<<$(find ./working -type f | grep -E "[.]txt")
exit
cat data/*.txt \
	| python src/analysis/analyze.py \

