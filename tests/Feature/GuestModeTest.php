<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GuestModeTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_can_play_without_an_account(): void
    {
        $this->get(route('play'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('guest', true)
            );
    }

    public function test_logged_in_users_are_sent_to_the_dashboard(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('play'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_guests_still_cannot_touch_persisted_game_data(): void
    {
        $this->getJson('/active-game')->assertUnauthorized();
        $this->getJson('/stats')->assertUnauthorized();
        $this->postJson('/game-results', [])->assertUnauthorized();
    }
}
