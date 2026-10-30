<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import BridgleLogo from '@/components/BridgleLogo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { Button } from '@/components/ui/button';
import { dashboard, login, play, register } from '@/routes';

withDefaults(
    defineProps<{
        canRegister: boolean;
    }>(),
    {
        canRegister: true,
    },
);
</script>

<template>
    <Head title="Bridgle" />

    <div class="relative flex min-h-svh flex-col items-center justify-center bg-background px-4">
        <div class="absolute top-4 right-4">
            <ThemeToggle />
        </div>

        <div class="flex flex-col items-center gap-10">
            <BridgleLogo class="h-12 w-auto text-[#bcaae4] sm:h-16" />

            <p class="text-center text-base text-muted-foreground sm:text-lg">
                Wordle, but you never have to stop.
            </p>

            <div class="flex flex-col items-center gap-3 sm:flex-row">
                <Link v-if="$page.props.auth.user" :href="dashboard()">
                    <Button size="lg" class="w-full bg-[#bcaae4] text-white hover:bg-[#a896d8] sm:w-auto">
                        Play now
                    </Button>
                </Link>
                <template v-else>
                    <Link :href="login()">
                        <Button size="lg" class="w-full bg-[#bcaae4] text-white hover:bg-[#a896d8] sm:w-auto">
                            Log in
                        </Button>
                    </Link>
                    <Link v-if="canRegister" :href="register()">
                        <Button size="lg" variant="outline" class="w-full sm:w-auto">
                            Create account
                        </Button>
                    </Link>
                </template>
            </div>

            <Link
                v-if="!$page.props.auth.user"
                :href="play()"
                class="-mt-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
                or play as a guest →
            </Link>
        </div>
    </div>
</template>
