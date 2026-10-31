<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import AppLogo from '@/components/AppLogo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserMenuContent from '@/components/UserMenuContent.vue';
import { getInitials } from '@/composables/useInitials';
import { dashboard, home, login, register } from '@/routes';

const page = usePage();
const auth = computed(() => page.props.auth);
</script>

<template>
    <div class="border-b border-border/60">
        <div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link :href="auth.user ? dashboard() : home()">
                <AppLogo />
            </Link>

            <div class="flex items-center gap-1">
                <ThemeToggle />

                <!-- Guest mode — no user to show, offer an account instead -->
                <template v-if="!auth.user">
                    <Link :href="login()">
                        <Button variant="ghost" size="sm">Log in</Button>
                    </Link>
                    <Link :href="register()">
                        <Button size="sm" class="bg-[#bcaae4] text-white hover:bg-[#a896d8]">Sign up</Button>
                    </Link>
                </template>

                <DropdownMenu v-else>
                    <DropdownMenuTrigger :as-child="true">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="relative size-9 rounded-full p-0.5"
                        >
                            <Avatar class="size-8 overflow-hidden rounded-full">
                                <AvatarImage
                                    v-if="auth.user.avatar"
                                    :src="auth.user.avatar"
                                    :alt="auth.user.name"
                                />
                                <AvatarFallback class="rounded-full bg-[#bcaae4]/20 text-sm font-semibold text-[#bcaae4]">
                                    {{ getInitials(auth.user?.name) }}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-56">
                        <UserMenuContent :user="auth.user" />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    </div>
</template>
