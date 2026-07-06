#!/bin/bash
# Run multiple submission batches sequentially
# Each batch: 150 games, ~8.5 min, fits within timeout
# Adjust batch count based on how many hits we still need
cd /c/Users/lcgog/WorkBuddy/2026-06-20-16-49-15/dungeon-raid

BATCH_SIZE=150
MAX_BATCHES=15
TOTAL_HITS=0

for i in $(seq 1 $MAX_BATCHES); do
    echo "=== Batch $i/$MAX_BATCHES (累计提交: $TOTAL_HITS) ==="
    OUTPUT=$(node playtest.js --submit-ai --games=$BATCH_SIZE --gap=2000 --min=374 --race=elf --t1=elder --t2=shadow 2>&1)
    echo "$OUTPUT"
    # Count successful submissions
    HITS=$(echo "$OUTPUT" | grep -c "↑ /score\|↑ /clear")
    TOTAL_HITS=$((TOTAL_HITS + HITS))
    echo ">>> 本批提交 $HITS 局，累计 $TOTAL_HITS 局"
    if [ $TOTAL_HITS -ge 10 ]; then
        echo "=== 达到 10 局目标，停止 ==="
        break
    fi
done
echo "=== 完成：共提交 $TOTAL_HITS 局 ==="
