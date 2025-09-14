#!/bin/bash

function generate() {
	find ./complete/ \
		| grep -Po "^[.][/]complete[/][0-9]{10}$" \
		| sort \
		| uniq \
		| tail -n24
}

function extract() {
	while read -r ROW; do
		cat ${ROW}/extract.txt
		cat ${ROW}/extraction.log
	done
}

generate | extract
