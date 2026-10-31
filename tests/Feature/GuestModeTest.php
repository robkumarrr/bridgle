<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GuestModeTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_play_straight_from_the_front_page(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('guest', true)
            );
    }

    public function test_logged_in_users_are_sent_to_the_dashboard(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('home'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_old_play_links_redirect_to_the_front_page(): void
    {
        $this->get('/play')->assertStatus(301)->assertRedirect(route('home'));
    }

    public function test_guests_still_cannot_touch_persisted_game_data(): void
    {
        $this->getJson('/active-game')->assertUnauthorized();
        $this->getJson('/stats')->assertUnauthorized();
        $this->postJson('/game-results', [])->assertUnauthorized();
    }
}
