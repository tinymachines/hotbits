ls -la | grep " 0 Aug" | while read -ra ROW; do echo "${ROW[-1]}"; done | xargs rm
