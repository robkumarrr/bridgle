<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { TileState } from '@/composables/useGame';

const props = defineProps<{
    letterStates: Record<string, TileState>;
    isPlaying: boolean;
}>();

const emit = defineEmits<{
    letter: [key: string];
    backspace: [];
    enter: [];
}>();

// ── QWERTY layout ──────────────────────────────────────────────────────────
const rows = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['Enter','z','x','c','v','b','n','m','⌫'],
];

// ── Key press handler ──────────────────────────────────────────────────────
function handleKey(key: string) {
    if (!props.isPlaying) return;
    if (key === 'Enter') {
        emit('enter');
    } else if (key === '⌫' || key === 'Backspace') {
        emit('backspace');
    } else if (/^[a-z]$/i.test(key)) {
        emit('letter', key.toLowerCase());
    }
}

// ── Physical keyboard ──────────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
    // Don't fire when typing in an input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    handleKey(e.key);
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

// ── Key color ──────────────────────────────────────────────────────────────
function keyClass(key: string): string {
    if (key === 'Enter' || key === '⌫') return 'key--wide';
    const state = props.letterStates[key];
    if (state === 'correct') return 'key--correct';
    if (state === 'present') return 'key--present';
    if (state === 'absent')  return 'key--absent';
    return 'key--default';
}
</script>

<template>
    <div class="flex flex-col items-center gap-1.5 w-full max-w-lg px-1" aria-label="Keyboard">
        <div
            v-for="(row, i) in rows"
            :key="i"
            class="flex gap-1 justify-center w-full"
        >
            <button
                v-for="key in row"
                :key="key"
                class="key"
                :class="keyClass(key)"
                @click="handleKey(key)"
                :aria-label="key === '⌫' ? 'Backspace' : key"
            >
                {{ key }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.key {
    @apply flex items-center justify-center;
    @apply h-14 rounded font-semibold text-sm uppercase select-none cursor-pointer;
    @apply transition-colors duration-200;
    @apply active:scale-95;
    flex: 1;
    max-width: 2.8rem;
    min-width: 1.8rem;
    touch-action: manipulation; /* prevents 300ms delay on mobile */
}

/* Wide keys: Enter and Backspace */
.key--wide {
    @apply bg-secondary text-secondary-foreground;
    flex: 1.6;
    max-width: 4.2rem;
    font-size: 0.7rem;
}

/* Default (untouched) */
.key--default {
    @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
}

/* Revealed states */
.key--correct {
    background-color: hsl(115 29% 43%);
    color: #fff;
}
.key--present {
    background-color: hsl(49 91% 48%);
    color: #fff;
}
.key--absent {
    background-color: hsl(240 2% 47%);
    color: #fff;
}

.dark .key--correct { background-color: hsl(115 29% 38%); }
.dark .key--present { background-color: hsl(49 84% 38%); }
.dark .key--absent  { background-color: hsl(240 2% 34%); }

/* Mobile tweaks */
@media (max-width: 380px) {
    .key {
        @apply h-12 text-xs;
        max-width: 2.2rem;
        min-width: 1.4rem;
    }
    .key--wide {
        max-width: 3.5rem;
        font-size: 0.6rem;
    }
}
</style>
