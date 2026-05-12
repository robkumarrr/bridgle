<?php

namespace Tests\Feature;

use App\Models\ActiveGame;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActiveGameTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'word'               => 'crane',
            'board'              => array_fill(0, 6, array_fill(0, 5, ['letter' => '', 'state' => 'empty'])),
            'current_row'        => 0,
            'game_state'         => 'playing',
            'letter_states'      => null,
            'game_start_time'    => null,
            'guess_times'        => [],
            'guesses'            => [],
            'invalid_guess_count' => 0,
            'letter_frequency'   => null,
            'last_result'        => null,
        ], $overrides);
    }

    // ── Auth guard ────────────────────────────────────────────────────────────

    public function test_unauthenticated_get_redirects(): void
    {
        $response = $this->getJson('/active-game');
        $response->assertUnauthorized();
    }

    public function test_unauthenticated_put_redirects(): void
    {
        $response = $this->putJson('/active-game', $this->validPayload());
        $response->assertUnauthorized();
    }

    public function test_unauthenticated_delete_redirects(): void
    {
        $response = $this->deleteJson('/active-game');
        $response->assertUnauthorized();
    }

    // ── GET /active-game ──────────────────────────────────────────────────────

    public function test_get_returns_null_when_no_active_game(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/active-game');

        // response()->json(null) produces the JSON literal "null".
        // AssertableJsonString normalises that to [] internally, so we check the raw body.
        $response->assertOk();
        $this->assertSame('null', $response->getContent());
    }

    public function test_get_returns_saved_game_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        ActiveGame::create([
            'user_id'            => $user->id,
            'word'               => 'slate',
            'board'              => array_fill(0, 6, array_fill(0, 5, ['letter' => '', 'state' => 'empty'])),
            'current_row'        => 2,
            'game_state'         => 'playing',
            'letter_states'      => ['s' => 'correct'],
            'game_start_time'    => 1700000000,
            'guess_times'        => [30, 90],
            'guesses'            => ['crane', 'audio'],
            'invalid_guess_count' => 1,
            'letter_frequency'   => ['c' => 1, 'r' => 1],
            'last_result'        => null,
        ]);

        $response = $this->actingAs($user)->getJson('/active-game');

        $response->assertOk()
            ->assertJsonFragment(['word' => 'slate'])
            ->assertJsonFragment(['current_row' => 2])
            ->assertJsonFragment(['game_state' => 'playing']);
    }

    public function test_get_does_not_return_another_users_game(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        ActiveGame::create([
            'user_id'            => $userA->id,
            'word'               => 'ghost',
            'board'              => array_fill(0, 6, array_fill(0, 5, ['letter' => '', 'state' => 'empty'])),
            'current_row'        => 0,
            'game_state'         => 'playing',
            'invalid_guess_count' => 0,
        ]);

        $response = $this->actingAs($userB)->getJson('/active-game');

        // User B has no game — should get JSON null, not User A's game
        $response->assertOk();
        $this->assertSame('null', $response->getContent());
    }

    // ── PUT /active-game ──────────────────────────────────────────────────────

    public function test_put_creates_active_game_and_returns_204(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->putJson('/active-game', $this->validPayload(['word' => 'crane']));

        $response->assertNoContent();
        $this->assertDatabaseHas('active_games', [
            'user_id' => $user->id,
            'word'    => 'crane',
        ]);
    }

    public function test_put_updates_existing_game_upsert(): void
    {
        $user = User::factory()->create();

        // Create initial
        $this->actingAs($user)->putJson('/active-game', $this->validPayload([
            'word'        => 'crane',
            'current_row' => 0,
        ]));

        // Update (same user — should upsert, not duplicate)
        $this->actingAs($user)->putJson('/active-game', $this->validPayload([
            'word'        => 'crane',
            'current_row' => 1,
            'game_state'  => 'playing',
        ]));

        $this->assertDatabaseCount('active_games', 1);
        $this->assertDatabaseHas('active_games', [
            'user_id'     => $user->id,
            'current_row' => 1,
        ]);
    }

    public function test_put_stores_won_game_state(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->putJson('/active-game', $this->validPayload([
                'game_state'  => 'won',
                'current_row' => 3,
            ]));

        $response->assertNoContent();
        $this->assertDatabaseHas('active_games', [
            'user_id'    => $user->id,
            'game_state' => 'won',
        ]);
    }

    public function test_put_rejects_missing_word(): void
    {
        $user = User::factory()->create();
        $payload = $this->validPayload();
        unset($payload['word']);

        $response = $this->actingAs($user)->putJson('/active-game', $payload);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['word']);
    }

    public function test_put_rejects_invalid_word_length(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->putJson('/active-game', $this->validPayload(['word' => 'toolong']));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['word']);
    }

    public function test_put_rejects_invalid_game_state(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->putJson('/active-game', $this->validPayload(['game_state' => 'invalid']));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['game_state']);
    }

    // ── DELETE /active-game ───────────────────────────────────────────────────

    public function test_delete_removes_active_game_and_returns_204(): void
    {
        $user = User::factory()->create();
        ActiveGame::create([
            'user_id'            => $user->id,
            'word'               => 'crane',
            'board'              => array_fill(0, 6, array_fill(0, 5, ['letter' => '', 'state' => 'empty'])),
            'current_row'        => 0,
            'game_state'         => 'playing',
            'invalid_guess_count' => 0,
        ]);

        $response = $this->actingAs($user)->deleteJson('/active-game');

        $response->assertNoContent();
        $this->assertDatabaseEmpty('active_games');
    }

    public function test_delete_is_idempotent_when_no_game_exists(): void
    {
        $user = User::factory()->create();

        // No game exists — should still return 204 cleanly
        $response = $this->actingAs($user)->deleteJson('/active-game');

        $response->assertNoContent();
    }

    public function test_delete_only_removes_own_game(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        ActiveGame::create([
            'user_id'            => $userA->id,
            'word'               => 'crane',
            'board'              => array_fill(0, 6, array_fill(0, 5, ['letter' => '', 'state' => 'empty'])),
            'current_row'        => 0,
            'game_state'         => 'playing',
            'invalid_guess_count' => 0,
        ]);

        // User B deletes — User A's game must survive
        $this->actingAs($userB)->deleteJson('/active-game');

        $this->assertDatabaseHas('active_games', ['user_id' => $userA->id]);
    }
}
