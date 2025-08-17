#!/bin/bash

rm -R ./working/* &>/dev/null
rm -R ./evaluate/* &>/dev/null

TMP="./working/evaluate-$(date +%s).txt"
DST="./evaluate"

cat ./data/events-*.txt >${TMP}
echo "$(wc -l $TMP) timestamps"

cat ${TMP} | tee \
	>(python src/analysis/analyze.py >${DST}/analyze.txt) \
	>(python src/analysis/test_randomness.py >${DST}/test_randomness.txt) \
	>(python src/analysis/extract.py >${DST}/extract.bin) \
		&> /dev/null

./scripts/run_full_test.sh ${TMP}

mv ${TMP} ${DST}/data.txt
gzip ${DST}/data.txt
