#!/bin/bash

read -r VAL <<< cat << EOF
cat $ABS_OUTPUT_DIR/nist_input.txt \
$ABS_OUTPUT_DIR/test_params.txt \
| ./assess $FILE_BITS 2>&1 \
| tee $ABS_OUTPUT_DIR/nist_output.log
EOF

echo "${VAL}"


exit
CMD=$(echo << EOF
cat $ABS_OUTPUT_DIR/nist_input.txt \
$ABS_OUTPUT_DIR/test_params.txt \
| ./assess $FILE_BITS 2>&1 \
| tee $ABS_OUTPUT_DIR/nist_output.log
EOF
)

echo "${CMD}"

