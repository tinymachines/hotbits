#!/bin/bash

cd /home/tinmac/meatballai

xxd -b random.bin \
	| while read -ra ROW;
	  do echo "${ROW[@]:1:6}" \
		  | xargs | tr -d '[:space:]';
	  done > rands.txt
