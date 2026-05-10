<script setup lang="ts">
import { ref } from 'vue';
import { X, BarChart2 } from 'lucide-vue-next';

interface Stats {
    total: number;
    wins: number;
    losses: number;
    win_rate: number;
    streak: number;
    best_streak: number;
    avg_attempts: number | null;
    avg_time: number | null;
    avg_guess_interval: number | null;
    total_invalid: number;
    top_letters: Record<string, number>;
    top_opener: string | null;
    distribution: Record<number, number>;
}

const open = ref(false);
const stats = ref<Stats | null>(null);
const loading = ref(false);

async function fetchStats() {
    loading.value = true;
    try {
        const res = await fetch('/stats', {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        const data = await res.json();
        stats.value = data.total > 0 ? data : null;
    } finally {
        loading.value = false;
    }
}

function openModal() {
    open.value = true;
    fetchStats();
}


function formatTime(seconds: number | null): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function maxDist(dist: Record<number, number>): number {
    return Math.max(1, ...Object.values(dist));
}
</script>

<template>
    <button
        @click="openModal"
        class="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border
               text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
    >
        <BarChart2 class="w-4 h-4" />
        Stats
    </button>

    <Transition name="modal">
        <div
            v-if="open"
            class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <!-- Backdrop -->
            <div
                class="absolute inset-0 bg-black/50 cursor-pointer"
                @click="open = false"
            />

            <!-- Panel -->
            <div class="relative z-10 w-full max-w-sm rounded-xl bg-background border border-border shadow-xl p-6 max-h-[90dvh] overflow-y-auto">
                <div class="flex items-center justify-between mb-5">
                    <h2 class="text-base font-semibold tracking-wide uppercase">Statistics</h2>
                    <button
                        @click="open = false"
                        class="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <div v-if="loading" class="flex justify-center py-8 text-muted-foreground text-sm">
                    Loading…
                </div>

                <template v-else-if="stats">
                    <!-- Summary row -->
                    <div class="grid grid-cols-4 gap-2 mb-6 text-center">
                        <div>
                            <div class="text-2xl font-bold">{{ stats.total }}</div>
                            <div class="text-xs text-muted-foreground leading-tight mt-0.5">Played</div>
                        </div>
                        <div>
                            <div class="text-2xl font-bold">{{ stats.win_rate }}%</div>
                            <div class="text-xs text-muted-foreground leading-tight mt-0.5">Win rate</div>
                        </div>
                        <div>
                            <div class="text-2xl font-bold">{{ stats.streak }}</div>
                            <div class="text-xs text-muted-foreground leading-tight mt-0.5">Streak</div>
                        </div>
                        <div>
                            <div class="text-2xl font-bold">{{ stats.best_streak }}</div>
                            <div class="text-xs text-muted-foreground leading-tight mt-0.5">Best</div>
                        </div>
                    </div>

                    <!-- Guess distribution -->
                    <div class="mb-5">
                        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Guess Distribution</h3>
                        <div class="space-y-1.5">
                            <div v-for="n in 6" :key="n" class="flex items-center gap-2 text-sm">
                                <span class="w-3 text-right font-mono text-muted-foreground">{{ n }}</span>
                                <div class="flex-1 flex items-center">
                                    <div
                                        class="h-5 rounded-sm flex items-center justify-end px-1.5 text-xs font-bold text-white transition-all duration-500"
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
                    </div>

                    <!-- Timing row -->
                    <div class="grid grid-cols-3 gap-3 text-center border-t border-border pt-4 mb-4">
                        <div>
                            <div class="text-lg font-bold">{{ stats.avg_attempts ?? '—' }}</div>
                            <div class="text-xs text-muted-foreground">Avg guesses</div>
                        </div>
                        <div>
                            <div class="text-lg font-bold">{{ formatTime(stats.avg_time) }}</div>
                            <div class="text-xs text-muted-foreground">Avg time</div>
                        </div>
                        <div>
                            <div class="text-lg font-bold">{{ formatTime(stats.avg_guess_interval) }}</div>
                            <div class="text-xs text-muted-foreground">Avg per guess</div>
                        </div>
                    </div>

                    <!-- Misc row -->
                    <div class="grid grid-cols-2 gap-3 text-center border-t border-border pt-4 mb-4">
                        <div>
                            <div class="text-lg font-bold">{{ stats.total_invalid }}</div>
                            <div class="text-xs text-muted-foreground">Invalid guesses ever</div>
                        </div>
                        <div>
                            <div class="text-lg font-bold uppercase">{{ stats.top_opener ?? '—' }}</div>
                            <div class="text-xs text-muted-foreground">Fav opener</div>
                        </div>
                    </div>

                    <!-- Top letters -->
                    <div v-if="Object.keys(stats.top_letters).length" class="border-t border-border pt-4">
                        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Most Used Letters</h3>
                        <div class="flex gap-2 justify-center flex-wrap">
                            <div
                                v-for="(count, letter) in stats.top_letters"
                                :key="letter"
                                class="flex flex-col items-center bg-secondary rounded px-2.5 py-1.5 min-w-[2.5rem]"
                            >
                                <span class="text-base font-bold uppercase">{{ letter }}</span>
                                <span class="text-xs text-muted-foreground">{{ count }}</span>
                            </div>
                        </div>
                    </div>
                </template>

                <div v-else class="text-center text-sm text-muted-foreground py-6">
                    No games played yet — finish one first!
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
