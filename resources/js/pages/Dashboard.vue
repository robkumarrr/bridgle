<script setup lang="ts">
import { ref, watch } from 'vue';
import { Head } from '@inertiajs/vue3';
import { useGame } from '@/composables/useGame';
import GameBoard from '@/components/GameBoard.vue';
import GameKeyboard from '@/components/GameKeyboard.vue';
import EndGameModal from '@/components/EndGameModal.vue';
import { BarChart2 } from 'lucide-vue-next';
import type { GameResultPayload } from '@/composables/useGame';

const {
    board,
    boardKey,
    currentRow,
    gameState,
    letterStates,
    message,
    shakingRow,
    lastResult,
    isPlaying,
    addLetter,
    removeLetter,
    submitGuess,
    newGame,
} = useGame();

// The modal waits for the last row's flip animation to finish before appearing.
// Last tile flips at: col 4 × 300ms stagger + 500ms animation = 1700ms.
// We wait 1900ms to give it a little breath before fading in.
const FLIP_DURATION_MS = 1900;
const modalOpen = ref(false);
let endTimer: ReturnType<typeof setTimeout> | null = null;

watch(gameState, (val) => {
    if (val === 'playing') {
        modalOpen.value = false;
        if (endTimer) clearTimeout(endTimer);
    } else {
        endTimer = setTimeout(() => {
            modalOpen.value = true;
        }, FLIP_DURATION_MS);
    }
});

// CSRF + fire-and-forget result save
function getCsrf(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

watch(lastResult, async (result: GameResultPayload | null) => {
    if (!result) return;
    try {
        await fetch('/game-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrf(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(result),
        });
    } catch {
        // Silently ignore
    }
});
</script>

<template>
    <Head title="Play" />

    <div class="flex flex-1 flex-col items-center justify-between gap-4 py-4 px-2 min-h-0">

        <!-- Toast -->
        <Transition name="toast">
            <div
                v-if="message"
                class="fixed top-20 left-1/2 -translate-x-1/2 z-50
                       bg-foreground text-background text-sm font-semibold
                       px-4 py-2 rounded-lg shadow-lg pointer-events-none"
            >
                {{ message }}
            </div>
        </Transition>

        <!-- Board -->
        <div class="flex flex-1 items-center justify-center" style="perspective: 800px;">
            <Transition name="board-flip" mode="out-in">
                <GameBoard
                    :key="boardKey"
                    :board="board"
                    :current-row="currentRow"
                    :shaking-row="shakingRow"
                    :game-state="gameState"
                />
            </Transition>
        </div>

        <!-- See results button — shows when game is over and modal is dismissed -->
        <div class="flex items-center justify-center min-h-[2.5rem]">
            <Transition name="fade-up">
                <div
                    v-if="lastResult && gameState !== 'playing' && !modalOpen"
                    class="flex items-center gap-2"
                >
                    <button
                        @click="modalOpen = true"
                        class="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border
                               text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
                    >
                        <BarChart2 class="w-4 h-4" />
                        See results
                    </button>
                    <button
                        @click="newGame"
                        class="px-4 py-2 rounded-lg bg-primary text-primary-foreground
                               text-sm font-semibold cursor-pointer hover:opacity-90
                               active:scale-95 transition-all duration-150"
                    >
                        Play again
                    </button>
                </div>
            </Transition>
        </div>

        <!-- End game modal -->
        <EndGameModal
            v-if="lastResult"
            :show="modalOpen"
            :word="lastResult.word"
            :game-state="gameState as 'won' | 'lost'"
            :attempt-count="currentRow"
            @close="modalOpen = false"
            @play-again="newGame(); modalOpen = false"
        />

        <!-- Keyboard -->
        <GameKeyboard
            :letter-states="letterStates"
            :is-playing="isPlaying"
            @letter="addLetter"
            @backspace="removeLetter"
            @enter="submitGuess"
        />

    </div>
</template>

<style scoped>
/* Toast slide-down */
.toast-enter-active,
.toast-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translate(-50%, -8px);
}

/* See results button fade+rise */
.fade-up-enter-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-up-enter-from {
    opacity: 0;
    transform: translateY(6px);
}
.fade-up-leave-active {
    transition: opacity 0.15s ease;
}
.fade-up-leave-to {
    opacity: 0;
}

/* Board reset flip */
.board-flip-leave-active {
    transition: opacity 0.2s ease, transform 0.25s ease;
}
.board-flip-leave-to {
    opacity: 0;
    transform: rotateX(20deg) scale(0.97);
}
.board-flip-enter-active {
    transition: opacity 0.25s ease 0.05s, transform 0.3s ease 0.05s;
}
.board-flip-enter-from {
    opacity: 0;
    transform: rotateX(-20deg) scale(0.97);
}
</style>
