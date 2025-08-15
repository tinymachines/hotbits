#!/bin/bash

cd /home/tinmac/hotbits

[[ -f .pids ]] && exit || touch .pids

PIDS=()
truncate .pids --size=0

function handle_ctrlc() {
    while read -r KILL; do
	kill "${KILL}"
    done<<<$(cat .pids)
}
trap handle_ctrlc SIGINT

function runit() {
	src/trng/trng |\
		tee ./data/events-$(date +%s).txt
}

runit &

PIDS+=($!)

for PID in ${PIDS[@]}; do
    echo "${PID}" >>.pids
done

#for PID in ${PIDS[@]}; do
#    wait ${PID}
#    sleep 3
#done

sleep 5m
handle_ctrlc

rm .pids
