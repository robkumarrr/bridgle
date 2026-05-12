<script setup lang="ts">
import type { Tile } from '@/composables/useGame';

defineProps<{
    board: Tile[][];
    currentRow: number;
    shakingRow: number | null;
    gameState: 'playing' | 'won' | 'lost';
}>();
</script>

<template>
    <div class="flex flex-col items-center gap-1.5" aria-label="Wordle game board">
        <div
            v-for="(row, rowIdx) in board"
            :key="rowIdx"
            class="flex gap-1.5"
            :class="{
                'animate-shake': shakingRow === rowIdx,
                'animate-bounce-row': gameState === 'won' && rowIdx === currentRow - 1,
            }"
        >
            <div
                v-for="(tile, colIdx) in row"
                :key="colIdx"
                class="tile"
                :class="[
                    `tile--${tile.state}`,
                    tile.letter && tile.state === 'filled' ? 'tile--pop' : '',
                ]"
                :style="tile.state === 'correct' || tile.state === 'present' || tile.state === 'absent'
                    ? { animationDelay: `${colIdx * 300}ms` }
                    : {}"
                :aria-label="`${tile.letter || 'empty'}, ${tile.state}`"
            >
                {{ (tile.letter ?? '').toUpperCase() }}
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "../../css/app.css";

/* ── Tile base ─────────────────────────────────────────────────────────────── */
.tile {
    @apply flex items-center justify-center;
    @apply w-14 h-14 text-2xl font-bold uppercase select-none;
    @apply border-2 border-border rounded;
    font-family: inherit;
}

@media (max-width: 400px) {
    .tile { @apply w-12 h-12 text-xl; }
}

/* ── Tile states ─────────────────────────────────────────────────────────────── */

.tile--empty  { @apply border-border bg-background text-foreground; }
.tile--filled { @apply border-foreground/50 bg-background text-foreground; }

.tile--correct,
.tile--present,
.tile--absent {
    animation: flip 0.5s ease forwards;
    border-color: transparent;
}

.tile--correct { --tile-bg: hsl(115 29% 43%); --tile-color: #fff; }
.tile--present { --tile-bg: hsl(49 91% 48%);  --tile-color: #fff; }
.tile--absent  { --tile-bg: hsl(240 2% 47%);  --tile-color: #fff; }

.dark .tile--correct { --tile-bg: hsl(115 29% 38%); }
.dark .tile--present { --tile-bg: hsl(49 84% 38%); }
.dark .tile--absent  { --tile-bg: hsl(240 2% 34%); }

/* ── Animations ──────────────────────────────────────────────────────────────── */

@keyframes pop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.12); }
    100% { transform: scale(1); }
}
.tile--pop { animation: pop 0.1s ease; }

@keyframes flip {
    0%   { transform: rotateX(0);      background-color: var(--color-background); color: var(--color-foreground); }
    49%  { transform: rotateX(-90deg); background-color: var(--color-background); }
    50%  { transform: rotateX(-90deg); background-color: var(--tile-bg); color: var(--tile-color); }
    100% { transform: rotateX(0);      background-color: var(--tile-bg); color: var(--tile-color); }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    15%      { transform: translateX(-6px); }
    30%      { transform: translateX(6px); }
    45%      { transform: translateX(-5px); }
    60%      { transform: translateX(5px); }
    75%      { transform: translateX(-3px); }
    90%      { transform: translateX(3px); }
}
.animate-shake { animation: shake 0.6s ease; }

@keyframes bounce-row {
    0%, 100% { transform: translateY(0); }
    40%      { transform: translateY(-20px); }
    60%      { transform: translateY(-10px); }
}
.animate-bounce-row .tile                { animation: bounce-row 1s ease forwards; }
.animate-bounce-row .tile:nth-child(1)  { animation-delay: 0ms; }
.animate-bounce-row .tile:nth-child(2)  { animation-delay: 100ms; }
.animate-bounce-row .tile:nth-child(3)  { animation-delay: 200ms; }
.animate-bounce-row .tile:nth-child(4)  { animation-delay: 300ms; }
.animate-bounce-row .tile:nth-child(5)  { animation-delay: 400ms; }
</style>
