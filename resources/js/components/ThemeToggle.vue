<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next';
import { useAppearance } from '@/composables/useAppearance';

const { resolvedAppearance, updateAppearance } = useAppearance();

function toggle() {
    // Disable all transitions for the duration of the theme switch
    document.documentElement.classList.add('no-transitions');
    updateAppearance(resolvedAppearance.value === 'dark' ? 'light' : 'dark');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('no-transitions');
        });
    });
}
</script>

<template>
    <button
        @click="toggle"
        class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        :aria-label="resolvedAppearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    >
        <Sun v-if="resolvedAppearance === 'dark'" class="h-5 w-5" />
        <Moon v-else class="h-5 w-5" />
    </button>
</template>
