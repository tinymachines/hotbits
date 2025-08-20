#!/bin/bash

ROOT="${HOME}/hotbits"
NIST="${ROOT}/repos/sts-2.1.2/sts-2.1.2"

cd ${NIST}

./assess 1000000 <<EOF
0
../../../working/random-truncated.bin
1
0
1
1
EOF

cd -
