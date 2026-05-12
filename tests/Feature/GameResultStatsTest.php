<?php

namespace Tests\Feature;

use App\Models\GameResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameResultStatsTest extends TestCase
{
    use RefreshDatabase;

    private function createResult(User $user, array $attrs = []): GameResult
    {
        // Extract created_at before mass-assignment since it's not in $fillable
        $createdAt = $attrs['created_at'] ?? null;
        unset($attrs['created_at']);

        $result = GameResult::create(array_merge([
            'user_id'          => $user->id,
            'word'             => 'crane',
            'won'              => true,
            'attempts'         => 3,
            'green_count'      => 5,
            'yellow_count'     => 2,
            'time_seconds'     => 60,
            'guess_times'      => [10, 25, 60],
            'guess_intervals'  => [10, 15, 35],
            'guesses'          => ['crimp', 'train', 'crane'],
            'invalid_guesses'  => 0,
            'letter_frequency' => ['c' => 2, 'r' => 2, 'a' => 1],
        ], $attrs));

        // Apply custom timestamp outside mass-assignment
        if ($createdAt !== null) {
            $result->timestamps = false;
            $result->created_at = $createdAt;
            $result->save();
        }

        return $result;
    }

    public function test_unauthenticated_request_is_redirected(): void
    {
        $this->getJson('/stats')->assertUnauthorized();
    }

    public function test_returns_zeroed_stats_when_no_games_played(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/stats');

        $response->assertOk()->assertJson([
            'total'    => 0,
            'wins'     => 0,
            'win_rate' => 0,
            'streak'   => 0,
        ]);
    }

    public function test_total_and_win_counts_are_correct(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['won' => true]);
        $this->createResult($user, ['won' => true]);
        $this->createResult($user, ['won' => false]);

        $response = $this->actingAs($user)->getJson('/stats');

        $response->assertOk()->assertJson([
            'total'    => 3,
            'wins'     => 2,
            'losses'   => 1,
            'win_rate' => 67,
        ]);
    }

    public function test_current_streak_counts_consecutive_wins_from_most_recent(): void
    {
        $user = User::factory()->create();
        // Oldest to newest: lose, win, win, win
        $this->createResult($user, ['won' => false, 'created_at' => now()->subDays(3)]);
        $this->createResult($user, ['won' => true,  'created_at' => now()->subDays(2)]);
        $this->createResult($user, ['won' => true,  'created_at' => now()->subDays(1)]);
        $this->createResult($user, ['won' => true,  'created_at' => now()]);

        $this->actingAs($user)->getJson('/stats')
            ->assertOk()
            ->assertJson(['streak' => 3]);
    }

    public function test_streak_is_broken_by_a_loss(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['won' => true,  'created_at' => now()->subDays(2)]);
        $this->createResult($user, ['won' => false, 'created_at' => now()->subDays(1)]);
        $this->createResult($user, ['won' => true,  'created_at' => now()]);

        $this->actingAs($user)->getJson('/stats')
            ->assertOk()
            ->assertJson(['streak' => 1]);
    }

    public function test_best_streak_is_tracked_correctly(): void
    {
        $user = User::factory()->create();
        // win, win, win, lose, win, win
        $days = [5, 4, 3, 2, 1, 0];
        $wons = [true, true, true, false, true, true];
        foreach ($days as $i => $d) {
            $this->createResult($user, ['won' => $wons[$i], 'created_at' => now()->subDays($d)]);
        }

        $this->actingAs($user)->getJson('/stats')
            ->assertOk()
            ->assertJson(['best_streak' => 3, 'streak' => 2]);
    }

    public function test_guess_distribution_buckets_wins_correctly(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['won' => true, 'attempts' => 1]);
        $this->createResult($user, ['won' => true, 'attempts' => 3]);
        $this->createResult($user, ['won' => true, 'attempts' => 3]);
        $this->createResult($user, ['won' => false, 'attempts' => 6]);

        $data = $this->actingAs($user)->getJson('/stats')->json();

        $this->assertSame(1, $data['distribution'][1]);
        $this->assertSame(0, $data['distribution'][2]);
        $this->assertSame(2, $data['distribution'][3]);
        $this->assertSame(0, $data['distribution'][6]); // losses don't count
    }

    public function test_avg_attempts_only_counts_wins(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['won' => true,  'attempts' => 2]);
        $this->createResult($user, ['won' => true,  'attempts' => 4]);
        $this->createResult($user, ['won' => false, 'attempts' => 6]);

        $data = $this->actingAs($user)->getJson('/stats')->json();

        $this->assertEquals(3, $data['avg_attempts']); // (2+4)/2 = 3 (JSON decodes as int)
    }

    public function test_top_opener_returns_most_common_first_guess(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['guesses' => ['crane', 'slate']]);
        $this->createResult($user, ['guesses' => ['crane', 'audio']]);
        $this->createResult($user, ['guesses' => ['slate', 'crane']]);

        $data = $this->actingAs($user)->getJson('/stats')->json();

        $this->assertSame('crane', $data['top_opener']);
    }

    public function test_top_letters_aggregates_across_all_games(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['letter_frequency' => ['c' => 3, 'r' => 2, 'a' => 1]]);
        $this->createResult($user, ['letter_frequency' => ['c' => 2, 'r' => 4, 's' => 1]]);

        $data = $this->actingAs($user)->getJson('/stats')->json();

        $this->assertSame(5, $data['top_letters']['c']); // 3+2
        $this->assertSame(6, $data['top_letters']['r']); // 2+4
    }

    public function test_top_letters_returns_at_most_5(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['letter_frequency' => [
            'a' => 10, 'b' => 9, 'c' => 8, 'd' => 7, 'e' => 6, 'f' => 5,
        ]]);

        $data = $this->actingAs($user)->getJson('/stats')->json();

        $this->assertCount(5, $data['top_letters']);
    }

    public function test_total_invalid_guesses_is_summed_across_games(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['invalid_guesses' => 2]);
        $this->createResult($user, ['invalid_guesses' => 3]);

        $data = $this->actingAs($user)->getJson('/stats')->json();

        $this->assertSame(5, $data['total_invalid']);
    }

    public function test_avg_guess_interval_is_computed_across_all_games(): void
    {
        $user = User::factory()->create();
        $this->createResult($user, ['guess_intervals' => [10, 20]]);  // avg of these = 15
        $this->createResult($user, ['guess_intervals' => [30, 10]]);  // combined avg = (10+20+30+10)/4 = 17.5 → 18

        $data = $this->actingAs($user)->getJson('/stats')->json();

        $this->assertSame(18, $data['avg_guess_interval']);
    }

    public function test_users_only_see_their_own_stats(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $this->createResult($userA);
        $this->createResult($userA);
        $this->createResult($userB);

        $dataA = $this->actingAs($userA)->getJson('/stats')->json();
        $dataB = $this->actingAs($userB)->getJson('/stats')->json();

        $this->assertSame(2, $dataA['total']);
        $this->assertSame(1, $dataB['total']);
    }
}
