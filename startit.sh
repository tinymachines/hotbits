#!/bin/bash

cd /home/tinmac/hotbits

[[ -f .pids ]] && exit || touch .pids

truncate .pids --size=0

function handle_ctrlc() {
    while read -r KILL; do
	kill "${KILL}"
    done<<<$(cat .pids)
    rm .pids
}
trap handle_ctrlc SIGINT

src/trng/trng >./data/events-$(date +%s).txt &

PID=($!)
echo "${PID}">.pids

sleep 60m
handle_ctrlc
wait
