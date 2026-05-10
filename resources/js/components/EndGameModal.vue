<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, ChevronRight, X, Volume2, BarChart2, BookOpen } from 'lucide-vue-next';

// ─── Props / Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
    show: boolean;
    word: string;
    gameState: 'won' | 'lost';
    attemptCount: number; // how many guesses it took
}>();

const emit = defineEmits<{
    close: [];
    playAgain: [];
}>();

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS = ['definition', 'stats'] as const;
type Step = typeof STEPS[number];

const currentStep = ref<Step>('definition');
const stepDirection = ref<'forward' | 'back'>('forward');

function goTo(step: Step) {
    stepDirection.value = STEPS.indexOf(step) > STEPS.indexOf(currentStep.value) ? 'forward' : 'back';
    currentStep.value = step;
}
function next() { if (currentStep.value === 'definition') goTo('stats'); }
function prev() { if (currentStep.value === 'stats') goTo('definition'); }

// Reset to definition step whenever modal opens
watch(() => props.show, (val) => {
    if (val) {
        currentStep.value = 'definition';
        fetchDefinition();
        fetchStats();
    }
});

// ─── Close on Escape ──────────────────────────────────────────────────────────

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && props.show) emit('close');
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

// ─── Definition ───────────────────────────────────────────────────────────────

interface Definition { definition: string; example?: string; }
interface Meaning { part_of_speech: string; definitions: Definition[]; }
interface DictionaryEntry { word: string; phonetic?: string; audio?: string; meanings: Meaning[]; }

const dictEntry = ref<DictionaryEntry | null>(null);
const dictLoading = ref(false);

async function fetchDefinition() {
    if (!props.word) return;
    dictLoading.value = true;
    dictEntry.value = null;
    try {
        const res = await fetch(`/dictionary/${props.word}`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok) dictEntry.value = await res.json();
    } catch { /* silent */ }
    finally { dictLoading.value = false; }
}

function playAudio() {
    if (dictEntry.value?.audio) new Audio(dictEntry.value.audio).play().catch(() => {});
}

// ─── Stats ────────────────────────────────────────────────────────────────────

interface Stats {
    total: number; wins: number; losses: number; win_rate: number;
    streak: number; best_streak: number; avg_attempts: number | null;
    avg_time: number | null; avg_guess_interval: number | null;
    total_invalid: number; top_letters: Record<string, number>;
    top_opener: string | null; distribution: Record<number, number>;
}

const stats = ref<Stats | null>(null);
const statsLoading = ref(false);

