<?php

namespace Tests\Feature;

use App\Models\GameResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameResultStoreTest extends TestCase
{
    use RefreshDatabase;

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'word'             => 'crane',
            'won'              => true,
            'attempts'         => 3,
            'green_count'      => 10,
            'yellow_count'     => 2,
            'time_seconds'     => 120,
            'guess_times'      => [15, 40, 120],
            'guess_intervals'  => [15, 25, 80],
            'guesses'          => ['crimp', 'train', 'crane'],
            'invalid_guesses'  => 1,
            'letter_frequency' => ['c' => 3, 'r' => 3, 'a' => 2],
        ], $overrides);
    }

    public function test_unauthenticated_request_is_redirected(): void
    {
        $response = $this->postJson('/game-results', $this->validPayload());
        $response->assertUnauthorized();
    }

    public function test_valid_payload_stores_result_and_returns_204(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/game-results', $this->validPayload());

        $response->assertNoContent();
        $this->assertDatabaseHas('game_results', [
            'user_id'  => $user->id,
            'word'     => 'crane',
            'won'      => true,
            'attempts' => 3,
        ]);
    }

    public function test_result_is_associated_with_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/game-results', $this->validPayload());

        $this->assertSame(1, GameResult::where('user_id', $user->id)->count());
    }

    public function test_missing_word_returns_422(): void
    {
        $user = User::factory()->create();
        $payload = $this->validPayload();
        unset($payload['word']);

        $this->actingAs($user)->postJson('/game-results', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('word');
    }

    public function test_word_longer_than_5_chars_returns_422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/game-results', $this->validPayload(['word' => 'toolong']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('word');
    }

    public function test_word_shorter_than_5_chars_returns_422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/game-results', $this->validPayload(['word' => 'hi']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('word');
    }

    public function test_won_field_must_be_boolean(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/game-results', $this->validPayload(['won' => 'yes']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('won');
    }

    public function test_attempts_must_be_between_1_and_6(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/game-results', $this->validPayload(['attempts' => 0]))
            ->assertUnprocessable();

        $this->actingAs($user)
            ->postJson('/game-results', $this->validPayload(['attempts' => 7]))
            ->assertUnprocessable();
    }

    public function test_nullable_fields_are_accepted_as_null(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/game-results', $this->validPayload([
            'time_seconds'     => null,
            'guess_times'      => null,
            'guess_intervals'  => null,
            'guesses'          => null,
            'letter_frequency' => null,
        ]));

        $response->assertNoContent();
    }

    public function test_users_cannot_see_each_others_results(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $this->actingAs($userA)->postJson('/game-results', $this->validPayload());

        $this->assertSame(0, GameResult::where('user_id', $userB->id)->count());
    }
}
