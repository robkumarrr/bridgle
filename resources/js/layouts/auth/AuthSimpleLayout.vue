<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import BridgleLogo from '@/components/BridgleLogo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { home } from '@/routes';

defineProps<{
    title?: string;
    description?: string;
}>();
</script>

<template>
    <div class="relative flex min-h-svh flex-col items-center justify-center bg-background px-4">
        <div class="absolute top-4 right-4">
            <ThemeToggle />
        </div>

        <div class="w-full max-w-sm">
            <div class="flex flex-col gap-8">
                <div class="flex flex-col items-center gap-6">
                    <Link :href="home()">
                        <BridgleLogo class="h-9 w-auto text-[#bcaae4]" />
                    </Link>
                    <div class="space-y-1 text-center">
                        <h1 class="text-xl font-medium">{{ title }}</h1>
                        <p class="text-sm text-muted-foreground">
                            {{ description }}
                        </p>
                    </div>
                </div>
                <slot />
            </div>
        </div>
    </div>
</template>
