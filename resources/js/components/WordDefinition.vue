<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Volume2 } from 'lucide-vue-next';

const props = defineProps<{
    word: string;
}>();

interface Definition {
    definition: string;
    example?: string;
}

interface Meaning {
    part_of_speech: string;
    definitions: Definition[];
}

interface DictionaryEntry {
    word: string;
    phonetic?: string;
    audio?: string;
    meanings: Meaning[];
}

const entry = ref<DictionaryEntry | null>(null);
const loading = ref(true);
const failed = ref(false);

onMounted(async () => {
    try {
        const res = await fetch(`/dictionary/${props.word}`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (!res.ok) {
            failed.value = true;
            return;
        }
        entry.value = await res.json();
    } catch {
        failed.value = true;
    } finally {
        loading.value = false;
    }
});

function playAudio() {
    if (entry.value?.audio) {
        new Audio(entry.value.audio).play().catch(() => {});
    }
}
</script>

<template>
    <div class="w-full max-w-sm text-left mt-2">
        <!-- Loading skeleton -->
        <div v-if="loading" class="space-y-2 animate-pulse px-1">
            <div class="h-3 bg-muted rounded w-1/3" />
            <div class="h-3 bg-muted rounded w-full" />
            <div class="h-3 bg-muted rounded w-4/5" />
        </div>

        <!-- No definition found — silent, don't alarm the user -->
        <template v-else-if="failed || !entry" />

        <template v-else>
            <!-- Word + phonetic -->
            <div class="flex items-center gap-2 mb-2 px-1">
                <span class="text-sm font-semibold uppercase tracking-widest text-foreground">
                    {{ entry.word }}
                </span>
                <span v-if="entry.phonetic" class="text-xs text-muted-foreground">
                    {{ entry.phonetic }}
                </span>
                <button
                    v-if="entry.audio"
                    @click="playAudio"
                    class="ml-auto text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Play pronunciation"
                >
                    <Volume2 class="w-4 h-4" />
                </button>
            </div>

            <!-- Meanings -->
            <div class="space-y-2.5 px-1">
                <div v-for="(meaning, i) in entry.meanings" :key="i">
                    <span class="text-xs italic text-muted-foreground">{{ meaning.part_of_speech }}</span>
                    <div
                        v-for="(def, j) in meaning.definitions"
                        :key="j"
                        class="mt-0.5"
                    >
                        <p class="text-xs text-foreground leading-relaxed">
                            {{ def.definition }}
                        </p>
                        <p v-if="def.example" class="text-xs text-muted-foreground italic mt-0.5 leading-relaxed">
                            "{{ def.example }}"
                        </p>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
