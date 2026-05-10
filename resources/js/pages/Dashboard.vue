<script setup lang="ts">
import { watch } from 'vue';
import { Head, router } from '@inertiajs/vue3';
import { useGame } from '@/composables/useGame';
import GameBoard from '@/components/GameBoard.vue';
import GameKeyboard from '@/components/GameKeyboard.vue';
import StatsModal from '@/components/StatsModal.vue';

const {
    board,
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

// When a game ends, POST the result to the backend (fire and forget — no redirect)
watch(lastResult, (result) => {
    if (!result) return;
    router.post(route('game-results.store'), result as Record<string, unknown>, {
        preserveState: true,
        preserveScroll: true,
    });
});
</script>

<template>
    <Head title="Play" />

    <div class="flex flex-1 flex-col items-center justify-between gap-4 py-4 px-2 min-h-0">

        <!-- Toast message (invalid guess, win/lose feedback) -->
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
        <div class="flex flex-1 items-center justify-center">
            <GameBoard
                :board="board"
                :current-row="currentRow"
                :shaking-row="shakingRow"
                :game-state="gameState"
            />
        </div>

        <!-- Play again button (shown on win/lose) -->
        <Transition name="fade">
            <div v-if="gameState !== 'playing'" class="flex flex-col items-center gap-2">
                <StatsModal />
                <button
                    @click="newGame"
                    class="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground
                           font-semibold text-sm hover:opacity-90 active:scale-95
                           transition-all duration-150"
                >
                    Play again
                </button>
            </div>
        </Transition>

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

/* Fade for play again button */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