async function fetchStats() {
    statsLoading.value = true;
    try {
        const res = await fetch('/stats', {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok) {
            const data = await res.json();
            stats.value = data.total > 0 ? data : null;
        }
    } catch { /* silent */ }
    finally { statsLoading.value = false; }
}

function formatTime(s: number | null): string {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}
function maxDist(dist: Record<number, number>): number {
    return Math.max(1, ...Object.values(dist));
}

// ─── Win/lose copy ────────────────────────────────────────────────────────────

const WIN_MSGS = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
function headline(): string {
    if (props.gameState === 'lost') return 'Better luck next time';
    return WIN_MSGS[props.attemptCount - 1] ?? 'Nice!';
}
</script>

<template>
    <Transition name="modal-fade">
        <div
            v-if="show"
            class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
        >
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />

            <!-- Panel — fixed height so content changes don't resize the modal -->
            <div class="relative z-10 w-full sm:max-w-sm bg-background border border-border
                        rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col
                        h-[82dvh] sm:h-[580px] overflow-hidden">

                <!-- Header -->
                <div class="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                    <div>
                        <p class="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                            {{ gameState === 'won' ? 'You got it' : 'Game over' }}
                        </p>
                        <h2 class="text-2xl font-bold tracking-widest uppercase mt-0.5">
                            {{ word }}
                        </h2>
                    </div>
                    <button
                        @click="emit('close')"
                        class="cursor-pointer text-muted-foreground hover:text-foreground
                               transition-colors p-1.5 rounded-lg hover:bg-accent"
                        aria-label="Close"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Step tabs -->
                <div class="flex border-b border-border shrink-0 px-5">
                    <button
                        @click="goTo('definition')"
                        class="flex items-center gap-1.5 px-1 pb-2.5 text-sm font-medium
                               border-b-2 transition-colors cursor-pointer mr-5"
                        :class="currentStep === 'definition'
                            ? 'border-foreground text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'"
                    >
                        <BookOpen class="w-3.5 h-3.5" />
                        Definition
                    </button>
                    <button
                        @click="goTo('stats')"
                        class="flex items-center gap-1.5 px-1 pb-2.5 text-sm font-medium
                               border-b-2 transition-colors cursor-pointer"
                        :class="currentStep === 'stats'
                            ? 'border-foreground text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'"
                    >
                        <BarChart2 class="w-3.5 h-3.5" />
                        Stats
                    </button>
                </div>

                <!-- Step content -->
                <div class="flex-1 overflow-y-auto min-h-0">
                    <Transition :name="stepDirection === 'forward' ? 'slide-left' : 'slide-right'" mode="out-in">

                        <!-- ── Step 1: Definition ── -->
                        <div v-if="currentStep === 'definition'" key="definition" class="px-5 py-4">
                            <!-- Loading skeleton -->
                            <div v-if="dictLoading" class="space-y-3 animate-pulse">
                                <div class="h-3 bg-muted rounded w-1/4" />
                                <div class="h-3 bg-muted rounded w-full" />
                                <div class="h-3 bg-muted rounded w-4/5" />
                                <div class="h-3 bg-muted rounded w-full" />
                                <div class="h-3 bg-muted rounded w-3/5" />
                            </div>

                            <div v-else-if="dictEntry">
                                <!-- Phonetic + audio -->
                                <div class="flex items-center gap-2 mb-4">
                                    <span v-if="dictEntry.phonetic" class="text-sm text-muted-foreground">
                                        {{ dictEntry.phonetic }}
                                    </span>
                                    <button
                                        v-if="dictEntry.audio"
                                        @click="playAudio"
                                        class="cursor-pointer text-muted-foreground hover:text-foreground
                                               transition-colors p-1 rounded"
                                        aria-label="Play pronunciation"
                                    >
                                        <Volume2 class="w-4 h-4" />
                                    </button>
                                </div>

                                <!-- Meanings -->
                                <div class="space-y-4">
                                    <div v-for="(meaning, i) in dictEntry.meanings" :key="i">
                                        <p class="text-xs font-semibold uppercase tracking-wide
                                                  text-muted-foreground mb-2 italic">
                                            {{ meaning.part_of_speech }}
                                        </p>
                                        <div
                                            v-for="(def, j) in meaning.definitions"
                                            :key="j"
                                            class="mb-2 pl-3 border-l-2 border-border"
                                        >
                                            <p class="text-sm leading-relaxed">{{ def.definition }}</p>
                                            <p v-if="def.example"
                                               class="text-xs text-muted-foreground italic mt-1 leading-relaxed">
                                                "{{ def.example }}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p v-else class="text-sm text-muted-foreground text-center py-8">
                                No definition found.
                            </p>
                        </div>

                        <!-- ── Step 2: Stats ── -->
                        <div v-else-if="currentStep === 'stats'" key="stats" class="px-5 py-4">
                            <div v-if="statsLoading" class="space-y-3 animate-pulse">
                                <div class="h-3 bg-muted rounded w-full" />
                                <div class="h-3 bg-muted rounded w-4/5" />
                                <div class="h-3 bg-muted rounded w-full" />
                            </div>

                            <template v-else-if="stats">
                                <!-- Summary -->
                                <div class="grid grid-cols-4 gap-2 text-center mb-5">
                                    <div>
                                        <p class="text-2xl font-bold">{{ stats.total }}</p>
                                        <p class="text-xs text-muted-foreground mt-0.5">Played</p>
                                    </div>
                                    <div>
                                        <p class="text-2xl font-bold">{{ stats.win_rate }}%</p>
                                        <p class="text-xs text-muted-foreground mt-0.5">Win rate</p>
                                    </div>
                                    <div>
                                        <p class="text-2xl font-bold">{{ stats.streak }}</p>
                                        <p class="text-xs text-muted-foreground mt-0.5">Streak</p>
                                    </div>
                                    <div>
                                        <p class="text-2xl font-bold">{{ stats.best_streak }}</p>
                                        <p class="text-xs text-muted-foreground mt-0.5">Best</p>
                                    </div>
                                </div>

                                <!-- Guess distribution -->
                                <p class="text-xs font-semibold uppercase tracking-wide
                                          text-muted-foreground mb-2">Guess Distribution</p>
                                <div class="space-y-1.5 mb-5">
                                    <div v-for="n in 6" :key="n" class="flex items-center gap-2 text-sm">
                                        <span class="w-3 text-right font-mono text-muted-foreground text-xs">{{ n }}</span>
                                        <div class="flex-1">
                                            <div
                                                class="h-5 rounded-sm flex items-center justify-end px-1.5
                                                       text-xs font-bold text-white transition-all duration-500"
                                                :class="stats.distribution[n] > 0 ? 'bg-primary' : 'bg-muted'"
                                                :style="{
                                                    width: stats.distribution[n]
                                                        ? `${Math.max(12, (stats.distribution[n] / maxDist(stats.distribution)) * 100)}%`
                                                        : '1.5rem'
                                                }"
                                            >
                                                <span v-if="stats.distribution[n] > 0">{{ stats.distribution[n] }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Timing -->
                                <div class="grid grid-cols-3 gap-3 text-center border-t border-border pt-4 mb-4">
                                    <div>
                                        <p class="text-lg font-bold">{{ stats.avg_attempts ?? '—' }}</p>
                                        <p class="text-xs text-muted-foreground">Avg guesses</p>
                                    </div>
                                    <div>
                                        <p class="text-lg font-bold">{{ formatTime(stats.avg_time) }}</p>
                                        <p class="text-xs text-muted-foreground">Avg time</p>
                                    </div>
                                    <div>
                                        <p class="text-lg font-bold">{{ formatTime(stats.avg_guess_interval) }}</p>
                                        <p class="text-xs text-muted-foreground">Per guess</p>
                                    </div>
                                </div>

                                <!-- Misc -->
                                <div class="grid grid-cols-2 gap-3 text-center border-t border-border pt-4 mb-4">
                                    <div>
                                        <p class="text-lg font-bold">{{ stats.total_invalid }}</p>
                                        <p class="text-xs text-muted-foreground">Invalid guesses</p>
                                    </div>
                                    <div>
                                        <p class="text-lg font-bold uppercase">{{ stats.top_opener ?? '—' }}</p>
                                        <p class="text-xs text-muted-foreground">Fav opener</p>
                                    </div>
                                </div>

                                <!-- Top letters -->
                                <div v-if="Object.keys(stats.top_letters).length"
                                     class="border-t border-border pt-4">
                                    <p class="text-xs font-semibold uppercase tracking-wide
                                              text-muted-foreground mb-2">Most Used Letters</p>
                                    <div class="flex gap-2 flex-wrap">
                                        <div
                                            v-for="(count, letter) in stats.top_letters"
                                            :key="letter"
                                            class="flex flex-col items-center bg-secondary
                                                   rounded-lg px-3 py-1.5 min-w-[2.5rem]"
                                        >
                                            <span class="text-base font-bold uppercase">{{ letter }}</span>
                                            <span class="text-xs text-muted-foreground">{{ count }}</span>
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <p v-else class="text-sm text-muted-foreground text-center py-8">
                                No stats yet — finish a game first!
                            </p>
                        </div>

                    </Transition>
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between px-5 py-4
                            border-t border-border shrink-0 gap-3">
                    <!-- Step nav -->
                    <div class="flex items-center gap-1">
                        <button
                            @click="prev"
                            :disabled="currentStep === 'definition'"
                            class="cursor-pointer p-1.5 rounded-lg transition-colors
                                   disabled:opacity-30 disabled:cursor-not-allowed
                                   hover:bg-accent text-muted-foreground hover:text-foreground"
                            aria-label="Previous"
                        >
                            <ChevronLeft class="w-5 h-5" />
                        </button>
                        <!-- Step dots -->
                        <div class="flex gap-1.5 px-1">
                            <button
                                v-for="step in STEPS"
                                :key="step"
                                @click="goTo(step)"
                                class="w-1.5 h-1.5 rounded-full transition-all duration-200 cursor-pointer"
                                :class="currentStep === step ? 'bg-foreground scale-125' : 'bg-border hover:bg-muted-foreground'"
                                :aria-label="`Go to ${step}`"
                            />
                        </div>
                        <button
                            @click="next"
                            :disabled="currentStep === 'stats'"
                            class="cursor-pointer p-1.5 rounded-lg transition-colors
                                   disabled:opacity-30 disabled:cursor-not-allowed
                                   hover:bg-accent text-muted-foreground hover:text-foreground"
                            aria-label="Next"
                        >
                            <ChevronRight class="w-5 h-5" />
                        </button>
                    </div>

                    <!-- Play again -->
                    <button
                        @click="emit('playAgain')"
                        class="cursor-pointer flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground
                               font-semibold text-sm hover:opacity-90 active:scale-95
                               transition-all duration-150"
                    >
                        Play again
                    </button>
                </div>

            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* Modal fade */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.25s ease;
}
.modal-fade-enter-active .relative,
.modal-fade-leave-active .relative {
    transition: transform 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}
.modal-fade-enter-from .relative,
.modal-fade-leave-to .relative {
    transform: translateY(16px);
}

/* Step slide transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.slide-left-enter-from  { opacity: 0; transform: translateX(24px); }
.slide-left-leave-to    { opacity: 0; transform: translateX(-24px); }

.slide-right-enter-from { opacity: 0; transform: translateX(-24px); }
.slide-right-leave-to   { opacity: 0; transform: translateX(24px); }
</style>
