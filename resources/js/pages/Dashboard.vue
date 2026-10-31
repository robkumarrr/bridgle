<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { BarChart2 } from 'lucide-vue-next';
import { ref, watch, onMounted } from 'vue';
import EndGameModal from '@/components/EndGameModal.vue';
import GameBoard from '@/components/GameBoard.vue';
import GameKeyboard from '@/components/GameKeyboard.vue';
import { useGame } from '@/composables/useGame';
import type { GameResultPayload } from '@/composables/useGame';

// Guest mode (served from /): same game, but nothing is saved server-side
const props = withDefaults(defineProps<{ guest?: boolean }>(), { guest: false });

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
    initialising,
    addLetter,
    removeLetter,
    submitGuess,
    newGame,
    initGame,
} = useGame({ guest: props.guest });

// ── Load / restore saved game on mount ────────────────────────────────────────
onMounted(() => initGame());

// ── End-game modal timing ─────────────────────────────────────────────────────
// Last tile flips at: col 4 × 300ms stagger + 500ms animation = 1700ms.
// We wait 1900ms to give it a little breath before fading in.
const FLIP_DURATION_MS = 1900;
const modalOpen = ref(false);
let endTimer: ReturnType<typeof setTimeout> | null = null;

watch(gameState, (val) => {
    if (val === 'playing') {
        modalOpen.value = false;

        if (endTimer) {
clearTimeout(endTimer);
}
    } else {
        endTimer = setTimeout(() => {
            modalOpen.value = true;
        }, FLIP_DURATION_MS);
    }
});

// On restore from DB, if game is already won/lost show modal immediately
watch(initialising, (loading) => {
    if (!loading && gameState.value !== 'playing') {
        modalOpen.value = true;
    }
});

// ── Confirm before starting a new game ────────────────────────────────────────
const confirmOpen = ref(false);

function requestNewGame() {
    if (gameState.value !== 'playing') {
        // Game already over — no need to confirm
        handleNewGame();

        return;
    }

    confirmOpen.value = true;
}

async function handleNewGame() {
    confirmOpen.value = false;
    modalOpen.value = false;
    await newGame();
}

// ── CSRF + fire-and-forget result save ────────────────────────────────────────
function getCsrf(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

watch(lastResult, async (result: GameResultPayload | null) => {
    if (!result || props.guest) {
return;
}

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

        <!-- See results + play again buttons (shown after game ends, modal dismissed) -->
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
                        @click="requestNewGame"
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
            :guest="guest"
            @close="modalOpen = false"
            @play-again="requestNewGame"
        />

        <!-- Confirm new game dialog -->
        <Transition name="modal">
            <div
                v-if="confirmOpen"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
            >
                <div class="absolute inset-0 bg-black/50" @click="confirmOpen = false" />
                <div class="relative z-10 w-full max-w-xs bg-background border border-border
                            rounded-xl shadow-xl p-6 flex flex-col gap-4">
                    <h2 class="text-base font-semibold">Abandon this game?</h2>
                    <p class="text-sm text-muted-foreground leading-relaxed">
                        You're in the middle of a game. Starting a new one will lose your progress.
                    </p>
                    <div class="flex gap-2 justify-end">
                        <button
                            @click="confirmOpen = false"
                            class="px-4 py-2 rounded-lg border border-border text-sm
                                   font-medium cursor-pointer hover:bg-accent transition-colors"
                        >
                            Keep playing
                        </button>
                        <button
                            @click="handleNewGame"
                            class="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground
                                   text-sm font-semibold cursor-pointer hover:opacity-90
                                   active:scale-95 transition-all duration-150"
                        >
                            New game
                        </button>
                    </div>
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

/* Confirm dialog */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
