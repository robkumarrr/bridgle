<script setup lang="ts">
import { watch } from 'vue';
import { Head } from '@inertiajs/vue3';
import { useGame } from '@/composables/useGame';
import GameBoard from '@/components/GameBoard.vue';
import GameKeyboard from '@/components/GameKeyboard.vue';
import StatsModal from '@/components/StatsModal.vue';
import WordDefinition from '@/components/WordDefinition.vue';
import type { GameResultPayload } from '@/composables/useGame';

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

// Grab the CSRF token Laravel embeds in the page meta tag
function getCsrf(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

// When a game ends, fire-and-forget POST to store the result.
// Using plain fetch instead of Inertia router to avoid any page navigation side effects.
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
        // Silently ignore — stats are nice-to-have, don't interrupt the game
    }
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

        <!-- Post-game: definition + actions -->
        <Transition name="fade">
            <div v-if="gameState !== 'playing'" class="flex flex-col items-center gap-3 w-full max-w-sm px-4">
                <!-- Word definition — fetched once, cached forever server-side -->
                <WordDefinition
                    v-if="lastResult"
                    :word="lastResult.word"
                    :key="lastResult.word"
                />

                <div class="flex items-center gap-2 w-full justify-center pt-1">
                    <StatsModal />
                    <button
                        @click="newGame"
                        class="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground
                               font-semibold text-sm hover:opacity-90 active:scale-95
                               transition-all duration-150 cursor-pointer"
                    >
                        Play again
                    </button>
                </div>
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
