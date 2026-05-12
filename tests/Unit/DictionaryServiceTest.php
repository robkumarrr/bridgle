<?php

namespace Tests\Unit;

use App\Services\DictionaryService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DictionaryServiceTest extends TestCase
{
    private DictionaryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new DictionaryService();
        \Illuminate\Support\Facades\Cache::flush(); // prevent cross-test cache bleed
    }

    private function fakeApiResponse(string $word): array
    {
        return [[
            'word'      => $word,
            'phonetics' => [
                ['text' => '/kreɪn/', 'audio' => 'https://example.com/crane.mp3'],
            ],
            'meanings'  => [
                [
                    'partOfSpeech' => 'noun',
                    'definitions'  => [
                        ['definition' => 'A large wading bird.', 'example' => 'A crane stood in the marsh.'],
                        ['definition' => 'A machine for lifting heavy objects.', 'example' => null],
                        ['definition' => 'Third definition that should be trimmed.', 'example' => null],
                    ],
                ],
                [
                    'partOfSpeech' => 'verb',
                    'definitions'  => [
                        ['definition' => 'To stretch one\'s neck.', 'example' => null],
                    ],
                ],
            ],
        ]];
    }

    public function test_returns_null_for_unknown_word(): void
    {
        Http::fake([
            '*' => Http::response(null, 404),
        ]);

        $result = $this->service->define('zzzzz');

        $this->assertNull($result);
    }

    public function test_parses_api_response_into_correct_shape(): void
    {
        Http::fake([
            '*' => Http::response($this->fakeApiResponse('crane'), 200),
        ]);

        $result = $this->service->define('crane');

        $this->assertNotNull($result);
        $this->assertSame('crane', $result['word']);
        $this->assertSame('/kreɪn/', $result['phonetic']);
        $this->assertSame('https://example.com/crane.mp3', $result['audio']);
        $this->assertArrayHasKey('meanings', $result);
    }

    public function test_limits_to_at_most_2_definitions_per_part_of_speech(): void
    {
        Http::fake([
            '*' => Http::response($this->fakeApiResponse('crane'), 200),
        ]);

        $result = $this->service->define('crane');

        // The noun has 3 defs in the fake response — should be capped at 2
        $nounMeaning = collect($result['meanings'])->firstWhere('part_of_speech', 'noun');
        $this->assertCount(2, $nounMeaning['definitions']);
    }

    public function test_limits_to_at_most_3_parts_of_speech(): void
    {
        $apiData = [[
            'word'      => 'test',
            'phonetics' => [],
            'meanings'  => [
                ['partOfSpeech' => 'noun',        'definitions' => [['definition' => 'A.', 'example' => null]]],
                ['partOfSpeech' => 'verb',        'definitions' => [['definition' => 'B.', 'example' => null]]],
                ['partOfSpeech' => 'adjective',   'definitions' => [['definition' => 'C.', 'example' => null]]],
                ['partOfSpeech' => 'adverb',      'definitions' => [['definition' => 'D.', 'example' => null]]],
            ],
        ]];

        Http::fake(['*' => Http::response($apiData, 200)]);

        $result = $this->service->define('tests');

        $this->assertCount(3, $result['meanings']);
    }

    public function test_prefers_phonetic_entry_that_has_audio(): void
    {
        $apiData = [[
            'word'      => 'crane',
            'phonetics' => [
                ['text' => '/text-only/', 'audio' => ''],
                ['text' => '/with-audio/', 'audio' => 'https://example.com/audio.mp3'],
            ],
            'meanings' => [],
        ]];

        Http::fake(['*' => Http::response($apiData, 200)]);

        $result = $this->service->define('crane');

        $this->assertSame('https://example.com/audio.mp3', $result['audio']);
        // phonetic text falls back to first available text
        $this->assertSame('/text-only/', $result['phonetic']);
    }

    public function test_caches_successful_result_and_does_not_make_a_second_http_call(): void
    {
        Http::fake([
            '*' => Http::response($this->fakeApiResponse('crane'), 200),
        ]);

        $this->service->define('crane');
        $this->service->define('crane'); // second call — should hit cache

        Http::assertSentCount(1);
    }

    public function test_does_not_cache_on_network_error(): void
    {
        // Simulate a network-level failure (connection refused, timeout, etc.)
        Http::fake(function () {
            throw new \RuntimeException('Connection refused');
        });

        try {
            $this->service->define('crane');
        } catch (\Throwable) {
            // expected — the service re-throws so rememberForever does not store anything
        }

        $this->assertFalse(Cache::has('dict:v1:crane'));
    }

    public function test_not_found_word_is_stored_in_cache_to_avoid_retrying(): void
    {
        Http::fake([
            '*' => Http::response(null, 404),
        ]);

        $this->service->define('zzzzz');

        // A sentinel value is cached so future calls skip the API entirely
        $this->assertTrue(Cache::has('dict:v1:zzzzz'));
        // And the public API still returns null (not the sentinel string)
        $this->assertNull($this->service->define('zzzzz'));
    }

    public function test_lowercases_and_trims_word_before_lookup(): void
    {
        Http::fake([
            '*' => Http::response($this->fakeApiResponse('crane'), 200),
        ]);

        $this->service->define('  CRANE  ');

        $this->assertTrue(Cache::has('dict:v1:crane'));
    }
}
