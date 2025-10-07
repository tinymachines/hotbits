#!/bin/bash

cd /home/tinmac/hotbits

[[ -f .pids ]] && exit || touch .pids

function start_capture() {
	timeout 60m src/trng/trng >./data/events-$(date +%s).txt
}

function handle_ctrlc() {
    while read -r KILL; do
	kill -9 "${KILL}" &>./dev/null
    done<<<$(cat .pids)
    rm .pids
}
trap handle_ctrlc SIGINT

start_capture &

PID=$!
echo "${PID}">.pids

wait
handle_ctrlc
