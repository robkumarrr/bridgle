<?php

namespace Tests\Feature;

use App\Services\DictionaryService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DictionaryControllerTest extends TestCase
{
    use RefreshDatabase;

    private function mockDictionary(?array $result): void
    {
        $this->mock(DictionaryService::class, function ($mock) use ($result) {
            $mock->shouldReceive('define')->andReturn($result);
        });
    }

    public function test_unauthenticated_request_is_redirected(): void
    {
        $this->getJson('/dictionary/crane')->assertUnauthorized();
    }

    public function test_word_with_non_alpha_characters_returns_422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/dictionary/cr4ne')
            ->assertUnprocessable()
            ->assertJson(['error' => 'Invalid word']);
    }

    public function test_word_shorter_than_5_chars_returns_422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/dictionary/hi')
            ->assertUnprocessable()
            ->assertJson(['error' => 'Invalid word']);
    }

    public function test_word_longer_than_5_chars_returns_422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/dictionary/toolong')
            ->assertUnprocessable()
            ->assertJson(['error' => 'Invalid word']);
    }

    public function test_unknown_word_returns_404(): void
    {
        $user = User::factory()->create();
        $this->mockDictionary(null);

        $this->actingAs($user)->getJson('/dictionary/crane')
            ->assertNotFound()
            ->assertJson(['error' => 'Not found']);
    }

    public function test_known_word_returns_200_with_correct_shape(): void
    {
        $user = User::factory()->create();
        $this->mockDictionary([
            'word'     => 'crane',
            'phonetic' => '/kreɪn/',
            'audio'    => 'https://example.com/crane.mp3',
            'meanings' => [
                [
                    'part_of_speech' => 'noun',
                    'definitions'    => [
                        ['definition' => 'A large bird.', 'example' => 'The crane flew overhead.'],
                    ],
                ],
            ],
        ]);

        $response = $this->actingAs($user)->getJson('/dictionary/crane');

        $response->assertOk()
            ->assertJsonStructure(['word', 'phonetic', 'audio', 'meanings'])
            ->assertJson(['word' => 'crane', 'phonetic' => '/kreɪn/']);
    }

    public function test_uppercase_word_is_normalised_and_looked_up(): void
    {
        $user = User::factory()->create();

        $this->mock(DictionaryService::class, function ($mock) {
            $mock->shouldReceive('define')
                ->with('crane') // must be lowercased
                ->andReturn(['word' => 'crane', 'phonetic' => null, 'audio' => null, 'meanings' => []]);
        });

        $this->actingAs($user)->getJson('/dictionary/CRANE')->assertOk();
    }

    public function test_throttle_middleware_is_applied_to_the_route(): void
    {
        $routes = app('router')->getRoutes();
        $route  = $routes->getByName('dictionary.show');

        $this->assertNotNull($route, 'dictionary.show route does not exist');
        $this->assertContains('throttle:dictionary', $route->middleware());
    }
}
